---
name: do-urd
description: "Sử dụng để thực hiện các UC trong 1 URD -> test AC nghiệm thu."
category: workflow
keywords: [urd, use-case, uc, acceptance-criteria, ac, vietbank, plan, cook, verify]
argument-hint: "--urd <path.md> [--des <description>] [--qc]"
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
- **Không suy đoán, không giả định, không bịa đặt** - mọi vấn đề dựa vào tài liệu + codebase + `graphify` + clarify hỏi user.
- **URD -> AC luôn đúng** - nếu không đủ dữ liệu -> tìm solution + trade off để giải quyết chúng.
- **Không** commit các file `appsettings*.json`, `environment*.ts`.
- **Luôn kiểm chứng** kết quả từ các agent/subagent.
- **Đối chiếu cột nguồn khi đặc tả có kiểu/độ dài.** - Đặc tả là yêu cầu, không phải sự thật về schema.
- **Cấm `echo "exit=$?"` sau chuỗi lệnh.** Bắt buộc đặt `echo "TOOL_EXIT=$?"` **ngay sau** lệnh cần đo, trước mọi lệnh khác.
- **Cổng mới phải thử ngược** - phá đúng thứ nó canh ⇒ exit ≠ 0, khôi phục ⇒ exit = 0. Cổng chưa từng đỏ chỉ chứng minh nó chạy.
- **Chỉ được** start service để test apply migration lên DB `localhost` đang trỏ tới.
- Agent phải được **yêu cầu đối chiếu** lại số của lead.
- Monitor từng dòng `workflow` trong skill này để **chắc chắn** chạy đúng **workflow**.

---

# 2. Môi trường localhost cho Testing

- `appsettings*.json` - **luôn luôn** trỏ về database `localhost`.
- Chạy `scripts/localhost.sh service <name>` (linux/macos) hoặc `scripts/start-services.ps1` (windows) để chạy những service BE + FE cần test.

---

# 3. Workflow

## Stage 1 - Branch

- `{stamp}` = `yyyyMMdd-HHmm`, `{slug}`= mã UC hoặc mô tả ngắn gọn (ví dụ: `c360-fr-01-uc01`, `c360-batch1-6uc`).
- Tạo nhánh `tasks/{stamp}-{slug}` từ nhánh `HEAD`.
- Tạo `$PLAN_DIR` = `plans/{stamp}-{slug}/`.
- Tạo file `state.md`, `gaps.md`, `decisions.md` trong `$PLAN_DIR`
- Chạy `scripts/db/use-local-db.sh` (linux/macos) hoặc `scripts/db/use-local-db.ps1` (windows) để thay đổi các setting về `localhost`.

## Stage 2 - Plan

- Đọc skill với flag `ak:plan <--urd> <--des> --deep` để chạy plan:
  - Nếu =1 UC thì sinh ra `$UC_DIR` = `$PLAN_DIR`.
  - Nếu >1 UC thì sinh ra `$UC_DIR` =`plans/{stamp}-{slug}[/<ma-uc>]/`
- Phase `phase-00-*` là phase khởi tạo dùng chung cho mọi phase (ví dụ migration,...).
- Copy **nguyên văn UC** vào `$UC_DIR/uc-source.md`
- Copy **nguyên văn AC** nghiệm thu vào `$UC_DIR/ac-source.md`
- Quét `$PLAN_DIR` rồi so sánh với codebase + `graphify` rồi **clarify** tất cả với user, lưu lại vào `decisions.md`.
- **Lặp lại clarify** user cho đến khi không còn thắc mắc.
- Commit Tiếng Anh `plan(<slug>): <description>`.

## Stage 3 - Implement

- **Luôn đối chứng, không suy đoán.**
- Từ stage này trở đi, không hỏi/đợi user nữa - mọi vấn đề -> lưu vào `gaps.md` -> dựa trên tài liệu **URD** + repo tài liệu `<repo-root>/../Utop.VietBank.Documents` + codebase + `graphify` -> tìm/chọn solution + trade off tối ưu nhất -> lưu vào `decisions.md`.
- Kiểm tra các công việc độc lập (không sửa trùng file) thì phân cho các subagent.
- Đọc skill với flag `ak:cook <phase-path> --auto` để chạy từng phase.
- Chạy cook BE cho all phase.
- Chạy cook FE cho all phase.
- Mỗi 1 AC trong 1 UC = 1 unit test BE (group theo phân hệ `#region <module-code> -> #region <ma-uc> <title>`).
- Mỗi 1 AC trong 1 UC = 1 unit test FE (nếu có) + test case playwright (nếu có - group phân hệ `<module-code> -> <ma-uc>`).
- **Design Layout** dựa trên `<repo-root>/../Utop.VietBank.Documents/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/`.
- Xong 1 phase thì commit Tiếng Anh `cook(<slug>): <phase-NN> <BE/FE> <description>`.

## Stage 4 - Testing

- Chạy BE Test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- Check cờ `--qc`:
  - **Có** - dừng lại hỏi user có tiếp tục.
  - **Không** - tiếp tục chạy Testing.
- Chạy FE Test -> fix bug nếu có (tối đa 5 vòng, còn lỗi lưu `fails.md`).
- Xong 1 fix phase thì commit Tiếng Anh `fix(<slug>): <phase-NN> <BE/FE> <description>`.

## Stage 5 - Result

- Chạy script `scripts/localhost.sh stopservices` + `scripts/localhost.sh stop-service angular` để stop các service + frontend.
- Liệt kê kết quả test AC nghiệm thu.
- Liệt kê tổng thời gian chạy skill.
- Liệt kê những điểm quy trình hoặc bộ luật mà skill cần cải thiện.
- Liệt kê `gaps.md` còn tồn đọng -> đề xuất phương hướng để giải quyết.

---

# 4. Token & context

- Đọc URD **một lần**, cắt đúng đoạn UC vào `uc-source.md`. Stage sau đọc `uc-source.md` (khi cần).
- Không `Read` file >500 dòng nguyên bản — `grep -n` / `sed -n` lấy đúng khoảng.
- Tự động phân bổ subagent hợp lý.
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
