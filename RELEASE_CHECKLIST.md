# Daftar periksa sebelum rilis

Untuk pemilik non-DevOps. Kerjakan dari atas ke bawah. Jangan mempublikasikan Release sebelum bagian 1–3 selesai.

## 1. Dapat diselesaikan oleh pemilik proyek

- [ ] Baca `docs/CONTENT_SOURCES.md` dan pastikan pernyataan asal konten sudah benar menurut Anda; koreksi bila ada yang keliru
- [ ] Periksa contoh teks di `crates/dekri-core/data/materi.json` yang paling mirip definisi standar; ubah ke kalimat Anda sendiri bila ragu
- [ ] Baca ketentuan layanan yang berlaku untuk logo Anda dan simpan salinan/tanggalnya
- [ ] Putuskan lisensi konten (kasus, kunci, materi, logo): tetap “tidak otomatis MIT” (kondisi sekarang) atau pilih lisensi (mis. Creative Commons). Catat keputusan di `docs/LICENSING.md`
- [ ] Putuskan apakah nama/logo DEKRi Lab dilarang dipakai untuk produk turunan (tambahkan satu kalimat di README)
- [ ] Putuskan nama pemegang hak cipta di `LICENSE` (kini “Ridhwan”)
- [ ] Putuskan kontak publik privasi/keamanan (opsional; tanpa kontak pun boleh, lihat `SECURITY.md`)
- [ ] Simpan `PREPUBLICATION_AUDIT_PRIVATE.md` di luar folder repositori

## 2. Dapat diselesaikan melalui GitHub

Panduan langkah demi langkah: `docs/GITHUB_SETUP.md`.

- [ ] Aktifkan secret scanning + push protection, Dependabot alerts, private vulnerability reporting
- [ ] Atur ruleset cabang `main` dan aturan tag `v*`
- [ ] Push, lalu pastikan tab Actions hijau (job Linux dan job Windows di `ci.yml`)
- [ ] Isi kotak About, topics, dan gambar pratinjau sosial sesuai `docs/GITHUB_SETUP.md`
- [ ] Rilis: buat tag `vX.Y.Z` sama dengan versi di `Cargo.toml`; workflow membuat Release **draf**; tinjau berkas lalu publikasikan sendiri

## 3. Memerlukan pengujian Windows

Pemasang NSIS dibangun di `windows-latest` tetapi belum pernah dipasang dan dijalankan oleh pengembang. Unduh draf rilis dan uji di Windows 10/11 bersih:

- [ ] Pemasang membuka wizard dengan halaman **pilih folder**; ubah folder lalu pasang
- [ ] Ikon, nama “DEKRi Lab”, pintasan Desktop dan Start Menu benar; aplikasi terbuka dari pintasan
- [ ] Masuk dengan nama, isi beberapa jawaban, tutup, buka lagi; progres tetap ada
- [ ] Cadangan otomatis muncul di `Dokumen\Latihan Siklus Akuntansi\Cadangan`; impor cadangan berhasil
- [ ] “Cetak / simpan PDF” di Laporan membuka laporan di peramban
- [ ] Uninstall dari Pengaturan Windows menghapus program dan pintasan tetapi **tidak** menghapus progres (sesuai `PRIVACY.md`)
- [ ] Versi ZIP: ekstrak ke folder lain, `dekri-lab.exe` berjalan
- [ ] Cocokkan `SHA256SUMS.txt` dengan berkas yang diunduh
- [ ] Catat bahwa SmartScreen dapat memperingatkan karena pemasang belum ditandatangani

## 4. Memerlukan pemeriksaan hukum atau administratif

Bukan nasihat hukum; hal-hal ini sebaiknya dikonsultasikan bila Anda ingin kepastian.

- [ ] PDKI: ulangi pencarian persis “DEKRi Lab”, simpan tangkapan layar bertanggal, lalu cari variasi (DEKRI, DEKRi Labs, pelafalan serupa) dan merek gambar/logo; pertimbangkan Kelas 9, 41, 42 (`docs/BRAND_CHECK.md`)
- [ ] AHU Online: cek kemiripan nama perusahaan dan bank fiktif dalam kasus (mis. PT Sumber Cahaya Elektrindo, Bank Arunika, Bank Cendana) dengan badan usaha nyata
- [ ] Bila ingin mendaftarkan merek atau memastikan status hak atas logo dan materi: konsultasi konsultan HKI
- [ ] Verifikasi rujukan paragraf PSAK 207/118 pada soal arus kas dan tanggal pengesahan PSAK 118 di `crates/dekri-core/data/arus-kas.json` terhadap SAK Online
- [ ] Keputusan code signing (membutuhkan sertifikat berbayar); tanpa itu rilis tetap boleh dengan peringatan yang dijelaskan

## 5. Sudah selesai dan memiliki bukti

| Item | Bukti |
| --- | --- |
| Tidak ada koneksi keluar dari aplikasi (hanya soket lokal 127.0.0.1 milik Dioxus) | `Cargo.toml` (tanpa pustaka HTTP), `docs/SECURITY_ARCHITECTURE.md` |
| Lisensi dependensi permisif; pemberitahuan pihak ketiga | `THIRD_PARTY_NOTICES.md` (dibuat dari `Cargo.lock`) |
| Aksi GitHub dikunci ke SHA; Cargo.lock dipakai dengan `--locked` | `.github/workflows/*.yml`, `docs/BUILD.md` |
| Rilis berstatus draf, tag harus sama dengan versi | `.github/workflows/release.yml` |
| Seluruh tes (73) dan paritas dengan workbook | `cargo test --workspace`, `docs/TESTING.md` |
| Penafian, privasi, keamanan, cakupan lisensi, provenance, atribusi logo, catatan merek | `DISCLAIMER.md`, `PRIVACY.md`, `SECURITY.md`, `docs/LICENSING.md`, `docs/CONTENT_SOURCES.md`, `docs/ASSET_ATTRIBUTION.md`, `docs/BRAND_CHECK.md` |
