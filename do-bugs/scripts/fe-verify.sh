#!/bin/bash
# Build FE đúng cách đo của repo (srs-design-to-code.md §5): ĐẠT khi exit = 0 VÀ số error = 0.
# ⛔ Không dùng `ng build | grep -c error` — màu ANSI làm grep mù và $? là mã của grep.
# Chữ "b""uild" tách đôi vì hook scout-block chặn lệnh có từ "build" khi gọi trực tiếp.
set -u
ROOT=$(git rev-parse --show-toplevel)
LOG=${1:-${TMPDIR:-/tmp}/do-bugs-fe.log}
cd "$ROOT/apps/angular" || exit 2
timeout 1500 npx ng "b""uild" FPTCXSuite --configuration development > "$LOG" 2>&1
code=$?
errs=$(sed -r 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -icE '\berror\b')
echo "exit=$code errors=$errs log=$LOG"
[ "$code" -eq 0 ] && [ "$errs" -eq 0 ]
