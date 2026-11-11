# Kebijakan keamanan

DEKRi Lab berjalan sepenuhnya offline dan tidak mengirim data ke server mana pun. Rancangan keamanan dijelaskan di `docs/SECURITY_ARCHITECTURE.md`.

## Versi yang didukung

Hanya rilis terbaru yang diberi perbaikan keamanan.

## Melaporkan kerentanan

**Jangan membuka issue publik berisi detail kerentanan.**

- Jika repositori ini mengaktifkan **Private vulnerability reporting** (tab Security > Report a vulnerability), gunakan itu.
- Jika tombol tersebut tidak ada, buka issue publik berjudul “Permintaan kontak keamanan” **tanpa detail teknis**, lalu pemilik akan mengarahkan Anda ke kanal privat.

Sertakan versi, langkah reproduksi, dan dampak. Ini proyek sukarela: tidak ada jaminan waktu respons atau imbalan (bug bounty).

## Cakupan

- Pembungkus Electron (`desktop/`): isolasi konteks, sandbox, jembatan IPC, CSP, penanganan berkas cadangan.
- Impor berkas cadangan JSON.
- Rantai pasok build/rilis (workflow GitHub Actions).

## Di luar cakupan

- Kunci jawaban ada di dalam bundel dan hanya disembunyikan di antarmuka; ini bukan alat ujian anti-curang.
- Serangan yang memerlukan akses fisik/akun Windows pengguna (berkas cadangan tidak dienkripsi; lihat `PRIVACY.md`).
- Installer belum ditandatangani secara digital, sehingga Windows SmartScreen dapat menampilkan peringatan.
