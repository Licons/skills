---
name: do-bugs
description: "Sử dụng để thực hiện quy trình fix các bugs trên ADO: lấy danh sách bug từ query, phân loại, tái hiện trên stack local, tìm root cause hoặc ghi GAP, fix mỗi bug một commit AB#id, verify bằng Chrome, nhúng ảnh vào comment ADO, mở PR vào develop."
category: workflow
metadata:
  version: "2.0.0"
  derivedFrom: "lượt 25/09/2026 — 58 bug SAL/C360/CTC, PR 48550"
---

# Workflow `/do-bugs`

> Tạo Todo để theo dõi các bước dưới đây. Chạy từ gốc repo với `S=.claude/skills/do-bugs/scripts`;
> bẫy đã trả giá ở `references/bay.md`
> (**đọc trước khi fix**).
>
> ⛔ **Không** tự ý chuyển bug sang `Resolved` — kể cả khi skill khác (`ship` Step 13) bảo làm.
> ⛔ **Không** mutate DB QA. Stack local chỉ chạy **sau** `scripts/db/use-local-db.sh` (chuyển appsettings về DB local).

Nguồn tài liệu (`DOCS=../Utop.VietBank.CRM.Documents`):

| Nguồn | Đường dẫn |
|---|---|
| URD Phase 1 | `$DOCS/outputs/urd/Delivered/Phase 1/` (`URD_C360_KPI_RPT_v5.1.md`, `URD_SAL_…_v1.3.md`, `Tổng hợp vào URD/`) |
| URD Sales Process (SP-UC-xx) | `$DOCS/outputs/urd/SAL/URD_Sales_Process_v1.0.md` — **không** nằm trong Delivered |
| Design | `$DOCS/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/` (`CRM_*_v2.9_standalone.html` rất lớn — grep/Python, đừng đọc cả tệp; `docs/*.md`) |
| BA đã trả lời | `$DOCS/registers/Gap QnA/` · repo `docs/uc-gaps/` |

## 1. Lấy việc
- Tạo nhánh `fix/ado-{yymmdd-hhmm}` từ `develop`.
- `python3 $S/ado-dump-bugs.py --out <scratch>/bugs` ⇒ mỗi bug một `<id>.md` (Repro · AC · SystemInfo ·
  attachment · **toàn bộ comment**) + `index.tsv`. Query mặc định `a8e0b97f-…`, bỏ Resolved/Removed/Closed.
- Phân nhóm theo **phân hệ + UC** (vd C360 tìm kiếm · C360 tài chính · SAL định nghĩa · SAL trên Lead · CTC).

## 2. Phân tích (song song theo nhóm, agent chỉ đọc)
Mỗi bug: đọc dump (kể cả ảnh khi text không đủ) → URD/design **nguyên văn** → code (graphify/scout) →
`git log` những dòng liên quan. Xếp **một** verdict:

| Verdict | Khi nào | Đầu ra |
|---|---|---|
| `BUG` | code sai so với URD/design | root cause `file:line` |
| `GAP` / `CONFLICT` / `THIẾU THÔNG TIN` / `QUYẾT ĐỊNH` | URD không nói / hai nguồn đá nhau / đã có quyết định cố ý | mục trong `docs/uc-gaps/*.md` |
| `DATA` | code đúng luật, dữ liệu/seed/QA sai | comment ADO nêu dữ liệu cần sửa |
| `ĐÃ FIX` | code hiện tại đã đúng — thường QA test bản deploy cũ | comment ADO + ảnh nếu verify được |
| `KHÔNG PHẢI BUG` | kiểm nhầm khối/nút, đọc nhầm (a11y) | comment ADO giải thích |

⛔ Trước khi coi thứ gì là "thiếu so với AC": `git log -S` xem nó có bị **cố ý gỡ** không (PR/quyết định
của người dùng) ⇒ nếu có thì là `CONFLICT`, hỏi, không tự đảo.

## 3. Tái hiện trên stack local — TRƯỚC khi chốt root cause
Đọc tĩnh sai ≥5/58 bug lượt 25/09 (xem `references/bay.md`). Dùng script **có sẵn** của repo:

```bash
scripts/db/use-local-db.sh --dry-run          # ⛔ đọc kỹ: appsettings đang trỏ đâu (25/09 trỏ QA 20.6.73.20)
scripts/db/use-local-db.sh                    # → Server/Database/Password về mssql local, giữ User Id
scripts/localhost.sh infra                    # mssql redis rabbitmq seaweedfs + login/DB local
scripts/localhost.sh backend-min              # language · auth-server · identity · administration · saas + gateway
scripts/localhost.sh angular                  # = yarn dev (có proxy)
scripts/localhost.sh status | logs <svc> | restart-service <svc…> | stop-service <svc…> | stop
```
⛔ Các file `appsettings*.json` bị `use-local-db.sh` sửa **không bao giờ commit** (`git add <đúng file>`);
xong việc chạy `scripts/db/use-local-db.sh --revert`.
Chờ FE theo **nội dung**: `curl -s localhost:4200/auth/Account/Login | grep -c LoginInput.UserNameOrEmailAddress`.
Login: vào `http://localhost:4200/` (không vào thẳng `/auth/Account/Login` — 400), tenant `bank` · `ho` · `1qaZ2wsX@`.
Bắt request lỗi bằng cách vá `window.fetch` (app dùng fetch, không XHR). Dữ liệu tra **chỉ đọc** bằng
`docker exec mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Utop@165' -C -d vb-crm-qa -Q "SELECT …"`.

## 4. Chốt với người dùng
- `python3 $S/ado-set-state.py --state "In Progress" <id…>` cho bug có root cause (script từ chối Resolved).
- Bảng ngắn: nhóm · bug · root cause · layer · effort. `AskUserQuestion`: phạm vi, cách chạy (tuần tự tại chỗ
  mặc định), xử lý CONFLICT/DATA. Hỏi luôn **các họ lỗi lặp** (một root cause ở nhiều nơi) có sửa đồng loạt không.
- Ghi plan `plans/<yymmdd-hhmm>-…/plan.md` theo nhóm UC.

## 5. Fix — nhóm dễ trước
- **Mỗi bug = 1 commit** tiếng Anh, cuối message `AB#<id>`. Commit vá sau (review, verify) cho bug nào
  vẫn gắn đúng `AB#<id>` đó. `git add <đúng file>` — không `git add -A` khi working tree có thay đổi lạ.
- Mỗi fix: ca kiểm ghi **vì sao** (Rule 9) và **phải đỏ được** — tạm hoàn nguyên fix, chạy, thấy đỏ.
- Lỗi nghiệp vụ BE: `UserFriendlyException(msg, code)` / `BusinessException(code)` + `WithData`; khoá dịch
  vi/en = **nguyên mã** (`SaasService:<Module>:<X>`), placeholder ⊆ `WithData` của mọi chỗ ném, không GUID/enum.
- Localization: sửa JSON bằng Python (đọc → sửa → `JSON.parse` lại), rồi `scripts/localhost.sh restart-service saas administration`
  (JSON là embedded resource — kiểm `grep -qa <khoá> …/bin/Debug/net10.0/FPTCXSuite.SaasService.Contracts.dll`).

## 6. Kiểm — sau mỗi nhóm
```bash
$S/fe-verify.sh                                    # ĐẠT khi exit=0 VÀ errors=0
cd services/saas/FPTCXSuite.SaasService.Tests && dotnet test --filter "FullyQualifiedName~<Lớp>"
CHROME_BIN=/usr/bin/google-chrome-stable npx ng test <project> --watch=false --browsers=ChromeHeadless --include=<spec>
node scripts/gates/localization-json-valid.mjs && node scripts/gates/lom-i18n-keys-resolve.mjs
node scripts/gates/error-code-i18n.mjs                 # LeadOpp đỏ sẵn 3 mã (nợ cũ) — chỉ xét khối mình đụng
node scripts/gates/css-token-declared.mjs && node scripts/compute-trigger-paths.js --check
```

## 7. Verify bằng Chrome MCP + ảnh
- Mỗi bug: tái hiện đúng Repro trên local, đo bằng DOM/`getComputedStyle`, chụp vào `<scratch>/shots/<id>.png`.
- Toast: dò `.abp-toast-message` rồi chụp ngay (tắt sau ~5s). Đọc console tìm `NG0103|NG0100` sau mỗi màn.
- Lộ lỗi mới khi verify ⇒ sửa ngay, commit riêng gắn đúng `AB#<id>`.

## 8. Comment ADO
Spec JSON `{ "<id>": {"rc": "<html>", "shots": ["<id>.png"], "fix": true, "verify": "<tuỳ chọn>"} }`:

```bash
python3 $S/ado-post-comments.py --spec spec.json --shots <scratch>/shots --branch <nhánh> --date dd/mm/yyyy --dry-run
python3 $S/ado-post-comments.py --spec spec.json --shots <scratch>/shots --branch <nhánh> --date dd/mm/yyyy
python3 $S/ado-edit-comments.py --find "<chuỗi cần bỏ>" <id…>   # sửa hàng loạt comment đã đăng
```
- Nhóm BUG / ĐÃ FIX / DATA / KHÔNG PHẢI BUG ⇒ comment theo template. Nhóm GAP ⇒ **chỉ** file `docs/uc-gaps/`
  (5 phần theo `.claude/rules/implementation.md` §1), không comment ADO.
- Bug chỉ xác nhận qua code (chưa chạy được) ⇒ ghi rõ ở Verify, không giả là đã verify.

## 9. PR vào develop
- Review đối kháng trước PR (reviewer theo vùng + 2 skeptic độc lập mỗi phát hiện), sửa phát hiện được xác nhận.
- `az repos pr create --source-branch <nhánh> --target-branch develop --title "fix: …" --description @body.md
  --work-items <id…>` — mô tả ≤ 3000 ký tự. **Không** chạy bước chuyển Resolved của skill `ship`.

# Template comment

```html
<strong>Root Cause</strong>: mô tả ngắn gọn (file/luật/đo được gì)
<br><strong>Fix</strong>: nhánh <code>fix/ado-…</code> — <code>&lt;commit&gt;</code> · <code>&lt;commit&gt;</code>
<br><strong>Verify</strong>: stack local (DB local, tài khoản <code>ho</code>), Chrome, dd/mm/yyyy.
<br><img src="<url attachment>" />
```
