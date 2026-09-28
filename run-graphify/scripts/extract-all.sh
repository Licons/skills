#!/usr/bin/env bash
# Extract (hoặc update) một danh sách path, giới hạn số chạy song song.
#
# Dùng:  scripts/extract-all.sh <path> [<path> ...]
# Env:    CONCURRENCY (default 3)  - số path chạy đồng thời
#         WORKERS     (default 2)  - --max-workers của MỖI graphify extract
#         RUN_DIR     (default /tmp/opencode/graphify-run)
#
# VÌ SAO script này tồn tại (các lỗi đã trả giá, xem SKILL.md "Gotchas"):
#   1. --max-workers MẶC ĐỊNH = cpu_count. 3 path x 6 workers = 18 process trên
#      6 core => thrash. Phải cap thủ công khi chạy song song.
#   2. Log/state đặt tên bằng slug. Phải cắt tiền tố "./" TRƯỚC khi thay "/"
#      thành "_", nếu không slug thành "._apps_angular" và monitor không thấy.
#   3. Không poll bằng exit code — process bị SIGKILL thì exit code không bao giờ
#      về tới. Mỗi path tự ghi 1 file state OK/FAIL để monitor đọc nội dung.
set -uo pipefail

REPO="${REPO:-/home/quacn/Projects/VietBank/Utop.VietBank.CRM}"
RUN_DIR="${RUN_DIR:-/tmp/opencode/graphify-run}"
CONCURRENCY="${CONCURRENCY:-3}"
WORKERS="${WORKERS:-2}"

[ $# -gt 0 ] || { echo "usage: $0 <path> [<path> ...]" >&2; exit 2; }

mkdir -p "$RUN_DIR/logs" "$RUN_DIR/state"

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
  local n e
  n=$(grep -oP 'wrote .*graph\.json: \K[0-9]+(?= nodes)' "$log" | tail -1)
  e=$(grep -oP 'wrote .*graph\.json: [0-9]+ nodes, \K[0-9]+(?= edges)' "$log" | tail -1)
  if [ -z "${n:-}" ] || [ "${n:-0}" -eq 0 ]; then
    echo "FAIL|$slug|empty-graph|${dur}s" > "$RUN_DIR/state/$slug.done"
    return 1
  fi
  echo "OK|$slug|${n}n|${e}e|${dur}s" > "$RUN_DIR/state/$slug.done"
}
export -f run_one slug_of
export REPO RUN_DIR WORKERS

printf '%s\n' "$@" | xargs -P "$CONCURRENCY" -I{} bash -c 'run_one "$@"' _ {}

echo "EXTRACT_QUEUE_DONE" > "$RUN_DIR/state/EXTRACT.marker"
