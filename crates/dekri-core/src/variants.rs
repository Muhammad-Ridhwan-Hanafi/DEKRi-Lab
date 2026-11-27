//! Soal varian berbenih. Port dari src/engine/variants.ts: benih yang sama menghasilkan soal yang sama
//! (generator acak mulberry32 identik), diuji terhadap vektor dari versi TypeScript.
use crate::excel::xround;
use crate::grade::NetMap;
use crate::money::format_rupiah;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PatternInfo {
    pub pattern: &'static str,
    pub title: &'static str,
    pub tax: bool,
}

pub const PATTERNS: [PatternInfo; 9] = [
    PatternInfo {
        pattern: "beli-kredit",
        title: "Pembelian barang dagang secara kredit (syarat diskon)",
        tax: false,
    },
    PatternInfo {
        pattern: "bayar-utang-diskon",
        title: "Pelunasan utang dalam periode diskon",
        tax: false,
    },
    PatternInfo {
        pattern: "jual-kredit",
        title: "Penjualan kredit dengan HPP",
        tax: false,
    },
    PatternInfo {
        pattern: "jual-tunai",
        title: "Penjualan tunai dengan HPP",
        tax: false,
    },
    PatternInfo {
        pattern: "terima-piutang-diskon",
        title: "Penerimaan piutang dengan potongan penjualan",
        tax: false,
    },
    PatternInfo {
        pattern: "penyusutan",
        title: "Penyusutan garis lurus",
        tax: false,
    },
    PatternInfo {
        pattern: "ppn-beli",
        title: "Pembelian kredit dengan PPN masukan",
        tax: true,
    },
    PatternInfo {
        pattern: "ppn-jual",
        title: "Penjualan kredit dengan PPN keluaran",
        tax: true,
    },
    PatternInfo {
        pattern: "pph23-jasa",
        title: "Beban jasa dengan pemotongan PPh 23",
        tax: true,
    },
];

#[derive(Clone, Debug, PartialEq)]
pub struct KeyLine {
    pub code: String,
    pub name: String,
    pub debit: f64,
    pub credit: f64,
}

#[derive(Clone, Debug)]
pub struct Variant {
    pub id: String,
    pub pattern: &'static str,
    pub tax: bool,
    pub title: &'static str,
    pub narrative: String,
    pub lines: Vec<KeyLine>,
    pub net: NetMap,
    pub explain: String,
}

/// mulberry32 seperti di JS (aritmatika 32-bit berputar).
pub fn mulberry32(seed: i64) -> impl FnMut() -> f64 {
    let mut s = seed as u32;
    move || {
        s = s.wrapping_add(0x6d2b79f5);
        let mut t = (s ^ (s >> 15)).wrapping_mul(1 | s);
        t = t.wrapping_add((t ^ (t >> 7)).wrapping_mul(61 | t)) ^ t;
        ((t ^ (t >> 14)) as f64) / 4294967296.0
    }
}

fn name_of(code: &str) -> String {
    match code {
        "1-1100" => "Bank Arunika",
        "1-1400" => "Persediaan Barang Dagang",
        "1-1800" => "Pajak Dibayar di Muka (PPh 25)",
        "2-1000" => "Utang Usaha",
        "2-1500" => "Utang Pajak Penghasilan",
        "2-1550" => "Utang PPN (PPN Keluaran)",
        "1-1850" => "PPN Masukan",
        "4-1000" => "Penjualan",
        "4-1200" => "Potongan Penjualan",
        "5-1000" => "Harga Pokok Penjualan",
        "6-1400" => "Beban Penyusutan Bangunan",
        "1-2210" => "Akumulasi Penyusutan Bangunan",
        "6-2100" => "Beban Pemeliharaan & Perbaikan",
        "2-1560" => "Utang PPh 23",
        "1-1200" => "Piutang Usaha",
        other => other,
    }
    .to_string()
}

fn rp(n: f64) -> String {
    format!("Rp{}", format_rupiah(n, false))
}
fn pick<'a, T>(r: &mut impl FnMut() -> f64, xs: &'a [T]) -> &'a T {
    &xs[(r() * xs.len() as f64).floor() as usize]
}
fn amt(r: &mut impl FnMut() -> f64, lo: f64, hi: f64, step: f64) -> f64 {
    lo + (r() * ((hi - lo) / step + 1.0)).floor() * step
}

const SUPPLIERS: [&str; 4] = [
    "PT Komponen Nusantara",
    "CV Kabel Sentosa",
    "PT Elektro Prima Utama",
    "UD Sumber Daya Listrik",
];
const CUSTOMERS: [&str; 4] = [
    "PT Bangun Cipta Elektrik",
    "Toko Elektronik Makmur Jaya",
    "PT Retail Elektronik Sentosa",
    "Toko Ritel Lestari",
];
const BANK: &str = "Bank Arunika";

fn mk(
    info: &PatternInfo,
    seed: i64,
    narrative: String,
    raw: &[(&str, f64, f64)],
    explain: String,
) -> Variant {
    let lines: Vec<KeyLine> = raw
        .iter()
        .filter(|(_, d, c)| *d != 0.0 || *c != 0.0)
        .map(|(code, d, c)| KeyLine {
            code: code.to_string(),
            name: name_of(code),
            debit: *d,
            credit: *c,
        })
        .collect();
    let mut net = NetMap::new();
    for l in &lines {
        *net.entry(l.code.clone()).or_insert(0.0) += l.debit - l.credit;
    }
    Variant {
        id: format!("{}:{}", info.pattern, seed),
        pattern: info.pattern,
        tax: info.tax,
        title: info.title,
        narrative,
        lines,
        net,
        explain,
    }
}

pub fn generate(pattern: &str, seed: i64) -> Option<Variant> {
    let idx = PATTERNS.iter().position(|p| p.pattern == pattern)?;
    let info = PATTERNS[idx];
    let mut r = mulberry32(seed * 7919 + idx as i64 * 104729 + 13);
    let disc = *pick(&mut r, &[1.0, 2.0, 3.0]);
    let x0 = |v: f64| xround(v, 0.0);
    Some(match pattern {
        "beli-kredit" => {
            let v = amt(&mut r, 40e6, 400e6, 1e6);
            let sup = pick(&mut r, &SUPPLIERS);
            mk(&info, seed, format!("Perusahaan membeli barang dagang dari {sup} secara kredit. Harga faktur {}, syarat {disc}/10, n/30. Perusahaan memakai metode perpetual dan mencatat pembelian sebesar harga faktur (gross).", rp(v)), &[("1-1400", v, 0.0), ("2-1000", 0.0, v)], "Perpetual gross: Persediaan bertambah sebesar faktur dan utang diakui sebesar faktur. Diskon baru dicatat saat pelunasan.".into())
        }
        "bayar-utang-diskon" => {
            let v = amt(&mut r, 40e6, 400e6, 1e6);
            let d = x0(v * disc / 100.0);
            let sup = pick(&mut r, &SUPPLIERS);
            mk(&info, seed, format!("Perusahaan melunasi utang usaha faktur {} kepada {sup} via {BANK}. Syarat {disc}/10, n/30, dan pembayaran dilakukan dalam periode diskon. Metode perpetual, pembelian dicatat gross.", rp(v)), &[("2-1000", v, 0.0), ("1-1100", 0.0, v - d), ("1-1400", 0.0, d)], format!("Diskon {disc}% x {} = {} mengurangi Persediaan; kas keluar {}.", rp(v), rp(d), rp(v - d)))
        }
        "jual-kredit" => {
            let v = amt(&mut r, 50e6, 500e6, 1e6);
            let cost = x0(v * amt(&mut r, 55.0, 75.0, 5.0) / 100.0);
            let cus = pick(&mut r, &CUSTOMERS);
            mk(&info, seed, format!("Perusahaan menjual barang secara kredit kepada {cus} dengan harga faktur {}, syarat {disc}/10, n/30. Menurut kartu persediaan, harga pokok barang yang dijual {}. Metode perpetual.", rp(v), rp(cost)), &[("1-1200", v, 0.0), ("4-1000", 0.0, v), ("5-1000", cost, 0.0), ("1-1400", 0.0, cost)], "Dua pasang jurnal: pendapatan dan piutang sebesar faktur, serta HPP dan persediaan sebesar biaya.".into())
        }
        "jual-tunai" => {
            let v = amt(&mut r, 30e6, 300e6, 1e6);
            let cost = x0(v * amt(&mut r, 55.0, 75.0, 5.0) / 100.0);
            let cus = pick(&mut r, &CUSTOMERS);
            mk(&info, seed, format!("Perusahaan menjual barang secara tunai {} (diterima di {BANK}) kepada {cus}. Biaya persediaan yang dijual {}. Metode perpetual.", rp(v), rp(cost)), &[("1-1100", v, 0.0), ("4-1000", 0.0, v), ("5-1000", cost, 0.0), ("1-1400", 0.0, cost)], "Pengakuan pendapatan tunai dan pengakuan HPP (perpetual).".into())
        }
        "terima-piutang-diskon" => {
            let v = amt(&mut r, 50e6, 500e6, 1e6);
            let d = x0(v * disc / 100.0);
            let cus = pick(&mut r, &CUSTOMERS);
            mk(&info, seed, format!("{cus} melunasi piutang faktur {} via {BANK} dalam periode diskon {disc}/10, n/30. Perusahaan mencatat potongan penjualan sebagai kontra pendapatan.", rp(v)), &[("1-1100", v - d, 0.0), ("4-1200", d, 0.0), ("1-1200", 0.0, v)], format!("Potongan {disc}% x {} = {} dicatat di Potongan Penjualan; kas diterima {}.", rp(v), rp(d), rp(v - d)))
        }
        "penyusutan" => {
            let cost = amt(&mut r, 300e6, 2000e6, 50e6);
            let life = *pick(&mut r, &[5.0, 8.0, 10.0, 20.0, 25.0]);
            let resid = x0(cost * *pick(&mut r, &[0.0, 5.0, 10.0]) / 100.0);
            let dep = x0((cost - resid) / life);
            mk(&info, seed, format!("Bangunan diperoleh dengan harga {}, nilai residu {}, umur manfaat {life} tahun, metode garis lurus. Hitung dan jurnal penyusutan untuk satu tahun penuh (31 Desember).", rp(cost), rp(resid)), &[("6-1400", dep, 0.0), ("1-2210", 0.0, dep)], format!("({} − {}) / {life} = {} per tahun.", rp(cost), rp(resid), rp(dep)))
        }
        "ppn-beli" => {
            let dpp = amt(&mut r, 20e6, 300e6, 1e6);
            let ppn = x0(dpp * 0.11);
            let sup = pick(&mut r, &SUPPLIERS);
            mk(&info, seed, format!("Perusahaan membeli barang dagang secara kredit dari {sup} (PKP) dengan dasar pengenaan pajak {}. PPN 11% dapat dikreditkan dan faktur pajak sah. Perpetual.", rp(dpp)), &[("1-1400", dpp, 0.0), ("1-1850", ppn, 0.0), ("2-1000", 0.0, dpp + ppn)], format!("PPN masukan = 11% x {} = {} dicatat sebagai aset (dapat dikreditkan); utang usaha sebesar total faktur {}.", rp(dpp), rp(ppn), rp(dpp + ppn)))
        }
        "ppn-jual" => {
            let dpp = amt(&mut r, 30e6, 400e6, 1e6);
            let ppn = x0(dpp * 0.11);
            let cost = x0(dpp * 65.0 / 100.0);
            let cus = pick(&mut r, &CUSTOMERS);
            mk(&info, seed, format!("Perusahaan menjual barang secara kredit kepada {cus} dengan dasar pengenaan pajak {}. PPN keluaran 11% ditagihkan pada faktur. HPP {}. Perpetual.", rp(dpp), rp(cost)), &[("1-1200", dpp + ppn, 0.0), ("4-1000", 0.0, dpp), ("2-1550", 0.0, ppn), ("5-1000", cost, 0.0), ("1-1400", 0.0, cost)], format!("PPN keluaran = 11% x {} = {} adalah utang kepada negara, bukan pendapatan. Piutang sebesar total faktur {}.", rp(dpp), rp(ppn), rp(dpp + ppn)))
        }
        "pph23-jasa" => {
            let fee = amt(&mut r, 10e6, 120e6, 1e6);
            let w = x0(fee * 0.02);
            mk(&info, seed, format!("Perusahaan memakai jasa kontraktor untuk perbaikan peralatan senilai {} (tanpa PPN) dan membayarnya via {BANK}. Atas jasa ini perusahaan wajib memotong PPh 23 sebesar 2%, yang belum disetor ke kas negara.", rp(fee)), &[("6-2100", fee, 0.0), ("1-1100", 0.0, fee - w), ("2-1560", 0.0, w)], format!("PPh 23 = 2% x {} = {} ditahan sebagai utang pajak; kas keluar {}.", rp(fee), rp(w), rp(fee - w)))
        }
        _ => return None,
    })
}

/// "pola:benih" -> (pola, benih)
pub fn parse_id(id: &str) -> Option<(&'static str, i64)> {
    let (p, s) = id.split_once(':')?;
    let seed: i64 = s.parse().ok()?;
    let pat = PATTERNS.iter().find(|x| x.pattern == p)?;
    Some((pat.pattern, seed))
}
