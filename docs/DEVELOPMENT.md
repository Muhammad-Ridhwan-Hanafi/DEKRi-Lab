# Panduan pengembang

## Struktur

```
Cargo.toml               workspace Rust (versi tunggal di [workspace.package])
crates/dekri-core/       mesin tanpa UI: buku besar, laporan (298 sel), penilaian, penutupan, pemeriksaan,
                         generator soal varian, ujian, jalur belajar, cadangan, penjelasan kunci
crates/dekri-ui/         antarmuka Dioxus (WebView) + CSS v1 (biner: dekri-lab)
data/*.json              kasus dan kunci (dibenamkan ke biner lewat include_str!)
crates/dekri-core/data/  materi, modul, tata letak laporan, soal arus kas
tests/parity/            fixture paritas dengan workbook Excel (dipakai crates/dekri-core/tests/parity.rs)
installer/               skrip pemasang NSIS dan build.ps1
tools/                   skrip Python pendukung data (lihat di bawah)
build/, assets/brand/    ikon dan sumber logo
```

## Menjalankan

```bash
cargo run -p dekri-ui --release
cargo test --workspace
```

Linux butuh GTK 3 dan webkit2gtk (daftar paket di `docs/BUILD.md`); Windows butuh Microsoft Edge WebView2 Runtime, yang sudah ada di Windows 11 dan sebagian besar Windows 10.

## CSS

CSS (`crates/dekri-ui/assets/main.css`) di-commit dan dibenamkan ke biner. Bila Anda menambah kelas Tailwind baru di `crates/dekri-ui/src`, bangun ulang dengan `python3 tools/css/build.py <folder-berisi-tailwindcss-cli>` (folder itu berisi `node_modules/.bin/tailwindcss` v4; hanya alat pengembangan) sebelum `cargo build`. Token warna, tipografi, dan varian komponen (tombol, kartu, badge, callout, tabel data) ada di `docs/DESIGN-SYSTEM.md`; pakai kelas komponen itu, jangan warna mentah.

## Prinsip

- `dekri-core` murni: tidak ada UI, jaringan, atau waktu tersembunyi, sehingga semuanya bisa diuji. Hasil penilaian dan laporan harus sama dengan workbook Excel sumber (lihat `docs/TESTING.md`).
- Penilaian memakai saldo bersih per akun dengan toleransi Rp1.000.
- Jangan mengubah nama folder data (`Latihan Siklus Akuntansi` di `%APPDATA%`) atau folder cadangan (`Dokumen\Latihan Siklus Akuntansi\Cadangan`): keduanya menentukan lokasi progres pengguna. Pratinjau 2.0 sempat memakai `DEKRi Lab`; isinya disalin satu kali ke folder yang benar bila ada.
- Format cadangan sama dengan versi web lama (`BACKUP_APP = 'akuntansi-practice'`), sehingga cadangan lama masih bisa diimpor. Jangan diubah tanpa jalur migrasi.
- Perubahan data soal, kunci, rumus, atau penilaian harus disertai tes.
- Jangan menambah dependensi yang memakai jaringan.

## Penjelasan kunci

`crates/dekri-core/src/explain.rs` menyusun penjelasan dari kunci itu sendiri: Intinya, Perhitungan (bila ada), Mengapa dicatat begini (satu baris per akun, arah perubahan dihitung dari jenis akun dan sisi normalnya, akun pengurang dikenali), dan Ingat. Peristiwa tanpa jurnal hanya menampilkan alasannya. Teks tidak menambah klaim akuntansi baru di luar data kunci.

## Tangkapan layar dan debug

Variabel lingkungan berikut hanya berguna saat pengembangan (`DEKRI_DEMO` hanya bekerja pada build debug):

- `DEKRI_USER=Nama` melewati layar masuk; `DEKRI_PAGE=Laporan` membuka halaman tertentu; `DEKRI_SEL=3` memilih soal.
- `DEKRI_THEME=dark` memilih tema gelap; `DEKRI_SIZE=1366x820` mengatur ukuran jendela awal (minimum 1024x640).
- `DEKRI_CALC=1`, `DEKRI_SEARCH=1`, `DEKRI_HELP=1` membuka kalkulator, pencarian, dan bantuan; `DEKRI_EXAM=run|done` membuka ujian; `DEKRI_KASUS_TAB=2` memilih tab Kasus; `DEKRI_TRACE=S12_B53` membuka penelusuran sel Laporan.
- `DEKRI_DEMO=1` mengisi jawaban dari kunci. Tangkapan layar diambil dari luar (mis. `import -window root` di bawah Xvfb); tidak ada variabel untuk itu.
- `AKUNTANSI_BACKUP_DIR=folder` mengganti folder cadangan (untuk pengujian).

Tanpa layar: `xvfb-run -a -s "-screen 0 1280x800x24" target/debug/dekri-lab`.

## Skrip pendukung (`tools/`)

- `extract_workbook.py`: mengekstrak kasus dan kunci dari workbook sumber ke `data/*.json` (workbook tidak ada di repositori).
- `gen_industri.py`: membuat `data/industri-packs.json` dan memverifikasi tiap paket (jurnal seimbang, saldo tidak di sisi yang salah).
- `gen_notices.py`: membuat `THIRD_PARTY_NOTICES.md` dari `Cargo.lock`.

## Cadangan dan data

- Progres: `%APPDATA%\Latihan Siklus Akuntansi\state-<nama>.json`, `users.json`, dan `tampilan.json` (tema). Di Linux: `~/.local/share/dekri-lab`; di macOS: `~/Library/Application Support/DEKRi Lab`.
- Cadangan otomatis: 7 berkas harian terakhir per pengguna di `Dokumen\Latihan Siklus Akuntansi\Cadangan`, ditulis atomik, tidak menyentuh berkas lain, menolak tautan simbolik dan berkas di atas 20 MB. Saat `state` belum ada, progres dipulihkan dari cadangan terbaru.
- Ekspor dan impor manual: Pengaturan. Undo/redo: Ctrl+Z / Ctrl+Y. Kalkulator: Alt+C. Pencarian: Ctrl+K.

## Keterbatasan versi Rust dibanding versi web lama

- "Cetak / simpan PDF" membuat HTML di folder sementara lalu membukanya di peramban (Cetak > Simpan sebagai PDF); tidak ada pembuatan PDF langsung.
- Tidak ada ekspor Excel (juga tidak ada di versi web lama).
- Tidak ada tes otomatis klik/interaksi antarmuka yang andal; hanya hook env, tes unit, dan `tests/ui/smoke.cjs` (eksperimental).
