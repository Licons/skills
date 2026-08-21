#!/usr/bin/env node
// B2 — sinh `<ma-uc>/ac-verify.md` cho từng UC, trích NGUYÊN VĂN từ URD kèm `<URD>:line`.
// Không chép tay: mọi ô "Tiêu chí chấp nhận" đến thẳng từ file nguồn, nên cổng check-ac-trace.mjs
// so lại được bằng máy.
//
// ⛔ TÊN THƯ MỤC = NGUYÊN CHUỖI MÃ YÊU CẦU, chỉ hạ chữ thường (SKILL.md §7).
//    `CTC-FR-01-UC06` ⇒ `ctc-fr-01-uc06`. KHÔNG chuẩn hoá lại, không thêm/bớt dấu `-`,
//    không re-pad, không rút gọn khúc `fr-NN`, và TUYỆT ĐỐI không đánh số theo thứ tự
//    UC ở tiêu đề.
//    Lý do: nhiều URD chạy HAI hệ số song song — số ở tiêu đề (`### UC 05`) và mã FR trong
//    bảng (`CTC-FR-01-UC06`). Hai số này lệch nhau. Đặt tên theo số tiêu đề thì thư mục
//    `ctc-uc-05` trỏ vào `…-UC06`, người sau tra ngược ra sai UC và KHÔNG lệnh nào kêu.
//    Mã FR thắng; số tiêu đề chỉ ghi ở cột phụ trong `state.md`.
//
// Dùng:
//   node extract-ac.mjs <duong-dan-URD> <thu-muc-luot> [--module CTC]
//   --module  lọc đúng một phân hệ (mặc định: mọi phân hệ tìm thấy)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , URD, OUT, ...rest] = process.argv;
if (!URD || !OUT) {
  console.error('Dùng: node extract-ac.mjs <URD.md> <thu-muc-luot> [--module XXX]');
  process.exit(2);
}
const onlyModule = (() => {
  const i = rest.indexOf('--module');
  return i >= 0 ? rest[i + 1]?.toUpperCase() : null;
})();

const lines = readFileSync(URD, 'utf8').split('\n');

// ── 1. Bản đồ: mã yêu cầu → thư mục UC, suy từ heading của URD ────────────────
// Heading mẫu: "### 5.2.B.5. CTC · UC 05: Gộp liên hệ trùng"
const ucBlocks = []; // {module, no, startLine}
lines.forEach((raw, i) => {
  const m = raw.match(/^#{2,4}\s+[\d.A-Za-z]*\s*([A-Z0-9]{2,6})\s*[·:]\s*UC\s*(\d+)\s*:/);
  if (m) ucBlocks.push({ module: m[1], no: Number(m[2]), startLine: i });
});
if (!ucBlocks.length) {
  console.error('LỖI: không tìm thấy heading UC nào. Kiểm mẫu heading hoặc đường dẫn URD.');
  process.exit(1);
}
ucBlocks.forEach((b, i) => { b.endLine = i + 1 < ucBlocks.length ? ucBlocks[i + 1].startLine : lines.length; });

// mã yêu cầu đầu tiên xuất hiện trong khối = mã của UC đó.
// Thư mục = NGUYÊN chuỗi mã đó, chỉ hạ chữ thường — xem khối ⛔ ở đầu file.
const reqToDir = new Map();
const headingNo = new Map(); // mã → số thứ tự ở tiêu đề, CHỈ để in ra đối chiếu
for (const b of ucBlocks) {
  if (onlyModule && b.module !== onlyModule) continue;
  const slice = lines.slice(b.startLine, b.endLine).join('\n');
  const req = slice.match(/\b([A-Z][A-Z0-9]{1,7}(?:-FR-\d{1,2})?-UC-?\d{1,3})\b/)?.[1];
  if (!req) continue;
  if (!reqToDir.has(req)) {
    reqToDir.set(req, req.toLowerCase());
    headingNo.set(req, b.no);
  }
}

// ── 2. Gom AC theo mã yêu cầu ─────────────────────────────────────────────────
const byReq = new Map();
lines.forEach((raw, i) => {
  const m = raw.match(/^\|\s*([A-Z][A-Z0-9]{1,7}(?:-FR-\d{1,2})?-UC-?\d{1,3})-(AC\d+)\s*\|/);
  if (!m) return;
  const [, req, ac] = m;
  if (!reqToDir.has(req)) return;
  const cells = raw.split(/(?<!\\)\|/).map((c) => c.trim());
  if (!byReq.has(req)) byReq.set(req, []);
  byReq.get(req).push({ ac, line: i + 1, kind: cells[2], text: cells[3] });
});

// ── 3. Ghi file ───────────────────────────────────────────────────────────────
let total = 0;
for (const [req, rows] of byReq) {
  const dir = reqToDir.get(req);
  mkdirSync(join(OUT, dir), { recursive: true });
  const head = `# ac-verify — ${req}

> Nguồn: \`${URD}\`. Cột **Tiêu chí chấp nhận** trích NGUYÊN VĂN, có \`URD:line\` để đối chiếu bằng máy
> (\`check-ac-trace.mjs\`). Sửa tay cột đó là làm hỏng cổng B2.
> Cột **Kết quả** chỉ nhận 4 giá trị: \`PASS\` · \`FAIL\` · \`BLOCKED\` · \`NO TEST\`. Không có giá trị thứ năm.
> Ô chứa \`|\` phải escape thành \`\\|\`.

| Mã AC | URD:line | Loại | Tiêu chí chấp nhận (nguyên văn) | Phase | Điều kiện PASS | Test | Kết quả |
|---|---|---|---|---|---|---|---|
`;
  const body = rows
    .map((r) => `| ${req}-${r.ac} | ${r.line} | ${r.kind} | ${r.text.replace(/\|/g, '\\|')} | *chưa gán* | *chưa chốt* | — | NO TEST |`)
    .join('\n');
  writeFileSync(join(OUT, dir, 'ac-verify.md'), head + body + '\n');
  console.log(`${dir}  ← ${req}  (tiêu đề: UC ${headingNo.get(req)})  ${rows.length} AC · URD dòng ${rows[0].line}–${rows[rows.length - 1].line}`);
  total += rows.length;
}

if (total === 0) {
  console.error('LỖI: 0 AC trích được — kiểm mẫu bảng AC hoặc --module');
  process.exit(1);
}
console.log(`tổng: ${total} AC · ${byReq.size} UC`);
