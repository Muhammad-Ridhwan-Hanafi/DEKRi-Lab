// Pembungkus Electron: menampilkan dist-single/index.html (aplikasi sudah mandiri dan offline).
const { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } = require('electron');
const backup = require('./backup.cjs');
const path = require('path');

// NAME menentukan lokasi data (AppData) dan cadangan: JANGAN diubah agar progres lama tetap terbaca.
const NAME = 'Latihan Siklus Akuntansi';
// Nama tampilan produk (judul jendela, ikon). Tidak memengaruhi penyimpanan.
const DISPLAY_NAME = 'DEKRi Lab';
// Progres (IndexedDB) disimpan di folder tetap AppData\Roaming\<NAME>: tidak bergantung pada lokasi EXE, folder ekstraksi portable, atau TEMP.
app.setName(NAME);
app.setPath('userData', path.join(app.getPath('appData'), NAME));

// Cadangan otomatis ditulis ke Dokumen\Latihan Siklus Akuntansi\Cadangan (bisa diganti lewat AKUNTANSI_BACKUP_DIR, dipakai untuk pengujian).
const backupDir = () => process.env.AKUNTANSI_BACKUP_DIR || path.join(app.getPath('documents'), NAME, 'Cadangan');
// Hanya halaman aplikasi sendiri (file:// di folder aplikasi) yang boleh memanggil IPC.
const appPage = () => path.join(__dirname, '..', 'dist-single', 'index.html');
const fromApp = (e) => {
  try {
    const u = new URL(e.senderFrame.url);
    return u.protocol === 'file:' && path.resolve(decodeURIComponent(u.pathname.replace(/^\/([A-Za-z]:)/, '$1'))) === path.resolve(appPage());
  } catch {
    return false;
  }
};
const guard =
  (fn) =>
  (e, ...a) => {
    if (!fromApp(e)) throw new Error('Pemanggil tidak diizinkan.');
    return fn(...a);
  };
ipcMain.handle(
  'backup:write',
  guard((text, user) => backup.writeBackup(backupDir(), text, undefined, user)),
);
ipcMain.handle(
  'backup:read',
  guard((user) => backup.readLatest(backupDir(), user)),
);
ipcMain.handle(
  'backup:info',
  guard((user) => backup.info(backupDir(), user)),
);
ipcMain.handle(
  'backup:open',
  guard(async () => {
    require('fs').mkdirSync(backupDir(), { recursive: true });
    return shell.openPath(backupDir());
  }),
);

ipcMain.handle(
  'app:pdf',
  guard(async (name) => {
    if (!win || win.isDestroyed()) return { ok: false, error: 'Jendela tidak tersedia.' };
    const safe = String(name || 'laporan')
      .replace(/[^\w .-]+/g, '_')
      .slice(0, 80);
    const r = await dialog.showSaveDialog(win, { defaultPath: safe + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    const data = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4', landscape: false });
    require('fs').writeFileSync(r.filePath, data);
    return { ok: true, path: r.filePath };
  }),
);

if (!app.requestSingleInstanceLock()) app.quit();

let win;
app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // Aplikasi offline: tidak butuh izin perangkat apa pun (kamera, mikrofon, lokasi, notifikasi, dll.).
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  // Lapis kedua di bawah CSP: tidak ada permintaan jaringan sama sekali (hanya file:, data:, blob:, dan devtools internal).
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(file|data|blob|devtools|chrome-extension):/i.test(d.url) }));
  win = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 640,
    title: DISPLAY_NAME,
    icon: path.join(__dirname, 'dekri-lab.ico'),
    backgroundColor: '#F8FAFC',
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, devTools: false, preload: path.join(__dirname, 'preload.cjs') },
  });
  // Saat ditutup, beri halaman kesempatan menyimpan cadangan terakhir (maks 2,5 detik), lalu tutup.
  let closing = false;
  const forceClose = () => {
    closing = true;
    if (win && !win.isDestroyed()) win.close();
  };
  ipcMain.on('app:close-ready', (e) => {
    if (fromApp(e)) forceClose();
  });
  win.on('close', (e) => {
    if (closing) return;
    e.preventDefault();
    closing = true;
    win.webContents.send('app:before-close');
    setTimeout(forceClose, 2500);
  });
  win.on('page-title-updated', (e) => e.preventDefault()); // judul jendela tetap
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // Hanya halaman aplikasi sendiri yang boleh dimuat; navigasi/redirect ke berkas lokal lain atau alamat luar dibatalkan.
  const isAppUrl = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === 'file:' && path.resolve(decodeURIComponent(u.pathname.replace(/^\/([A-Za-z]:)/, '$1'))) === path.resolve(appPage());
    } catch {
      return false;
    }
  };
  win.webContents.on('will-navigate', (e, url) => {
    if (!isAppUrl(url)) e.preventDefault();
  });
  win.webContents.on('will-redirect', (e, url) => {
    if (!isAppUrl(url)) e.preventDefault();
  });
  // Tanpa menu, Electron tidak punya pintasan cetak; Ctrl+P membuka dialog cetak seperti di peramban.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.control && !input.shift && input.key.toLowerCase() === 'p') {
      e.preventDefault();
      win.webContents.print();
    }
  });
  win.loadFile(path.join(__dirname, '..', 'dist-single', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
