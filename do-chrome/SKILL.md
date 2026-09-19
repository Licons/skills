---
name: do-chrome
description: "Test UI/UX in chrome."
---

> Tạo Todo/Monitor để theo dõi tiến độ.
> CÓ CHROME MCP -> bắt buộc verify trước khi báo xong.

# PHA 1 - Trích token từ DESIGN (không đọc CSS bằng mắt):

- Tạo nhánh mới.
- Mở file `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/**.html` trong Chrome.
- Với mỗi element chính (heading, body, button, card, tab, input, badge):
  **luôn luôn** chạy getComputedStyle() và ghi lại:
  LOV, layout, panel, card, tab, button, popup, tooltip, badge, sidebar,
  font-family, font-size, font-weight, font-color, font icon, line-height, letter-spacing,
  color, background-color, border, border-radius, border-color,
  padding, margin, gap, box-shadow, width/height nếu cố định.
- Xuất ra `design-tokens.json`. Thông tin tới user.

# PHA 2 - Implement/Update

- Design *có thể* bị lỗi *Ngôn ngữ* (không đồng bộ) nên có thể dịch ra theo localization để đối chiếu lại Angular.
- Kiểm tra lại `localization` trên toàn trang để chuẩn hóa (fix hardcode text).
- Implement Angular theo `tokens.json` (không tự chế giá trị) - cập nhật lại vào `bank-theme`.
- FE angular sẽ ẩn những thứ design không mô tả, tạo mới/mockup cái mới theo design.
- Đọc tài liệu `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/**` để implement BE (nếu có), không có BE thì mockup UI cho Angular.
- Mọi quyết định bám trên design trước, **không** tự quyết định hoặc **hỏi** user.

# PHA 3 — Verify:

- Kiểm tra môi trường, dùng `localhost.sh` để start/restart những service cần dùng.
- Mở lại 2 tab: design-export và localhost:4200/<route>.
- Với từng element trong bảng map, lấy computed style cả 2 bên, so từng property, xuất bảng: property | design | angular | MATCH/DIFF.
- Chỉ được báo hoàn thành khi 0 DIFF hoặc DIFF đã được tôi duyệt.
- Chỉnh sửa xong hết 1 lượt rồi mới cho phép re-build, tránh build loop mất thời gian.

# Kiểm thêm:
- state: hover, focus, active, disabled (dùng CDP forcePseudoState hoặc dispatch event).
- tab/accordion: chụp computed style ở từng trạng thái đóng/mở.
- design version theo phân hệ trong function notes: cập nhật lại theo design file.
