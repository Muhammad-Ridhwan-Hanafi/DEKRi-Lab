# Catatan audit dan batasan

Ringkasan temuan audit mandiri atas aplikasi (bukan audit pihak ketiga).

## Temuan yang diperbaiki

- `parseRupiah` memotong atau kehilangan presisi pada angka sangat besar; kini dibatasi `MAX_RUPIAH` dan hanya menerima `-` di depan.
- Teks Materi menyebut Sewa Dibayar di Muka sebelum penyesuaian 108 juta; mesin menghitung 129 juta (108 juta adalah hasil AJ01). Teks dan tes dikoreksi.
- Petunjuk bertahap membocorkan angka antara lewat teks perhitungan; `maskCalc` kini menutup angka yang sama dengan nominal baris jurnal.
- Daerah gulir pada tabel analisis tidak dapat difokus keyboard (axe); diberi `tabIndex`, `role="region"`, dan label.
- Desktop: izin perangkat, webview, dan pemanggil IPC dari luar halaman aplikasi kini ditolak.

## Keterbatasan yang diketahui

- **Kunci jawaban ada di dalam bundel JavaScript** dan hanya disembunyikan di UI. Aplikasi ini bukan alat ujian yang aman dari kecurangan.
- EXE Windows belum pernah dijalankan di Windows; verifikasi hanya lewat Electron di Linux (xvfb).
- Ctrl+P belum diuji di Windows asli.
- Hanya satu periode laba rugi, sehingga analisis tren tidak tersedia.
- Teks materi tidak diverifikasi terhadap PSAK resmi; ambang kuis adalah pilihan penulis.
- Uji aksesibilitas otomatis hanya membuka tab bawaan tiap halaman.
