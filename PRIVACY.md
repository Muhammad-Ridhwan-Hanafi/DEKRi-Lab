# Kebijakan privasi

Berlaku untuk DEKRi Lab (aplikasi desktop untuk Windows 10 dan 11).

## Ringkasan

- Aplikasi berjalan **offline**. Tidak ada server, akun daring, telemetri, analitik, iklan, pembaruan otomatis, atau pelaporan crash otomatis. Aplikasi ini sendiri tidak membuat koneksi ke internet.
- Satu-satunya soket jaringan yang dibuka adalah soket lokal (`127.0.0.1`, port acak, dilindungi kunci acak) yang dipakai kerangka antarmuka Dioxus untuk menghubungkan program dengan jendelanya. Soket itu tidak dapat dijangkau dari komputer lain.
- Tampilan memakai Microsoft Edge WebView2, komponen Windows yang dikelola dan diperbarui Microsoft. Perilakunya sendiri (termasuk pembaruan dan data yang disimpannya) mengikuti kebijakan Microsoft, bukan DEKRi Lab.
- Pengembang **tidak menerima data apa pun** dari penggunaan aplikasi.

## Data yang disimpan di perangkat Anda

| Data | Isi | Lokasi |
| --- | --- | --- |
| Progres latihan | jawaban jurnal, penilaian, catatan, riwayat percobaan, pengaturan | berkas JSON (`state-<nama>.json`) di `%APPDATA%\Latihan Siklus Akuntansi` |
| Nama profil | nama yang Anda ketik saat masuk, dipakai untuk memisahkan progres antar pengguna di satu perangkat; **bukan akun dan tidak diverifikasi** | `users.json` di folder yang sama |
| Pilihan tema | Ikuti sistem, Terang, atau Gelap | `tampilan.json` di folder yang sama |
| Cadangan otomatis | salinan JSON progres | `Dokumen\Latihan Siklus Akuntansi\Cadangan` (7 berkas harian terakhir) |
| Cadangan manual | berkas JSON yang Anda ekspor sendiri | lokasi pilihan Anda |
| Salinan pengaman | salinan progres yang dibuat sebelum impor cadangan atau reset | folder Cadangan di atas |
| Berkas cetak laporan | HTML laporan yang dibuat saat Anda menekan tombol cetak | folder sementara Windows |

Kedua folder memakai nama lama aplikasi (“Latihan Siklus Akuntansi”) agar progres dan cadangan dari versi 1 tetap terbaca.

## Hal yang perlu Anda ketahui

- Berkas cadangan **tidak dienkripsi** dan memuat nama profil serta seluruh jawaban Anda. Jangan mengunggahnya ke tempat publik (misalnya lampiran issue GitHub) bila berisi data yang tidak ingin Anda bagikan.
- Jangan memasukkan data pribadi atau data keuangan nyata perusahaan ke dalam latihan; seluruh kasus dalam aplikasi fiktif.
- Menghapus data: hapus kedua folder bernama `Latihan Siklus Akuntansi` (satu di `%APPDATA%`, satu di **Dokumen**, tempat folder Cadangan berada). Tombol “Hapus semua jawaban” di Pengaturan menyimpan dulu cadangan terakhir ke folder Cadangan (agar tidak hilang tak sengaja), jadi data lama masih ada di sana sampai folder itu dihapus. Menghapus (uninstall) aplikasi **tidak** menghapus progres Anda secara bawaan.
- Aplikasi tidak ditujukan untuk anak di bawah umur tanpa pendampingan orang tua/guru, tetapi tidak mengumpulkan data apa pun dari siapa pun.

## Kontak

Pertanyaan privasi dapat diajukan lewat issue di repositori proyek ini (tanpa menyertakan data pribadi). Kontak pribadi pemilik belum dicantumkan; pemilik dapat menambahkannya di sini setelah memutuskan kanal yang ingin dipublikasikan.

Dokumen ini adalah penjelasan teknis tentang perilaku aplikasi, bukan nasihat hukum. Kepatuhan terhadap UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022) bagi pengguna yang mengelola data pihak lain tetap menjadi tanggung jawab pengguna tersebut.
