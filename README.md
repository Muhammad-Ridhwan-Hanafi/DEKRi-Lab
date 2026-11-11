# DEKRi Lab

**Belajar • Berlatih • Menguasai Akuntansi**

DEKRi Lab adalah aplikasi untuk berlatih akuntansi dari awal sampai akhir: mencatat jurnal, buku besar, penyesuaian, laporan keuangan, sampai penutupan buku. Jawaban Anda diperiksa otomatis, dan ada petunjuk bertahap kalau Anda buntu. Contoh kasusnya perusahaan rekaan, PT Sumber Cahaya Elektrindo.

![Tampilan aplikasi, tema terang](docs/images/aplikasi-terang.png)

## Yang perlu Anda tahu

- **Tidak butuh internet.** Setelah terpasang, semuanya jalan di komputer Anda.
- **Tidak ada akun, tidak ada pengiriman data.** Progres belajar hanya tersimpan di komputer Anda.
- **Gratis dan terbuka.**

## Cara memakai (pilih salah satu)

### Cara 1: Pasang di Windows

1. Buka halaman **Releases** repositori ini (menu di sisi kanan halaman GitHub).
2. Unduh berkas yang namanya diawali `DEKRi-Lab-Setup`, berakhiran `.exe`.
3. Klik dua kali berkas itu, lalu klik **Next** sampai selesai.
4. Buka **DEKRi Lab** dari ikon di Desktop atau menu Start.

Saat pertama kali, Windows bisa menampilkan peringatan biru "Windows protected your PC". Penyebabnya, installer ini belum memiliki tanda tangan digital berbayar. Unduh hanya dari halaman Releases repositori ini. Jika yakin, klik **More info**, lalu **Run anyway**.

### Cara 2: Tanpa memasang apa pun

1. Di halaman **Releases**, unduh berkas `DEKRi-Lab.html`.
2. Klik dua kali. Berkas akan terbuka di Chrome atau Edge.

Catatan: simpan berkas ini di satu tempat tetap dan jangan dipindahkan, karena progres tersimpan berdasarkan lokasi berkas. Kalau perlu pindah, buka **Pengaturan > Cadangan** dan ekspor dulu.

## Tampilan

![Tema gelap](docs/images/aplikasi-gelap.png)

## Progres dan cadangan

- Versi yang dipasang menyimpan cadangan otomatis di folder **Dokumen > Latihan Siklus Akuntansi > Cadangan**. Nama folder itu sengaja tidak diubah supaya progres lama tetap terbaca.
- Anda juga bisa mengekspor cadangan sendiri lewat **Pengaturan > Cadangan**.
- Cadangan tidak dienkripsi. Jangan membagikannya ke orang lain kalau tidak ingin jawaban Anda terlihat.

## Penting dibaca

- Ini alat belajar mandiri, **bukan** pengganti standar akuntansi resmi, dan **bukan** nasihat akuntansi, pajak, atau hukum.
- Proyek ini **tidak berafiliasi** dengan IAI (Ikatan Akuntan Indonesia) atau lembaga lain.
- Kunci jawaban ada di dalam aplikasi, jadi aplikasi ini tidak cocok dipakai sebagai alat ujian yang anti-curang.
- Materi dan soal disusun dengan bantuan AI (Claude) berlandaskan standar IAI, lalu disunting pemilik. Logo dibuat dengan ChatGPT. Penjelasan lengkap: [asal konten](docs/CONTENT_SOURCES.md) dan [asal logo](docs/ASSET_ATTRIBUTION.md).
- Rujukan nomor paragraf standar yang bertanda "(cek)" belum diperiksa terhadap teks resmi.

Dokumen lain: [Penafian](DISCLAIMER.md) · [Privasi](PRIVACY.md) · [Keamanan](SECURITY.md) · [Perubahan](CHANGELOG.md) · [Cara berkontribusi](CONTRIBUTING.md)

## Lisensi

Hanya **kode sumber** yang berlisensi [MIT](LICENSE). Logo, kasus, kunci jawaban, dan materi belajar tidak otomatis termasuk lisensi itu (lihat [cakupan lisensi](docs/LICENSING.md)). Font Inter memakai lisensi SIL OFL 1.1, dan pustaka pihak ketiga memakai lisensinya masing-masing ([daftar](THIRD_PARTY_NOTICES.md)).

## Untuk pengembang

Cara menjalankan dari kode sumber, membangun installer, menjalankan tes, dan rincian fitur ada di [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) dan [docs/BUILD.md](docs/BUILD.md).
