# Catatan perubahan

## 1.0.1

### Galeri tangkapan layar

- README kini memuat galeri 10 tangkapan layar (Dashboard, Transaksi, penjelasan kunci, Kalkulator, Laporan, Buku Besar, Neraca Saldo, Jalur Belajar, tema gelap, layar masuk), semuanya dari data contoh fiktif.

### Halaman Kasus lebih rapi

- "Petunjuk penggunaan" di Kasus > Profil kini berupa daftar poin satu kolom penuh (sebelumnya titik poin berada di kolom lebar tersendiri). Angka pada tabel aging piutang ditampilkan dengan titik ribuan dan persen (sebelumnya angka mentah seperti 240000000 dan 0.3).

### Kemudahan pemasangan dan rilis

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

- Dokumentasi provenance diperbarui sesuai klarifikasi pemilik: materi disusun dengan bantuan Claude AI berlandaskan referensi standar akuntansi; logo dibuat dengan ChatGPT; pemeriksaan awal nama di PDKI dicatat (`docs/CONTENT_SOURCES.md`, `docs/ASSET_ATTRIBUTION.md`, `docs/BRAND_CHECK.md`, `docs/LICENSING.md`). Lisensi MIT dinyatakan hanya untuk kode sumber.
- GitHub Actions dikunci ke SHA commit (checkout v7.0.1, setup-node v7.1.0).
- Keterangan Pengaturan > Tentang dan DISCLAIMER memuat pengungkapan bantuan AI dan cakupan lisensi.

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
