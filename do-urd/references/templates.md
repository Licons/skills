# Templates

> ⚠️ Bố cục thư mục: **không có tầng `reports/`**. 1 UC ⇒ file nằm thẳng ở `plans/{stamp}-{slug}/`;
> nhiều UC ⇒ file chung ở gốc lượt, file của UC ở `plans/{stamp}-{slug}/<uc>/`. Xem SKILL.md §7.

# do-urd — Templates

- `path:line` dùng token `<repo-root>` (code) / `<docs-root>` (repo `*.Documents`). Không path tuyệt đối.
- `<URD>` = đường dẫn file truyền qua `--urd`, viết dưới dạng `<docs-root>/outputs/urd/...`.
- `P/F/K` = PASS / FAIL / Kẹt (không đủ điều kiện phán quyết).
- **Ở main tree** (`$PLAN_DIR/reports/`): `state.md` · `decisions.md` · `gaps.md`.
  **Ở worktree của UC** (`$UC_DIR/reports/`): `uc-source.md` · `ac-source.md` · `ac-verify.md` ·
  `verify-round-NN.md`. Cùng path, khác checkout — đừng lẫn.

---

## `reports/state.md` (main tree)

Cập nhật sau mỗi mốc: setup · hết mỗi stage · mỗi phase · mỗi vòng fix · mỗi merge.

````markdown
# do-urd — 260815-1057-ctc-uc-02-03

## Invocation
- urd: `<docs-root>/outputs/urd/Delivered/Phase 1/URD_CTC_...v1.2.md`
- des: `chỉ phần import danh bạ`
- flags: `--qc`
- repo-root: `/home/licons/Projects/VietBank/Utop.VietBank.CRM`
- docs-root: `/home/licons/Projects/VietBank/Utop.VietBank.CRM.Documents`
- base: `develop`
- branch: `tasks/260815-1057-ctc-uc-02-03`
- uc: `CTC-UC-02;CTC-UC-03` (chốt bởi user lúc 10:59)

## Services cần start (Stage 4, nếu test cần env)
- infra: postgres, redis, rabbitmq, elasticsearch
- service: auth-server, identity, administration, saas, web-gateway

## UC state
| UC | Worktree | Branch | Stage | Clarify | AC verify | Phases | Fix round | Merged |
|---|---|---|---|---|---|---|---|---|
| ctc-uc-02 | `.claude/worktrees/urd-ctc-uc-02` | `tasks/260815-1057-ctc-uc-02-03--ctc-uc-02` | cook | 0 open | 17/17 | 4/6 | 0/5 | no |
| ctc-uc-03 | `(main tree)` | — | plan | 2 open | — | — | — | no |

## Fix rounds
| UC | Round | Fail | Report | Ghi chú |
|---|---|---|---|---|
| ctc-uc-02 | 1 | 4 | `ctc-uc-02/reports/verify-round-01.md` | AC-05, AC-11 |

## Log
- `260815-1057` setup: branch + 2 worktree + plan-dir
- `260815-1120` ctc-uc-02: plan committed `a1b2c3d` — 17 AC → 6 phase
````

- Cột `Worktree` **không được trống**: 1 UC chạy tại chỗ ⇒ ghi `(main tree)`.
- Cột `AC verify` = `<số AC khớp nguồn>/<tổng AC>` (SKILL.md §2c). Chưa `n/n` ⇒ không sang Stage 3.
- Dừng fix khi `Fail = 0` hoặc `Round = 5`.

---

## `reports/decisions.md` (main tree)

Một block / câu hỏi. Ghi **ngay khi user trả lời**, không gom cuối stage.

````markdown
## D-01 — Import trùng số điện thoại thì xử lý sao?

- **Vì sao có câu hỏi này**: URD `<URD>:412` nói "bỏ qua bản ghi trùng" nhưng không định nghĩa
  "trùng" theo trường nào; `ContactAppService` hiện dedupe theo `Code` (`<repo-root>/services/...:88`).
- **Kiến thức đã có**: `Contacts.Code` có filtered unique index (migration `194be4cba`).
  `Phone` không unique. 2 nguồn mâu thuẫn ⇒ không tự chọn (rule 1).
- **Câu hỏi**: Bản ghi import coi là trùng khi nào?
- **Các lựa chọn**:
  - A. Trùng `Code` — khớp index hiện có, không đổi schema.
  - B. Trùng `Phone` — đúng nghiệp vụ user nêu, cần index mới + migration.
  - C. Trùng cả hai — chặt nhất, rủi ro bỏ sót bản ghi hợp lệ.
- **Câu trả lời**: **B**. Chọn bởi: user (`260815-1104`). Thêm phase migration index `Phone`.
````

---

## `reports/gaps.md` (main tree)

Chỉ ghi từ Stage 3 trở đi (Stage 1–2 dùng `decisions.md` vì còn được hỏi user).

````markdown
| # | UC | Stage | Nhóm | Mô tả | Nguồn | Chặn AC | Trạng thái |
|---|---|---|---|---|---|---|---|
| G-01 | ctc-uc-02 | cook | plan | Phase 05 cần endpoint export chưa có trong URD | `<URD>:520` | AC-11 | UC BLOCKED |
````

- `Nhóm`: `plan` (thiếu dữ kiện từ URD/plan) · `dev` (subagent fail 2 lần) · `verify` (hết 5 vòng fix).

---

## `reports/uc-source.md` (worktree)

**Nguyên văn**, không tóm tắt, không sửa chính tả.

````markdown
# UC source — CTC-UC-02

> Nguồn: `<URD>:380-455` — copy nguyên văn bằng `sed -n '380,455p'`, không chỉnh sửa.

```
<dán nguyên văn output sed ở đây>
```
````

---

## `reports/ac-source.md` (worktree)

````markdown
# AC source — CTC-UC-02

> Nguồn: `<URD>:456-480`. Mỗi dòng giữ nguyên văn kèm số dòng gốc để `ac-verify.md` trace.

| Dòng | Nội dung nguyên văn |
|---|---|
| 457 | Hệ thống hiển thị thông báo "Import thành công {n} bản ghi" |
| 458 | Bản ghi trùng số điện thoại bị bỏ qua và ghi vào file log lỗi |
````

---

## `reports/ac-verify.md` (worktree)

Nguồn chân lý PASS/FAIL của Stage 4. Cột `Kết quả` để trống tới Stage 4.

````markdown
# AC nghiệm thu — CTC-UC-02

| Mã AC | Mô tả | Nguồn | Phase | Unit test + test case | Điều kiện PASS | Kết quả |
|---|---|---|---|---|---|---|
| AC-01 | Hệ thống hiển thị thông báo "Import thành công {n} bản ghi" | `<URD>:457` | phase-02 | BE `ContactImportAppService_Tests.Should_Return_Imported_Count` (n=3 hợp lệ) · FE `contact-import.spec.ts > shows success toast with count` | Cả 2 test xanh; message khớp đúng chuỗi kể cả số `{n}` | PASS |
| AC-02 | Bản ghi trùng số điện thoại bị bỏ qua và ghi vào file log lỗi | `<URD>:458` | phase-03 | BE `..._Tests.Should_Skip_Duplicate_Phone` (2 bản ghi cùng phone) · `..._Should_Write_Error_Log` | Bản ghi thứ 2 không vào DB **và** log lỗi có đúng 1 dòng với phone đó | |
| - | Nút Import bị disable khi chưa chọn file | `<URD>:461` | phase-01 | FE `contact-import.spec.ts > import button disabled without file` | Nút `disabled` khi `file === null` | PASS |
````

- `Mã AC` — URD không đánh mã ⇒ ghi `-`, không tự bịa mã.
- `Mô tả` phải là **substring** của dòng nguồn sau normalize (SKILL.md §2c). Không diễn giải lại.
- `Điều kiện PASS` phải nói được **cái gì sai thì fail** — "test xanh" là điều kiện rỗng (Rule 9).
- `Kết quả`: `PASS` · `FAIL` · `K` (kẹt: thiếu env/dữ liệu ⇒ ghi lý do vào `gaps.md`).

---

## `reports/verify-round-NN.md` (worktree)

````markdown
# Verify round 01 — ctc-uc-02

- Chạy: `dotnet test --filter "FullyQualifiedName~ContactImportAppService_Tests"` (12 test)
- Kết quả: 10 pass / 2 fail

| AC | Test | Lỗi | Vị trí |
|---|---|---|---|
| AC-02 | `Should_Skip_Duplicate_Phone` | `Expected 1 but was 2` | `<repo-root>/services/.../ContactImportAppService.cs:142` |

## Fix đã làm
- `ContactImportAppService.cs:142` — dedupe theo `Phone` thay vì `Code` (D-01).

## Chạy lại
- `Should_Skip_Duplicate_Phone` → PASS
````

---

## `reports/ba-questions.md` (main tree) — phiếu hỏi BA/Vietbank

Gom mọi gap **cần người ngoài trả lời** thành một phiếu gửi thẳng được, không phải biên tập lại.
Khác `gaps.md` (sổ kỹ thuật nội bộ) ở chỗ: viết cho **BA đọc**, không cho dev đọc.

**4 phần cho mỗi mục, không thiếu phần nào:**

````markdown
## ① G-02 · AC12 UC 01 — "4 hạng" là 4 hạng nào?

**URD nói gì** (trích nguyên văn, kèm số dòng đã verify bằng `sed`)
> `<URD>:541` — "…Thì hiển thị chỉ đọc **đủ 4 hạng** (giá trị chốt theo)"
> `<URD>:510` — `BR-01-11 | Trung bình | Định danh phân khúc đa hạng | Khối "Định danh phân khúc"`

**Vấn đề**: câu AC bị cắt đúng chỗ đáng lẽ nói "chốt theo cái gì". Ví dụ chỉ cho 2 hạng
(Hạng 1 = Gold, Hạng 2 = Affluent). Quy tắc BR-01-11 lẽ ra định nghĩa thì **ô rỗng**.

**Đã làm gì để không bị chặn**: đọc danh sách hạng từ **LOV cấu hình** thay vì hardcode.
⇒ code chạy đúng với bất kỳ tập hạng nào; BA chốt sau chỉ cần **thêm dòng dữ liệu**, không sửa code.

**Cần BA trả lời**
1. 4 hạng tên gì (mã + tên hiển thị)?
2. Lấy từ **Loyalty** hay **Core**?
3. Trường nào trên hệ nguồn?
````

### Luật viết phiếu

| Phần | Bắt buộc | Vì sao |
|---|---|---|
| **URD nói gì** | ✅ trích **nguyên văn** + `<URD>:line` đã verify bằng `sed` | BA phải thấy đúng ô hỏng trong tài liệu của họ, không phải nghe kể lại |
| **Vấn đề** | ✅ nói rõ **thiếu cái gì**, không phán xét | "ô rỗng"/"câu cắt giữa chừng" là dữ kiện; "tài liệu ẩu" là bình luận |
| **Đã làm gì để không bị chặn** | ✅ | Cho BA biết tiến độ **không đứng**, và đổi ý sau này **tốn bao nhiêu** |
| **Cần BA trả lời** | ✅ đánh số, mỗi câu **một ẩn số** | Câu gộp 3 ẩn số sẽ nhận lại 1 câu trả lời mơ hồ |

- **Sắp theo mức chặn**, không theo số thứ tự gap: cái chặn nghiệm thu AC lên trước, cái "nice to have" xuống dưới.
- Gap nào **URD tự ghi** "chờ Vietbank xác nhận" ⇒ tách nhóm riêng, ghi rõ đó là **việc chưa xong của họ**,
  không phải phát hiện của mình.
- Mỗi mục kết thúc bằng **một dòng hệ quả**: AC nào sẽ ghi `K` nếu không có câu trả lời.

---

## `reports/feasibility.md` (main tree) — đầu ra Stage 2.5

Đối chiếu **plan (viết từ URD)** với **codebase thật**, trước khi cook. Một dòng = một giả định đã kiểm.

````markdown
# Feasibility — 260815-1138-c360-6uc

Baseline (§0.5): build 0 error · suite **0 passed / 0 failed** ⚠️ SUITE KHÔNG BOOT — xem A-01.

| # | AC | Giả định của plan | Thực tế trong repo | Nhóm | Xử lý |
|---|---|---|---|---|---|
| A-01 | (mọi AC cần DB) | `dotnet test` chạy được | suite fail ở constructor: SQLite không parse `nvarchar(max)` | A | thêm phase-00 sửa test base |
| A-02 | UC01-AC04 | `Account` có AUM/TOI/dư nợ | `Account` chỉ có **9** property | A | thêm phase infra cột Core + migration |
| A-03 | UC11-AC03 | có cột CASA 3T | **không tồn tại** | A | thêm vào migration của UC 11 |
| B-01 | UC01-AC06 | `[Authorize]` chặn được | `AddAlwaysAllowAuthorization()` ở **14/14** test module ⇒ không test nào chứng minh được | B | hỏi user: sửa test host hay ghi `K` |
| B-02 | — | — | `HasViewAllAsync` dựng tên quyền số ít, provider định nghĩa số nhiều ⇒ **code chết** | B | hỏi user: sửa ngay hay ghi lại |
| C-01 | UC01-AC12 | URD định nghĩa 4 hạng | `BR-01-11` **ô rỗng**, AC12 câu bị cắt | C | → `ba-questions.md` ① |
| C-02 | UC11-AC10 | có field số giấy tờ định danh | grep toàn repo: **không có** | C | → `ba-questions.md`, AC10 sẽ `K` một phần |

## Nhóm A — thiếu hạ tầng (tự làm được)
→ sửa `plan.md`, thêm phase. **KHÔNG** đụng `ac-verify.md` (AC đã đóng băng).

## Nhóm B — cần user quyết phạm vi
→ **gộp thành MỘT lượt `AskUserQuestion`**, không hỏi lắt nhắt trong lúc cook.
````

- Cột `Thực tế trong repo` phải là **dữ kiện đã chạy lệnh ra**, kèm số/`path:line`. Không viết cảm nhận.
- Không có dòng nào ⇒ ghi rõ `không phát hiện sai lệch` — đừng để file trống, người sau không biết
  là đã kiểm hay quên kiểm.
