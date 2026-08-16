# Failure log — vì sao mỗi bất biến tồn tại

**Đọc khi cần thuyết phục ai đó rằng một chặn là cần thiết. KHÔNG đọc khi đang thi công** — lúc thi
công chỉ cần `SKILL.md` và các reference thao tác.

File này giữ bằng chứng để `SKILL.md` không phải kể chuyện. Mỗi mục trả lời đúng một câu:
*"nếu bỏ chặn này thì chuyện gì đã xảy ra?"*

Nguồn đầy đủ: `plans/260815-1138-c360-6uc/gaps.md` (G-01..G-30) và `.../retro.md`.

---

## INV-1 · Đóng hợp đồng qua biên — 9 lần hỏng trong một lượt

| Cặp biên | Chuyện đã xảy ra |
|---|---|
| entity ↔ DTO | `Account.CareStatus` có cột vật lý, `AccountDto` thiếu field. AutoMapper convention **im lặng bỏ qua**. Giá trị tính xong nằm lại DB, màn hình trống, không lỗi build/test nào. Cùng chuyện với `CIF` và với cột "CBBH" (chỉ có `OwnerId`, không có nguồn tên) |
| AppService ↔ route | 3 method `submit-*` của một UC, và 2 method `RequestAdd/DeleteAddress` của UC khác: `public` nhưng vắng ở interface ⇒ explicit controller không route. **Test BE gọi thẳng SUT nên về nguyên tắc không thể phát hiện** |
| route ↔ verb | `[Route]` class-level tắt conventional routing ⇒ `httpMethod: null`. Job chạy đêm và proxy Angular đều dựng request từ api-definition ⇒ không client nào gọi được |
| bề mặt ↔ proxy-gen | `[IntegrationService]` trên 2 service ⇒ endpoint chỉ nằm ở `integration-api/*`, proxy generator bỏ qua ⇒ FE không có gì để gọi |
| registry ↔ hằng số FE | **3 lần**: whitelist trường lọc, cột xuất, enum danh mục sự kiện (FE mirror 5/8 giá trị ⇒ hồ sơ B2B đếm 0 trên mọi thẻ và nhãn hiện sai) |
| permission khai ↔ cấp | **2 lần**: `CareStatuses.*` và `LifeEvents.*` tạo mới, không seeder nào cấp ⇒ 403 khi mở đúng màn hình |
| UC ↔ UC | UC-01 liệt kê `Account`, UC-11 lọc `Contact`. Đo trên DB thật: **406/490 khách hàng vô hình** với bộ lọc, 8 khách hàng **đếm trùng**. Phải viết lại BE của UC-11 sau khi nó đã "xong" |

**Tổng kết**: 4/6 UC viết xong BE mà FE không gọi được. Bốn cơ chế khác nhau, cùng một hậu quả, và
**cùng một lý do không ai thấy**.

---

## INV-2 · Cổng phải fail được — 5 lần cổng nói dối

- **`AddAlwaysAllowAuthorization()`** trong test module ⇒ mọi `[Authorize]` không bao giờ throw.
  Chứng minh bằng thí nghiệm: *xoá cả 3 `[Authorize]` khỏi 3 endpoint, 11/11 test vẫn xanh.*
  Hệ quả thật: một permission được **khai báo mà không AppService nào đọc** (FE ẩn ô, BE vẫn trả giá
  trị trong response); và quyền **ĐỌC** hàng đợi bị gác bằng quyền **QUYẾT ĐỊNH** ⇒ đúng người cần
  dùng lại bị 403.
- **`ng test` sai project** ⇒ chạy **0 test, exit 0, báo xanh**. Nguy hiểm hơn lệnh gãy: lệnh gãy thì biết.
- **Kết quả phụ thuộc thứ tự spec**: cùng bộ code, `--include` hẹp ra `Executed 0 of 0 ERROR`, cả suite
  ra 60/60 SUCCESS. Vòng import mà esbuild nuốt được còn karma thì không.
- **Component chết**: `ng build` xanh nhưng AOT không hề chạm tới nó — không route nào trỏ tới. Build
  trước khi repoint route "chứng minh" được đúng con số không.
- **4 AC bị đánh PASS oan** ở report phase, phát hiện ở Stage 4: test có chạy nhưng **không kiểm đúng
  điều kiện** ghi trong cột `Điều kiện PASS`. Không AC nào phải sửa code sản phẩm — code vốn đúng, chỉ
  là test không chứng minh.

---

## INV-3 · Một dữ kiện, một nguồn

- Hằng số mirror: 3 lần (trên).
- **`.cursor/rules/page-layout-pattern.md` bắt buộc đúng thứ `.claude/rules/angular.md` cấm**
  (`loyalty-*` + hex cứng). Mỗi agent FE phải tự phát hiện và tự chọn.
- `docs/code-standards.md:149` nói *"không sửa tay proxy"* trong khi proxy **đang** được sửa tay —
  tài liệu mô tả sai thực tế; ai làm theo tài liệu mà regen sẽ làm đỏ FE.

---

## INV-4 · Ghi đúng nhưng sai chỗ cũng là mất

Quyết định về "4 hạng khách hàng" được user chốt lúc `260815-2231` và ghi vào `decisions.md` (D-22).
**Không được đẩy vào `ac-verify.md`.** Ghi chú `BLOCKED` cũ vẫn nằm nguyên ở cột `Điều kiện PASS`.

Hậu quả dây chuyền: agent FE đọc ghi chú cũ → dựng **3 hạng từ 3 nguồn khác nhau** thay vì 4 giá trị
LOV của **một** trường; agent verify đọc ghi chú cũ → đánh `BLOCKED`. **Không agent nào sai** — cả hai
đọc đúng thứ session để lại. Mất gần một ngày công.

---

## INV-5 · Song song và merge

- **Semantic merge conflict**: `--diff-filter=U` rỗng, merge "sạch", build đỏ `CS0534` — một UC viết
  lớp con trước khi một fix song song biến thuộc tính lớp cha thành `abstract`. Nhánh hỏng nhiều giờ,
  chỉ lộ khi đo baseline của UC sau.
- **`SendMessage` hồi sinh agent đã dừng** — sập 3 lần cùng cơ chế ⇒ 2 agent ghi chung một cây ⇒ một
  commit chứa code của cả hai.
- **`git diff` mù với file untracked** — session thấy diff rỗng ⇒ kết luận agent đã chết ⇒ spawn agent
  thứ hai vào cùng cây. Thực tế agent đang **tạo file mới**.
- **Restart service đúng lúc agent đang sửa dở** ⇒ build đỏ giả.

---

## INV-6 · Môi trường được đo, không giả định

- **Suite BE chết hoàn toàn** (0 test boot được) từ **trước** khi chạy skill, chỉ lộ ra ở phase-02 của
  UC đầu tiên — sau khi đã plan xong 6 UC. Gate baseline tốn 1 phút.
- **`ng test` hỏng sẵn** vì `caniuse-lite` cũ + máy không có Chrome. Mọi brief phát ra trước khi phát
  hiện đều kèm một lệnh verify **không chạy được**, và 4 agent mỗi đứa tự vấp lại.
- **490/490 bản ghi rơi vào cùng một trạng thái** trên DB local — không phải bug: snapshot QA cũ 15
  tháng, công thức phụ thuộc "trong 30 ngày gần đây". Suýt đi sửa code đúng.
- **0/490 bản ghi có dữ liệu Core** ⇒ mọi cột hiện `—` trên UI. Query trước khi kết tội.

---

## Điều rút ra chung

> Mọi thứ đắt nhất đều **hỏng im lặng**: suite chết, endpoint không tồn tại, permission không ai đọc,
> component không ai route tới, test chạy 0 ca vẫn báo xanh, mirror lệch giữa hai tầng.
>
> Đầu tư đúng chỗ không phải là viết nhanh hơn, mà là **bắt mỗi bậc thang khai báo nó mù cái gì** —
> rồi thêm đúng một bậc nhìn được chỗ mù đó.

Con số: probe trình duyệt **20 phút** bắt được 3 lỗi mà **385 test đã xanh** không thấy.
