---
name: do-bugs
description: "Sử dụng để thực hiện quy trình fix các bugs trên ADO: lấy danh sách bug từ query, phân loại, tái hiện trên stack local, tìm root cause hoặc ghi GAP, fix mỗi bug một commit AB#id, verify bằng Chrome, nhúng ảnh vào comment ADO, mở PR vào develop."
category: workflow
metadata:
  version: "2.2.0"
  derivedFrom: "lượt 25/09/2026 — 58 bug SAL/C360/CTC, PR 48550 · lượt 28/09/2026 — 23 bug, PR 48799 · lượt 06/10/2026 — 9 bug, PR 49794"
---

# Workflow `/do-bugs`

> Tạo Todo để theo dõi các bước dưới đây. Chạy từ gốc repo với `S=.claude/skills/do-bugs/scripts`;
> bẫy đã trả giá ở `references/bay.md` (**đọc trước khi fix**); prompt cho agent: `references/verify-agent.md`.
>
> ⛔ **Không** tự ý chuyển bug sang `Resolved` — kể cả khi skill khác (`ship` Step 13) bảo làm.
> ⛔ **Không** mutate DB QA. Stack local chỉ chạy **sau** `scripts/db/use-local-db.sh` (chuyển appsettings về DB local).
> ⛔ **Không đổi `appsettings*.json` khi stack còn chạy** — service tự nạp lại tệp ⇒ đưa về HEAD (trỏ QA) là
> service đang chạy **nối QA ngay** (sự cố 28/09). Dừng stack trước, rồi mới `git checkout`.
> ⛔ **Luôn** đo `Server=` ngay trước **mọi** start/restart service. Trả code chỉ **đúng tệp** (`git checkout -- <tệp.cs>`),
> không trả cả thư mục service — kéo theo appsettings trỏ QA (sự cố 06/10: saas lấy lock migration trên QA).

## Luật chung

- Đầu lượt kiểm luôn: Chrome MCP kết nối được + đăng nhập được (tenant `bank` · `admin` · `1qaZ2wsX@`). Thiếu ⇒ hỏi ngay, đừng đợi §7.
- `localhost.sh stop` tắt cả docker infra ⇒ chạy lại `infra` trước `backend-min`.
- Agent viết code: tại chỗ, tệp rời nhau, **không** git — agent chính commit theo `AB#` (worktree từng sinh sai base).
- Không `pkill -f`/`pgrep -f` với chuỗi có trong chính lệnh đang chạy (shell tự kill mình).
- Thiếu dữ liệu ⇒ tạo qua API của app, tiền tố `VERIFY-<ddmm>` (vd `POST financial-accounts`, `POST crm-tasks`; PUT để "chạm" bản ghi khi kiểm thứ tự).
- `develop` dịch ⇒ rebase lại theo §3, lặp tới khi sạch; comment ADO chỉ sau lần push cuối.

Nguồn tài liệu (`DOCS=../Utop.VietBank.CRM.Documents`):

| Nguồn | Đường dẫn |
|---|---|
| URD Phase 1 | `$DOCS/outputs/urd/Delivered/Phase 1/` (`URD_C360_KPI_RPT_v5.1.md`, `URD_SAL_…_v1.3.md`, `Tổng hợp vào URD/`) |
| URD Sales Process (SP-UC-xx) | `$DOCS/outputs/urd/SAL/URD_Sales_Process_v1.0.md` — **không** nằm trong Delivered |
| Design | `$DOCS/outputs/urd/Delivered/Phase 1/CRM UI Design (Scope)/PREVIEW_export/` (`CRM_*_v2.9_standalone.html` rất lớn — grep/Python, đừng đọc cả tệp; `source_dc/*.dc.html` dễ đọc hơn; `docs/*.md`) |
| Test case UAT theo journey (`TC_…[JN-xx]`) | `$DOCS/inputs/ba/journey_testcase_VB_UAT/` — sinh từ prototype; **design/URD thắng** khi lệch |
| BA đã trả lời | `$DOCS/registers/Gap QnA/` · repo `docs/uc-gaps/` |

## 1. Lấy việc
- Tạo nhánh `fix/ado-{yymmdd-hhmm}` từ `develop`.
- `python3 $S/ado-dump-bugs.py --out <scratch>/bugs` ⇒ mỗi bug một `<id>.md` (Repro · AC · SystemInfo ·
  attachment · **toàn bộ comment**) + `index.tsv`. Query mặc định `a8e0b97f-…`, bỏ Resolved/Removed/Closed.
- Đọc cột **`triage`** của `index.tsv` (so với comment gần nhất của chính mình):

  | `triage` | Nghĩa | Làm |
  |---|---|---|
  | `new` | mình chưa comment | phân tích đầy đủ (§2–§8) |
  | `qa-reply` | QA/người khác comment **sau** mình | đọc phản hồi + ảnh, làm lại |
  | `reverify` | mình comment cuối nhưng Verify **chỉ đọc code** | tái hiện runtime (§3, §7), sửa comment (§8) |
  | `wait-qa` | mình comment cuối, đã verify runtime | **bỏ qua** — chờ QA retest |
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

⛔ Trước khi coi thứ gì là "thiếu so với AC": `git log -S` xem nó có bị **cố ý gỡ** không, **đọc mô tả PR**
(`git log -1 --format=%B <hash>`) ⇒ nếu có thì là `CONFLICT`/cố ý, hỏi, không tự đảo.
Giao agent: dùng **`references/verify-agent.md`** (luật · tin nhắn giữa lượt · tiền đề dữ liệu · schema bắt trả
**đủ mọi id**). Nhận kết quả: so `set(id giao) == set(id trả)`; verdict `SAI` ⇒ 2 skeptic trước khi sửa.

## 3. Tái hiện trên stack local — TRƯỚC khi chốt root cause
Đọc tĩnh sai ≥5/58 bug lượt 25/09 và 1/9 lượt 28/09 (xem `references/bay.md`). Dùng script **có sẵn** của repo:

```bash
scripts/db/use-local-db.sh --dry-run          # ⛔ đọc kỹ: appsettings đang trỏ đâu (develop 28/09: 91/91 khoá trỏ QA)
scripts/db/use-local-db.sh                    # → Server/Database/Password về mssql local, giữ User Id
grep -rhoE 'Server=[^;"]+' services/*/*/appsettings.json apps/auth-server/*/appsettings.json gateways/*/*/appsettings.json | sort | uniq -c
scripts/localhost.sh infra                    # mssql redis rabbitmq seaweedfs + login/DB local
scripts/localhost.sh backend-min              # language · auth-server · identity · administration · saas + gateway
scripts/localhost.sh angular                  # = yarn dev (có proxy)
scripts/localhost.sh status | restart-service <svc…> | stop-service <svc…> | stop   # log: .run-logs/<svc>.log
```
- ⛔ Các file `appsettings*.json` bị `use-local-db.sh` sửa **không bao giờ commit** (`git add <đúng file>`).
  **Không** dùng `use-local-db.sh --revert` (ghi `Authority` origin cũ). Xong việc: `scripts/localhost.sh stop`
  **rồi mới** `git status --short | awk '{print $2}' | grep appsettings | xargs git checkout --`.
- Rebase/pull giữa chừng ⇒ đưa appsettings về HEAD (theo đúng thứ tự trên) để rebase sạch, rồi chạy lại
  `use-local-db.sh` + đo `Server=` trước khi start lại.
- **Tiền đề dữ liệu**: trước khi tái hiện, đếm bảng bug cần (vd `Leads` · `Opportunities` · `Products` ·
  `AdministrativeDivisions`). Rỗng ⇒ hỏi người dùng: seed từ QA · tạo dữ liệu test qua **API/UI** của app
  (tiền tố `VERIFY-<ddmm>`, không SQL ghi) · hay bỏ qua bug đó.
- Chờ FE theo **nội dung**: `curl -s localhost:4200/auth/Account/Login | grep -c LoginInput.UserNameOrEmailAddress`.
  Login: vào **trang được bảo vệ** (vd `/banking-service/customers`) — `/` là trang public, không đưa tới login;
  vào thẳng `/auth/Account/Login` ⇒ 400. Tenant `bank` · `admin` · `1qaZ2wsX@`.
- Bắt request lỗi bằng cách vá `window.fetch` (app dùng fetch, không XHR). Dữ liệu tra **chỉ đọc**:
  `docker exec mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Utop@165' -C -d vb-crm-qa -Q "SELECT …"`.

## 4. Chốt với người dùng
- `python3 $S/ado-set-state.py --state "In Progress" <id…>` cho bug có root cause — **kể cả bug `reverify`**
  vừa verify lại runtime và bug `ĐÃ FIX` sẽ gắn vào PR (script từ chối Resolved).
- Bug `KHÔNG PHẢI BUG` (không gắn PR) ⇒ **hỏi** người dùng có chuyển Resolved không; chỉ chuyển khi được bảo
  (28/09: 140812), bằng `az boards work-item update --id <id> --state Resolved` — `ado-set-state.py` cố ý chặn.
- Bảng ngắn: nhóm · bug · root cause · layer · effort. `AskUserQuestion`: phạm vi, cách chạy (tuần tự tại chỗ
  mặc định), xử lý CONFLICT/DATA, bug `reverify`. Hỏi luôn **các họ lỗi lặp** (một root cause ở nhiều nơi).
- Ghi plan `plans/<yymmdd-hhmm>-…/plan.md` theo nhóm UC.

## 5. Fix — nhóm dễ trước
- **Mỗi bug = 1 commit** tiếng Anh, cuối message `AB#<id>`. Commit vá sau (review, verify) cho bug nào
  vẫn gắn đúng `AB#<id>` đó. `git add <đúng file>` — không `git add -A` khi working tree có thay đổi lạ.
- Mỗi fix: ca kiểm ghi **vì sao** (Rule 9) và **phải đỏ được** — tạm hoàn nguyên fix, chạy, thấy đỏ.
- Lỗi nghiệp vụ BE: `UserFriendlyException(msg, code)` / `BusinessException(code)` + `WithData`; khoá dịch
  vi/en = **nguyên mã** (`SaasService:<Module>:<X>`), placeholder ⊆ `WithData` của mọi chỗ ném, không GUID/enum.
- Localization: **chèn đúng dòng** khoá mới cạnh khoá có sẵn bằng thao tác chuỗi (không `json.dump` lại cả tệp —
  đổi thụt lề), `json.loads` lại để kiểm; rồi `scripts/localhost.sh restart-service saas administration`
  (JSON là embedded resource — kiểm `grep -qa <khoá> …/bin/Debug/net10.0/FPTCXSuite.SaasService.Contracts.dll`).
- Thêm khoá ở thư mục FE mới ⇒ kiểm `PAGES` của `scripts/gates/lom-i18n-keys-resolve.mjs` có phủ không.

## 6. Kiểm — sau mỗi nhóm
```bash
$S/fe-verify.sh                                    # ĐẠT khi exit=0 VÀ errors=0
cd services/saas/FPTCXSuite.SaasService.Tests && dotnet test --filter "FullyQualifiedName~<Lớp>"
cd apps/angular && CHROME_BIN=/usr/bin/google-chrome-stable npx ng test <project> --watch=false --browsers=ChromeHeadless \
  --include=projects/<project>/src/…/<x>.spec.ts   # ⛔ đường dẫn tính từ WORKSPACE — sai là "0 of 0 SUCCESS"
node scripts/gates/localization-json-valid.mjs && node scripts/gates/lom-i18n-keys-resolve.mjs
node scripts/gates/error-code-i18n.mjs                 # LeadOpp đỏ sẵn 3 mã (nợ cũ) — chỉ xét khối mình đụng
node scripts/gates/css-token-declared.mjs && node scripts/compute-trigger-paths.js --check
```

## 7. Verify trên trình duyệt + ảnh
**Chọn trình duyệt — theo thứ tự, hỏi trước khi hạ cấp:**
1. Chrome DevTools MCP (`mcp__chrome-devtools__*`, nạp qua ToolSearch) hoặc Claude in Chrome (**nạp skill
   `claude-in-chrome` trước**, rồi `tabs_context_mcp`; lỗi kết nối ⇒ `list_connected_browsers` / `switch_browser`).
2. ⛔ Không kết nối được ⇒ **DỪNG, `AskUserQuestion`**: bật extension (cùng tài khoản claude.ai) · gửi yêu cầu
   kết nối · hay đồng ý Playwright headless. **Không** tự chuyển.
3. Playwright headless (chỉ khi được đồng ý): `PW_OUT=<scratch> node $S/pw-run.mjs <scenario.mjs>` — xử lý sẵn
   đổi tenant + chờ tải lại; mỗi agent song song một `PW_STATE`; gặp 401/màn trắng ⇒ xoá `PW_STATE` chạy lại.
   Verify ghi rõ `Playwright headless` (`--browser` của `ado-post-comments.py`). `PW_READY` chỉ báo đã qua login —
   scenario **tự chờ dữ liệu** (response API / số dòng) trước khi chụp.

- Mỗi bug: tái hiện đúng Repro trên local, đo bằng DOM/`getComputedStyle`, chụp vào `<scratch>/shots/<id>.png`.
  **Mở ảnh ra xem** trước khi nhúng — ảnh phải chứa đúng điều câu Verify khẳng định.
- Không có dữ liệu cho nhánh cần kiểm (vd user phạm vi hẹp) mà phải **mô phỏng** (sửa response) ⇒ ghi rõ trong
  Verify: cái gì thật, cái gì mô phỏng, số lấy từ đâu.
- Toast: dò `.abp-toast-message` rồi chụp ngay (tắt sau ~5s). Đọc console tìm `NG0103|NG0100` sau mỗi màn.
- Lộ lỗi mới khi verify ⇒ sửa ngay, commit riêng gắn đúng `AB#<id>`.

## 8. Comment ADO — **sau khi push** (hash đổi nếu còn rebase)
Spec JSON `{ "<id>": {"rc": "<html>", "shots": ["<id>.png"], "fix": true, "level": "runtime"|"code", "verify": "<tuỳ chọn>"} }`:

```bash
python3 $S/ado-post-comments.py --spec spec.json --shots <scratch>/shots --branch <nhánh> --date dd/mm/yyyy [--browser "Playwright headless"] --dry-run
python3 $S/ado-post-comments.py --spec spec.json --shots <scratch>/shots --branch <nhánh> --date dd/mm/yyyy
python3 $S/ado-edit-comments.py --spec edit.json --shots <scratch>/shots --dry-run   # bug reverify: thay dòng Verify + ảnh
python3 $S/ado-edit-comments.py --find "<chuỗi cần bỏ>" <id…>                        # sửa chuỗi hàng loạt
```
- `level` **bắt buộc**: `code` ⇒ Verify tự mở đầu `chỉ đọc code` ⇒ lượt sau vào triage `reverify`. Script
  **từ chối** đăng khi commit của `fix: true` chưa có trên `origin/<nhánh>`.
- Nhóm BUG / ĐÃ FIX / DATA / KHÔNG PHẢI BUG ⇒ comment theo template. Nhóm GAP ⇒ **chỉ** file `docs/uc-gaps/`
  (5 phần theo `.claude/rules/implementation-gap.md`), không comment ADO.
- Sửa comment cũ (bug `reverify`) thay vì đăng mới khi verdict không đổi — trừ khi người dùng muốn QA được báo.

## 9. PR vào develop
- Review đối kháng trước PR (reviewer theo vùng + 2 skeptic độc lập mỗi phát hiện), sửa phát hiện được xác nhận.
- `git fetch` — develop dịch ⇒ rebase (theo §3) **trước** khi push/comment. Push → comment (§8) → PR:
  `az repos pr create --source-branch <nhánh> --target-branch develop --title "fix: …" --description @body.md
  --work-items <id…>` — mô tả ≤ 3000 ký tự. **Không** chạy bước chuyển Resolved của skill `ship`.
- `--work-items` = **mọi bug đã fix + đã comment + có ảnh trong lượt** — kể cả bug `ĐÃ FIX` từ trước chỉ verify
  lại runtime (không có code trong PR), không chỉ bug có commit. **Không** gắn `KHÔNG PHẢI BUG` / `GAP` / bug
  chưa verify runtime. Quên lúc tạo ⇒ `az repos pr work-item add --id <pr> --work-items <id…>` rồi
  `az repos pr work-item list --id <pr>` đối chiếu.
- ⛔ Mọi work item gắn vào PR phải ở **In Progress** (28/09: 5/9 bug gắn PR còn `To Do` — bug `reverify` quên
  chuyển vì §4 chỉ chạy cho bug mới). Kiểm trước khi báo xong:
  `az repos pr work-item list --id <pr> -o json | python3 -c "import sys,json; print([(w['id'],w['fields']['System.State']) for w in json.load(sys.stdin) if w['fields']['System.State']!='In Progress'])"`
  — khác `[]` ⇒ `python3 $S/ado-set-state.py --state "In Progress" <id…>`.
- Dọn: `scripts/localhost.sh stop` **rồi** đưa `appsettings*.json` về HEAD (§3). Dữ liệu test `VERIFY-*` trên DB
  local: báo lại, không tự xoá.

# Template comment

```html
<strong>Root Cause</strong>: mô tả ngắn gọn (file/luật/đo được gì)
<br><strong>Fix</strong>: nhánh <code>fix/ado-…</code> — <code>&lt;commit&gt;</code> · <code>&lt;commit&gt;</code>
<br><strong>Verify</strong>: stack local (DB local, tài khoản <code>admin</code>), Chrome, dd/mm/yyyy.
<br><img src="<url attachment>" />
```
