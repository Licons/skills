#!/usr/bin/env node
// check-env — hai câu hỏi mà không cổng nào khác hỏi, và cả hai đều từng làm hỏng một lượt thật.
//
//   fresh      Tiến trình đang phục vụ cổng N có ĐÚNG là bản build hiện tại không?   (INV-6)
//   exclusive  Tài nguyên độc quyền này có ai đang giữ không?                        (INV-5)
//
// `fresh`     — B4 và probe B7 đều đọc trạng thái từ "service đang chạy", nên câu đó chỉ có nghĩa khi
//               tiến trình ĐÚNG là bản build hiện tại. Đo theo chuỗi `nguồn ≤ binary ≤ tiến trình`.
// `exclusive` — sở hữu rời nhau ở mức FILE không cứu được khi thứ tranh nhau là tài nguyên RUNTIME
//               (một service, một suite, một DB). Đo n lần song song ⇒ n kết quả không tin được.
//
//
// Dùng:
//   node check-env.mjs fresh --port <n> --src services/<svc>
//   node check-env.mjs exclusive --resource suite:all
// Exit 0 = đạt · 1 = không đạt · 2 = sai cách gọi.

import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch {
    return '';
  }
};

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const die = (msg, code = 1) => {
  console.error(msg);
  process.exit(code);
};

/** PID đang LISTEN trên cổng. Nhiều dòng (IPv4+IPv6) là bình thường, cùng một PID. */
function pidOnPort(port) {
  const out = sh('ss', ['-ltnp']);
  for (const line of out.split('\n')) {
    if (!line.includes(`:${port} `)) continue;
    const m = /pid=(\d+)/.exec(line);
    if (m) return Number(m[1]);
  }
  return null;
}

/** Giờ khởi động tiến trình, epoch giây. */
function processStartedAt(pid) {
  const out = sh('ps', ['-o', 'lstart=', '-p', String(pid)]).trim();
  if (!out) return null;
  const t = Date.parse(out);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

const newestOf = (files) => {
  let newest = 0;
  let where = null;
  for (const f of files) {
    if (!f) continue;
    try {
      const m = Math.floor(statSync(f).mtimeMs / 1000);
      if (m > newest) {
        newest = m;
        where = f;
      }
    } catch {
      /* file vừa bị xoá giữa chừng — bỏ qua */
    }
  }
  return { newest, where };
};

/** mtime mới nhất của mã nguồn đã track trong <src>. Dùng git ls-files: bỏ bin/obj, node_modules. */
const newestSourceMtime = (src) =>
  newestOf(
    sh('git', ['ls-files', src])
      .split('\n')
      .filter((f) => /\.(cs|csproj|json|ts|html|scss)$/.test(f)),
  );

/** mtime mới nhất của artifact đã build trong <src>/**\/bin. Mắt xích giữa mã nguồn và tiến trình. */
const newestBuildMtime = (src) =>
  newestOf(sh('find', [src, '-type', 'f', '-name', '*.dll', '-path', '*/bin/*']).split('\n'));

// Giờ ĐỊA PHƯƠNG, không phải UTC: người đọc so nó với giờ họ vừa sửa file, và lệch 7 tiếng đủ để
// biến một cảnh báo đúng thành một cảnh báo trông như lỗi công cụ.
const fmt = (epoch) => (epoch ? new Date(epoch * 1000).toLocaleString('sv-SE') : '?');

function cmdFresh() {
  const port = arg('port');
  const src = arg('src');
  if (!port || !src) die('cần --port <n> --src <đường-dẫn>', 2);

  const pid = pidOnPort(port);
  if (!pid) {
    die(
      `✗ KHÔNG có tiến trình nào LISTEN trên :${port}.\n` +
        '  Đừng tin bất kỳ số liệu runtime nào lúc này — api-definition, probe, cổng B4 đều vô nghĩa.\n' +
        '  Lưu ý: script start có thể đã in "✓ started" cho một tiến trình không bind được cổng.',
    );
  }

  const started = processStartedAt(pid);
  const src_ = newestSourceMtime(src);
  const bin = newestBuildMtime(src);
  if (!started || !src_.newest) die(`✗ không đọc được giờ khởi động (pid ${pid}) hoặc mtime nguồn trong ${src}`, 1);

  // Đo theo ĐÚNG chuỗi nhân quả — nguồn → binary → tiến trình — chứ không so thẳng nguồn với tiến
  // trình. Hai mắt xích cho hai chẩn đoán khác nhau (rebuild vs restart), và quan trọng hơn: so thẳng
  // sẽ báo đỏ mỗi khi mtime nhích mà nội dung không đổi (`cp` khôi phục, `touch`, checkout lại).
  // Cổng kêu sai chỗ sẽ bị tắt đi — mất luôn cả những lần nó kêu đúng.
  const mins = (a, b) => Math.round((a - b) / 60);
  const tail =
    '\n  Mọi số liệu đọc từ tiến trình này đều nói về MÃ CŨ: api-definition thiếu endpoint vừa viết,\n' +
    '  permission vừa cấp vẫn 403, khoá localization vừa thêm vẫn hiện chuỗi thô.';

  if (bin.newest && src_.newest > bin.newest) {
    die(
      `✗ MÃ NGUỒN MỚI HƠN BẢN BUILD — chênh ${mins(src_.newest, bin.newest)} phút. Cần REBUILD.\n` +
        `  nguồn  ${fmt(src_.newest)}  (${src_.where})\n` +
        `  binary ${fmt(bin.newest)}  (${bin.where})${tail}\n` +
        '  Xử: dotnet build → restart → chạy lại check này.',
    );
  }

  const ref = bin.newest || src_.newest;
  if (started < ref) {
    die(
      `✗ TIẾN TRÌNH CŨ HƠN BẢN BUILD — chênh ${mins(ref, started)} phút. Cần RESTART.\n` +
        `  :${port} ← pid ${pid} khởi động ${fmt(started)}\n` +
        `  binary mới nhất ${fmt(ref)}  (${bin.where ?? src_.where})${tail}\n` +
        `  Xử: kill ${pid} → start lại → chạy lại check này.\n` +
        '  ⚠ Script start có thể in "✓ started" cho tiến trình KHÔNG bind được cổng rồi chết im lặng.',
    );
  }

  console.log(`✓ :${port} ← pid ${pid}, khởi động ${fmt(started)}`);
  console.log(`  binary ${fmt(ref)} · nguồn ${fmt(src_.newest)} — nguồn ≤ binary ≤ tiến trình, số liệu runtime dùng được`);
  process.exit(0);
}

function cmdExclusive() {
  const resource = arg('resource');
  if (!resource) die('cần --resource <suite:x|port:n|db:x>', 2);

  // Mẫu tiến trình cho từng loại tài nguyên. Cố ý HẸP: bắt nhầm còn tệ hơn không bắt, vì cổng kêu
  // sai chỗ sẽ bị người ta tắt đi.
  const PATTERNS = {
    'suite:dotnet': ['dotnet test'],
    'suite:ng': ['ng test', 'karma'],
    'suite:all': ['dotnet test', 'ng test', 'karma'],
  };
  const pats = PATTERNS[resource] ?? [resource.replace(/^proc:/, '')];

  const holders = [];
  for (const p of pats) {
    const out = sh('pgrep', ['-af', p]);
    for (const line of out.split('\n')) {
      if (!line.trim()) continue;
      if (line.includes('check-env.mjs')) continue; // chính mình
      const sp = line.indexOf(' ');
      holders.push({ pid: line.slice(0, sp), cmd: line.slice(sp + 1, sp + 110) });
    }
  }

  if (holders.length === 0) {
    console.log(`✓ \`${resource}\` đang rảnh — an toàn để chiếm`);
    process.exit(0);
  }

  console.error(`✗ \`${resource}\` ĐANG CÓ ${holders.length} tiến trình giữ:`);
  for (const h of holders) console.error(`    pid ${h.pid}  ${h.cmd}`);
  console.error(
    '\n  Chạy chồng lên sẽ tranh CPU và cho số liệu không tin được — triệu chứng hay gặp nhất là\n' +
      '  `ng test` exit 0 mà KHÔNG có dòng `Executed N of M` (Chrome rớt ping vì đói CPU).\n' +
      '  Xử: đợi, hoặc để session chạy MỘT lần rồi cấp số chung cho mọi agent.',
  );
  process.exit(1);
}

const cmd = process.argv[2];
if (cmd === 'fresh') cmdFresh();
else if (cmd === 'exclusive') cmdExclusive();
else die('dùng: check-env.mjs <fresh|exclusive> [--port n --src path] [--resource r]', 2);
