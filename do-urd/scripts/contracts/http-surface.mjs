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
import { SKIP, addedLines, changedFiles, finding, isNewFile, lineIsExempt, result, verdict } from './lib.mjs';

// ⛔ Phải phủ MỌI hậu tố partial, không chỉ `.Extended`. Repo này chia AppService thành nhiều
//    partial theo miền: `.Extended.cs` · `.Geic.cs` · `.Msg.cs` · `.Cif.cs`… Regex cũ chốt cứng
//    `.Extended` nên `ContactsAppService.Cif.cs` **lọt hoàn toàn** — cổng báo "0 method mới" trong
//    khi có 3 endpoint mới, tức im lặng bỏ qua đúng thứ nó sinh ra để canh (gaps.md G-14, 18/08).
const APPSERVICE_RE = /services\/.+AppService(\.[A-Za-z0-9]+)?\.cs$/;
// `public [virtual|override|async] Task<...> XxxAsync(` — bắt cả không generic.
// ⚠ `<.*>` chứ KHÔNG phải `<[^>]*>`: bản cũ dừng ở dấu `>` ĐẦU TIÊN nên **im lặng bỏ sót mọi
//    generic lồng nhau** — `Task<List<T>>`, `Task<Dictionary<K,V>>`, và nhất là
//    `Task<PagedResultDto<T>>`, tức dạng endpoint danh sách phổ biến nhất của ABP.
//    Phát hiện 18/08: C1 đếm 9 method trong khi lượt đó thêm 10; cái thứ 10 trả
//    `Task<List<ContactRelatedRecordDto>>`. Nghĩa là mọi lượt trước cổng này cũng đã mù với
//    chúng — cổng XANH mà không phủ hết, đúng thứ `ci-trigger-paths.md` gọi là 'vắng lỗi ≠ đúng'.
//    `.*` tham lam vẫn an toàn khi tham số có generic: regex quay lui về `>` đúng chỗ.
const METHOD_RE = /^\s*public\s+(?:virtual\s+|override\s+|async\s+|static\s+)*Task(?:<.*>)?\s+(\w+)\s*\(/;

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
  let newMethods = 0;
  for (const file of changedFiles(base, APPSERVICE_RE)) {
    const lines = isNewFile(base, file)
      ? readFileSync(file, 'utf8').split('\n').map((text, i) => ({ line: i + 1, text }))
      : addedLines(base, file);

    for (const { line, text } of lines) {
      const m = METHOD_RE.exec(text);
      if (!m) continue;
      const method = m[1];
      if (lineIsExempt(file, line, 'contract-exempt')) continue;
      newMethods++;

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

  // Đơn vị đo là endpoint đọc được từ api-definition: nhánh (a) quét TOÀN BỘ, nhánh (b) là tập con
  // trong diff. `all.length === 0` nghĩa là service trả định nghĩa rỗng — không đo được, không phải đạt.
  // ⛔ Đơn vị đo là SỐ METHOD MỚI, không phải kích thước api-definition.
  //    Trước 18/08 chỗ này truyền `all.length` (2413) ⇒ cổng in ✅ "đã kiểm 2413 endpoint" trong khi
  //    nó kiểm đúng 0 method của lượt đó. PASS mà không chứng minh gì — đúng thứ `verdict()` sinh ra
  //    để chặn. Đã trả giá thật ở `CTC-FR-03-UC01`: 3 endpoint mới không được cổng nào soi, phải
  //    kiểm tay trên api-definition mới biết đạt. Xem `gaps.md` G-14.
  return verdict(id, title, findings, newMethods, `method mới (đối chiếu ${all.length} endpoint sống)`);
}
