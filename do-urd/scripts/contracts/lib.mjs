import { readFileSync } from 'node:fs';
// Tiện ích dùng chung cho check-contracts. Không phụ thuộc package ngoài.
import { execFileSync } from 'node:child_process';

export const PASS = 'pass';
export const FAIL = 'fail';
export const SKIP = 'skip';

/** Một phát hiện. `where` nên là `path:line` để bấm được. */
export const finding = (where, what, how) => ({ where, what, how });

export const result = (id, title, status, findings = [], note = '') => ({
  id,
  title,
  status,
  findings,
  note,
});

/**
 * Phán quyết chuẩn cho mọi cổng. **Không cổng nào được tự dựng `result(...)` ở nhánh kết thúc.**
 *
 * Luật: `checked === 0` ⇒ **SKIP**, không bao giờ PASS. Cổng không đo được mục nào thì nó không có gì
 * để nói; báo PASS ở đó là biến một điểm mù thành dấu xanh — và đó là cách một cổng ship ra lỗi trong
 * khi vẫn xanh.
 *
 * `note` luôn kèm số đã kiểm, để phân biệt "kiểm N mục đều đạt" với "chẳng kiểm gì".
 *
 * @param unit  danh từ đếm được: 'permission mới', 'method mới', 'property mới trên entity'…
 * @param skipped  mục TRONG phạm vi nhưng không đo được. Bỏ im lặng là cách một cổng tự thu hẹp
 *                 phạm vi mà không ai hay ⇒ phải đếm và in ra.
 */
export function verdict(id, title, findings, checked, unit, skipped = 0, skippedUnit = unit) {
  const skipNote = skipped ? ` · ⚠ ${skipped} ${skippedUnit} KHÔNG đo được` : '';
  if (checked === 0) {
    return result(id, title, SKIP, findings, `0 ${unit} đo được — cổng không có gì để nói${skipNote}`);
  }
  return result(id, title, findings.length ? FAIL : PASS, findings, `đã kiểm ${checked} ${unit}${skipNote}`);
}

export function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    if (allowFail) return '';
    throw err;
  }
}

/** Ref so sánh: ưu tiên --base, sau đó merge-base với origin/develop, cuối cùng HEAD~1. */
export function resolveBase(explicit) {
  if (explicit) return explicit;
  const mb = git(['merge-base', 'HEAD', 'origin/develop'], { allowFail: true }).trim();
  return mb || git(['rev-parse', 'HEAD~1'], { allowFail: true }).trim() || 'HEAD';
}

/** File đã sửa/thêm giữa base..HEAD **cộng** working tree — để bắt cả thứ chưa commit. */
export function changedFiles(base, filterRe) {
  const committed = git(['diff', '--name-only', '--diff-filter=AM', `${base}..HEAD`], {
    allowFail: true,
  });
  const working = git(['status', '--porcelain'], { allowFail: true })
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith(' D') && !l.startsWith('D'))
    .map((l) => l.slice(3).trim());
  const all = new Set([...committed.split('\n'), ...working].map((s) => s.trim()).filter(Boolean));
  return [...all].filter((f) => filterRe.test(f));
}

/** Các dòng ĐƯỢC THÊM cho một file (không lấy dòng bị xoá), kèm số dòng ở bản mới. */
export function addedLines(base, file) {
  const diff = git(['diff', '-U0', `${base}..HEAD`, '--', file], { allowFail: true });
  const working = git(['diff', '-U0', '--', file], { allowFail: true });
  const out = [];
  for (const chunk of [diff, working]) {
    let lineNo = 0;
    for (const raw of chunk.split('\n')) {
      const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
      if (hunk) {
        lineNo = Number(hunk[1]);
        continue;
      }
      if (raw.startsWith('+++') || raw.startsWith('---')) continue;
      if (raw.startsWith('+')) out.push({ line: lineNo++, text: raw.slice(1) });
    }
  }
  return out;
}

/** File mới hoàn toàn (untracked hoặc A) — đọc trọn nội dung, đánh số từ 1. */
export function isNewFile(base, file) {
  const st = git(['diff', '--name-status', '--diff-filter=A', `${base}..HEAD`, '--', file], {
    allowFail: true,
  });
  if (st.trim()) return true;
  return git(['ls-files', '--error-unmatch', file], { allowFail: true }).trim() === '';
}

/**
 * Miễn trừ tường minh. Một check chỉ được bỏ qua khi CÓ NGƯỜI ghi lý do — im lặng bỏ qua là đúng
 * thứ bộ gate này sinh ra để chống.
 */
export function exemptReason(text, marker) {
  const re = new RegExp(`${marker}\\s*:\\s*(.+)$`, 'm');
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

/**
 * Miễn trừ phải kiểm trên NỘI DUNG HIỆN TẠI của file, không trên văn bản diff: người ta thêm marker
 * SAU khi gate báo, nên dòng trong diff lịch sử không bao giờ có nó.
 */
export function lineIsExempt(file, lineNo, marker) {
  try {
    const lines = readFileSync(file, 'utf8').split('\n');
    const window = [lines[lineNo - 1], lines[lineNo - 2]].filter(Boolean).join('\n');
    return exemptReason(window, marker);
  } catch {
    return null;
  }
}

/**
 * Tìm dòng khai báo trong NỘI DUNG HIỆN TẠI theo tên, không dùng số dòng của diff: file đã đổi từ
 * lúc diff nên số dòng lịch sử không còn trỏ đúng chỗ.
 */
export function declLine(file, nameRe) {
  try {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (nameRe.test(lines[i])) return { line: i + 1, text: lines[i], prev: lines[i - 1] ?? '' };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function renderReport(results, { strict }) {
  const icon = { pass: '✅', fail: '❌', skip: '⏭️ ' };
  const lines = [];
  for (const r of results) {
    lines.push(`${icon[r.status]} ${r.id} · ${r.title}${r.note ? ` — ${r.note}` : ''}`);
    for (const f of r.findings) {
      lines.push(`     ${f.where}`);
      lines.push(`       ✗ ${f.what}`);
      if (f.how) lines.push(`       → ${f.how}`);
    }
  }
  const failed = results.filter((r) => r.status === FAIL);
  const skipped = results.filter((r) => r.status === SKIP);
  lines.push('');
  lines.push(
    `Kết quả: ${results.filter((r) => r.status === PASS).length} đạt · ${failed.length} hỏng · ${skipped.length} bỏ qua`,
  );
  if (skipped.length && strict) {
    lines.push('⚠️  --strict: check bị bỏ qua cũng tính là hỏng.');
  } else if (skipped.length) {
    lines.push('⚠️  Check bỏ qua KHÔNG phải check đạt. Xem lý do ở trên.');
  }
  return lines.join('\n');
}
