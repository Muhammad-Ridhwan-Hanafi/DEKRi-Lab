# Arsitektur keamanan

Aplikasi ini berjalan offline sebagai satu proses Rust (Dioxus) yang menampilkan antarmuka lewat WebView sistem (WebView2/webkit2gtk) dari berkas lokal yang tertanam. Tidak ada server di internet, tidak memuat halaman dari internet, dan semua logika berjalan di Rust. Satu-satunya soket yang dibuka adalah soket lokal milik Dioxus (lihat baris Jaringan).

## Ringkasan

| Area | Rancangan |
| --- | --- |
| Jaringan | Tidak ada koneksi keluar: tidak ada pustaka HTTP atau klien jaringan di dependensi langsung `Cargo.toml`, tidak ada telemetri atau pembaruan otomatis. Dioxus desktop membuka satu soket WebSocket di `127.0.0.1` (port acak, kunci acak per sesi) untuk menyampaikan pembaruan tampilan ke jendela; soket itu tidak dapat dijangkau dari komputer lain. Tautan laporan soal disalin ke papan klip, tidak dibuka. |
| Data pengguna | Hanya berkas JSON lokal (progres dan cadangan). Tidak dienkripsi (lihat `PRIVACY.md`). |
| Impor cadangan | Dibaca sebagai teks, dibatasi 20 MB, diparse dengan `serde_json` ke tipe terdefinisi; nominal rusak dan akun tak dikenal dibuang. Tidak ada eksekusi isi berkas. |
| Cadangan otomatis | Ditulis atomik (berkas sementara lalu rename), hanya 7 berkas harian per pengguna dihapus, berkas lain tidak disentuh, tautan simbolik dan berkas bukan biasa ditolak. Nama berkas dari nama pengguna diubah menjadi slug aman. |
| Proses lain | Hanya membuka folder atau berkas HTML laporan dengan program tetap (`explorer`, `open`, `xdg-open`); argumen berupa jalur milik aplikasi, tanpa shell dan tanpa teks dari pengguna. |
| Bahasa | Rust aman; `panic = "abort"`, `lto`, simbol dihapus pada build rilis. |
| Rantai pasok | `Cargo.lock` dikomit dan dipakai dengan `--locked`; Dependabot untuk Cargo dan GitHub Actions; aksi CI dikunci ke SHA commit; workflow rilis hanya diberi izin tulis pada job rilis dan membuat Release berstatus draf. |

## Batasan yang diketahui

- **Kunci jawaban ada di dalam biner** (dibenamkan dari `data/*.json`) dan hanya disembunyikan di antarmuka. Ini bukan alat ujian anti-curang.
- Berkas cetak laporan ditulis ke folder sementara pengguna dengan nama tetap (`dekri-laporan-<kode>.html`). Pada komputer bersama, pengguna lain dengan akses ke folder yang sama dapat mengganti berkas itu sebelum dibuka; risiko ini rendah di Windows (folder sementara per pengguna) dan belum dimitigasi.
- Cadangan tidak dienkripsi dan memuat nama profil serta seluruh jawaban.
- Pemasang dan biner belum ditandatangani secara digital; Windows SmartScreen dapat memperingatkan. Checksum SHA-256 di Release hanya membuktikan berkas tidak berubah sejak dibuat.
- Pemasang berjalan per pengguna (tanpa hak administrator) dan menulis ke folder pilihan pengguna, `HKCU\Software\DEKRiLab`, dan entri Uninstall pengguna. Pemasang tidak menghapus data belajar saat uninstall.
- Soket lokal Dioxus hanya menerima sambungan yang membawa kunci acak yang dibuat saat program berjalan. Perlindungan ini bergantung pada implementasi Dioxus dan belum diaudit secara independen.
- Pustaka Dioxus/wry bersumber dari crates.io dan mengikuti pembaruan Dependabot; tidak ada audit keamanan independen atas dependensi ini.

## Riwayat

Sebelum versi 2.0.0 aplikasi berbasis Electron/React (dan sempat dicoba dengan Tauri). Seluruh bagian Electron, termasuk isolasi konteks, IPC, dan CSP, dihapus bersama kode itu; peringatan dependensi alat build Node (mis. `minimatch`) tidak relevan lagi.
