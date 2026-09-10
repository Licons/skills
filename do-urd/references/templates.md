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
Cột `UC` = `<ma-uc>` (mã CHUẨN HOÁ — bỏ gạch trước số UC: `AP-UC-01` → `ap-uc01`, `CTC-FR-01-UC06` → `ctc-fr-01-uc06` — hạ chữ thường; xem chuẩn mã AC ở đầu `scripts/extract-ac.mjs`). URD đánh **hai hệ số** ⇒ thêm cột `Số URD` để người đọc còn tìm được mục trong file — số tiêu đề **chỉ sống ở cột này**, không đi vào tên thư mục.

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

Quyết định **dev tự chọn để làm tiếp** khi có vấn đề phát sinh — dựa trên URD + design + codebase, theo hướng
đúng AC. Gồm cả câu user trả lời ở clarify (Stage 2) **và** quyết định kỹ thuật ở cook/test (Stage 3–4). Ghi ngay
khi chốt. Mọi "mặc định tạm" trong `gaps.md` phải có một D tương ứng.

````markdown
## D-01 — Import trùng số điện thoại thì xử lý sao?

- **Vấn đề**: URD `<URD>:412` "bỏ qua bản ghi trùng" nhưng không định nghĩa "trùng"; code hiện dedupe theo `Code`.
- **Lựa chọn**: A. trùng `Code` (khớp index) · B. trùng `Phone` (đúng nghiệp vụ, cần migration) · C. cả hai.
- **Chọn**: **B** — thêm phase migration index `Phone`.
- **Chọn bởi**: user (`260815-1104`) | Li (tự chốt, đảo được nếu BA trả lời khác).
- **Liên quan**: G-03 · Q-02 · AC CTC-FR-01-UC02-AC04.
````

---

# 3. `$PLAN_DIR/gaps.md`

**Chỉ** khoảng trống giữa **tài liệu**: URD ↔ URD (BR mâu thuẫn AC), URD ↔ design, URD ↔ ma trận BA, URD thiếu
mệnh đề, URD tự khai ngoài phạm vi. KHÔNG ghi hạn chế codebase (→ `debt.md`) hay lỗi tìm thấy khi test (→
`state.md`). Mỗi gap trỏ tới câu hỏi BA (Q-nn) và quyết định tạm (D-nn). Ghi từ Stage 2 trở đi.

````markdown
| # | UC | AC | Loại | Mô tả (trích nguyên văn hai bên) | Nguồn | Chặn AC | Tạm theo | Hỏi BA |
|---|---|---|---|---|---|---|---|---|
| G-01 | kpi-fr-01-uc02 | UC02-AC17 | CONFLICT | BR-01-16 "ẩn hoàn toàn khối so sánh với CBBH" ↔ AC17 "CBBH chỉ hiện con số, không hiện tên" | `<URD>:3274,3282` | AC17 | D-10 | Q-09 |
| G-03 | kpi-fr-01-uc02 | UC02-AC09 | NGOÀI PHẠM VI | BR-01-10 "chưa thuộc Golive 1; cần chốt nguồn lịch sử tư vấn" | `<URD>:3240` | AC09 (blocked) | — | B-01 |
````

- `Loại`: `CONFLICT` (hai chỗ nói ngược) · `THIẾU THÔNG TIN` (URD không cho dữ kiện) · `DESIGN≠URD` · `NGOÀI PHẠM VI` (URD tự khai) · `THIẾU DỮ LIỆU NỀN` (danh mục/ánh xạ BA chưa cấp).
- `Chặn AC`: AC nào không nghiệm thu được vì gap này; nếu `blocked` thì khai cả trong `ac-e2e-scope.json`.

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

# 7. `$PLAN_DIR/debt.md`

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

# 8. `$PLAN_DIR/ba-questions.md`

Chỉ ghi việc **bị chặn — dev không thể đi tiếp**: thiếu phân hệ đích, thiếu dữ liệu nền chỉ BA/Hội sở có (danh
mục, ánh xạ, nội dung, mã quyền), URD tự khai ngoài phạm vi, hai chỗ URD nói ngược đúng hành vi cần nghiệm thu.
Chỗ URD chưa rõ nhưng dev chọn được cách làm ⇒ `decisions.md`, KHÔNG ghi ở đây. Người đọc là team BA: không tên
file/lớp/hàm; mỗi mục có tiền đề (mã UC/AC + tiêu đề), trích URD (mã BR/AC + `:dòng`), dev đang tạm làm gì, và
BA cần quyết gì (bỏ khỏi nghiệm thu đợt này hay cung cấp gì; lựa chọn a/b/c nếu có).

````markdown
# Việc bị chặn cần team BA — <phân hệ> (<tên URD>, UC …)

<2–3 câu mở đầu: đây là gì, khác gì với decisions.md, cách trả lời.>

## B-01 · <tiêu đề một dòng> (UCxx ACyy)

<URD nói gì / thiếu gì — dẫn BR/AC + `:dòng`. Dev đang tạm làm gì (nếu có).>

Cần BA: <bỏ khỏi nghiệm thu đợt này, hay cung cấp gì; a/b/c nếu có>.
````

---
