# Cakupan lisensi

| Komponen                                                                           | Ketentuan                                                                                                                                             | Berkas                                                                         |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Kode sumber aplikasi (Rust, skrip build dan pemasang) | Lisensi MIT | `crates/`, `installer/`, `tools/`, `tests/`, konfigurasi; teks di `LICENSE` |
| Kasus, soal, kunci jawaban, materi pembelajaran, dan data hasil ekstraksi workbook | **Tidak otomatis MIT.** Hak dan ketentuannya belum ditetapkan terpisah oleh pemilik; asalnya dijelaskan di `docs/CONTENT_SOURCES.md` | `data/`, `crates/dekri-core/data/` |
| Logo, lambang, dan ikon DEKRi Lab | **Tidak otomatis MIT.** Asalnya dijelaskan di `docs/ASSET_ATTRIBUTION.md` | `assets/brand/`, `build/icon.*` |
| Nama “DEKRi Lab”                                                                   | Tidak ada klaim merek terdaftar; lihat `docs/BRAND_CHECK.md`                                                                                          | —                                                                              |
| Font Inter | SIL OFL 1.1 | `THIRD_PARTY_NOTICES.md` |
| Dependensi pihak ketiga (pustaka Rust) | Mengikuti lisensi masing-masing | `THIRD_PARTY_NOTICES.md`, `Cargo.lock` |

Untuk saat ini, bagian yang bukan kode sumber **tidak** diberi lisensi terbuka eksplisit. Artinya, secara bawaan hak ciptanya tetap pada pemegang hak dan pihak lain tidak otomatis boleh menyalin ulang atau mendistribusikannya terpisah dari aplikasi. Pemilik dapat memilih lisensi konten (misalnya Creative Commons) bila menghendaki; itu keputusan pemilik dan belum dibuat.

Teks lisensi (`LICENSE`, `THIRD_PARTY_NOTICES.md`) disertakan oleh pemasang di folder `licenses` dalam folder pemasangan, dan oleh versi ZIP di sebelah `dekri-lab.exe` (belum diuji pada pemasang Windows).
