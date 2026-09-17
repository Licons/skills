---
name: test-chrome
description: "Test UI/UX in chrome."
---

> Tạo Todo/Monitor để thực hiện tất cả công việc trong Workflow sau.

# WORKFLOW

1. Design layout `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/**`.
2. Đọc `bank-theme` để biết theme đang có.
3. Lập danh sách các FE-mismatch-design và todo cần phải fix.
4. Implement FE theo design (element, font, size, color, card, tab/sub-tab, popup, input style, layout, padding, text localization key,...).
5. Bỏ/ẩn FE components nếu bị dư so với design. Mockup FE như design nếu chưa có (BE sẽ làm sau).
6. Dùng script `localhost.sh` để start/stop/restart các services.
7. Mở file design trong browser qua Chrome DevTools để FE đo trực tiếp với design.
8. Commit code Tiếng Anh.
