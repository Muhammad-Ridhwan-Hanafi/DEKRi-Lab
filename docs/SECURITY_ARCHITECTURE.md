# Arsitektur keamanan

Ringkasan kontrol yang ada di kode dan cara memeriksanya. Bukan audit pihak ketiga.

## Model ancaman

Aplikasi offline, tanpa akun/server. Risiko utama: (1) berkas cadangan/paket soal JSON yang dibuat pihak lain lalu diimpor pengguna; (2) kode di halaman memanggil proses utama Electron secara tidak semestinya; (3) rantai pasok (dependensi, workflow rilis, installer palsu).

## Kontrol Electron (`desktop/main.cjs`, `preload.cjs`)

| Kontrol            | Implementasi                                                                                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolasi renderer   | `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, `devTools:false`                                                                                                                                                                         |
| Permukaan IPC      | `contextBridge` mengekspos 7 fungsi saja; tidak ada `ipcRenderer`/`require`/akses berkas umum                                                                                                                                                              |
| Validasi pemanggil | semua `ipcMain.handle` dan `app:close-ready` memeriksa `senderFrame.url` sama persis dengan `dist-single/index.html`                                                                                                                                       |
| Navigasi           | `will-navigate` dan `will-redirect` hanya mengizinkan halaman aplikasi; `window.open` ditolak; `will-attach-webview` dibatalkan                                                                                                                            |
| Jaringan           | `webRequest.onBeforeRequest` membatalkan semua URL selain file/data/blob/devtools; izin perangkat ditolak                                                                                                                                                  |
| CSP                | meta CSP pada build mandiri: `default-src 'none'`, `connect-src 'none'`, `object-src/frame-src 'none'`, `base-uri/form-action 'none'`. `script-src`/`style-src` memakai `'unsafe-inline'` karena aplikasi disisipkan ke satu HTML; tidak ada `unsafe-eval` |
| Fuses              | `runAsNode`, `enableNodeOptionsEnvironmentVariable`, `enableNodeCliInspectArguments` dimatikan; `onlyLoadAppFromAsar` dihidupkan (lihat `package.json > build.electronFuses`)                                                                              |
| Instance tunggal   | `requestSingleInstanceLock`                                                                                                                                                                                                                                |

Keterbatasan CSP: `'unsafe-inline'` pada skrip berarti CSP tidak menahan XSS inline; pertahanannya adalah tidak adanya masukan eksternal yang di-render sebagai HTML (React meng-escape teks) dan tidak adanya `dangerouslySetInnerHTML` (periksa dengan `grep -rn dangerouslySetInnerHTML src`).

## Berkas cadangan (`desktop/backup.cjs`)

- Nama pengguna dari halaman dibentuk ulang menjadi `[a-z0-9-]` + potongan hash; tidak ada karakter jalur.
- Isi divalidasi (JSON, `app`, `version`, `state` objek) dan dibatasi 20 MB sebelum menyentuh disk; penulisan atomik (berkas sementara lalu rename).
- Berkas yang berupa tautan simbolik tidak ditulis menembus; pembacaan menolak berkas non-biasa dan terlalu besar.
- Folder tetap di Dokumen pengguna; tidak ada jalur yang diberikan halaman.
- Impor di sisi halaman (`parseBackup`, `parsePack`) memvalidasi bentuk dan membuang isian tidak valid; diuji terhadap `__proto__`/`constructor`.

## Rantai pasok

- `package-lock.json` dengan integrity; `npm ci` di CI; `npm audit --omit=dev` di CI.
- Workflow berizin minimum (`contents: read`; rilis `contents: write` hanya pada job rilis); rilis dibuat sebagai **draf**.
- Aksi GitHub dikunci ke SHA commit lengkap dengan komentar versi (lihat `docs/BUILD.md`); workflow belum pernah dijalankan di GitHub.
- Installer belum ditandatangani kode.

## Cara memeriksa

`npm test` (termasuk `tests/engine/desktop-backup.test.ts`), `xvfb-run -a node e2e/desktop.cjs` (27 pemeriksaan Electron termasuk jaringan diblokir, navigasi dibatalkan, IPC menolak isi asing).
