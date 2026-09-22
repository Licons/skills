---
name: do-chrome
description: "Implement and verify Angular UI against exported HTML design using Chrome MCP."
---

# Rules

* Design là source of truth cho UI. Không redesign, simplify, tự cải tiến.
* Không đoán nếu có thể inspect từ HTML/DOM/computed style/assets/code/docs.
* Trước khi code, inventory toàn bộ element nhìn thấy.
* Mỗi element design phải có counterpart trên FE; thiếu = `DIFF`.
* Không silently bỏ text, icon, divider, helper text, decoration, state.
* Icon/image/SVG phải đúng identity/source; không dùng cái "gần giống".
* Known `DIFF` chưa được duyệt = chưa xong.
* Không bịa đã hỏi/đã chốt/đã được duyệt.
* Không suy đoán mà dựa trên DOM Design.
* Không dùng icon/svg khác ngoài **Lucide**.

> Tạo Todo/Monitor theo dõi tiến độ.
> Có Chrome MCP → bắt buộc verify trước khi báo xong.
> Đối chiếu DOM HTML → bắt buộc verify đủ các thành phần như design.
> Nhiều tab/màn → làm TUẦN TỰ, không song song nếu dùng shared files.

# PHA 1 — Inspect DESIGN

* Đọc README/changelog/docs trước khi tin version theo tên file.
* Đọc tài liệu liên quan trong `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1`.
* Mở design HTML (`<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export`) trong Chrome và đọc DOM liên quan.
* Inventory: text, icon, image, card, tab, input, badge, divider, helper text, popup, sidebar, decoration, `::before/::after`, states.
* Dùng `getComputedStyle()` + `getBoundingClientRect()` + screenshot; không đoán CSS bằng mắt.
* Kiểm tra khi relevant:

  * layout, width/height, padding/margin/gap
  * font family/size/weight/color/line-height
  * background, border, radius, shadow
  * icon/SVG source, size, fill/stroke
* Token global đo 1 lần; khác theo tab/state thì ghi variant.
* Xuất `design-tokens.json`.

# PHA 2 — Implement

* Tạo nhánh + plan để implement.
* Implement Angular theo design + `design-tokens.json`.
* Follow project conventions; không refactor unrelated code.
* Localization/docs là source of truth cho text/business.
* Chỉ ẩn feature hiện có nếu design không thể hiện.
* Không có BE → mock tối thiểu đủ render hoặc AskUserQuestion; không tự suy schema/API/business rule.
* UI conflict → theo design.
* Business/schema/security chưa rõ → AskUserQuestion; không hỏi được thì ghi GAP, không tự quyết.

# PHA 3 — Verify

* Start/restart bằng `localhost.sh`; không kill tay.
* Mở design + localhost cùng viewport/state.
* Verify theo thứ tự:

1. **Coverage** FE với Design — mọi design element có counterpart.
2. **Structure** FE với Design — text/order/icon/assets đúng.
3. **Computed style** FE với Design — geometry/style bằng Chrome.
4. **Screenshot** 2 ảnh FE với Design — check tổng thể cuối cùng.
5. **DOM HTML** FE với Design - check số trường element, text.

* Property đo được → đo, không kết luận bằng cảm giác.
* `"looks good"`, `"close enough"`, `"mostly match"` không phải verify.

Loop bắt buộc:

`COMPARE → DIFF → FIX → RELOAD → COMPARE`

Chỉ xong khi `0 DIFF` hoặc DIFF đã được user duyệt.

# Build / Test

* Sửa xong một lượt rồi build, tránh build loop.
* Xong tất cả màn → chạy build/test không filter hẹp.
* Nghi lỗi có sẵn → `git stash -u`, test baseline, rồi `stash pop`.

# Subagent

* Scope giao phải hẹp và rõ.
* Shared files → xử lý tuần tự.
* Nhiều agent ghi đồng thời → dùng worktree.
* Coordinator phải tự verify lại; không tin báo cáo `"done"`.

# Final

Chỉ báo:

* files changed
* implemented
* verification/build/test
* GAP/DIFF còn lại
