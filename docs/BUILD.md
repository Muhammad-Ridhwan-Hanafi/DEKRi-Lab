# Membangun dan merilis

## Prasyarat

- Rust stabil 1.82 atau lebih baru ([rustup.rs](https://rustup.rs)).
- Linux: pustaka pengembangan `libgtk-3-dev libwebkit2gtk-4.1-dev libxdo-dev libayatana-appindicator3-dev libssl-dev` (Debian/Ubuntu), sama dengan yang dipasang CI.
- Windows: tidak butuh prasyarat tambahan untuk membangun; untuk menjalankan, Microsoft Edge WebView2 Runtime (sudah ada di Windows 11 dan sebagian besar Windows 10).
- Pemasang Windows: [NSIS 3](https://nsis.sourceforge.io) (skrip `installer/build.ps1` memasangnya lewat Chocolatey bila belum ada).

## Perintah

```bash
cargo run -p dekri-ui --release         # jalankan aplikasi
cargo build -p dekri-ui --release       # biner: target/release/dekri-lab(.exe), sekitar 9 MB pada build rilis Linux; butuh WebView2 di Windows 10/11 dan webkit2gtk di Linux
cargo test --workspace                   # semua tes
cargo fmt --all -- --check               # format
cargo clippy --workspace --all-targets -- -D warnings
```

Di Windows, pemasang dan ZIP tanpa pemasangan dibuat dengan satu perintah:

```powershell
powershell -ExecutionPolicy Bypass -File installer\build.ps1   # atau klik dua kali bangun-installer.bat
```

Hasilnya di `dist/`: `DEKRi-Lab-Setup-<versi>.exe` (wizard NSIS dengan pilihan folder, pemasangan per pengguna tanpa hak administrator) dan `DEKRi-Lab-windows-x64.zip`. Skrip pemasang: `installer/dekri-lab.nsi`.

## Rilis

1. Naikkan `version` di bagian `[workspace.package]` pada `Cargo.toml`, jalankan `cargo build` agar `Cargo.lock` ikut berubah, lalu perbarui `CHANGELOG.md`.
2. Jalankan `python3 tools/gen_notices.py` bila `Cargo.lock` berubah, lalu periksa `THIRD_PARTY_NOTICES.md`.
3. Selesaikan `RELEASE_CHECKLIST.md`.
4. Buat tag `vX.Y.Z` yang sama persis dengan versi (workflow menolak bila beda). Workflow `release.yml` menguji, membangun, lalu membuat Release **draf** (bertanda pre-release) berisi pemasang, ZIP, dan `SHA256SUMS.txt`. Pemilik meninjau, mengujinya di Windows bersih, lalu mempublikasikan.

Checksum SHA-256 hanya memastikan berkas tidak berubah sejak dibuat; checksum tidak membuktikan penerbitnya. Pemasang belum ditandatangani kode.

## GitHub Actions dikunci ke SHA commit

Workflow memakai SHA commit lengkap (dengan komentar versi), bukan tag yang bisa dipindahkan. Hanya satu aksi pihak ketiga yang dipakai; Rust dan NSIS dipasang dari runner/Chocolatey.

| Aksi               | Versi  | SHA                                        |
| ------------------ | ------ | ------------------------------------------ |
| `actions/checkout` | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |

Dependabot memperbarui SHA ini dan dependensi Cargo (`.github/dependabot.yml`).

## Catatan pengujian pemasang

Skrip NSIS sudah dikompilasi di Linux (NSIS 3.09) untuk memeriksa sintaks. Pemasang Windows yang sebenarnya baru terbukti saat workflow berjalan di `windows-latest`, dan **belum pernah dipasang dan dijalankan di Windows bersih oleh pengembang**. Ujilah draf rilis di Windows 10/11 bersih sebelum dipublikasikan (daftar langkah di `RELEASE_CHECKLIST.md`).
