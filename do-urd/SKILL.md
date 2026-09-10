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
| E04 | không tìm thấy mã UC (thử **3 mẫu**: `**-UC{NN}`, `**-UC-{NN}`, `UC {NN}`) | **cảnh báo rồi hỏi user** |
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
- Subagent phải được **yêu cầu đối chiếu** lại số của lead.
- Tạo **Monitor** để **chắc chắn** chạy đúng **workflow**.
- **Bỏ qua** MCP `utopforge`.
- Các subagent chỉ dùng model `opus` hoặc `sonnet`.
- **Bản gốc skill: `/home/quacn/Projects/skills/do-urd/`** — sửa ở đó trước rồi chép vào repo; Stage 1 chạy `node <skill>/scripts/check-skill-sync.mjs <repo-root>` (exit ≠ 0 = lệch).
- **Subagent chạy tiền cảnh**: prompt luôn ghi *"không `run_in_background`, không chờ notification"*. Chỉ lead build/restart service.

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
- Tạo file `state.md`, `gaps.md`, `decisions.md`, `ba-questions.md`, `debt.md` trong `$PLAN_DIR` (khuôn: `references/templates.md`):
  - `gaps.md` — khoảng trống **giữa tài liệu** (URD↔URD, URD↔design, URD↔ma trận BA); mỗi gap trỏ D (làm tiếp thế nào) và B nếu bị chặn; không ghi hạn chế code.
  - `decisions.md` — dev **chọn gì để làm tiếp** (clarify + kỹ thuật ở cook/test), theo hướng AC; mỗi mặc định tạm trong `gaps.md` có một D.
  - `ba-questions.md` — chỉ việc **bị chặn, dev không đi tiếp được** (B-nn), viết cho team BA: tiền đề (mã + tiêu đề), trích URD, cần BA quyết gì; không tên file/lớp. URD chưa rõ nhưng dev chọn được ⇒ `decisions.md`.
  - `debt.md` — hạn chế codebase / việc làm sau.
- Chạy `<repo-root>/scripts/db/use-local-db.sh` (linux/macos) hoặc `<repo-root>/scripts/db/use-local-db.ps1` (windows) để thay đổi các setting về `localhost`.

## Stage 2 - Plan

- Đối chứng lại với file `docx` (hình ảnh/sơ đồ nếu có) của đường dẫn `--urd` ở cùng thư mục.
- Đọc `graphify` để hiểu `codebase` và `architecture` trước.
- Đọc và chạy skill với flag `ak:plan <--urd> <--des> --deep` để chạy plan:
  - Nếu =1 UC thì sinh ra `$UC_DIR` = `$PLAN_DIR`.
  - Nếu >1 UC thì sinh ra `$UC_DIR` =`<repo-root>/plans/{stamp}-{slug}[/<ma-uc>]/`
- Phase `phase-00-*` là phase khởi tạo dùng chung cho mọi phase (ví dụ migration,...).
- Copy **nguyên văn UC** vào `$UC_DIR/uc-source.md`.
- Copy **nguyên văn AC** nghiệm thu vào `$UC_DIR/ac-source.md` - thêm phần *tham chiếu* là **tên file** từ path của `--urd`.
- **Đăng ký AC vào chỉ mục** `<repo-root>/apps/angular/e2e-playwright/ac-index/<module>/<MÃ-UC>.json` — sinh bằng `node <repo-root>/scripts/e2e/import-ac-index.mjs`, KHÔNG viết tay. Chưa đăng ký = AC vô hình với cổng và báo cáo nghiệm thu + tên file tham chiếu.
- ⛔ **Luật nghiệm thu ở `.claude/rules/e2e-playwright.md` §*Luật nghiệm thu — 1 AC = 1 ca Playwright*.** Đọc ở đó. Tóm tắt để biết mình đang cần gì: 1 AC = ít nhất 1 ca e2e · xUnit/Karma là **tiền đề**, không phải bằng chứng · không dựng được thì khai `blocked` (`by` + `why`) · còn lại là `THIẾU E2E`.
- Quét `$PLAN_DIR` rồi so sánh với scout `codebase` + `graphify` rồi `clarify user`, lưu lại vào `decisions.md`.
- **Hai hệ mã UC** (URD ≠ ma trận BA, `permissions.md` §G-26): lập bảng đối chiếu theo chức năng ở plan; UC không có trong ma trận ⇒ hỏi user ngay vòng clarify đầu, không tự đặt mã.
- **Lặp lại clarify user** cho đến khi không còn thắc mắc.
- Xong plan thì commit Tiếng Anh `plan(<slug>): <description>`.

## Stage 3 - Implement

- **Luôn đối chứng, không suy đoán.**
- Từ stage này trở đi, **không hỏi/đợi user** nữa - mọi vấn đề -> lưu vào `gaps.md` -> dựa trên `tài liệu URD` + repo tài liệu `<repo-root>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/**` + scout `codebase` + `graphify` -> **tìm và chọn solution + trade off** tối ưu nhất -> lưu vào `decisions.md`.
- Đọc và chạy skill với flag `ak:cook <phase-path> --auto` để chạy từng phase.
- Chạy cook BE cho tất cả các phase có BE. ⛔ `ApplicationService`/`DomainService` ABP không `sealed` (Castle proxy) — `dotnet-services.md` §Coding Standards.
- Chạy cook FE cho tất cả các phase có FE (**design layout** dựa trên các file trong `<repo-root>/../Utop.VietBank.CRM.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/**`).
- **Mỗi AC phải có ca e2e** (Stage 2). BE/FE unit test viết theo nhu cầu của chính nó, không phải để thay e2e.
- **Quy ước tag `@case:`/`@req:` và cách gộp nhiều ca vào một AC**: `.claude/rules/e2e-playwright.md` §*Luật nghiệm thu*. BE giữ tiền tố method `AC<nn>_`, FE Karma nhắc mã AC trong title `it()` — cả hai là **để đọc**, không phải đường truy vết nghiệm thu.
- Xong cook thì commit Tiếng Anh `cook(<slug>): <phase-NN> <BE/FE> <description>`.

## Stage 4 - Testing

- Chạy BE Unit Test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- Chạy FE Unit Test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- Check cờ `--no-test`:
  - **Có** - smoke tĩnh cho spec e2e vừa viết rồi push, sang stage 5:
    ```bash
    cd apps/angular/e2e-playwright && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -cE 'tests/<Module>/'   # phải = 0
    npx playwright test tests/<Module> --list > /dev/null; echo "TOOL_EXIT=$?"                             # phải = 0
    ```
  - **Không** - tiếp tục chạy *testing* cho đến hết **workflow** này.
- Chạy e2e playwright test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- **Bật cổng cho UC vừa làm** — thêm mã UC vào `enforcedUcs` của `<repo-root>/apps/angular/e2e-playwright/ac-e2e-scope.json`.
- Chạy cổng truy vết, exit ≠ 0 là chặn:
  ```bash
  node scripts/e2e/check-ac-e2e-coverage.mjs;   echo "TOOL_EXIT=$?"
  ```
  Cổng này đọc **tĩnh** (`@case:` trong text spec) ⇒ nó chứng minh AC **có** test, KHÔNG chứng minh test **xanh**. Trạng thái thật chỉ có sau khi chạy suite — xem Stage 5.
- Báo cáo nghiệm thu do reporter Playwright ghi khi chạy suite: `apps/angular/e2e-playwright/fixtures/results/ac-report.html`. Mẫu số là `ac-index/`, nên **mọi** AC có một dòng: `PASS` / `FAIL` / `BLOCKED` (kèm vật cản) / `SKIP` / `NO TEST` (có ca nhưng lượt này chưa chạy) / `THIẾU E2E` (không có ca).
- Xong fix thì commit Tiếng Anh `fix(<slug>): <phase-NN> <BE/FE> <description>`.

## Stage 5 - Result

- Stop các **backend services + angular** của session này bằng script `localhost.sh` (linux/macos) hoặc `stop-service.ps1` (windows).
- Liệt kê **tổng thời gian chạy skill** này.
- Liệt kê **ngắn gọn** những điểm **workflow hoặc rules** mà skill này cần cải thiện.
- Liệt kê `gaps.md` còn tồn đọng **không giải quyết được** - so sánh với `codebase` + `graphify` để đưa ra `solution`.

---

# 3b. Nối lại sau khi bị ngắt (spend limit · crash · hết context)

- Mỗi lần giao việc: ghi 1 dòng checkpoint vào `state.md` (agent · phạm vi file · đang làm · bước kế).
- Nối lại bằng `SendMessage` tới **đúng tên agent cũ**, kèm trạng thái working tree + việc còn lại. Không spawn agent mới.
- Trước khi nối: kiểm hạn mức, stack (4 cổng), RAM.
- Agent im lặng > 10 phút ⇒ treo (thường chờ notification nền): nhắn chạy tiền cảnh.

---

# 4. Token & context

- Đọc URD **một lần**, cắt đúng đoạn **nguyên văn UC** vào `uc-source.md`. Stage sau đọc `uc-source.md` (khi cần dùng).
- Không `Read` file >500 dòng nguyên bản — `grep -n` / `sed -n` lấy đúng khoảng.
- Tự động phân bổ subagent (model `opus` hoặc `sonnet`) 1 cách hợp lý - **không** để subagent sửa chung file.
- Truyền **path tuyệt đối** cho subagent, không dán nội dung file.
- Mọi state ghi ra file **ngay khi có**.

---

# 5. References

| File | Nội dung |
|---|---|
| `references/templates.md` | Lưu nội dung với khuôn cho các loại sau: `uc-source.md`, `ac-source.md`, `ac-verify.md`, `state.md`, `decisions.md`, `gaps.md`, `debt.md`, `ba-questions.md` |

---

# 6. Scripts

| Script | Dùng ở | Trả lời câu gì |
|---|---|---|
| `scripts/check-contracts.mjs` | BE, FE | 4 hợp đồng qua biên có đóng không (C1–C4) |
| `scripts/check-env.mjs fresh` | **tiền đề** của BE | Tiến trình phục vụ cổng này có đúng là bản build hiện tại không |
| `scripts/check-env.mjs exclusive` | trước mọi lần đo suite | Có ai đang giữ tài nguyên độc quyền không |
| `scripts/contracts/lib.mjs` → `verdict()` | mọi cổng | Cưỡng chế `0 mục đo được ⇒ SKIP`, in `đã kiểm N` |
