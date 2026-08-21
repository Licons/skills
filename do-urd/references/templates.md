# 1. `$PLAN_DIR/state.md`

Cập nhật sau mỗi mốc: setup · hết mỗi stage · mỗi phase · mỗi vòng fix · mỗi merge.

````markdown
# State Skill — 260815-1057-ctc-fr-01-uc-02-03

## Invocation
- urd: `<docs-root>/outputs/urd/Delivered/Phase 1/URD_CTC_...v1.2.md`
- des: `chỉ phần import danh bạ`
- flags: `--qc`
- repo-root: `/home/licons/Projects/VietBank/Utop.VietBank.CRM`
- docs-root: `/home/licons/Projects/VietBank/Utop.VietBank.CRM.Documents`
- base: `develop`
- branch: `tasks/260815-1057-ctc-fr-01-uc-02-03`
- uc: `CTC-FR-01-UC02;CTC-FR-01-UC03` (chốt bởi user lúc 10:59)

## Services cần start (Stage 4, nếu test cần env)
- infra: postgres, redis, rabbitmq, elasticsearch
- service: auth-server, identity, administration, saas, web-gateway
- account admin: đọc file `.env*`

## UC state
Cột `UC` = `<ma-uc>` (nguyên mã URD, hạ chữ thường). URD đánh **hai hệ số** ⇒ thêm cột `Số URD` để người đọc còn tìm được mục trong file — số tiêu đề **chỉ sống ở cột này**, không đi vào tên thư mục.

| UC | Số URD | Branch | Stage | Clarify | AC verify | Phases | Fix round | Merged |
|---|---|---|---|---|---|---|---|---|
| ctc-fr-01-uc02 | UC 02 | `tasks/260815-1057-ctc-fr-01-uc-02-03-ctc-fr-01-uc02` | cook | 0 open | 17/17 | 4/6 | 0/5 | no |
| ctc-fr-01-uc03 | UC 03 | — | plan | 2 open | — | — | — | no |

## Fix rounds
| UC | Round | Fail | Report | Ghi chú |
|---|---|---|---|---|
| ctc-fr-01-uc02 | 1 | 4 | `ctc-fr-01-uc02/verify-round-01.md` | AC-05, AC-11 |

## Log
- `260815-1057` setup: branch + 2 worktree + plan-dir
- `260815-1120` ctc-fr-01-uc02: plan committed `a1b2c3d` — 17 AC → 6 phase

````

- Cột `AC verify` = `<số AC khớp nguồn>/<tổng AC>`. Chưa `n/n` ⇒ không sang Stage 3.
- Dừng fix khi `Fail = 0` hoặc `Round = 5`.

---

# 2. `$PLAN_DIR/decisions.md`

Một block / câu hỏi. Ghi **ngay khi user trả lời**, không gom cuối stage.

````markdown
## D-01 — Import trùng số điện thoại thì xử lý sao?

- **Vì sao có câu hỏi này**: URD `<URD>:412` nói "bỏ qua bản ghi trùng" nhưng không định nghĩa "trùng" theo trường nào; `ContactAppService` hiện dedupe theo `Code` (`<repo-root>/services/...:88`).
- **Kiến thức đã có**: `Contacts.Code` có filtered unique index (migration `194be4cba`). `Phone` không unique. 2 nguồn mâu thuẫn ⇒ không tự chọn (rule 1).
- **Câu hỏi**: Bản ghi import coi là trùng khi nào?
- **Các lựa chọn**:
  - A. Trùng `Code` — khớp index hiện có, không đổi schema.
  - B. Trùng `Phone` — đúng nghiệp vụ user nêu, cần index mới + migration.
  - C. Trùng cả hai — chặt nhất, rủi ro bỏ sót bản ghi hợp lệ.
- **Câu trả lời**: **B** - Thêm phase migration index `Phone`.
- **Chọn bởi**: user (`260815-1104`). 

````

---

# 3. `$PLAN_DIR/gaps.md`

Chỉ ghi từ Stage 3 trở đi (Stage 1–2 dùng `decisions.md` vì còn được hỏi user).

````markdown
| # | UC | AC | Stage | Nhóm | Mô tả | Nguồn | Chặn AC | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| G-01 | ctc-fr-01-uc02 | ctc-fr-01-uc02-ac01 | cook | plan | Phase 05 cần endpoint export chưa có trong URD | `<URD>:520` | AC-11 | UC BLOCKED |
````

- `Nhóm`: `plan` (thiếu dữ kiện từ URD/plan) · `dev` (subagent fail 2 lần) · `verify` (hết 5 vòng fix).

---

# 4. `$UC_DIR/uc-source.md`

**Nguyên văn**, không tóm tắt, không sửa chính tả.

````markdown
# UC source — CTC-FR-01-UC02

> Nguồn: `<URD>:380-455` — copy nguyên văn bằng `sed -n '380,455p'`, không chỉnh sửa.

```
<dán nguyên văn output sed ở đây>
```
````

---

# 5. `$UC_DIR/ac-source.md`

````markdown
# AC source — CTC-FR-01-UC02

> Nguồn: `<URD>:456-480`. Mỗi dòng giữ nguyên văn kèm số dòng gốc để `ac-verify.md` trace.

| Dòng | Nội dung nguyên văn |
|---|---|
| 457 | Hệ thống hiển thị thông báo "Import thành công {n} bản ghi" |
| 458 | Bản ghi trùng số điện thoại bị bỏ qua và ghi vào file log lỗi |
````

---

# 6. `$UC_DIR/ac-verify.md`

Nguồn chân lý PASS/FAIL của Stage 4. Cột `Kết quả` để trống tới Stage 4.

````markdown
# AC nghiệm thu — CTC-FR-01-UC02

| Mã AC | Mô tả | Nguồn | Phase | Unit test + test case | Điều kiện PASS | Kết quả |
|---|---|---|---|---|---|---|
| AC-01 | Hệ thống hiển thị thông báo "Import thành công {n} bản ghi" | `<URD>:457` | phase-02 | BE `ContactImportAppService_Tests.Should_Return_Imported_Count` (n=3 hợp lệ) · FE `contact-import.spec.ts > shows success toast with count` | Cả 2 test xanh; message khớp đúng chuỗi kể cả số `{n}` | PASS |
| AC-02 | Bản ghi trùng số điện thoại bị bỏ qua và ghi vào file log lỗi | `<URD>:458` | phase-03 | BE `..._Tests.Should_Skip_Duplicate_Phone` (2 bản ghi cùng phone) · `..._Should_Write_Error_Log` | Bản ghi thứ 2 không vào DB **và** log lỗi có đúng 1 dòng với phone đó | |
| - | Nút Import bị disable khi chưa chọn file | `<URD>:461` | phase-01 | FE `contact-import.spec.ts > import button disabled without file` | Nút `disabled` khi `file === null` | PASS |
````

- `Mã AC` — URD không đánh mã ⇒ ghi `-`, không tự bịa mã.
- `Mô tả` phải là **substring** của dòng nguồn sau normalize (SKILL.md §2c). Không diễn giải lại.
- `Điều kiện PASS` phải nói được **cái gì sai thì fail** — "test xanh" là điều kiện rỗng (Rule 9).
- `Kết quả`: `PASS` · `FAIL` · `BLOCKED` · `NO TEST` (kẹt: thiếu env/dữ liệu ⇒ ghi lý do vào `gaps.md`).

---

# 7. `$PLAN_DIR/decisions.md`

Một block / câu hỏi. Ghi **ngay khi user trả lời**, không gom cuối stage.

````markdown
# `decisions.md` — CTC-FR-01-UC02

| Mã AC | Mô tả | Nguồn | Phase | Unit test + test case | Điều kiện PASS | Kết quả |
|---|---|---|---|---|---|---|
| AC-01 | Hệ thống hiển thị thông báo "Import thành công {n} bản ghi" | `<URD>:457` | phase-02 | BE `ContactImportAppService_Tests.Should_Return_Imported_Count` (n=3 hợp lệ) · FE `contact-import.spec.ts > shows success toast with count` | Cả 2 test xanh; message khớp đúng chuỗi kể cả số `{n}` | PASS |
| AC-02 | Bản ghi trùng số điện thoại bị bỏ qua và ghi vào file log lỗi | `<URD>:458` | phase-03 | BE `..._Tests.Should_Skip_Duplicate_Phone` (2 bản ghi cùng phone) · `..._Should_Write_Error_Log` | Bản ghi thứ 2 không vào DB **và** log lỗi có đúng 1 dòng với phone đó | |
| - | Nút Import bị disable khi chưa chọn file | `<URD>:461` | phase-01 | FE `contact-import.spec.ts > import button disabled without file` | Nút `disabled` khi `file === null` | PASS |
````

- `Mã AC` — URD không đánh mã ⇒ ghi `-`, không tự bịa mã.
- `Mô tả` phải là **substring** của dòng nguồn sau normalize (SKILL.md §2c). Không diễn giải lại.
- `Điều kiện PASS` phải nói được **cái gì sai thì fail** — "test xanh" là điều kiện rỗng (Rule 9).
- `Kết quả`: `PASS` · `FAIL` · `BLOCKED` · `NO TEST` (kẹt: thiếu env/dữ liệu ⇒ ghi lý do vào `gaps.md`).

---

# 8. `$PLAN_DIR/debt.md`

Ghi lại nợ mà plan chưa giải quyết.

````markdown
# `debt.md` — CTC-FR-01-UC02

> Nguồn chi tiết: `gaps.md` (sổ cái theo gap) · `decisions.md` (vì sao chốt như vậy).
> ⛔ Nợ không có mốc kích hoạt là nợ vĩnh viễn — mọi dòng dưới đây đều có cột "Trả khi nào".

## Nợ kỹ thuật

| # | Nợ | Trả khi nào | Ở đâu |
|---|---|---|---|
| **G-06** | Thiếu `AccountContactRelation` — KB kiến trúc §4.2/§8. **Gốc chung** của G-15/G-16 lượt trước và D-12. Trả xong thì unique index 1:1 khả thi và cả ba nợ kia tan | **KHDN vào phạm vi** | `kb-doi-chieu.md` §4 |
| **G-12** | `Lead ↔ Contact` là 1-1, không bảng nối ⇒ một liên hệ tối đa ~1 đầu mối. UC10-AC01 giả định 2 | cùng lúc với G-06 (cùng họ) | `feasibility.md` UC10 §2 |

## Việc vận hành — KHÔNG phải nợ code

| # | Việc | Vì sao quan trọng |
|---|---|---|
| 1 | Apply 2 migration: `20260818084327_Ctc_Batch2_Phase00` · `20260818104525_Ctc_Batch2_CifLinkHistory_EntityChangeId` | Chỉ sinh file, **chưa apply** (`database.md` cấm tự chạy) |
| 2 | Grant `Contacts.Merge` + `Contacts.UnlinkCif` **TRƯỚC** khi deploy bản có `[Authorize]` — `POST /api/saas/data-seeder/grant-c360-permissions` | Sai thứ tự ⇒ mất nút, **không lỗi nào báo** (đã xảy ra thật ở G-06 lượt trước) |
````

---

# 9. `$PLAN_DIR/ba-questions.md`

- Các câu hỏi dành cho team BA.
- Mô tả chi tiết, dẫn chứng, dễ hiểu để cho con người đọc.

````markdown
# Câu hỏi dành cho BA

## <Mã UC> <title>

### <Mã AC> <title>

- **Vì sao có câu hỏi này**: URD `<URD>:412` nói "bỏ qua bản ghi trùng" nhưng không định nghĩa "trùng" theo trường nào; `ContactAppService` hiện dedupe theo `Code` (`<repo-root>/services/...:88`).
- **Kiến thức đã có**: `Contacts.Code` có filtered unique index (migration `194be4cba`). `Phone` không unique. 2 nguồn mâu thuẫn ⇒ không tự chọn (rule 1).
- **Câu hỏi**: Bản ghi import coi là trùng khi nào?

````

---
