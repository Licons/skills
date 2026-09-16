---
name: fix-bugs
description: "Sử dụng để thực hiện fix các bugs trên ADO"
category: workflow
keywords: [fix,bugs,ado]
argument-hint: ""
metadata:
  author: utop
  version: "1.0.0"
---

> Tạo todo để thực hiện các workflow dưới đây.

# Workflow

1. Đọc danh sách các bugs `https://dev.azure.com/Loyalstar/VietBank/_queries/query/a8e0b97f-e38b-4beb-96cc-a41ad562c618/`.
2. Đọc tài liệu URD/UC/AC liên quan `<repo>/../Utop.VietBank.CRM.Documents//outputs/urd/Delivered/Phase 1`
3. Đọc design layout khi cần `<repo>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export`
4. Compare lại so với `codebase` (dùng `graphify` hoặc scout).
5. Tạo nhánh mới để fix bugs.
6. Tạo plan để fix bugs trên ADO.
7. Commit code.
