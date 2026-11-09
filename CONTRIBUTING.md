# Berkontribusi

Terima kasih sudah mau membantu. Aplikasi ini adalah alat belajar akuntansi, jadi **ketepatan angka dan jawaban lebih penting daripada fitur baru**.

## Persiapan

```bash
npm ci
npm run check   # typecheck + semua tes + Prettier
npm run dev
```

Butuh Node.js 20.19+ (disarankan 22).

## Aturan

- Jangan mengubah `appId`, `productName` (package.json) atau `NAME` (desktop/main.cjs): ketiganya menentukan lokasi data pengguna.
- Perubahan pada data soal, kunci jawaban, rumus, atau penilaian harus disertai tes (lihat `tests/engine/` dan `tests/parity/`).
- Jangan menambah dependensi yang memanggil jaringan, CDN, font remote, atau telemetri. Aplikasi harus tetap berjalan offline.
- Jalankan `npm run format` sebelum commit.
- Satu pull request, satu topik. Jelaskan apa yang berubah dan bagaimana mengujinya.

## Melaporkan masalah

Gunakan template issue. Jangan menyalin teks standar akuntansi berhak cipta, aset, atau kode tanpa lisensi yang jelas; dengan berkontribusi Anda menyatakan memiliki hak atas kontribusi dan setuju dilisensikan MIT.
