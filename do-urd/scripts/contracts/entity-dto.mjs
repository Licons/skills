// C2 — INV-1: property mới trên entity phải có mặt trên DTO tương ứng.
//
// Cơ chế hỏng: AutoMapper convention-based **im lặng bỏ qua** field không tồn tại trên đích.
// Không lỗi build, không lỗi test — giá trị tính xong nằm lại DB và màn hình hiện ô trống.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { FAIL, PASS, addedLines, changedFiles, declLine, exemptReason, finding, isNewFile, result } from './lib.mjs';

const ENTITY_RE = /services\/.+\/Entities\/.+\.cs$/;
const PROP_RE = /^\s*public\s+(?:virtual\s+)?[\w<>,?\[\]\. ]+?\s+(\w+)\s*\{\s*get;/;

/** Bỏ qua thứ không bao giờ thuộc về DTO. */
const NEVER_ON_DTO = new Set(['TenantId', 'ConcurrencyStamp', 'ExtraProperties', 'Id']);

function dtoFilesFor(entityFile) {
  // services/<x>/<Proj>/Entities/<Folder>/<Entity>.cs  ->  .Contracts/Services/Dtos/<Folder>/
  const m = /^(services\/[^/]+)\/([^/]+)\/Entities\/([^/]+)\//.exec(entityFile);
  if (!m) return [];
  const [, svcRoot, proj, folder] = m;
  const contracts = `${svcRoot}/${proj}.Contracts/Services/Dtos/${folder}`;
  if (!existsSync(contracts)) return [];
  return readdirSync(contracts)
    .filter((f) => f.endsWith('.cs'))
    .map((f) => path.join(contracts, f));
}

export function run({ base }) {
  const id = 'C2';
  const title = 'Property mới trên entity có mặt trên DTO (AutoMapper không báo khi thiếu)';
  const findings = [];

  for (const file of changedFiles(base, ENTITY_RE)) {
    const dtoFiles = dtoFilesFor(file);
    if (dtoFiles.length === 0) continue; // entity không có thư mục DTO tương ứng — ngoài phạm vi check

    const dtoText = dtoFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
    const lines = isNewFile(base, file)
      ? readFileSync(file, 'utf8').split('\n').map((text, i) => ({ line: i + 1, text }))
      : addedLines(base, file);

    const seen = new Set();
    for (const { text } of lines) {
      const m = PROP_RE.exec(text);
      if (!m) continue;
      const prop = m[1];
      if (NEVER_ON_DTO.has(prop) || seen.has(prop)) continue;
      seen.add(prop);

      // Định vị lại trên file HIỆN TẠI: miễn trừ được thêm sau khi gate báo, và số dòng của diff
      // lịch sử không còn trỏ đúng chỗ.
      const decl = declLine(file, new RegExp(`\\b${prop}\\s*\\{\\s*get;`));
      if (!decl) continue; // property đã bị xoá khỏi file
      if (exemptReason(`${decl.prev}\n${decl.text}`, 'dto-exempt')) continue;

      // Tìm `PropName {` hoặc `PropName;` trong bất kỳ DTO nào của cùng nhóm.
      const onDto = new RegExp(`\\b${prop}\\s*(\\{\\s*get;|;)`).test(dtoText);
      if (!onDto) {
        findings.push(
          finding(
            `${file}:${decl.line}`,
            `\`${prop}\` có trên entity nhưng KHÔNG có trên DTO nào ở ${path.dirname(dtoFiles[0])}`,
            'thêm vào DTO, hoặc `// dto-exempt: <lý do>` nếu cố ý không expose. ' +
              'Bỏ qua im lặng = giá trị nằm lại DB, màn hình trống, không lỗi nào',
          ),
        );
      }
    }
  }

  return result(id, title, findings.length ? FAIL : PASS, findings);
}
