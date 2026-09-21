---
name: do-bugs
description: "Sử dụng để thực hiện fix các bugs trên ADO"
category: workflow
keywords: [fix,bugs,ado]
argument-hint: ""
metadata:
  author: utop
  version: "1.0.0"
---

> Tạo Todo/Monitor để thực hiện các workflow dưới đây.

# Workflow

1. Dùng `az cli` để đọc link `https://dev.azure.com/Loyalstar/VietBank/_queries/query/a8e0b97f-e38b-4beb-96cc-a41ad562c618/` rồi tổng hợp danh sách bug (không phải `Resolved`).
2. Kiểm tra lại tài liệu URD/UC/AC/BR trong `<repo>/..//home/quacn/Projects/VietBank/Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/`.
3. Kiểm tra lại design trong `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export`.
4. Compare lại so với `codebase` (dùng `graphify` hoặc scout).
5. Cập nhật status sang `In Progress` cho các bugs trên ADO.
6. Tạo 1 nhánh mới cho list bugs.
7. Tạo plan để fix bugs theo từng nhóm UC.
8. Fix bugs từng nhóm, nhóm dễ nhất, phức tạp sau. Comment chi tiết vào `Discussion` nếu không phải bug của code (dẫn chứng nguyên văn URD/UC/AC/BR).
9. Commit code Tiếng Anh.
10. Dùng Chrome MCP để verify lại bugs.
11. Chụp ảnh và comment vào bugs.
