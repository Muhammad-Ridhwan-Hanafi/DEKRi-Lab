// Uji pembungkus Electron (Linux/xvfb): persistensi IndexedDB, lokasi aplikasi bebas, instance tunggal, fitur tersembunyi.
// Prasyarat: `npm run build:single`.  Jalankan: xvfb-run -a node e2e/desktop.cjs
const { _electron: electron } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const exe = require(path.join(root, 'node_modules/electron'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-'));
const cfg = path.join(tmp, 'appdata'); // menggantikan %APPDATA%
const bdir = path.join(tmp, 'Dokumen', 'Cadangan'); // menggantikan Dokumen\\Latihan Siklus Akuntansi\\Cadangan
const results = [];
const ok = (name, pass, info) => {
  results.push(pass);
  console.log(`${pass ? 'LULUS' : 'GAGAL'}  ${name}${info ? '  -> ' + info : ''}`);
};

function install(dir) {
  // salinan aplikasi seperti isi paket: main.cjs + dist-single/index.html
  fs.mkdirSync(path.join(dir, 'desktop'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'dist-single'), { recursive: true });
  for (const f of ['main.cjs', 'preload.cjs', 'backup.cjs', 'dekri-lab.ico']) fs.copyFileSync(path.join(root, 'desktop', f), path.join(dir, 'desktop', f));
  fs.copyFileSync(path.join(root, 'dist-single/index.html'), path.join(dir, 'dist-single/index.html'));
  fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"akuntansi-practice","main":"desktop/main.cjs"}');
}
const launch = (dir) =>
  electron.launch({ executablePath: exe, args: ['--no-sandbox', dir], env: { ...process.env, XDG_CONFIG_HOME: cfg, AKUNTANSI_BACKUP_DIR: bdir } });
async function firstWin(app) {
  const w = await app.firstWindow();
  const nav = w.getByRole('navigation', { name: 'Navigasi utama' });
  const login = w.getByLabel('Nama pengguna');
  await nav.or(login).first().waitFor({ timeout: 20000 });
  if (await login.isVisible()) {
    // Profil belum ada (data baru): masuk dengan nama tetap supaya data konsisten antar peluncuran.
    await login.fill('Penguji');
    await w.keyboard.press('Enter');
  }
  await nav.waitFor({ timeout: 20000 });
  return w;
}

(async () => {
  const A = path.join(tmp, 'folderA'),
    B = path.join(tmp, 'folder lain', 'B');
  install(A);
  install(B);

  // 1. tulis progres dari lokasi A
  let app = await launch(A);
  let w = await firstWin(app);
  ok('judul jendela', (await w.title()) === 'DEKRi Lab', await w.title());
  const nav = await w.locator('nav li button').allTextContents();
  ok('menu memuat Ujian', nav.includes('Ujian'), nav.join(', '));
  await w.evaluate(() => (window.location.hash = '#/transaksi/1'));
  const acc = w.getByLabel('Jurnal 1 akun baris 1');
  await acc.click();
  await acc.fill('1-1100');
  await acc.press('Enter');
  await w.getByLabel('Jurnal 1 debit baris 1').fill('400000000');
  await w.waitForTimeout(1500); // autosave 500 ms
  const iso = await w.evaluate(() => ({
    req: typeof window.require,
    proc: typeof window.process,
    bridge: Object.keys(window.desktopBackup || {})
      .sort()
      .join(','),
  }));
  ok('renderer tanpa akses Node (require/process tidak ada)', iso.req === 'undefined' && iso.proc === 'undefined', JSON.stringify(iso));
  ok(
    'jembatan IPC hanya berisi operasi cadangan dan simpan PDF',
    iso.bridge === 'closeReady,info,onBeforeClose,openFolder,readLatest,savePdf,write',
    iso.bridge,
  );
  const deny = await w.evaluate(() =>
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => p.state)
      .catch(() => 'error'),
  );
  ok('izin perangkat (lokasi) tidak diberikan', deny !== 'granted', deny);
  await w.evaluate(() => window.open('https://example.com'));
  await w.waitForTimeout(400);
  ok('window.open ke situs luar diblokir', (await app.windows()).length === 1);
  // Keamanan: tanpa jaringan, tanpa navigasi keluar halaman aplikasi, CSP aktif.
  const net = await w.evaluate(() =>
    fetch('https://example.com', { mode: 'no-cors' })
      .then(() => 'terkirim')
      .catch(() => 'diblokir'),
  );
  ok('permintaan jaringan keluar diblokir (CSP + pemblokir sesi)', net === 'diblokir', net);
  const csp = await w.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || '');
  ok("CSP terpasang: connect-src 'none', default-src 'none'", csp.includes("connect-src 'none'") && csp.includes("default-src 'none'"));
  const before = w.url();
  await w.evaluate(() => {
    window.location.href = 'file:///etc/hostname';
  });
  await w.waitForTimeout(500);
  ok('navigasi ke berkas lokal lain dibatalkan', w.url() === before, w.url().slice(0, 60));
  const bad = await w.evaluate(() =>
    window.desktopBackup
      .write('{"app":"x"}')
      .then(() => 'diterima')
      .catch(() => 'ditolak'),
  );
  ok('IPC menolak isi cadangan yang bukan milik aplikasi', bad === 'ditolak', bad);
  // Simpan PDF sungguhan: dialog simpan diganti agar mengembalikan path uji, lalu berkas PDF diperiksa.
  const pdfPath = require('path').join(cfg, 'uji.pdf');
  await app.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p });
  }, pdfPath);
  await w.evaluate(() => (window.location.hash = '#/analisis'));
  await w.getByRole('button', { name: 'Simpan PDF' }).click();
  await w.getByText(/PDF disimpan:/).waitFor({ timeout: 15000 });
  const pdfHead = require('fs').existsSync(pdfPath) ? require('fs').readFileSync(pdfPath).subarray(0, 5).toString() : '';
  ok('Simpan PDF menulis berkas PDF valid', pdfHead === '%PDF-' && require('fs').statSync(pdfPath).size > 2000, pdfHead);
  const menuNull = await app.evaluate(({ Menu }) => Menu.getApplicationMenu() === null);
  ok('menu bar dinonaktifkan', menuNull);
  await w.keyboard.press('F12');
  await w.keyboard.press('Control+Shift+i');
  await w.waitForTimeout(500);
  ok('DevTools tidak terbuka', await app.evaluate(({ BrowserWindow }) => !BrowserWindow.getAllWindows()[0].webContents.isDevToolsOpened()));

  // 2. instance kedua harus langsung keluar
  const second = spawn(exe, ['--no-sandbox', A], { env: { ...process.env, XDG_CONFIG_HOME: cfg }, stdio: 'ignore' });
  const code = await new Promise((res) => {
    const t = setTimeout(() => (second.kill(), res('masih berjalan')), 8000);
    second.on('exit', (c) => (clearTimeout(t), res(c)));
  });
  ok('instance kedua langsung keluar (satu instance)', code !== 'masih berjalan', String(code));
  ok('jendela pertama masih hidup', (await app.windows()).length === 1);

  await app.close();

  // 3. buka lagi dari lokasi A, lalu dari lokasi B (EXE "dipindahkan")
  for (const [label, dir] of [
    ['lokasi sama', A],
    ['lokasi berbeda (dipindahkan)', B],
  ]) {
    app = await launch(dir);
    w = await firstWin(app);
    await w.evaluate(() => (window.location.hash = '#/transaksi/1'));
    const v = await w.getByLabel('Jurnal 1 debit baris 1').inputValue();
    ok(`progres tetap ada setelah dibuka ulang dari ${label}`, v.replace(/\D/g, '') === '400000000', v);
    await app.close();
  }

  // 4. lokasi data
  const ud = path.join(cfg, 'Latihan Siklus Akuntansi');
  const idb = fs.existsSync(path.join(ud, 'IndexedDB'));
  ok('data ada di folder AppData tetap', idb, ud);
  const leaked = [A, B].some((d) => fs.readdirSync(d).some((f) => /IndexedDB|Local Storage/.test(f)));
  ok('tidak ada data di folder aplikasi', !leaked);

  // 5. cadangan otomatis ke folder Dokumen
  // Cadangan kini per pengguna: akuntansi-cadangan-<nama>-<hash>-terbaru.json
  const findLatest = () => {
    const n = fs.existsSync(bdir) ? fs.readdirSync(bdir).find((f) => /^akuntansi-cadangan-.+-terbaru\.json$/.test(f)) : undefined;
    return n ? path.join(bdir, n) : path.join(bdir, 'tidak-ada.json');
  };
  const debitOf = () => {
    const j = JSON.parse(fs.readFileSync(findLatest(), 'utf8'));
    return j.state.journal['1']?.[0]?.debit;
  };
  app = await launch(A);
  w = await firstWin(app);
  const nav2 = await w.locator('nav li button').allTextContents();
  ok(
    'menu: halaman tambahan tampil',
    ['Analisis', 'Buku Pembantu', 'Latihan Varian', 'Latihan Pajak', 'Jalur Belajar'].every((x) => nav2.includes(x)),
    nav2.join(', '),
  );
  await w.evaluate(() => (window.location.hash = '#/transaksi/1'));
  await w.getByLabel('Jurnal 1 debit baris 1').fill('450000000');
  const t0 = Date.now();
  while (!(fs.existsSync(findLatest()) && debitOf() === 450000000) && Date.now() - t0 < 15000) await w.waitForTimeout(300);
  ok('cadangan otomatis tertulis di folder Dokumen setelah perubahan', fs.existsSync(findLatest()) && debitOf() === 450000000, bdir);
  ok(
    'berkas harian ikut dibuat',
    fs.readdirSync(bdir).some((n) => /^akuntansi-cadangan-.+-\d{4}-\d{2}-\d{2}\.json$/.test(n)),
  );
  await w.evaluate(() => (window.location.hash = '#/pengaturan'));
  const sec = w.getByTestId('cadangan-desktop');
  await sec.waitFor({ timeout: 10000 }).catch(() => {});
  ok('Pengaturan menampilkan bagian cadangan otomatis', await sec.isVisible());
  // simpan saat ditutup: ubah lalu tutup segera, sebelum penundaan 3 detik habis
  await w.evaluate(() => (window.location.hash = '#/transaksi/1'));
  await w.getByLabel('Jurnal 1 debit baris 1').fill('460000000');
  await app.close();
  ok('cadangan ikut tersimpan saat jendela ditutup', debitOf() === 460000000, String(debitOf()));
  const leftovers = fs.readdirSync(bdir).filter((n) => n.endsWith('.tmp'));
  ok('tidak ada berkas sementara tersisa', leftovers.length === 0);

  // 6. pemulihan setelah data aplikasi terhapus
  fs.rmSync(path.join(cfg, 'Latihan Siklus Akuntansi'), { recursive: true, force: true });
  app = await launch(A);
  w = await firstWin(app);
  const banner = w.getByText(/ditemukan cadangan otomatis/i);
  await banner.waitFor({ timeout: 10000 }).catch(() => {});
  ok('banner pemulihan muncul saat progres kosong', await banner.isVisible().catch(() => false));
  await w.getByRole('button', { name: 'Pulihkan sekarang' }).click();
  await w.evaluate(() => (window.location.hash = '#/transaksi/1'));
  const restored = (await w.getByLabel('Jurnal 1 debit baris 1').inputValue()).replace(/\D/g, '');
  ok('progres kembali dari cadangan', restored === '460000000', restored);
  await app.close();

  fs.rmSync(tmp, { recursive: true, force: true });
  const fail = results.filter((r) => !r).length;
  console.log(`\n${results.length - fail}/${results.length} lulus`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(2);
});
