# Catatan perubahan

## 2.0.0

### Ringkasan dibanding versi 1

- Seluruh aplikasi ditulis ulang dengan Rust (Dioxus dan WebView sistem). Electron, React, TypeScript, dan Node.js tidak dipakai lagi. Isi pelajaran (kasus, soal, kunci, penjelasan) dan hasil penilaian tetap sama.
- Pengamatan Task Manager saat aplikasi diam: versi 1 memakai 209,4 MB untuk 4 proses, versi 2 memakai 6,8 MB untuk proses aplikasinya. WebView2 milik Windows berjalan sebagai proses terpisah dan tidak termasuk angka itu; ini bukan tolok ukur baku.
- Rilis berupa pemasang Windows dan ZIP tanpa pemasangan. Versi HTML mandiri dihentikan.
- Folder progres dan folder cadangan sama dengan versi 1. Progres di penyimpanan peramban versi 1 tidak ikut pindah otomatis; gunakan cadangan (lihat README, "Pindah dari versi 1").
- Fitur baru: Latihan Hari Ini, Peta konsep, Bagaimana-jika, dampak jurnal ke laporan, penelusuran asal angka, tempel dari Excel, mode Fokus, tema Ikuti sistem, dan pesan yang jelas untuk "tidak perlu jurnal". Rincian ada di bagian-bagian berikut.

### Seluruh aplikasi kini ditulis dengan Rust

- Aplikasi dipindahkan dari Electron/React/TypeScript ke **Rust** dengan antarmuka Dioxus (WebView sistem) yang memakai ulang CSS dan animasi versi 1. Satu biner kecil, tanpa Node.js dan tanpa mem-bundel peramban. Repositori kini hanya berisi kode Rust (`crates/`), data kasus (`data/`), pemasang NSIS (`installer/`), dan dokumen.
- Tampilan lama dipulihkan di versi Rust: kanvas krem, border hitam tebal, bayangan keras, aksen indigo, sidebar lila, menu terpilih hijau limau, font Inter, layar masuk berdekorasi, serta mode terang/gelap (Pengaturan > Tampilan atau tombol di sidebar).
- Mesin akuntansi, penilaian, laporan (298 sel), generator soal varian, ujian, jalur belajar, dan cadangan sudah diuji sama dengan workbook Excel dan versi TypeScript (35 tes).
- Versi HTML mandiri (`DEKRi-Lab.html`) dan pembungkus Electron/Tauri dihentikan. Rilis kini berisi pemasang Windows dan ZIP tanpa pemasangan.
- Pemasang Windows (NSIS) berupa wizard biasa dengan **pilihan folder tujuan**, per pengguna tanpa hak administrator; uninstall tidak menghapus progres.
- Progres versi lama (IndexedDB) tidak ikut pindah; cadangan otomatis di `Dokumen\Latihan Siklus Akuntansi\Cadangan` dan cadangan hasil ekspor tetap terbaca.
- Konten terbaru dibawa ke versi Rust: penjelasan kunci tiga bagian pendek (Intinya, Mengapa dicatat begini, Ingat), kunci Analisis (opsional) hanya empat isian, Pengaturan > Tentang dengan penafian PSAK, perusahaan fiktif, tanpa afiliasi, dan kotak laporan soal keliru (tautan disalin).
- Penanda “(cek ke naskah resmi/final)” pada soal arus kas dihapus dari tampilan.
- CI diganti: `cargo fmt`, `clippy -D warnings`, `cargo test`, dan pembuatan pemasang di `windows-latest`. Dependabot untuk Cargo dan GitHub Actions. SBOM npm dihentikan (tidak ada lagi dependensi npm).
- Peringatan dependensi alat build Node (mis. `minimatch`) tidak relevan lagi.
- Tata letak dan perilaku versi 1 dipertahankan: kalkulator melayang (bisa digeser, Alt+panah), pencarian Ctrl+K, bantuan pintasan, splash awal, onboarding, 17 menu sidebar dengan tab Belajar/Materi, Ujian dan Pengaturan dengan struktur sama, animasi masuk/pop/shake.
- Diagnosis kesalahan (tanpa membuka kunci), perbandingan jawaban dengan kunci, petunjuk bertingkat, penanda/catatan, "Mengapa jawaban ini benar", blok Analisis (opsional), dan "Soal berikutnya" dengan Ctrl+Enter kini ada di Transaksi, Penyesuaian, dan Skenario.
- Perbaikan yang juga berlaku bagi pengguna versi 1: tombol kalkulator kini menyisipkan di posisi kursor (tidak lagi melompat ke akhir); Bagan akun di Kasus bisa dicari dan difilter menurut tipe; kalimat \"Di luar inti materi\u2026\" dihapus dari narasi Transaksi 65; nama akun yang panjang di kolom jurnal bergeser otomatis saat disorot sehingga terbaca penuh.
- Dari review kode: Transaksi beralih ke dua kolom hanya pada lebar ≥1280 px (di bawahnya daftar di atas, jurnal tidak lagi sesak); tombol Sebelumnya/Berikutnya mengikuti filter; Jurnal Umum punya pencarian (nomor, topik, akun, keterangan); daftar materi Jalur Belajar menempel dan punya scroll sendiri.
- Ikon jendela (bilah judul/taskbar) kini logo DEKRi Lab. Tampilan Laporan dirapikan: lebar kolom tetap, tepi kanan rata, angka rapat ke kanan, kolom kosong dibuang, catatan tunggal dilipat di bawah label, subtotal bergaris, nilai nol redup, label rincian menjorok.
- Perbaikan laporan pengguna: ikon tertanam di dekri-lab.exe (build.rs + embed-resource); tidak ada lagi jendela CMD (subsistem Windows); mode fokus kini bisa keluar lagi (tombol Fokus atau Esc; gaya inline dibuat eksplisit); tema awal terang; folder data Windows memakai nama yang sama dengan versi 1 (`Latihan Siklus Akuntansi`, data pratinjau 2.0 disalin sekali) dan cadangan v1 dipulihkan otomatis saat pengguna dengan nama sama masuk; tab Profil pada Kasus dirancang ulang menjadi kartu identitas dan kartu topik.
- Perbaikan dari audit UI/UX: Pemeriksaan silang bisa dibuka dari toolbar Laporan; strip status sticky di Neraca Saldo; penanda "selisih" dan lompat ke transaksi tidak seimbang di Jurnal Umum; Buku Besar memakai pemilih akun dengan tombol sebelumnya/berikutnya; label filter Transaksi; tombol "Buka" pada baris ulasan Beranda; ukuran jendela minimum 1024x640; Ctrl+Z native di kolom teks; jebakan fokus pada dialog; label tab Laporan tanpa kode sheet; jadwal ulasan memakai satu sumber (`schedule_text`) sehingga teks tidak lagi keliru.
- Ditambahkan: penelusuran asal angka Laporan (klik angka), banner pemulihan cadangan saat progres kosong, tautan \"Lewati ke konten utama\".
- Latihan Hari Ini: antrean maks. 10 soal (ulangan jatuh tempo, topik terlemah, lalu transaksi berikutnya) dengan petunjuk, diagnosis, dan kunci; Dashboard memperoleh Peta konsep (kotak per jenis transaksi berwarna menurut hasil).
- Laporan: tab Bagaimana-jika (ubah nominal satu jurnal, lihat pos laporan yang bergeser); Transaksi: \"Dampak jurnal ini ke laporan\" (jurnal \u2192 akun \u2192 pos laporan); Pemeriksaan: dugaan penyebab selisih.
- Kenyamanan: tempel dari Excel/Sheets ke tabel jurnal (Akun, Debit, Kredit), riwayat jawaban per soal (dipulihkan dari salinan saat Periksa), mode fokus (Alt+F: menu disembunyikan, tampilan diperbesar).
- Kualitas: audit konsistensi data kasus dan kunci (tes dan tombol di Pengaturan > Tentang), tombol Laporkan soal ini (berkas laporan + papan klip), tes asap UI Windows eksperimental (`tests/ui/smoke.cjs`, workflow manual).
- Belum ada di versi Rust: banner perubahan eksternal (tidak relevan: hanya satu jendela), halaman galat khusus (panik Rust menutup aplikasi), dan tautan Pemeriksaan ke penelusuran; “Simpan PDF” membuka laporan di peramban untuk dicetak (lihat `docs/DEVELOPMENT.md`).

### Redesain antarmuka: Modern Soft Neo-Brutalism

Identitas visual versi 1 (lila, hijau limau, krem, garis hitam, huruf tebal) dipertahankan dan dimatangkan. Fokusnya kenyamanan belajar: hierarki yang jelas, angka keuangan yang mudah dibaca, dan umpan balik yang tidak membuat pengguna mencari-cari. Logika akuntansi, data kasus, kunci, dan teks pembelajaran tidak diubah; keempat baris jurnal awal tetap ada dan semua pintasan keyboard bekerja seperti sebelumnya.

- **Sistem desain** (`docs/DESIGN-SYSTEM.md`): token warna semantik terang/gelap, skala tipografi, varian tombol (utama, sekunder, ghost, bahaya, ikon, segmen), kartu (biasa, unggulan, interaktif, statistik, wadah data), badge dan callout status, kolom isian dengan fokus yang jelas. Bayangan keras kini hanya untuk aksi utama dan elemen unggulan.
- **Shell dan toolbar**: toolbar menjadi command bar (pencarian, kelompok Alat bantu, kelompok Riwayat, akurasi, status simpan) yang menyusut menjadi ikon di bawah 1280 px; sidebar lebih rapat dengan item aktif yang otomatis terlihat.
- **Dashboard**: hero "Lanjutkan pembelajaran" dengan cincin kemajuan, empat ubin tanpa angka ganda, tahapan siklus sebagai kartu interaktif, onboarding ringkas.
- **Transaksi**: narasi kejadian dan nominal/syarat dipisah dalam panel; umpan balik jurnal berupa callout dengan ikon; total jurnal menjadi badge Seimbang atau Selisih (sisi mana yang lebih besar); dua kolom hanya ≥ 1280 px dan Sebelumnya/Berikutnya mengikuti filter.
- **Jurnal Umum**: ringkasan di atas yang menyebut cakupan, pencarian, header tabel menempel, baris kredit menjorok, total "seluruh jurnal" atau "hasil pencarian".
- **Buku Besar**: filter periode, saldo awal dan saldo akhir, saldo berjalan dengan sisi D/K, baris bulan, tautan ke transaksi sumber.
- **Buku Pembantu**: rekonsiliasi dengan akun kontrol sebagai empat angka dan badge Cocok/Tidak cocok, rekap per pihak yang bisa dipilih sebagai filter, saldo berjalan pada rincian transaksi, kartu persediaan dengan total.
- **Neraca Saldo**: strip total menempel, saldo di sisi tak lazim ditandai ⚠ dengan catatan penjelasnya, pilihan sebelum/sesudah penyesuaian berupa tombol segmen.
- **Halaman lain**: Penutup (kolom tidak lagi terpotong, total dan status seimbang), Koreksi (kasus dipisah menjadi narasi, jurnal yang salah, dan rujukan materi), Skenario (kasus dan fakta berlabel, rujukan BAB sebagai badge), Jalur Belajar dan Ringkasan BAB (hierarki judul, teks 15 px, kuis dengan hasil berwarna), Latihan Hari Ini (panel soal dan baris navigasi), Pengaturan (dua kolom ≥ 1280 px), Ujian (skor menonjol, tombol Ujian baru di atas), tab segmen yang sama di Kasus, Laporan, Koreksi, Buku Pembantu, dan Belajar.
- **Profil Kasus (perbaikan)**: tabel aging piutang tidak lagi pecah menjadi kartu per baris berangka mentah (240000000), dan "Petunjuk penggunaan" tidak lagi menjadi empat kartu berjudul "•". Profil kini berisi kartu identitas, petunjuk penggunaan sebagai daftar bernomor tepat di bawahnya, kartu informasi (butir per bagian atau per kalimat; isi dalam tanda kurung tidak pernah terpotong), dan tabel aging sebagai tabel sungguhan (angka berformat, baris total, badge tanggal dan "dipakai pada AJ18"). Catatan rekonsiliasi di bawah tabel, yang sebelumnya tidak tampil, kini tampil dengan sub-butir untuk rincian faktur. Judul kecil memakai kelas baru `.t-eyebrow`. Dijaga 9 tes di `laporan.rs`, termasuk satu yang memastikan tidak ada sel sumber yang hilang.
- Diperiksa pada 1366×820, 1280×800, dan 1024×640, terang dan gelap.

### Perbaikan kalkulator dan umpan balik "tidak perlu jurnal"

- **Transaksi**: mencentang "Peristiwa ini tidak perlu jurnal" pada peristiwa yang sebenarnya memerlukan jurnal, lalu menekan Periksa, kini menampilkan peringatan ("Transaksi ini memerlukan jurnal ... Hapus centangnya, lalu isi jurnalnya") dan lencana Periksa. Sebelumnya tidak ada respons apa pun karena jawaban itu dianggap belum diisi. Peringatan tidak membocorkan akun atau nominal kunci. Soal ujian yang dijawab dengan cara itu kini dihitung sudah dijawab (salah), bukan kosong. Peristiwa yang memang tanpa jurnal dinilai seperti sebelumnya. Dijaga 5 tes baru di `derive.rs`.
- **Kalkulator, kursor**: menghapus atau menyisipkan angka di tengah rumus panjang tidak lagi membuat kursor melompat ke akhir (yang membuat angka terakhir ikut terhapus). Ada dua penyebab. Pertama, titik ribuan dipasang oleh Rust sehingga Dioxus menulis ulang isi kolom setiap kali pengelompokan berubah. Kedua, penulisan ulang itu bisa menimpa ketikan yang masih dalam perjalanan: pada ketikan cepat (jeda 30 ms, mirip menahan Backspace) angka bisa hilang, mis. 123.456.789.012.345 menjadi 1.234.578.012.345. Kini kolom milik DOM (Dioxus tidak lagi mengikat nilainya; Rust menulis ke kolom hanya untuk tombol, "=", dan riwayat lewat `tulis_kolom`), dan teks serta kursor dirapikan di WebView pada kejadian input yang sama (`crates/dekri-ui/assets/kalkulator-ketik.js`), sehingga teks yang sampai ke Rust sudah identik. Backspace tepat setelah titik ribuan dan Delete tepat sebelumnya langsung menghapus angka di seberang titik (sebelumnya titik terpasang ulang dan Delete terasa macet). Menghapus angka pertama tidak lagi meninggalkan titik di depan yang dibaca sebagai 0,234.
- **Kalkulator, operator**: huruf x dan X dari papan ketik dibaca sebagai kali dan tampil ×; \* dan / bekerja seperti sebelumnya.
- **Kalkulator, koma**: "1.250,5" dan "1250,5" kini terbaca. Sebelumnya muncul "angka tidak valid" bila ada titik ribuan di depan koma, termasuk hasil seperti 3.333,3333 yang tidak bisa dilanjutkan setelah "=". Salah ketik seperti "1,250.50" atau "1,5,5" tetap ditolak, tidak ditebak.
- Pemformat ketikan ada di dua tempat (Rust dan JS) yang dijaga identik oleh vektor bersama `crates/dekri-ui/test-data/kalkulator-ketik.json`, dibaca oleh tes Rust dan `tests/ui/kalkulator-ketik.cjs` (juga dijalankan di CI).

### Dokumentasi GitHub ditulis ulang

- README: perbandingan versi 1 dan 2 (termasuk bukti pemakaian memori), fitur yang baru dan yang belum ada, isi dan jumlah soal, kebutuhan sistem (termasuk WebView2), cara memasang, memeriksa keaslian, memperbarui, mencopot, pindah dari versi 1, pintasan keyboard, pertanyaan umum, dan 12 tangkapan layar baru dari tampilan terbaru.
- Perbaikan dokumen: lokasi data Windows yang benar adalah `%APPDATA%\Latihan Siklus Akuntansi` (sebelumnya tertulis `DEKRi Lab` di README, Privasi, CONTRIBUTING, DEVELOPMENT, dan templat PR); soket lokal 127.0.0.1 milik Dioxus kini disebut di Privasi dan arsitektur keamanan; prasyarat Linux disamakan dengan CI.
- Templat issue saran fitur (`saran.yml`) dikembalikan dan tautan kebijakan keamanan ditambahkan ke formulir issue. `docs/GITHUB_SETUP.md` memuat teks About dan topics; teks pembuka Release diperbarui.
- Keterangan asal konten dan logo dipusatkan di `docs/CONTENT_SOURCES.md` dan `docs/ASSET_ATTRIBUTION.md`.

Catatan di bawah ini berasal dari versi sebelum 2.0.0 (Electron/React) dan disimpan sebagai riwayat.

## 1.0.2

### Perbaikan keamanan dependensi

- Memperbaiki GHSA-g3hv-75wg-m249 (denial of service pada `minimatch` >= 7.0.0 dan < 11.0.1) di rantai alat build Electron (`electron-builder`) lewat `overrides` npm yang sempit; `npm audit` menjadi 0 temuan. Tidak ada perubahan fitur, tampilan, atau perilaku aplikasi.

### Dokumentasi

- README ditambah: kebutuhan sistem, untuk siapa dan isi aplikasi, memeriksa keaslian unduhan, memperbarui dan mencopot, pertanyaan umum, serta kanal saran. Formulir issue baru untuk saran fitur (`saran.yml`).

## 1.0.1

### Halaman Kasus lebih rapi

- "Petunjuk penggunaan" di Kasus > Profil kini berupa daftar poin satu kolom penuh (sebelumnya titik poin berada di kolom lebar tersendiri). Angka pada tabel aging piutang ditampilkan dengan titik ribuan dan persen (sebelumnya angka mentah seperti 240000000 dan 0.3).

### Kemudahan pemasangan dan rilis

- Pemasang Windows berupa wizard biasa dengan pilihan folder tujuan (`oneClick: false`, `allowToChangeInstallationDirectory: true`); bukan lagi pemasangan otomatis satu klik.
- README mengutamakan `DEKRi-Lab.html` (tanpa pemasangan) sebagai cara pertama, dengan panduan peringatan "Windows protected your PC" dan saran bila pemasangan gagal. Tangkapan layar diperbarui dan ditambah satu untuk penjelasan kunci.
- Rilis GitHub dibuat sebagai draf bertanda pre-release dengan teks pembuka "Unduh yang mana?" (`.github/release-notes-header.md`).
- Dependabot tidak lagi mengusulkan kenaikan versi besar React (`react`, `react-dom`, dan tipenya); ditangani manual.
- `package.json` diberi deskripsi dan kata kunci. `docs/GITHUB_SETUP.md` memuat teks About, topics, dan langkah proteksi cabang.

### Penjelasan kunci dibuat lebih ringkas

- Penjelasan kunci kini hanya tiga bagian pendek: Intinya, Mengapa dicatat begini (satu baris per akun: sisi debit/kredit dan arah perubahan), dan Ingat. Langkah "Periksa keseimbangan" dihapus. Peristiwa tanpa jurnal hanya menampilkan alasannya.

### Laporan kesalahan soal

- Pengaturan > Tentang kini memuat kotak "Menemukan soal atau kunci yang keliru?" dengan tautan templat issue GitHub dan tombol Salin tautan (aplikasi offline, jadi tautan disalin, bukan dibuka di dalam aplikasi). Kotak kunci jawaban menunjuk ke sana. README dan DISCLAIMER menyebutkan cara melapor.

### Analisis opsional dan teks Tentang dirapikan

- Kunci Analisis (opsional) kini hanya menampilkan klasifikasi arus kas, perlu penyesuaian, memengaruhi laba, dan memengaruhi kas. Kalimat tambahan (misalnya "Penjualan tunai + HPP") dihapus; alasan tetap tampil untuk peristiwa yang tidak dijurnal.
- Teks Tentang, README, dan DISCLAIMER: pernyataan "penjelasan memakai kata-kata sendiri" dan "rujukan bertanda (cek)" diganti dengan "soal disusun agar sesuai dengan standar akuntansi (PSAK), tetapi masih mungkin ada kesalahan".

### Penjelasan kunci lebih panjang dan bertahap

- Penjelasan kunci (Transaksi, Penyesuaian, Latihan Varian, soal industri, Ujian) kini tersusun langkah demi langkah: jenis peristiwa, perhitungan, prinsip yang dipakai, tiap akun beserta alasan sisi debit atau kreditnya, pemeriksaan keseimbangan, dan pegangan untuk mengingat. Untuk peristiwa tanpa jurnal ditampilkan alasan mengapa tidak dijurnal. Penjelasan yang sama muncul di "Mengapa jawaban ini benar?" setelah jawaban benar. Isi per akun disusun otomatis dari jurnal kunci, jadi tidak menambah klaim akuntansi baru.

### Penafian diperjelas

- `DISCLAIMER.md` dan halaman Pengaturan > Tentang kini memuat pernyataan tersendiri bahwa soal mungkin tidak sesuai dengan PSAK, dan bahwa semua perusahaan fiktif (kesamaan dengan pihak nyata adalah ketidaksengajaan).

### Fokus ke akuntansi: fitur dirampingkan

- Bagian **Paket soal tambahan** (muat soal dari berkas JSON) dihapus dari Latihan Varian, karena tidak semua pengguna dapat membuat berkas JSON. Soal industri bawaan tetap ada. Dua paket PSAK 216 yang hanya bisa dimuat lewat fitur itu (`data/paket-psak/`) ikut dihapus.
- Halaman **Analisis** (kertas kerja, rasio, common size, arus kas, DuPont) dihapus. Menu kini 17. Analisis opsional per transaksi di halaman Transaksi tetap ada. Materi belajar "Analisis Laporan Keuangan" tetap sebagai teori tanpa tombol latihan.

### Nama perusahaan fiktif

- Nama bank nyata dalam kasus diganti nama rekaan: Bank Mandiri menjadi Bank Arunika, Bank BCA menjadi Bank Cendana, PT Sekuritas Mandiri Investama menjadi PT Sekuritas Lazuardi Investama. Kode akun dan angka tidak berubah; hanya nama tampilan.

### Tes lebih tahan di komputer lambat

- Batas tunggu `findBy*`/`waitFor` pada tes UI dinaikkan dari 1 detik ke 15 detik (`tests/setup.ts`). Di komputer yang sibuk, satu tes (`jurnal benar -> Periksa -> BENAR`) kadang gagal hanya karena halaman belum sempat tampil dalam 1 detik. Isi pemeriksaan tidak berubah. `bangun-exe.bat` kini mengulang otomatis (maks. 3 kali) bila langkah pembuatan installer gagal karena unduhan terputus.

### README untuk pengguna awam

- README ditulis ulang dengan bahasa sederhana: apa itu aplikasinya, dua cara memakai (pasang di Windows, atau satu berkas HTML tanpa pasang), dan hal penting yang perlu diketahui. Rincian pengembang dan fitur dipindahkan ke `docs/DEVELOPMENT.md`.
- Release kini ikut melampirkan `DEKRi-Lab.html` (versi tanpa pasang) beserta checksum-nya.

### Audit ulang publikasi (provenance, logo, merek)

- Dokumentasi asal konten diperbarui sesuai klarifikasi pemilik; pemeriksaan awal nama di PDKI dicatat (`docs/CONTENT_SOURCES.md`, `docs/ASSET_ATTRIBUTION.md`, `docs/BRAND_CHECK.md`, `docs/LICENSING.md`). Lisensi MIT dinyatakan hanya untuk kode sumber.
- GitHub Actions dikunci ke SHA commit (checkout v7.0.1, setup-node v7.1.0).
- Keterangan Pengaturan > Tentang dan DISCLAIMER memuat pengungkapan asal konten dan cakupan lisensi.

### Audit publikasi (keamanan, lisensi, dokumentasi)

- Keamanan Electron: CSP ketat pada build mandiri, pemblokir permintaan non-lokal, navigasi dan redirect hanya ke halaman aplikasi, validasi pengirim IPC pada penutupan jendela, Electron fuses (`runAsNode`, variabel NODE_OPTIONS, inspect CLI dimatikan; hanya muat dari asar).
- Cadangan: menolak tautan simbolik, berkas non-biasa, dan berkas terlalu besar; uji masukan berbahaya dan pencemaran prototipe.
- CI: audit dependensi produksi, SBOM CycloneDX; rilis: validasi tag = versi, izin minimum, Release berstatus draf, checksum dan SBOM terlampir.
- Dokumen baru: PRIVACY, DISCLAIMER, THIRD_PARTY_NOTICES (dibuat oleh `tools/gen-notices.cjs`, ikut terpasang di folder `licenses`), RELEASE_CHECKLIST, `docs/` (SECURITY_ARCHITECTURE, BUILD, TESTING, GITHUB_SETUP, CONTENT_SOURCES, ASSET_ATTRIBUTION); template issue dan PR; keterangan penafian di Pengaturan > Tentang.

- Skenario: bagian **Latihan tambahan klasifikasi arus kas (PSAK 207)** berisi soal pilihan 7A (4 soal, ketentuan sebelum amendemen PSAK 118) dan 7B (5 soal, setelah amendemen, efektif 1 Januari 2027, termasuk pengecualian entitas pembiayaan). Setiap soal menampilkan standar, periode, asumsi, penjelasan per pilihan, dan dasar paragraf (bertanda "cek" sampai dicocokkan dengan naskah final). Tidak dihitung dalam akurasi Dashboard dan tidak masuk pool ujian; jawaban tersimpan di `pajak` (kunci `v:kas:*`). Referensi paragraf paket PSAK 216 diperluas sesuai hasil pemeriksaan.
- Dua paket soal baru dalam `data/paket-psak/` (dimuat lewat Latihan Varian > Paket soal JSON, tidak memengaruhi 147 soal inti maupun akurasi Dashboard): `psak216-aset-tetap.json` (pertukaran aset dengan dan tanpa substansi komersial, penyusutan per komponen; bagan akun utama) dan `psak216-lanjutan.json` (kompensasi asuransi, revaluasi tanah dan bangunan; bagan akun sendiri). Setiap soal memuat dasar PSAK dan asumsi penyederhanaan di penjelasannya. Nomor paragraf perlu dicek ke teks resmi.
- Distribusi berganti dari EXE portable menjadi **installer Windows (NSIS)**: `DEKRi-Lab-Setup-<versi>.exe`. `productName` kini "DEKRi Lab" sehingga folder pemasangan, pintasan, dan EXE di dalamnya bernama DEKRi Lab; lokasi data tetap `%APPDATA%\Latihan Siklus Akuntansi` (diatur eksplisit di `desktop/main.cjs`) dan tidak ikut terhapus saat uninstall. `bangun-exe.bat` menghapus folder `win-unpacked` setelah build.
- Tema gelap: kotak "Mengapa jawaban ini benar?" dan warna hijau status lain kini terbaca (skala hijau ikut dibalik).
- Bagian "Analisis (opsional)": isian Keputusan dihapus; keputusan diambil dari kotak "Peristiwa ini tidak perlu jurnal" di bagian Jurnal.
- Kalkulator memakai × dan ÷ (ketikan * dan / otomatis diubah tampilannya).
- Kalkulator melayang dan bisa digeser (tarik judulnya, atau Alt + tombol panah; tanpa tombol khusus); posisinya diingat. Titik ribuan terisi otomatis saat mengetik (1250000 menjadi 1.250.000), tombol `.000` kini `000`.
- Analisis (opsional): setelah dijawab benar muncul "Mengapa jawaban ini benar?" berisi alasan tiap pilihan dan alasan akuntansi dari kunci.
- Pengaturan > Cara penilaian: kata "seperti di Excel" dihapus dari penjelasan mode Langsung.
- Analisis transaksi disederhanakan: akun debit/kredit utama, nominal utama, dan catatan alasan dihapus. Tersisa keputusan, klasifikasi arus kas, penyesuaian akhir tahun, dampak laba, dan dampak kas, masing-masing dengan penjelasan singkat sesuai pilihan. Penilaian Analisis tidak lagi memeriksa akun/nominal (jurnalnya dinilai di bagian Jurnal); klasifikasi arus kas tetap tidak dinilai.
- Kolom Keterangan pada formulir jurnal dihapus (Enter dari kredit langsung ke baris berikutnya). Data keterangan lama tetap tersimpan dan tampil di Jurnal Umum.
- Pemilih akun bisa dipakai dengan panah atas/bawah dan Enter. Pencarian diurutkan menurut kecocokan: "utang us" kini memilih Utang Usaha, bukan Piutang Usaha.
- Aplikasi berganti nama menjadi **DEKRi Lab** dengan logo baru (lambang kubus "D" dan logotype) di sidebar, layar masuk, splash, favicon, dan ikon Windows.
- Nama berkas EXE menjadi `DEKRi Lab.exe`. Kunci penyimpanan internal, `appId`, `productName`, dan folder data `%APPDATA%\Latihan Siklus Akuntansi` sengaja tidak diubah agar progres dan cadangan lama tetap terbaca.
- Layar masuk berbasis nama pengguna, tanpa kata sandi, tampil setelah splash bila belum ada profil: validasi 2-30 karakter (huruf, angka, spasi, titik, apostrof, garis bawah, tanda hubung) dengan pesan `role="alert"`, fokus otomatis, Enter untuk masuk, dan pilihan cepat untuk maksimal 6 nama terakhir. Bentuk pastel di latar terus bergerak (melayang, berputar, mengayun; logo bergoyang sesekali) dan semuanya berhenti saat Reduce Motion aktif.
  - **Kemajuan belajar tersimpan per nama pengguna** (huruf besar/kecil dan spasi ganda dianggap sama: "Rina" = "rina"). Kunci IndexedDB (state, riwayat Urungkan, sesi ujian, paket soal, salinan pengaman) dan preferensi belajar localStorage (panduan awal, akun terakhir) diberi akhiran `:u:<nama>`; tema dan ukuran teks tetap per perangkat. Berganti nama menyimpan dulu data nama lama, mengosongkan memori, lalu memuat data nama baru; permintaan ganti yang lebih baru selalu menang. Tab lain hanya dianggap bentrok bila memakai nama yang sama.
  - Data bawaan sebelum ada login (kunci tanpa nama) diadopsi **satu kali** oleh pengguna pertama yang masuk (disalin; kunci lama dibiarkan sebagai pengaman). Penanda pemilik mencegah nama kedua ikut mengadopsi dan mencegah data lama "hidup kembali" setelah progres dihapus.
  - Versi EXE: cadangan berkas per nama (`akuntansi-cadangan-<nama>-terbaru.json` dan satu berkas per hari, 7 hari per nama). Nama dibentuk ulang di proses utama (`[a-z0-9-]` + hash) sehingga tidak ada karakter jalur. Cadangan lama tanpa nama hanya ditawarkan selama belum ada cadangan per nama.
  - Sapaan Dashboard memakai nama; sidebar memuat avatar inisial dan tombol "Ganti pengguna" (hanya melepas profil aktif; data tidak dihapus).
  - Tes: `tests/ui/login.test.tsx` (6), `tests/ui/per-user.test.tsx` (12: isolasi, balapan ganti cepat, simpan tertunda, migrasi, UI), 5 tes cadangan per nama, dan 4 tes e2e (login, kemajuan per nama di browser sungguhan, axe login terang/gelap, axe semua halaman tema gelap). `tests/setup.ts` memberi profil dan ruang data awal untuk tes yang merender `<App />`.
  - Perbaikan: teks tombol utama/bahaya kini mengikuti token tema (sebelumnya putih permanen sehingga kontras gagal di tema gelap), serta kontras subjudul sidebar dan label kartu panduan di tema gelap.

- Arah visual baru "neo-brutalis buku latihan" (hanya tampilan; logika, data, dan dependency tidak berubah): garis hitam 2px, bayangan keras offset, latar krem hangat, panel samping lilac, menu aktif berupa stiker lime, header tabel lime, judul tebal besar, tombol yang "menekan" ke bayangannya, dan label kategori bergaris. Diterapkan di token dan komponen (`.btn`, `.card`, input, tabel, `.tag`), sehingga seluruh halaman ikut berubah. Tema gelap memakai bayangan indigo. Bayangan dan animasi dimatikan saat mencetak.
- Splash startup diselaraskan: latar krem berpola titik, logo dalam kartu stiker yang "dicap", tagline sebagai stiker lime, bar muat tebal bergaris dengan strip indigo, dan empat bentuk pastel yang muncul bergantian (disembunyikan di layar sempit). Latar statis `#ap-boot` di `index.html` memakai warna dan pola yang sama agar tidak ada kilatan. Teks, peran ARIA, durasi, dan perilaku Reduce Motion tidak berubah.
- Penyegaran UI "ruang belajar" (hanya tampilan; mesin akuntansi, penilaian, penyimpanan, routing, dan IPC Electron tidak berubah, tanpa dependency baru):
  - Token gerak dan pastel terpusat di `src/index.css`; utilitas `ap-enter`, `ap-stagger`, `ap-pop`, `ap-shake`, `ap-grow`, `ap-lift`, dan label `tag-*`. Semua animasi hanya memakai transform/opacity dan dimatikan oleh Reduce Motion dan saat mencetak.
  - Dashboard menjadi beranda belajar: sapaan, langkah berikutnya, cincin akurasi, ringkasan tiga angka (tanpa duplikasi akurasi), kartu tahap siklus yang dapat diklik dengan label kategori, Jalur Belajar, dan Pencapaian. Pencapaian hanya muncul bila syaratnya terpenuhi menurut state/log nyata.
  - Menu aktif memakai batang indigo; transisi masuk halaman 220 ms; status simpan memberi umpan balik.
  - Form jurnal: baris baru disorot singkat tanpa menggeser fokus; hasil BENAR/PERIKSA memakai ikon dan teks (bukan hanya warna), dengan animasi sekali.
  - Jalur Belajar dan latihan memakai bar progres bersama (`src/ui/components/Progress.tsx`); status Selesai memakai ikon.
  - Perbaikan: grafik aktivitas 14 hari kini menampilkan tinggi batang. Daftar font tidak lagi menyebut `figmaSans`/`figmaMono` yang tidak tersedia.
  - Tab Analisis dan Laporan memberi status `aria-pressed` dan transisi isi 150 ms; empty state (Analisis, Jurnal Umum, Buku Pembantu, Titik lemah, Ujian) kini menjelaskan langkah berikutnya dengan tombol aksi.
  - Screenshot di `docs/images/` diperbarui.

- Desain ulang mengikuti referensi gaya Figma: kanvas putih, satu aksen electric indigo (#4d49fc), judul tipis (bobot 330), tombol utama berbentuk pil, tombol sekunder ghost garis hitam, radius 2/8/16/50, bayangan hanya untuk panel melayang. Font Inter variable tertanam (offline). Warna status (hijau/merah/amber) dipertahankan. Logika akuntansi tidak berubah.

- Perbaikan penilaian: kasus koreksi yang tidak memerlukan jurnal (No.11) kini hanya BENAR bila jenis kesalahan yang dipilih sesuai kunci (sebelumnya jenis apa pun diterima).
- Tes simulasi pengerjaan penuh (`tests/sim/`): semua soal dijawab lewat store dan UI, laporan, ujian, Jalur Belajar, cadangan, dan generator varian.
- Font Inter (SIL OFL 1.1) disertai berkas lisensi.

## 1.0.0

Rilis publik pertama sebagai **Akuntansi Practice**.

- Identitas visual baru: ikon aplikasi, logo, favicon, dan ikon Windows.
- Splash screen startup (sekali saat dibuka, mendukung tema gelap dan Reduce Motion, bekerja offline).
- Judul jendela dan nama berkas EXE menjadi "Akuntansi Practice". Lokasi data dan cadangan tidak berubah (`%APPDATA%\Latihan Siklus Akuntansi`).
- Kalkulator bawaan (`Alt+C`) dengan format angka Indonesia dan tombol "Masukkan ke kolom nominal".
- Format cadangan tetap `version: 1`; cadangan lama tetap terbaca.
- Penilaian: klasifikasi arus kas tidak lagi dinilai; ditambah skor komponen, status ganda baris penutup, dan toleransi nominal per soal.
- Keandalan: penutupan sadar laba/rugi, validasi impor, salinan pengaman, autosave saat jendela ditutup dan penjaga multi-tab.
- Perbaikan kontras warna (WCAG AA) pada navigasi aktif, kartu KPI Dashboard, dan tema gelap.
