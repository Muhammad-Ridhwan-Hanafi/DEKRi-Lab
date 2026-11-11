# Daftar periksa sebelum rilis

Untuk pemilik non-DevOps. Kerjakan dari atas ke bawah. Jangan membuat repositori publik atau Release publik sebelum bagian 1–4 selesai.

## 1. Dapat diselesaikan oleh pemilik proyek

- [ ] Baca `docs/CONTENT_SOURCES.md` dan pastikan pernyataan asal konten (dibuat dengan bantuan Claude AI, landasan IAI, disunting Anda) sudah benar menurut Anda; koreksi bila ada yang keliru
- [ ] Periksa contoh teks di `src/data/materi.ts` yang paling mirip definisi standar; ubah ke kalimat Anda sendiri bila ragu
- [ ] Baca ketentuan layanan OpenAI yang berlaku untuk logo Anda dan simpan salinan/tanggalnya
- [ ] Putuskan lisensi konten (kasus, kunci, materi, logo): tetap “tidak otomatis MIT” (kondisi sekarang) atau pilih lisensi (mis. Creative Commons). Catat keputusan di `docs/LICENSING.md`
- [ ] Putuskan apakah nama/logo DEKRi Lab dilarang dipakai untuk produk turunan (tambahkan satu kalimat di README)
- [ ] Putuskan nama pemegang hak cipta di `LICENSE` (kini “Ridhwan”)
- [ ] Putuskan kontak publik privasi/keamanan (opsional; tanpa kontak pun boleh, lihat `SECURITY.md`)
- [x] Nama bank nyata (Mandiri/BCA) sudah diganti nama fiktif (Bank Arunika, Bank Cendana)
- [ ] Simpan `PREPUBLICATION_AUDIT_PRIVATE.md` di luar folder repositori

## 2. Dapat diselesaikan melalui GitHub

Panduan langkah demi langkah: `docs/GITHUB_SETUP.md`.

- [ ] Buat repositori **privat** dulu, unggah, dan tunggu CI hijau (workflow belum pernah dijalankan di GitHub)
- [ ] Aktifkan secret scanning + push protection, Dependabot alerts, private vulnerability reporting
- [ ] Atur ruleset cabang `main` dan aturan tag `v*`
- [ ] Periksa tab Actions dan Security; lalu ubah repositori menjadi publik
- [ ] Rilis: buat tag `vX.Y.Z` sama dengan versi di `package.json`; workflow membuat Release **draf**; tinjau berkas lalu publikasikan sendiri

## 3. Memerlukan pengujian Windows

Installer belum pernah berhasil dibangun lengkap dan dijalankan oleh auditor; di mesin Windows Anda, tes (384) dan build web lulus, tetapi pembuatan installer terakhir berhenti karena unduhan Electron gagal (lihat `docs/BUILD.md`).

- [ ] `bangun-exe.bat` berhasil menghasilkan `release\DEKRi-Lab-Setup-*.exe`
- [ ] Pasang di Windows 10/11 bersih; ikon, nama “DEKRi Lab”, pintasan Desktop/Start Menu benar
- [ ] Buat progres, tutup, buka lagi; progres tetap ada
- [ ] Cadangan otomatis muncul di `Dokumen\Latihan Siklus Akuntansi\Cadangan`; pulihkan dari cadangan berhasil
- [ ] Uninstall tidak menghapus progres (sesuai `PRIVACY.md`)
- [ ] Folder pemasangan memuat `resources\licenses` (LICENSE, THIRD_PARTY_NOTICES, OFL)
- [ ] Catat bahwa SmartScreen dapat memperingatkan karena installer belum ditandatangani

## 4. Memerlukan pemeriksaan hukum atau administratif

Bukan nasihat hukum; hal-hal ini sebaiknya dikonsultasikan bila Anda ingin kepastian.

- [ ] PDKI: ulangi pencarian persis “DEKRi Lab”, simpan tangkapan layar bertanggal, lalu cari variasi (DEKRI, DEKRi Labs, pelafalan serupa) dan merek gambar/logo; pertimbangkan Kelas 9, 41, 42 (`docs/BRAND_CHECK.md`)
- [ ] AHU Online: cek kemiripan nama perusahaan dan bank fiktif dalam kasus (mis. PT Sumber Cahaya Elektrindo, Bank Arunika, Bank Cendana) dengan badan usaha nyata
- [ ] Bila ingin mendaftarkan merek atau memastikan status hak atas keluaran AI/logo: konsultasi konsultan HKI
- [ ] Verifikasi nomor paragraf bertanda “(cek)” terhadap SAK Online (IAI), dan tanggal pengesahan PSAK 118 yang tertulis di `src/data/arus-kas.ts`
- [ ] Keputusan code signing (membutuhkan sertifikat berbayar); tanpa itu rilis tetap boleh dengan peringatan yang dijelaskan

## 5. Sudah selesai dan memiliki bukti

| Item                                                                                   | Bukti                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pemindaian secret (pola umum) pada sumber: 0 temuan                                    | audit ulang Nov 2026; `PREPUBLICATION_AUDIT_PRIVATE.md`                                                                                          |
| Tidak ada panggilan jaringan eksternal; CSP dan pemblokir permintaan aktif             | tes desktop e2e (jaringan, navigasi, IPC)                                                                                                        |
| `npm audit` produksi 0 temuan; 6 moderate hanya alat build                             | `npm audit`                                                                                                                                      |
| Lisensi dependensi terdistribusi permisif; THIRD_PARTY_NOTICES dan SBOM                | `THIRD_PARTY_NOTICES.md`, `npm sbom`                                                                                                             |
| Aksi GitHub dikunci ke SHA                                                             | `.github/workflows/*.yml`, `docs/BUILD.md`                                                                                                       |
| Rilis berstatus draf, tag harus sama dengan versi                                      | `.github/workflows/release.yml`                                                                                                                  |
| Penafian, privasi, keamanan, cakupan lisensi, provenance, atribusi logo, catatan merek | `DISCLAIMER.md`, `PRIVACY.md`, `SECURITY.md`, `docs/LICENSING.md`, `docs/CONTENT_SOURCES.md`, `docs/ASSET_ATTRIBUTION.md`, `docs/BRAND_CHECK.md` |
| Tes unit, e2e web, e2e desktop                                                         | lihat `PREPUBLICATION_AUDIT_PRIVATE.md`                                                                                                          |
