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

- Đọc `<repo-root>/.env*` lấy mã `WH_TOKEN`.
- Đọc `<repo-root>/scripts/cursor.txt`:
  - Thay `<hook-id>` = `WH_ID`.
  - Thay `<token>` = `WH_TOKEN`.
  - Thay `<description>` = mô tả cho việc chạy test theo working của session này.
  - Thay `<session-id>` = session id này.
  - Thay `<branch-name>` = tên nhánh working này.
- Chạy curl với thông số trên `curl --location '<url>' --header … --data … --silent`.
