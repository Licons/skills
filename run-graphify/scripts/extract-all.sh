#!/usr/bin/env bash
# Extract (hoặc update) một danh sách path, giới hạn số chạy song song.
#
# Dùng:  scripts/extract-all.sh <path> [<path> ...]
# Env:    REPO        (default: suy ra từ vị trí script) - thư mục gốc repo
#         CONCURRENCY (default 3)  - số path chạy đồng thời
#         WORKERS     (default 2)  - --max-workers của MỦI graphify extract
#         RUN_DIR     (default /tmp/opencode/graphify-run)
#
# VÌ SAO script này tồn tại (các lỗi đã trả giá, xem SKILL.md "Gotchas"):
#   1. --max-workers MẶC ĐỊNH = cpu_count. 3 path x 6 workers = 18 process trên
#      6 core => thrash. Phải cap thủ công khi chạy song song.
#   2. Log/state đặt tên bằng slug. Phải cắt tiền tố "./" TRƯỚC khi thay "/"
#      thành "_", nếu không slug thành "._apps_angular" và monitor không thấy.
#   3. Không poll bằng exit code — process bị SIGKILL thì exit code không bao giờ
#      về tới. Mỗi path tự ghi 1 file state OK/FAIL để monitor đọc nội dung.
#   4. KHÔNG hardcode REPO. Máy này có nhiều clone cùng tên gốc
#      (Utop.VietBank.CRM trên feature branch, Utop.VietBank.CRM.1 trên develop)
#      — build nhầm clone thì ra graph sai nhánh, không ai báo. Suy ra từ vị trí
#      script (nằm trong .claude/skills/ của chính repo đó) nên đúng theo clone.
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="${REPO:-$(cd -- "$SCRIPT_DIR/../../../.." && pwd -P)}"
RUN_DIR="${RUN_DIR:-/tmp/opencode/graphify-run}"
CONCURRENCY="${CONCURRENCY:-3}"
WORKERS="${WORKERS:-2}"

[ $# -gt 0 ] || { echo "usage: $0 <path> [<path> ...]" >&2; exit 2; }

# Fail loud: suy ra sai (script bị copy/symlink ra ngoài repo) thì abort, đừng
# chạy tiếp — graph sai repo tệ hơn nhiều so với không có graph.
[ -e "$REPO/.git" ] || {
  echo "FAIL: REPO không phải git repo: $REPO — đặt REPO=/đường/dẫn/đúng" >&2
  exit 2
}

mkdir -p "$RUN_DIR/logs"

# State của run trước phải ARCHIVE, không xoá: monitor.sh đọc NỘI DUNG file
# state, nên .done/marker cũ khiến nó báo "xong hết" ngay lập tức dù run mới
# còn chưa extract path nào. Archive giữ lại để điều tra, không mất.
if compgen -G "$RUN_DIR/state/*.done" > /dev/null 2>&1 \
   || compgen -G "$RUN_DIR/state/*.marker" > /dev/null 2>&1; then
  arch="$RUN_DIR/state-archive-$(date +%H%M%S)"
  mv "$RUN_DIR/state" "$arch"
  echo "[state] archive state run cũ -> $arch"
fi
mkdir -p "$RUN_DIR/state"

slug_of() { local s="${1#./}"; echo "${s//\//_}"; }

run_one() {
  local p="$1"
  local slug; slug="$(slug_of "$p")"
  local log="$RUN_DIR/logs/$slug.log"
  local start=$SECONDS
  cd "$REPO" || { echo "FAIL|$slug|cd-failed" > "$RUN_DIR/state/$slug.done"; return 1; }

  # Tự chọn extract (mới) hay update (đã có graph). Đây là điều kiện duy nhất
  # phân biệt hai lần chạy — workflow gốc ghi "new" và "update" song song.
  if [ -f "$p/graphify-out/graph.json" ]; then
    graphify update "$p" --no-cluster > "$log" 2>&1
  else
    # KHÔNG truyền --no-viz/--no-label: chúng không tồn tại, bị graphify bỏ qua
    # im lặng. extract vốn đã không sinh HTML/labels (để dành cho cluster-only).
    graphify extract "$p" --code-only --max-workers "$WORKERS" > "$log" 2>&1
  fi
  local rc=$?
  local dur=$((SECONDS - start))

  if [ $rc -ne 0 ]; then
    echo "FAIL|$slug|rc=$rc|${dur}s" > "$RUN_DIR/state/$slug.done"
    return 1
  fi
  # Không tin exit 0 một mình: graphify có thể exit 0 với graph rỗng.
  # Scrape log trước (rẻ), nhưng phải biết CẢ HAI định dạng output:
  #   extract → "wrote ... graph.json: N nodes, M edges"
  #   update  → "[graphify watch] Rebuilt (no clustering): N nodes, M edges"
  # Trước đây chỉ khớp định dạng của extract, nên MỌI path ở nhánh update bị
  # gán nhầm FAIL|empty-graph dù graph vẫn tốt.
  local n e
  n=$(grep -oP '(?:wrote .*graph\.json: |Rebuilt \(no clustering\): )\K[0-9]+(?= nodes)' "$log" | tail -1)
  e=$(grep -oP '(?:wrote .*graph\.json: |Rebuilt \(no clustering\): )[0-9]+ nodes, \K[0-9]+(?= edges)' "$log" | tail -1)

  # Không có dòng số nào trong log ⇄ update trên cây KHÔNG đổi
  # ("No code-graph changes detected"). Khi đó đọc thẳng file là nguồn sự
  # thật. Edge nằm ở key "links" (node-link format), "edges" chỉ để tương thích.
  if [ -z "${n:-}" ]; then
    local py out
    py=$(cat "$REPO/graphify-out/.graphify_python" 2>/dev/null) || py=""
    [ -n "$py" ] || py=$(command -v python3 || command -v python || true)
    if [ -n "$py" ]; then
      out=$("$py" -c 'import json,sys
d=json.load(open(sys.argv[1],encoding="utf-8"))
print(len(d.get("nodes",[])), len(d.get("links") or d.get("edges") or []))' \
        "$p/graphify-out/graph.json" 2>/dev/null) || out=""
      [ -n "$out" ] && read -r n e <<<"$out"
    fi
  fi

  if [ -z "${n:-}" ] || [ "${n:-0}" -eq 0 ]; then
    echo "FAIL|$slug|empty-graph|${dur}s" > "$RUN_DIR/state/$slug.done"
    return 1
  fi
  echo "OK|$slug|${n}n|${e:-0}e|${dur}s" > "$RUN_DIR/state/$slug.done"
}
export -f run_one slug_of
export REPO RUN_DIR WORKERS

printf '%s\n' "$@" | xargs -P "$CONCURRENCY" -I{} bash -c 'run_one "$@"' _ {}

echo "EXTRACT_QUEUE_DONE" > "$RUN_DIR/state/EXTRACT.marker"
