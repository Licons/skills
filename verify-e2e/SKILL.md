---
name: verify-e2e
description: "Sử dụng để thực hiện verify các spec của e2e playwright"
category: workflow
keywords: [e2e, playwright, verify]
argument-hint: "<description>"
metadata:
  author: utop
  version: "1.0.0"
---

# Workflow

- Đọc plan theo `<description>` -> so sánh với `codebase` + `graphify`.
- Đọc mô tả từng AC -> kiểm tra các bước thực hiện -> kiểm chứng spec của e2e playwright.
- Fix từng AC nếu xảy ra lỗi, cập nhật lại các bước thực hiện nếu thiếu.
- Tìm solution dựa trên `codebase` đã có để giải quyết các AC còn gap.
- Chạy lại test e2e playwright cho các AC này.
- Commit tiếng Anh `fix(e2e): <description>`.
