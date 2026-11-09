import { SCENARIOS } from './index';

/** Ringkasan satu halaman per BAB: jurnal standar, rumus, dan jebakan umum. Ringkasan belajar, bukan pengganti standar (PSAK). */
export interface Materi {
  bab: number;
  title: string;
  ringkas: string;
  jurnal: Array<{ judul: string; baris: string[] }>;
  rumus: string[];
  jebakan: string[];
}

export const MATERI: Materi[] = [
  {
    bab: 7,
    title: 'Piutang',
    ringkas: 'Piutang usaha disajikan neto setelah cadangan kerugian penurunan nilai. Cadangan dihitung dari persentase saldo piutang atau tabel umur piutang (aging).',
    jurnal: [
      { judul: 'Cadangan kerugian piutang (akhir periode)', baris: ['Dr Beban Kerugian Piutang', 'Kr Cadangan Kerugian Penurunan Nilai Piutang'] },
      { judul: 'Penghapusan piutang tak tertagih (metode cadangan)', baris: ['Dr Cadangan Kerugian Penurunan Nilai Piutang', 'Kr Piutang Usaha'] },
    ],
    rumus: ['Cadangan yang dibutuhkan = jumlah (saldo tiap kelompok umur x persentase)', 'Beban periode ini = cadangan yang dibutuhkan − saldo cadangan kredit yang ada (tambah bila saldo cadangan sudah debit)'],
    jebakan: ['Penghapusan piutang tidak menjadi beban lagi pada metode cadangan; bebannya sudah diakui saat membentuk cadangan.', 'Lupa memperhitungkan saldo cadangan yang sudah ada sebelum menjurnal penyesuaian.', 'Saldo cadangan bisa bersaldo debit setelah penghapusan besar; beban menjadi kebutuhan ditambah saldo debit itu.'],
  },
  {
    bab: 8,
    title: 'Persediaan',
    ringkas: 'Persediaan diukur sebesar yang lebih rendah antara biaya dan nilai realisasi neto (NRV). Kepemilikan barang dalam perjalanan ditentukan oleh syarat pengiriman (FOB).',
    jurnal: [
      { judul: 'Penurunan ke NRV', baris: ['Dr Beban/Kerugian Penurunan Nilai Persediaan (atau HPP)', 'Kr Persediaan (atau cadangan penurunan nilai)'] },
      { judul: 'Perpetual: penjualan', baris: ['Dr Kas/Piutang  Kr Penjualan', 'Dr Harga Pokok Penjualan  Kr Persediaan'] },
    ],
    rumus: ['NRV = estimasi harga jual − estimasi biaya penyelesaian − biaya penjualan', 'Penurunan nilai = biaya − NRV, bila NRV lebih rendah'],
    jebakan: ['FOB shipping point: milik pembeli sejak barang dikirim; FOB destination: milik pembeli setelah tiba.', 'Membandingkan biaya dan NRV per item (atau kelompok sejenis), bukan total seluruh persediaan.', 'Biaya angkut pembelian menambah biaya persediaan; biaya angkut penjualan adalah beban.'],
  },
  {
    bab: 9,
    title: 'Aset Tetap',
    ringkas: 'Biaya perolehan mencakup harga beli neto, biaya langsung agar aset siap dipakai, dan estimasi pembongkaran. Penyusutan dialokasikan sistematis selama umur manfaat.',
    jurnal: [
      { judul: 'Penyusutan', baris: ['Dr Beban Penyusutan', 'Kr Akumulasi Penyusutan'] },
      { judul: 'Pelepasan aset', baris: ['Dr Kas', 'Dr Akumulasi Penyusutan', 'Dr/Kr Kerugian atau Keuntungan Pelepasan', 'Kr Aset Tetap (biaya perolehan)'] },
    ],
    rumus: ['Garis lurus = (biaya perolehan − residu) / umur manfaat', 'Perubahan estimasi umur: beban baru = (nilai buku − residu baru) / sisa umur baru, diterapkan prospektif', 'Untung/rugi pelepasan = hasil neto − nilai buku'],
    jebakan: ['Pelatihan operator dan biaya administrasi umum bukan biaya perolehan.', 'Penyusutan sampai tanggal pelepasan sebelum aset dilepas.', 'Perubahan estimasi tidak menyajikan ulang tahun lalu.', 'Subsequent cost dikapitalisasi hanya bila menambah manfaat ekonomi; perbaikan rutin adalah beban.'],
  },
  {
    bab: 10,
    title: 'Aset Dimiliki untuk Dijual dan Properti Investasi',
    ringkas: 'Aset tidak lancar dimiliki untuk dijual diukur sebesar yang lebih rendah antara nilai tercatat dan nilai wajar dikurangi biaya penjualan, dan tidak disusutkan. Properti investasi dapat memakai model nilai wajar dengan perubahan di laba rugi.',
    jurnal: [
      { judul: 'Properti investasi: kenaikan nilai wajar', baris: ['Dr Properti Investasi', 'Kr Keuntungan Perubahan Nilai Wajar'] },
      { judul: 'Aset dimiliki untuk dijual: rugi penurunan', baris: ['Dr Kerugian Penurunan Nilai', 'Kr Aset (nilai tercatat diturunkan)'] },
    ],
    rumus: ['Dimiliki untuk dijual: ukur pada min(nilai tercatat, nilai wajar − biaya penjualan)', 'Perubahan nilai wajar = nilai wajar akhir − nilai tercatat awal'],
    jebakan: ['Aset dimiliki untuk dijual berhenti disusutkan sejak diklasifikasikan.', 'Model nilai wajar properti investasi tidak memakai penyusutan.'],
  },
  {
    bab: 11,
    title: 'Penurunan Nilai Aset',
    ringkas: 'Rugi penurunan nilai diakui bila nilai tercatat melebihi jumlah terpulihkan, yaitu yang lebih tinggi antara nilai wajar dikurangi biaya pelepasan dan nilai pakai. Pembalikan dibatasi pada nilai tercatat seandainya tidak pernah ada penurunan.',
    jurnal: [
      { judul: 'Rugi penurunan nilai', baris: ['Dr Kerugian Penurunan Nilai Aset', 'Kr Akumulasi Penurunan Nilai / Aset'] },
      { judul: 'Pembalikan', baris: ['Dr Akumulasi Penurunan Nilai / Aset', 'Kr Pemulihan Rugi Penurunan Nilai'] },
    ],
    rumus: ['Jumlah terpulihkan = max(nilai wajar − biaya pelepasan, nilai pakai)', 'Rugi = nilai tercatat − jumlah terpulihkan', 'Batas pembalikan = nilai tercatat seandainya tidak ada penurunan (setelah penyusutan berjalan)'],
    jebakan: ['Pembalikan tidak boleh melampaui nilai tercatat yang seharusnya setelah penyusutan.', 'Goodwill tidak boleh dibalik.'],
  },
  {
    bab: 12,
    title: 'Provisi dan Kontinjensi',
    ringkas: 'Provisi diakui bila ada kewajiban kini akibat peristiwa masa lalu, arus keluar kemungkinan besar terjadi, dan jumlahnya dapat diestimasi andal. Aset kontinjensi tidak diakui; diungkapkan bila arus masuk kemungkinan besar.',
    jurnal: [
      { judul: 'Provisi garansi', baris: ['Dr Beban Garansi', 'Kr Provisi Garansi'] },
      { judul: 'Akresi diskonto provisi', baris: ['Dr Beban Bunga (akresi)', 'Kr Provisi'] },
    ],
    rumus: ['Nilai ekspektasian = jumlah (probabilitas x jumlah)', 'Akresi = saldo provisi x tingkat diskonto'],
    jebakan: ['Satu kewajiban tunggal diukur pada hasil paling mungkin, bukan nilai ekspektasian.', 'Aset kontinjensi tidak diakui sebelum realisasinya virtually certain.', 'Akresi dicatat sebagai beban bunga, bukan menambah beban garansi.'],
  },
  {
    bab: 13,
    title: 'Investasi',
    ringkas: 'Klasifikasi bergantung pada model bisnis dan karakteristik arus kas: biaya diamortisasi, nilai wajar melalui laba rugi, atau nilai wajar melalui penghasilan komprehensif lain. Biaya diamortisasi memakai suku bunga efektif.',
    jurnal: [
      { judul: 'Pendapatan bunga efektif (biaya diamortisasi)', baris: ['Dr Piutang Bunga', 'Dr/Kr Investasi (amortisasi diskonto/premium)', 'Kr Pendapatan Bunga'] },
    ],
    rumus: ['Pendapatan bunga = nilai tercatat awal x suku bunga efektif', 'Bunga kupon = nominal x suku kupon', 'Amortisasi = pendapatan bunga − bunga kupon'],
    jebakan: ['Pendapatan bunga dihitung dari nilai tercatat, bukan dari nominal.', 'Menghitung bunga satu tahun penuh padahal investasi dibeli di tengah tahun.'],
  },
  {
    bab: 14,
    title: 'Sewa (PSAK 116)',
    ringkas: 'Penyewa mengakui aset hak-guna dan liabilitas sewa sebesar nilai kini pembayaran sewa yang belum dibayar. Aset disusutkan, liabilitas menimbulkan bunga efektif.',
    jurnal: [
      { judul: 'Awal sewa', baris: ['Dr Aset Hak-Guna', 'Kr Liabilitas Sewa'] },
      { judul: 'Bunga liabilitas sewa', baris: ['Dr Beban Bunga', 'Kr Liabilitas Sewa (atau Kas saat dibayar)'] },
      { judul: 'Penyusutan aset hak-guna', baris: ['Dr Beban Penyusutan Aset Hak-Guna', 'Kr Akumulasi Penyusutan Aset Hak-Guna'] },
    ],
    rumus: ['Liabilitas awal = nilai kini pembayaran sewa pada suku bunga implisit', 'Bunga = saldo liabilitas awal periode x suku bunga', 'Penyusutan = aset hak-guna / masa sewa (atau umur ekonomi bila lebih pendek dan ada opsi beli pasti)'],
    jebakan: ['Bunga liabilitas sewa sering terlewat saat penyesuaian.', 'Pembayaran di awal periode (anuitas di muka) mengubah perhitungan nilai kini.', 'Bagian lancar liabilitas = pokok yang jatuh tempo dalam 12 bulan, bukan seluruh cicilan.'],
  },
  {
    bab: 15,
    title: 'Liabilitas Jangka Panjang dan Obligasi',
    ringkas: 'Obligasi dicatat sebesar harga terbit; diskonto atau premium diamortisasi dengan metode bunga efektif, sehingga nilai tercatat menuju nominal pada jatuh tempo.',
    jurnal: [
      { judul: 'Terbit di bawah nominal', baris: ['Dr Kas', 'Dr Diskonto Utang Obligasi', 'Kr Utang Obligasi'] },
      { judul: 'Beban bunga periode', baris: ['Dr Beban Bunga (nilai tercatat x suku efektif)', 'Kr Kas / Utang Bunga (nominal x kupon)', 'Kr Diskonto Utang Obligasi (selisih)'] },
    ],
    rumus: ['Harga terbit = nilai kini kupon + nilai kini nominal pada suku bunga pasar', 'Nilai tercatat = nominal − diskonto belum diamortisasi'],
    jebakan: ['Kas bunga memakai suku kupon dan nominal, beban bunga memakai suku pasar dan nilai tercatat.', 'Suku bunga per periode harus disesuaikan bila bunga dibayar semesteran.'],
  },
  {
    bab: 16,
    title: 'Ekuitas',
    ringkas: 'Dividen mengurangi saldo laba pada saat dideklarasikan, menimbulkan utang dividen; pembayaran kemudian mengurangi kas dan utang itu.',
    jurnal: [
      { judul: 'Deklarasi dividen', baris: ['Dr Saldo Laba (atau Dividen)', 'Kr Utang Dividen'] },
      { judul: 'Pembayaran dividen', baris: ['Dr Utang Dividen', 'Kr Kas'] },
    ],
    rumus: ['Dividen saham preferen kumulatif terutang = tarif x nominal x jumlah tahun tertunggak', 'Agio = (harga terbit − nilai nominal) x jumlah saham'],
    jebakan: ['Tidak ada jurnal saat tanggal pencatat; hanya pada deklarasi dan pembayaran.', 'Dividen yang belum dideklarasikan bukan liabilitas.'],
  },
  {
    bab: 17,
    title: 'Pendapatan dari Kontrak dengan Pelanggan',
    ringkas: 'Pendapatan diakui saat (atau selama) pengendalian atas barang atau jasa berpindah ke pelanggan, sebesar imbalan yang diharapkan diterima. Kontrak sepanjang waktu diakui menurut kemajuan.',
    jurnal: [
      { judul: 'Pendapatan diterima di muka', baris: ['Dr Kas', 'Kr Pendapatan Diterima di Muka (liabilitas kontrak)'] },
      { judul: 'Pengakuan sepanjang waktu', baris: ['Dr Aset Kontrak / Piutang', 'Kr Pendapatan'] },
    ],
    rumus: ['Pendapatan kumulatif = % penyelesaian x harga kontrak', 'Pendapatan periode ini = kumulatif − yang sudah diakui sebelumnya', '% penyelesaian (input) = biaya sampai kini / total estimasi biaya'],
    jebakan: ['Konsinyasi: barang di tangan agen belum menjadi penjualan.', 'Pengembalian yang diperkirakan membentuk liabilitas pengembalian, bukan mengurangi pendapatan nanti.', 'Pendapatan periode berjalan dikurangi yang sudah diakui, bukan seluruh kumulatif.'],
  },
  {
    bab: 18,
    title: 'Pajak Penghasilan',
    ringkas: 'Beban pajak = pajak kini + pajak tangguhan. Pajak kini dihitung dari laba fiskal; perbedaan temporer menimbulkan aset atau liabilitas pajak tangguhan pada tarif yang berlaku.',
    jurnal: [
      { judul: 'Pajak kini', baris: ['Dr Beban Pajak Kini', 'Kr Pajak Dibayar di Muka (PPh 25 / angsuran)', 'Kr Utang Pajak Penghasilan (selisih)'] },
      { judul: 'Aset pajak tangguhan', baris: ['Dr Aset Pajak Tangguhan', 'Kr Beban (Manfaat) Pajak Tangguhan'] },
    ],
    rumus: ['Laba fiskal = laba akuntansi + koreksi positif − koreksi negatif', 'Pajak kini = laba fiskal x tarif', 'Pajak tangguhan = beda temporer x tarif'],
    jebakan: ['Angsuran PPh 25 mengurangi utang pajak, bukan beban.', 'Beda permanen tidak menimbulkan pajak tangguhan.', 'Arah beda temporer menentukan aset atau liabilitas tangguhan.'],
  },
];

const BAB_RE = /\(BAB (\d+) - /;
export const babOfScenario = (no: number): number | null => {
  const m = BAB_RE.exec(SCENARIOS.find((s) => s.no === no)?.topic ?? '');
  return m ? Number(m[1]) : null;
};
export const scenariosOfBab = (bab: number) => SCENARIOS.filter((s) => babOfScenario(s.no) === bab);
