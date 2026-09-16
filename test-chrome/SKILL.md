---
name: test-chrome
description: "Test UI/UX in chrome."
---

> Tạo Todo để thực hiện tất cả công việc trong Workflow sau.

# WORKFLOW

1. Đọc chi tiết design layout `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export`
2. Đọc tài liệu URD/UC/AC liên quan `<repo>/../Utop.VietBank.CRM.Documents//outputs/urd/Delivered/Phase 1`
3. Đọc `bank-theme` để cập nhật/sử dụng.
4. Compare với `codebase` FE angular components và design để tìm GAP.
4. Đồng bộ FE agular components theo design (font, size, color, card, tab, popup, action, layout, padding, text localization key,...).
5. Kiểm tra tài liệu AC so sánh với design layout.
6. Tạo nhánh để fix gap.
7. Dùng script `localhost.sh` để start/stop/restart các services.
8. Mở Chrome MCP (FE + design layout file) -> screenshot full page + compare lại UI/UX của design.
9. Commit code Tiếng Anh.
