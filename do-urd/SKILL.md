---
name: do-urd
description: "Use when shipping Use Cases from a URD markdown file end-to-end in Utop.VietBank.CRM: baseline gate → brainstorm → plan → feasibility → cook (BE, then proxy, then FE) → acceptance. Every AC belongs to exactly one phase, has its own test, and passes a gate that can fail. Triggers: do-urd, chạy URD, làm UC theo URD, ship URD."
category: workflow
keywords: [urd, use-case, acceptance-criteria, contract, gate, vietbank, plan, cook, verify]
argument-hint: "--urd <path.md> [--des <description>] [--qc]"
metadata:
  author: utop
  version: "2.0.0"
---

# do-urd — URD → code đã nghiệm thu

## Nguyên tắc thiết kế

> **Mỗi cổng phải fail được. Cổng không fail được không phải cổng.**

Toàn bộ skill này suy ra từ một câu đó. Mọi bất biến ở §1 tồn tại vì có một cách để một tuyên bố
("đã xong", "đã PASS", "đã verify") trở thành sai mà **không gì phát tín hiệu**. Mỗi chặn ở §2 là
nơi biến im lặng thành tiếng động.

Khi phân vân giữa hai cách làm, chọn cách **hỏng thì ồn hơn** — kể cả khi nó chậm hơn.

---

## 1. Sáu bất biến

Mỗi bất biến có **lệnh kiểm**. Bất biến không kiểm được bằng lệnh thì không phải bất biến, chỉ là
lời khuyên — và lời khuyên sẽ bị bỏ qua dưới áp lực.

### INV-1 · Đóng hợp đồng qua biên
**Thứ một tầng tạo ra mà tầng khác tiêu thụ phải có một assert nối hai đầu.**

Biên trong repo này: `entity ↔ DTO` · `AppService ↔ HTTP route` · `BE ↔ proxy Angular` ·
`registry/enum BE ↔ hằng số FE` · `permission khai báo ↔ permission được cấp` · `UC ↔ UC`.

Kiểm: **B3** (trước khi viết) + **B4** (sau mỗi phase BE). Hỏng thì triệu chứng là *"code đúng, test xanh, màn hình trống / 403 / 400"*.

### INV-2 · Cổng phải chứng minh được nó fail được
**Test xanh không phải bằng chứng. Bằng chứng là: cố tình phá đúng dòng logic đó ⇒ đúng test đó đỏ.**

Hệ quả bắt buộc:
- Mỗi phase: **mutation check**, dán số vào report.
- Mọi lệnh test: dán **`Executed N of M`**, không chấp nhận chỉ dán `SUCCESS`. `N=0` mà exit 0 là xanh giả.
- Nghiệm thu bằng **cả suite**, không bằng `--include` hẹp.
- Test về **quyền** phải chạy trên host authorization thật (xem `references/verification-ladder.md`).

Kiểm: **B6** (mỗi phase) + **B7** (trước khi tuyên bố PASS). Hỏng thì triệu chứng là *"suite xanh nhưng gỡ hết `[Authorize]` vẫn xanh"*.

### INV-3 · Một dữ kiện, một nguồn
**Không dữ kiện nào tồn tại ở hai nơi mà không có script so sánh hai nơi đó.**

Áp cho: whitelist/enum BE↔FE · quyết định (`decisions.md`) ↔ điều kiện PASS (`ac-verify.md`) ·
tài liệu convention chồng nhau.

Danh sách nào BE dùng để **validate hoặc chặn** thì FE **không được chép**. Hai đường hợp lệ:
(a) BE expose qua endpoint lookup, FE đọc; (b) sinh tự động vào proxy.
FE chỉ sở hữu **nhãn hiển thị** — và nhãn thiếu thì hiện chính khoá, để sai còn nhìn thấy được.

Kiểm: **B4** (mirror) + **B2** (quyết định→AC). Hỏng thì triệu chứng là *"hai bên cùng đúng theo bản của mình"*.

### INV-4 · State ghi ra file, ghi ở nơi người tiêu thụ đọc
Ghi đúng nhưng **sai chỗ** cũng là mất. Quyết định ghi ở `decisions.md` mà không đẩy vào
`ac-verify.md` thì agent thi công và agent nghiệm thu đều đọc ghi chú cũ — và **cả hai đều đọc đúng
thứ session để lại**.

Quy tắc: mỗi mục `decisions.md` phải nêu **AC nào nó đổi**, và commit ghi quyết định **phải** đồng
thời thay cột `Điều kiện PASS` của các AC đó. Ghi chú cũ bị **thay**, không để lại bên cạnh.

Kiểm: **B2**.

### INV-5 · Ghi song song chỉ khi sở hữu rời nhau; mọi merge phải build lại
`git diff --name-only --diff-filter=U` rỗng **không** chứng minh merge đúng — semantic conflict không
tạo marker. Và `git diff` **mù với file untracked**, nên không dùng nó để kết luận "không ai đang làm".

Kiểm: **B5** + luật vai ở §4.

### INV-6 · Môi trường được đo, không được giả định
Baseline (build/test/lint) đo **trước** khi bắt đầu. Kết luận về dữ liệu phải đến từ query, không từ suy đoán.
Dữ liệu snapshot là **bằng chứng về sự CÓ MẶT, không bao giờ về sự VẮNG MẶT** (thấy giá trị X ⇒ X tồn tại;
không thấy Y ⇒ **không kết luận được gì**).

Kiểm: **B1**.

---

## 2. Bảy chặn

Chặn = một câu hỏi nhị phân, có lệnh trả lời. **Không đạt ⇒ dừng, không đi tiếp.**

| # | Tên | Khi nào | Câu hỏi nhị phân | Bất biến |
|---|---|---|---|---|
| **B0** | Guard | trước mọi thứ | Flag + repo + nhánh hợp lệ? | — |
| **B1** | Baseline | trước Stage 1 | Build xanh? Suite boot được? Số bao nhiêu? | INV-6 |
| **B2** | AC freeze | cuối Stage 2 | Mọi AC trace được về `path:line`? Mọi quyết định đã vào `ac-verify.md`? | INV-3, INV-4 |
| **B3** | Feasibility | Stage 2.5 | Mọi dữ kiện AC dựa vào **có thật** trong repo/DB? | INV-1, INV-6 |
| **B4** | Contract | sau **mỗi** phase BE | Hợp đồng qua biên có đóng không? | INV-1, INV-3 |
| **B5** | Integration | sau merge / sau regen proxy | Build + suite còn xanh? Diff giải thích được từng file? | INV-5 |
| **B6** | Falsifiability | cuối **mỗi** phase | Mutation check đã chạy? Số test `Executed` là bao nhiêu? | INV-2 |
| **B7** | Acceptance | trước khi tuyên bố PASS | Đã probe trình duyệt thật? | INV-2 |

### B1 · Baseline
```bash
dotnet build -c Release && dotnet test        # trong <svc> và <svc>.Tests
npx ng build <app> --configuration development
```
Ghi con số vào `state.md § Baseline`. **Mọi prompt subagent phải mang con số này.**
Đỏ sẵn ⇒ ghi là **nợ có sẵn**, không nhận là do mình.

### B2 · AC freeze
- Mọi dòng AC chép **nguyên văn** vào `ac-verify.md`, có `<URD>:line`.
- Đối chiếu bằng máy (`sed -n '<line>p'` + normalize + so substring), không đối chiếu bằng mắt.
- **Mọi quyết định đã chốt phải nằm trong cột `Điều kiện PASS`** — không nằm riêng ở `decisions.md`.
- Không AC mồ côi: mỗi AC thuộc **đúng một** phase.

### B3 · Feasibility
Với **mỗi** AC, kiểm dữ kiện nó dựa vào có thật không — chi tiết bảng 9 mục ở
`references/feasibility-checks.md`. Hai mục rẻ nhất mà bắt lỗi đắt nhất:
- **nhiều UC nói về "cùng một danh sách" có cùng ENTITY GỐC không** (đọc cạnh nhau các plan);
- **file FE mà plan nêu tên có route nào trỏ tới không** (component chết ⇒ làm xong không giao được gì).

### B4 · Contract — chặn quan trọng nhất
Sau **mỗi** phase BE, trước khi tuyên bố xong.
⚠️ **Tiền đề: rebuild + restart service trước.** `api-definition` đọc từ tiến trình đang chạy, nên
method chưa build sẽ báo "không có endpoint" y hệt method thiếu route thật. Bốn câu hỏi, thiếu một là chưa xong:

1. **Có mặt** — mọi method vừa viết xuất hiện trong api-definition?
2. **Có verb** — `httpMethod` khác `null`?
3. **Đúng bề mặt** — URL bắt đầu `api/`, **không** `integration-api/`? (`[IntegrationService]` bị proxy-gen **bỏ qua**.)
4. **Đóng vòng** — property AC nhắc tới có trên DTO? permission mới có trong seeder grant? có hằng số FE nào mirror danh sách BE không?

```bash
# Một lệnh cho cả 4 câu hỏi:
node .claude/skills/do-urd/scripts/check-contracts.mjs --check --api http://localhost:<port>
#   --base <ref>   ref so sánh (mặc định: merge-base với origin/develop)
#   --only c1,c4   chạy chọn lọc      --strict  check bỏ qua cũng tính là hỏng
#   --all          C4 quét toàn repo (audit nợ, KHÔNG dùng làm cổng)
#
# Miễn trừ phải TƯỜNG MINH, ghi ngay trên dòng bị bắt — im lặng bỏ qua là đúng thứ cổng này chống:
#   // contract-exempt:   // dto-exempt:   // grant-exempt:   // mirror-ok:
```

Kiểm tay khi cần soi một tài nguyên cụ thể:
```bash
curl -s "http://localhost:<port>/api/abp/api-definition" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for mn,m in d['modules'].items():
    for cn,c in m['controllers'].items():
        for an,a in c['actions'].items():
            if '<tài-nguyên>' in a['url']:
                print(mn,'|',cn.split('.')[-1],'|',repr(a['httpMethod']),a['url'])
"
```
Bản PowerShell + chi tiết 6 cặp biên: `references/contract-gate.md`.

### B5 · Integration
```bash
git merge <branch> --no-edit
git diff --name-only --diff-filter=U     # rỗng ≠ xong
dotnet build -c Release                   # BẮT BUỘC
dotnet test                               # nếu nhánh sắp giao cho agent
```
Sau regen proxy: **đo baseline `ng build` TRƯỚC**, rồi soi diff, giữ phần thuộc phạm vi, revert churn.
Diff phải giải thích được **từng file**.

### B6 · Falsifiability
Mỗi phase, trước khi commit: phá có chủ ý 2-3 dòng logic mà test nhắm tới ⇒ xác nhận **đúng số test dự
kiến** chuyển đỏ ⇒ revert. Dán số vào report. Không có bước này thì "test xanh" là ý kiến, không phải bằng chứng.

### B7 · Acceptance
`dotnet test` / `ng build` / `ng test` **đều mù** với lớp lỗi hợp đồng qua biên (INV-1).
Probe trình duyệt là bậc **duy nhất** thấy được. Vì vậy nó **bắt buộc**, không tuỳ chọn.

Thang verify + điểm mù của từng bậc: `references/verification-ladder.md`.

---

## 3. Trình tự

```
B0 → Stage 1 (scope + clarify)
   → B1 → Stage 2 (plan) → B2
   → Stage 2.5 (feasibility) → B3
   → Stage 3a: BE toàn bộ        [mỗi phase: B4 + B6]
   → Stage 3b: proxy regen        [B5]
   → Stage 3c: FE toàn bộ         [mỗi phase: B6]
   → Stage 4 (nghiệm thu)         [B7]
   → Stage 5 (dọn dẹp)
```

**Vì sao BE → proxy → FE cắt ngang mọi UC**: proxy Angular sinh từ api-definition của service **đang
chạy**. Ranh giới đó là kỹ thuật, không phải sở thích. Chạy Giai đoạn 3b **ngay sau** 3a, cùng phiên.

**Song song hoá**: gộp **toàn bộ** thay đổi schema vào một `phase-00-schema` chạy trước (§`references/
migration-first.md`). Sau đó các UC còn lại chạy **2-3 lane song song**, điều kiện là preflight ownership
sạch (`node .claude/scripts/gates/ownership-overlap.cjs`). Không gộp migration ⇒ buộc tuần tự vì mọi
`migrations add` cùng ghi `ModelSnapshot`.

**Worktree**: quyết định **sau B3**, không phải từ đầu. Tuần tự ⇒ nhánh tại chỗ, không worktree.
Song song thật ⇒ worktree hoặc pool slot.

### Stage 4 — nghiệm thu là pha KHÁM PHÁ, không phải pha điền bảng
Cột `Kết quả` chỉ nhận **4 giá trị**, không có giá trị thứ năm:

| | Khi nào | Kèm bắt buộc |
|---|---|---|
| `PASS` | test tồn tại, xanh, **và kiểm đúng điều kiện ở cột trước** | tên test thật + số liệu |
| `FAIL` | test tồn tại nhưng đỏ | thông báo lỗi thật |
| `BLOCKED` | không kiểm được | lý do + gap nào + **đề xuất cách đóng** |
| `NO TEST` | không test nào phủ | phần nào của AC chưa được khoá |

⛔ Cấm `PASS` vì "code trông có vẻ đúng".
⛔ Cấm `PASS` khi test có chạy nhưng **không kiểm đúng** điều kiện ⇒ ghi `NO TEST` kèm giải thích.

Còn bất kỳ AC nào chưa PASS ⇒ ghi `BLOCKED`, **không ghi "xong"**.

---

## 4. Vai và quyền ghi

| Vai | Được ghi | Cấm |
|---|---|---|
| **session** | điều phối · `proxy/**` · BE dùng chung · merge · quyết định | tự viết phase thay agent |
| **cook agent** | đúng vùng file được giao | `proxy/**` · `services/**` nếu brief không giao · `git add -A` |
| **verify agent** | `ac-verify.md` + report của UC mình | thư mục UC khác · `proxy/**` |

**Luật cứng cho mọi agent:**
> **Brief nói X, repo nói không-X ⇒ REPO THẮNG.** Dừng, ghi vào report, **không ép code theo brief.**

Ba luật vòng đời (vi phạm là hỏng dữ liệu):
1. `TaskStop` trước khi spawn agent thay thế — `SendMessage` **hồi sinh** agent đã dừng.
2. `ListAgents` rỗng **không** chứng minh agent đã chết.
3. Kiểm bằng `git status`, **không** `git log` (chỉ thấy commit) và **không** `git diff` (**mù với untracked**).

**Session giữ nhịp**: chỉ dừng báo user khi (a) cần **quyết định** của họ, (b) một **giai đoạn đóng**,
(c) có phát hiện **làm đổi kế hoạch**. Ngoài ba trường hợp đó ⇒ chạy tiếp.

**Gộp fix rồi restart một lần.** Không restart service khi còn agent đang ghi vào chính service đó.

---

## 5. Môi trường

**Kiểm host trước khi gõ lệnh** — repo có hai bộ script song song:

| Dùng khi | Linux/macOS | Windows (PowerShell) |
|---|---|---|
| trỏ `appsettings` về localhost (**trước tiên**) | `scripts/db/use-local-db.sh` | `scripts\db\use-local-db.ps1` |
| infra | `scripts/localhost.sh infra` | `etc\docker\up.ps1` |
| một service | `scripts/localhost.sh service <tên>` | `start-debug.ps1 <tên>` |
| nhiều service | `scripts/localhost.sh backend` | `start-be.ps1` |
| dừng service | `scripts/localhost.sh stop-service <tên>` | `stop-service.ps1 <tên\|port>` |
| dữ liệu giống QA | `scripts/db/dump-qa-to-local.sh` | `scripts\db\dump-qa-to-local.ps1` |

Giống nhau mọi host: `dotnet build|test` · `npx ng build|test` ·
`docker exec mssql /opt/mssql-tools18/bin/sqlcmd …` (đọc DB local, read-only).

**Dữ liệu để verify: LOCAL, không bao giờ QA/prod.** `dotnet ef database update` lên local: xin quyền
**một lần đầu lượt**, sau đó tự chạy và báo lại. QA/prod thì **không bao giờ** (`.claude/rules/database.md`).

**Grant-before-enforce**: permission mới phải vào **seeder** (code), không phải checklist ops.
Một dòng trong seeder bền hơn một dòng trong biên bản bàn giao.

---

## 6. Guard (B0)

| Mã | Điều kiện | Xử lý |
|---|---|---|
| E01 | thiếu `--urd` | abort |
| E02 | `--urd` không đuôi `.md` | abort |
| E03 | file không đọc được | abort |
| E04 | không tìm thấy mã UC (thử **3 mẫu**: `XXX-UC-NN`, `XXX-FR-NN-UC-NN`, `UC NN`) | **cảnh báo rồi hỏi user**, KHÔNG abort |
| E05 | không phải repo đích | abort |
| E06 | detached HEAD | abort |
| E07 | worktree đã tồn tại | abort |

---

## 7. Bố cục thư mục plan — một kiểu duy nhất

```
1 UC :  plans/{stamp}-{slug}/                 ← file nằm THẲNG ở đây
n UC :  plans/{stamp}-{slug}/                 ← state.md · decisions.md · gaps.md · retro.md · common-source.md
        plans/{stamp}-{slug}/<uc>/            ← plan.md · uc-source.md · ac-source.md · ac-verify.md
                                                 gaps-plan.md · phase-*.md · verify-*.md
```

**KHÔNG có tầng `reports/`.** Thêm một tầng chỉ để phân loại "plan vs report" là mời gọi chính lỗi
đã xảy ra: cùng một `plan.md` nằm ở hai chỗ khác nhau tuỳ UC.

Quy tắc chống trùng:
- Thứ gì **chung cho cả lượt** (AC dùng chung, quyết định, gap, state) nằm ở **gốc lượt**, một bản.
  Chép sang từng UC là tạo n nguồn sự thật (INV-3).
- `retro.md`: **một** file cho cả lượt. Tách "retro thời gian" và "retro quy trình" thành hai file
  sẽ trùng nhau ở phần kết luận.

`ac-source.md` có cột **`Kết quả`** đồng bộ từ `ac-verify.md` — để đọc một file là thấy ngay **độ phủ**:
AC nào chưa có dòng tương ứng bên `ac-verify.md` sẽ hiện `⚠ không có trong ac-verify`.

## 8. Token & context

- Đọc URD **một lần**, cắt đúng đoạn UC vào `uc-source.md`. Stage sau đọc `uc-source.md`.
- Không `Read` file >500 dòng nguyên bản — `grep -n` / `sed -n` lấy đúng khoảng.
- Truyền **path tuyệt đối** cho subagent, không dán nội dung file.
- Mọi state ghi ra file **ngay khi có** (INV-4).

---

## 9. References

| File | Nội dung |
|---|---|
| `references/contract-gate.md` | B4 chi tiết: 6 cặp biên, lệnh kiểm POSIX + PowerShell, cách vá khi proxy thiếu |
| `references/verification-ladder.md` | Thang verify + **điểm mù từng bậc**, lệnh test theo project, bẫy xanh giả |
| `references/feasibility-checks.md` | B3: bảng 9 mục kiểm dữ kiện AC |
| `references/migration-first.md` | Gộp schema vào `phase-00-schema` để mở khoá song song |
| `references/cook-agent.md` | Hợp đồng prompt cho cook agent |
| `references/templates.md` | Khuôn `ac-verify.md`, `feasibility.md`, `ba-questions.md`, `state.md` |
| `references/failure-log.md` | **Bằng chứng lịch sử** — vì sao mỗi bất biến tồn tại. Đọc khi cần thuyết phục, không đọc khi đang thi công |

Rule repo (path-scoped, tự nạp): `.claude/rules/` — `database.md` · `api-security.md` ·
`permissions.md` · `angular.md` · `dotnet-services.md` · `large-data-performance.md` · `ci-trigger-paths.md`.
