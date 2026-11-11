# Aset visual dan font

| Aset                       | Berkas                                                                                                                                        | Asal                                                                                                                            | Status                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Logo dan lambang DEKRi Lab | `src/assets/brand/*.svg`, `src/ui/components/brand-paths.ts`, `build/icon.{png,ico}`, `desktop/dekri-lab.ico`, favicon inline di `index.html` | Dibuat dengan **ChatGPT (OpenAI)** menggunakan akun milik pemilik proyek, untuk identitas visual DEKRi Lab (keterangan pemilik) | NEEDS REVIEW                                                  |
| Font Inter (subset Latin)  | `src/assets/fonts/inter-latin-wght.woff2`, `OFL.txt`                                                                                          | The Inter Project Authors, SIL OFL 1.1                                                                                          | CLEAR (teks OFL disertakan; ikut installer lewat `licenses/`) |
| Tangkapan layar README     | `docs/images/*.png`                                                                                                                           | Dibuat dari aplikasi ini (data fiktif)                                                                                          | CLEAR                                                         |
| Ikon/gambar lain           | —                                                                                                                                             | Tidak ada pustaka ikon atau gambar pihak ketiga                                                                                 | CLEAR                                                         |

## Riwayat logo (hanya yang dapat dibuktikan)

- Gambar logo sumber diberikan pemilik proyek, yang menyatakan dibuat dengan ChatGPT. Prompt, tanggal pembuatan, dan versi model **tidak tersedia** dan tidak dikarang.
- Pengolahan yang dilakukan di proyek ini: gambar diubah menjadi SVG vektor dengan penelusuran otomatis (potrace; lihat komentar di `brand-paths.ts`), lalu dipakai ulang sebagai komponen UI, favicon, dan ikon aplikasi (`build/icon.*`). Tidak ada pewarnaan atau penambahan elemen dari sumber lain yang tercatat.
- Pemeriksaan isi berkas SVG: tidak ada elemen `<text>`, `font-family`, `<image>`, atau tautan eksternal; seluruhnya bentuk jalur (path). Maka tidak ada font atau gambar eksternal yang tertanam di SVG. Gambar rasternya (PNG/ICO) tidak diperiksa elemen per elemen.

## Bukti pembuatan logo dan nama (keterangan pemilik)

- Pemilik proyek memperlihatkan dua tangkapan layar percakapan dengan asisten AI: satu berisi gambar logo DEKRi Lab dengan palet warna (indigo #4D49FC, navy #17124F, lime #E4FF97, putih) dan keputusan nama merek "DEKRI Lab"; satu lagi daftar lima nama yang diusulkan (DEKRI, JURNEO, RASQI, AKRUNA, NERAQ). Tangkapan layar itu disimpan pemilik di luar repositori dan **tidak** dimasukkan ke repositori publik. Tanggal dan nama layanan pada tangkapan layar tidak terlihat jelas, jadi tidak dicatat di sini.

## Status hukum logo (tanpa jaminan)

- **Hak penggunaan keluaran** menurut ketentuan layanan OpenAI adalah hal yang berbeda dari **perlindungan hak cipta atau hak eksklusif** atas desain logo menurut hukum Indonesia. Pemilik perlu membaca ketentuan layanan OpenAI yang berlaku pada saat pembuatan logo; auditor tidak menyimpulkan isinya.
- Status hak cipta atas karya yang dihasilkan AI belum pasti secara hukum; jangan menganggap logo otomatis dilindungi atau dimiliki secara eksklusif.
- Logo **tidak** tercakup lisensi MIT. Tidak ada jaminan logo unik atau bebas dari kemiripan dengan merek/logo pihak lain (pemeriksaan kemiripan visual belum dilakukan).
- Disarankan: tambahkan pernyataan di README bahwa nama dan logo DEKRi Lab tidak dilisensikan untuk identitas produk turunan tanpa izin (keputusan pemilik; lihat `RELEASE_CHECKLIST.md`).
