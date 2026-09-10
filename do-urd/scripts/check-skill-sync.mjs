#!/usr/bin/env node
// Kiểm bản skill trong repo có khớp bản gốc không. Dùng: node check-skill-sync.mjs <repo-root>
// exit 0 = khớp · 1 = lệch (in danh sách tệp) · 2 = thiếu thư mục.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const master = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = process.argv[2];
if (!repoRoot) { console.error('Usage: check-skill-sync.mjs <repo-root>'); process.exit(2); }
const copy = join(repoRoot, '.claude', 'skills', 'do-urd');
if (!existsSync(copy)) { console.error(`SKIP: không có ${copy}`); process.exit(2); }

const walk = (dir, base = dir, out = new Map()) => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, base, out);
    else out.set(relative(base, p), createHash('sha1').update(readFileSync(p)).digest('hex'));
  }
  return out;
};
const a = walk(master), b = walk(copy);
const drift = [];
for (const [f, h] of a) if (b.get(f) !== h) drift.push(`${f} ${b.has(f) ? 'KHÁC' : 'THIẾU trong repo'}`);
for (const f of b.keys()) if (!a.has(f)) drift.push(`${f} THỪA trong repo`);
if (drift.length) {
  console.error(`LỆCH ${drift.length} tệp giữa bản gốc (${master}) và repo (${copy}):\n  ${drift.join('\n  ')}\n⇒ sửa ở bản gốc rồi: cp -r ${master}/. ${copy}/`);
  process.exit(1);
}
console.log(`OK: ${a.size} tệp khớp bản gốc`);
