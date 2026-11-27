# Panduan pengaturan GitHub (untuk pemilik)

Langkah di bawah dilakukan **oleh pemilik di GitHub**; berkas di repositori tidak bisa mengaktifkannya. Isinya: cara mengganti isi repositori versi 1 dengan versi 2, teks siap tempel untuk kotak About dan rilis, pengaturan keamanan, dan alur rilis.

## 1. Mengganti isi repositori dengan versi 2

Repositori publik saat ini masih berisi versi 1 (Electron, React, TypeScript; tag terakhir `v1.0.1`). Versi 2 menulis ulang semuanya, jadi pohon berkas diganti total. Riwayat commit versi 1 tetap ada di Git, dan tag `v1.0.1` tetap menunjuk ke versi 1.

Ekstrak ZIP versi 2, lalu dari folder kosong yang akan dipakai:

```bash
git clone https://github.com/Muhammad-Ridhwan-Hanafi/DEKRi-Lab.git
cd DEKRi-Lab
git rm -r -q .                      # kosongkan pohon kerja versi 1 (riwayat tetap aman)
cp -a /jalur/ke/hasil-ekstrak/rs/. .   # salin versi 2, termasuk folder tersembunyi .github
git add -A
git status                          # periksa: tidak ada berkas rahasia, cadangan, atau folder target/
git commit -m "DEKRi Lab 2.0.0: ditulis ulang dengan Rust"
git push origin main
```

Di Windows PowerShell, ganti baris `cp` dengan:

```powershell
Copy-Item -Recurse -Force C:\jalur\ke\hasil-ekstrak\rs\* .
Copy-Item -Recurse -Force C:\jalur\ke\hasil-ekstrak\rs\.github, C:\jalur\ke\hasil-ekstrak\rs\.gitattributes, C:\jalur\ke\hasil-ekstrak\rs\.gitignore .
```

Setelah itu:

1. Buka tab **Actions** dan pastikan alur **CI** hijau (job Linux dan job Windows).
2. Tutup (tanpa menggabungkan) pull request Dependabot lama untuk npm; versi 2 tidak memakai npm lagi. Dependabot kini memantau Cargo dan GitHub Actions (`.github/dependabot.yml`).
3. Isi kotak About dan topics (bagian 2), lalu atur keamanan (bagian 3).
4. Buat rilis (bagian 4).

## 2. Tampilan repositori

### Kotak About

Isi lewat ikon roda gigi di samping "About" pada halaman utama repositori:

- **Description:** `Aplikasi desktop latihan akuntansi offline untuk Windows: dari jurnal sampai laporan keuangan, jawaban diperiksa otomatis. Ditulis dengan Rust, ringan, tanpa internet.`
- **Website:** kosongkan, atau isi dengan `https://github.com/Muhammad-Ridhwan-Hanafi/DEKRi-Lab/releases`.
- **Topics:** `akuntansi`, `latihan-akuntansi`, `laporan-keuangan`, `psak`, `indonesia`, `offline`, `accounting`, `bookkeeping`, `education`, `rust`, `dioxus`, `desktop-app`, `windows`
- Biarkan **Releases** tercentang agar halaman unduhan terlihat. **Packages** dan **Deployments** boleh dihapus centangnya karena tidak dipakai.

### Gambar pratinjau sosial (opsional)

Settings > General > Social preview > Upload an image: pilih `docs/images/social-preview.png` (1280 x 640). Gambar ini muncul saat tautan repositori dibagikan.

### Fitur repositori

Settings > General > Features: biarkan **Issues** aktif (dipakai templat laporan soal, bug, dan saran). **Wikis**, **Projects**, dan **Discussions** boleh dimatikan bila tidak dipakai.

## 3. Pengaturan keamanan dan cabang

| Pengaturan                             | Lokasi                       | Catatan                                                     |
| -------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| Secret scanning + push protection      | Settings > Code security     | gratis untuk repositori publik                              |
| Private vulnerability reporting        | Settings > Code security     | setelah aktif, `SECURITY.md` bisa merujuknya                |
| Dependabot alerts dan security updates | Settings > Code security     | konfigurasi pembaruan ada di `.github/dependabot.yml`       |
| Code scanning (CodeQL default setup)   | Settings > Code security     | opsional, gratis untuk publik                               |
| Aturan cabang `main` (ruleset)         | Settings > Rules             | blokir force push dan penghapusan (lihat langkah di bawah)  |
| Aturan tag `v*`                        | Settings > Rules             | hanya pemilik yang boleh membuat tag rilis                  |
| Actions: izin token default “Read”     | Settings > Actions > General | workflow sudah mendeklarasikan izin sendiri                 |
| Actions: batasi aksi yang diizinkan    | Settings > Actions > General | izinkan hanya aksi milik GitHub bila memungkinkan           |
| Kolaborator                            | Settings > Collaborators     | pastikan hanya orang yang Anda kehendaki                    |

### Proteksi cabang `main` (langkah singkat)

Settings > Rules > Rulesets > New ruleset > New branch ruleset:

1. Beri nama `main`, status **Active**, target **Default branch**.
2. Centang **Restrict deletions** dan **Block force pushes**.
3. Sebagai pemilik tunggal, jangan dulu mewajibkan pull request atau reviu, karena Anda tidak bisa menyetujui PR sendiri. Aktifkan **Require status checks to pass** dan pilih pemeriksaan CI hanya bila Anda bekerja lewat PR.
4. Simpan dengan **Create**.

## 4. Rilis

1. Pastikan `version` di `Cargo.toml` sama dengan versi yang akan dirilis, `CHANGELOG.md` sudah diperbarui, dan `RELEASE_CHECKLIST.md` selesai.
2. Buat dan dorong tag yang sama persis dengan versi: `git tag v2.0.0 && git push origin v2.0.0`.
3. Alur `release.yml` menguji, membangun pemasang dan ZIP di Windows, lalu membuat Release **draf** yang bertanda **Pre-release**, berisi `DEKRi-Lab-Setup-<versi>.exe`, `DEKRi-Lab-windows-x64.zip`, dan `SHA256SUMS.txt`. Teks pembuka otomatis diambil dari `.github/release-notes-header.md`, diikuti daftar perubahan yang dibuat GitHub.
4. Unduh pemasang dari draf, uji di Windows 10 atau 11 bersih (daftar langkah di `RELEASE_CHECKLIST.md`), lalu klik **Publish release**.
5. Untuk rilis stabil nanti, edit rilis, centang **Set as the latest release**, dan lepaskan centang pre-release.

### Teks tambahan untuk rilis 2.0.0 (tempel di bawah teks pembuka)

```markdown
## DEKRi Lab 2.0: ditulis ulang dengan Rust

Isi pelajaran sama seperti versi 1 (kasus, soal, kunci, penjelasan, dan hasil penilaian tidak berubah). Yang baru adalah mesin dan tampilannya.

**Lebih ringan.** Tanpa Node.js dan tanpa peramban yang ikut dibundel; satu berkas program kecil. Pengamatan di Task Manager saat aplikasi diam: versi 1 memakai 209,4 MB untuk 4 proses, versi 2 memakai 6,8 MB untuk proses aplikasinya. WebView2 milik Windows berjalan terpisah dan tidak termasuk angka itu. Perbandingan lengkapnya ada di README.

**Fitur baru:** Latihan Hari Ini, Peta konsep, Bagaimana-jika di Laporan, dampak jurnal ke laporan, penelusuran asal angka, tempel dari Excel ke tabel jurnal, mode Fokus, tema Ikuti sistem, dan pesan yang jelas untuk "Peristiwa ini tidak perlu jurnal". Rincian ada di CHANGELOG.

**Pindah dari versi 1:** masuk dengan nama yang sama; progres dipulihkan dari cadangan otomatis di Dokumen > Latihan Siklus Akuntansi > Cadangan, atau impor cadangan hasil ekspor lewat Pengaturan. Versi HTML mandiri tidak dilanjutkan.
```

Teks pembuka standar (`.github/release-notes-header.md`) menjelaskan berkas mana yang diunduh, kebutuhan sistem, dan peringatan SmartScreen.

## 5. Catatan

- Folder `rs/` di dalam ZIP adalah isi repositori. Jangan ikut menyalin folder `target/` atau `dist/` (sudah dicantumkan di `.gitignore`).
- Pemasang dan biner belum ditandatangani secara digital; ini dijelaskan di README, Penafian, dan teks rilis.
- Bila ingin mengubah teks About atau topics nanti, perbarui juga bagian ini supaya tetap sama dengan yang tampil di GitHub.
