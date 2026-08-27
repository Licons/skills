---
name: do-urd
description: "Sử dụng để thực hiện các UC trong 1 URD -> test AC nghiệm thu."
category: workflow
keywords: [urd, use-case, uc, acceptance-criteria, ac, vietbank, plan, cook, verify]
argument-hint: "--urd <path.md> [--des <description>] [--no-test]"
metadata:
  author: utop
  version: "1.0.0"
---

# 0. Guard

| Mã | Điều kiện | Xử lý |
|---|---|---|
| E01 | thiếu `--urd` | abort |
| E02 | `--urd` không đuôi `.md` | abort |
| E03 | file không đọc được | abort |
| E04 | không tìm thấy mã UC (thử **3 mẫu**: `*-UC{NN}`, `*-UC-{NN}`, `UC {NN}`) | **cảnh báo rồi hỏi user** |
| E05 | không phải repo `Utop.VietBank.CRM` | abort |

---

# 1. Golden rules

- Skill này chỉ dùng cho `<repo-root>` là `Utop.VietBank.CRM`.
- **Không suy đoán, không giả định, không bịa đặt** - mọi vấn đề dựa vào `tài liệu URD` + scout `codebase` + `graphify`  + `clarify user`.
- **URD -> AC luôn đúng** - nếu không đủ dữ liệu -> tìm solution + trade off để giải quyết chúng.
- **Không** commit các file `appsettings*.json`, `environment*.ts`.
- **Luôn kiểm chứng** kết quả từ các agent/subagent.
- **Đối chiếu cột nguồn khi đặc tả có kiểu/độ dài.** - Đặc tả là yêu cầu, không phải sự thật về schema.
- **Cấm `echo "exit=$?"` sau chuỗi lệnh.** Bắt buộc đặt `echo "TOOL_EXIT=$?"` **ngay sau** lệnh cần đo, trước mọi lệnh khác.
- **Cổng mới phải thử ngược** - phá đúng thứ nó canh ⇒ exit ≠ 0, khôi phục ⇒ exit = 0. Cổng chưa từng đỏ chỉ chứng minh nó chạy.
- **Chỉ được** start service để test apply migration lên DB `localhost` đang trỏ tới.
- Agent phải được **yêu cầu đối chiếu** lại số của lead.
- Tạo **Monitor** để **chắc chắn** chạy đúng **workflow**.

---

# 2. Môi trường localhost cho Testing

- `appsettings*.json` - **luôn luôn** trỏ về database `localhost`.
- Chạy `<repo-root>/scripts/localhost.sh service <name>` (linux/macos) hoặc `<repo-root>/scripts/start-services.ps1` (windows) để chạy những service BE + FE cần test.

---

# 3. Workflow

## Stage 1 - Branch

- `{stamp}` = `yyMMdd-HHmm`, `{slug}`= mã UC hoặc mô tả ngắn gọn (ví dụ: `c360-fr-01-uc01`, `c360-batch1-6uc`).
- Tạo nhánh `tasks/{stamp}-{slug}` từ nhánh `HEAD`.
- Tạo `$PLAN_DIR` = `<repo-root>/plans/{stamp}-{slug}/`.
- Tạo file `state.md`, `gaps.md`, `decisions.md` trong `$PLAN_DIR`
- Chạy `<repo-root>/scripts/db/use-local-db.sh` (linux/macos) hoặc `<repo-root>/scripts/db/use-local-db.ps1` (windows) để thay đổi các setting về `localhost`.

## Stage 2 - Plan

- Đọc skill với flag `ak:plan <--urd> <--des> --deep` để chạy plan:
  - Nếu =1 UC thì sinh ra `$UC_DIR` = `$PLAN_DIR`.
  - Nếu >1 UC thì sinh ra `$UC_DIR` =`<repo-root>/plans/{stamp}-{slug}[/<ma-uc>]/`
- Phase `phase-00-*` là phase khởi tạo dùng chung cho mọi phase (ví dụ migration,...).
- Copy **nguyên văn UC** vào `$UC_DIR/uc-source.md`
- Copy **nguyên văn AC** nghiệm thu vào `$UC_DIR/ac-source.md`
- **Đăng ký AC vào chỉ mục** `<repo-root>/apps/angular/e2e-playwright/ac-index/<module>/<MÃ-UC>.json` — sinh bằng `node <repo-root>/scripts/e2e/import-ac-index.mjs`, KHÔNG viết tay. Chưa đăng ký = AC vô hình với cổng và báo cáo nghiệm thu.
- ⛔ **Luật nghiệm thu ở `.claude/rules/e2e-playwright.md` §*Luật nghiệm thu — 1 AC = 1 ca Playwright*.** Đọc ở đó. Tóm tắt để biết mình đang cần gì: 1 AC = ít nhất 1 ca e2e · xUnit/Karma là **tiền đề**, không phải bằng chứng · không dựng được thì khai `blocked` (`by` + `why`) · còn lại là `THIẾU E2E`.
- Quét `$PLAN_DIR` rồi so sánh với scout `codebase` + `graphify` rồi `clarify user`, lưu lại vào `decisions.md`.
- **Lặp lại clarify user** cho đến khi không còn thắc mắc.
- Xong plan thì commit Tiếng Anh `plan(<slug>): <description>`.

## Stage 3 - Implement

- **Luôn đối chứng, không suy đoán.**
- Từ stage này trở đi, **không hỏi/đợi user** nữa - mọi vấn đề -> lưu vào `gaps.md` -> dựa trên `tài liệu URD` + repo tài liệu `<repo-root>/../Utop.VietBank.CRM.Documents` + scout `codebase` + `graphify` -> tìm/chọn solution + trade off tối ưu nhất -> lưu vào `decisions.md`.
- Kiểm tra các công việc `cook` độc lập (không sửa trùng file) thì phân cho các subagent (sonnet).
- Đọc skill với flag `ak:cook <phase-path> --auto` để chạy từng phase.
- Chạy cook BE cho tất cả các phase có BE.
- Chạy cook FE cho tất cả các phase có BE (dựa trên `<repo-root>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/*`).
- Đọc nội dung AC -> xây dựng các bước thực hiện (B1, B2,...) để chạy AC -> viết spec cho e2e playwright theo các bước.
- **Mỗi AC phải có ca e2e** (Stage 2). BE/FE unit test viết theo nhu cầu của chính nó, không phải để thay e2e.
- **Quy ước tag `@case:`/`@req:` và cách gộp nhiều ca vào một AC**: `.claude/rules/e2e-playwright.md` §*Luật nghiệm thu*. BE giữ tiền tố method `AC<nn>_`, FE Karma nhắc mã AC trong title `it()` — cả hai là **để đọc**, không phải đường truy vết nghiệm thu.
- Xong cook thì commit Tiếng Anh `cook(<slug>): <phase-NN> <BE/FE> <description>`.

## Stage 4 - Testing

- Chạy BE Unit Test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- Chạy FE Unit Test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- Check cờ `--no-test`:
  - **Có** - push commit và sang stage 5.
  - **Không** - tiếp tục chạy *testing* đến hết workflow.
- Chạy e2e playwright test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- **Bật cổng cho UC vừa làm** — thêm mã UC vào `enforcedUcs` của `<repo-root>/apps/angular/e2e-playwright/ac-e2e-scope.json`.
- Chạy cổng truy vết, exit ≠ 0 là chặn:
  ```bash
  node scripts/e2e/check-ac-e2e-coverage.mjs;   echo "TOOL_EXIT=$?"
  ```
  Cổng này đọc **tĩnh** (`@case:` trong text spec) ⇒ nó chứng minh AC **có** test, KHÔNG chứng minh test **xanh**. Trạng thái thật chỉ có sau khi chạy suite — xem Stage 5.
- Báo cáo nghiệm thu do reporter Playwright ghi khi chạy suite: `apps/angular/e2e-playwright/fixtures/ac-report.md` (+ `.html`). Mẫu số là `ac-index/`, nên **mọi** AC có một dòng: `PASS` / `FAIL` / `BLOCKED` (kèm vật cản) / `SKIP` / `NO TEST` (có ca nhưng lượt này chưa chạy) / `THIẾU E2E` (không có ca).
- Xong fix thì commit Tiếng Anh `fix(<slug>): <phase-NN> <BE/FE> <description>`.

## Stage 5 - Result

- Chạy script `<repo-root>/scripts/localhost.sh stopservices` + `<repo-root>/scripts/localhost.sh stop-service angular` để stop các service + frontend của session này.
- Liệt kê tổng thời gian chạy skill.
- Liệt kê những điểm quy trình hoặc bộ luật (ngắn gọn) mà skill cần cải thiện.
- Liệt kê `gaps.md` còn tồn đọng **không giải quyết được**.

---

# 4. Token & context

- Đọc URD **một lần**, cắt đúng đoạn UC vào `uc-source.md`. Stage sau đọc `uc-source.md` (khi cần).
- Không `Read` file >500 dòng nguyên bản — `grep -n` / `sed -n` lấy đúng khoảng.
- Tự động phân bổ subagent (model) hợp lý.
- Truyền **path tuyệt đối** cho subagent, không dán nội dung file.
- Mọi state ghi ra file **ngay khi có**.

---

# 5. References

| File | Nội dung |
|---|---|
| `references/templates.md` | Khuôn cho `uc-source.md`, `ac-source.md`, `ac-verify.md`, `state.md`, `decisions.md`, `gaps.md`, `debt.md`, `ba-questions.md` |

Script:

| Script | Dùng ở | Trả lời câu gì |
|---|---|---|
| `scripts/check-contracts.mjs` | BE, FE | 4 hợp đồng qua biên có đóng không (C1–C4) |
| `scripts/check-env.mjs fresh` | **tiền đề** của BE | Tiến trình phục vụ cổng này có đúng là bản build hiện tại không |
| `scripts/check-env.mjs exclusive` | trước mọi lần đo suite | Có ai đang giữ tài nguyên độc quyền không |
| `scripts/contracts/lib.mjs` → `verdict()` | mọi cổng | Cưỡng chế `0 mục đo được ⇒ SKIP`, in `đã kiểm N` |
