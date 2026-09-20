---
name: do-chrome
description: "Test UI/UX in chrome."
---

> Tạo Todo/Monitor để theo dõi tiến độ.
> CÓ CHROME MCP -> bắt buộc verify trước khi báo xong.
> Nhiều tab/màn trong 1 lượt -> xử lý TUẦN TỰ, không song song (hay dùng chung file: localization,
> ModelSnapshot, component shared).

# PHA 1 - Trích token từ DESIGN (không đọc CSS bằng mắt):

- Tạo nhánh mới (1 lần/lượt; nhiều tab thì đi tiếp cùng nhánh).
- Đọc README/changelog của bundle trước khi tin version qua tên file.
- Mở file `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/**.html` trong Chrome.
- Với mỗi element chính (heading, body, button, card, tab, input, badge):
  **luôn luôn dùng getComputedStyle()** để so sánh và ghi lại:
  LOV, layout, panel, card, tab, button, popup, dialog, tooltip, badge, sidebar,
  font-family, font-size, font-weight, font-color, font icon, line-height, letter-spacing,
  color, background-color, border, border-radius, border-color,
  padding, margin, gap, box-shadow, width/height nếu cố định.
- Token nền đo 1 lần, dùng chung cho mọi tab.
- Xuất ra `design-tokens.json`. Thông tin tới user.

# PHA 2 - Implement/Update

- Design *có thể* bị lỗi *Ngôn ngữ* nên có thể dịch ra theo localization để đối chiếu lại Angular.
- Kiểm tra lại `localization` trên toàn trang để chuẩn hóa (fix hardcode text).
- Implement Angular theo `tokens.json` (không tự chế giá trị) - cập nhật vào `bank-theme`.
- FE ẩn những thứ design không mô tả, tạo mới/mockup cái mới theo design.
- Đọc `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/**` để implement BE; không có BE thì mockup UI.
- **Quyết định khi design ≠ code**: thuần UI (token/layout/text) → theo design, không hỏi. Có tiền lệ
  đã được duyệt thật trong lượt → áp lại, ghi rõ là áp tiền lệ (không bịa là đã hỏi lại). Quyết định
  nghiệp vụ/schema/bảo mật mới → có user thì hỏi thật; không có ai để hỏi thì ghi GAP
  (`implementation.md` §1), đừng tự quyết, đừng bịa đã hỏi.

# PHA 3 — Verify:

- Dùng `localhost.sh` để start/restart service. Restart 1 service dùng chung → chỉ dùng
  `./scripts/localhost.sh restart-service <tên>`, không `kill` tay, không `start-be.ps1`.
- Thêm khoá localization → build lại + restart cả `administration`, verify qua
  `application-configuration`, đừng tin build xanh là đã lên chữ.
- Mở lại 2 tab: design-export và localhost:4200/<route>, so computed style từng property, xuất bảng
  MATCH/DIFF. Chỉ báo xong khi 0 DIFF hoặc đã được duyệt.
- Sửa xong hết 1 lượt mới re-build, tránh build loop.
- Xong hết các tab thì chạy thêm 1 lượt build/test KHÔNG lọc hẹp theo tên (filter hẹp có thể che lỗi
  chéo màn). Nghi test fail có sẵn từ trước → `git stash -u`, chạy lại trên code gốc để xác nhận, rồi
  `stash pop` ngay.

# Giao việc cho subagent/fork (chạy không giám sát nhiều tab)

- Tuần tự, không song song. Phạm vi giao phải HẸP và rõ bằng chữ — đừng để agent tự suy phạm vi từ
  ngữ cảnh rộng hơn nó thấy.
- Cấm agent tự viết "đã hỏi/đã chốt với anh X" nếu không có input thật.
- Nhiều agent ghi file đồng thời → cách ly worktree; tuần tự 1 agent thì sửa thẳng nhánh hiện tại.
- Coordinator luôn tự verify lại (build/test/migration) — không tin báo cáo "xong" của agent.

# Kiểm thêm:
- state: hover, focus, active, disabled (dùng CDP forcePseudoState hoặc dispatch event).
- tab/accordion: chụp computed style ở từng trạng thái đóng/mở.
- design version theo phân hệ trong function notes: cập nhật lại theo design file.
