# Membangun dan merilis

## Prasyarat

Node.js 20.19+ (disarankan 22) dan npm. Installer Windows hanya dapat dibangun di Windows (atau Linux/macOS dengan wine); CI memakai `windows-latest`.

## Perintah

```bash
npm ci
npm run check          # typecheck + tes + Prettier
npm run build          # build web
npm run build:single   # satu berkas dist-single/index.html (dipakai EXE)
npm run dist:win       # installer NSIS di release/ (Windows)
```

Di Windows, `bangun-exe.bat` menjalankan langkah yang sama.

## Rilis

1. Perbarui `version` di `package.json` dan `CHANGELOG.md`.
2. Selesaikan `RELEASE_CHECKLIST.md`.
3. Buat tag `vX.Y.Z` yang sama persis dengan versi (workflow menolak bila beda). Workflow membuat Release **draf** berisi installer, `SHA256SUMS.txt`, dan `sbom.cdx.json`; pemilik meninjau lalu mempublikasikan.

Checksum SHA-256 hanya memastikan berkas tidak berubah sejak dibuat; checksum tidak membuktikan penerbitnya. Installer belum ditandatangani kode.

## GitHub Actions dikunci ke SHA commit

Kedua workflow memakai SHA commit lengkap (dengan komentar versi), bukan tag yang bisa dipindahkan:

| Aksi                 | Versi  | SHA                                        |
| -------------------- | ------ | ------------------------------------------ |
| `actions/checkout`   | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |

Cara verifikasi saat audit: halaman rilis github.com menampilkan hash pendek; halaman commit dengan hash lengkap itu dibuka dan judulnya cocok dengan rilis (“prep v7.0.1 release”, “… package.json from 7.0.0 to 7.1.0”). Ini **bukan** verifikasi lewat `git` lokal atau tanda tangan. Pemilik dapat memverifikasi ulang: `gh api repos/actions/checkout/git/ref/tags/v7.0.1 --jq .object.sha`.

Workflow **belum pernah dijalankan di GitHub**; versi mayor aksi naik dari v4 ke v7 dibanding konfigurasi awal, jadi jalankan CI pada repositori privat dulu. Dependabot (`.github/dependabot.yml`) memperbarui SHA dan komentar versinya.

## Catatan pengujian installer

Installer NSIS belum pernah dibangun/dijalankan pada Windows oleh pengembang. Yang telah diuji: paket Electron `--linux dir` (isi asar, fuses, berkas lisensi) dan aplikasi via Electron di Linux. Ujilah installer di Windows 10/11 bersih sebelum rilis publik.
