---
name: do-e2e
description: "Sử dụng để thực hiện test e2e playwright cho các AC trong nhánh URD đang thực thi"
category: workflow
keywords: [test, e2e, playwright]
argument-hint: "<description>"
metadata:
  author: utop
  version: "1.0.0"
---

# Workflow

1. Chạy Unit Test (Karma + Jasmine) — thư mục `apps/angular`.
```bash
cd apps/angular
yarn install                      # nếu chưa cài dependency
yarn test:headless                # chạy toàn bộ: banking-service → FPTCXSuite → saas-service (ChromeHeadless, watch=false)
```
2. Chạy E2E Playwright — thư mục `apps/angular/e2e-playwright` (package.json + yarn.lock RIÊNG).
    - Cài một lần:
    ```bash
    cd apps/angular/e2e-playwright
    yarn install
    yarn browsers    # playwright install chromium — phải khớp version đã pin
    cp .env*  # điền PW_USER / PW_PASSWORD (gitignored, không hardcode)
    ```
    - Prereq chạy local (đủ 4 thứ trước khi chạy test):
        1. AuthServer ở cổng 44366
        2. SaasService ở cổng 44357
        3. WebGateway ở cổng 44323
        4. cd apps/angular && yarn dev (FE ở cổng 4200)
        5. Cổng nào thiếu thì tự start thêm bằng script `localhost.sh`
        6. Kiểm tra và thêm `buckets` (nếu chưa có) nếu cần dùng storage.
    - Chạy:
    ```bash
    yarn test                                  # TẤT CẢ spec (api + ui, sequential, workers=1)
    yarn test:regression                       # tuyển @regression GỒM @blocked — CI dùng cái này
    yarn test:green                            # @regression trừ @blocked — dùng lúc đang sửa
    npx playwright test tests/<Module>/<MÃ-UC> # chạy 1 UC
    npx playwright test --grep @case:<MÃ-AC>   # chạy đúng 1 AC
    yarn report                                # mở HTML report lần chạy gần nhất
    ```
3. Hiển thị tổng quát kết quả của lượt chạy.
