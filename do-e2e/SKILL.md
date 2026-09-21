---
name: do-e2e
description: "Sử dụng để viết e2e Playwright kiểm chứng lại AC"
argument-hint: "--urd <urd path> --type <phân hệ>"
---

> Tạo Todo/Monitor để thực hiện workflow sau:

# Workflow

1. Đọc file URD của `--urd` theo phân hệ `--type`.
2. Liệt kê danh sách UC theo template sau:
  - <Mã UC> <Tiêu đề UC>
    - <Kịch bản thành công chính>
    - <Luồng phụ>
    - <Luồng ngoại lệ>
    - Quy tắc nghiệp vụ
      - | Mã | Ưu tiên | Tên quy tắc | Quy tắc nghiệp vụ (đầy đủ) |
    - Danh sách AC
      - | Mã AC | Loại | Tiêu chí chấp nhận (Giả sử-Khi-Thì) | Truy vết |
3. Quét lại e2e Playwright đang có theo phân hệ `--type`
4. Thực hiện viết mới/cập nhật cho các AC theo cách gọi UI với workflow sau:
  - Liệt kê danh sách các AC.
  - Xây dựng step ban đầu dựa trên <Kịch bản thành công chính> cho các AC
  - Bổ sung thêm <Tiêu chí chấp nhận (Giả sử-Khi-Thì)> | <Luồng phụ> | <Luồng ngoại lệ> vào step cho riêng từng AC
  - Kiểm tra lại Spec đã đầy đủ chưa
5. Chạy e2e playwright + screenshot để verify trong `ac-report.html`.
