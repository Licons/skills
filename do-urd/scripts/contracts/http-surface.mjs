// C1 — INV-1: method AppService mới phải có endpoint gọi được.
//
// ⚠ TIỀN ĐỀ: service phải được REBUILD + RESTART trước khi chạy check này. api-definition đọc từ
//   tiến trình đang chạy, nên một method chưa build sẽ báo "không có endpoint" y hệt một method
//   thiếu route thật. Cổng không phân biệt được hai ca đó — người chạy phải bảo đảm tiền đề.
//
// Bắt 3 cơ chế hỏng, cả 3 đều IM LẶNG với test BE (test gọi thẳng SUT nên không thể thấy):
//   1. method public nhưng vắng ở interface  -> explicit controller không route
//   2. [Route] class-level tắt conventional routing -> httpMethod = null
//   3. [IntegrationService] -> chỉ nằm ở integration-api/*, proxy generator BỎ QUA
import { readFileSync } from 'node:fs';
import { FAIL, PASS, SKIP, addedLines, changedFiles, finding, isNewFile, lineIsExempt, result } from './lib.mjs';

const APPSERVICE_RE = /services\/.+AppService(\.Extended)?\.cs$/;
// `public [virtual|override|async] Task<...> XxxAsync(` — bắt cả không generic.
const METHOD_RE = /^\s*public\s+(?:virtual\s+|override\s+|async\s+|static\s+)*Task(?:<[^>]*>)?\s+(\w+)\s*\(/;

async function fetchApiDefinition(apiUrl) {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/abp/api-definition`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Gom mọi action thành index theo tên method (uniqueName của ABP thường là `<Method>By<Args>`). */
function indexActions(def) {
  const byName = new Map();
  const all = [];
  for (const mod of Object.values(def.modules ?? {})) {
    for (const [ctrlName, ctrl] of Object.entries(mod.controllers ?? {})) {
      for (const [uniqueName, action] of Object.entries(ctrl.actions ?? {})) {
        const entry = {
          controller: ctrlName.split('.').pop(),
          uniqueName,
          name: action.name,
          verb: action.httpMethod,
          url: action.url,
        };
        all.push(entry);
        for (const key of [action.name, uniqueName.replace(/By[A-Z]\w*$/, '')]) {
          if (!key) continue;
          if (!byName.has(key)) byName.set(key, []);
          byName.get(key).push(entry);
        }
      }
    }
  }
  return { byName, all };
}

export async function run({ base, apiUrl }) {
  const id = 'C1';
  const title = 'Method AppService mới có endpoint gọi được (verb thật, không integration-api)';

  if (!apiUrl) {
    return result(id, title, SKIP, [], 'thiếu --api <url>; service phải đang chạy để đọc api-definition');
  }

  let def;
  try {
    def = await fetchApiDefinition(apiUrl);
  } catch (err) {
    return result(id, title, SKIP, [], `không đọc được api-definition (${err.message})`);
  }

  const { byName, all } = indexActions(def);
  const findings = [];

  // (a) Bất kỳ action nào thiếu verb — không phụ thuộc diff, vì đây luôn là lỗi.
  for (const a of all) {
    if (!a.verb) {
      findings.push(
        finding(
          `${a.controller}.${a.uniqueName}`,
          `endpoint không có HTTP verb (url: ${a.url})`,
          'khai [HttpPost]/[HttpGet] tường minh — [Route] class-level tắt conventional routing',
        ),
      );
    }
  }

  // (b) Method mới trong diff phải xuất hiện, và ở bề mặt api/ chứ không integration-api/.
  for (const file of changedFiles(base, APPSERVICE_RE)) {
    const lines = isNewFile(base, file)
      ? readFileSync(file, 'utf8').split('\n').map((text, i) => ({ line: i + 1, text }))
      : addedLines(base, file);

    for (const { line, text } of lines) {
      const m = METHOD_RE.exec(text);
      if (!m) continue;
      const method = m[1];
      if (lineIsExempt(file, line, 'contract-exempt')) continue;

      const hits = byName.get(method) ?? byName.get(method.replace(/Async$/, '')) ?? [];
      if (hits.length === 0) {
        findings.push(
          finding(
            `${file}:${line}`,
            `\`${method}\` không có endpoint nào trong api-definition`,
            'TRƯỚC TIÊN kiểm service đã rebuild+restart chưa — api-definition đọc từ tiến trình ĐANG ' +
              'CHẠY, nên method chưa build cũng báo y hệt. Nếu đã build lại: ' +
              'khai ở interface để explicit controller route được, hoặc thêm route ở controller; ' +
              'nếu cố ý không expose thì đổi thành private/protected hoặc thêm `// contract-exempt: <lý do>`',
          ),
        );
        continue;
      }
      const reachable = hits.filter((h) => h.url?.startsWith('api/'));
      if (reachable.length === 0) {
        findings.push(
          finding(
            `${file}:${line}`,
            `\`${method}\` chỉ tồn tại ở ${hits.map((h) => h.url).join(', ')}`,
            '[IntegrationService] bị proxy generator của Angular BỎ QUA — FE không có gì để gọi. ' +
              'Đưa route lên controller tường minh, hoặc tắt remote nếu thật sự không phải endpoint người dùng',
          ),
        );
      }
    }
  }

  return result(id, title, findings.length ? FAIL : PASS, findings);
}
