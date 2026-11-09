# Riwayat temuan audit workbook

Arsip temuan audit atas workbook sumber (sheet 25). Tidak lagi ditampilkan di aplikasi; disimpan hanya sebagai riwayat pengembangan.

Ringkasan: 25 temuan (Tinggi 3, Sedang 8, Rendah 11, sudah diperbaiki sebelumnya 2, tambahan 1); seluruhnya telah diperbaiki.

## #1 Aging piutang tidak berasal dari transaksi

- Tingkat: Tinggi · Status: Diperbaiki: No.52 menjadi penjualan tunai; aging disusun dari faktur terbuka (Rp240jt + Rp85jt); cadangan Rp27,9jt · Lokasi: 01_CASE_BACKGROUND B24:B27; AJ18 di sheet 10; 05 No.52 & No.67
- Temuan: Tabel aging (belum jatuh tempo 55%, 1-30 hari 25%, 31-60 hari 12%, >60 hari 8% dari Rp505jt) hanya cocok pada total. Saldo piutang akhir Rp505jt sebenarnya terdiri dari: saldo lama Rp85jt (382 - 250 - 9 - 38), faktur No.52 Rp180jt (jatuh tempo +/-16 Jun 2024, tidak pernah ditagih) dan faktur No.133 Rp240jt (jatuh tempo +/-11 Jan 2025). Transaksi No.67 (30 Jun: "seluruh piutang masih lancar") juga bertentangan dengan No.52 dan piutang lama >1 tahun (No.97).
- Dampak: Kelompok >60 hari minimal Rp265jt (bukan Rp40,4jt). Dengan tarif tabel yang sama cadangan +/-Rp81,9jt (2,4 + 54 + 25,5), bukan Rp24,745jt; beban kerugian piutang +/-Rp67,9jt, bukan Rp10,745jt. Berantai ke AJ18, AJ26, AJ27, laba dan seluruh laporan.
- Rekomendasi: Susun ulang tabel aging dari data transaksi (atau buat No.52 tertagih), lalu bangun ulang kunci AJ18/AJ26/AJ27 dan laporan.

## #2 Piutang debitur pailit

- Tingkat: Tinggi · Status: Diperbaiki: debitur pailit pada No.138 dibedakan (CV Mitra Listrik Abadi) · Lokasi: 05 No.133 & No.138; 01_CASE_BACKGROUND aging
- Temuan: PT Retail Elektronik Sentosa dinyatakan pailit (No.138, 22 Des), tetapi faktur Rp240jt kepadanya (No.133, 12 Des) tetap diperlakukan "belum jatuh tempo" dengan cadangan 1% (Rp2,4jt).
- Dampak: Piutang debitur pailit harus dinilai penurunan nilainya secara individual (PSAK 109 (d/h PSAK 71)); cadangan wajar mendekati 100% (Rp240jt) sehingga laba turun tajam.
- Rekomendasi: Ganti debitur pada No.133 (atau No.138), atau tambahkan instruksi penilaian khusus piutang No.133.

## #3 Biaya perolehan aset tetap - hasil uji coba

- Tingkat: Tinggi · Status: Diperbaiki: kunci soal 1 menjadi Rp619jt · Lokasi: 21_SCENARIO_QUESTIONS soal 1; kunci di 22_ANSWER_KEY (bagian H, no.1)
- Temuan: Kunci 616jt mengurangi biaya uji coba (Rp8jt) dengan hasil penjualan barang contoh (Rp3jt). Sejak amendemen PSAK 216 (d/h PSAK 16) (par.20A; efektif 1 Jan 2023 di Indonesia) hasil penjualan sebelum aset siap digunakan diakui di laba rugi, tidak dikurangkan dari biaya perolehan.
- Dampak: Jawaban benar Rp619jt (576 + 15 + 20 + 8); Rp3jt diakui sebagai pendapatan di laba rugi beserta biaya barang contohnya.
- Rekomendasi: Ubah kunci menjadi 619jt dan perbaiki penjelasannya.

## #4 Saldo awal deferral tidak pernah dihabiskan

- Tingkat: Sedang · Status: Diperbaiki: saldo awal sewa dan asuransi dihabiskan di AJ01/AJ03; uang muka Rp45jt dinyatakan untuk 2025 · Lokasi: 03_OPENING_BALANCES (1-1600, 1-1700, 2-1400); 11_ADJUSTED_TRIAL_BALANCE
- Temuan: Sewa dibayar di muka Rp36jt, asuransi dibayar di muka Rp18jt, dan pendapatan diterima di muka Rp45jt (semua saldo awal) tidak diamortisasi/diakui sepanjang 2024: tidak ada AJ dan tidak ada informasi masa manfaat. Akibatnya 1-1600 akhir tahun Rp36jt (= saldo awal), 1-1700 akhir memuat Rp18jt saldo awal, dan 2-1400 akhir Rp51jt memuat Rp45jt saldo awal.
- Dampak: Beban 2024 berpotensi kurang Rp54jt dan pendapatan kurang Rp45jt (dua arah, saling bertolak).
- Rekomendasi: Tambahkan fakta masa manfaat saldo awal + AJ-nya, atau nyatakan eksplisit manfaat berlanjut ke 2025.

## #5 Beban operasional tidak lengkap setahun

- Tingkat: Sedang · Status: Diperbaiki: gaji Feb-Mar masuk No.44; akrual listrik Rp93,6jt pada AJ28 baru · Lokasi: 05 No.11, 44, 62, 94, 112, 125, 136 (gaji); No.17, 64 (listrik)
- Temuan: Tidak ada transaksi gaji Februari dan Maret 2024 (kasus menyebut gaji bulanan Rp68-83jt), dan tidak ada tagihan listrik/air/telekomunikasi Juli-Desember maupun akrualnya di AJ. Beban gaji Rp860jt hanya mencakup 10 bulan.
- Dampak: Indikatif: gaji +/-Rp140jt (2 bulan x +/-Rp70jt) dan utilitas +/-Rp91jt (6 bulan x +/-Rp15jt) belum dibebankan; laba dan margin menyesatkan.
- Rekomendasi: Tambahkan transaksi/AJ akrual, atau nyatakan bahwa data hanya sampel.

## #6 Liabilitas pengembalian tidak diselesaikan & salah akun

- Tingkat: Sedang · Status: Diperbaiki: akun 2-1600 Liabilitas Pengembalian; hak retur 12 bulan sehingga liabilitas masih sah · Lokasi: 05 No.52; 22_ANSWER_KEY (jurnal No.52); 14_FINANCIAL_POSITION baris 36
- Temuan: Liabilitas pengembalian Rp7,2jt dijurnal ke 2-1200 "Beban yang Masih Harus Dibayar" dan tidak pernah diselesaikan: masa retur 14 hari berakhir +/-31 Mei 2024, tetapi saldo masih ada per 31 Des. Aset hak atas barang retur (Rp4,32jt) hanya tersirat di Persediaan.
- Dampak: Setelah masa retur lewat (PSAK 115 (d/h PSAK 72)) liabilitas harus direalisasi/dilepas; akrual terlalu besar Rp7,2jt dan pendapatan/HPP kurang diakui. COA tidak punya akun Liabilitas Pengembalian.
- Rekomendasi: Tambah akun Liabilitas Pengembalian (dan Aset Hak Pengembalian); tambah transaksi/AJ realisasi retur atau pelepasan liabilitas.

## #7 Koreksi fiskal tidak mencakup seluruh rugi penurunan nilai

- Tingkat: Sedang · Status: Diperbaiki: koreksi fiskal Rp110,47jt; pajak dihitung ulang · Lokasi: AJ26 & AJ27 (sheet 10); kunci K di 22_ANSWER_KEY
- Temuan: Koreksi fiskal memakai rugi penurunan nilai neto Rp25jt (32 - 7), padahal saldo 6-2500 di ATB = Rp30jt karena ada rugi aset dimiliki untuk dijual Rp5jt (No.132) yang juga beda temporer.
- Dampak: Beda temporer seharusnya Rp112,46jt: pajak kini +Rp1,1jt dan aset pajak tangguhan +Rp1,1jt (22% x Rp5jt).
- Rekomendasi: Masukkan Rp5jt ke AJ26/AJ27, atau tegaskan di soal bahwa rugi HFS bukan beda temporer.

## #8 Aset dimiliki untuk dijual disajikan sebagai aset tidak lancar

- Tingkat: Sedang · Status: Diperbaiki: dipindah ke aset lancar · Lokasi: 04_COA 1-2950; 14_FINANCIAL_POSITION baris 27
- Temuan: Aset tidak lancar dimiliki untuk dijual (Rp70jt) masuk ke kelompok ASET TIDAK LANCAR dan ikut dijumlahkan di "Total aset tidak lancar". PSAK 105 (d/h PSAK 58) mensyaratkan penyajian terpisah dan umumnya ditempatkan di aset lancar.
- Dampak: Total aset lancar kurang Rp70jt; total aset tidak lancar lebih Rp70jt.
- Rekomendasi: Pindahkan ke aset lancar sebagai pos tersendiri; ubah klasifikasi di COA.

## #9 Saham untuk diperdagangkan: klasifikasi aset & arus kas

- Tingkat: Sedang · Status: Diperbaiki: aset lancar; arus kas di operasi · Lokasi: 04_COA 1-2900; 15_STATEMENT_OF_CASH_FLOWS baris 33-34; kunci analisis No.46 & No.142
- Temuan: Saham FVTPL yang dibeli "untuk diperdagangkan jangka pendek" (01 B17, No.46) dicatat sebagai aset tidak lancar dan arus kasnya disajikan di aktivitas investasi. Menurut PSAK 207 (d/h PSAK 2) par.16 arus kas efek untuk diperdagangkan masuk aktivitas operasi.
- Dampak: Saldo akhir nol, jadi posisi keuangan tidak terpengaruh; arus kas operasi bertambah Rp11jt (96 - 85) dan investasi berkurang Rp11jt.
- Rekomendasi: Reklasifikasi ke aset lancar & operasi, atau ubah narasi menjadi investasi jangka panjang.

## #10 Deposito sebagai kas dan setara kas

- Tingkat: Sedang · Status: Diperbaiki: fakta deposito berjangka 3 bulan ARO · Lokasi: 04_COA 1-1150; 14_FINANCIAL_POSITION baris 6; 15 baris 46 & 57
- Temuan: Deposito BCA Rp250jt masuk "Kas dan setara kas", padahal tidak ada informasi jatuh tempo <=3 bulan; bunga dibayar per semester menunjukkan tenor >=6 bulan (PSAK 207 (d/h PSAK 2) par.7).
- Dampak: Kas dan setara kas awal Rp1.005jt dan akhir Rp1.246jt masing-masing memuat Rp250jt; tanpa deposito akhir = Rp996jt.
- Rekomendasi: Tambahkan tanggal jatuh tempo deposito; bila >3 bulan pisahkan sebagai investasi lancar lain.

## #11 Bunga kredit mobil boks tidak konsisten

- Tingkat: Rendah · Status: Diperbaiki: bunga No.60 = Rp6.944.444 · Lokasi: 05 No.60 (terkait No.19 & AJ13)
- Temuan: Bunga Rp12,5jt untuk pokok Rp200jt, 10% p.a., 10 Feb - 15 Jun (+/-125 hari). Hitungan 30/360 hanya Rp6,94jt. AJ13 (sisa Rp150jt x 10% x 6,5/12 = Rp8,125jt) konsisten dengan 10%.
- Dampak: Beban bunga lebih besar +/-Rp5,56jt.
- Rekomendasi: Ubah nominal No.60 (atau tingkat bunga) agar konsisten.

## #12 Properti investasi: akumulasi penyusutan bangunan

- Tingkat: Rendah · Status: Diperbaiki: akumulasi Rp20jt; penyusutan s.d. 20 Mei dibebankan; properti investasi Rp168.466.667 · Lokasi: 05 No.53; AJ06; AJ25
- Temuan: Akumulasi penyusutan bagian bangunan yang direklasifikasi Rp10jt tidak konsisten dengan umur 25 tahun dan saldo awal (240jt/1.200jt = 20% -> Rp20jt). Penyusutan 1 Jan - 20 Mei (Rp1,53jt) dijurnal di AJ06 ke akumulasi bangunan yang tersisa padahal bagian itu sudah pindah (PSAK 216 (d/h PSAK 16): susutkan sampai tanggal alih guna).
- Dampak: Nilai tercatat properti investasi (Rp180jt) dan akumulasi bangunan meleset +/-Rp10jt dan Rp1,53jt; AJ25 ikut berubah.
- Rekomendasi: Sesuaikan No.53 (akumulasi Rp20jt) atau jelaskan asal Rp10jt; jurnalkan penyusutan s.d. 20 Mei sebelum alih guna.

## #13 Akresi provisi restorasi

- Tingkat: Rendah · Status: Diperbaiki: akresi 9 bulan = Rp1.440.000 · Lokasi: AJ23 (sheet 10); kunci K
- Temuan: Akresi memakai 8 bulan, padahal provisi diakui 2 April (+/-9 bulan); penyusutan memang baru mulai 1 Mei.
- Dampak: Rp1,28jt vs Rp1,44jt (24jt x 8% x 9/12).
- Rekomendasi: Gunakan 9 bulan, atau nyatakan sebagai penyederhanaan.

## #14 Penyusutan mesin setelah impairment

- Tingkat: Rendah · Status: Diperbaiki: AJ08 Rp54.989.474; pembalikan AJ20 Rp8.989.474 · Lokasi: 05 No.100; AJ08; AJ20
- Temuan: AJ08 menyusutkan seluruh mesin lama Rp560jt/10 tahun, termasuk mesin yang nilainya diturunkan (95jt -> 63jt). Setelah impairment penyusutan harus dihitung dari nilai tercatat baru. AJ20 mengasumsikan penyusutan Rp3jt (95 -> 92jt) yang tidak pernah dijurnal.
- Dampak: Beban penyusutan dan batas pembalikan (Rp92jt) tidak konsisten secara internal.
- Rekomendasi: Pisahkan mesin ini di AJ08 atau nyatakan sebagai penyederhanaan.

## #15 Obligasi: arus kas tersirat tidak cocok dengan harga/SBE

- Tingkat: Rendah · Status: Diperbaiki: harga terbit obligasi Rp480.976.155; SBE investasi 9,97% dengan jatuh tempo 12 Apr 2027 · Lokasi: 05 No.77 & AJ15; No.40 & AJ16
- Temuan: Harga terbit Rp481.046.066 = nilai kini 5 kupon tahunan penuh Rp45jt pada 10%, tetapi kupon pertama hanya 5,5 bulan (Rp20,625jt). SBE obligasi investasi 10,29%: dengan jadwal kupon tersirat (maturitas 12 Apr 2027) nilai tercatat saat jatuh tempo +/-Rp202,1jt, bukan Rp200jt.
- Dampak: Beban/pendapatan bunga efektif pada AJ15 dan AJ16 hanya pendekatan. Angka SBE 10,29% bergantung pada tanggal jatuh tempo yang tidak dinyatakan tegas.
- Rekomendasi: Tegaskan konvensi periode (penuh atau stub) dan tanggal jatuh tempo; hitung ulang harga/SBE bila perlu.

## #16 Istilah "Prive" pada PT

- Tingkat: Rendah · Status: Diperbaiki: akun 3-9000 menjadi "Dividen" · Lokasi: 04_COA 3-9000; 17_POST_CLOSING_TRIAL_BALANCE B54
- Temuan: Akun "Prive/Dividen Interim" memakai istilah prive (perusahaan perseorangan). PT memakai Dividen. Utang Dividen (2-1600) tak terpakai karena No.124 sengaja menggabungkan deklarasi dan pembayaran.
- Dampak: Hanya terminologi; saldo dan penutupan benar.
- Rekomendasi: Ganti nama akun menjadi "Dividen" (COA, sheet 17, instruksi 16).

## #17 Pendapatan kontrak: piutang vs aset kontrak

- Tingkat: Rendah · Status: Diperbaiki: akun 1-1900 menjadi Aset Kontrak / (Liabilitas Kontrak) · Lokasi: 05 No.91-137; 04_COA; 02_ACCOUNTING_POLICIES baris 14
- Temuan: Pendapatan kontrak diakui dengan mendebit Piutang Usaha sebelum ditagih (penagihan 5 Sep, 31 Okt, 5 Des). Menurut PSAK 115 (d/h PSAK 72) yang belum ditagih adalah aset kontrak; COA tidak memilikinya. Istilah PSAK 34 pada kebijakan sheet 02 sudah diperbarui ke PSAK 115 (lihat sheet 26).
- Dampak: Piutang usaha pertengahan tahun overstated; saldo akhir nol sehingga posisi akhir tahun tidak terpengaruh.
- Rekomendasi: Tambah akun Aset Kontrak dan perbarui istilah kebijakan.

## #18 Asumsi perpajakan tidak dinyatakan

- Tingkat: Rendah · Status: Diperbaiki: asumsi PPN/PPh dan beda temporer dinyatakan di sheet 01 · Lokasi: 01_CASE_BACKGROUND B20; 04_COA
- Temuan: PPN (11% pada 2024) dan PPh 23 tidak ada sama sekali; hanya PPh 21 yang dinyatakan diabaikan (No.11). Kasus juga membatasi beda temporer pada 3 jenis, padahal cadangan piutang (Rp10,7jt), penurunan nilai persediaan (Rp11jt) dan akresi restorasi (Rp1,28jt) lazim menjadi koreksi fiskal.
- Dampak: Tarif efektif tepat 22% adalah hasil penyederhanaan, bukan kondisi nyata.
- Rekomendasi: Tambahkan pernyataan lingkup/asumsi pajak di sheet 01.

## #19 Pembanding utang bank jangka panjang

- Tingkat: Rendah · Status: Diperbaiki: saldo awal dipisah (bagian lancar Rp100jt, 2-1900) · Lokasi: 14_FINANCIAL_POSITION kolom C (1 Jan 2024)
- Temuan: Kolom 1 Jan 2024 menyajikan seluruh utang bank Rp500jt sebagai jangka panjang, padahal angsuran Rp100jt jatuh tempo 30 Des 2024. Per 31 Des 2024 hal yang sama dipindahkan ke bagian lancar (AJ24).
- Dampak: Perbandingan antar-periode tidak konsisten (bagian lancar awal seharusnya Rp100jt).
- Rekomendasi: Tampilkan reklasifikasi Rp100jt pada kolom pembanding atau beri catatan.

## #20 Narasi penyusutan unit yang dilepas

- Tingkat: Rendah · Status: Diperbaiki: narasi No.56 dan No.122 · Lokasi: 05 No.56 & No.122; AJ09
- Temuan: No.56 menyebut "penyusutan sampai tanggal penjualan sudah dibukukan lengkap", padahal kunci menjurnalkannya di AJ09 (unit A Rp9,375jt; unit tukar Rp26,25jt). Jurnal pelepasan mendebit akumulasi lebih besar dari saldo unit sampai AJ09.
- Dampak: Hanya inkonsistensi narasi; hasil akhir akumulasi kendaraan benar (Rp39,09jt).
- Rekomendasi: Ubah narasi No.56 dan No.122.

## #21 Pemetaan tingkat kesulitan per bulan

- Tingkat: Rendah · Status: Diperbaiki: catatan pengajar B9 · Lokasi: 24_INSTRUCTOR_NOTES B9; 05 kolom Tingkat
- Temuan: Catatan menyatakan Intermediate = Jan-Mar, Advanced = Apr-Sep, Expert = Okt-Des. Data sebenarnya: Intermediate muncul di semua kuartal (35/8/7/13 per kuartal) dan Expert sudah ada sejak April (mesin, sewa).
- Dampak: Dokumentasi tidak sesuai isi.
- Rekomendasi: Perbaiki catatan menjadi "tingkat ditentukan per transaksi (kolom Tingkat)".

## #22 Validasi jurnal penutup menolak jawaban benar

- Tingkat: Diperbaiki · Status: Diperbaiki (diuji: 35 dari 35 BENAR) · Lokasi: 16_CLOSING_ENTRIES G6:G38 dan instruksi baris 4-1100, 4-1200, 7-1300
- Temuan: Validasi mewajibkan angka NEGATIF agar "BENAR" untuk akun kontra-pendapatan bersaldo debit (4-1100 Rp9,5jt; 4-1200 Rp29,5jt) dan manfaat pajak tangguhan bersaldo kredit (7-1300 Rp23,6jt). Jurnal penutup yang benar (mengkredit kontra-pendapatan; mendebit 7-1300) justru ditandai PERIKSA. Instruksi kolom D juga salah arah.
- Dampak: Jawaban benar dinilai salah; Dashboard (D17) tidak pernah bisa 35/35.
- Rekomendasi: Rumus validasi diganti dengan aturan umum: debit = MAKS(-saldo,0), kredit = MAKS(saldo,0); instruksi tiga baris dibetulkan.

## #23 Salah konsep pada narasi kasus 5

- Tingkat: Diperbaiki · Status: Diperbaiki (teks) · Lokasi: 20_ERROR_DETECTION B9 dan 19_CORRECTING_ENTRIES B22 (kasus 5)
- Temuan: Tertulis "saldo perlengkapan dan kas terlalu rendah". Pencatatan ganda (debit Perlengkapan, kredit Kas dua kali) membuat perlengkapan terlalu TINGGI dan kas terlalu rendah. Kunci koreksi (debit Kas, kredit Perlengkapan) sudah benar.
- Dampak: Narasi menyesatkan peserta.
- Rekomendasi: Kalimat diperbaiki menjadi "perlengkapan terlalu tinggi dan kas terlalu rendah".

## #24 Placeholder rusak pada narasi AJ08

- Tingkat: Diperbaiki · Status: Diperbaiki · Lokasi: 10_ADJUSTING_ENTRIES D41 (AJ08)
- Temuan: Narasi AJ08 memuat rujukan rusak "No.[[88]]" (placeholder template yang tidak terisi); rujukan yang benar adalah No.100.
- Dampak: Peserta tidak dapat menelusuri transaksi impairment yang dimaksud.
- Rekomendasi: Ganti dengan No.100.

## #25 Properti investasi disewakan tanpa pendapatan sewa

- Tingkat: Sedang · Status: Diperbaiki: narasi No.53 menyatakan belum ada penyewa; sewa mulai 1 Jan 2025 · Lokasi: 05_SOURCE_TRANSACTIONS No.53; 04_COA 4-8100
- Temuan: Narasi No.53 menyatakan properti "kini disewakan kepada pihak ketiga", tetapi tidak ada pendapatan sewa yang dicatat pada 2024 (akun 4-8100 tidak terpakai).
- Dampak: Pendapatan sewa Mei-Desember 2024 tidak tercatat atau narasi menyesatkan; juga memengaruhi klasifikasi pendapatan sewa pada penyajian pro forma PSAK 118.
- Rekomendasi: Nyatakan belum ada penyewa pada 2024 (sewa mulai 1 Januari 2025) atau catat pendapatan sewa.
