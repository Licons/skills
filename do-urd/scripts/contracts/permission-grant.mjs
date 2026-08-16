// C3 — INV-1: permission mới phải có mặt trong một seeder grant.
//
// Cơ chế hỏng: quyền được KHAI BÁO nhưng không ai cấp. Không lỗi build, không lỗi test — chỉ 403
// đúng lúc người dùng mở màn hình cần nó. Grant-before-enforce là code, không phải checklist ops:
// một dòng trong seeder bền hơn một dòng trong biên bản bàn giao.
import { execFileSync } from 'node:child_process';
import { FAIL, PASS, addedLines, changedFiles, declLine, exemptReason, finding, result } from './lib.mjs';

const PERMISSION_FILE_RE = /\/Permissions\/.+\.cs$/;
const CONST_RE = /^\s*public\s+const\s+string\s+(\w+)\s*=/;

/** Nội dung mọi file có dính tới seeding permission — nơi hợp lệ để một quyền được cấp. */
function seederCorpus() {
  try {
    const files = execFileSync(
      'grep',
      ['-rl', '-e', 'IPermissionDataSeeder', '-e', 'PermissionDataSeeder', '--include=*.cs', 'services/', 'apps/'],
      { encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean);
    return files
      .map((f) => {
        try {
          return execFileSync('cat', [f], { encoding: 'utf8' });
        } catch {
          return '';
        }
      })
      .join('\n');
  } catch {
    return '';
  }
}

export function run({ base }) {
  const id = 'C3';
  const title = 'Permission mới có mặt trong một seeder grant (grant-before-enforce)';
  const findings = [];
  const corpus = seederCorpus();

  if (!corpus) {
    return result(id, title, PASS, [], 'không tìm thấy seeder nào — bỏ qua');
  }

  for (const file of changedFiles(base, PERMISSION_FILE_RE)) {
    const seen = new Set();
    for (const { text } of addedLines(base, file)) {
      const m = CONST_RE.exec(text);
      if (!m) continue;
      const name = m[1];
      // Bỏ nhóm gốc và cờ hiển thị — chúng không phải quyền cần cấp riêng.
      if (['GroupName', 'Default', 'ShowInMenu'].includes(name) || seen.has(name)) continue;
      seen.add(name);

      const decl = declLine(file, new RegExp(`const\\s+string\\s+${name}\\s*=`));
      const line = decl?.line ?? 0;
      if (decl && exemptReason(`${decl.prev}\n${decl.text}`, 'grant-exempt')) continue;

      // Seeder tham chiếu qua `<Class>.<Name>` nên chỉ cần thấy `.<Name>` là đủ tin cậy.
      if (!new RegExp(`\\.${name}\\b`).test(corpus)) {
        findings.push(
          finding(
            `${file}:${line}`,
            `permission \`${name}\` được khai báo nhưng KHÔNG seeder nào cấp`,
            'thêm vào endpoint/seeder grant (idempotent), hoặc `// grant-exempt: <lý do>`. ' +
              'Quyền không ai cấp = 403 im lặng cho tới khi ai đó mở đúng màn hình',
          ),
        );
      }
    }
  }

  return result(id, title, findings.length ? FAIL : PASS, findings);
}
