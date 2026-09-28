// Runner Playwright headless cho bước Verify — CHỈ dùng khi người dùng đã đồng ý (Chrome MCP không kết nối).
//
//   PW_OUT=<scratch> node .claude/skills/do-bugs/scripts/pw-run.mjs <scenario.mjs>
//
// Scenario: `export default async (page, shot) => { …; return <json> }`; `await shot('<id>.png', {clip?})`
// lưu vào $PW_OUT/shots/. In ra JSON { out, consoleErrors } (hoặc { error, url } + $PW_OUT/shots/_error.png).
//
// Env: PW_OUT (bắt buộc) · PW_STATE (mặc định $PW_OUT/pw-state.json — đặt tệp KHÁC cho mỗi agent chạy song
// song, ghi chung một tệp là hỏng phiên) · PW_START / PW_READY (trang được bảo vệ để kích hoạt đăng nhập +
// selector báo đã vào app; mặc định danh sách KH 360).
// ⚠️ PW_READY chỉ nghĩa là ĐÃ QUA MÀN LOGIN (thẻ <section> render ngay khi component mount), KHÔNG phải dữ liệu
// đã tải — scenario phải tự chờ tín hiệu dữ liệu thật (response API / số dòng > 0 / giá trị ô) trước khi shot(),
// nếu không sẽ chụp khung đang tải (bay.md 28/09).
// Credential: apps/angular/e2e-playwright/.env (PW_TENANT/PW_USER/PW_PASSWORD) — không in ra.
// Bẫy đã trả giá 28/09 (references/bay.md): vào `/` không bị đưa tới login (trang public) · tenant "Không được
// chọn" ⇒ phải bấm Chuyển đổi rồi CHỜ trang tải lại mới điền form · token local sống rất ngắn ⇒ gặp 401 / màn
// trống thì xoá $PW_STATE rồi chạy lại.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const E2E = path.join(ROOT, 'apps/angular/e2e-playwright');
const { chromium } = createRequire(path.join(E2E, 'package.json'))('playwright');
const OUT = process.env.PW_OUT;
if (!OUT || !process.argv[2]) {
  console.error('usage: PW_OUT=<scratch> node pw-run.mjs <scenario.mjs>');
  process.exit(2);
}
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const STATE = process.env.PW_STATE || path.join(OUT, 'pw-state.json');
const START = process.env.PW_START || 'http://localhost:4200/banking-service/customers';
const READY = process.env.PW_READY || '.customer-list';
let env;
try {
  env = Object.fromEntries(fs.readFileSync(path.join(E2E, '.env'), 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
} catch {
  env = {};
}
const need = ['PW_TENANT', 'PW_USER', 'PW_PASSWORD'].filter(k => !env[k]);
if (need.length) {
  console.error(`thiếu ${need.join(', ')} trong ${path.join(E2E, '.env')} — scripts/localhost.sh start tự ghi tệp này (xem .env.example)`);
  process.exit(2);
}

async function login(page) {
  const user = 'input[name="LoginInput.UserNameOrEmailAddress"]';
  await page.waitForSelector(user, { timeout: 60000 });
  if (/Không được chọn|Not selected/i.test(await page.locator('body').innerText())) {
    await page.click('#AbpTenantSwitchLink');
    await page.fill('#Input_Name', env.PW_TENANT);
    await page.locator('.modal button[type=submit]').first().click();
    await page.waitForFunction(() => !/Không được chọn|Not selected/i.test(document.body.innerText), null, { timeout: 60000 });
    await page.waitForLoadState('load');
    await page.waitForSelector(user, { timeout: 60000 });
  }
  await page.fill(user, env.PW_USER);
  await page.fill('input[name="LoginInput.Password"]', env.PW_PASSWORD);
  await page.locator('button[type=submit][name="Action"]').click();
  try {
    await page.waitForURL(u => !/Account\/Login/.test(String(u)), { timeout: 30000 });
  } catch {
    throw new Error('login stuck: ' + (await page.locator('.alert, .text-danger, .field-validation-error').allInnerTexts()).join(' | '));
  }
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  locale: 'vi-VN',
  ...(fs.existsSync(STATE) ? { storageState: STATE } : {}),
});
const page = await context.newPage();
const errors = [];
page.on('console', m => { if (/NG0\d{3}|ERROR/.test(m.text())) errors.push(m.text().slice(0, 300)); });
const shot = async (name, opts = {}) => { await page.screenshot({ path: path.join(OUT, 'shots', name), ...opts }); return name; };
try {
  await page.goto(START, { waitUntil: 'domcontentloaded' });
  await Promise.race([
    page.waitForURL(/Account\/Login/, { timeout: 45000 }),
    page.waitForSelector(READY, { timeout: 45000 }),
  ]).catch(() => {});
  if (/Account\/Login/.test(page.url())) await login(page);
  await context.storageState({ path: STATE });
  const scenario = (await import(path.resolve(process.argv[2]))).default;
  const out = await scenario(page, shot);
  console.log(JSON.stringify({ out, consoleErrors: errors.slice(0, 10) }, null, 1));
} catch (e) {
  await page.screenshot({ path: path.join(OUT, 'shots', '_error.png') }).catch(() => {});
  console.log(JSON.stringify({ error: String(e).slice(0, 400), url: page.url(), consoleErrors: errors.slice(0, 10) }, null, 1));
  process.exitCode = 1;
} finally {
  await browser.close();
}
