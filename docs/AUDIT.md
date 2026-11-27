# Catatan audit dan batasan

Ringkasan temuan pemeriksaan mandiri (bukan audit pihak ketiga).

## Keterbatasan yang diketahui

- **Kunci jawaban ada di dalam biner** dan hanya disembunyikan di antarmuka. Aplikasi ini bukan alat ujian yang aman dari kecurangan.
- Pemasang Windows belum pernah dipasang dan dijalankan di Windows bersih oleh pengembang; yang terbukti hanya kompilasi skrip NSIS di Linux dan tes mesin.
- Tidak ada tes otomatis untuk antarmuka Dioxus.
- Hanya satu periode laba rugi, sehingga analisis tren tidak tersedia.
- Teks materi dan rujukan paragraf PSAK tidak diverifikasi terhadap naskah resmi; ambang kuis adalah pilihan penulis. Soal dapat tidak sesuai dengan PSAK (lihat `DISCLAIMER.md`).
- Fitur versi web lama yang belum ada di versi Rust tercantum di `docs/DEVELOPMENT.md`.

Temuan dan perbaikan sebelum 2.0.0 (parser rupiah, petunjuk yang membocorkan angka, dan lainnya) tercatat di `CHANGELOG.md` dan `docs/RIWAYAT-TEMUAN-WORKBOOK.md`.
