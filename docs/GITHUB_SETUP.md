# Panduan pengaturan GitHub (untuk pemilik)

Langkah ini dilakukan **oleh pemilik di GitHub**; berkas di repositori tidak bisa mengaktifkannya. Urutan disarankan sebelum membuat repositori publik.

## Sebelum mengunggah

1. Buat repositori **privat** dulu. Unggah, jalankan CI, periksa hasilnya, baru ubah ke publik.
2. Pastikan tidak ada berkas rahasia/cadangan dan `PREPUBLICATION_AUDIT_PRIVATE.md` tidak ikut.
3. Riwayat Git sebelumnya belum diaudit (arsip yang diaudit tidak berisi `.git`). Bila repositori baru dibuat dari nol, tidak ada riwayat yang perlu diperiksa.

## Pengaturan (Settings)

| Pengaturan                             | Lokasi                       | Catatan                                                     |
| -------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| Secret scanning + push protection      | Settings > Code security     | gratis untuk repositori publik                              |
| Private vulnerability reporting        | Settings > Code security     | setelah aktif, `SECURITY.md` bisa merujuknya                |
| Dependabot alerts dan security updates | Settings > Code security     | konfigurasi pembaruan ada di `.github/dependabot.yml`       |
| Code scanning (CodeQL default setup)   | Settings > Code security     | opsional, gratis untuk publik                               |
| Aturan cabang `main` (ruleset)         | Settings > Rules             | wajib PR, wajib CI lulus, blokir force push dan penghapusan |
| Aturan tag `v*`                        | Settings > Rules             | hanya pemilik yang boleh membuat tag rilis                  |
| Actions: izin token default “Read”     | Settings > Actions > General | workflow sudah mendeklarasikan izin sendiri                 |
| Actions: batasi aksi yang diizinkan    | Settings > Actions > General | izinkan hanya aksi milik GitHub bila memungkinkan           |
| Kolaborator                            | Settings > Collaborators     | pastikan hanya orang yang Anda kehendaki                    |

## Setelah publik

Periksa tab Security dan Actions, lalu uji alur rilis dengan tag percobaan di repositori privat/uji sebelum tag nyata pertama.
