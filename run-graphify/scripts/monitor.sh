#!/usr/bin/env bash
# Đọc NỘI DUNG state file để theo dõi tiến độ. Không dựa vào exit code và
# không dựa vào `pgrep` — job nền bị SIGKILL thì cả hai đều nói dối.
#
# Dùng:  scripts/monitor.sh
# Env:    RUN_DIR (default /tmp/opencode/graphify-run)
set -uo pipefail
RUN_DIR="${RUN_DIR:-/tmp/opencode/graphify-run}"
S="$RUN_DIR/state"
[ -d "$S" ] || { echo "state dir không tồn tại: $S — RUN_DIR đúng chưa?"; exit 1; }

# Chỉ tính file state BẰNG NỘI DUNG (OK|/FAIL|), không đếm theo tên — file marker
# mốc giai đoạn cũng mang đuôi .done nên đếm theo tên sẽ hỏng số liệu.
states=$(cat "$S"/*.done 2>/dev/null | grep -E '^(OK|FAIL)\|')
total=$(printf '%s' "$states" | grep -c '' || true)
ok=$(printf '%s' "$states" | grep -c '^OK|' || true)
fail=$(printf '%s' "$states" | grep -c '^FAIL|' || true)

if [ -f "$S/PIPELINE.marker" ]; then phase="PIPELINE_DONE"
elif [ -f "$S/CLUSTER.marker" ] || [ -f "$S/CLUSTER.fail" ]; then phase="clustered"
elif [ -f "$S/CLUSTER.fail" ] || [ -f "$S/CLUSTER.started" ]; then phase="clustering"
elif [ -f "$S/MERGE.marker" ] || [ -f "$S/MERGE.fail" ]; then phase="merged"
elif [ -f "$S/EXTRACT.marker" ]; then phase="extracted"
else phase="extracting"; fi

# \K bắt buộc ở cả hai: nếu không, awk nhận "|459" và cộng ra 0.
tn=$(printf '%s' "$states" | grep '^OK|' | grep -oP '\|\K[0-9]+(?=n\|)' \
      | awk '{s+=$1} END{printf "%d", s+0}')
te=$(printf '%s' "$states" | grep '^OK|' | grep -oP '\|\K[0-9]+(?=e\|)' \
      | awk '{s+=$1} END{printf "%d", s+0}')

printf 'phase=%-11s done=%-3s ok=%-3s fail=%-3s nodes=%-9s edges=%s\n' \
  "$phase" "$total" "$ok" "$fail" "$tn" "$te"

if [ "$fail" -gt 0 ]; then
  echo "--- FAIL ---"
  printf '%s' "$states" | grep '^FAIL|' | sort
  for f in "$S"/*.fail; do [ -f "$f" ] && { echo "--- $(basename "$f") ---"; cat "$f"; }; done
fi
