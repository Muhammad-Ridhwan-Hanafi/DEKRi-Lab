// Tes asap antarmuka (WebView2 di Windows) lewat Chrome DevTools Protocol.
// Aplikasi dijalankan dengan WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 dan DEKRI_USER=Smoke.
// Pemakaian: node tests/ui/smoke.cjs   (butuh: npm i playwright-core)
const { chromium } = require('playwright-core');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failed++;
};

(async () => {
  let browser;
  for (let i = 0; i < 40 && !browser; i++) {
    try {
      browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    } catch {
      await sleep(1000);
    }
  }
  if (!browser) throw new Error('Tidak bisa terhubung ke WebView2 (port 9222).');
  const page = browser.contexts()[0].pages()[0];
  await page.waitForSelector('h1', { timeout: 30000 });

  // 1. Kalkulator: tombol menyisipkan di posisi kursor, bukan di akhir.
  await page.getByRole('button', { name: /Kalkulator/ }).first().click();
  const input = page.locator('[data-calculator] input');
  await input.fill('12+5');
  await input.evaluate((el) => el.setSelectionRange(2, 2));
  await page.locator('[data-calculator]').getByRole('button', { name: '3', exact: true }).click();
  await sleep(300);
  check('kalkulator menyisipkan di kursor', (await input.inputValue()) === '123+5', await input.inputValue());
  check('kursor tepat setelah angka baru', (await input.evaluate((el) => el.selectionStart)) === 3);

  // 2. Bagan akun bisa dicari.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Kasus' }).first().click();
  await page.getByRole('button', { name: 'Bagan akun' }).click();
  const all = await page.locator('[role=status]').filter({ hasText: /akun$/ }).first().innerText();
  await page.getByLabel('Cari akun').fill('piutang');
  await sleep(300);
  const some = await page.locator('[role=status]').filter({ hasText: /akun$/ }).first().innerText();
  check('pencarian bagan akun menyaring', all !== some, `${all} -> ${some}`);

  // 3. Transaksi 65 tidak lagi memuat kalimat "Di luar inti materi".
  await page.getByRole('button', { name: 'Transaksi' }).first().click();
  await page.getByLabel('Cari transaksi').fill('valuta');
  await sleep(300);
  await page.getByText('Pembelian valuta asing').first().click();
  const body = await page.locator('main').innerText();
  check('narasi transaksi 65 bersih', !body.includes('Di luar inti materi'));

  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
