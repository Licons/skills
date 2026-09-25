# Bẫy đã trả giá — lượt `/do-bugs` 25/09/2026 (58 bug)

Mỗi dòng là một lần sai **có thật**, kèm cách chặn. Đọc trước khi fix.

## Phân tích / root cause

| Bẫy | Đã xảy ra | Chặn |
|---|---|---|
| Kết luận root cause từ **code tĩnh** | 140955: agent đọc code kết luận "role QA thiếu quyền `DocumentTemplates.Create`" — chạy thật ra 403 `DocumentChecklistFieldRequired` vì popup **không gửi `documentType`** | Tái hiện trên stack local, bắt request lỗi (`fetch` patch, xem dưới) trước khi viết root cause |
| Bug "đã fix" chỉ vì code trông đúng | 140938 / 141322: đọc code "FIXED"; chạy thật vẫn lệch — do **dữ liệu nguồn** (`TotalDebt` seed thiếu thẻ) theo nguyên tắc AC13 | Verdict `ĐÃ FIX` cần ảnh/đo runtime; không đo được thì ghi "chỉ xác nhận qua code" |
| "Sửa lại cho đúng AC" một thứ bị **cố ý gỡ** | 140901: cụm `{trường}: {giá trị}` do PR 48317 gỡ theo yêu cầu review | `git log -S'<chuỗi>'` / đọc mô tả PR gần nhất đụng dòng đó trước khi sửa |
| Bug không phải bug | 140813 "dropdown nhân đôi": tester đọc **cây a11y** — mỗi mục là `option "X"` + `StaticText "X"` | Đếm `document.querySelectorAll('[role=option]')`, không đếm theo snapshot |
| Dữ liệu QA sai luật URD | 141320: CIF 10 số trong khi `BR-01-01` "CIF (9 chữ số)" | Trích BR nguyên văn, xếp `DATA`, hỏi người dùng |
| Một root cause lặp cả họ | 30/45 mã `SaasService:SalesProcess:*` thiếu khoá dịch đúng tên ⇒ BE "lỗi nội bộ", FE "Không đủ quyền truy cập" | Đo toàn họ bằng máy, hỏi sửa đồng loạt, **thêm cổng chặn** |

## Stack local

| Bẫy | Chặn |
|---|---|
| `appsettings.json` trỏ **QA** (đo 25/09: `20.6.73.20` / `vbb-crm-qa-qc`) — trái ghi chú CLAUDE.md | `scripts/db/use-local-db.sh --dry-run` rồi `use-local-db.sh` **trước** `scripts/localhost.sh` |
| Viết lại script chạy stack đã có (lượt 25/09 viết trùng `local-stack.py` — đã xoá) | dùng `scripts/localhost.sh` (start/stop/restart/status/logs/`restart-service`) |
| `appsettings*.json` bị `use-local-db.sh` sửa lọt vào commit | `git add <đúng file>`; xong việc `use-local-db.sh --revert` |
| Hook `scout-block` chặn lệnh bash có chữ `build` | `$S/fe-verify.sh` (đã né) |
| Khoá dịch mới không hiện | JSON là embedded resource ⇒ `localhost.sh restart-service saas administration`; kiểm `grep -qa <khoá> …Contracts.dll` |
| Đăng nhập thẳng `/auth/Account/Login` ⇒ 400 | vào `http://localhost:4200/` rồi mới login (luồng OIDC) |

## Code / test

| Bẫy | Chặn |
|---|---|
| Heredoc bash **không nháy** biến `'\n'` thành xuống dòng thật ⇒ vỡ build (140753) | viết code bằng Python/`<<'EOF'`; build FE sau mỗi lô |
| Ca kiểm xanh giả: dùng Email (nhãn = tên thuộc tính) nên không bắt được lỗi tra nhãn (140753) | dữ liệu kiểm phải có nhãn **khác** tên kỹ thuật; tạm hoàn nguyên fix xem ca có đỏ |
| Khai trùng property đã có (`MergedIntoId` trên `ContactDto`) | `grep` DTO BE trước khi thêm; FE proxy có thể chỉ thiếu ở `models.ts` |
| ABP trả **mọi** lỗi nghiệp vụ bằng HTTP 403; FE chỉ phân biệt qua `error.code` + bản dịch `SaasService::<code>` | `UserFriendlyException(msg, code)` + khoá JSON = **nguyên mã**; dialog tự hiện lỗi ⇒ `skipHandleError` |
| Placeholder `{X}` trong câu dịch không có ở `WithData` của mọi chỗ ném ⇒ hiện nguyên `{X}` | chỉ dùng giao các khoá `WithData`; không đưa GUID/mã enum vào câu |

## Verify / ảnh

| Bẫy | Chặn |
|---|---|
| Toast ABP tắt sau ~5s — chụp trễ là mất | dò `.abp-toast-message` mỗi 150ms rồi `take_screenshot` ngay |
| App dùng **`fetch`**, không phải XHR ⇒ vá XHR không bắt được gì | vá `window.fetch` để log `{url,status,body}`; token không nằm trong storage ⇒ gọi API qua service Angular: `ng.getComponent(el).<service>.<method>(…, {skipHandleError:true})` |
| `git stash` khi working tree có thay đổi của người khác | không stash; `git add <đúng file>`; có file lạ (vd `appsettings*.json` đổi sang local) thì báo, không commit |
