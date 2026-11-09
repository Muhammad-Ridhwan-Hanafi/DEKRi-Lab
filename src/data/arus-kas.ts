/**
 * Latihan klasifikasi arus kas (PSAK 207), terpisah dari 26 skenario inti: tidak memengaruhi akurasi Dashboard maupun pool ujian.
 * Dua kelompok sengaja dipisah menurut periode berlaku: jangan mencampur aturan sebelum dan sesudah amendemen PSAK 207 terkait PSAK 118.
 * Nomor paragraf ditandai "cek" sampai dicocokkan dengan naskah final di SAK Online (IAI).
 */
export type KasKelompok = '7A' | '7B';

export interface KasOpsi {
  teks: string;
  /** mengapa opsi ini benar atau salah, dalam konteks soal */
  alasan: string;
}
export interface KasSoal {
  id: string;
  kelompok: KasKelompok;
  judul: string;
  narasi: string;
  pertanyaan: string;
  opsi: KasOpsi[];
  /** indeks opsi yang benar */
  kunci: number;
  penjelasan: string;
  dasar: string;
}

export const KAS_KELOMPOK: Record<KasKelompok, { judul: string; standar: string; periode: string; asumsi: string }> = {
  '7A': {
    judul: '7A. Klasifikasi arus kas, sebelum amendemen PSAK 118',
    standar: 'PSAK 207 Laporan Arus Kas (ketentuan yang berlaku untuk tahun buku 2024 sampai 2026)',
    periode: 'Berlaku untuk periode sebelum 1 Januari 2027',
    asumsi: 'Entitas bukan lembaga keuangan. Kebijakan entitas dinyatakan pada soal dan diterapkan secara konsisten.',
  },
  '7B': {
    judul: '7B. Klasifikasi arus kas, setelah amendemen PSAK 207 terkait PSAK 118',
    standar: 'PSAK 207 sebagaimana diamendemen oleh PSAK 118 (disahkan DSAK IAI 28 Mei 2025)',
    periode: 'Efektif untuk periode tahunan yang dimulai 1 Januari 2027',
    asumsi: 'Entitas bukan lembaga keuangan, kecuali soal menyatakan lain. Pilihan kebijakan 7A tidak lagi tersedia.',
  },
};

const KAT = ['Operasi', 'Investasi', 'Pendanaan', 'Bukan arus kas'];
const opsi = (alasan: [string, string, string, string]): KasOpsi[] => KAT.map((teks, i) => ({ teks, alasan: alasan[i] }));

export const KAS_SOAL: KasSoal[] = [
  {
    id: '7A-1',
    kelompok: '7A',
    judul: 'Saham untuk diperdagangkan',
    narasi: 'PT Dagang Sentosa membeli saham perusahaan terbuka senilai Rp50.000.000 secara tunai. Saham itu dimiliki untuk diperdagangkan (dealing atau trading) dan diukur pada nilai wajar melalui laba rugi.',
    pertanyaan: 'Di aktivitas apa pembayaran kas ini disajikan dalam laporan arus kas (ketentuan sebelum 2027)?',
    opsi: opsi([
      'Benar. Arus kas dari efek yang dimiliki untuk diperdagangkan disajikan di operasi, karena efek itu serupa persediaan bagi entitas tersebut.',
      'Salah. Investasi hanya untuk perolehan instrumen utang atau ekuitas yang tidak dimiliki untuk diperdagangkan.',
      'Salah. Pendanaan menyangkut kontribusi modal dan pinjaman entitas, bukan pembelian efek.',
      'Salah. Pembelian saham dengan kas adalah arus kas keluar nyata, bukan transaksi non-kas.',
    ]),
    kunci: 0,
    penjelasan: 'Efek untuk diperdagangkan masuk operasi; efek yang bukan untuk diperdagangkan masuk investasi.',
    dasar: 'PSAK 207 par.14-16 (cek ke naskah resmi).',
  },
  {
    id: '7A-2',
    kelompok: '7A',
    judul: 'Saham untuk investasi jangka panjang',
    narasi: 'PT Dagang Sentosa membeli saham perusahaan lain senilai Rp80.000.000 secara tunai untuk investasi jangka panjang, bukan untuk diperdagangkan.',
    pertanyaan: 'Di aktivitas apa pembayaran kas ini disajikan (ketentuan sebelum 2027)?',
    opsi: opsi([
      'Salah. Operasi dipakai untuk efek yang dimiliki untuk diperdagangkan, sedangkan saham ini bukan untuk diperdagangkan.',
      'Benar. Perolehan instrumen ekuitas yang bukan untuk diperdagangkan adalah aktivitas investasi.',
      'Salah. Pembelian saham perusahaan lain tidak mengubah modal atau pinjaman entitas sendiri.',
      'Salah. Ada kas keluar sungguhan, jadi ini arus kas.',
    ]),
    kunci: 1,
    penjelasan: 'Perolehan instrumen ekuitas atau utang pihak lain selain untuk diperdagangkan adalah investasi.',
    dasar: 'PSAK 207 par.16 (cek ke naskah resmi).',
  },
  {
    id: '7A-3',
    kelompok: '7A',
    judul: 'Bunga dibayar dengan kebijakan operasi',
    narasi: 'PT Dagang Sentosa membayar bunga pinjaman bank Rp12.000.000 secara tunai. Kebijakan akuntansinya: bunga dibayar disajikan di aktivitas operasi dan diterapkan secara konsisten dari tahun ke tahun.',
    pertanyaan: 'Di aktivitas apa pembayaran bunga ini disajikan (ketentuan sebelum 2027)?',
    opsi: opsi([
      'Benar. Sebelum amendemen, bunga dibayar boleh di operasi atau pendanaan; kebijakan entitas di soal adalah operasi.',
      'Salah. Bunga dibayar tidak termasuk perolehan aset jangka panjang.',
      'Salah. Pendanaan juga diperbolehkan secara umum, tetapi kebijakan entitas pada soal memilih operasi, jadi itu yang dipakai.',
      'Salah. Pembayaran bunga tunai adalah arus kas keluar.',
    ]),
    kunci: 0,
    penjelasan: 'Bunga dan dividen diungkapkan terpisah dan diklasifikasikan konsisten dari periode ke periode; pilihan klasifikasi bunga dibayar adalah operasi atau pendanaan.',
    dasar: 'PSAK 207 par.31-34 (cek ke naskah resmi).',
  },
  {
    id: '7A-4',
    kelompok: '7A',
    judul: 'Dividen dibayar dengan kebijakan pendanaan',
    narasi: 'PT Dagang Sentosa membayar dividen tunai Rp30.000.000 kepada pemegang saham. Kebijakan akuntansinya: dividen dibayar disajikan di aktivitas pendanaan.',
    pertanyaan: 'Di aktivitas apa pembayaran dividen ini disajikan (ketentuan sebelum 2027)?',
    opsi: opsi([
      'Salah. Operasi diperbolehkan sebagai alternatif, tetapi kebijakan entitas pada soal adalah pendanaan.',
      'Salah. Dividen dibayar bukan perolehan atau pelepasan aset jangka panjang.',
      'Benar. Dividen dibayar kepada pemilik adalah biaya memperoleh sumber daya keuangan, dan kebijakan entitas memilih pendanaan.',
      'Salah. Dividen tunai adalah arus kas keluar.',
    ]),
    kunci: 2,
    penjelasan: 'Sebelum amendemen, dividen dibayar boleh operasi atau pendanaan; ikuti kebijakan yang dinyatakan dan konsisten.',
    dasar: 'PSAK 207 par.31-34 (cek ke naskah resmi).',
  },
  {
    id: '7B-1',
    kelompok: '7B',
    judul: 'Bunga dibayar',
    narasi: 'Untuk tahun buku yang dimulai 1 Januari 2027 dan seterusnya, PT Manufaktur Prima (bukan lembaga keuangan; aktivitas utamanya memproduksi barang) membayar bunga pinjaman bank Rp12.000.000.',
    pertanyaan: 'Di aktivitas apa bunga dibayar disajikan setelah amendemen PSAK 207?',
    opsi: opsi([
      'Salah. Pilihan menyajikan bunga dibayar di operasi sudah dihapus bagi entitas seperti ini.',
      'Salah. Investasi adalah klasifikasi untuk bunga dan dividen yang diterima.',
      'Benar. Bagi entitas yang aktivitas utamanya bukan investasi atau pemberian pendanaan kepada pelanggan, bunga dibayar masuk pendanaan.',
      'Salah. Pembayaran tunai adalah arus kas.',
    ]),
    kunci: 2,
    penjelasan: 'Default setelah amendemen: bunga dibayar di pendanaan.',
    dasar: 'PSAK 207 par.33A dan 34A-34D, diperkenalkan oleh PSAK 118 (cek ke naskah final).',
  },
  {
    id: '7B-2',
    kelompok: '7B',
    judul: 'Bunga diterima',
    narasi: 'Untuk tahun buku yang dimulai 1 Januari 2027 dan seterusnya, PT Manufaktur Prima (bukan lembaga keuangan; aktivitas utamanya memproduksi barang) menerima bunga deposito Rp4.000.000 secara tunai.',
    pertanyaan: 'Di aktivitas apa bunga diterima disajikan setelah amendemen PSAK 207?',
    opsi: opsi([
      'Salah. Operasi tidak lagi menjadi klasifikasi bunga diterima bagi entitas ini.',
      'Benar. Bagi entitas yang aktivitas utamanya bukan investasi atau pemberian pendanaan kepada pelanggan, bunga diterima masuk investasi.',
      'Salah. Pendanaan dipakai untuk bunga dibayar dan dividen dibayar.',
      'Salah. Penerimaan bunga tunai adalah arus kas masuk.',
    ]),
    kunci: 1,
    penjelasan: 'Default setelah amendemen: bunga diterima di investasi.',
    dasar: 'PSAK 207 par.34A (cek ke naskah final).',
  },
  {
    id: '7B-3',
    kelompok: '7B',
    judul: 'Dividen diterima',
    narasi: 'Untuk tahun buku yang dimulai 1 Januari 2027 dan seterusnya, PT Manufaktur Prima (bukan lembaga keuangan) menerima dividen tunai Rp6.000.000 dari investasi sahamnya pada perusahaan lain.',
    pertanyaan: 'Di aktivitas apa dividen diterima disajikan setelah amendemen PSAK 207?',
    opsi: opsi([
      'Salah. Operasi tidak lagi menjadi klasifikasi dividen diterima bagi entitas ini.',
      'Benar. Dividen diterima masuk investasi bagi entitas yang bukan pengecualian.',
      'Salah. Pendanaan adalah untuk dividen yang dibayar entitas.',
      'Salah. Dividen tunai adalah arus kas masuk.',
    ]),
    kunci: 1,
    penjelasan: 'Default setelah amendemen: dividen diterima di investasi.',
    dasar: 'PSAK 207 par.34A (cek ke naskah final).',
  },
  {
    id: '7B-4',
    kelompok: '7B',
    judul: 'Dividen dibayar',
    narasi: 'Untuk tahun buku yang dimulai 1 Januari 2027 dan seterusnya, PT Manufaktur Prima membayar dividen tunai Rp30.000.000 kepada pemegang sahamnya.',
    pertanyaan: 'Di aktivitas apa dividen dibayar disajikan setelah amendemen PSAK 207?',
    opsi: opsi([
      'Salah. Pilihan operasi untuk dividen dibayar sudah dihapus.',
      'Salah. Investasi dipakai untuk dividen dan bunga yang diterima.',
      'Benar. Dividen dibayar kepada pemilik disajikan di pendanaan.',
      'Salah. Dividen tunai adalah arus kas keluar.',
    ]),
    kunci: 2,
    penjelasan: 'Dividen dibayar disajikan di pendanaan setelah amendemen.',
    dasar: 'PSAK 207 par.34A-34D (cek ke naskah final).',
  },
  {
    id: '7B-5',
    kelompok: '7B',
    judul: 'Pengecualian: perusahaan pembiayaan',
    narasi: 'Untuk tahun buku yang dimulai 1 Januari 2027 dan seterusnya, PT Multi Pembiayaan menyediakan pembiayaan kepada pelanggan sebagai aktivitas bisnis utamanya. Perusahaan menerima bunga atas piutang pembiayaan dan menyajikan penghasilan bunga itu pada kategori operasi dalam laporan laba rugi menurut PSAK 118.',
    pertanyaan: 'Bagaimana klasifikasi arus kas bunga yang diterima itu?',
    opsi: opsi([
      'Benar sebagai prinsip untuk entitas pengecualian: klasifikasi arus kas bunga mengikuti kategori penyajian penghasilan bunga terkait di laba rugi (di sini operasi).',
      'Salah. Aturan default investasi berlaku bagi entitas yang bukan pengecualian, sedangkan perusahaan ini pengecualian.',
      'Salah. Pendanaan bukan kategori penghasilan bunga piutang pembiayaan di laba rugi.',
      'Salah. Penerimaan bunga tunai adalah arus kas.',
    ]),
    kunci: 0,
    penjelasan: 'Entitas yang aktivitas bisnis utamanya investasi atau pemberian pendanaan kepada pelanggan menentukan klasifikasi bunga dan dividen berdasarkan kategori penyajian penghasilan atau beban terkait di laba rugi (PSAK 118), bukan default. Dividen dibayar tetap pendanaan untuk semua entitas.',
    dasar: 'PSAK 207 par.34B-34D (cek ke naskah final; materi pengecualian ini paling perlu diverifikasi).',
  },
];
