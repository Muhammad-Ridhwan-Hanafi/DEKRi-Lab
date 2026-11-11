// E2E di Chromium sungguhan. Prasyarat: `npm run build` lalu `npm run preview` (port 4173).
// Jalankan: node e2e/run.cjs   (memakai pustaka playwright yang terpasang global/di mesin)
const { chromium } = require('playwright');
const URL_ = process.env.APP_URL || 'http://localhost:4173/';
const results = [];
const test = async (name, fn) => {
  const t0 = Date.now();
  try {
    const extra = await fn();
    results.push({ name, ok: true, ms: Date.now() - t0, extra });
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t0, err: String(e.message || e).split('\n')[0] });
  }
};
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
const PAGES = [
  'dashboard',
  'kasus',
  'transaksi',
  'jurnal',
  'buku-besar',
  'neraca-saldo',
  'penyesuaian',
  'laporan',
  'belajar',
  'buku-pembantu',
  'penutup',
  'koreksi',
  'skenario',
  'varian',
  'pajak',
  'belajar/bab/14',
  'ujian',
  'pengaturan',
];

async function fill(page, prefix, row, code, debit, credit) {
  const acc = page.getByLabel(`${prefix} akun baris ${row}`);
  await acc.click();
  await acc.fill(code);
  await acc.press('Enter');
  await page.locator(`[aria-label="${prefix} debit baris ${row}"]:focus`).waitFor(); // tunggu fokus otomatis pindah ke debit
  if (debit) await page.getByLabel(`${prefix} debit baris ${row}`).fill(String(debit));
  if (credit) await page.getByLabel(`${prefix} kredit baris ${row}`).fill(String(credit));
}

(async () => {
  const browser = await chromium.launch();
  // Layar masuk menutupi aplikasi bila belum ada profil: konteks utama dianggap sudah masuk (sekali per tab).
  const SEED = () => {
    if (!sessionStorage.getItem('e2e-seed')) {
      localStorage.setItem('akuntansi-practice:profile:v1', JSON.stringify({ name: 'Penguji', since: '2024-01-01T00:00:00.000Z' }));
      sessionStorage.setItem('e2e-seed', '1');
    }
  };
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  await ctx.addInitScript(SEED);
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  await page.goto(URL_);
  await page.getByRole('navigation', { name: 'Navigasi utama' }).waitFor();

  await test('jurnal benar -> Periksa -> BENAR, tersimpan setelah reload', async () => {
    await page.goto(URL_ + '#/transaksi/1');
    await fill(page, 'Jurnal 1', 1, '1-1100', 400000000, 0);
    await fill(page, 'Jurnal 1', 2, '3-1000', 0, 400000000);
    await page.getByRole('button', { name: 'Periksa', exact: true }).locator('visible=true').first().click();
    await page.getByText('Benar.').first().waitFor({ timeout: 5000 });
    await page.waitForTimeout(800);
    await page.reload();
    await page.getByLabel('Jurnal 1 akun baris 1').waitFor();
    assert((await page.getByLabel('Jurnal 1 debit baris 1').inputValue()).replace(/\D/g, '') === '400000000', 'nominal tidak tersimpan setelah reload');
  });

  await test('petunjuk bertahap, tandai, dan penjelasan setelah benar', async () => {
    await page.goto(URL_ + '#/transaksi/2');
    await page.getByRole('button', { name: 'Beri petunjuk' }).click();
    await page.getByText('Petunjuk 1:').waitFor();
    await page.getByRole('button', { name: /Petunjuk berikutnya/ }).click();
    await page.getByRole('button', { name: /Petunjuk berikutnya/ }).click();
    await page.getByText('Petunjuk 3:').waitFor();
    await page.getByRole('button', { name: '☆ Tandai' }).click();
    await page.getByRole('button', { name: '★ Ditandai' }).waitFor();
    // transaksi 1 sudah diperiksa BENAR di tes pertama: penjelasan tampil, petunjuk tidak
    await page.goto(URL_ + '#/transaksi/1');
    await page.getByText('Mengapa jawaban ini benar?').waitFor({ timeout: 5000 });
    assert((await page.getByRole('button', { name: 'Beri petunjuk' }).count()) === 0, 'petunjuk masih tampil pada jawaban benar');
  });

  await test('ujian: timer hitung mundur, sesi selamat dari reload, hasil dan riwayat', async () => {
    await page.goto(URL_ + '#/ujian');
    await page.getByLabel('Jumlah soal').fill('2');
    await page.getByLabel('Batas waktu menit').fill('20');
    await page.getByRole('button', { name: 'Mulai ujian' }).click();
    await page.getByRole('timer', { name: 'Sisa waktu' }).waitFor();
    await page.waitForTimeout(900); // sesi disimpan 400 ms setelah perubahan
    await page.reload();
    await page.getByRole('timer', { name: 'Sisa waktu' }).waitFor({ timeout: 8000 });
    await page.getByRole('button', { name: 'Selesai dan nilai' }).click();
    await page.getByRole('button', { name: 'Nilai sekarang' }).click();
    await page.getByText('Hasil ujian').waitFor();
    await page.getByRole('button', { name: 'Ujian baru' }).click();
    await page.getByText('Riwayat ujian').waitFor();
    assert((await page.locator('table tbody tr').count()) >= 1, 'riwayat ujian kosong');
  });

  await test('Ctrl+Z membatalkan isian, Ctrl+Shift+Z mengulangi', async () => {
    await page.goto(URL_ + '#/transaksi/2');
    const acc = page.getByLabel('Jurnal 2 akun baris 1');
    await acc.waitFor();
    await fill(page, 'Jurnal 2', 1, '1-1100', 1000, 0);
    await page.waitForTimeout(1200);
    await fill(page, 'Jurnal 2', 2, '3-1000', 0, 1000);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(150); // beri waktu React menggambar ulang sebelum membaca isian
    const after = (await page.getByLabel('Jurnal 2 kredit baris 2').inputValue()).replace(/\D/g, '');
    assert(after === '' || after === '0', 'Ctrl+Z tidak membatalkan (kredit=' + after + ')');
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(150);
    assert((await page.getByLabel('Jurnal 2 kredit baris 2').inputValue()).replace(/\D/g, '') === '1000', 'Ctrl+Shift+Z tidak mengulangi');
  });

  await test('pencarian Ctrl+K membuka dialog dan menavigasi', async () => {
    await page.goto(URL_ + '#/dashboard');
    await page.keyboard.press('Control+k');
    const dlg = page.getByRole('dialog');
    await dlg.waitFor();
    await dlg.getByRole('textbox').fill('penyusutan');
    await page.waitForTimeout(300);
    assert((await dlg.locator('button, a, li').count()) > 0, 'tidak ada hasil pencarian');
    await page.keyboard.press('Escape');
    await dlg.waitFor({ state: 'detached' });
  });

  await test('kalkulator: Alt+C, hitung, masukkan ke kolom nominal, tersimpan setelah reload, axe bersih', async () => {
    await page.goto(URL_ + '#/transaksi/2');
    const field = page.getByLabel(/debit baris 1$/).first();
    await field.waitFor();
    await field.click();
    await page.keyboard.press('Alt+c');
    const dlg = page.getByRole('dialog', { name: 'Kalkulator' });
    await dlg.waitFor();
    await dlg.getByLabel('Ekspresi').fill('(120.000.000-12.000.000)/5/12*3');
    assert((await dlg.getByTestId('calc-result').textContent()).includes('5.400.000'), 'hasil salah');
    // aksesibilitas dengan kalkulator terbuka
    let axeSrc;
    try {
      axeSrc = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    } catch {}
    if (axeSrc) {
      await page.evaluate(axeSrc);
      const v = await page.evaluate(async () => (await axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => x.id + ':' + x.nodes.length));
      assert(v.length === 0, 'axe: ' + v.join(','));
    }
    await dlg.getByRole('button', { name: 'Masukkan ke kolom nominal' }).click();
    assert((await field.inputValue()) === '5.400.000', 'kolom tidak terisi: ' + (await field.inputValue()));
    await page.waitForTimeout(900);
    await page.reload();
    await page
      .getByLabel(/debit baris 1$/)
      .first()
      .waitFor();
    assert(
      (await page
        .getByLabel(/debit baris 1$/)
        .first()
        .inputValue()) === '5.400.000',
      'tidak tersimpan setelah reload',
    );
    await page.goto(URL_ + '#/dashboard');
    await page.keyboard.press('Alt+c');
    await page.getByRole('dialog', { name: 'Kalkulator' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Kalkulator' }).waitFor({ state: 'detached' });
  });

  await test('penelusuran angka laporan: waktu dari klik sampai panel tampil', async () => {
    await page.goto(URL_ + '#/laporan');
    const btn = page.getByTitle('Klik untuk menelusuri asal angka').first();
    await btn.waitFor();
    const t0 = Date.now();
    await btn.click();
    await page.getByLabel('Asal angka').waitFor({ timeout: 30000 });
    const ms = Date.now() - t0;
    assert(ms < 10000, `penelusuran ${ms} ms (> 10 dtk)`);
    return `${ms} ms (klik pertama, termasuk membangun indeks)`;
  });

  await test('penelusuran angka dengan jawaban kunci terisi penuh (kasus terberat)', async () => {
    const f = process.env.FULL_BACKUP;
    if (!f) return 'dilewati: set FULL_BACKUP=<cadangan JSON berisi semua jawaban>';
    await page.goto(URL_ + '#/pengaturan');
    await page.locator('input[type=file][accept*=json]').setInputFiles(f);
    await page.getByRole('button', { name: 'Ganti progres dengan cadangan' }).click();
    await page.goto(URL_ + '#/laporan');
    await page.getByRole('button', { name: 'Posisi keuangan' }).click();
    const btn = page.getByTitle('Klik untuk menelusuri asal angka').nth(3);
    await btn.waitFor();
    const t0 = Date.now();
    await btn.click();
    await page.getByLabel('Asal angka').waitFor({ timeout: 60000 });
    const first = Date.now() - t0;
    await page.getByRole('button', { name: 'Tutup' }).click();
    const t1 = Date.now();
    await page.getByTitle('Klik untuk menelusuri asal angka').nth(5).click();
    await page.getByLabel('Asal angka').waitFor({ timeout: 60000 });
    const second = Date.now() - t1;
    assert(first < 10000, 'klik pertama ' + first + ' ms');
    return `klik pertama ${first} ms, berikutnya ${second} ms`;
  });

  await test('mode ujian: tanpa umpan balik saat mengerjakan, nilai muncul setelah selesai', async () => {
    await page.goto(URL_ + '#/ujian');
    await page.getByLabel('Jumlah soal').fill('3');
    await page.getByLabel('Jurnal penyesuaian').uncheck();
    await page.getByLabel('Soal skenario').uncheck();
    await page.getByRole('button', { name: 'Mulai ujian' }).click();
    await page.getByText('Soal 1 dari 3').waitFor();
    const body = await page.locator('main').innerText();
    assert(!/BENAR|PERIKSA|Lihat kunci|Benar\./.test(body), 'ada umpan balik/kunci saat ujian berlangsung');
    await page.getByRole('button', { name: 'Selesai dan nilai' }).click();
    await page.getByRole('button', { name: 'Nilai sekarang' }).click();
    await page.getByText('Hasil ujian').waitFor();
    assert(/0 \/ 3/.test(await page.locator('main').innerText()), 'skor soal kosong seharusnya 0 / 3');
    await page.getByRole('button', { name: 'Ujian baru' }).click();
  });

  await test('tautan telusuri: URL laporan/S12/S12_B53 langsung membuka panel asal angka', async () => {
    await page.goto(URL_ + '#/laporan/S12/S12_B53');
    await page.getByLabel('Asal angka').waitFor({ timeout: 15000 });
    assert((await page.getByLabel('Asal angka').innerText()).includes('LABA BERSIH'), 'panel tidak menunjuk laba bersih');
  });

  await test('riwayat Urungkan bertahan setelah reload', async () => {
    await page.goto(URL_ + '#/transaksi/7');
    await fill(page, 'Jurnal 7', 1, '1-1100', 5000, 0);
    await page.waitForTimeout(1500); // tunggu autosave
    await page.reload();
    await page.getByLabel('Jurnal 7 akun baris 1').waitFor();
    await page.waitForTimeout(300);
    assert(!(await page.getByRole('button', { name: /Urungkan/ }).isDisabled()), 'tombol Urungkan nonaktif setelah reload');
  });

  await test('tema gelap berlaku dan bertahan setelah reload', async () => {
    await page.goto(URL_ + '#/pengaturan');
    await page.getByLabel('Gelap').check();
    assert(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'kelas dark tidak terpasang');
    await page.reload();
    assert(await page.evaluate(() => document.documentElement.classList.contains('dark')), 'tema gelap hilang setelah reload');
    await page.getByLabel('Terang').check();
  });

  await test('ekspor cadangan JSON menghasilkan unduhan berisi jurnal', async () => {
    await page.goto(URL_ + '#/pengaturan');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Ekspor cadangan' }).click()]);
    const body = require('fs').readFileSync(await dl.path(), 'utf8');
    assert(/"journal"/.test(body) && body.includes('1-1100'), 'cadangan tidak memuat jurnal yang diisi');
  });

  await test('tidak ada scroll horizontal pada lebar desktop di semua halaman', async () => {
    const bad = [];
    for (const p of PAGES) {
      await page.goto(URL_ + '#/' + p);
      await page.waitForTimeout(250);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) bad.push(`${p}(+${over}px)`);
    }
    assert(bad.length === 0, 'meluap: ' + bad.join(', '));
  });

  await test('tata letak: tidak ada elemen interaktif saling menimpa di daftar transaksi dan skenario', async () => {
    const bad = await (async () => {
      const out = [];
      for (const p of ['transaksi/5', 'skenario', 'penutup']) {
        await page.goto(URL_ + '#/' + p);
        await page.waitForTimeout(400);
        const r = await page.evaluate(() => {
          const els = [...document.querySelectorAll('main button, main aside li span, main label')].filter((e) => e.getBoundingClientRect().width > 0);
          const hits = [];
          for (let i = 0; i < els.length && hits.length < 3; i++) {
            const a = els[i].getBoundingClientRect();
            for (let j = i + 1; j < Math.min(els.length, i + 12); j++) {
              if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
              const b = els[j].getBoundingClientRect();
              const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (w > 4 && h > 4) hits.push((els[i].textContent || '').slice(0, 20) + ' x ' + (els[j].textContent || '').slice(0, 20));
            }
          }
          return hits;
        });
        if (r.length) out.push(p + ': ' + r.join('; '));
      }
      return out;
    })();
    assert(bad.length === 0, bad.join(' | '));
  });

  await test('aksesibilitas (axe WCAG A/AA) bersih di semua halaman', async () => {
    let axe;
    try {
      axe = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    } catch {
      return 'dilewati: axe-core tidak terpasang (npm i -D axe-core)';
    }
    const bad = [];
    for (const p of PAGES) {
      await page.goto(URL_ + '#/' + p);
      await page.waitForTimeout(300);
      await page.evaluate(axe);
      const r = await page.evaluate(() => axe.run({ runOnly: ['wcag2a', 'wcag2aa'] }));
      for (const v of r.violations) bad.push(p + ':' + v.id + '(' + v.nodes.length + ')');
    }
    assert(bad.length === 0, bad.join(', '));
  });

  await test('semua halaman terbuka tanpa error konsol', async () => {
    consoleErrors.length = 0;
    for (const p of PAGES) {
      await page.goto(URL_ + '#/' + p);
      await page.waitForTimeout(250);
    }
    assert(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  });

  await test('offline: setelah dimuat sekali, reload tetap jalan', async () => {
    await page.goto(URL_);
    await page.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
    await page.waitForTimeout(1500);
    await page.reload(); // supaya halaman dikendalikan service worker
    await ctx.setOffline(true);
    await page.reload();
    await page.getByRole('navigation', { name: 'Navigasi utama' }).waitFor({ timeout: 8000 });
    await ctx.setOffline(false);
  });

  // ---- Login (nama saja, tanpa kata sandi): konteks bersih tanpa profil ----
  const loginCtx = async (scheme) => browser.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: scheme });
  const axeSrc = (() => {
    try {
      return require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
    } catch {
      return null;
    }
  })();

  await test('login: layar masuk tampil, validasi, masuk, bertahan setelah reload, ganti pengguna, pilihan cepat', async () => {
    const c = await loginCtx('light');
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await p.goto(URL_);
    await p.locator('.ap-splash').waitFor({ state: 'detached', timeout: 10000 });
    await p.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
    assert((await p.getByRole('navigation', { name: 'Navigasi utama' }).count()) === 0, 'aplikasi tampil sebelum masuk');
    assert((await p.locator('input[type=password]').count()) === 0, 'ada kolom kata sandi');
    assert(await p.evaluate(() => document.activeElement && document.activeElement.id === 'login-name'), 'kolom nama tidak otomatis fokus');
    await p.keyboard.press('Enter');
    await p.getByRole('alert').waitFor();
    await p.keyboard.type('Rina');
    await p.keyboard.press('Enter');
    const nav = p.getByRole('navigation', { name: 'Navigasi utama' });
    await nav.waitFor({ timeout: 8000 });
    assert((await nav.getByTestId('user-name').innerText()) === 'Rina', 'nama tidak tampil di sidebar');
    await p.reload();
    await nav.waitFor({ timeout: 8000 });
    assert((await nav.getByTestId('user-name').innerText()) === 'Rina', 'profil hilang setelah reload');
    await nav.getByRole('button', { name: 'Ganti pengguna' }).click();
    await p.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
    await p.getByRole('button', { name: 'Masuk sebagai Rina' }).click();
    await nav.waitFor();
    assert(errs.length === 0, errs.slice(0, 3).join(' | '));
    await c.close();
  });

  await test('aksesibilitas (axe WCAG A/AA) bersih di semua halaman pada tema gelap', async () => {
    if (!axeSrc) return 'dilewati: axe-core tidak terpasang';
    const c = await browser.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: 'dark' });
    await c.addInitScript(SEED);
    const p = await c.newPage();
    const bad = [];
    for (const path of PAGES) {
      await p.goto(URL_ + '#/' + path);
      await p
        .locator('.ap-splash')
        .waitFor({ state: 'detached', timeout: 10000 })
        .catch(() => {});
      await p.getByRole('navigation', { name: 'Navigasi utama' }).waitFor();
      await p.waitForTimeout(450);
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => (await axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => x.id + ':' + x.nodes.length));
      if (v.length) bad.push(path + ' -> ' + v.join(','));
    }
    await c.close();
    assert(bad.length === 0, bad.slice(0, 4).join(' | '));
  });

  await test('kemajuan belajar tersimpan per nama: Rina berlatih, Bayu mulai dari nol, Rina kembali dan progresnya utuh (juga setelah reload)', async () => {
    const c = await loginCtx('light');
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    const nav = p.getByRole('navigation', { name: 'Navigasi utama' });
    const signIn = async (name) => {
      await p.getByLabel('Nama pengguna').fill(name);
      await p.keyboard.press('Enter');
      await nav.waitFor({ timeout: 8000 });
    };
    const body = () => p.evaluate(() => document.body.innerText);
    await p.goto(URL_);
    await p.locator('.ap-splash').waitFor({ state: 'detached', timeout: 10000 });
    await signIn('Rina');
    // Rina mengisi jurnal transaksi 1 dengan benar lalu menekan Periksa
    await p.goto(URL_ + '#/transaksi/1');
    await p.getByLabel('Jurnal 1 akun baris 1').click();
    await p.keyboard.type('1-1100');
    await p.keyboard.press('Enter');
    await p.locator('[aria-label="Jurnal 1 debit baris 1"]:focus').waitFor(); // fokus berpindah otomatis; jangan berlomba dengannya
    await p.getByLabel('Jurnal 1 debit baris 1').type('400000000');
    await p.getByLabel('Jurnal 1 akun baris 2').click();
    await p.keyboard.type('3-1000');
    await p.keyboard.press('Enter');
    await p.locator('[aria-label="Jurnal 1 debit baris 2"]:focus').waitFor();
    await p.getByLabel('Jurnal 1 kredit baris 2').type('400000000');
    await p.getByRole('button', { name: 'Periksa', exact: true }).click();
    await p.getByText('Benar.').first().waitFor();
    await p.goto(URL_ + '#/dashboard');
    await p.waitForFunction(() => /1\s*benar dari 1 item/.test(document.body.innerText), null, { timeout: 8000 });

    // Bayu: mulai dari nol, dan panduan awal tampil lagi (pengguna baru)
    await nav.getByRole('button', { name: 'Ganti pengguna' }).click();
    await signIn('Bayu');
    await p.waitForFunction(() => /0\s*benar dari 0 item/.test(document.body.innerText), null, { timeout: 8000 });
    assert(/Selamat datang/.test(await body()), 'panduan awal tidak muncul untuk pengguna baru');
    assert((await nav.getByTestId('user-name').innerText()) === 'Bayu', 'nama Bayu tidak tampil');

    // Rina kembali (huruf kecil: nama yang sama); progres utuh, juga setelah reload
    await nav.getByRole('button', { name: 'Ganti pengguna' }).click();
    await p.getByLabel('Nama pengguna').waitFor();
    await signIn('rina');
    await p.waitForFunction(() => /1\s*benar dari 1 item/.test(document.body.innerText), null, { timeout: 8000 });
    await p.reload();
    await nav.waitFor({ timeout: 8000 });
    await p.waitForFunction(() => /1\s*benar dari 1 item/.test(document.body.innerText), null, { timeout: 8000 });
    assert(errs.length === 0, errs.slice(0, 3).join(' | '));
    await c.close();
  });

  await test('login: axe WCAG A/AA bersih (terang dan gelap) dan tidak ada scroll horizontal', async () => {
    if (!axeSrc) return 'dilewati: axe-core tidak terpasang';
    for (const scheme of ['light', 'dark']) {
      const c = await loginCtx(scheme);
      const p = await c.newPage();
      await p.goto(URL_);
      await p.locator('.ap-splash').waitFor({ state: 'detached', timeout: 10000 });
      await p.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
      // sertakan pilihan cepat agar ikut diperiksa
      await p.getByLabel('Nama pengguna').fill('Rina');
      await p.keyboard.press('Enter');
      await p.getByRole('navigation', { name: 'Navigasi utama' }).waitFor();
      await p.getByRole('button', { name: 'Ganti pengguna' }).click();
      await p.getByRole('heading', { name: 'Masuk', exact: true }).waitFor();
      await p.locator('.ap-splash').waitFor({ state: 'detached', timeout: 10000 }); // splash bisa tampil lagi setelah ganti pengguna
      await p.waitForTimeout(500); // tunggu transisi warna tombol selesai agar kontras diukur pada warna akhir
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => (await axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => x.id + ':' + x.nodes.length));
      assert(v.length === 0, scheme + ' axe: ' + v.join(','));
      assert(!(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), scheme + ': scroll horizontal');
      await c.close();
    }
  });

  await browser.close();
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'LULUS' : 'GAGAL'}  ${r.name}  [${r.ms} ms]${r.extra ? '  -> ' + r.extra : ''}${r.err ? '\n        ' + r.err : ''}`);
  }
  console.log(`\n${results.length - failed}/${results.length} lulus`);
  process.exit(failed ? 1 : 0);
})();
