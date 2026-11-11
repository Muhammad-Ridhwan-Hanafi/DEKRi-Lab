import type { Pattern } from '../engine/variants';

/** Materi Jalur Belajar. Contoh hitungan diambil dari generator varian (mesin yang sama dengan penilaian), bukan diketik manual. */
export interface Question {
  q: string;
  options: string[];
  /** indeks jawaban benar pada options */
  answer: number;
  why: string;
}
export interface LearnModule {
  id: string;
  no: number;
  title: string;
  prereq: string[];
  objectives: string[];
  concept: string;
  theory: string[];
  example: { caseText?: string; solutionText?: string; variant?: { pattern: Pattern; seed: number } };
  /** halaman latihan di aplikasi */
  practice?: { label: string; href: string };
  quiz: Question[];
}

export const MODULES: LearnModule[] = [
  {
    id: 'fundamental',
    no: 1,
    title: 'Dasar-dasar Akuntansi',
    prereq: [],
    objectives: ['Menjelaskan tujuan akuntansi dan pengguna laporan keuangan', 'Membedakan dasar kas dan dasar akrual', 'Menyebutkan urutan siklus akuntansi'],
    concept:
      'Akuntansi mengubah peristiwa ekonomi entitas menjadi informasi keuangan yang dipakai pemilik, kreditur, manajemen, dan otoritas pajak untuk mengambil keputusan.',
    theory: [
      'Entitas diperlakukan terpisah dari pemiliknya: PT Sumber Cahaya Elektrindo memiliki catatan sendiri.',
      'Dasar akrual: pendapatan diakui saat diperoleh dan beban saat terjadi, bukan saat kas diterima atau dibayar.',
      'Siklus akuntansi: analisis transaksi, jurnal, posting buku besar, neraca saldo, penyesuaian, laporan keuangan, penutupan.',
    ],
    example: {
      caseText: 'Perusahaan membayar sewa gudang 12 bulan di muka pada 3 Januari.',
      solutionText:
        'Dasar kas: seluruh pembayaran menjadi beban pada Januari. Dasar akrual: dicatat sebagai sewa dibayar di muka, lalu menjadi beban 1/12 setiap bulan.',
    },
    quiz: [
      {
        q: 'Perusahaan mengirim barang pada Desember dan menerima kas pada Januari. Pada dasar akrual, pendapatan diakui pada…',
        options: ['Januari, saat kas diterima', 'Desember, saat barang diserahkan', 'Saat faktur dicetak', 'Saat piutang dihapus'],
        answer: 1,
        why: 'Dasar akrual mengakui pendapatan ketika diperoleh (barang diserahkan), terlepas dari waktu kas diterima.',
      },
      {
        q: 'Urutan yang benar dalam siklus akuntansi adalah…',
        options: [
          'Laporan keuangan, jurnal, neraca saldo',
          'Jurnal, posting, neraca saldo, penyesuaian, laporan',
          'Penutupan, jurnal, laporan',
          'Neraca saldo, jurnal, posting',
        ],
        answer: 1,
        why: 'Transaksi dijurnal, diposting ke buku besar, dibuat neraca saldo, disesuaikan, lalu disusun laporan dan ditutup.',
      },
      {
        q: 'Prinsip entitas terpisah berarti…',
        options: [
          'Perusahaan boleh memakai rekening pribadi pemilik',
          'Pengeluaran pribadi pemilik tidak dicatat sebagai beban perusahaan',
          'Laporan hanya untuk pemilik',
          'Semua entitas memakai bagan akun sama',
        ],
        answer: 1,
        why: 'Transaksi pribadi pemilik terpisah dari catatan perusahaan.',
      },
    ],
  },
  {
    id: 'coa',
    no: 2,
    title: 'Bagan Akun',
    prereq: ['fundamental'],
    objectives: ['Membaca struktur kode akun', 'Menentukan saldo normal tiap kelompok akun', 'Mengenali akun kontra'],
    concept:
      'Bagan akun adalah daftar seluruh akun yang dipakai, dikelompokkan menurut jenisnya. Pada kasus ini kode berawalan 1 aset, 2 liabilitas, 3 ekuitas, 4 pendapatan, 5 HPP, 6 beban operasi, 7 pendapatan dan beban lain.',
    theory: [
      'Saldo normal: aset dan beban di debit; liabilitas, ekuitas, dan pendapatan di kredit.',
      'Akun kontra bersaldo normal berlawanan dengan induknya, misalnya Akumulasi Penyusutan (aset, normal kredit) dan Potongan Penjualan (pendapatan, normal debit).',
      'Pilih akun paling spesifik: Bank Arunika, bukan sekadar Kas, bila kejadian melalui rekening itu.',
    ],
    example: {
      caseText: 'Akun 1-1210 Cadangan Kerugian Penurunan Nilai Piutang.',
      solutionText: 'Jenis aset tetapi saldo normal kredit (akun kontra). Disajikan mengurangi Piutang Usaha 1-1200 sehingga piutang tampil neto.',
    },
    practice: { label: 'Lihat bagan akun di Kasus', href: 'kasus' },
    quiz: [
      {
        q: 'Saldo normal Akumulasi Penyusutan Bangunan adalah…',
        options: ['Debit, karena aset', 'Kredit, karena akun kontra aset', 'Debit, karena beban', 'Tidak punya saldo normal'],
        answer: 1,
        why: 'Akumulasi penyusutan mengurangi aset sehingga bersaldo kredit.',
      },
      {
        q: 'Potongan Penjualan paling tepat disajikan sebagai…',
        options: ['Beban operasi', 'Pengurang pendapatan (kontra pendapatan)', 'Liabilitas', 'Penambah persediaan'],
        answer: 1,
        why: 'Potongan penjualan mengurangi pendapatan bruto sehingga bersaldo debit sebagai kontra pendapatan.',
      },
      {
        q: 'Akun berkode 6-xxxx pada kasus ini adalah kelompok…',
        options: ['Aset lancar', 'Beban operasi', 'Ekuitas', 'Pendapatan lain'],
        answer: 1,
        why: 'Kode 6 dipakai untuk beban operasi.',
      },
    ],
  },
  {
    id: 'persamaan',
    no: 3,
    title: 'Persamaan Akuntansi',
    prereq: ['coa'],
    objectives: [
      'Menyatakan persamaan Aset = Liabilitas + Ekuitas',
      'Menelusuri pengaruh transaksi pada persamaan',
      'Menjelaskan bagaimana laba masuk ke ekuitas',
    ],
    concept:
      'Setiap transaksi menjaga keseimbangan: Aset = Liabilitas + Ekuitas. Ekuitas bertambah oleh setoran modal dan laba, berkurang oleh dividen dan rugi.',
    theory: [
      'Pendapatan menambah ekuitas lewat laba; beban menguranginya.',
      'Pembelian kredit menambah aset (persediaan) dan liabilitas (utang usaha) sama besar.',
      'Transaksi bisa hanya menukar satu aset dengan aset lain tanpa mengubah total.',
    ],
    example: {
      caseText: 'Pemegang saham menyetor Rp400.000.000 ke Bank Arunika (transaksi 1).',
      solutionText: 'Aset (Bank) naik 400 juta dan ekuitas (Modal Saham) naik 400 juta. Persamaan tetap seimbang.',
    },
    practice: { label: 'Kerjakan transaksi 1 dan 2', href: 'transaksi/1' },
    quiz: [
      {
        q: 'Perusahaan membeli perlengkapan Rp4.200.000 secara kredit. Dampaknya…',
        options: ['Aset naik, liabilitas naik', 'Aset naik, ekuitas naik', 'Aset turun, liabilitas turun', 'Tidak ada dampak'],
        answer: 0,
        why: 'Perlengkapan (aset) bertambah dan utang usaha (liabilitas) bertambah sama besar.',
      },
      {
        q: 'Aset Rp900 juta dan liabilitas Rp350 juta. Ekuitas adalah…',
        options: ['Rp1.250 juta', 'Rp550 juta', 'Rp350 juta', 'Rp900 juta'],
        answer: 1,
        why: 'Ekuitas = Aset − Liabilitas = 900 − 350 = 550 juta.',
      },
      {
        q: 'Pembayaran dividen kas kepada pemegang saham akan…',
        options: ['Menambah ekuitas', 'Mengurangi aset dan ekuitas', 'Mengurangi liabilitas saja', 'Menambah beban'],
        answer: 1,
        why: 'Kas (aset) berkurang dan ekuitas berkurang.',
      },
    ],
  },
  {
    id: 'analisis',
    no: 4,
    title: 'Analisis Transaksi',
    prereq: ['persamaan'],
    objectives: [
      'Menentukan apakah suatu peristiwa perlu dijurnal',
      'Menentukan akun yang terlibat dan arah perubahannya',
      'Menurunkan debit dan kredit dari arah perubahan',
    ],
    concept:
      'Empat langkah: (1) apakah peristiwa mengubah posisi keuangan, (2) akun mana yang terlibat, (3) tiap akun bertambah atau berkurang, (4) terjemahkan ke debit atau kredit menurut saldo normal.',
    theory: [
      'Janji atau pesanan yang belum menimbulkan hak atau kewajiban umumnya tidak dijurnal.',
      'Pembelian kredit dengan syarat 2/10, n/30: pada metode gross, utang dicatat sebesar faktur.',
      'Peristiwa tanpa jurnal tetap harus dianalisis dan dijelaskan alasannya.',
    ],
    example: { variant: { pattern: 'beli-kredit', seed: 11 } },
    practice: { label: 'Analisis transaksi', href: 'transaksi/1' },
    quiz: [
      {
        q: 'Perusahaan menandatangani pesanan pembelian tanpa menerima barang. Jurnal?',
        options: ['Debit Persediaan, kredit Utang', 'Tidak ada jurnal saat ini', 'Debit Beban, kredit Kas', 'Debit Kas, kredit Utang'],
        answer: 1,
        why: 'Belum ada barang diterima atau kewajiban yang timbul, sehingga belum dijurnal.',
      },
      {
        q: 'Akun Persediaan bertambah. Ini dicatat di…',
        options: ['Debit', 'Kredit', 'Bisa debit atau kredit sesuka hati', 'Tidak dicatat'],
        answer: 0,
        why: 'Persediaan adalah aset bersaldo normal debit; bertambah di debit.',
      },
      {
        q: 'Utang usaha bertambah karena pembelian kredit. Ini dicatat di…',
        options: ['Debit', 'Kredit', 'Kas', 'Ekuitas'],
        answer: 1,
        why: 'Liabilitas bertambah di kredit.',
      },
    ],
  },
  {
    id: 'jurnal',
    no: 5,
    title: 'Jurnal Umum',
    prereq: ['analisis'],
    objectives: ['Menyusun jurnal yang seimbang', 'Menyusun jurnal majemuk', 'Memakai akun dan nominal yang tepat'],
    concept: 'Jurnal umum mencatat transaksi secara kronologis dengan debit tertulis lebih dulu. Total debit harus sama dengan total kredit.',
    theory: [
      'Jurnal majemuk memakai lebih dari dua baris, misalnya penjualan dengan HPP perpetual.',
      'Nominal dihitung dari fakta soal, bukan disalin mentah; diskon dan pajak perlu dihitung.',
      'Penilaian aplikasi memakai saldo neto per akun, jadi urutan baris tidak memengaruhi nilai.',
    ],
    example: { variant: { pattern: 'jual-kredit', seed: 7 } },
    practice: { label: 'Jurnal transaksi 1-20', href: 'transaksi/1' },
    quiz: [
      {
        q: 'Penjualan kredit Rp100 juta dengan HPP Rp60 juta (perpetual). Akun yang dikredit adalah…',
        options: ['Penjualan 100 juta dan Persediaan 60 juta', 'Piutang 100 juta', 'HPP 60 juta', 'Kas 100 juta'],
        answer: 0,
        why: 'Debit Piutang 100 dan HPP 60; kredit Penjualan 100 dan Persediaan 60.',
      },
      {
        q: 'Jurnal berikut tidak seimbang: Debit Bank 95, Kredit Penjualan 59. Selisih…',
        options: ['Tidak masalah', 'Harus diperbaiki karena debit tidak sama dengan kredit', 'Dicatat di ekuitas', 'Diabaikan jika kecil'],
        answer: 1,
        why: 'Setiap jurnal wajib seimbang.',
      },
      {
        q: 'Diskon pembelian 2% atas faktur Rp186.000.000 saat pelunasan (gross) adalah…',
        options: ['Rp3.720.000 mengurangi Persediaan', 'Rp3.720.000 menambah beban', 'Rp1.860.000', 'Tidak dicatat'],
        answer: 0,
        why: '2% x 186.000.000 = 3.720.000, mengurangi biaya persediaan pada metode gross.',
      },
    ],
  },
  {
    id: 'buku-besar',
    no: 6,
    title: 'Buku Besar',
    prereq: ['jurnal'],
    objectives: ['Memposting jurnal ke buku besar', 'Menghitung saldo akhir akun', 'Mengenali saldo akun yang janggal'],
    concept: 'Buku besar mengelompokkan seluruh mutasi per akun. Saldo akhir = saldo awal + mutasi di sisi normal − mutasi di sisi lawan.',
    theory: [
      'Posting memindahkan setiap baris jurnal ke akun yang sama persis.',
      'Akun aset yang bersaldo kredit patut dicurigai (kecuali akun kontra).',
      'Di aplikasi ini buku besar dihitung otomatis dari jurnal Anda.',
    ],
    example: {
      caseText:
        'Ilustrasi sederhana (bukan saldo akhir kasus, yang memuat banyak mutasi lain): Persediaan saldo awal 468.500.000; pembelian 186.000.000 (debit); HPP penjualan 57.000.000 (kredit).',
      solutionText: 'Saldo = 468.500.000 + 186.000.000 − 57.000.000 = 597.500.000 (debit).',
    },
    practice: { label: 'Buka Buku Besar', href: 'buku-besar' },
    quiz: [
      {
        q: 'Saldo awal Kas 145 juta, debit 80 juta, kredit 30 juta. Saldo akhir…',
        options: ['195 juta debit', '95 juta debit', '255 juta debit', '195 juta kredit'],
        answer: 0,
        why: '145 + 80 − 30 = 195 juta (debit).',
      },
      {
        q: 'Posting dilakukan dari…',
        options: ['Neraca saldo ke jurnal', 'Jurnal ke buku besar', 'Laporan ke jurnal', 'Buku besar ke laporan arus kas langsung'],
        answer: 1,
        why: 'Jurnal diposting ke buku besar.',
      },
      {
        q: 'Akun Utang Usaha bersaldo debit besar menandakan…',
        options: ['Hal normal', 'Kemungkinan kelebihan bayar atau salah posting', 'Piutang bertambah', 'Ekuitas naik'],
        answer: 1,
        why: 'Liabilitas normalnya kredit; saldo debit besar perlu diselidiki.',
      },
    ],
  },
  {
    id: 'neraca-saldo',
    no: 7,
    title: 'Neraca Saldo',
    prereq: ['buku-besar'],
    objectives: ['Menyusun neraca saldo dari buku besar', 'Menjelaskan arti neraca saldo yang seimbang', 'Menyebutkan kesalahan yang tidak terdeteksi'],
    concept: 'Neraca saldo mendaftar saldo setiap akun buku besar. Total debit harus sama dengan total kredit.',
    theory: [
      'Seimbang tidak menjamin benar: salah akun, transaksi terlewat, atau kesalahan yang saling meniadakan tidak terdeteksi.',
      'Tidak seimbang menandakan ada jurnal satu sisi, salah hitung saldo, atau salah salin.',
      'Neraca saldo sebelum penyesuaian belum memuat beban akrual dan penyusutan.',
    ],
    example: {
      caseText: 'Sebuah jurnal hanya mencatat debit Bank 5.000.000 tanpa kreditnya.',
      solutionText: 'Neraca saldo menunjukkan debit lebih besar 5.000.000 dari kredit. Selisih sama dengan jumlah baris yang hilang.',
    },
    practice: { label: 'Buka Neraca Saldo', href: 'neraca-saldo' },
    quiz: [
      {
        q: 'Kesalahan yang TIDAK terdeteksi oleh neraca saldo adalah…',
        options: [
          'Jurnal hanya debit',
          'Mengkredit akun yang salah dengan nominal yang benar',
          'Salah salin saldo satu akun',
          'Saldo kredit dicatat sebagai debit',
        ],
        answer: 1,
        why: 'Total tetap sama walau akun salah, sehingga tidak terdeteksi.',
      },
      {
        q: 'Total debit 2.505 juta dan total kredit 2.500 juta. Penyebab paling mungkin…',
        options: ['Satu jurnal kurang kredit 5 juta', 'Dividen dikreditkan', 'Persediaan naik', 'Semua benar'],
        answer: 0,
        why: 'Selisih debit lebih besar 5 juta menunjukkan kredit senilai itu terlewat.',
      },
      {
        q: 'Neraca saldo disusun dari…',
        options: ['Laporan laba rugi', 'Saldo akun buku besar', 'Daftar transaksi mentah', 'Laporan arus kas'],
        answer: 1,
        why: 'Neraca saldo merangkum saldo buku besar.',
      },
    ],
  },
  {
    id: 'penyesuaian',
    no: 8,
    title: 'Jurnal Penyesuaian',
    prereq: ['neraca-saldo'],
    objectives: ['Mengenali jenis penyesuaian', 'Menghitung beban penyusutan, beban dibayar di muka, dan akrual', 'Menyusun jurnal penyesuaian'],
    concept:
      'Penyesuaian menandingkan pendapatan dan beban pada periode yang benar. Jenisnya: beban dibayar di muka, pendapatan diterima di muka, beban akrual, pendapatan akrual, penyusutan, cadangan.',
    theory: [
      'Setiap penyesuaian menyentuh minimal satu akun laba rugi dan satu akun neraca.',
      'Penyusutan garis lurus = (biaya perolehan − residu) / umur manfaat.',
      'Hitung mulai dari fakta soal; periksa saldo awal akun terkait sebelum menjurnal.',
    ],
    example: { variant: { pattern: 'penyusutan', seed: 4 } },
    practice: { label: 'Jurnal penyesuaian', href: 'penyesuaian' },
    quiz: [
      {
        q: 'Sewa dibayar di muka Rp72 juta untuk 12 bulan, sudah berjalan 3 bulan. Beban sewa periode ini…',
        options: ['Rp18 juta', 'Rp72 juta', 'Rp6 juta', 'Rp24 juta'],
        answer: 0,
        why: '72 juta x 3/12 = 18 juta.',
      },
      {
        q: 'Jurnal penyesuaian penyusutan selalu…',
        options: ['Mendebit beban penyusutan dan mengkredit akumulasi penyusutan', 'Mengkredit kas', 'Mendebit aset', 'Tidak memengaruhi laba'],
        answer: 0,
        why: 'Beban naik (debit) dan akumulasi penyusutan bertambah (kredit).',
      },
      {
        q: 'Beban gaji terutang yang belum dibayar harus dicatat sebagai…',
        options: ['Debit Beban Gaji, kredit Beban yang Masih Harus Dibayar', 'Debit Kas', 'Kredit Beban Gaji', 'Tidak dicatat sampai dibayar'],
        answer: 0,
        why: 'Dasar akrual mengakui beban saat terjadi dengan liabilitas akrual.',
      },
    ],
  },
  {
    id: 'ns-penyesuaian',
    no: 9,
    title: 'Neraca Saldo Setelah Penyesuaian',
    prereq: ['penyesuaian'],
    objectives: [
      'Menghitung saldo setelah penyesuaian',
      'Memastikan neraca saldo setelah penyesuaian seimbang',
      'Memisahkan akun laporan laba rugi dan neraca',
    ],
    concept:
      'Neraca saldo setelah penyesuaian = neraca saldo sebelum penyesuaian ditambah jurnal penyesuaian. Saldonya menjadi dasar seluruh laporan keuangan.',
    theory: [
      'Saldo akhir = saldo sebelum + debit penyesuaian − kredit penyesuaian.',
      'Akun pendapatan dan beban masuk laporan laba rugi; sisanya masuk laporan posisi keuangan.',
      'Total tetap harus seimbang; bila tidak, ada jurnal penyesuaian yang timpang.',
    ],
    example: {
      caseText:
        'AJ01: sewa baru 72.000.000 untuk 12 bulan dibayar 3 Januari, ditambah saldo awal Sewa Dibayar di Muka 36.000.000 yang seluruhnya habis pada 2024.',
      solutionText:
        'Beban Sewa dari akun ini = 72.000.000 + 36.000.000 = 108.000.000, sehingga Beban Sewa naik 108.000.000 dan Sewa Dibayar di Muka berkurang sebesar itu. Saldo akun setelah penyesuaian = saldo sebelumnya − 108.000.000.',
    },
    practice: { label: 'Neraca saldo setelah penyesuaian', href: 'neraca-saldo' },
    quiz: [
      {
        q: 'Saldo Perlengkapan 9,8 juta; terpakai 6 juta. Saldo setelah penyesuaian…',
        options: ['3,8 juta', '15,8 juta', '6 juta', '9,8 juta'],
        answer: 0,
        why: '9,8 − 6 = 3,8 juta.',
      },
      {
        q: 'Neraca saldo setelah penyesuaian tidak seimbang. Sebab paling mungkin…',
        options: ['Ada jurnal penyesuaian yang debit dan kreditnya tidak sama', 'Persediaan naik', 'Kas bertambah', 'Pendapatan terlalu besar'],
        answer: 0,
        why: 'Penyesuaian yang timpang merusak keseimbangan.',
      },
      {
        q: 'Akun Beban Penyusutan setelah penyesuaian dimasukkan ke…',
        options: ['Laporan laba rugi', 'Laporan posisi keuangan', 'Laporan perubahan ekuitas langsung', 'Tidak dilaporkan'],
        answer: 0,
        why: 'Beban adalah akun laporan laba rugi.',
      },
    ],
  },
  {
    id: 'laporan',
    no: 10,
    title: 'Laporan Keuangan',
    prereq: ['ns-penyesuaian'],
    objectives: [
      'Menyusun laporan laba rugi, perubahan ekuitas, posisi keuangan, dan arus kas',
      'Menjelaskan keterkaitan antar laporan',
      'Memeriksa konsistensi antar laporan',
    ],
    concept:
      'Urutan penyusunan: laba rugi, perubahan ekuitas, posisi keuangan, arus kas. Laba bersih mengalir ke ekuitas, saldo ekuitas akhir ke posisi keuangan, dan perubahan kas ke saldo kas neraca.',
    theory: [
      'Laba bersih = pendapatan − beban (termasuk pajak).',
      'Ekuitas akhir = ekuitas awal + setoran + laba − dividen.',
      'Posisi keuangan: Aset = Liabilitas + Ekuitas. Kas akhir pada arus kas harus sama dengan kas di neraca.',
    ],
    example: {
      caseText: 'Aplikasi memeriksa 14 keterkaitan, misalnya laba bersih pada laba rugi sama dengan yang masuk perubahan ekuitas.',
      solutionText: 'Buka halaman Laporan dan telusuri angka ke jurnal asalnya.',
    },
    practice: { label: 'Buka Laporan', href: 'laporan' },
    quiz: [
      {
        q: 'Laporan yang disusun lebih dulu karena hasilnya dipakai laporan lain adalah…',
        options: ['Laba rugi', 'Posisi keuangan', 'Arus kas', 'Catatan'],
        answer: 0,
        why: 'Laba bersih diperlukan untuk laporan perubahan ekuitas.',
      },
      {
        q: 'Ekuitas awal 500, laba 120, dividen 40, tanpa setoran. Ekuitas akhir…',
        options: ['580', '660', '620', '540'],
        answer: 0,
        why: '500 + 120 − 40 = 580.',
      },
      {
        q: 'Saldo kas akhir pada laporan arus kas harus sama dengan…',
        options: ['Kas dan setara kas pada posisi keuangan', 'Laba bersih', 'Total aset', 'Modal saham'],
        answer: 0,
        why: 'Itu pemeriksaan konsistensi antara arus kas dan neraca.',
      },
    ],
  },
  {
    id: 'penutup',
    no: 11,
    title: 'Jurnal Penutup',
    prereq: ['laporan'],
    objectives: ['Menyebutkan empat langkah penutupan', 'Menutup akun nominal ke Ikhtisar Laba Rugi dan Saldo Laba', 'Menutup dividen'],
    concept: 'Akun nominal (pendapatan, beban, dividen) ditutup agar periode berikutnya dimulai dari nol, dan hasilnya dipindahkan ke Saldo Laba.',
    theory: [
      '1) Tutup pendapatan ke Ikhtisar Laba Rugi. 2) Tutup beban ke Ikhtisar Laba Rugi. 3) Tutup Ikhtisar Laba Rugi ke Saldo Laba. 4) Tutup Dividen ke Saldo Laba.',
      'Akun kontra pendapatan (retur, potongan) ditutup di sisi debit.',
      'Akun riil (aset, liabilitas, modal) tidak ditutup.',
    ],
    example: {
      caseText: 'Penjualan bersaldo kredit 1.000; beban total 700.',
      solutionText:
        'Debit Penjualan 1.000 kredit Ikhtisar 1.000; debit Ikhtisar 700 kredit Beban 700; saldo Ikhtisar kredit 300 ditutup dengan debit Ikhtisar 300 kredit Saldo Laba 300.',
    },
    practice: { label: 'Jurnal penutup', href: 'penutup' },
    quiz: [
      {
        q: 'Akun yang TIDAK ditutup adalah…',
        options: ['Beban Gaji', 'Penjualan', 'Persediaan', 'Dividen'],
        answer: 2,
        why: 'Persediaan adalah akun riil yang saldonya dibawa ke periode berikutnya.',
      },
      {
        q: 'Ikhtisar Laba Rugi bersaldo kredit 300 berarti…',
        options: ['Laba 300', 'Rugi 300', 'Dividen 300', 'Kesalahan'],
        answer: 0,
        why: 'Pendapatan melebihi beban; saldo kredit merupakan laba.',
      },
      { q: 'Dividen ditutup ke…', options: ['Saldo Laba', 'Pendapatan', 'Kas', 'Modal Saham'], answer: 0, why: 'Dividen mengurangi Saldo Laba.' },
    ],
  },
  {
    id: 'pasca-penutup',
    no: 12,
    title: 'Neraca Saldo Setelah Penutupan',
    prereq: ['penutup'],
    objectives: ['Menyusun neraca saldo setelah penutupan', 'Memastikan akun nominal bersaldo nol', 'Mencocokkan dengan posisi keuangan'],
    concept: 'Neraca saldo setelah penutupan hanya memuat akun riil, seluruhnya berupa saldo akhir yang menjadi saldo awal periode berikutnya.',
    theory: [
      'Akun pendapatan, beban, dan dividen bersaldo nol.',
      'Saldo Laba sudah memuat laba periode berjalan dikurangi dividen.',
      'Total debit sama dengan total kredit dan sama dengan data pada posisi keuangan.',
    ],
    example: {
      caseText: 'Aplikasi menampilkan neraca saldo setelah penutupan dari jurnal penutup yang Anda isi.',
      solutionText: 'Bila ada akun nominal yang masih bersaldo, ada baris penutup yang kurang atau salah.',
    },
    practice: { label: 'Penutup dan neraca saldo pasca-penutupan', href: 'penutup' },
    quiz: [
      {
        q: 'Setelah penutupan, saldo Beban Sewa adalah…',
        options: ['Nol', 'Sama dengan sebelum penutupan', 'Kredit', 'Dipindahkan ke aset'],
        answer: 0,
        why: 'Akun nominal ditutup sehingga bersaldo nol.',
      },
      {
        q: 'Total aset pada neraca saldo pasca-penutupan harus sama dengan…',
        options: ['Total aset pada posisi keuangan', 'Laba bersih', 'Total pendapatan', 'Dividen'],
        answer: 0,
        why: 'Keduanya memuat akun riil yang sama.',
      },
      {
        q: 'Saldo Laba setelah penutupan = ',
        options: ['Saldo awal + laba − dividen', 'Saldo awal − laba', 'Laba saja', 'Saldo awal + dividen'],
        answer: 0,
        why: 'Laba menambah dan dividen mengurangi Saldo Laba.',
      },
    ],
  },
  {
    id: 'analisis-laporan',
    no: 13,
    title: 'Analisis Laporan Keuangan',
    prereq: ['pasca-penutup'],
    objectives: [
      'Menghitung rasio likuiditas, solvabilitas, profitabilitas, aktivitas',
      'Membaca common size dan DuPont',
      'Menyadari keterbatasan interpretasi rasio',
    ],
    concept: 'Analisis laporan mengubah angka menjadi rasio dan persentase agar kinerja dapat dibandingkan lintas waktu atau perusahaan.',
    theory: [
      'Rasio lancar = aset lancar / liabilitas jangka pendek.',
      'ROE = margin laba bersih x perputaran aset x pengganda ekuitas (DuPont).',
      'Satu periode tidak cukup untuk menyimpulkan tren; rasio perlu dibandingkan dengan industri yang sejenis.',
    ],
    example: {
      caseText: 'Laba bersih 100, penjualan 1.000, total aset 800, ekuitas 400.',
      solutionText: 'Margin 10%; perputaran aset 1,25x; pengganda ekuitas 2x; ROE = 10% x 1,25 x 2 = 25% = 100/400.',
    },
    quiz: [
      { q: 'Aset lancar 600, liabilitas jangka pendek 300. Rasio lancar…', options: ['2,0x', '0,5x', '3,0x', '1,0x'], answer: 0, why: '600 / 300 = 2,0x.' },
      { q: 'Margin 8%, perputaran aset 1,5x, pengganda ekuitas 2x. ROE…', options: ['24%', '12%', '16%', '3%'], answer: 0, why: '8% x 1,5 x 2 = 24%.' },
      {
        q: 'Alasan rasio tidak boleh ditafsirkan sendirian adalah…',
        options: [
          'Rasio selalu salah',
          'Standar wajar berbeda antar industri dan perlu pembanding waktu',
          'Rasio hanya untuk bank',
          'Rasio tidak memakai angka laporan',
        ],
        answer: 1,
        why: 'Interpretasi memerlukan pembanding yang relevan.',
      },
    ],
  },
];

export const MODULE_BY_ID: Record<string, LearnModule> = Object.fromEntries(MODULES.map((m) => [m.id, m]));
