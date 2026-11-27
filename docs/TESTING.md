# Pengujian

| Perintah                                               | Isi                                                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `cargo test --workspace`                               | seluruh tes (73): mesin akuntansi, penilaian, penjelasan kunci, cadangan, paritas dengan workbook, dan logika murni antarmuka |
| `node tests/ui/kalkulator-ketik.cjs`                   | pemformat ketikan kalkulator versi JS terhadap vektor yang sama dengan tes Rust (tanpa DOM, tanpa paket tambahan) |
| `cargo fmt --all -- --check`                           | format kode                                                                                                 |
| `cargo clippy --workspace --all-targets -- -D warnings` | pemeriksaan gaya dan kesalahan umum                                                                         |

Yang diuji `dekri-core` (mesin tanpa UI):

- 298 sel laporan sama dengan workbook Excel sumber; neraca saldo sebelum dan sesudah penyesuaian dan setelah penutupan; 14 angka kunci dan 14 pemeriksaan.
- 2.100 jawaban salah buatan: status dan alasan penilaian sama dengan rumus Excel (`tests/parity/excel-grading.json`, `excel-values.json`).
- 72 soal varian dan 3 pengacakan ujian cocok dengan vektor referensi (`crates/dekri-core/tests/*.json`, diturunkan dari versi TypeScript lama sebelum dihapus).
- Nama berkas cadangan per pengguna, pembacaan cadangan versi web lama, dan pembuangan data rusak.
- Penjelasan kunci (`explain.rs`): tidak panik untuk seluruh kunci transaksi, tidak ada titik ganda, peristiwa tanpa jurnal hanya menampilkan alasannya.
- Penilaian transaksi yang dicentang "tidak perlu jurnal" (`derive.rs`): pada peristiwa yang kuncinya memerlukan jurnal hasilnya Periksa dengan pesan yang tidak membocorkan akun atau nominal, tanpa centang dan tanpa baris tetap Belum, centang dengan jurnal yang benar tetap Benar, peristiwa tanpa jurnal tidak berubah, dan soal ujian yang dijawab begitu dihitung sudah dijawab (salah).

Profil Kasus (`laporan.rs`):

- Baris sumber `case.json` (label-isi, judul huruf kapital, tabel aging, petunjuk berbutir) dipecah menjadi blok bertipe: tabel aging menjadi tabel dengan angka terformat (240.000.000, 1%) dan baris TOTAL, petunjuk menjadi daftar bernomor tanpa butir "•" kosong, isi informasi menjadi butir per bagian atau per kalimat tanpa memotong isi kurung ("(6% p.a.; berjangka 3 bulan ...)"), dan catatan di bawah tabel memberi sub-butir pada rincian faktur.
- `profil_tidak_menghilangkan_sel_sumber`: setiap sel sumber harus tetap tampil dalam bentuk apa pun. Kegagalan lama (tabel aging pecah menjadi kartu per baris, kartu berjudul "•", catatan tabel hilang) langsung ketahuan oleh tes ini.

Kalkulator (`extras.rs`, `crates/dekri-ui/assets/kalkulator-ketik.js`):

- Pembacaan angka: titik ribuan dan koma desimal (`1.250,5`, `1250,5`, `,5`), `x`/`X`/`*`/`×` sebagai kali, format lama (`1.250.000`, `12.5`) tetap terbaca, salah ketik (`1,250.50`, `1,5,5`, `12.34,5`) ditolak, dan hasil desimal bisa dibaca ulang setelah "=".
- Pemformat ketikan ada dua implementasi, Rust (`reformat`) dan JS (`formatTyped`), yang harus sama persis supaya Dioxus tidak menulis ulang kolom dan kursor tidak melompat. `crates/dekri-ui/test-data/kalkulator-ketik.json` adalah vektor bersama (teks mentah + posisi kursor menjadi teks berformat + posisi kursor, termasuk Backspace/Delete di samping titik ribuan); keduanya juga diuji idempoten pada 5.000 masukan acak. Saat pengembangan, kedua implementasi dibandingkan pada 30.000 masukan acak tanpa satu pun beda.
- Perilaku di aplikasi nyata (ketikan XTEST di Xvfb, WebKitGTK) diperiksa dengan rumus panjang, Backspace/Delete di samping titik ribuan, tombol kalkulator, dan ketikan cepat berjeda 30 ms; pada ketikan cepat versi sebelum perbaikan kehilangan angka. Kemampuan itu belum ada sebagai tes otomatis di repositori.

Batasan yang jujur:

- Logika antarmuka yang bisa dipisahkan diuji sebagai fungsi murni (mis. penyisipan tombol kalkulator di posisi kursor, penelusuran angka laporan di `dekri-core`, pemecah teks kasus Koreksi dan Skenario di `kerja.rs`, pemecah isi tab Profil Kasus di `laporan.rs`). Interaksi klik dan ketik di WebView belum punya tes otomatis di repositori; perilaku kursor kalkulator dan kotak "tidak perlu jurnal" diperiksa pengembang dengan ketikan dan klik nyata (XTEST di Xvfb, WebKitGTK), bukan WebView2; tampilan diperiksa dengan tangkapan layar manual (`DEKRI_PAGE`, lihat `docs/DEVELOPMENT.md`). Matriks yang dipotret setiap perubahan tampilan: 1366×820, 1280×800, dan 1024×640 (`DEKRI_SIZE=1280x800`), terang dan gelap (`DEKRI_THEME=dark`); lihat `docs/DESIGN-SYSTEM.md` bagian 7.
- Masalah yang diketahui: kolom nominal Debit/Kredit di tabel jurnal masih kolom terkontrol Dioxus seperti kalkulator versi lama. Pada ketikan sangat cepat (jeda di bawah sekitar 80 ms per tombol pada uji Xvfb dengan build debug, mis. menahan satu tombol) angka bisa hilang; pada kecepatan ketik biasa (jeda 100 ms atau lebih) hasilnya benar. Belum diperbaiki.
- Tidak ada pengujian di Windows asli oleh pengembang; CI membangun pemasang di `windows-latest` tetapi tidak menjalankannya.
- Rujukan paragraf PSAK tidak diuji otomatis.

## Audit data dan tes asap UI

- `cargo test -p dekri-core audit` memeriksa data kasus dan kunci: jurnal kunci seimbang, akun dikenal, kunci lengkap per soal, opsi analisis valid. Jalankan setiap kali `data/*.json` berubah.
- `tests/ui/smoke.cjs` menguji kalkulator, pencarian bagan akun, dan narasi transaksi 65 pada aplikasi yang berjalan di Windows lewat WebView2 DevTools. Workflow `ui-smoke.yml` hanya dijalankan manual; belum terbukti stabil di runner.
