# Mẫu prompt cho agent phân tích / verify (Agent hoặc Workflow)

Dán các khối dưới vào prompt. Mỗi khối là một lần agent **đã làm sai thật** ngày 28/09 — không phải phong cách.

## 1. Bối cảnh (bắt buộc)

```text
Môi trường: Linux, shell fish (bọc lệnh bằng bash -c). Repo <root>, nhánh <nhánh>. Stack local ĐANG CHẠY trên
DB local (docker mssql, DB vb-crm-qa — KHÔNG phải QA): Angular :4200, gateway :44323, saas :44357, auth :44366.
Báo cáo tiếng Việt. Dump bug: <scratch>/bugs/<id>.md (Repro · comment · URL ảnh).
```

## 2. Luật cứng (bắt buộc)

```text
- CHỈ tạo tệp trong <scratch>. Không sửa repo, không git add/commit/stash/checkout.
- KHÔNG restart/stop service, không scripts/localhost.sh, không dotnet run / start-be.ps1.
- ⛔ KHÔNG sửa appsettings*.json (service đang chạy TỰ NẠP LẠI tệp ⇒ đổi tệp = đổi DB đang nối).
- KHÔNG SQL ghi DB. Tra CHỈ ĐỌC: docker exec mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '<pw>' -C
  -d vb-crm-qa -W -s '|' -Q "SELECT …" (schema saas_service · identity: [identity]).
- Dữ liệu test (khi người dùng CHO PHÉP): chỉ qua UI/API của app trên localhost, tiền tố VERIFY-<ddmm>.
- Không comment / đổi state ADO — agent chính làm.
```

## 3. Tin nhắn người dùng gửi giữa lượt (bắt buộc khi có)

Tin nhắn người dùng gửi lúc agent đang chạy **được chuyển tới agent**. 28/09: *"anh chạy
seed-administrative-divisions.sql rồi nhé"* (= anh **đã** chạy xong) bị agent đọc thành "hãy chạy SQL" ⇒ từ chối
rồi **bỏ luôn nhiệm vụ**. Ghi rõ:

```text
Nếu thấy tin nhắn người dùng kiểu "<nguyên văn>": nghĩa là <diễn giải>. KHÔNG phải yêu cầu với bạn, KHÔNG liên
quan nhiệm vụ này — tiếp tục làm.
```

## 4. Trước khi gọi thứ gì là "thiếu" / "bug mới" (bắt buộc)

```text
Trước khi kết luận một khối/trường/nút "thiếu" hoặc "chưa được gắn": git log -S'<selector|tên>' -- <thư mục>,
mở commit/PR gần nhất đụng nó (git log -1 --format=%B <hash>) và đọc mô tả. Bị gỡ CÓ CHỦ Ý (PR/quyết định/design)
⇒ báo "cố ý gỡ + nguồn", KHÔNG báo bug.
```
Tiền lệ: agent báo khối `credit-facilities-block` "không được mount" là bug mới — mô tả PR 48495 ghi *"Bỏ khối
Hạn mức tín dụng khỏi card Khoản vay theo design"*.

## 5. Tiền đề dữ liệu (bắt buộc với bug cần bản ghi)

```text
Trước khi chạy Repro: đếm bảng liên quan (SELECT COUNT(*)). Rỗng ⇒ DỪNG, báo "thiếu dữ liệu X" kèm câu SELECT —
không đoán, không coi là đã verify.
```
Đo 28/09: DB local 0 Lead · 0 Opportunity · 0 Product · 0 AdministrativeDivisions. `Product.ProductFamilyCode`
không có đường ghi qua API/UI (dữ liệu danh mục, cố ý) ⇒ tạo Lead test **qua API** `POST /api/saas/lead-opp`.

## 6. Trình duyệt

```text
Ưu tiên Chrome DevTools MCP (mcp__chrome-devtools__*) hoặc Claude in Chrome (nạp skill claude-in-chrome trước).
Không kết nối được ⇒ DỪNG và báo — agent chính hỏi người dùng. Playwright headless CHỈ khi được cho phép:
PW_OUT=<scratch> PW_STATE=<scratch>/pw-state-<tên-agent>.json node <S>/pw-run.mjs <scenario.mjs>
(mỗi agent một PW_STATE riêng; gặp 401/màn trống ⇒ xoá PW_STATE rồi chạy lại).
```

## 7. Schema đầu ra (bắt buộc)

`bugs[]` với `id` · `verdict` (enum) · `evidence` · `shots[]` · `verifyLine` · `level` (`runtime`|`code`), và:

```text
PHẢI trả đủ MỌI id được giao — id nào không làm được thì vẫn trả, verdict "KHÔNG TÁI HIỆN ĐƯỢC" + lý do.
```
Tiền lệ: agent SAL trả 3/4 bug, **bỏ im** 140810. Agent chính luôn đối chiếu `set(ids giao) == set(ids trả)`.

## 8. Phát hiện "SAI" ⇒ skeptic

Verdict `SAI` (lộ bug thật) ⇒ 2 skeptic độc lập (lens đọc-code · runtime), mỗi skeptic mặc định `refuted=true`
nếu không tự xác nhận được. Chỉ sửa khi ≥2/2 không bác.
