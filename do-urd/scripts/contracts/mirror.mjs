// C4 — INV-3: FE không được chép lại danh sách mà BE dùng để validate/chặn.
//
// Cơ chế hỏng: hai bản danh sách lệch nhau. Thêm ở BE mà quên FE -> giá trị mới IM LẶNG không xuất
// hiện. Thêm ở FE trước -> người dùng chọn xong ăn 400. Không chiều nào có tín hiệu.
//
// Hai đường hợp lệ: (a) BE expose qua endpoint lookup, FE đọc; (b) sinh tự động vào proxy.
// FE chỉ sở hữu NHÃN hiển thị — nhãn thiếu thì hiện chính khoá, để sai còn nhìn thấy được.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { FAIL, PASS, changedFiles, exemptReason, finding, result } from './lib.mjs';

const FE_GLOB = 'apps/angular/projects';
const BE_GLOB = 'services';

function grep(args) {
  try {
    return execFileSync('grep', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/** (1) Dòng FE tự khai nó là bản sao của BE — cờ đỏ do chính người viết cắm. */
function selfDeclaredMirrors() {
  // Chỉ tính khi CÙNG DÒNG vừa nói "bản sao" vừa trỏ về BE — từ "mirror" một mình còn dùng cho
  // CSS/animation nên bắt trần sẽ ra hàng chục dương tính giả.
  return grep(['-rniE', 'mirror|PHẢI khớp|phải khớp|đồng bộ tay', '--include=*.ts', FE_GLOB])
    .filter((l) => !l.includes('/proxy/') && !/\.spec\.ts:/.test(l))
    .filter((l) => /\bBE\b|\.cs\b|backend/i.test(l));
}

/** (2) enum khai ở CẢ hai phía cùng tên — bản sao thật, dù không ai khai báo là bản sao. */
function duplicatedEnums() {
  const feEnums = new Map();
  for (const line of grep(['-rn', '--include=*.ts', '-E', '^export enum \\w+', FE_GLOB])) {
    if (line.includes('/proxy/') || line.includes('.spec.ts')) continue;
    const [file, lineNo, ...rest] = line.split(':');
    const name = /^export enum (\w+)/.exec(rest.join(':').trim())?.[1];
    if (name) feEnums.set(name, `${file}:${lineNo}`);
  }
  if (feEnums.size === 0) return [];

  const beEnums = new Set();
  for (const line of grep(['-rhn', '--include=*.cs', '-E', '^\\s*public enum \\w+', BE_GLOB])) {
    const name = /public enum (\w+)/.exec(line)?.[1];
    if (name) beEnums.add(name);
  }
  return [...feEnums.entries()].filter(([name]) => beEnums.has(name));
}

export function run({ base, all = false } = {}) {
  // Mặc định chỉ xét file ĐÃ ĐỔI trong lượt này. Quét toàn repo (--all) sẽ nổ vào nợ có sẵn và cổng
  // đỏ vĩnh viễn ⇒ bị bỏ qua, đúng thứ bộ gate này sinh ra để chống.
  const scope = all ? null : new Set(changedFiles(base, /\.ts$/));
  const inScope = (f) => !scope || scope.has(f);
  const seen = new Set();
  const id = 'C4';
  const title = 'FE không chép lại danh sách BE dùng để validate (whitelist / enum)';
  const findings = [];

  for (const line of selfDeclaredMirrors()) {
    const [file, lineNo, ...rest] = line.split(':');
    if (!inScope(file) || seen.has(`${file}:${lineNo}`)) continue;
    seen.add(`${file}:${lineNo}`);
    const text = rest.join(':');
    if (exemptReason(text, 'mirror-ok')) continue;
    findings.push(
      finding(
        `${file}:${lineNo}`,
        'hằng số FE tự khai là bản sao của một danh sách BE',
        'đổi sang đọc từ endpoint lookup của BE, hoặc `// mirror-ok: <lý do>` nếu là nợ có chủ ý',
      ),
    );
  }

  for (const [name, where] of duplicatedEnums()) {
    if (!inScope(where.split(':')[0])) continue;
    const [file] = where.split(':');
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      /* ignore */
    }
    if (exemptReason(text, 'mirror-ok')) continue;
    findings.push(
      finding(
        where,
        `enum \`${name}\` khai ở CẢ FE và BE — bản sao, dù không khai báo là bản sao`,
        'dùng enum sinh ra trong proxy, hoặc đọc danh mục từ endpoint. ' +
          'Mirror thiếu một giá trị = dữ liệu rơi ra ngoài mọi nhánh FE mà không lỗi nào',
      ),
    );
  }

  return result(id, title, findings.length ? FAIL : PASS, findings);
}
