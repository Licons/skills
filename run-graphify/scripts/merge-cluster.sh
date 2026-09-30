#!/usr/bin/env bash
# Verify -> merge -> cluster cho monorepo. Tự skip bước đã hoàn thành nên chạy
# lại an toàn (idempotent), và luôn ghi state file để monitor đọc nội dung.
#
# Dùng:  scripts/merge-cluster.sh <path> [<path> ...]
# Env:    REPO  (default: suy ra từ vị trí script)
#         RUN_DIR (default /tmp/opencode/graphify-run)
#         SKIP_MERGE=1 / SKIP_CLUSTER=1
set -uo pipefail

# Suy ra REPO từ vị trí script, KHÔNG hardcode: xem extract-all.sh giải thích.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="${REPO:-$(cd -- "$SCRIPT_DIR/../../../.." && pwd -P)}"
RUN_DIR="${RUN_DIR:-/tmp/opencode/graphify-run}"
MERGED="graphify-out/monorepo-graph.json"

[ $# -gt 0 ] || { echo "usage: $0 <path> [<path> ...]" >&2; exit 2; }
[ -e "$REPO/.git" ] || {
  echo "FAIL: REPO không phải git repo: $REPO — đặt REPO=/đường/dẫn/đúng" >&2
  exit 2
}
mkdir -p "$RUN_DIR/state"
cd "$REPO" || exit 1

# Marker của chính lần chạy này phải bị xoá TRƯỚC khi làm việc, nếu không
# monitor.sh sẽ thấy PIPELINE.marker/MERGE.marker cũ và báo "đã xong" trong khi
# run mới còn đang chạy. Chỉ xoá phần sắp làm lại, để SKIP_MERGE/SKIP_CLUSTER
# vẫn giữ được kết quả của lần chạy trước.
rm -f "$RUN_DIR/state/PIPELINE.marker" "$RUN_DIR/state/MERGE.collisions"
[ "${SKIP_MERGE:-0}" = "1" ] \
  || rm -f "$RUN_DIR/state/MERGE.marker" "$RUN_DIR/state/MERGE.fail"
[ "${SKIP_CLUSTER:-0}" = "1" ] \
  || rm -f "$RUN_DIR/state/CLUSTER.marker" "$RUN_DIR/state/CLUSTER.fail" \
            "$RUN_DIR/state/CLUSTER.started"

PY=$(cat graphify-out/.graphify_python 2>/dev/null || echo python3)

# --- Gate 1: mọi path phải có graph, không rỗng --------------------------------
missing=(); empty=()
for p in "$@"; do
  f="$p/graphify-out/graph.json"
  if [ ! -f "$f" ]; then missing+=("$p"); continue; fi
  n=$("$PY" -c "import json,sys;print(len(json.load(open(sys.argv[1],encoding='utf-8')).get('nodes',[])))" "$f" 2>/dev/null || echo 0)
  [ "${n:-0}" -gt 0 ] || empty+=("$p")
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "ABORT: thiếu graph.json ở: ${missing[*]}" | tee "$RUN_DIR/state/MERGE.fail"
  exit 1
fi
if [ ${#empty[@]} -gt 0 ]; then
  echo "ABORT: graph rỗng ở: ${empty[*]}" | tee "$RUN_DIR/state/MERGE.fail"
  exit 1
fi
echo "[gate] ${#*}/$# path OK, không rỗng"

# --- Gate 2: cảnh báo collision ID trước khi merge -----------------------------
# Hai app Angular (apps/angular, apps/auth-server) hay trùng id. Gộp id KHÔNG
# phải lúc nào cũng đúng: framework/NuGet thì đúng, node nghiệp vụ trùng tên
# thì là conflation. Chạy cái này để BIẾT, đừng bỏ.
echo "[gate] collision ID giữa các path:"
"$PY" -c "
import json,sys
from pathlib import Path
from collections import Counter
c=Counter()
for p in sys.argv[1:]:
    d=json.loads((Path(p)/'graphify-out'/'graph.json').read_text(encoding='utf-8'))
    c.update(n['id'] for n in d.get('nodes',[]))
tot=len(list(c.elements())); dup={k:v for k,v in c.items() if v>1}
print(f'  {tot:,} node refs · {len(c):,} id duy nhất · {tot-len(c):,} sẽ bị gộp')
if dup:
    print('  top id trùng:')
    for k,v in sorted(dup.items(), key=lambda x:-x[1])[:8]: print(f'    x{v}  {k[:70]}')
" "$@" 2>&1 | tee "$RUN_DIR/state/MERGE.collisions"

# --- Merge ---------------------------------------------------------------------
if [ "${SKIP_MERGE:-0}" != "1" ]; then
  args=(); for p in "$@"; do args+=("$p/graphify-out/graph.json"); done
  S=$SECONDS
  graphify merge-graphs "${args[@]}" --out "$MERGED" 2>&1 | tee "$RUN_DIR/merge.out"
  rc=${PIPESTATUS[0]}
  echo "merge rc=$rc elapsed=$((SECONDS-S))s" | tee -a "$RUN_DIR/merge.out"
  [ $rc -eq 0 ] || { echo "MERGE_FAIL" > "$RUN_DIR/state/MERGE.fail"; exit 1; }
  touch "$RUN_DIR/state/MERGE.marker"
  rm -f "$RUN_DIR/state/MERGE.fail"
fi
[ -f "$MERGED" ] || { echo "ABORT: $MERGED không tồn tại" | tee "$RUN_DIR/state/MERGE.fail"; exit 1; }

# --- Cluster -------------------------------------------------------------------
# CỐ Ý KHÔNG truyền --code-only ở đây: cluster-only không có flag đó (bị bỏ qua
# im lặng). --no-viz là cần thiết: graph >5000 node thì không nên sinh HTML.
# LƯU Ý: --graph trỏ vào $MERGED nhưng KẾT QUẢ ghi ra graphify-out/graph.json,
# không ghi đè $MERGED. Đó là hành vi đúng — graph.json là path mà `graphify query`
# đọc mặc định.
if [ "${SKIP_CLUSTER:-0}" != "1" ]; then
  touch "$RUN_DIR/state/CLUSTER.started"
  S=$SECONDS
  graphify cluster-only . --no-viz --no-label --graph "$MERGED" 2>&1 | tee "$RUN_DIR/cluster.out"
  rc=${PIPESTATUS[0]}
  echo "cluster rc=$rc elapsed=$((SECONDS-S))s" | tee -a "$RUN_DIR/cluster.out"
  [ $rc -eq 0 ] || { echo "CLUSTER_FAIL" > "$RUN_DIR/state/CLUSTER.fail"; exit 1; }
  touch "$RUN_DIR/state/CLUSTER.marker"
  rm -f "$RUN_DIR/state/CLUSTER.fail"
fi
echo "PIPELINE_DONE" > "$RUN_DIR/state/PIPELINE.marker"
