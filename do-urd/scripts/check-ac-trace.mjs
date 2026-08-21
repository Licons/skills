#!/usr/bin/env node
// B2 — cổng đối chiếu: mọi dòng AC trong ac-verify.md phải khớp NGUYÊN VĂN dòng <URD>:line.
// verdict: 0 mục đo được ⇒ SKIP (không bao giờ PASS). In "đã kiểm N AC".
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const URD = process.argv[2];
const ROOT = process.argv[3] ?? '.';
const urd = readFileSync(URD, 'utf8').split('\n');
const norm = (s) => s.replace(/\\\|/g, '|').replace(/\s+/g, ' ').trim();

let checked = 0, failed = 0, unmeasurable = 0;
for (const dir of readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^[a-z][a-z0-9]*(-fr-\d+)?-uc-?\d+$/.test(d.name))) {
  const f = join(ROOT, dir.name, 'ac-verify.md');
  if (!existsSync(f)) { unmeasurable++; console.log(`⚠ ${dir.name}: thiếu ac-verify.md`); continue; }
  for (const raw of readFileSync(f, 'utf8').split('\n')) {
    const m = raw.match(/^\|\s*([A-Z0-9]{2,6}-FR-\d+-UC\d+-AC\d+)\s*\|\s*(\d+)\s*\|/);
    if (!m) continue;
    const [, code, lineNo] = m;
    const src = urd[Number(lineNo) - 1];
    if (src === undefined) { unmeasurable++; console.log(`⚠ ${code}: URD:${lineNo} ngoài phạm vi file`); continue; }
    checked++;
    // ô thứ 4 của bảng ac-verify = tiêu chí; ô thứ 3 của URD = tiêu chí
    const mine = norm(raw.split(/(?<!\\)\|/)[4] ?? '');
    const theirs = norm(src.split(/(?<!\\)\|/)[3] ?? '');
    if (!src.includes(code.replace(/-AC\d+$/, ''))) { failed++; console.log(`❌ ${code}: URD:${lineNo} không chứa mã yêu cầu`); continue; }
    if (mine !== theirs) {
      failed++;
      console.log(`❌ ${code} (URD:${lineNo}) LỆCH NGUYÊN VĂN`);
      console.log(`   ac-verify: ${mine.slice(0, 110)}`);
      console.log(`   URD      : ${theirs.slice(0, 110)}`);
    }
  }
}

if (checked === 0) { console.log('⏭️  SKIP — 0 AC đo được (cổng không nói gì)'); process.exit(0); }
if (unmeasurable) console.log(`⚠ ${unmeasurable} mục KHÔNG đo được`);
if (failed) { console.log(`❌ B2 FAIL — ${failed}/${checked} AC lệch · đã kiểm ${checked} AC`); process.exit(1); }
console.log(`✅ B2 PASS — mọi AC khớp nguyên văn URD · đã kiểm ${checked} AC`);
