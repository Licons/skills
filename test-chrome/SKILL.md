---
name: test-chrome
description: "Test UI/UX in chrome."
---

> Tạo Todo để thực hiện tất cả công việc trong Workflow sau.

# WORKFLOW

1. Đọc chi tiết design layout `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export`
2. Đọc tài liệu liên quan `<repo>/../Utop.VietBank.CRM.Documents//outputs/urd/Delivered/Phase 1`
3. Compare với `codebase`, `bank theme` của FE angular components để tìm GAP design.
4. Kiểm tra/so sánh/cập nhật/đồng bộ lại giao diện FE agular components theo design (font, size, color, card, tab, popup, action, layout, padding, text localization key,...).
5. Kiểm tra tài liệu AC so sánh với design layout.
6. Dùng script `localhost.sh` để start/stop/restart các services.
7. Mở Chrome MCP để đối chứng lại UI/UX thực tế so với design.
8. Tạo nhánh và commit code.
