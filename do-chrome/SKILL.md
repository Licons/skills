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

> Tạo Todo/Monitor theo dõi tiến độ.
> Có Chrome MCP → bắt buộc verify trước khi báo xong.
> Có browser_use → double-check.
> Nhiều tab/màn → làm TUẦN TỰ, không song song nếu dùng shared files.

# PHA 1 — Inspect DESIGN

* Đọc README/changelog trước khi tin version theo tên file.
* Mở design HTML trong Chrome.
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

* Tạo plan để implement.
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

1. **Coverage** — mọi design element có counterpart.
2. **Structure** — text/order/icon/assets đúng.
3. **Computed style** — geometry/style bằng Chrome.
4. **Screenshot** — check tổng thể cuối cùng.

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
