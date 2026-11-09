# Kebijakan privasi

Berlaku untuk DEKRi Lab (aplikasi desktop dan HTML mandiri).

## Ringkasan

- Aplikasi berjalan **offline**. Tidak ada server, akun daring, telemetri, analitik, iklan, atau pelaporan crash otomatis. Kode tidak memuat permintaan jaringan, dan versi desktop memblokir semua permintaan non-lokal.
- Pengembang **tidak menerima data apa pun** dari penggunaan aplikasi.

## Data yang disimpan di perangkat Anda

| Data                                    | Isi                                                                                                                                       | Lokasi                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Progres latihan                         | jawaban jurnal, penilaian, catatan, riwayat percobaan, pengaturan                                                                         | IndexedDB dan localStorage milik aplikasi (EXE: folder `%APPDATA%\Latihan Siklus Akuntansi`) |
| Nama profil                             | nama yang Anda ketik saat masuk, dipakai untuk memisahkan progres antar pengguna di satu perangkat; **bukan akun dan tidak diverifikasi** | sama seperti di atas                                                                         |
| Cadangan otomatis (hanya EXE/installer) | salinan JSON progres                                                                                                                      | `Dokumen\Latihan Siklus Akuntansi\Cadangan` (7 berkas harian terakhir)                       |
| Cadangan manual                         | berkas JSON yang Anda ekspor sendiri                                                                                                      | lokasi pilihan Anda                                                                          |

Nama folder memakai nama lama aplikasi (“Latihan Siklus Akuntansi”) agar progres dari versi sebelumnya tetap terbaca.

## Hal yang perlu Anda ketahui

- Berkas cadangan **tidak dienkripsi** dan memuat nama profil serta seluruh jawaban Anda. Jangan mengunggahnya ke tempat publik (misalnya lampiran issue GitHub) bila berisi data yang tidak ingin Anda bagikan.
- Jangan memasukkan data pribadi atau data keuangan nyata perusahaan ke dalam latihan; seluruh kasus dalam aplikasi fiktif.
- Menghapus data: hapus folder data aplikasi di atas dan folder Cadangan. Fitur “Reset progres” di Pengaturan menyimpan dulu salinan pengaman progres lama (agar tidak hilang tak sengaja) sehingga data lama masih ada di penyimpanan aplikasi sampai folder datanya dihapus. Menghapus (uninstall) aplikasi **tidak** menghapus progres Anda secara bawaan.
- Aplikasi tidak ditujukan untuk anak di bawah umur tanpa pendampingan orang tua/guru, tetapi tidak mengumpulkan data apa pun dari siapa pun.

## Kontak

Pertanyaan privasi dapat diajukan lewat issue di repositori proyek ini (tanpa menyertakan data pribadi). Kontak pribadi pemilik belum dicantumkan; pemilik dapat menambahkannya di sini setelah memutuskan kanal yang ingin dipublikasikan.

Dokumen ini adalah penjelasan teknis tentang perilaku aplikasi, bukan nasihat hukum. Kepatuhan terhadap UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022) bagi pengguna yang mengelola data pihak lain tetap menjadi tanggung jawab pengguna tersebut.
