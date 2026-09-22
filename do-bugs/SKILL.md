---
name: do-bugs
description: "Sử dụng để thực hiện quy trình fix các bugs trên ADO"
category: workflow
---

> Tạo Todo/Monitor để thực hiện các workflow dưới đây.

# Workflow

> **Không** tự ý chuyển trạng thái Bugs sang `Resolved`

1. Dùng `az cli` để đọc link `https://dev.azure.com/Loyalstar/VietBank/_queries/query/a8e0b97f-e38b-4beb-96cc-a41ad562c618/` rồi tổng hợp danh sách bug (không phải `Resolved`).
2. Đọc tài liệu URD/UC/AC/BR theo Bugs trong `<repo>/..//home/quacn/Projects/VietBank/Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/`.
3. Đọc lại design theo Bugs trong `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export` + docs.
4. Compare lại so với `codebase` (dùng `graphify` hoặc scout).
5. Xác định lại đó là Bugs hay là GAP.
  - Nếu là Bugs thì tìm root cause của nó.
  - Nếu là GAP thì AskUserQuestion dẫn chứng URD/Design.
6. Cập nhật status sang `In Progress` cho các bugs có root cause trên ADO.
7. Tạo 1 nhánh mới cho list bugs.
8. Tạo plan để fix bugs theo từng nhóm UC.
9. Fix bugs từng nhóm, nhóm dễ nhất, phức tạp sau.
10. Comment bằng HTML chi tiết cho người đọc vào `Discussion` nếu không phải bug của code (dẫn chứng nguyên văn URD/UC/AC/BR).
11. Commit code Tiếng Anh.
12. Dùng Chrome MCP để verify lại bugs.
13. `Screenshot` kết quả và `nhúng` vào `comment` của bugs.
