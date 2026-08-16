# do-urd — Prompt contract subagent Stage 3

1 subagent = 1 phase = 1 AC nghiệm thu. `subagent_type: general-purpose`, `model: sonnet`,
cwd = worktree của UC.

## Prompt bắt buộc chứa

| Mục | Giá trị |
|---|---|
| cwd | `<REPO_ROOT>/.claude/worktrees/urd-<uc>` (hoặc `<REPO_ROOT>` nếu chạy 1 UC) |
| `UC_DIR` | path **tuyệt đối** tới `plans/<stamp>-<slug>/<uc>` trong worktree đó |
| `PLAN_DIR` | path **tuyệt đối** main tree — subagent chỉ **đọc** `decisions.md`, không ghi |
| `DOCS_ROOT` | path **tuyệt đối** repo `*.Documents` (subagent KHÔNG tự resolve `../`) |
| File phải đọc | `$UC_DIR/plan.md` · `$UC_DIR/phase-NN-*.md` · `$UC_DIR/reports/ac-verify.md` (dòng AC của phase này) · `$UC_DIR/reports/uc-source.md` |
| AC của phase | mã AC + mô tả + `Điều kiện PASS` copy nguyên văn từ `ac-verify.md` |
| Env | OS linux, shell fish, .NET 10 / ABP 10.6, Angular 21.2, repo `Utop.VietBank.CRM` |

Truyền **path**, không dán nội dung file — subagent tự đọc, tiết kiệm token của cả hai phía.

## Luật giao cho subagent (copy vào prompt)

1. **Không suy đoán, không bịa, không giả định.** Thiếu dữ kiện ⇒ **dừng**, trả về lý do +
   `path:line`. KHÔNG hỏi user (Stage 3 không còn kênh hỏi), KHÔNG tự chọn thay.
2. Làm **đúng 1 phase**. Không đụng file ngoài mục "Related Code Files" của phase. Không refactor
   code kề bên, không sửa AC, không sửa plan.
3. Viết **unit test đúng theo dòng AC** trong `ac-verify.md`: tên test + test case phải khớp cột
   `Unit test + test case`. Test không map được về AC nào ⇒ không viết.
4. Test phải **fail được khi business logic sai** (Rule 9). Assert giá trị nghiệp vụ, không assert
   "không throw".
5. **KHÔNG mutate DB**: `dotnet ef migrations add <Name>` chỉ sinh file; tuyệt đối không
   `database update` / `psql` ghi (`.claude/rules/database.md`).
6. Commit trong worktree khi build + test của phase pass: `implement(<uc>): phase-NN <title>`.
   Stage **explicit path**, KHÔNG `git add -A`.
7. Trả về (ngắn gọn): phase · file đã sửa (`path:line`) · test đã thêm · lệnh verify đã chạy + kết
   quả · commit sha · gap còn lại. Không kể lể quá trình.

## Lệnh verify

```bash
# BE — chạy trong services/<name>/FPTCXSuite.<Name>Service(.Tests)
dotnet build -c Release
dotnet test                       # CẢ SUITE, không chỉ --filter

# FE — chạy trong apps/angular
npx ng build <app> --configuration development                          # BẮT BUỘC khi sửa SCSS
npx ng test <target> --watch=false --browsers=ChromeHeadlessNoSandbox   # CẢ SUITE
```

**Ba luật không thương lượng (INV-2 — chi tiết: `verification-ladder.md`):**

1. **Dán `Executed N of M`**, không chỉ dán `SUCCESS`. `N=0` mà exit 0 là **xanh giả**.
2. **Nghiệm thu bằng cả suite**, không bằng `--include` hẹp — kết quả có thể phụ thuộc thứ tự spec nạp.
3. **Mutation check**: phá có chủ ý 2-3 dòng logic mà test nhắm tới ⇒ xác nhận **đúng số** test dự kiến
   chuyển đỏ ⇒ revert ⇒ dán số. Test không chứng minh được nó fail được thì không phải bằng chứng.

- `<target>` phải là project **sở hữu spec** đó: `tsconfig.spec.json` của mỗi project chỉ include spec
  trong chính nó ⇒ sai target là chạy 0 test mà vẫn xanh.
- Sửa SCSS mà chỉ chạy test là **không đủ**: `ng serve` giữ bản build tốt cuối cùng nên app vẫn chạy
  và test vẫn xanh dù build đã vỡ (`.claude/rules/srs-design-to-code.md` §5).
- Đụng `services/**/*.Contracts` ⇒ sau khi commit csproj, chạy trong worktree:
  `node scripts/compute-trigger-paths.js --check`. Thiếu path ⇒ sửa `paths.include` của **mọi
  consumer transitive** (`.claude/rules/ci-trigger-paths.md`). Sai ⇒ pipeline im lặng không chạy.

## Xử lý kết quả (session làm, không phải subagent)

| Tình huống | Xử lý |
|---|---|
| Trả về đủ + commit sha | Cập nhật `state.md`, chạy phase kế |
| Chết / trả rỗng | Retry **1 lần** với đúng prompt cũ |
| Retry vẫn fail | `gaps.md` nhóm `dev`, dừng UC đó, UC khác chạy tiếp |
| Trả "thiếu dữ kiện" | `gaps.md` nhóm `plan`, dừng UC đó. KHÔNG tự điền rồi chạy tiếp |
| Báo pass nhưng không có commit sha | Coi như fail — kiểm `git log` trong worktree trước khi tin |

## Verify tiền đề của brief TRƯỚC khi thi hành — brief có thể sai

Session viết brief từ trí nhớ và suy luận; nó **sai được**. Đã sai thật nhiều lần. Thi hành mù một tiền
đề sai cho ra code **build xanh, test xanh, kết quả sai**.

**Khi brief nói X, mà repo nói không-X ⇒ REPO THẮNG.** Dừng, báo, không tự sửa brief cũng không thi hành mù.

| Brief từng nói | Repo thật | Nếu thi hành mù |
|---|---|---|
| "job gọi in-process qua DI" | csproj chỉ ref `.Contracts` + `AddHttpClientProxies` ⇒ **gọi qua HTTP** | xoá endpoint ⇒ **gãy nightly job** |
| "`IAuthorizationService` chặn `[Authorize]`" | thật ra là `MethodInvocationAuthorizationService` | cơ chế opt-in **không hoạt động** |
| "gate PII theo `Attribute.IsPii`" | cờ đó **chưa chỗ nào set** | điều kiện không bao giờ đúng ⇒ **code chết** |
| "agent trước đã chết, làm lại từ đầu" | `git status` cho thấy nó **đang ghi file** | 2 agent 1 cây ⇒ **commit lẫn lộn** |

### Bắt buộc verify trước khi bắt đầu
- Brief nói gọi **in-process** hay **qua HTTP** ⇒ kiểm `*.csproj` (`ProjectReference` tới project chính
  hay chỉ `.Contracts`?) + `*Module.cs` (`AddHttpClientProxies`?). **Đừng suy từ `using`** — `using` chỉ
  resolve interface trong Contracts.
- Brief nói "file/cột/cờ X đã có" ⇒ `grep` xác minh. Chú ý property khai **không** có `virtual`.
- Brief nói "không ai đang làm trong cây này" ⇒ **`git status`** (không phải `git log`/`git diff`).
- Brief nói "cơ chế Y hoạt động thế này" ⇒ đọc code của Y, không tin mô tả.

Phát hiện lệch ⇒ **báo trong report**, nêu `path:line` chứng minh, và **nói rõ bạn đã làm theo hướng nào
và vì sao**. Đây là hành vi ĐƯỢC KHUYẾN KHÍCH, không phải cãi lệnh.
