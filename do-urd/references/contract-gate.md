# B4 — Cổng hợp đồng (INV-1, INV-3)

> Thứ một tầng tạo ra mà tầng khác tiêu thụ phải có một assert nối hai đầu.

Chạy sau **mỗi** phase BE, trước khi tuyên bố xong. Đây là chặn quan trọng nhất của skill: nó là chỗ
duy nhất bắt được lớp lỗi *"code đúng · test xanh · build xanh · không client nào gọi tới được"*.

**Vì sao test không thay thế được cổng này**: test BE gọi thẳng AppService
(`GetRequiredService<IXxx>()` hoặc `new`). Chúng **về nguyên tắc không thể** phát hiện việc method đó
không có endpoint, không có verb, hoặc nằm ở bề mặt mà proxy generator bỏ qua. Không có bài test nào
cứu được — phải đối chiếu với api-definition thật.

## Lệnh — một dòng cho cả bốn câu hỏi

```bash
# TIỀN ĐỀ: rebuild + restart service trước — api-definition đọc từ tiến trình ĐANG CHẠY.
node .claude/skills/do-urd/scripts/check-contracts.mjs --check --api http://localhost:<port>
```

⚠️ Cổng **không phân biệt được** "method thiếu route" với "method chưa build". Cả hai ra cùng một
thông báo. Bảo đảm tiền đề là việc của người chạy — nếu không, C1 sẽ báo dương tính giả và niềm tin
vào cổng mất đi, mà cổng mất niềm tin thì thành cổng không ai đọc.

| Check | Bắt gì | Miễn trừ |
|---|---|---|
| **C1** | method AppService mới không có endpoint · endpoint thiếu verb · chỉ nằm ở `integration-api/` | `// contract-exempt: <lý do>` |
| **C2** | property mới trên entity không có trên DTO | `// dto-exempt: <lý do>` |
| **C3** | permission mới không seeder nào cấp | `// grant-exempt: <lý do>` |
| **C4** | hằng số/enum FE chép lại danh sách BE | `// mirror-ok: <lý do>` |

Kỳ vọng **suy ra từ `git diff`**, không từ một file ledger phải duy trì tay — ledger chính là nguồn
sự thật thứ hai, đúng thứ INV-3 cấm.

⚠️ **Không có `--api` thì C1 báo SKIP, không báo PASS.** Check bỏ qua không phải check đạt.
`--strict` biến SKIP thành hỏng.

⚠️ C4 mặc định chỉ xét **file đã đổi**. `--all` quét toàn repo để audit nợ — đừng dùng làm cổng, nó
sẽ đỏ vĩnh viễn vì nợ có sẵn rồi bị bỏ qua.

## Sáu cặp biên

| # | Cặp | Cơ chế hỏng | Cách kiểm |
|---|---|---|---|
| 1 | entity ↔ DTO | AutoMapper convention **im lặng bỏ qua** field không tồn tại ⇒ giá trị nằm lại DB | đọc `<Entity>.Extended.cs` vs `<Entity>Dto.Extended.cs`, so tên field mà AC nhắc |
| 2 | AppService ↔ HTTP route | method `public` nhưng vắng ở interface ⇒ explicit controller **không route** | api-definition (dưới) |
| 3 | route ↔ verb | `[Route]` class-level tắt conventional routing ⇒ `httpMethod: null` | api-definition (dưới) |
| 4 | bề mặt ↔ proxy-gen | `[IntegrationService]` ⇒ chỉ nằm ở `integration-api/*`, **proxy generator bỏ qua** | api-definition (dưới) |
| 5 | registry/enum BE ↔ hằng số FE | bản mirror thiếu giá trị ⇒ dữ liệu rơi ra ngoài mọi nhánh FE | grep (dưới) |
| 6 | permission khai ↔ permission cấp | quyền mới không ai grant ⇒ 403 khi mở đúng màn hình | grep seeder (dưới) |

## Kiểm 2-3-4: api-definition

```bash
# POSIX (cần python3)
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

```powershell
# PowerShell — không cần python3
(irm "http://localhost:<port>/api/abp/api-definition").modules.PSObject.Properties |
  % { $_.Value.controllers.PSObject.Properties } |
  % { $_.Value.actions.PSObject.Properties } |
  % { $_.Value } | ? { $_.url -like "*<tài-nguyên>*" } |
  ft httpMethod, url
```

Ba điều phải đúng — thiếu một là **chưa xong**:

1. **Có mặt** — mọi method vừa viết xuất hiện.
2. **`httpMethod` khác `None`/`null`** — có verb thật. Không có verb thì client proxy dynamic (C#) lẫn
   proxy Angular đều dựng request rỗng.
3. **URL bắt đầu `api/`, KHÔNG phải `integration-api/`** — nếu FE cần gọi.

> `[IntegrationService]` **không phải cơ chế bảo mật** (`.claude/rules/api-security.md` §1) và nó
> **loại** endpoint khỏi proxy Angular. Dùng nó cho một tính năng người dùng là tự chặn chính mình.

Muốn xem toàn bộ action thiếu verb trong một module:
```bash
curl -s ".../api/abp/api-definition" | python3 -c "
import json,sys
d=json.load(sys.stdin)
bad=[(cn.split('.')[-1],a['url']) for cn,c in d['modules']['<module>']['controllers'].items()
     for a in c['actions'].values() if not a.get('httpMethod')]
print('thiếu verb:', len(bad)); [print(' ',b) for b in bad]
"
```

## Kiểm 5: hằng số mirror

**Luật (INV-3)**: danh sách nào BE dùng để **validate hoặc chặn** thì FE **không được chép lại**.

Hai đường hợp lệ:
- **(a)** BE expose qua endpoint lookup, FE đọc — *cách đúng*;
- **(b)** sinh tự động vào proxy.

FE chỉ sở hữu **nhãn hiển thị**. Nhãn thiếu ⇒ hiện **chính khoá**, để sai còn nhìn thấy được.

```bash
# Cờ đỏ: hằng số FE tự khai là bản sao của một danh sách BE
grep -rniE "mirror|PHẢI khớp|phải khớp .* BE|đồng bộ tay với BE" apps/angular/projects --include=*.ts \
  | grep -v "/proxy/"
```
Có kết quả ⇒ hoặc chuyển sang (a)/(b), hoặc ghi vào `gaps.md` là nợ có chủ ý kèm lý do.

Khi làm (a), test BE phải khoá **bất biến**, không khoá danh sách:
```
endpoint trả ĐÚNG tập khoá mà cổng validate chấp nhận  (không hơn, không kém)
+ assert danh sách KHÔNG rỗng   ← thiếu vế này thì registry bị dọn sạch vẫn "bằng nhau" và test xanh vô nghĩa
+ mọi khoá endpoint chào ra đều đi qua được cổng validate  (vòng khép kín)
```

## Kiểm 6: permission mới phải có trong seeder

```bash
# mọi hằng số permission mới trong diff
git diff --unified=0 <base>..HEAD -- '**/Permissions/*.cs' | grep -oE 'public const string \w+' 
# đối chiếu: có xuất hiện trong một seeder grant không
grep -rn "IPermissionDataSeeder" --include=*.cs services/ | head
```

**Grant là code, không phải checklist ops.** Một dòng trong seeder bền hơn một dòng trong biên bản
bàn giao. Endpoint grant phải **idempotent** và **được gate** (đăng nhập + admin) — một endpoint cấp
quyền mà gọi ẩn danh được là chuyện khác hẳn mấy endpoint seed demo data.

## Kiểm 1 + cặp UC↔UC

- **entity ↔ DTO**: với mỗi property mà AC nhắc tên, grep cả hai phía. AutoMapper không báo gì.
- **UC ↔ UC**: khi ≥2 UC nói về "cùng một danh sách", đối chiếu **entity gốc** mỗi bên dùng — thường
  nằm ngay trong hai file plan, đọc cạnh nhau là thấy. Kiểm ở **B3**, rẻ hơn nhiều so với phát hiện ở FE.

## Khi proxy thiếu endpoint mới — hai đường, không có đường thứ ba

1. **Session vá tay đúng phần đó** trong `proxy/`, theo đúng api-definition thật — không bịa type.
   **Agent KHÔNG được đụng `proxy/`.**
2. **Service API cục bộ** trong thư mục feature, đúng khuôn proxy (`RestService` + `apiName`), kèm
   comment nêu nợ. Dùng khi endpoint nằm ngoài module đang generate.

Cấm: agent tự sửa `proxy/`; tự chế `HttpClient` trần.

## Regen proxy — soi diff, không nhận mù

1. Đo baseline `ng build` **TRƯỚC**.
2. Chạy refresh.
3. Giữ phần thuộc phạm vi (file/thư mục mới + merge tay phần bổ sung), **revert churn**.
4. Diff phải giải thích được **từng file**.

Nếu proxy trong repo đã lệch backend (có type BE không có, có service BE đã xoá) thì full-refresh sẽ
làm đỏ FE. Ghi vào `gaps.md` và xử theo phạm vi, đừng nhận cả cục.
