#!/usr/bin/env python3
"""Pembuat paket soal multi-industri. Narasi dan kunci memakai variabel yang sama agar konsisten.
Keluaran: data/industri-packs.json. Tiap paket disimulasikan ke buku besar dan diperiksa:
  - setiap jurnal seimbang
  - saldo akun tidak pernah berada di sisi yang salah (kecuali akun yang memang boleh)
  - neraca saldo akhir seimbang
"""
import json
import sys
from collections import defaultdict

OUT = sys.argv[1]


def r(n: int) -> str:
    return 'Rp' + f'{n:,}'.replace(',', '.')


def D(code, amt):
    return {'code': code, 'debit': int(amt), 'credit': 0}


def K(code, amt):
    return {'code': code, 'debit': 0, 'credit': int(amt)}


def acc(code, name, typ, normal, rc):
    return {'code': code, 'name': name, 'type': typ, 'normal': normal, 'reportClass': rc}


A, L, E, R, X = 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
DB, CR = 'Debit', 'Credit'
packs = []


def pack(pid, title, desc, accounts, items):
    for i, it in enumerate(items, 1):
        it['id'] = it['id'][:2] + f'{i:02d}'
    packs.append({'app': 'akuntansi-practice-pack', 'version': 1, 'id': pid, 'title': title, 'description': desc, 'accounts': accounts, 'items': items})


def item(pre, n, title, narrative, lines, explain):
    return {'id': f'{pre}{n:02d}', 'title': title, 'narrative': narrative, 'lines': lines, 'explain': explain}


# ======================================================================
# 1. JASA KONSULTASI
# ======================================================================
p = 'jk'
c = lambda s: f'JK-{s}'
acs = [
    acc(c(1100), 'Kas dan Bank', A, DB, 'Current Asset'),
    acc(c(1200), 'Piutang Usaha', A, DB, 'Current Asset'),
    acc(c(1300), 'Perlengkapan Kantor', A, DB, 'Current Asset'),
    acc(c(1400), 'Sewa Dibayar di Muka', A, DB, 'Current Asset'),
    acc(c(1500), 'Peralatan Kantor', A, DB, 'Fixed Asset'),
    acc(c(1510), 'Akumulasi Penyusutan Peralatan Kantor', A, CR, 'Contra Asset'),
    acc(c(2100), 'Utang Usaha', L, CR, 'Current Liability'),
    acc(c(2200), 'Pendapatan Diterima di Muka', L, CR, 'Current Liability'),
    acc(c(2300), 'Beban Gaji yang Masih Harus Dibayar', L, CR, 'Current Liability'),
    acc(c(3100), 'Modal Saham', E, CR, 'Equity'),
    acc(c(4100), 'Pendapatan Jasa Konsultasi', R, CR, 'Revenue'),
    acc(c(5100), 'Beban Gaji', X, DB, 'Expense'),
    acc(c(5200), 'Beban Sewa', X, DB, 'Expense'),
    acc(c(5300), 'Beban Perlengkapan', X, DB, 'Expense'),
    acc(c(5400), 'Beban Penyusutan Peralatan Kantor', X, DB, 'Expense'),
    acc(c(5500), 'Beban Listrik dan Telepon', X, DB, 'Expense'),
    acc(c(5600), 'Beban Perjalanan Dinas', X, DB, 'Expense'),
]
modal = 500_000_000
sewa = 96_000_000
alat = 45_000_000
perl = 6_500_000
fee1 = 80_000_000
um = 60_000_000
lunas = 50_000_000
gaji = 35_000_000
lst = 4_200_000
dinas = 3_800_000
sewa_pakai = sewa // 12 * 3
susut = alat // 5 // 12 * 3
um_kerja = um * 40 // 100
gaji_hr = 30_000_000
gaji_ut = gaji_hr // 30 * 4
perl_sisa = 2_000_000
items = [
    item(p, 1, 'Setoran modal pemegang saham', f'PT Cakra Konsultan Mandiri didirikan. Para pemegang saham menyetor modal {r(modal)} secara tunai ke rekening bank perusahaan.', [D(c(1100), modal), K(c(3100), modal)], 'Kas dan bank bertambah (debit). Modal saham bertambah (kredit).'),
    item(p, 2, 'Bayar sewa kantor 12 bulan di muka', f'Perusahaan membayar sewa kantor untuk 12 bulan ke depan sebesar {r(sewa)} dari rekening bank.', [D(c(1400), sewa), K(c(1100), sewa)], 'Sewa untuk masa depan adalah aset (Sewa Dibayar di Muka), bukan beban. Bebannya baru diakui seiring waktu lewat jurnal penyesuaian.'),
    item(p, 3, 'Beli peralatan kantor tunai', f'Perusahaan membeli komputer dan perabot kantor seharga {r(alat)} dan membayarnya dari rekening bank.', [D(c(1500), alat), K(c(1100), alat)], 'Peralatan bermanfaat lebih dari satu tahun sehingga dicatat sebagai aset tetap (debit), kas berkurang (kredit).'),
    item(p, 4, 'Beli perlengkapan kantor secara kredit', f'Perusahaan membeli alat tulis dan kertas {r(perl)} dari pemasok. Pembayaran dilakukan bulan depan.', [D(c(1300), perl), K(c(2100), perl)], 'Perlengkapan yang belum dipakai adalah aset (debit). Pembelian belum dibayar menambah utang usaha (kredit).'),
    item(p, 5, 'Jasa konsultasi selesai dan ditagih ke klien', f'Perusahaan menyelesaikan proyek konsultasi untuk klien dan menerbitkan tagihan {r(fee1)}. Klien belum membayar.', [D(c(1200), fee1), K(c(4100), fee1)], 'Pendapatan diakui saat jasa selesai diserahkan (dasar akrual), walau kas belum diterima. Piutang usaha bertambah.'),
    item(p, 6, 'Terima uang muka kontrak konsultasi', f'Seorang klien membayar uang muka {r(um)} ke rekening bank untuk kontrak konsultasi yang baru akan dikerjakan bulan depan.', [D(c(1100), um), K(c(2200), um)], 'Jasa belum diserahkan, jadi kewajiban untuk mengerjakan (Pendapatan Diterima di Muka) dicatat sebagai liabilitas, bukan pendapatan.'),
    item(p, 7, 'Pelunasan piutang dari klien', f'Klien melunasi sebagian tagihan sebesar {r(lunas)} melalui transfer bank.', [D(c(1100), lunas), K(c(1200), lunas)], 'Satu aset berganti aset: kas naik, piutang turun. Tidak ada pendapatan baru.'),
    item(p, 8, 'Bayar gaji karyawan', f'Perusahaan membayar gaji karyawan bulan ini sebesar {r(gaji)} dari rekening bank.', [D(c(5100), gaji), K(c(1100), gaji)], 'Gaji sudah dinikmati periode ini sehingga menjadi beban (debit), kas berkurang (kredit).'),
    item(p, 9, 'Bayar listrik dan telepon', f'Tagihan listrik dan telepon kantor {r(lst)} dibayar tunai dari rekening bank.', [D(c(5500), lst), K(c(1100), lst)], 'Beban operasional dibayar langsung: beban bertambah (debit), kas berkurang (kredit).'),
    item(p, 10, 'Bayar perjalanan dinas', f'Biaya tiket dan akomodasi perjalanan dinas ke klien luar kota {r(dinas)} dibayar tunai dari rekening bank.', [D(c(5600), dinas), K(c(1100), dinas)], 'Biaya perjalanan dinas langsung menjadi beban periode berjalan.'),
    item(p, 11, 'Bayar utang pembelian perlengkapan', f'Perusahaan melunasi utang pembelian perlengkapan kantor sebesar {r(perl)} melalui transfer bank.', [D(c(2100), perl), K(c(1100), perl)], 'Utang berkurang (debit), kas berkurang (kredit).'),
    item(p, 12, 'Penyesuaian: sewa dibayar di muka terpakai', f'Pada akhir Desember, sewa kantor {r(sewa)} yang dibayar untuk 12 bulan sejak 1 Oktober sudah terpakai 3 bulan. Buat jurnal penyesuaiannya.', [D(c(5200), sewa_pakai), K(c(1400), sewa_pakai)], f'Beban sewa = {r(sewa)} / 12 x 3 bulan = {r(sewa_pakai)}. Aset sewa dibayar di muka berkurang sebesar itu.'),
    item(p, 13, 'Penyesuaian: penyusutan peralatan kantor', f'Peralatan kantor seharga {r(alat)} dibeli 1 Oktober, umur manfaat 5 tahun, tanpa nilai residu, metode garis lurus. Hitung penyusutan sampai akhir Desember (3 bulan).', [D(c(5400), susut), K(c(1510), susut)], f'Penyusutan = {r(alat)} / 5 / 12 x 3 = {r(susut)}. Dicatat ke akun lawan aset (akumulasi), bukan langsung mengurangi peralatan.'),
    item(p, 14, 'Penyesuaian: uang muka yang sudah dikerjakan', f'Dari uang muka kontrak {r(um)} yang sebelumnya dicatat sebagai pendapatan diterima di muka, pekerjaan senilai 40% telah diselesaikan sampai akhir Desember.', [D(c(2200), um_kerja), K(c(4100), um_kerja)], f'Bagian yang sudah dikerjakan = 40% x {r(um)} = {r(um_kerja)}. Liabilitas turun dan berpindah menjadi pendapatan.'),
    item(p, 15, 'Penyesuaian: gaji yang masih harus dibayar', f'Gaji karyawan sebulan {r(gaji_hr)} (30 hari). Pada akhir Desember, gaji untuk 4 hari terakhir belum dibayar.', [D(c(5100), gaji_ut), K(c(2300), gaji_ut)], f'Beban = {r(gaji_hr)} / 30 x 4 = {r(gaji_ut)}. Beban sudah terjadi tetapi belum dibayar, maka dicatat sebagai liabilitas (beban yang masih harus dibayar).'),
    item(p, 16, 'Penyesuaian: perlengkapan terpakai', f'Perlengkapan kantor yang dibeli {r(perl)}. Hasil hitung fisik akhir Desember menunjukkan sisa perlengkapan {r(perl_sisa)}.', [D(c(5300), perl - perl_sisa), K(c(1300), perl - perl_sisa)], f'Perlengkapan terpakai = {r(perl)} - {r(perl_sisa)} = {r(perl - perl_sisa)}.'),
]
pack('industri-jasa', 'Jasa konsultasi: PT Cakra Konsultan Mandiri', 'Perusahaan jasa. Pendapatan diterima di muka, sewa dibayar di muka, gaji terutang, penyusutan. Tanpa persediaan dan HPP. Abaikan pajak.', acs, items)

# ======================================================================
# 2. DAGANG BUSANA (perpetual)
# ======================================================================
p = 'dg'
c = lambda s: f'DG-{s}'
acs = [
    acc(c(1100), 'Kas dan Bank', A, DB, 'Current Asset'),
    acc(c(1200), 'Piutang Usaha', A, DB, 'Current Asset'),
    acc(c(1300), 'Persediaan Barang Dagang', A, DB, 'Inventory'),
    acc(c(1400), 'Asuransi Dibayar di Muka', A, DB, 'Current Asset'),
    acc(c(1600), 'Peralatan Toko', A, DB, 'Fixed Asset'),
    acc(c(1610), 'Akumulasi Penyusutan Peralatan Toko', A, CR, 'Contra Asset'),
    acc(c(2100), 'Utang Usaha', L, CR, 'Current Liability'),
    acc(c(2200), 'Utang Gaji', L, CR, 'Current Liability'),
    acc(c(3100), 'Modal Saham', E, CR, 'Equity'),
    acc(c(4100), 'Penjualan', R, CR, 'Revenue'),
    acc(c(4110), 'Retur Penjualan', R, DB, 'Contra Revenue'),
    acc(c(4120), 'Potongan Penjualan', R, DB, 'Contra Revenue'),
    acc(c(5100), 'Harga Pokok Penjualan', X, DB, 'Cost of Sales'),
    acc(c(5200), 'Beban Gaji', X, DB, 'Expense'),
    acc(c(5300), 'Beban Sewa', X, DB, 'Expense'),
    acc(c(5400), 'Beban Iklan', X, DB, 'Expense'),
    acc(c(5500), 'Beban Penyusutan Peralatan Toko', X, DB, 'Expense'),
    acc(c(5700), 'Beban Asuransi', X, DB, 'Expense'),
]
modal = 300_000_000
beli = 120_000_000
angkut = 2_400_000
retb = 5_000_000
tunai = 36_000_000
hpp1 = 21_600_000
kred = 50_000_000
hpp2 = 30_000_000
retj = 4_000_000
hpp_ret = 2_400_000
inv_net = 46_000_000
disk = inv_net * 2 // 100
kas_lunas = inv_net - disk
utang_lunas = beli + angkut * 0 - retb
prem = 7_200_000
iklan = 8_000_000
sewa = 6_000_000
peral = 60_000_000
sus = peral // 5 // 12 * 4
gaji_ut = 3_500_000
asr_pakai = prem // 12 * 3
items = [
    item(p, 1, 'Setoran modal pemegang saham', f'PT Gaya Nusantara Busana, toko pakaian, menerima setoran modal tunai {r(modal)} ke rekening bank.', [D(c(1100), modal), K(c(3100), modal)], 'Kas naik (debit), modal saham naik (kredit).'),
    item(p, 2, 'Pembelian barang dagang secara kredit', f'Toko membeli pakaian dari pabrik {r(beli)} secara kredit. Perusahaan memakai sistem persediaan perpetual.', [D(c(1300), beli), K(c(2100), beli)], 'Pada sistem perpetual, pembelian langsung menambah Persediaan (debit). Utang usaha bertambah (kredit).'),
    item(p, 3, 'Ongkos angkut pembelian', f'Ongkos kirim barang dagang dari pabrik ke toko {r(angkut)} dibayar tunai dari rekening bank. Syarat pengiriman FOB shipping point.', [D(c(1300), angkut), K(c(1100), angkut)], 'Pada FOB shipping point, pembeli menanggung ongkos angkut. Biaya ini menambah harga perolehan persediaan.'),
    item(p, 4, 'Retur pembelian', f'Sebagian pakaian cacat senilai {r(retb)} dikembalikan kepada pemasok, dan nilainya mengurangi utang usaha.', [D(c(2100), retb), K(c(1300), retb)], 'Utang berkurang (debit). Persediaan berkurang (kredit) karena barang keluar.'),
    item(p, 5, 'Penjualan tunai dan HPP', f'Toko menjual pakaian secara tunai {r(tunai)} (ke rekening bank). Harga pokok barang yang terjual {r(hpp1)}. Perusahaan memakai sistem perpetual.', [D(c(1100), tunai), K(c(4100), tunai), D(c(5100), hpp1), K(c(1300), hpp1)], 'Pada perpetual, setiap penjualan dicatat dua pasang jurnal sekaligus: penjualan (kas debit, penjualan kredit) dan HPP (HPP debit, persediaan kredit).'),
    item(p, 6, 'Penjualan kredit dan HPP', f'Toko menjual pakaian kepada pelanggan toko lain secara kredit, syarat 2/10, n/30, senilai {r(kred)}. Harga pokok barang tersebut {r(hpp2)}.', [D(c(1200), kred), K(c(4100), kred), D(c(5100), hpp2), K(c(1300), hpp2)], 'Piutang dicatat sebesar harga bruto. Potongan tunai baru dicatat bila pelanggan benar-benar membayar dalam masa diskon.'),
    item(p, 7, 'Retur penjualan', f'Pelanggan mengembalikan pakaian yang dijual kredit senilai {r(retj)} dan piutangnya dibatalkan. Harga pokok barang retur {r(hpp_ret)} dan barang masuk kembali ke gudang dalam kondisi baik.', [D(c(4110), retj), K(c(1200), retj), D(c(1300), hpp_ret), K(c(5100), hpp_ret)], 'Retur penjualan (akun lawan penjualan) bertambah dan piutang turun. Pada perpetual, persediaan dipulihkan dan HPP dibalik sebesar harga pokok barang retur.'),
    item(p, 8, 'Pelunasan piutang dengan potongan tunai', f'Pelanggan melunasi tagihan {r(inv_net)} (setelah retur) pada hari ke-8 dan memperoleh potongan 2% sesuai syarat 2/10, n/30.', [D(c(1100), kas_lunas), D(c(4120), disk), K(c(1200), inv_net)], f'Potongan = 2% x {r(inv_net)} = {r(disk)}. Kas yang diterima {r(kas_lunas)}. Piutang dihapus penuh {r(inv_net)}.'),
    item(p, 9, 'Pelunasan utang usaha', f'Toko melunasi utang kepada pabrik sebesar {r(utang_lunas)} (utang {r(beli)} setelah retur {r(retb)}) melalui transfer bank.', [D(c(2100), utang_lunas), K(c(1100), utang_lunas)], 'Utang usaha berkurang (debit), kas berkurang (kredit).'),
    item(p, 9, 'Beli peralatan toko tunai', f'Toko membeli rak display dan manekin {r(peral)} secara tunai dari rekening bank pada 1 September.', [D(c(1600), peral), K(c(1100), peral)], 'Rak dan manekin dipakai lebih dari satu tahun sehingga menjadi aset tetap (debit); kas berkurang (kredit).'),
    item(p, 10, 'Bayar premi asuransi 12 bulan', f'Toko membayar premi asuransi kebakaran untuk 12 bulan sebesar {r(prem)} dari rekening bank, berlaku sejak 1 Oktober.', [D(c(1400), prem), K(c(1100), prem)], 'Manfaat asuransi berlangsung 12 bulan, maka dicatat sebagai aset terlebih dahulu.'),
    item(p, 11, 'Bayar beban iklan', f'Toko membayar iklan media sosial {r(iklan)} secara tunai dari rekening bank.', [D(c(5400), iklan), K(c(1100), iklan)], 'Iklan langsung menjadi beban periode ini.'),
    item(p, 12, 'Bayar sewa toko bulanan', f'Sewa toko bulan ini {r(sewa)} dibayar tunai dari rekening bank.', [D(c(5300), sewa), K(c(1100), sewa)], 'Sewa bulan berjalan menjadi beban (debit), kas berkurang (kredit).'),
    item(p, 13, 'Penyesuaian: asuransi terpakai', f'Premi asuransi {r(prem)} dibayar untuk 12 bulan sejak 1 Oktober. Hitung bagian yang menjadi beban sampai 31 Desember.', [D(c(5700), asr_pakai), K(c(1400), asr_pakai)], f'Beban asuransi = {r(prem)} / 12 x 3 = {r(asr_pakai)}.'),
    item(p, 14, 'Penyesuaian: penyusutan peralatan toko', f'Peralatan toko {r(peral)} dibeli 1 September, umur 5 tahun, tanpa nilai residu, garis lurus. Hitung penyusutan sampai 31 Desember (4 bulan).', [D(c(5500), sus), K(c(1610), sus)], f'Penyusutan = {r(peral)} / 5 / 12 x 4 = {r(sus)}.'),
    item(p, 15, 'Penyesuaian: gaji terutang', f'Gaji pegawai toko untuk hari kerja terakhir Desember sebesar {r(gaji_ut)} baru dibayar bulan Januari.', [D(c(5200), gaji_ut), K(c(2200), gaji_ut)], 'Beban gaji sudah terjadi di Desember walaupun belum dibayar, sehingga diakui dengan liabilitas (utang gaji).'),
]
pack('industri-dagang', 'Dagang busana: PT Gaya Nusantara Busana', 'Perusahaan dagang dengan sistem persediaan perpetual. Ongkos angkut, retur, potongan tunai, HPP. Abaikan pajak.', acs, items)

# ======================================================================
# 3. MANUFAKTUR FURNITUR
# ======================================================================
p = 'mf'
c = lambda s: f'MF-{s}'
acs = [
    acc(c(1100), 'Kas dan Bank', A, DB, 'Current Asset'),
    acc(c(1200), 'Piutang Usaha', A, DB, 'Current Asset'),
    acc(c(1300), 'Persediaan Bahan Baku', A, DB, 'Inventory'),
    acc(c(1400), 'Persediaan Barang dalam Proses', A, DB, 'Inventory'),
    acc(c(1500), 'Persediaan Barang Jadi', A, DB, 'Inventory'),
    acc(c(1600), 'Mesin Produksi', A, DB, 'Fixed Asset'),
    acc(c(1610), 'Akumulasi Penyusutan Mesin Produksi', A, CR, 'Contra Asset'),
    acc(c(2100), 'Utang Usaha', L, CR, 'Current Liability'),
    acc(c(3100), 'Modal Saham', E, CR, 'Equity'),
    acc(c(4100), 'Penjualan', R, CR, 'Revenue'),
    acc(c(5100), 'Harga Pokok Penjualan', X, DB, 'Cost of Sales'),
    acc(c(5200), 'Beban Penjualan', X, DB, 'Expense'),
    acc(c(5400), 'Biaya Overhead Pabrik', X, DB, 'Overhead'),
]
modal = 800_000_000
mesin = 360_000_000
bahan = 90_000_000
pakai = 72_000_000
bantu = 5_000_000
upah = 30_000_000
mandor = 6_000_000
listrik = 4_500_000
sus_m = mesin // 10 // 12
bop_act = bantu + mandor + listrik + sus_m
bop_app = upah * 60 // 100
bjadi = pakai + upah + bop_app
jual = 200_000_000
terima = 150_000_000
iklan = 7_000_000
lunas = 60_000_000
sel = bop_act - bop_app
items = [
    item(p, 1, 'Setoran modal dan beli mesin produksi', f'PT Kayu Jati Furnitur menerima setoran modal tunai {r(modal)} ke rekening bank, lalu membeli mesin produksi {r(mesin)} secara tunai.', [D(c(1100), modal), K(c(3100), modal), D(c(1600), mesin), K(c(1100), mesin)], 'Dua peristiwa: modal saham naik dan kas naik; kemudian mesin (aset tetap) bertambah dan kas berkurang.'),
    item(p, 2, 'Pembelian bahan baku secara kredit', f'Perusahaan membeli kayu jati {r(bahan)} dari pemasok. Pembayaran dilakukan bulan depan.', [D(c(1300), bahan), K(c(2100), bahan)], 'Bahan baku yang belum dipakai adalah persediaan (debit). Utang usaha bertambah (kredit).'),
    item(p, 3, 'Bahan baku langsung masuk produksi', f'Gudang menyerahkan kayu jati senilai {r(pakai)} ke bagian produksi untuk dikerjakan menjadi furnitur.', [D(c(1400), pakai), K(c(1300), pakai)], 'Bahan baku langsung berpindah dari persediaan bahan baku ke barang dalam proses.'),
    item(p, 4, 'Bahan penolong dipakai pabrik', f'Pabrik memakai paku, lem, dan amplas (bahan tidak langsung) senilai {r(bantu)} yang diambil dari gudang bahan.', [D(c(5400), bantu), K(c(1300), bantu)], 'Bahan penolong tidak dapat ditelusuri ke satu produk, jadi dicatat sebagai biaya overhead pabrik, bukan langsung ke barang dalam proses.'),
    item(p, 5, 'Upah tenaga kerja langsung', f'Upah tukang yang mengerjakan produk secara langsung {r(upah)} dibayar tunai dari rekening bank.', [D(c(1400), upah), K(c(1100), upah)], 'Upah langsung menambah barang dalam proses karena melekat pada produk.'),
    item(p, 6, 'Upah mandor (tenaga kerja tidak langsung)', f'Gaji mandor pabrik {r(mandor)} dibayar tunai dari rekening bank.', [D(c(5400), mandor), K(c(1100), mandor)], 'Mandor mengawasi seluruh produksi sehingga upahnya masuk biaya overhead pabrik.'),
    item(p, 7, 'Listrik pabrik', f'Tagihan listrik pabrik {r(listrik)} dibayar tunai dari rekening bank.', [D(c(5400), listrik), K(c(1100), listrik)], 'Listrik pabrik adalah overhead pabrik.'),
    item(p, 8, 'Penyusutan mesin produksi', f'Mesin produksi {r(mesin)} berumur 10 tahun tanpa nilai residu, garis lurus. Catat penyusutan satu bulan.', [D(c(5400), sus_m), K(c(1610), sus_m)], f'Penyusutan sebulan = {r(mesin)} / 10 / 12 = {r(sus_m)}. Penyusutan mesin pabrik masuk overhead.'),
    item(p, 9, 'Pembebanan overhead ke produksi', f'Perusahaan membebankan overhead pabrik ke barang dalam proses dengan tarif 60% dari upah tenaga kerja langsung sebesar {r(upah)}.', [D(c(1400), bop_app), K(c(5400), bop_app)], f'Overhead dibebankan = 60% x {r(upah)} = {r(bop_app)}. Akun Biaya Overhead Pabrik dikreditkan agar saldonya dapat dibandingkan dengan overhead aktual.'),
    item(p, 10, 'Produk selesai dipindah ke barang jadi', f'Produksi furnitur selesai. Barang dalam proses terdiri dari bahan baku {r(pakai)}, upah langsung {r(upah)}, dan overhead dibebankan {r(bop_app)}. Seluruh produk dipindahkan ke gudang barang jadi.', [D(c(1500), bjadi), K(c(1400), bjadi)], f'Harga pokok produksi = {r(pakai)} + {r(upah)} + {r(bop_app)} = {r(bjadi)}.'),
    item(p, 11, 'Penjualan kredit dan HPP', f'Seluruh furnitur terjual secara kredit {r(jual)}. Harga pokok barang jadi yang terjual sebesar {r(bjadi)}.', [D(c(1200), jual), K(c(4100), jual), D(c(5100), bjadi), K(c(1500), bjadi)], 'Dua pasang jurnal: pengakuan penjualan, dan pemindahan harga pokok dari persediaan barang jadi ke HPP.'),
    item(p, 12, 'Penerimaan piutang', f'Pelanggan membayar {r(terima)} atas penjualan kredit melalui transfer bank.', [D(c(1100), terima), K(c(1200), terima)], 'Kas naik (debit), piutang turun (kredit).'),
    item(p, 13, 'Beban iklan penjualan', f'Perusahaan membayar iklan katalog furnitur {r(iklan)} tunai dari rekening bank.', [D(c(5200), iklan), K(c(1100), iklan)], 'Biaya pemasaran bukan biaya produksi, jadi menjadi beban penjualan periode berjalan.'),
    item(p, 14, 'Bayar utang pemasok', f'Perusahaan membayar sebagian utang pembelian kayu {r(lunas)} melalui transfer bank.', [D(c(2100), lunas), K(c(1100), lunas)], 'Utang usaha berkurang (debit), kas berkurang (kredit).'),
    item(p, 15, 'Penutupan selisih overhead kurang dibebankan', f'Akhir bulan, overhead pabrik aktual berjumlah {r(bop_act)} (bahan penolong, upah mandor, listrik, dan penyusutan mesin), sedangkan yang dibebankan ke produksi {r(bop_app)}. Seluruh barang sudah terjual. Tutup selisihnya ke harga pokok penjualan.', [D(c(5100), sel), K(c(5400), sel)], f'Overhead kurang dibebankan = {r(bop_act)} - {r(bop_app)} = {r(sel)}. Karena barangnya sudah terjual, selisih ditambahkan ke HPP. Saldo akun overhead menjadi nol.'),
]
pack('industri-manufaktur', 'Manufaktur furnitur: PT Kayu Jati Furnitur', 'Perusahaan manufaktur. Bahan baku, barang dalam proses, barang jadi, upah langsung, overhead pabrik dibebankan. Abaikan pajak.', acs, items)

# ======================================================================
# 4. RESTORAN
# ======================================================================
p = 'rs'
c = lambda s: f'RS-{s}'
acs = [
    acc(c(1100), 'Kas', A, DB, 'Current Asset'),
    acc(c(1200), 'Piutang Usaha', A, DB, 'Current Asset'),
    acc(c(1300), 'Persediaan Bahan Makanan', A, DB, 'Inventory'),
    acc(c(1400), 'Peralatan Dapur', A, DB, 'Fixed Asset'),
    acc(c(1410), 'Akumulasi Penyusutan Peralatan Dapur', A, CR, 'Contra Asset'),
    acc(c(2200), 'Utang Gaji', L, CR, 'Current Liability'),
    acc(c(2300), 'Uang Muka Pesanan Katering', L, CR, 'Current Liability'),
    acc(c(3100), 'Modal Pemilik', E, CR, 'Equity'),
    acc(c(3200), 'Prive', E, DB, 'Equity'),
    acc(c(4100), 'Pendapatan Makanan dan Minuman', R, CR, 'Revenue'),
    acc(c(5100), 'Beban Bahan Makanan', X, DB, 'Expense'),
    acc(c(5200), 'Beban Gaji', X, DB, 'Expense'),
    acc(c(5300), 'Beban Gas dan Listrik', X, DB, 'Expense'),
    acc(c(5400), 'Beban Penyusutan Peralatan Dapur', X, DB, 'Expense'),
    acc(c(5600), 'Beban Sewa', X, DB, 'Expense'),
]
modal = 80_000_000
alat = 25_000_000
bahan = 12_000_000
hari = 9_500_000
kat = 15_000_000
um = 5_000_000
sewa = 6_000_000
gaji = 14_000_000
gas = 3_200_000
prive = 4_000_000
tagih = 10_000_000
sisa = 4_500_000
resid = 1_000_000
sus = (alat - resid) // 5 // 12
gaji_ut = 2_800_000
items = [
    item(p, 1, 'Setoran modal pemilik', f'Bapak Hendra membuka Warung Makan Sedap Rasa dengan menyetor modal tunai {r(modal)}.', [D(c(1100), modal), K(c(3100), modal)], 'Kas naik (debit), modal pemilik naik (kredit).'),
    item(p, 2, 'Beli peralatan dapur tunai', f'Warung membeli kompor industri dan peralatan masak {r(alat)} secara tunai.', [D(c(1400), alat), K(c(1100), alat)], 'Peralatan tahan lama adalah aset tetap (debit), kas berkurang (kredit).'),
    item(p, 3, 'Beli bahan makanan tunai', f'Warung membeli beras, daging, dan sayur {r(bahan)} secara tunai.', [D(c(1300), bahan), K(c(1100), bahan)], 'Bahan yang belum dipakai dicatat sebagai persediaan; beban baru diakui setelah bahan terpakai (disesuaikan di akhir periode).'),
    item(p, 4, 'Penjualan makanan tunai harian', f'Penjualan makanan dan minuman kepada pelanggan hari ini {r(hari)} diterima tunai.', [D(c(1100), hari), K(c(4100), hari)], 'Kas naik, pendapatan naik.'),
    item(p, 5, 'Pesanan katering secara kredit', f'Warung menyelesaikan pesanan katering untuk sebuah kantor senilai {r(kat)}. Kantor akan membayar bulan depan.', [D(c(1200), kat), K(c(4100), kat)], 'Pendapatan diakui saat katering diserahkan; belum ada kas, jadi muncul piutang.'),
    item(p, 6, 'Terima uang muka pesanan katering', f'Pelanggan memesan katering untuk acara bulan depan dan membayar uang muka {r(um)} tunai.', [D(c(1100), um), K(c(2300), um)], 'Acara belum dilayani, jadi uang muka adalah liabilitas.'),
    item(p, 7, 'Bayar sewa tempat bulanan', f'Warung membayar sewa tempat usaha untuk bulan ini {r(sewa)} tunai.', [D(c(5600), sewa), K(c(1100), sewa)], 'Beban sewa periode berjalan.'),
    item(p, 8, 'Bayar gaji karyawan', f'Gaji karyawan dapur dan pelayan bulan ini {r(gaji)} dibayar tunai.', [D(c(5200), gaji), K(c(1100), gaji)], 'Beban gaji bertambah (debit), kas berkurang (kredit).'),
    item(p, 9, 'Bayar gas dan listrik', f'Tagihan gas elpiji dan listrik {r(gas)} dibayar tunai.', [D(c(5300), gas), K(c(1100), gas)], 'Beban operasional.'),
    item(p, 10, 'Pemilik mengambil uang pribadi', f'Pemilik mengambil kas warung {r(prive)} untuk keperluan pribadi.', [D(c(3200), prive), K(c(1100), prive)], 'Pengambilan pribadi bukan beban. Dicatat ke Prive, yang mengurangi ekuitas pemilik.'),
    item(p, 11, 'Pelunasan piutang katering', f'Kantor pelanggan membayar sebagian tagihan katering {r(tagih)} tunai.', [D(c(1100), tagih), K(c(1200), tagih)], 'Kas naik, piutang turun. Tidak ada pendapatan baru.'),
    item(p, 12, 'Penyesuaian: bahan makanan terpakai', f'Bahan makanan yang dibeli bulan ini {r(bahan)}. Stok opname akhir bulan menunjukkan sisa bahan {r(sisa)}.', [D(c(5100), bahan - sisa), K(c(1300), bahan - sisa)], f'Bahan terpakai = {r(bahan)} - {r(sisa)} = {r(bahan - sisa)}; menjadi beban bahan makanan.'),
    item(p, 13, 'Penyesuaian: penyusutan peralatan dapur', f'Peralatan dapur {r(alat)} berumur 5 tahun dengan nilai residu {r(resid)}, metode garis lurus. Catat penyusutan satu bulan.', [D(c(5400), sus), K(c(1410), sus)], f'Penyusutan = ({r(alat)} - {r(resid)}) / 5 / 12 = {r(sus)}.'),
    item(p, 14, 'Penyesuaian: uang muka katering sudah dilayani', f'Acara katering yang uang mukanya {r(um)} (dicatat sebagai liabilitas) sudah dilaksanakan seluruhnya pada akhir bulan.', [D(c(2300), um), K(c(4100), um)], 'Kewajiban sudah dipenuhi sehingga liabilitas hilang dan pendapatan diakui.'),
    item(p, 15, 'Penyesuaian: gaji terutang', f'Gaji pelayan untuk 3 hari terakhir bulan ini sebesar {r(gaji_ut)} belum dibayar.', [D(c(5200), gaji_ut), K(c(2200), gaji_ut)], 'Beban sudah terjadi tetapi belum dibayar: diakui bersama utang gaji.'),
]
pack('industri-restoran', 'Restoran: Warung Makan Sedap Rasa', 'Usaha perorangan. Persediaan bahan makanan, katering, uang muka pesanan, prive. Abaikan pajak.', acs, items)

# ======================================================================
# 5. KONSTRUKSI
# ======================================================================
p = 'ks'
c = lambda s: f'KS-{s}'
acs = [
    acc(c(1100), 'Kas dan Bank', A, DB, 'Current Asset'),
    acc(c(1200), 'Piutang Termin', A, DB, 'Current Asset'),
    acc(c(1250), 'Aset Kontrak', A, DB, 'Current Asset'),
    acc(c(1300), 'Persediaan Material Proyek', A, DB, 'Inventory'),
    acc(c(1500), 'Alat Berat', A, DB, 'Fixed Asset'),
    acc(c(1510), 'Akumulasi Penyusutan Alat Berat', A, CR, 'Contra Asset'),
    acc(c(2100), 'Utang Usaha', L, CR, 'Current Liability'),
    acc(c(2300), 'Liabilitas Kontrak (Uang Muka Proyek)', L, CR, 'Current Liability'),
    acc(c(3100), 'Modal Saham', E, CR, 'Equity'),
    acc(c(4100), 'Pendapatan Kontrak Konstruksi', R, CR, 'Revenue'),
    acc(c(5100), 'Beban Kontrak', X, DB, 'Cost of Sales'),
    acc(c(5200), 'Beban Penyusutan Alat Berat', X, DB, 'Expense'),
    acc(c(5300), 'Beban Administrasi Proyek', X, DB, 'Expense'),
]
modal = 1_000_000_000
alat = 600_000_000
nilai = 2_000_000_000
um = nilai * 10 // 100
mat = 300_000_000
mat_pakai = 240_000_000
upah = 90_000_000
sub = 60_000_000
prog = 25
pend = nilai * prog // 100
termin = pend
piut = termin - um
terima = 300_000_000
bayar = 350_000_000
bbm = 18_000_000
adm = 12_000_000
sus = alat // 8 // 12
items = [
    item(p, 1, 'Setoran modal dan beli alat berat', f'PT Bangun Karya Persada menerima setoran modal tunai {r(modal)} ke rekening bank, lalu membeli alat berat (ekskavator) {r(alat)} secara tunai.', [D(c(1100), modal), K(c(3100), modal), D(c(1500), alat), K(c(1100), alat)], 'Modal saham dan kas naik, lalu alat berat (aset tetap) naik dan kas berkurang.'),
    item(p, 2, 'Terima uang muka proyek', f'Pemilik proyek membayar uang muka 10% dari nilai kontrak {r(nilai)} ke rekening bank sebelum pekerjaan dimulai.', [D(c(1100), um), K(c(2300), um)], f'Uang muka = 10% x {r(nilai)} = {r(um)}. Pekerjaan belum dilakukan, jadi dicatat sebagai liabilitas kontrak, bukan pendapatan.'),
    item(p, 3, 'Beli material proyek secara kredit', f'Perusahaan membeli semen, baja, dan pasir {r(mat)} dari pemasok secara kredit.', [D(c(1300), mat), K(c(2100), mat)], 'Material belum terpakai adalah persediaan (debit); utang usaha bertambah (kredit).'),
    item(p, 4, 'Material dipakai di proyek', f'Dari material yang dibeli, senilai {r(mat_pakai)} telah dipakai dalam pekerjaan proyek.', [D(c(5100), mat_pakai), K(c(1300), mat_pakai)], 'Material yang terpakai menjadi biaya kontrak (beban), persediaan berkurang.'),
    item(p, 5, 'Bayar upah pekerja proyek', f'Upah pekerja proyek {r(upah)} dibayar tunai dari rekening bank.', [D(c(5100), upah), K(c(1100), upah)], 'Upah pekerja proyek adalah biaya kontrak.'),
    item(p, 6, 'Biaya subkontraktor terutang', f'Subkontraktor mekanikal dan elektrikal menagih {r(sub)} untuk pekerjaannya. Pembayaran belum dilakukan.', [D(c(5100), sub), K(c(2100), sub)], 'Biaya kontrak diakui saat pekerjaan selesai, utang usaha bertambah.'),
    item(p, 7, 'Biaya BBM alat berat', f'Biaya solar untuk alat berat proyek {r(bbm)} dibayar tunai dari rekening bank.', [D(c(5100), bbm), K(c(1100), bbm)], 'Biaya operasi alat berat di proyek termasuk biaya kontrak.'),
    item(p, 8, 'Pengakuan pendapatan berdasarkan progres', f'Nilai kontrak {r(nilai)}. Berdasarkan laporan teknis, progres pekerjaan mencapai {prog}% pada akhir periode. Pendapatan diakui sepanjang waktu mengikuti progres dan belum ditagih.', [D(c(1250), pend), K(c(4100), pend)], f'Pendapatan = {prog}% x {r(nilai)} = {r(pend)}. Karena belum ditagih, hak perusahaan dicatat sebagai aset kontrak.'),
    item(p, 9, 'Tagihan termin pertama dengan potongan uang muka', f'Perusahaan menerbitkan tagihan termin pertama senilai progres {r(termin)}. Uang muka {r(um)} yang diterima di awal diperhitungkan seluruhnya pada tagihan ini, sehingga piutang termin hanya sebesar sisanya. Pendapatan atas progres tersebut ({r(pend)}) sebelumnya dicatat sebagai aset kontrak.', [D(c(1200), piut), D(c(2300), um), K(c(1250), termin)], f'Termin {r(termin)} dibayar dengan memotong uang muka {r(um)}; piutang termin = {r(piut)}. Aset kontrak hilang karena kini sudah menjadi piutang. Liabilitas kontrak lunas.'),
    item(p, 10, 'Terima pembayaran termin', f'Pemilik proyek membayar piutang termin sebesar {r(terima)} melalui transfer bank.', [D(c(1100), terima), K(c(1200), terima)], 'Kas naik, piutang termin turun.'),
    item(p, 11, 'Bayar utang pemasok dan subkontraktor', f'Perusahaan membayar utang usaha {r(bayar)} melalui transfer bank.', [D(c(2100), bayar), K(c(1100), bayar)], 'Utang usaha berkurang (debit), kas berkurang (kredit).'),
    item(p, 12, 'Bayar beban administrasi proyek', f'Biaya perizinan dan administrasi kantor proyek {r(adm)} dibayar tunai dari rekening bank.', [D(c(5300), adm), K(c(1100), adm)], 'Biaya umum yang tidak langsung melekat pada pekerjaan dicatat sebagai beban administrasi.'),
    item(p, 13, 'Penyesuaian: penyusutan alat berat', f'Alat berat {r(alat)} berumur 8 tahun tanpa nilai residu, garis lurus. Catat penyusutan satu bulan.', [D(c(5200), sus), K(c(1510), sus)], f'Penyusutan = {r(alat)} / 8 / 12 = {r(sus)}.'),
]
pack('industri-konstruksi', 'Konstruksi: PT Bangun Karya Persada', 'Kontraktor. Uang muka proyek, pendapatan kontrak berdasarkan progres, termin, aset dan liabilitas kontrak. Abaikan pajak dan retensi.', acs, items)

# ======================================================================
# 6. PENDIDIKAN (BIMBEL)
# ======================================================================
p = 'pd'
c = lambda s: f'PD-{s}'
acs = [
    acc(c(1100), 'Kas dan Bank', A, DB, 'Current Asset'),
    acc(c(1200), 'Piutang Biaya Pendidikan', A, DB, 'Current Asset'),
    acc(c(1300), 'Perlengkapan Kelas', A, DB, 'Current Asset'),
    acc(c(1400), 'Peralatan Pembelajaran', A, DB, 'Fixed Asset'),
    acc(c(1410), 'Akumulasi Penyusutan Peralatan Pembelajaran', A, CR, 'Contra Asset'),
    acc(c(2100), 'Utang Usaha', L, CR, 'Current Liability'),
    acc(c(2200), 'Biaya Pendidikan Diterima di Muka', L, CR, 'Current Liability'),
    acc(c(2300), 'Utang Gaji Pengajar', L, CR, 'Current Liability'),
    acc(c(3100), 'Modal Pemilik', E, CR, 'Equity'),
    acc(c(4100), 'Pendapatan Biaya Pendidikan', R, CR, 'Revenue'),
    acc(c(4200), 'Pendapatan Biaya Pendaftaran', R, CR, 'Revenue'),
    acc(c(5100), 'Beban Gaji Pengajar', X, DB, 'Expense'),
    acc(c(5200), 'Beban Sewa Ruang', X, DB, 'Expense'),
    acc(c(5300), 'Beban Perlengkapan Kelas', X, DB, 'Expense'),
    acc(c(5400), 'Beban Penyusutan Peralatan', X, DB, 'Expense'),
    acc(c(5500), 'Beban Promosi', X, DB, 'Expense'),
]
modal = 120_000_000
daftar_n, daftar_h = 24, 250_000
daftar = daftar_n * daftar_h
spp_n, spp_h = 40, 1_800_000
spp = spp_n * spp_h
alat = 30_000_000
perl = 5_000_000
gaji = 22_000_000
sewa = 8_000_000
promo = 3_500_000
tung_n, tung_h = 10, 1_200_000
tung = tung_n * tung_h
terima = 9_000_000
spp_bln = spp // 6
sus = alat // 4 // 12
perl_sisa = 1_500_000
gaji_ut = 5_500_000
items = [
    item(p, 1, 'Setoran modal pemilik', f'Ibu Sari mendirikan Lembaga Bimbel Cerdas Prima dengan menyetor modal tunai {r(modal)} ke rekening bank.', [D(c(1100), modal), K(c(3100), modal)], 'Kas naik, modal pemilik naik.'),
    item(p, 2, 'Terima biaya pendaftaran siswa', f'{daftar_n} siswa baru membayar biaya pendaftaran masing-masing {r(daftar_h)} secara tunai. Biaya pendaftaran tidak dapat dikembalikan.', [D(c(1100), daftar), K(c(4200), daftar)], f'{daftar_n} x {r(daftar_h)} = {r(daftar)}. Biaya pendaftaran tidak dapat dikembalikan dan layanan pendaftaran sudah diberikan, sehingga diakui sebagai pendapatan.'),
    item(p, 3, 'Terima SPP 6 bulan di muka', f'{spp_n} siswa membayar SPP untuk 6 bulan ke depan, masing-masing {r(spp_h)}, secara tunai ke rekening bank.', [D(c(1100), spp), K(c(2200), spp)], f'{spp_n} x {r(spp_h)} = {r(spp)}. Layanan 6 bulan belum diberikan, jadi uang diterima di muka adalah liabilitas.'),
    item(p, 4, 'Beli peralatan pembelajaran tunai', f'Bimbel membeli proyektor dan komputer {r(alat)} tunai dari rekening bank.', [D(c(1400), alat), K(c(1100), alat)], 'Aset tetap bertambah, kas berkurang.'),
    item(p, 5, 'Beli perlengkapan kelas secara kredit', f'Bimbel membeli spidol, modul, dan alat tulis {r(perl)} secara kredit.', [D(c(1300), perl), K(c(2100), perl)], 'Perlengkapan belum terpakai adalah aset; utang usaha bertambah.'),
    item(p, 6, 'Bayar gaji pengajar', f'Gaji pengajar bulan ini {r(gaji)} dibayar dari rekening bank.', [D(c(5100), gaji), K(c(1100), gaji)], 'Beban gaji bertambah (debit), kas berkurang (kredit).'),
    item(p, 7, 'Bayar sewa ruang kelas', f'Sewa ruang kelas bulan ini {r(sewa)} dibayar dari rekening bank.', [D(c(5200), sewa), K(c(1100), sewa)], 'Beban sewa periode berjalan.'),
    item(p, 8, 'Bayar biaya promosi', f'Bimbel membayar pembuatan brosur dan spanduk promosi {r(promo)} secara tunai dari rekening bank.', [D(c(5500), promo), K(c(1100), promo)], 'Biaya promosi menjadi beban periode ini.'),
    item(p, 9, 'SPP bulanan belum dibayar siswa', f'{tung_n} siswa program reguler belum membayar SPP bulan ini, masing-masing {r(tung_h)}. Layanan sudah diberikan sepenuhnya bulan ini.', [D(c(1200), tung), K(c(4100), tung)], f'{tung_n} x {r(tung_h)} = {r(tung)}. Layanan sudah diberikan, jadi pendapatan diakui walau kas belum diterima.'),
    item(p, 10, 'Pelunasan SPP tertunggak', f'Beberapa siswa membayar SPP tertunggak total {r(terima)} secara tunai.', [D(c(1100), terima), K(c(1200), terima)], 'Kas naik, piutang turun.'),
    item(p, 11, 'Penyesuaian: SPP diterima di muka yang sudah diakui', f'SPP 6 bulan yang diterima di muka sebesar {r(spp)} dicatat sebagai liabilitas. Pada akhir bulan pertama, layanan 1 bulan telah diberikan.', [D(c(2200), spp_bln), K(c(4100), spp_bln)], f'Pendapatan bulan ini = {r(spp)} / 6 = {r(spp_bln)}.'),
    item(p, 12, 'Penyesuaian: penyusutan peralatan', f'Peralatan pembelajaran {r(alat)} berumur 4 tahun tanpa residu, garis lurus. Catat penyusutan satu bulan.', [D(c(5400), sus), K(c(1410), sus)], f'Penyusutan = {r(alat)} / 4 / 12 = {r(sus)}.'),
    item(p, 13, 'Penyesuaian: perlengkapan kelas terpakai', f'Perlengkapan kelas yang dibeli {r(perl)}. Stok akhir bulan menunjukkan sisa {r(perl_sisa)}.', [D(c(5300), perl - perl_sisa), K(c(1300), perl - perl_sisa)], f'Terpakai = {r(perl)} - {r(perl_sisa)} = {r(perl - perl_sisa)}.'),
    item(p, 14, 'Penyesuaian: gaji pengajar terutang', f'Honor pengajar lepas untuk kelas tambahan akhir bulan sebesar {r(gaji_ut)} baru dibayar bulan depan.', [D(c(5100), gaji_ut), K(c(2300), gaji_ut)], 'Jasa pengajar sudah dinikmati bulan ini sehingga menjadi beban, kewajibannya dicatat sebagai utang gaji.'),
]
pack('industri-pendidikan', 'Pendidikan: Lembaga Bimbel Cerdas Prima', 'Jasa pendidikan. SPP diterima di muka, pendapatan pendaftaran, piutang SPP, honor pengajar. Abaikan pajak.', acs, items)

# ======================================================================
# 7. TRANSPORTASI / EKSPEDISI
# ======================================================================
p = 'tr'
c = lambda s: f'TR-{s}'
acs = [
    acc(c(1100), 'Kas dan Bank', A, DB, 'Current Asset'),
    acc(c(1200), 'Piutang Usaha', A, DB, 'Current Asset'),
    acc(c(1300), 'Suku Cadang', A, DB, 'Current Asset'),
    acc(c(1400), 'Asuransi Dibayar di Muka', A, DB, 'Current Asset'),
    acc(c(1500), 'Kendaraan Operasional', A, DB, 'Fixed Asset'),
    acc(c(1510), 'Akumulasi Penyusutan Kendaraan', A, CR, 'Contra Asset'),
    acc(c(2100), 'Utang Usaha', L, CR, 'Current Liability'),
    acc(c(2200), 'Utang Bank', L, CR, 'Long-term Liability'),
    acc(c(2300), 'Utang Bunga', L, CR, 'Current Liability'),
    acc(c(3100), 'Modal Saham', E, CR, 'Equity'),
    acc(c(4100), 'Pendapatan Jasa Angkutan', R, CR, 'Revenue'),
    acc(c(5100), 'Beban BBM', X, DB, 'Expense'),
    acc(c(5200), 'Beban Gaji Pengemudi', X, DB, 'Expense'),
    acc(c(5300), 'Beban Pemeliharaan Kendaraan', X, DB, 'Expense'),
    acc(c(5400), 'Beban Penyusutan Kendaraan', X, DB, 'Expense'),
    acc(c(5500), 'Beban Asuransi', X, DB, 'Expense'),
    acc(c(5600), 'Beban Bunga', X, DB, 'Expense'),
]
modal = 600_000_000
truk = 450_000_000
dp = 150_000_000
pinj = truk - dp
prem = 14_400_000
tunai = 45_000_000
kred = 80_000_000
bbm = 28_000_000
gaji = 24_000_000
suku = 9_000_000
terima = 60_000_000
pokok = 10_000_000
bunga = 3_000_000
asr = prem // 12 * 3
resid = 30_000_000
sus = (truk - resid) // 7 // 12 * 3
suku_pakai = 6_000_000
bunga_ut = 2_000_000
items = [
    item(p, 1, 'Setoran modal pemegang saham', f'PT Lintas Nusa Ekspedisi menerima setoran modal tunai {r(modal)} ke rekening bank.', [D(c(1100), modal), K(c(3100), modal)], 'Kas naik, modal saham naik.'),
    item(p, 2, 'Beli truk sebagian tunai dan sebagian kredit bank', f'Perusahaan membeli 3 truk seharga {r(truk)}. Dibayar {r(dp)} dari rekening bank dan sisanya {r(pinj)} dibiayai pinjaman bank.', [D(c(1500), truk), K(c(1100), dp), K(c(2200), pinj)], 'Kendaraan dicatat sebesar harga perolehan penuh (debit). Pembayarannya dua sumber: kas dan utang bank (kredit).'),
    item(p, 3, 'Bayar premi asuransi truk 12 bulan', f'Perusahaan membayar premi asuransi seluruh armada untuk 12 bulan, {r(prem)}, dari rekening bank, berlaku sejak 1 Oktober.', [D(c(1400), prem), K(c(1100), prem)], 'Perlindungan 12 bulan: dicatat sebagai aset terlebih dahulu.'),
    item(p, 4, 'Pendapatan angkutan tunai', f'Perusahaan menerima pembayaran jasa angkutan barang {r(tunai)} secara tunai ke rekening bank.', [D(c(1100), tunai), K(c(4100), tunai)], 'Kas naik, pendapatan naik.'),
    item(p, 5, 'Pendapatan angkutan secara kredit', f'Perusahaan menyelesaikan pengiriman untuk sebuah pabrik dan menagih {r(kred)}. Pembayaran dilakukan bulan depan.', [D(c(1200), kred), K(c(4100), kred)], 'Pendapatan diakui saat jasa selesai, piutang bertambah.'),
    item(p, 6, 'Bayar BBM', f'Biaya solar untuk seluruh armada {r(bbm)} dibayar tunai dari rekening bank.', [D(c(5100), bbm), K(c(1100), bbm)], 'BBM dipakai sepanjang periode berjalan, jadi menjadi beban.'),
    item(p, 7, 'Bayar gaji pengemudi', f'Gaji pengemudi dan kenek bulan ini {r(gaji)} dibayar dari rekening bank.', [D(c(5200), gaji), K(c(1100), gaji)], 'Beban gaji bertambah, kas berkurang.'),
    item(p, 8, 'Beli suku cadang secara kredit', f'Bengkel rekanan menjual ban dan oli {r(suku)} secara kredit untuk persediaan suku cadang.', [D(c(1300), suku), K(c(2100), suku)], 'Suku cadang yang belum dipasang adalah aset; utang usaha bertambah.'),
    item(p, 9, 'Pelunasan piutang pelanggan', f'Pelanggan membayar tagihan angkutan {r(terima)} melalui transfer bank.', [D(c(1100), terima), K(c(1200), terima)], 'Kas naik, piutang turun.'),
    item(p, 10, 'Bayar cicilan pinjaman bank (pokok dan bunga)', f'Perusahaan membayar cicilan bank {r(pokok + bunga)} dari rekening bank, terdiri dari angsuran pokok {r(pokok)} dan bunga {r(bunga)}.', [D(c(2200), pokok), D(c(5600), bunga), K(c(1100), pokok + bunga)], 'Pokok mengurangi utang bank. Bunga adalah beban keuangan periode ini. Keduanya dibayar dengan satu pengeluaran kas.'),
    item(p, 11, 'Penyesuaian: asuransi terpakai', f'Premi asuransi {r(prem)} dibayar untuk 12 bulan sejak 1 Oktober. Hitung beban sampai 31 Desember.', [D(c(5500), asr), K(c(1400), asr)], f'Beban = {r(prem)} / 12 x 3 = {r(asr)}.'),
    item(p, 12, 'Penyesuaian: penyusutan truk', f'Truk seharga {r(truk)} dibeli 1 Oktober, umur 7 tahun, nilai residu {r(resid)}, garis lurus. Hitung penyusutan sampai 31 Desember (3 bulan).', [D(c(5400), sus), K(c(1510), sus)], f'Penyusutan sebulan = ({r(truk)} - {r(resid)}) / 7 / 12; untuk 3 bulan = {r(sus)}.'),
    item(p, 13, 'Penyesuaian: suku cadang terpakai', f'Dari suku cadang yang dibeli {r(suku)}, senilai {r(suku_pakai)} telah dipasang pada truk sampai akhir Desember.', [D(c(5300), suku_pakai), K(c(1300), suku_pakai)], 'Suku cadang yang dipasang menjadi beban pemeliharaan; persediaan berkurang.'),
    item(p, 14, 'Penyesuaian: bunga bank terutang', f'Bunga pinjaman bank untuk akhir Desember sebesar {r(bunga_ut)} sudah menjadi beban tetapi baru akan dibayar bulan Januari.', [D(c(5600), bunga_ut), K(c(2300), bunga_ut)], 'Beban bunga sudah terjadi di periode ini; dicatat bersama utang bunga.'),
]
pack('industri-transportasi', 'Ekspedisi: PT Lintas Nusa Ekspedisi', 'Jasa angkutan barang. Aset kendaraan, pinjaman bank, asuransi, penyusutan dengan nilai residu, bunga terutang. Abaikan pajak.', acs, items)

# ======================================================================
# VERIFIKASI: simulasi buku besar tiap paket
# ======================================================================
problems = []
total_items = 0
for pk in packs:
    accs = {a['code']: a for a in pk['accounts']}
    assert len(accs) == len(pk['accounts']), f"kode ganda di {pk['id']}"
    used = set()
    bal = defaultdict(int)  # debit - kredit
    ids = set()
    for it in pk['items']:
        total_items += 1
        assert it['id'] not in ids, it['id']
        ids.add(it['id'])
        d = sum(l['debit'] for l in it['lines'])
        k = sum(l['credit'] for l in it['lines'])
        if d != k or d == 0:
            problems.append(f"{it['id']} tidak seimbang {d}/{k}")
        for l in it['lines']:
            assert l['code'] in accs, (it['id'], l['code'])
            used.add(l['code'])
            bal[l['code']] += l['debit'] - l['credit']
        # saldo tidak boleh di sisi yang salah, kecuali akun khusus
        for code, b in bal.items():
            a = accs[code]
            if a['normal'] == 'Debit' and b < 0:
                problems.append(f"{it['id']} {code} {a['name']} saldo kredit {b}")
            if a['normal'] == 'Credit' and b > 0:
                problems.append(f"{it['id']} {code} {a['name']} saldo debit {b}")
    if sum(bal.values()) != 0:
        problems.append(f"{pk['id']} neraca saldo tidak seimbang")
    unused = [c for c in accs if c not in used]
    if unused:
        problems.append(f"{pk['id']} akun tidak terpakai: {unused}")
    # kas tidak negatif dilindungi oleh aturan saldo di atas
    # laporan singkat
    rev = -sum(b for cde, b in bal.items() if accs[cde]['type'] == 'Revenue')
    exp = sum(b for cde, b in bal.items() if accs[cde]['type'] == 'Expense')
    print(f"{pk['id']:24s} soal={len(pk['items']):2d} akun={len(accs):2d} pendapatan={rev:>14,} beban={exp:>14,} laba={rev - exp:>14,}")

if problems:
    print('MASALAH:')
    for x in problems:
        print(' -', x)
    sys.exit(1)

json.dump(packs, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('OK', total_items, 'soal ->', OUT)
