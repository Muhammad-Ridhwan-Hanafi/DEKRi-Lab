# Sistem desain DEKRi Lab

Dokumen ini menjelaskan bahasa visual dan komponen antarmuka DEKRi Lab 2.0. Sumber kebenarannya adalah `tools/css/input.css` (token dan kelas komponen). Halaman di `crates/dekri-ui/src` memakai kelas-kelas itu, bukan warna atau bayangan mentah.

## 1. Arah visual

**Modern Soft Neo-Brutalism + antarmuka perangkat lunak keuangan profesional.** Identitas versi 1 dipertahankan dan dimatangkan, bukan diganti:

- tetap: kanvas krem, aksen lila/indigo, hijau limau, pastel aqua dan blush, garis hitam, huruf tebal, kartu bersudut membulat;
- berubah: bayangan keras tidak lagi dipasang di semua elemen. Bayangan keras hanya untuk hal yang paling penting (aksi utama, kartu unggulan, hover kartu interaktif). Elemen sekunder memakai garis tipis atau bayangan lembut, sehingga mata tahu ke mana harus melihat lebih dulu;
- tabel dan angka diperlakukan sebagai data keuangan: angka tabular rata kanan, header tabel jelas, total dan saldo mudah dicari.

Tujuan: pengguna yang belajar berjam-jam tetap nyaman. Layar harus menjawab "saya di mana, apa yang sudah benar, apa langkah berikutnya".

## 2. Token

Semua token ada di `:root` (terang) dan `:root.dark` (gelap) pada `tools/css/input.css`. Komponen memakai token semantik `--ds-*`; jangan menulis heksadesimal baru di halaman.

### Warna dasar

| Token | Terang | Gelap | Fungsi |
|---|---|---|---|
| `--ds-bg` (`--color-canvas`) | `#fff9ec` | biru malam | latar halaman |
| `--ds-surface` | putih | slate 100 terbalik | kartu, input, tabel |
| `--ds-surface-2` | slate 50 | latar sedikit lebih terang | panel dalam, narasi, baris bulan |
| `--ds-text` / `--ds-text-2` | slate 900 / slate 500 | terbalik | teks utama / pendukung |
| `--ds-border` | slate 300 | slate 300 terbalik | garis tipis (tabel, kartu data) |
| `--ds-border-strong` (`--neo-line`) | slate 900 | terang | garis tegas (tombol, kartu, header tabel) |
| `--ds-input-border` | slate 400 | slate 500 | garis kolom isian |
| `--ds-primary` / `-hover` | `#4d49fc` / `#3d39d6` | `#a8a5ff` | aksi utama, fokus |
| `--ds-secondary` | lila `#e9e5ff` | `#2a2870` | hover tombol segmen, kartu hero |
| `--ds-accent` | hijau limau `#e4ff97` | `#34400f` | menu aktif, header tabel, hover tombol |
| `--ds-shadow-soft` | 20% bayangan neo | idem | bayangan kartu biasa |

### Warna status (fg / bg / bd)

| Status | Terang (teks, latar, garis) | Dipakai untuk |
|---|---|---|
| `success` | `#137333` `#e6f4ea` `#a8dab5` | BENAR, seimbang, cocok |
| `warning` | `#7a4100` `#fff3d1` `#f0cf72` | peringatan, saldo tak lazim, perlu dicek |
| `danger` | `#b3261e` `#fdecea` `#f1b3ae` | PERIKSA, selisih, aksi destruktif |
| `info` | `#302db0` `#eceaff` `#c4baff` | informasi, rujukan materi, level |

Mode gelap mendefinisikan ulang ketiganya (`--ds-*-fg/bg/bd`) agar kontras tetap cukup. Warna jangan menjadi satu-satunya penanda status: badge selalu membawa teks (dan ikon bila ada).

### Warna tag (pastel)

`--tag-lilac`, `--tag-lime`, `--tag-aqua`, `--tag-blush` masing-masing punya `-bg` dan `-fg`. Dipakai untuk ubin statistik, kartu hero, dan penanda tahap siklus. Pasangan bg/fg sudah teruji kontrasnya di terang dan gelap.

## 3. Tipografi

Font Inter (dibenamkan). Skala yang dipakai:

| Peran | Kelas | Ukuran / bobot |
|---|---|---|
| Judul halaman | `.page-title` (di toolbar) | 30 / 800 |
| Judul bagian | `h2` bawaan | 20 / 800 |
| Judul kartu | `.t-card` | 17 / 700 |
| Teks isi (materi) | `text-[0.9375rem] leading-6` | 15 / 400 |
| Teks isi (antarmuka) | `text-sm` | 14 / 400 |
| Label kecil | `.t-label` | 12 / 600, huruf renggang tipis |
| Judul kecil kartu atau bagian | `.t-eyebrow` | 12 / 700, huruf kapital, huruf renggang, warna info (terang dan gelap) |
| Angka | `.t-figure`, `.num` | tabular, 700 / rata kanan |

Aturan: angka keuangan selalu `tabular-nums` dan rata kanan; label ditempatkan di atas nilai; teks panjang untuk dibaca (materi, narasi) memakai 15 px dengan tinggi baris 24 px.

## 4. Spasi, radius, garis

- Skala spasi 4 px (Tailwind `1 = 4px`). Celah antarbagian 8/12/16 px, padding kartu 20 px, padding halaman 24 px.
- Radius: tombol dan badge pil penuh; kartu 16 px (unggulan 20 px); kartu data 12 px; input 10 px; callout 10 px.
- Garis: tipis 1 px (`--ds-border`) untuk data, 1,5 px untuk komponen interaktif, 2 px untuk elemen unggulan.

## 5. Komponen

### Tombol

| Kelas | Pemakaian |
|---|---|
| `.btn-primary` | aksi utama; **satu per area** (Periksa, Lanjutkan, Ekspor) |
| `.btn` | sekunder: pil putih bergaris; hover hijau limau |
| `.btn-ghost` | tersier: aksi ringan di baris tabel |
| `.btn-danger` | destruktif (Hapus semua progres, ganti progres); selalu setelah konfirmasi |
| `.btn-icon` | tombol ikon persegi; wajib `aria-label` dan `title` |
| `.btn-sm` | varian padat untuk kartu dan tabel |
| `.seg` | satu bingkai berisi beberapa tombol (tab, kelompok alat). Tombol terpilih `btn btn-primary` |

Disabled: setengah transparan, tanpa bayangan dan tanpa gerak. Tombol aktif menekan ke bawah (`translate`) saat diklik.

### Kartu

| Kelas | Pemakaian |
|---|---|
| `.card` | kartu informasi biasa: garis 1,5 px + bayangan lembut |
| `.card-featured` | hero, ruang kerja utama: garis 2 px + bayangan keras |
| `.card-interactive` | kartu yang bisa diklik: terangkat saat hover |
| `.card-stat` | ubin statistik tanpa bayangan |
| `.card-data` | wadah tabel: bingkai tipis, tanpa padding dan bayangan, `overflow-x: auto` |

Untuk tabel yang panjang tambahkan `.sticky-wrap` pada `.card-data` dan `.sticky-head` pada `table` (lihat bagian 6).

### Isian

Garis 1,5 px netral, radius 10 px, fokus berupa garis indigo + cincin lembut 3 px (tidak bergeser). Placeholder 75% opak. `select` memakai panah khusus. `kbd` untuk menampilkan pintasan keyboard.

### Badge dan callout

- `.badge` + `.badge-success|warning|danger|info|neutral`: status singkat (BENAR, Seimbang, Level, rujukan BAB).
- `.callout` + `.callout-success|warning|danger|info`: pesan satu-dua kalimat di dalam alur (umpan balik jurnal, peringatan, catatan). Ganti kelas `border-slate-900 bg-[var(--tag-lilac-bg)]` lama dengan callout.

### Tabel data

- `table.data-table` di dalam `.card-data`: sel rata tengah vertikal, garis baris tipis, header lime lembut bergaris tegas.
- Baris total memakai `tfoot` (bukan baris `tbody` tebal) dan wajib menyebut cakupannya: "Total seluruh jurnal (N transaksi)" atau "Total hasil pencarian (n transaksi)".
- Kolom angka: `th.num` / `td.num` (rata kanan, tabular).

## 6. Pola halaman

**Shell.** Sidebar lila 240 px dengan kelompok bertanda (Ruang kerja, Siklus akuntansi, Belajar, Latihan dan evaluasi). Item aktif hijau limau dengan `aria-current="page"` dan otomatis digulirkan ke dalam pandangan. Sidebar tidak bisa dilipat (sengaja, agar tidak menambah kerumitan). Toolbar global berfungsi sebagai command bar: judul + entitas, pencarian (Ctrl+K), kelompok **Alat bantu** (Fokus, Kalkulator), kelompok **Riwayat** (urungkan/ulangi), akurasi, dan status simpan. Di bawah 1280 px (breakpoint `xl`) teks tombol dan status simpan hilang sehingga tinggal ikon; kbd `Ctrl+K` baru tampil di ≥ 1536 px.

**Dashboard.** Empat pertanyaan dijawab berurutan: di mana saya (hero + cincin kemajuan), apa yang sudah dicapai (ubin Soal diperiksa/Akurasi), apa selanjutnya (tombol "Lanjutkan"), apa yang perlu diperbaiki (Perlu diulas, Titik lemah). Angka tidak diulang di dua tempat.

**Ruang kerja Transaksi.** ≥ 1280 px: dua kolom (daftar 272 px, detail). < 1280 px: satu kolom dengan daftar berbatas tinggi di atas. Tombol Sebelumnya/Berikutnya mengikuti daftar yang sedang difilter. Narasi kejadian dan nominal dipisah dalam panel sendiri; jurnal selalu memakai empat baris awal.

**Tabel panjang.** Jurnal Umum, Buku Besar, dan Neraca Saldo memakai header menempel di bawah toolbar (`.sticky-head`, hanya ≥ 1280 px karena wadah gulir mematikan `position: sticky`). Neraca Saldo punya strip status menempel (`.with-strip`).

**Buku Besar dan buku pembantu.** Ringkasan di atas (saldo awal, mutasi, saldo akhir atau rekonsiliasi), lalu tabel bergrup bulan dengan saldo berjalan dan sisi D/K. Saring periode (Buku Besar) atau pihak (Buku Pembantu); jumlah total selalu menyebut apakah seluruh data atau hasil penyaringan.

**Latihan.** Kartu soal: label kemajuan, judul, panel narasi, formulir jurnal, bantuan (petunjuk, kunci), lalu satu baris navigasi (Sebelumnya / Berikutnya). Umpan balik jawaban memakai `callout` dengan ikon.

## 7. Responsif dan resolusi acuan

- **1366×820** adalah resolusi acuan: semua halaman harus rapi tanpa gulir horizontal.
- **≥ 1280 px**: tata letak dua kolom (Transaksi, Jalur Belajar, Pengaturan), header tabel menempel.
- **< 1280 px**: satu kolom; tabel lebar menggulir di dalam `.card-data` (bukan halaman).
- **1024×640** adalah ukuran jendela minimum; toolbar menyusut menjadi ikon.

Setiap perubahan tampilan perlu dipotret setidaknya di 1366×820, 1280×800, dan 1024×640, terang dan gelap.

## 8. Aksesibilitas

- Fokus keyboard selalu terlihat: `:focus-visible` memakai outline 2 px biru, input memakai cincin fokus.
- Kelompok tombol (tab) memakai `role="group"` atau `role="tablist"` dengan `aria-label`.
- Item navigasi aktif memakai `aria-current="page"`; tombol ikon punya `aria-label`.
- Status tidak hanya diwarnai: badge dan callout selalu membawa teks.
- Animasi hanya transform/opasitas dan dimatikan oleh preferensi *Reduce Motion*.
- Pintasan keyboard (Ctrl+K, Ctrl+Z/Y, Ctrl+Enter, Alt+C, Alt+F, Esc, ?) tidak boleh diubah tanpa memperbarui `Pengaturan > Pintasan keyboard`.

## 9. Menambah halaman atau komponen

1. Pakai kelas komponen di atas; bila perlu varian baru, tambahkan ke `@layer components` di `tools/css/input.css` beserta token di kedua tema, jangan menulis warna mentah di halaman.
2. Bangun ulang CSS: `cd tools/css && python3 build.py <folder-tailwindcss-cli>` (lihat `docs/DEVELOPMENT.md`).
3. Periksa di terang dan gelap (`DEKRI_THEME=dark`), 1366×820, 1280×800, 1024×640.
4. Jangan mengubah logika akuntansi, data kasus, kunci, atau teks pembelajaran saat merapikan tampilan. Pemecahan teks hanya untuk tampilan (mis. memisah "CASE/FACTS" atau jurnal yang salah pada Koreksi) dan harus kembali ke teks utuh bila format tidak dikenali.

## 10. Yang sebaiknya dihindari

- Bayangan keras di setiap kartu atau tombol (hanya aksi utama dan elemen unggulan).
- Dua tombol `btn-primary` dalam satu area.
- Total tanpa keterangan cakupan di tabel yang bisa difilter.
- Tabel di dalam wadah `overflow` bila header perlu menempel (gunakan `.sticky-wrap`).
- Menyembunyikan informasi penting di balik hover saja.
