# Sumber dan asal konten

Dokumen ini menjelaskan secara transparan bagaimana konten edukasi DEKRi Lab dibuat, apa yang diketahui, dan apa yang belum dapat dibuktikan. Ini keterangan provenance, **bukan** jaminan hukum.

## Keterangan pemilik proyek (klarifikasi, Nov 2026)

- Workbook sumber kasus pembelajaran (`Accounting_Practice_Workbook_Rapi_dan_Audit_v4.xlsx`) dan materi pembelajaran **disusun dengan bantuan Claude AI** (alat bantu AI dari Anthropic), dengan landasan kebijakan/standar/pedoman IAI (Ikatan Akuntan Indonesia).
- Pemilik proyek mengarahkan, menyunting, dan memutuskan isi aplikasi (misalnya pemilihan soal, penyuntingan `data/case.json`, keputusan format soal 7A/7B). Rincian porsi kontribusi manusia dan AI per bagian **tidak terdokumentasi** dan tidak diklaim di sini.
- Workbook asli **tidak ikut** dalam repositori; yang ada hanya data hasil ekstraksinya (`data/*.json`, dibuat oleh `tools/extract_workbook.py`).
- Dokumen ini tidak menyatakan bahwa materi sepenuhnya karya manusia, dan tidak pula bahwa materi sepenuhnya keluaran otomatis AI.

## Pembedaan kategori

| Kategori                                        | Isi                                                                                                                                                                                                      | Keterangan                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Materi asli untuk DEKRi Lab                     | Narasi kasus PT Sumber Cahaya Elektrindo (fiktif), transaksi, bagan akun, saldo awal, kunci jawaban, 28 penyesuaian, 26 skenario, 12 kasus koreksi                                                       | Disusun untuk proyek ini dengan bantuan Claude AI; disunting pemilik |
| Dikembangkan dengan bantuan Claude              | Seluruh bagian di atas; soal industri (`data/industri-packs.json`, dihasilkan skrip `tools/gen_industri.py`); soal 7A/7B arus kas (`src/data/arus-kas.ts`); materi `src/data/materi.ts`, `src/learning/` | Kontribusi AI tidak dipisahkan per berkas                            |
| Standar/referensi IAI sebagai landasan          | Nama dan nomor standar yang disebut pada penjelasan (lihat tabel di bawah)                                                                                                                               | Hanya sebagai rujukan; tidak ada salinan teks standar                |
| Materi pihak ketiga yang digunakan atau dikutip | **Tidak ditemukan** pada pemeriksaan otomatis (lihat bawah)                                                                                                                                              | —                                                                    |

## Standar yang disebut dalam aplikasi

Hasil pemindaian nyata atas `src/` dan `data/` (jumlah kemunculan, bukan jaminan keakuratan isi): PSAK 207 (29), PSAK 118 (28), PSAK 216 (10), PSAK 116 (7), PSAK 201 (6), PSAK 236 (5), PSAK 212 (2), PSAK 105 (2), serta masing-masing satu kali: PSAK 115, PSAK 109, PSAK 219, dan nomor lama PSAK 23 dan PSAK 34 (disebut sebagai standar yang digantikan). Penomoran lama “d/h PSAK …” muncul pada arsip temuan `docs/RIWAYAT-TEMUAN-WORKBOOK.md`. Judul dokumen IAI, tanggal, dan nomor paragraf **tidak dikarang**: nomor paragraf yang belum dicocokkan diberi tanda “(cek)” (16 penanda pada kode/data saat audit).

Satu-satunya rujukan tanggal yang tertulis adalah “PSAK 207 sebagaimana diamendemen oleh PSAK 118 (disahkan DSAK IAI 28 Mei 2025)” pada `src/data/arus-kas.ts`. Rujukan ini berasal dari pemeriksaan situs IAI pada sesi pengembangan dan **perlu diverifikasi ulang pemilik** pada SAK Online sebelum rilis.

Catatan pemeriksaan status berlaku (situs IAI, Nov 2026, diperiksa ulang sebelum rilis): PSAK 118 efektif 1 Jan 2027; PSAK 338 revisi efektif 1 Jan 2026; PSAK 120 efektif 2029; penomoran baru berlaku sejak 2024. Pajak: PPN efektif 11% (DPP 11/12 × 12%) untuk non-mewah, 12% untuk barang mewah; periksa peraturan terbaru.

## Pemeriksaan reproduksi materi berhak cipta (hasil nyata)

- Pemindaian otomatis atas kode materi: hanya 6 untai teks lebih dari 220 karakter, seluruhnya ringkasan konsep berkalimat sendiri (misalnya definisi ringkas aset dimiliki untuk dijual, provisi, klasifikasi aset keuangan), bukan kutipan bertanda petik. Tidak ada tabel atau ilustrasi dari IAI di repositori (gambar di `docs/images` adalah tangkapan layar aplikasi ini).
- **Batasan:** auditor tidak memiliki akses ke teks resmi SAK untuk dibandingkan kalimat demi kalimat, sehingga kesamaan frasa dengan teks standar tidak dapat dikesampingkan seluruhnya. Pemeriksaan sampling oleh pemilik terhadap bagian yang paling mirip definisi standar (`src/data/materi.ts`) disarankan.
- Memakai AI atau merujuk standar IAI **tidak otomatis** memberi hak untuk mendistribusikan materi sumber dan tidak otomatis memberi perlindungan hak cipta atas keluaran AI.

## Status per temuan

| Temuan                                                                  | Status         | Alasan                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tidak ada salinan substansial teks/tabel/gambar IAI yang terdeteksi     | NEEDS REVIEW   | bukti negatif terbatas pada pemindaian otomatis dan tidak ada pembanding teks resmi                                                                                                                                                          |
| Kasus, soal, dan kunci jawaban: asal dan keterlibatan AI terdokumentasi | NEEDS REVIEW   | keterangan berasal dari pemilik; tidak ada log penyusunan; status hak atas keluaran AI tidak dipastikan                                                                                                                                      |
| Klaim afiliasi atau dukungan IAI                                        | CLEAR          | tidak ada klaim; penafian eksplisit di DISCLAIMER.md dan Pengaturan > Tentang                                                                                                                                                                |
| Klaim sebagai pengganti standar resmi                                   | CLEAR          | DISCLAIMER.md butir 1 dan 3                                                                                                                                                                                                                  |
| Nomor paragraf standar                                                  | NEEDS REVIEW   | belum diverifikasi; bertanda “(cek)”                                                                                                                                                                                                         |
| Nama perusahaan fiktif                                                  | NEEDS REVIEW   | belum dicek ke AHU Online/PDKI                                                                                                                                                                                                               |
| Nama bank dalam transaksi                                               | CLEAR (diubah) | Keputusan pemilik, Nov 2026: nama bank nyata (Mandiri, BCA) diganti nama fiktif (Bank Arunika, Bank Cendana); tidak ada lagi merek bank nyata di data. Kemiripan tidak sengaja dengan badan usaha nyata tetap perlu dicek di AHU Online/PDKI |

## Lisensi materi

Lisensi MIT pada `LICENSE` **hanya** untuk kode sumber aplikasi. Kasus, soal, kunci jawaban, materi, dan workbook turunan **tidak otomatis** termasuk MIT; pemilik belum menetapkan lisensi terpisah untuk konten (lihat keputusan pemilik di `RELEASE_CHECKLIST.md`). Sampai ditetapkan, jangan menganggap konten bebas disalin ulang.
