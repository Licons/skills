---
name: do-test
description: "Sử dụng để thực hiện test các AC trong nhánh URD đang thực thi"
category: workflow
keywords: [test, urd, use-case, uc, acceptance-criteria, ac, vietbank, plan, cook, verify]
argument-hint: ""
metadata:
  author: utop
  version: "1.0.0"
---

# Workflow

- Đọc `<repo-root>/.env` lấy mã `WH_TOKEN`.
- Đọc `<repo-root>/scripts/cursor.txt`, thay `<hook-id>` = `WH_ID`, thay `<token>` = `WH_TOKEN`, thay `<session-id>` = session id này, thay `<branch-name>` = tên nhánh working này.
- Chạy curl với thông số trên.
- Tạo một Subagent `listen` ngầm chạy `python $HOME/Projects/webhook-agents/watcher.py` để lắng nghe file `$HOME/events.jsonl`. Khi có event mới thì phân tích và báo lại cho session.
- Nếu nhận được `"event": "fix"` có `session-id` là của mình thì giải quyết.
- Nếu nhận được `"event": "test"` có `session-id` stop subagent `listen`.
