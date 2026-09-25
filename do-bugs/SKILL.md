---
name: do-bugs
description: "Sử dụng để thực hiện quy trình fix các bugs trên ADO"
category: workflow
---

# Workflow

> Tạo Todo/Monitor để thực hiện các workflow dưới đây.
> **Không** tự ý chuyển trạng thái Bugs sang `Resolved`

- Tạo nhánh `fix/ado-{stamp}`.
- Dùng `az cli` để đọc link `https://dev.azure.com/Loyalstar/VietBank/_queries/query/a8e0b97f-e38b-4beb-96cc-a41ad562c618/` để liệt kê danh sách bug (không phải `Resolved`, `Removed`).
- Phân loại bugs `severity` + phân hệ + UC.
- Đọc thông tin của bugs (Repro Steps + AC + Discussion + Attachment)
- Đọc lại design theo Bugs trong `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export` + docs.
- Đọc tài liệu URD/UC/AC/BR theo Bugs trong `<repo>/..//home/quacn/Projects/VietBank/Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/`.
- Compare lại so với `codebase` (dùng `graphify` hoặc scout).
- Xác định lại đó là Bugs hay là GAP.
  - Nếu là Bugs thì tìm `root cause` của nó.
  - Nếu là GAP thì dẫn chứng nguyên văn URD/Design vào file GAP.
- Cập nhật status sang `In Progress` cho các bugs có `root cause` trên ADO.
- Liệt kê ngắn gọn thông tin bugs và cách fix, `AskUserQuestion` để tiếp tục.
- Tạo plan để fix bugs theo từng nhóm UC.
- Fix bugs từng nhóm, nhóm dễ nhất, phức tạp sau.
- Commit code Tiếng Anh + push + gắn workitems + mỗi 1 bugs 1 commit `AB#<id>`.
- Dùng Chrome MCP để verify lại bugs.
- `Screenshot` kết quả và `nhúng` vào `comment` của bugs.

# Template cho Comment

```html
<strong>Root Cause<strong>: mô tả ngắn gọn
<strong>Verify</strong>: <img /> < hình screenshot
```
