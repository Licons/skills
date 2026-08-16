# Thang verify và điểm mù của từng bậc (INV-2)

> Test xanh không phải bằng chứng. Bằng chứng là: cố tình phá đúng dòng logic đó ⇒ đúng test đó đỏ.

Bốn bậc dưới đây **không** xếp theo độ tin tăng dần. Mỗi bậc **mù một loại lỗi khác nhau**. Bỏ bậc
nào là bỏ hẳn khả năng thấy loại lỗi đó — không có bậc nào "bao" bậc dưới.

| Bậc | Thấy được | **Mù với** |
|---|---|---|
| `dotnet test` | logic nghiệp vụ BE | route có tồn tại không · verb có không · permission có ai cấp không · proxy có khớp không |
| `ng build` | lỗi TS/SCSS trong code **được route tới** | component chết (AOT không chạm ⇒ vẫn xanh) · vòng import (esbuild nuốt được) |
| `ng test` | logic component | mirror lệch (mock theo chính hình dạng FE đã biết) · thứ tự spec nạp · sai project |
| **probe trình duyệt** | **hợp đồng qua biên thật** (INV-1) | fidelity pixel · hiệu năng tải thật |

⇒ Probe là bậc **duy nhất** thấy được lớp INV-1. Vì vậy **B7 bắt buộc**, không tuỳ chọn.

---

## Bốn bẫy "xanh giả"

### 1. Sai target project ⇒ chạy 0 test, exit 0, báo xanh
`tsconfig.spec.json` của mỗi project chỉ `include` spec **trong chính nó**.
`ng test <AppProject> --include='**/<lib>/**'` **không nạp spec nào** của `<lib>`.

> **Luật: luôn dán `Executed N of M`.** Không chấp nhận chỉ dán `SUCCESS`. `N=0` mà exit 0 là xanh giả.

### 2. `--include` hẹp vỡ vì vòng import, cả suite lại xanh
Vòng import làm kết quả **phụ thuộc thứ tự spec nạp**. esbuild của `ng build` nuốt được cycle,
webpack/karma thì không ⇒ **build xanh không chứng minh không có cycle**.

> **Luật: nghiệm thu bằng CẢ SUITE**, không bằng `--include` hẹp. Dùng `--include` chỉ để chạy nhanh
> lúc đang sửa.

### 3. Host test thay `IAuthorizationService` bằng bản always-allow
`AddAlwaysAllowAuthorization()` trong `*TestsModule` ⇒ **mọi `[Authorize]` không bao giờ throw**.
Gỡ hết attribute khỏi endpoint, test vẫn xanh. Substitute dùng `IsGrantedAsync(Arg.Any<string>())` ⇒
đổi sang một permission **không tồn tại** cũng vẫn xanh.

> **Luật: AC nào nói về QUYỀN thì test bắt buộc kế thừa base authorization thật**
> (`SaasServiceRealAuthorizationTestBase` hoặc tương đương), và grant **tập tối thiểu** để cô lập
> nhánh cần kiểm.
>
> ⚠️ Grant **rỗng** khi class-level đã chặn ⇒ test xanh giả kể cả khi attribute method-level bị gỡ.
> Muốn chứng minh tên quyền đúng: grant `Default`, rồi assert method vẫn bị chặn vì thiếu `Create`.

Khoá **cả hai mặt**, luôn luôn:
- người **đúng vai** làm được việc của mình;
- người **không có quyền** vẫn bị chặn.

Thiếu vế sau thì bản vá "cho phép đọc" biến endpoint thành công khai mà test vẫn xanh.

### 4. Component chết
Không route nào trỏ tới ⇒ AOT không chạm ⇒ `ng build` xanh **không chứng minh code được dùng**.

> **Luật: sau khi wire, xác nhận chunk thật sự được sinh ra** trong output build.
> Và kiểm route **ở B3**, trước khi viết dòng nào.

---

## Mutation check — bắt buộc mỗi phase (B6)

```
1. phá có chủ ý 2-3 dòng logic mà test nhắm tới
2. chạy lại → xác nhận ĐÚNG SỐ test dự kiến chuyển đỏ (không nhiều hơn, không ít hơn)
3. revert
4. dán số vào report
```

Sai số cũng là tín hiệu: phá 1 dòng mà **5** test đỏ ⇒ test đang chồng lấn, không cô lập được nguyên nhân.
Phá 1 dòng mà **0** test đỏ ⇒ dòng đó chưa được khoá.

Ví dụ mutation tốt (khoá được bất biến, không khoá được giá trị):
- so **ngược hai chiều** `asc`/`desc` thay vì so với hằng số ⇒ bỏ `.OrderBy` là đỏ;
- assert `TotalCount` **và** số dòng ⇒ tính count sau khi phân trang là đỏ;
- assert danh sách **không rỗng** ⇒ registry bị dọn sạch vẫn đỏ.

---

## Lệnh test theo host

```bash
cd apps/angular
npx ng test <target> --watch=false --browsers=ChromeHeadlessNoSandbox
```

Hai biến môi trường **chỉ thêm khi gặp đúng triệu chứng** — không phải yêu cầu của skill:

| Triệu chứng | Vá tạm | Sửa thật |
|---|---|---|
| `BrowserslistError: Unknown version … of and_chr` | `BROWSERSLIST="chrome 120"` | `npx update-browserslist-db@latest` (đụng `yarn.lock` ⇒ nhánh riêng) |
| `No binary for ChromeHeadless` | `CHROME_BIN=<đường dẫn>` | cài Chrome/Chromium hệ thống — karma tự tìm |

`--browsers=ChromeHeadlessNoSandbox` thì **giữ luôn**: cần cho container/CI và Chrome bản flatpak.
⚠️ Launcher đó phải được khai trong `karma.conf.js` của **chính project** đang chạy; project khác
dùng `ChromeHeadless`.

**Thiếu browser thì lệnh in `No binary…` rồi exit 0 mà không chạy test nào** — lại là bẫy #1.

---

## Probe trình duyệt (B7)

Công cụ: **Chrome DevTools MCP** trên `http://localhost:4200`. Playwright dành cho suite e2e lặp lại
được, chỉ chạy khi được cho phép (~8 phút).

Trình tự tối thiểu:
1. dựng stack (infra + service cần + Angular), xác nhận từng cổng phản hồi;
2. đăng nhập đúng tenant;
3. mở **màn hình thật của AC**, không chỉ trang chủ;
4. **`list_console_messages`** — 0 error;
5. **`list_network_requests`** — không 4xx/5xx nào thuộc phạm vi UC;
6. đối chiếu dữ liệu hiển thị với **query DB thật** trước khi kết luận "sai" hay "rỗng".

Bước 6 quan trọng: ô trống có thể là **dữ liệu rỗng**, không phải lỗi. Query trước khi kết tội.

Phát hiện điển hình chỉ probe thấy được: permission mới chưa ai cấp (403) · enum/whitelist FE thiếu
giá trị BE có · endpoint nằm sai bề mặt · component không được route tới.
