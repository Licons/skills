# B3 — Feasibility (INV-1, INV-6)

Plan viết từ **URD**. Cook chạy trên **codebase**. Chặn này kiểm **hai thứ đó có khớp nhau không** —
trước khi viết dòng code đầu tiên.

Mục đích không phải làm ít câu hỏi đi, mà làm **câu hỏi đúng lúc**: hỏi ở đây rẻ hơn nhiều so với
hỏi sau khi đã code vài nghìn dòng trên một giả định sai.

## Bảng kiểm — với MỖI AC

| # | Kiểm | Cách kiểm | Loại lỗi nó chặn |
|---|---|---|---|
| 1 | Entity/cột mà AC nhắc **tồn tại chưa** | `grep` entity + `.Extended.cs` (chú ý property khai **không** `virtual`) | AC dựa vào field không có |
| 2 | **Giá trị chuỗi/enum** AC dựa vào có trong DB thật | `SELECT DISTINCT` trên **DB local** | AC dựa vào tập giá trị không tồn tại |
| 3 | Proxy FE **đã có** DTO/method của BE chưa | so `*.Contracts/**/Dtos` với `apps/angular/projects/*/proxy/**/models.ts` | phase FE bị chặn giữa chừng |
| 4 | Model ↔ ModelSnapshot **có drift sẵn** không | `dotnet ef migrations has-pending-model-changes` | `AlterColumn` lạ chui vào migration đầu tiên |
| 5 | Guard/permission mà AC dựa vào **có ai gọi** không | `grep` tên guard, loại trừ file test | quyền khai báo mà không AppService nào đọc |
| 6 | Endpoint AC đụng có `[Authorize]` thật không, có `[AllowAnonymous]` không | `grep` + `.claude/rules/api-security.md` | IDOR, endpoint không authn |
| 7 | Entity hiện có **khớp hình dạng** AC đòi không | đọc entity, so với AC | không kiểm được điều kiện AC yêu cầu |
| 8 | **Nhiều UC nói về "cùng một danh sách" có cùng ENTITY GỐC không** | đọc **cạnh nhau** các plan, so entity/repository mỗi bên dùng | hai UC không ghép được ở FE, phải viết lại BE |
| 9 | File FE mà plan nêu tên **có route nào trỏ tới không** | `grep -rn "<Component>" --include=*routing*.ts --include=*route.provider.ts` | làm xong một màn hình **không ai mở được**, AC vẫn được đánh PASS |

**#8 và #9 rẻ nhất trong bảng** (10 phút và 5 phút) nhưng chặn loại lỗi đắt nhất: thứ **chỉ lộ ra ở
giai đoạn sau**, khi code "đã xong" và phải viết lại.

## Luật bất đối xứng về dữ liệu (INV-6)

Dữ liệu snapshot (QA dump, seed cũ) là bằng chứng về **sự CÓ MẶT**, không bao giờ về **sự VẮNG MẶT**.

| Quan sát | Kết luận được | Không kết luận được |
|---|---|---|
| thấy giá trị `X` | `X` tồn tại thật ⇒ dùng được để thiết kế | — |
| **không** thấy `Y` | — | **không** kết luận `Y` không tồn tại |
| toàn bộ một cột cùng một giá trị | có thể là seeding, có thể là thật | phải kiểm thêm trước khi coi là nghiệp vụ |

Ngoài **tập giá trị**, **độ mới** của snapshot cũng không tin được: một công thức phụ thuộc "trong 30
ngày gần đây" sẽ ra kết quả vô nghĩa trên snapshot cũ vài tháng. Kiểm `MAX(<cột thời gian>)` trước khi
kết luận công thức sai.

⇒ Hệ quả cho nghiệm thu: AC nào phụ thuộc dữ liệu tương tác gần đây **không nghiệm thu bằng mắt được**
trên môi trường snapshot. Unit test vẫn nghiệm thu được vì chúng tự seed.

## Đọc DB local

```bash
docker exec mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U <user> -P '<pass>' -d '<db>' -C -h -1 -W -Q "SET NOCOUNT ON; SELECT ..."
```
Chỉ `SELECT`. Mọi lệnh đổi dữ liệu/schema trên QA/prod là **cấm tuyệt đối** (`.claude/rules/database.md`).
Schema có thể không phải `dbo` — kiểm `sys.tables` trước nếu tên bảng không resolve.

## Đầu ra: `$PLAN_DIR/reports/feasibility.md`

Nhóm kết quả làm ba:

| Nhóm | Nghĩa | Xử lý |
|---|---|---|
| **A** | dữ kiện có thật, làm được ngay | đi tiếp |
| **B** | thiếu, nhưng **tự dựng được** trong phạm vi | thêm vào phase, ghi rõ |
| **C** | thiếu, **cần người ngoài** quyết (BA/Vietbank/DBA) | `gaps.md` + hỏi **ở đây**, không hỏi giữa lúc cook |

Nhóm C là lý do chặn này tồn tại. Gom hết câu hỏi vào **một** lượt hỏi, kèm: trích nguyên văn URD →
vấn đề → cách làm tạm nếu không có câu trả lời → câu hỏi đánh số.
