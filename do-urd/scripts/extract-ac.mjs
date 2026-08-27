#!/usr/bin/env node
// B2 — sinh `<ma-uc>/ac-verify.md` cho từng UC, trích NGUYÊN VĂN từ URD kèm `<URD>:line`.
// Không chép tay: mọi ô "Tiêu chí chấp nhận" đến thẳng từ file nguồn, nên cổng check-ac-trace.mjs
// so lại được bằng máy.
//
// ── CHUẨN MÃ AC (chốt 27/08 — đồng bộ với import-urd-ac.mjs + check-ac-trace.mjs) ─────────────
//   MÃ TRONG URD LÀ CHÂN LÝ: URD có mã AC đầy đủ ⇒ giữ NGUYÊN VĂN, không chuẩn hoá gì.
//   CHỈ KHI URD không có mã AC đầy đủ (bảng chỉ ghi `AC-01` rút gọn theo mục UC) mới KIẾN TẠO
//   mã theo chuẩn:
//     Form A: <MODULE>-FR-NN-UCNN-ACNN   (vd `CTC-FR-01-UC06-AC01`)
//     Form B: <MODULE>-UCNN-ACNN         (vd `AP-UC-01` + `AC-01` → `AP-UC01-AC01`)
//   UC/AC trong mã KIẾN TẠO liền số (bỏ dấu gạch trước số của mã URD gốc), không re-pad.
//
// ⛔ TÊN THƯ MỤC = MÃ YÊU CẦU ĐÃ CHUẨN HOÁ, hạ chữ thường (`CTC-FR-01-UC06` ⇒ `ctc-fr-01-uc06`,
//    `AP-UC-01` ⇒ `ap-uc01`). KHÔNG rút gọn khúc `fr-NN`, và TUYỆT ĐỐI không đánh số theo
//    thứ tự UC ở tiêu đề.
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

// Chuẩn hoá theo CHUẨN MÃ AC ở đầu file.
const normReq = (s) => s.replace(/-UC-(?=\d)/, '-UC');
const normAc = (s) => s.replace(/^AC-(?=\d)/, 'AC');
const REQ_SRC = '[A-Z][A-Z0-9]{1,7}(?:-FR-\\d{1,2})?-UC-?\\d{1,3}';

// ── 1. Bản đồ: mã yêu cầu → thư mục UC, suy từ heading của URD ────────────────
// P1: "### 5.2.B.5. CTC · UC 05: Gộp liên hệ trùng"  (mã đầy đủ nằm trong bảng của mục)
// P2: "#### 5.2.3.1. AP-UC-01 — Màn hình quản lý…"   (mã nằm ngay trên heading, AC rút gọn)
const P1 = /^#{2,4}\s+[\d.A-Za-z]*\s*([A-Z0-9]{2,6})\s*[·:]\s*UC\s*(\d+)\s*:/;
const P2 = new RegExp(`^#{2,5}\\s+[\\d.]*\\s*(${REQ_SRC})\\s*[—–:]`);
const ucBlocks = []; // {module, no, startLine, req?}
lines.forEach((raw, i) => {
  const m1 = raw.match(P1);
  if (m1) { ucBlocks.push({ module: m1[1], no: Number(m1[2]), startLine: i }); return; }
  const m2 = raw.match(P2);
  if (m2) {
    const req = normReq(m2[1]);
    ucBlocks.push({ module: req.split('-', 1)[0], no: Number(req.match(/UC(\d+)/)[1]), startLine: i, req });
  }
});
if (!ucBlocks.length) {
  console.error('LỖI: không tìm thấy heading UC nào. Kiểm mẫu heading hoặc đường dẫn URD.');
  process.exit(1);
}
ucBlocks.forEach((b, i) => {
  b.endLine = i + 1 < ucBlocks.length ? ucBlocks[i + 1].startLine : lines.length;
  // Biên THU HẸP cho hàng AC rút gọn: heading BẤT KỲ kế tiếp (mục UC không có heading con —
  // cùng giả định với import-urd-ac.mjs). Không dùng endLine cho việc này: block cuối của một
  // phân hệ sẽ nuốt bảng AC của phân hệ sau (đã trả giá 26/08: AP-UC-17 nuốt 184 AC của TSK).
  b.shortEnd = b.endLine;
  for (let j = b.startLine + 1; j < b.endLine; j++) {
    if (/^#{2,5}\s/.test(lines[j])) { b.shortEnd = j; break; }
  }
});

// mã yêu cầu đầu tiên xuất hiện trong khối = mã của UC đó (P2 lấy sẵn từ heading).
// Thư mục = mã đã chuẩn hoá, hạ chữ thường — xem khối ⛔ ở đầu file.
const REQ_FIND = new RegExp(`\\b(${REQ_SRC})\\b`);
const reqToDir = new Map();
const headingNo = new Map(); // mã → số thứ tự ở tiêu đề, CHỈ để in ra đối chiếu
for (const b of ucBlocks) {
  if (onlyModule && b.module !== onlyModule) continue;
  const req = b.req ?? (() => {
    const slice = lines.slice(b.startLine, b.endLine).join('\n');
    const m = slice.match(REQ_FIND);
    return m ? normReq(m[1]) : null;
  })();
  if (!req) continue;
  b.req = req;
  if (!reqToDir.has(req)) {
    reqToDir.set(req, req.toLowerCase());
    headingNo.set(req, b.no);
  }
}

// ── 2. Gom AC theo mã yêu cầu ─────────────────────────────────────────────────
// Mỗi hàng mang `code` HOÀN CHỈNH: nguyên văn URD (2a) hoặc kiến tạo theo chuẩn (2b).
const byReq = new Map();
const normCode = (c) => normReq(c).replace(/-AC-(?=\d)/, '-AC'); // CHỈ để dedup/so khớp, không ghi ra
const push = (req, code, line, kind, text) => {
  if (!byReq.has(req)) byReq.set(req, []);
  if (byReq.get(req).some((r) => normCode(r.code) === normCode(code))) return; // hai đường cùng bắt ⇒ giữ một
  byReq.get(req).push({ code, line, kind, text });
};

// 2a. Hàng có mã ĐẦY ĐỦ trong URD — quét toàn file, GIỮ NGUYÊN VĂN mã (chân lý là URD);
// bucket theo mã UC đã biết (bản có gạch quy về cùng bucket với heading P2 của nó).
const FULL_ROW = new RegExp(`^\\|\\s*((${REQ_SRC})-AC-?\\d+[a-zA-Z]?)\\s*\\|`);
lines.forEach((raw, i) => {
  const m = raw.match(FULL_ROW);
  if (!m) return;
  const req = normReq(m[2]);
  if (!reqToDir.has(req)) return;
  const cells = raw.split(/(?<!\\)\|/).map((c) => c.trim());
  push(req, m[1], i + 1, cells[2], cells[3]);
});

// 2b. Hàng RÚT GỌN (`| AC-01 |`) — URD không có mã AC đầy đủ ⇒ KIẾN TẠO theo chuẩn đầu file.
// Chỉ bắt trong biên mục UC, và chỉ SAU header bảng "Mã AC" (tránh vơ nhầm bảng khác).
const SHORT_HEADER = /^\|\s*\**\s*Mã AC/;
const SHORT_ROW = /^\|\s*(AC-?\d+[a-zA-Z]?)\s*\|/;
for (const b of ucBlocks) {
  if (!b.req || !reqToDir.has(b.req)) continue;
  let inTable = false;
  for (let i = b.startLine; i < b.shortEnd; i++) {
    const raw = lines[i];
    if (SHORT_HEADER.test(raw)) { inTable = true; continue; }
    if (!inTable) continue;
    if (!raw.startsWith('|')) { inTable = false; continue; }
    const m = raw.match(SHORT_ROW);
    if (!m) continue;
    const cells = raw.split(/(?<!\\)\|/).map((c) => c.trim());
    push(b.req, `${b.req}-${normAc(m[1])}`, i + 1, cells[2], cells[3]);
  }
}

// ── 3. Ghi file ───────────────────────────────────────────────────────────────
let total = 0;
for (const [req, rows] of byReq) {
  rows.sort((a, b) => a.line - b.line);
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
    .map((r) => `| ${r.code} | ${r.line} | ${r.kind} | ${r.text.replace(/\|/g, '\\|')} | *chưa gán* | *chưa chốt* | — | NO TEST |`)
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
