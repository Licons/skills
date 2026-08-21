// C3 — INV-1: permission mới phải có mặt trong một seeder grant.
//
// Cơ chế hỏng: quyền được KHAI BÁO nhưng không ai cấp. Không lỗi build, không lỗi test — chỉ 403
// đúng lúc người dùng mở màn hình cần nó. Grant-before-enforce là code, không phải checklist ops:
// một dòng trong seeder bền hơn một dòng trong biên bản bàn giao.
import { execFileSync } from 'node:child_process';
import { SKIP, addedLines, changedFiles, declLine, exemptReason, finding, result, verdict } from './lib.mjs';

const PERMISSION_FILE_RE = /\/Permissions\/.+\.cs$/;
const CONST_RE = /^\s*public\s+const\s+string\s+(\w+)\s*=/;
const NESTED_CLASS_RE = /^\s*public\s+static\s+class\s+(\w+)/;

/**
 * Trả hàm `lineNo -> tên lớp lồng gần nhất phía trên`, ví dụ một dòng trong `class Orders` → `Orders`.
 *
 * Cần vì seeder tham chiếu bằng tên ĐỦ (`<Permissions>.<Nhóm>.<Tên>`), trong khi tên const đứng một
 * mình (`Default`, `Edit`, `Create`) lặp lại ở hàng chục nhóm quyền. Đối chiếu bằng tên trần là nguyên
 * nhân của một lỗi PASS-giả thật: `.Edit` khớp một `X.Edit` vốn có ⇒ cổng báo "đã cấp" cho một quyền
 * chưa ai cấp.
 */
function classResolver(file) {
  let text = '';
  try {
    text = execFileSync('cat', [file], { encoding: 'utf8' });
  } catch {
    return () => null;
  }
  const marks = [];
  text.split('\n').forEach((line, i) => {
    const m = NESTED_CLASS_RE.exec(line);
    if (m) marks.push({ line: i + 1, cls: m[1] });
  });
  return (lineNo) => {
    let cls = null;
    for (const m of marks) {
      if (m.line <= lineNo) cls = m.cls;
      else break;
    }
    return cls;
  };
}

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

  // Corpus rỗng nghĩa là cổng KHÔNG ĐO ĐƯỢC, không phải "không có vấn đề". Trả PASS ở đây là biến một
  // cổng mù thành một dấu xanh — đúng thứ INV-2 cấm.
  if (!corpus) {
    return result(id, title, SKIP, [], 'không tìm thấy seeder nào — cổng KHÔNG đo được, không phải đạt');
  }

  let checked = 0;

  for (const file of changedFiles(base, PERMISSION_FILE_RE)) {
    const classAt = classResolver(file);
    const seen = new Set();
    for (const { line: addedLine, text } of addedLines(base, file)) {
      const m = CONST_RE.exec(text);
      if (!m) continue;
      const name = m[1];
      // `GroupName` là tên nhóm, `ShowInMenu` là cờ hiển thị — không phải quyền cần cấp.
      // ⚠ `Default` KHÔNG được bỏ qua: nó chính là quyền của cả nhóm, và là quyền mà
      // `[Authorize(...Default)]` đòi. Bỏ nó ra khỏi phạm vi là cách ship một 403 mà cổng vẫn xanh.
      if (['GroupName', 'ShowInMenu'].includes(name)) continue;

      const cls = classAt(addedLine);
      const key = `${cls}.${name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Miễn trừ đọc ở CHÍNH dòng được thêm, không đi tìm khai báo đầu tiên trùng tên: `Default` có
      // ở hàng chục lớp nên `declLine` sẽ trả nhầm lớp khác và báo sai cả số dòng lẫn miễn trừ.
      if (exemptReason(text, 'grant-exempt')) continue;

      checked++;

      // Đối chiếu bằng tên ĐỦ `<Class>.<Name>`. Dùng `.<Name>` trần sẽ khớp nhầm quyền của nhóm khác:
      // một `X.Edit` vốn có là đủ để mọi `Y.Edit` mới trông như "đã được cấp".
      const qualified = cls ? new RegExp(`\\b${cls}\\.${name}\\b`) : new RegExp(`\\.${name}\\b`);
      if (!qualified.test(corpus)) {
        findings.push(
          finding(
            `${file}:${addedLine}`,
            `permission \`${key}\` được khai báo nhưng KHÔNG seeder nào cấp`,
            'thêm vào endpoint/seeder grant (idempotent), hoặc `// grant-exempt: <lý do>`. ' +
              'Quyền không ai cấp = 403 im lặng cho tới khi ai đó mở đúng màn hình',
          ),
        );
      }
    }
  }

  return verdict(id, title, findings, checked, 'permission mới');
}
