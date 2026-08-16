# `phase-00-schema` — gộp schema để mở khoá song song

Đòn bẩy thời gian lớn nhất của skill. Bỏ qua nó thì BE buộc phải chạy tuần tự.

## Vấn đề

Mọi `dotnet ef migrations add` cùng ghi **một** file `ModelSnapshot`. Hai UC sinh migration song song
⇒ conflict thường trực, và conflict trên ModelSnapshot rất khó merge đúng.

Phản xạ tự nhiên là: *"vậy chạy BE tuần tự cho an toàn"*. Đó là chỗ mất nhiều giờ nhất — vì thực tế
chỉ một phần nhỏ số phase có sinh migration.

## Cách làm

1. **Sau B3**, quét toàn bộ plan của mọi UC, gom **tất cả** thay đổi schema (cột mới, entity mới,
   index) vào **một** phase `phase-00-schema`.
2. `phase-00-schema` chạy **một mình, trước tiên**. Sinh **một** migration cho cả lượt.
   ⚠️ Chỉ sinh file. Apply lên **local** thì xin quyền một lần đầu lượt rồi tự chạy và báo lại.
3. Freeze. Từ đây **không UC nào được sinh migration nữa** — nếu phát sinh nhu cầu mới, dừng và
   quyết định lại ở cấp lượt, đừng lén thêm.
4. Các UC còn lại chạy **2-3 lane song song**, điều kiện: preflight ownership sạch.

```bash
node .claude/scripts/gates/ownership-overlap.cjs --map <file.json>   # map: <uc> → glob "Related Code Files"
```

## Rà migration vừa sinh — bắt buộc

`ModelSnapshot` có thể đã drift sẵn từ trước (ví dụ: tàn dư type-string của provider cũ). Khi bạn chạm
vào một entity, `migrations add` sẽ **tự gộp** các `AlterColumn` của cột **KHÁC** vào migration của bạn.
Chúng thường là no-op về dữ liệu nhưng vẫn phát `ALTER COLUMN` trên bảng lớn.

```bash
grep -E "AddColumn|DropColumn|AlterColumn|CreateIndex" Migrations/<file>.cs
```

- `DropColumn` trong phương thức `Down()` là **bình thường** (rollback) — đừng nhầm là drift.
- `AlterColumn` ngoài phạm vi ⇒ **gỡ khỏi migration**, giữ `ModelSnapshot` đã regen.

## Chi phí / lợi ích

| | Không gộp | Có gộp |
|---|---|---|
| BE | tuần tự, thời gian = tổng mọi UC | song song 2-3 lane |
| Migration | mỗi UC một cái, ModelSnapshot conflict | **một** cái cho cả lượt |
| Rủi ro | conflict ModelSnapshot lặp lại | phải quét schema kỹ **một lần** ở đầu |

Điểm đánh đổi thật: bạn phải **biết trước** toàn bộ nhu cầu schema tại thời điểm sau B3. Đó chính là
lý do B3 (feasibility) phải chạy **trước** — nó là chỗ liệt kê cột/entity còn thiếu.
