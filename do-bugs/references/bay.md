# Bẫy đã trả giá — lượt `/do-bugs` 25/09/2026 (58 bug) · 28/09/2026 (23 bug)

Mỗi dòng là một lần sai **có thật**, kèm cách chặn. Đọc trước khi fix.

## Phân tích / root cause

| Bẫy | Đã xảy ra | Chặn |
|---|---|---|
| Kết luận root cause từ **code tĩnh** | 140955: agent đọc code kết luận "role QA thiếu quyền `DocumentTemplates.Create`" — chạy thật ra 403 `DocumentChecklistFieldRequired` vì popup **không gửi `documentType`** | Tái hiện trên stack local, bắt request lỗi (`fetch` patch, xem dưới) trước khi viết root cause |
| Bug "đã fix" chỉ vì code trông đúng | 140938 / 141322: đọc code "FIXED"; chạy thật vẫn lệch — do **dữ liệu nguồn** (`TotalDebt` seed thiếu thẻ) theo nguyên tắc AC13 | Verdict `ĐÃ FIX` cần ảnh/đo runtime; không đo được thì ghi "chỉ xác nhận qua code" |
| "Sửa lại cho đúng AC" một thứ bị **cố ý gỡ** | 140901: cụm `{trường}: {giá trị}` do PR 48317 gỡ theo yêu cầu review | `git log -S'<chuỗi>'` / đọc mô tả PR gần nhất đụng dòng đó trước khi sửa |
| Bug không phải bug | 140813 "dropdown nhân đôi": tester đọc **cây a11y** — mỗi mục là `option "X"` + `StaticText "X"` | Đếm `document.querySelectorAll('[role=option]')`, không đếm theo snapshot |
| Dữ liệu QA sai luật URD | 141320: CIF 10 số trong khi `BR-01-01` "CIF (9 chữ số)" | Trích BR nguyên văn, xếp `DATA`, hỏi người dùng |
| Verdict "đọc code" đăng lên ADO rồi **treo** | 28/09 phải chạy lại 9/22 bug; 138294 câu "chỉ 1 thông báo" SAI so với ảnh reopen của QA | spec `level: code` ⇒ Verify có dấu `chỉ đọc code`; `ado-dump-bugs.py` xếp `reverify` |
| Agent báo "thiếu/không được gắn" một thứ bị gỡ **cố ý** | 139774: `credit-facilities-block` — PR 48495 ghi *"Bỏ khối Hạn mức tín dụng … theo design"* | `references/verify-agent.md` §4: `git log -S` + đọc mô tả PR |
| Bug "mới" không tái hiện | 28/09: chi tiết quy trình mở thẳng URL "rỗng / về CASA" — agent chụp **khung đang tải** (select chưa có giá trị hiện option đầu) | đo sau khi API trả + so 3 đường vào (list · URL · F5) trước khi tạo bug |
| Một root cause lặp cả họ | 30/45 mã `SaasService:SalesProcess:*` thiếu khoá dịch đúng tên ⇒ BE "lỗi nội bộ", FE "Không đủ quyền truy cập" | Đo toàn họ bằng máy, hỏi sửa đồng loạt, **thêm cổng chặn** |

## Stack local

| Bẫy | Chặn |
|---|---|
| `appsettings.json` trỏ **QA** (đo 25/09: `20.6.73.20` / `vbb-crm-qa-qc`) — trái ghi chú CLAUDE.md | `scripts/db/use-local-db.sh --dry-run` rồi `use-local-db.sh` **trước** `scripts/localhost.sh` |
| Viết lại script chạy stack đã có (lượt 25/09 viết trùng `local-stack.py` — đã xoá) | dùng `scripts/localhost.sh` (start/stop/restart/status/logs/`restart-service`) |
| `appsettings*.json` bị `use-local-db.sh` sửa lọt vào commit | `git add <đúng file>` |
| ⛔ **Đưa `appsettings` về HEAD (QA) khi service còn chạy** — 28/09: `git checkout` lúc 13:33:57 ⇒ 13:36:27 `saas` **tự nạp lại** config và nối `20.6.73.20` mỗi ~5 phút (`reloadOnChange`). Thoát nhờ máy không tới được QA | **dừng stack trước** (`localhost.sh stop`) rồi mới `git checkout`; lỡ rồi ⇒ chạy lại `use-local-db.sh`, kiểm `grep 20.6.73 .run-logs/<svc>.log` |
| `use-local-db.sh --revert` không trả đúng HEAD — ghi `Authority` = `https://vb.manhvd.dev/auth` (19 tệp) | không dùng; `git checkout -- <appsettings>` (sau khi dừng stack) |
| Rebase/pull đưa `appsettings.json` trỏ QA quay lại (develop 28/09: 91/91 khoá `20.6.73.20`) | sau rebase: chạy lại `use-local-db.sh` + đo `Server=` |
| DB local **rỗng** phần cần kiểm (28/09: 0 Lead · 0 Opp · 0 Product · 0 AdministrativeDivisions) ⇒ agent chạy cả vòng mới phát hiện | tiền đề dữ liệu (`SKILL.md` §3) trước khi tái hiện; dữ liệu test qua API, tiền tố `VERIFY-` |
| Hook `scout-block` chặn lệnh bash có chữ `build` | `$S/fe-verify.sh` (đã né) |
| Khoá dịch mới không hiện | JSON là embedded resource ⇒ `localhost.sh restart-service saas administration`; kiểm `grep -qa <khoá> …Contracts.dll` |
| Đăng nhập thẳng `/auth/Account/Login` ⇒ 400 | vào `http://localhost:4200/` rồi mới login (luồng OIDC) |

## Agent / workflow

| Bẫy | Chặn |
|---|---|
| Tin nhắn người dùng gửi giữa lượt **được chuyển tới agent** — "anh chạy … rồi nhé" (= đã làm xong) bị đọc thành lệnh ⇒ agent từ chối rồi **bỏ nhiệm vụ** | `references/verify-agent.md` §3 |
| Agent **bỏ im** một bug được giao (140810) | schema bắt trả đủ id; agent chính so `set(giao) == set(trả)` |
| Kết quả agent trả qua tin nhắn **bị cắt** giữa chừng | agent ghi JSON ra tệp trong scratch, agent chính đọc tệp |
| Nhiều agent cùng sửa `vi/en.json` / một tệp ⇒ không tách được commit theo bug | khoá dịch qua `keys/<id>.json` + `apply-keys.py`; hunk qua `stage-hunks.py` |
| Phiên Claude khác commit vào **nhánh đang làm** (dùng chung working tree) | soát `git log origin/develop..HEAD` trước push/PR, hỏi người dùng |

## Code / test

| Bẫy | Chặn |
|---|---|
| `ng test <lib> --include=src/…` ⇒ **"Executed 0 of 0 SUCCESS"** (xanh giả) | đường dẫn tính từ **workspace**: `--include=projects/<lib>/src/…/x.spec.ts` |
| Sửa `vi.json` bằng `json.load` → `json.dump` ⇒ đổi thụt lề cả tệp (diff 18k dòng) | chèn **đúng một dòng** bằng thao tác chuỗi cạnh khoá có sẵn, rồi `json.loads` lại để kiểm |
| Heredoc bash **không nháy** biến `'\n'` thành xuống dòng thật ⇒ vỡ build (140753) | viết code bằng Python/`<<'EOF'`; build FE sau mỗi lô |
| Ca kiểm xanh giả: dùng Email (nhãn = tên thuộc tính) nên không bắt được lỗi tra nhãn (140753) | dữ liệu kiểm phải có nhãn **khác** tên kỹ thuật; tạm hoàn nguyên fix xem ca có đỏ |
| Agent không build ⇒ dùng namespace của gói **chưa tham chiếu** ⇒ vỡ biên dịch ở lượt build cuối | kiểm `csproj` trước khi `using` gói mới |
| Sửa luật ở một endpoint, bỏ sót đường tiền-kiểm FE / nhập tệp đi qua hàm khác | đặt luật ở hàm dùng chung; review đối kháng soát mọi đường gọi |
| Vá triệu chứng ở chỗ đọc, gốc nằm ở helper dùng chung (vd chuyển giá trị ô sang chuỗi theo culture) | ca kiểm đỏ thật trước khi sửa; lần ngược tới nơi giá trị đổi dạng |
| Ca «flaky» hoá ra lỗi thật (giá trị mặc định của enum trùng một trạng thái) | tìm gốc trước khi gọi là flaky |
| Khai trùng property đã có (`MergedIntoId` trên `ContactDto`) | `grep` DTO BE trước khi thêm; FE proxy có thể chỉ thiếu ở `models.ts` |
| ABP trả **mọi** lỗi nghiệp vụ bằng HTTP 403; FE chỉ phân biệt qua `error.code` + bản dịch `SaasService::<code>` | `UserFriendlyException(msg, code)` + khoá JSON = **nguyên mã**; dialog tự hiện lỗi ⇒ `skipHandleError` |
| Placeholder `{X}` trong câu dịch không có ở `WithData` của mọi chỗ ném ⇒ hiện nguyên `{X}` | chỉ dùng giao các khoá `WithData`; không đưa GUID/mã enum vào câu |

## Verify / ảnh

| Bẫy | Chặn |
|---|---|
| Chrome MCP không kết nối ⇒ tự chuyển Playwright **không hỏi** (28/09) | `SKILL.md` §7: nạp skill `claude-in-chrome` / thử `mcp__chrome-devtools__*`, `list_connected_browsers`; không được ⇒ **hỏi** người dùng |
| Playwright: vào `/` **không** bị đưa tới login (trang public) · tenant "Không được chọn" ⇒ điền form trước khi trang tải lại sau đổi tenant ⇒ ô trống · token local sống rất ngắn ⇒ 401/màn trắng | `scripts/pw-run.mjs` đã xử lý 2 cái đầu; cái thứ ba: xoá `PW_STATE` rồi chạy lại |
| Hai agent dùng chung một `storageState` ⇒ ghi đè nhau | mỗi agent một `PW_STATE` |
| Ảnh chỉ chụp form, **không** thấy điều comment khẳng định (140963 lượt đầu) | mở ảnh ra xem trước khi nhúng; ảnh phải chứa đúng điều câu Verify nói |
| Bug gắn PR nhưng vẫn `To Do` (28/09: 5/9 — chỉ chuyển trạng thái cho bug **mới**, quên bug `reverify`) · gắn PR chỉ bug có commit, quên bug đã verify lại | `SKILL.md` §4 + §9: chuyển In Progress cả bug `reverify`; `az repos pr work-item list` kiểm đủ id + trạng thái |
| Comment ghi hash commit rồi mới rebase ⇒ hash chết | push trước, comment sau (`ado-post-comments.py` chặn commit chưa push) |
| Toast ABP tắt sau ~5s — chụp trễ là mất | dò `.abp-toast-message` mỗi 150ms rồi `take_screenshot` ngay |
| Chrome MCP `take_screenshot` treo/timeout (máy niri) — cửa sổ mất focus nên trang không vẽ | `niri msg action focus-window --id <id>` rồi chụp lại; focus lại trước mỗi lần nếu cần |
| Chụp khi tab/đếm còn đang tải ⇒ ảnh sai số | chờ nội dung đích (đếm, nhãn) trong `evaluate_script` rồi mới chụp |
| App dùng **`fetch`**, không phải XHR ⇒ vá XHR không bắt được gì | vá `window.fetch` để log `{url,status,body}`; token không nằm trong storage ⇒ gọi API qua service Angular: `ng.getComponent(el).<service>.<method>(…, {skipHandleError:true})` |
| `git stash` khi working tree có thay đổi của người khác | không stash; `git add <đúng file>`; có file lạ (vd `appsettings*.json` đổi sang local) thì báo, không commit |
