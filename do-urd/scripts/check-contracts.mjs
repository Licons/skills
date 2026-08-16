#!/usr/bin/env node
// B4 — cổng hợp đồng của skill `do-urd` (INV-1 + INV-3).
//
// Nguyên tắc: mỗi cổng phải fail được. Bốn check dưới đây bắt đúng lớp lỗi mà build và test
// KHÔNG THỂ thấy — "code đúng · test xanh · không client nào gọi tới được".
//
// Kỳ vọng suy ra từ `git diff`, KHÔNG từ một file ledger phải duy trì tay: một ledger chính là
// nguồn sự thật thứ hai, đúng thứ INV-3 cấm.
//
// Usage:
//   node .claude/skills/do-urd/scripts/check-contracts.mjs --check [--base <ref>] [--api <url>]
//   node .claude/skills/do-urd/scripts/check-contracts.mjs --check --only c2,c4
//   node .claude/skills/do-urd/scripts/check-contracts.mjs --check --strict   # check bỏ qua = hỏng
//   node .claude/skills/do-urd/scripts/check-contracts.mjs --check --all      # C4 quét toàn repo (audit nợ)
//
// Miễn trừ phải TƯỜNG MINH, ghi ngay trên dòng bị bắt:
//   // contract-exempt: <lý do>   (C1)   // dto-exempt: <lý do>   (C2)
//   // grant-exempt:    <lý do>   (C3)   // mirror-ok:   <lý do>  (C4)
import { FAIL, SKIP, renderReport, resolveBase } from './contracts/lib.mjs';
import { run as c1 } from './contracts/http-surface.mjs';
import { run as c2 } from './contracts/entity-dto.mjs';
import { run as c3 } from './contracts/permission-grant.mjs';
import { run as c4 } from './contracts/mirror.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const strict = argv.includes('--strict');
const only = (flag('only') ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const base = resolveBase(flag('base'));
const apiUrl = flag('api') ?? process.env.CONTRACT_API_URL;

const CHECKS = [
  { id: 'c1', fn: () => c1({ base, apiUrl }) },
  { id: 'c2', fn: () => c2({ base }) },
  { id: 'c3', fn: () => c3({ base }) },
  { id: 'c4', fn: () => c4({ base, all: argv.includes('--all') }) },
];

const results = [];
for (const check of CHECKS) {
  if (only.length && !only.includes(check.id)) continue;
  try {
    results.push(await check.fn());
  } catch (err) {
    results.push({
      id: check.id.toUpperCase(),
      title: 'check ném lỗi',
      status: FAIL,
      findings: [{ where: check.id, what: err.message, how: 'sửa script hoặc báo lead' }],
      note: '',
    });
  }
}

console.log(`base: ${base}${apiUrl ? ` · api: ${apiUrl}` : ''}\n`);
console.log(renderReport(results, { strict }));

const failed = results.some((r) => r.status === FAIL);
const skipped = results.some((r) => r.status === SKIP);
process.exit(failed || (strict && skipped) ? 1 : 0);
