//! Kasus, Laporan, Pemeriksaan.
use crate::components::{id_kind, id_normal};
use crate::session::{Page, Session};
use dekri_core::checks::{reconcile_with_key, run_checks};
use dekri_core::data::data;
use dekri_core::money::format_rupiah;
use dekri_core::trace::{build_trace_index, TraceLine, TraceSource};
use dekri_core::types::Cell;
use dioxus::prelude::*;

fn fmt_num(c: &str) -> String {
    let ok = !c.is_empty()
        && c.chars().all(|x| x.is_ascii_digit() || x == '.')
        && c.matches('.').count() <= 1
        && !c.starts_with('.')
        && !c.ends_with('.');
    if !ok {
        return c.to_string();
    }
    let n: f64 = c.parse().unwrap_or(0.0);
    if n > 0.0 && n < 1.0 {
        return format!(
            "{}%",
            format!("{}", (n * 10000.0).round() / 100.0).replace('.', ",")
        );
    }
    if n.fract() == 0.0 {
        format_rupiah(n, false)
    } else {
        format!("{n}").replace('.', ",")
    }
}

enum R {
    Bullets(Vec<String>),
    Head(String),
    Cells(Vec<(bool, String)>),
    Blank,
}

fn build_rows(rows: &[Vec<Option<String>>], header: bool) -> Vec<R> {
    let strs: Vec<Vec<String>> = rows
        .iter()
        .map(|r| r.iter().map(|c| c.clone().unwrap_or_default()).collect())
        .collect();
    let bullet = |r: &Vec<String>| r.first().is_some_and(|c| c == "•");
    let (mut out, mut aging, mut i) = (vec![], false, 0);
    while i < strs.len() {
        let mut cells = strs[i].clone();
        if cells
            .first()
            .is_some_and(|c| c.to_uppercase().starts_with("TABEL AGING"))
        {
            aging = true;
        } else if aging
            && cells
                .first()
                .is_some_and(|c| !c.is_empty() && c.chars().count() > 60)
            && cells[1..].iter().all(|c| c.is_empty())
        {
            aging = false;
        }
        if aging {
            for c in cells.iter_mut().skip(1) {
                *c = fmt_num(c);
            }
        }
        if bullet(&cells) {
            let mut k = i;
            let mut g = vec![];
            while k < strs.len() && bullet(&strs[k]) {
                if let Some(t) = strs[k].iter().skip(1).find(|c| !c.is_empty()) {
                    g.push(t.clone());
                }
                k += 1;
            }
            out.push(R::Bullets(g));
            i = k;
            continue;
        }
        let ne: Vec<&String> = cells.iter().filter(|c| !c.is_empty()).collect();
        if ne.is_empty() {
            out.push(R::Blank);
            i += 1;
            continue;
        }
        let is_head = (header && i == 0)
            || (ne.len() == 1
                && !cells[0].is_empty()
                && cells[0] == cells[0].to_uppercase()
                && cells[0].chars().count() > 3);
        if is_head {
            out.push(R::Head(ne[0].clone()));
        } else {
            out.push(R::Cells(
                cells
                    .iter()
                    .enumerate()
                    .filter(|(j, c)| {
                        if aging {
                            true
                        } else {
                            !(c.is_empty() && *j > 0)
                        }
                    })
                    .map(|(j, c)| (j == 0, c.clone()))
                    .collect(),
            ));
        }
        i += 1;
    }
    out
}

#[component]
fn RowsTable(rows: Vec<Vec<Option<String>>>, #[props(default = false)] header: bool) -> Element {
    let built = build_rows(&rows, header);
    rsx! {
        table { tbody {
            for (i, r) in built.into_iter().enumerate() {
                match r {
                    R::Bullets(g) => rsx! { tr { key: "{i}", td { colspan: "4", ul { class: "list-disc space-y-1.5 pl-5", for (k, t) in g.iter().enumerate() { li { key: "{k}", "{t}" } } } } } },
                    R::Head(h) => rsx! { tr { key: "{i}", th { colspan: "4", "{h}" } } },
                    R::Blank => rsx! { tr { key: "{i}", td { colspan: "4", class: "!py-1" } } },
                    R::Cells(cs) => rsx! { tr { key: "{i}", for (j, (first, c)) in cs.into_iter().enumerate() { td { key: "{j}", class: if first { "w-1/4 font-medium" } else { "" }, "{c}" } } } },
                }
            }
        } }
    }
}

// ---------- tab Profil ----------
// Sumbernya (data/case.json, "background") berupa baris sel: pasangan label-isi, judul huruf kapital, tabel aging
// piutang, dan petunjuk berbutir ("•"). Baris itu dipecah menjadi blok bertipe supaya tiap jenis isi tampil sesuai
// sifatnya: tabel sebagai tabel, petunjuk sebagai daftar bernomor, informasi sebagai kartu. Tidak ada sel sumber
// yang boleh hilang (dijaga tes `profil_tidak_menghilangkan_sel_sumber`).

/// Judul tetap pada kartu identitas; menjadi tampilan bagi baris sumber "PROFIL PERUSAHAAN".
const JUDUL_PROFIL: &str = "Profil perusahaan (fiktif)";

/// Label yang sudah tampil pada kartu identitas, jadi tidak diulang sebagai kartu informasi.
const LABEL_IDENTITAS: [&str; 8] = [
    "Nama perusahaan",
    "Jenis usaha",
    "Alamat",
    "Bentuk entitas",
    "Periode akuntansi",
    "Mata uang penyajian",
    "Metode persediaan",
    "NPWP (fiktif)",
];

/// Satu butir daftar; `anak` berisi sub-butir bila kalimatnya berbentuk "Label: a; b".
#[derive(Clone, Debug, PartialEq)]
struct Butir {
    teks: String,
    anak: Vec<String>,
}

/// Tabel pada tab Profil (aging piutang). Angka sudah diformat untuk tampilan.
#[derive(Clone, Debug, PartialEq)]
struct TabelProfil {
    judul: String,
    kepala: Vec<String>,
    baris: Vec<Vec<String>>,
    total: Option<Vec<String>>,
    catatan: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
enum Blok {
    /// Label dan isinya: identitas, model bisnis, informasi pembiayaan, dan seterusnya.
    Isi(String, String),
    /// Judul dan butir-butirnya (petunjuk penggunaan).
    Daftar(String, Vec<String>),
    Tabel(TabelProfil),
}

fn terisi(r: &[String]) -> usize {
    r.iter().filter(|c| !c.is_empty()).count()
}

/// Judul bagian: satu sel di kolom pertama dengan huruf kapital (keterangan dalam kurung boleh huruf kecil).
fn judul_bagian(r: &[String]) -> bool {
    let c0 = r.first().map(String::as_str).unwrap_or("");
    let kepala = c0.split('(').next().unwrap_or("").trim();
    terisi(r) == 1 && c0 != "•" && kepala.chars().count() > 3 && kepala == kepala.to_uppercase()
}

/// Kumpulkan baris butir ("•") berurutan mulai dari `mulai`; mengembalikan teksnya dan indeks baris berikutnya.
fn kumpul_butir(sel: &[Vec<String>], mulai: usize) -> (Vec<String>, usize) {
    let mut butir = Vec::new();
    let mut i = mulai;
    while i < sel.len() && sel[i].first().is_some_and(|c| c == "•") {
        if let Some(t) = sel[i].iter().skip(1).find(|c| !c.is_empty()) {
            butir.push(t.clone());
        }
        i += 1;
    }
    (butir, i)
}

/// Baca tabel yang judul kolomnya ada di baris `mulai`: baris isi, baris TOTAL, lalu catatan di bawahnya.
fn baca_tabel(sel: &[Vec<String>], mulai: usize, judul: String) -> (TabelProfil, usize) {
    let lebar = sel[mulai]
        .iter()
        .rposition(|c| !c.is_empty())
        .map_or(0, |p| p + 1);
    let angka = |r: &[String]| -> Vec<String> {
        r.iter()
            .take(lebar)
            .enumerate()
            .map(|(j, c)| if j == 0 { c.clone() } else { fmt_num(c) })
            .collect()
    };
    let mut t = TabelProfil {
        judul,
        kepala: sel[mulai][..lebar].to_vec(),
        baris: Vec::new(),
        total: None,
        catatan: Vec::new(),
    };
    let mut i = mulai + 1;
    while i < sel.len() && terisi(&sel[i]) >= 2 {
        let sel_baris = angka(&sel[i]);
        if sel_baris[0].eq_ignore_ascii_case("TOTAL") {
            t.total = Some(sel_baris);
        } else {
            t.baris.push(sel_baris);
        }
        i += 1;
    }
    while i < sel.len() {
        let n = terisi(&sel[i]);
        if n == 0 {
            i += 1;
        } else if n == 1 && !judul_bagian(&sel[i]) && sel[i].first().is_none_or(|c| c != "•") {
            if let Some(c) = sel[i].iter().find(|c| !c.is_empty()) {
                t.catatan.push(c.clone());
            }
            i += 1;
        } else {
            break;
        }
    }
    (t, i)
}

/// Pecah baris sumber tab Profil menjadi blok, dalam urutan sumber.
fn profil_blok(rows: &[Vec<Option<String>>]) -> Vec<Blok> {
    let sel: Vec<Vec<String>> = rows
        .iter()
        .map(|r| {
            r.iter()
                .map(|c| c.as_deref().unwrap_or("").trim().to_string())
                .collect()
        })
        .collect();
    let mut out = Vec::new();
    let mut judul = String::new();
    let mut i = 0;
    while i < sel.len() {
        let r = &sel[i];
        let n = terisi(r);
        let c0 = r.first().map(String::as_str).unwrap_or("");
        if n == 0 {
            i += 1;
        } else if c0 == "•" {
            let (butir, akhir) = kumpul_butir(&sel, i);
            out.push(Blok::Daftar(std::mem::take(&mut judul), butir));
            i = akhir;
        } else if judul_bagian(r) {
            judul = c0.to_string();
            i += 1;
        } else if n >= 3 {
            let (tabel, akhir) = baca_tabel(&sel, i, std::mem::take(&mut judul));
            out.push(Blok::Tabel(tabel));
            i = akhir;
        } else {
            // label dan isi; sel tunggal tanpa label tampil sebagai paragraf lepas
            judul.clear();
            let isi: Vec<&str> = r
                .iter()
                .skip(1)
                .filter(|c| !c.is_empty())
                .map(String::as_str)
                .collect();
            if n >= 2 {
                out.push(Blok::Isi(c0.to_string(), isi.join(" ")));
            } else {
                let teks = r
                    .iter()
                    .find(|c| !c.is_empty())
                    .cloned()
                    .unwrap_or_default();
                out.push(Blok::Isi(String::new(), teks));
            }
            i += 1;
        }
    }
    out
}

fn awal_kapital(s: &str) -> String {
    let mut c = s.chars();
    c.next()
        .map(|f| f.to_uppercase().collect::<String>() + c.as_str())
        .unwrap_or_default()
}

/// Judul sumber huruf kapital menjadi huruf biasa ("PETUNJUK PENGGUNAAN" -> "Petunjuk penggunaan"); teks campuran
/// dibiarkan.
fn kalimat_biasa(s: &str) -> String {
    let t = s.trim();
    if t == t.to_uppercase() {
        awal_kapital(&t.to_lowercase())
    } else {
        awal_kapital(t)
    }
}

/// Tiap kata berawal huruf kapital ("31 DESEMBER 2024" -> "31 Desember 2024"); teks campuran dibiarkan.
fn kata_kapital(s: &str) -> String {
    let t = s.trim();
    if t != t.to_uppercase() {
        return t.to_string();
    }
    t.split(' ')
        .map(|w| awal_kapital(&w.to_lowercase()))
        .collect::<Vec<_>>()
        .join(" ")
}

/// Judul tabel dari sumber, mis. "TABEL AGING PIUTANG USAHA - 31 DESEMBER 2024 (dipakai pada AJ18)", menjadi judul,
/// keterangan, dan catatan kurung: ("Tabel aging piutang usaha", "31 Desember 2024", "Dipakai pada AJ18").
fn pisah_ket(judul: &str) -> (String, String, String) {
    let j = judul.trim();
    let (utama, kurung) = match j.rfind('(') {
        Some(p) if j.ends_with(')') => (j[..p].trim(), j[p + 1..j.len() - 1].trim()),
        _ => (j, ""),
    };
    let (nama, ket) = utama
        .split_once(" - ")
        .map_or((utama, ""), |(a, b)| (a.trim(), b.trim()));
    (kalimat_biasa(nama), kata_kapital(ket), awal_kapital(kurung))
}

/// Panah dari sumber ("->") ditampilkan sebagai panah sungguhan.
fn panah(s: &str) -> String {
    s.replace(" -> ", " → ")
}

/// Kata terakhir di akhir `awalan` yang disusul titik adalah singkatan ("p.a.", "s.d.", "No.", "Rp."), bukan akhir kalimat.
fn singkatan(awalan: &[char]) -> bool {
    let kata: Vec<char> = awalan
        .iter()
        .rev()
        .take_while(|c| c.is_alphabetic())
        .copied()
        .collect();
    let sebelum = awalan.len().checked_sub(kata.len() + 1).map(|k| awalan[k]);
    let kata: String = kata.into_iter().rev().collect();
    (kata.chars().count() == 1 && sebelum == Some('.')) || matches!(kata.as_str(), "No" | "Rp")
}

/// Pecah teks pada `;` yang berada di luar tanda kurung. Isi kurung seperti "(6% p.a.; berjangka 3 bulan)" utuh.
fn pisah_luar(s: &str) -> Vec<String> {
    let ch: Vec<char> = s.chars().collect();
    let (mut out, mut dalam, mut mulai) = (Vec::new(), 0i32, 0usize);
    for (i, c) in ch.iter().enumerate() {
        match c {
            '(' => dalam += 1,
            ')' => dalam = (dalam - 1).max(0),
            ';' if dalam == 0 => {
                out.push(ch[mulai..i].iter().collect::<String>());
                mulai = i + 1;
            }
            _ => {}
        }
    }
    out.push(ch[mulai..].iter().collect::<String>());
    out.into_iter()
        .map(|x| x.trim().to_string())
        .filter(|x| !x.is_empty())
        .collect()
}

/// Pecah teks menjadi kalimat: titik di luar kurung yang disusul spasi dan huruf kapital, bukan singkatan.
fn pisah_kalimat(s: &str) -> Vec<String> {
    let ch: Vec<char> = s.trim().chars().collect();
    let (mut out, mut dalam, mut mulai) = (Vec::new(), 0i32, 0usize);
    for i in 0..ch.len() {
        match ch[i] {
            '(' => dalam += 1,
            ')' => dalam = (dalam - 1).max(0),
            '.' if dalam == 0
                && ch.get(i + 1) == Some(&' ')
                && ch.get(i + 2).is_some_and(|c| c.is_uppercase())
                && !singkatan(&ch[..i]) =>
            {
                out.push(ch[mulai..=i].iter().collect::<String>());
                mulai = i + 2;
            }
            _ => {}
        }
    }
    out.push(ch[mulai..].iter().collect::<String>());
    out.into_iter().filter(|x| !x.trim().is_empty()).collect()
}

/// Indeks karakter ":" (disusul spasi) pertama di luar kurung.
fn titik_dua(s: &str) -> Option<usize> {
    let ch: Vec<char> = s.chars().collect();
    let mut dalam = 0i32;
    for (i, c) in ch.iter().enumerate() {
        match c {
            '(' => dalam += 1,
            ')' => dalam = (dalam - 1).max(0),
            ':' if dalam == 0 && ch.get(i + 1) == Some(&' ') => return Some(i),
            _ => {}
        }
    }
    None
}

/// Satu butir tanpa titik penutup (kecuali singkatan seperti "p.a.") dan berawal huruf kapital.
fn rapikan(s: &str) -> String {
    let t = s.trim();
    let t = match t.strip_suffix('.') {
        Some(h) if !singkatan(&h.chars().collect::<Vec<_>>()) => h.trim_end(),
        _ => t,
    };
    awal_kapital(t)
}

/// Satu kalimat menjadi satu butir. Kalimat berbentuk "Label: a; b" menjadi butir "Label:" dengan sub-butir a dan b.
fn butir_kalimat(k: &str) -> Butir {
    let bagian = pisah_luar(k);
    if bagian.len() >= 2 {
        if let Some(p) = titik_dua(&bagian[0]) {
            let ch: Vec<char> = bagian[0].chars().collect();
            let kepala: String = ch[..=p].iter().collect();
            let sisa: String = ch[p + 1..].iter().collect();
            let anak: Vec<String> = std::iter::once(rapikan(&sisa))
                .chain(bagian[1..].iter().map(|b| rapikan(b)))
                .filter(|a| !a.is_empty())
                .collect();
            return Butir {
                teks: awal_kapital(kepala.trim()),
                anak,
            };
        }
    }
    Butir {
        teks: rapikan(k),
        anak: Vec::new(),
    }
}

/// Butir daftar dari satu isi kartu, atau kosong bila lebih baik ditampilkan sebagai paragraf: satu kalimat berisi
/// tiga bagian atau lebih (dipisah ";") dipecah per bagian, tiga kalimat atau lebih dipecah per kalimat. Dua kalimat
/// atau kurang tetap paragraf. Tanda kurung tidak pernah dipotong.
fn butir_tampil(v: &str) -> Vec<Butir> {
    let kalimat = pisah_kalimat(v);
    match kalimat.len() {
        0 | 2 => Vec::new(),
        1 => {
            let bagian = pisah_luar(&kalimat[0]);
            if bagian.len() >= 3 && titik_dua(&bagian[0]).is_none() {
                bagian
                    .iter()
                    .map(|b| Butir {
                        teks: rapikan(b),
                        anak: Vec::new(),
                    })
                    .collect()
            } else {
                Vec::new()
            }
        }
        _ => kalimat.iter().map(|k| butir_kalimat(k)).collect(),
    }
}

/// Catatan di bawah tabel: selalu daftar, satu butir per kalimat.
fn butir_catatan(teks: &str) -> Vec<Butir> {
    pisah_kalimat(teks)
        .iter()
        .map(|k| butir_kalimat(k))
        .collect()
}

#[component]
fn ButirList(items: Vec<Butir>) -> Element {
    rsx! {
        ul { class: "list-disc space-y-1 pl-5 text-sm leading-relaxed",
            for (i, b) in items.into_iter().enumerate() {
                li { key: "{i}", "{b.teks}"
                    if !b.anak.is_empty() {
                        ul { class: "mt-1 list-disc space-y-1 pl-5",
                            for (j, a) in b.anak.iter().enumerate() { li { key: "{j}", "{a}" } }
                        }
                    }
                }
            }
        }
    }
}

/// Profil perusahaan: kartu identitas, petunjuk penggunaan, kartu informasi per topik, dan tabel aging piutang.
#[component]
fn Profil(rows: Vec<Vec<Option<String>>>) -> Element {
    let blok = profil_blok(&rows);
    let get = |k: &str| {
        blok.iter()
            .find_map(|b| match b {
                Blok::Isi(a, v) if a == k => Some(v.clone()),
                _ => None,
            })
            .unwrap_or_default()
    };
    let (nama, usaha, alamat) = (get("Nama perusahaan"), get("Jenis usaha"), get("Alamat"));
    let fakta = [
        "Bentuk entitas",
        "Periode akuntansi",
        "Mata uang penyajian",
        "Metode persediaan",
        "NPWP (fiktif)",
    ];
    let tampil: Vec<&Blok> = blok
        .iter()
        .filter(|b| !matches!(b, Blok::Isi(k, _) if LABEL_IDENTITAS.contains(&k.as_str())))
        .collect();
    // Petunjuk penggunaan dibaca lebih dulu daripada informasi kasus, jadi ditaruh tepat di bawah identitas.
    let (petunjuk, lain): (Vec<&Blok>, Vec<&Blok>) = tampil
        .into_iter()
        .partition(|b| matches!(b, Blok::Daftar(..)));
    let urut: Vec<&Blok> = petunjuk.into_iter().chain(lain).collect();
    rsx! {
        div { class: "space-y-4",
            div { class: "card !p-0 overflow-hidden",
                div { class: "flex flex-wrap items-center gap-4 bg-[var(--tag-lilac-bg)] px-6 py-5 border-b-2 border-slate-900",
                    div { class: "flex size-14 shrink-0 items-center justify-center rounded-md border-2 border-slate-900 bg-[var(--tag-lime-bg,#e4ff97)] text-2xl font-bold shadow-[3px_3px_0_var(--neo-shadow)]", "SC" }
                    div { class: "min-w-0 flex-1",
                        div { class: "text-xs font-semibold uppercase tracking-wide text-slate-600", "{JUDUL_PROFIL}" }
                        h2 { class: "text-2xl font-bold leading-tight", "{nama}" }
                        p { class: "mt-1 text-sm text-slate-700", "{usaha}" }
                    }
                }
                div { class: "grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-5",
                    for k in fakta.iter() {
                        div { key: "{k}", class: "bg-white px-4 py-3",
                            div { class: "text-[11px] font-semibold uppercase tracking-wide text-slate-500", "{k}" }
                            div { class: "mt-0.5 text-sm font-medium", "{get(k)}" }
                        }
                    }
                }
                div { class: "border-t border-slate-200 bg-white px-6 py-3 text-sm",
                    span { class: "mr-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500", "Alamat" }
                    "{alamat}"
                }
            }
            div { class: "grid gap-4 lg:grid-cols-2",
                for (i, b) in urut.into_iter().enumerate() {
                    match b {
                        Blok::Daftar(j, butir) => {
                            let judul = kalimat_biasa(j);
                            rsx! {
                                section { key: "{i}", class: "card lg:col-span-2",
                                    if !judul.is_empty() { h3 { class: "t-eyebrow mb-3", "{judul}" } }
                                    ol { class: "space-y-2.5",
                                        for (n, t) in butir.iter().enumerate() {
                                            li { key: "{n}", class: "flex items-start gap-3 text-sm leading-relaxed",
                                                span { "aria-hidden": "true", class: "flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-[var(--tag-lime-bg,#e4ff97)] text-xs font-bold", "{n + 1}" }
                                                span { class: "pt-0.5", "{panah(t)}" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Blok::Isi(k, v) => {
                            let butir = butir_tampil(v);
                            let panjang = v.chars().count() > 260;
                            rsx! {
                                section { key: "{i}", class: if panjang { "card lg:col-span-2" } else { "card" },
                                    if !k.is_empty() { h3 { class: "t-eyebrow mb-2", "{k}" } }
                                    if butir.is_empty() { p { class: "text-sm leading-relaxed", "{v}" } }
                                    else { ButirList { items: butir } }
                                }
                            }
                        }
                        Blok::Tabel(t) => {
                            let (nama_tabel, ket, pakai) = pisah_ket(&t.judul);
                            let catatan: Vec<Butir> = t.catatan.iter().flat_map(|c| butir_catatan(c)).collect();
                            rsx! {
                                section { key: "{i}", class: "card lg:col-span-2",
                                    div { class: "mb-3 flex flex-wrap items-center justify-between gap-2",
                                        h3 { class: "t-eyebrow", "{nama_tabel}" }
                                        div { class: "flex flex-wrap items-center gap-1.5",
                                            if !ket.is_empty() { span { class: "badge badge-neutral", "{ket}" } }
                                            if !pakai.is_empty() { span { class: "badge badge-info", "{pakai}" } }
                                        }
                                    }
                                    div { class: "card-data",
                                        table { class: "data-table",
                                            thead { tr {
                                                for (c, h) in t.kepala.iter().enumerate() { th { key: "{c}", class: if c == 0 { "" } else { "num" }, "{h}" } }
                                            } }
                                            tbody {
                                                for (r, baris) in t.baris.iter().enumerate() {
                                                    tr { key: "{r}",
                                                        for (c, x) in baris.iter().enumerate() { td { key: "{c}", class: if c == 0 { "font-medium" } else { "num" }, "{x}" } }
                                                    }
                                                }
                                            }
                                            tfoot {
                                                for tot in t.total.iter() {
                                                    tr { key: "total-{i}",
                                                        for (c, x) in tot.iter().enumerate() { td { key: "{c}", class: if c == 0 { "" } else { "num" }, "{x}" } }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    if !catatan.is_empty() {
                                        div { class: "mt-3",
                                            h4 { class: "t-eyebrow mb-1.5", "Catatan" }
                                            ButirList { items: catatan }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[component]
pub fn Kasus() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let d = data();
    let t = app.read().kasus_tab;
    let (od, oc) = (
        d.opening.iter().map(|o| o.debit).sum::<f64>(),
        d.opening.iter().map(|o| o.credit).sum::<f64>(),
    );
    let blank = |n: f64| {
        if n.round() == 0.0 {
            String::new()
        } else {
            format_rupiah(n, false)
        }
    };
    rsx! {
        div { class: "space-y-3",
            p { class: "text-sm text-slate-600", "{d.case.intro}" }
            div { class: "seg", role: "group", "aria-label": "Bagian informasi kasus",
                for (i, n) in ["Profil", "Kebijakan", "Bagan akun", "Saldo awal", "SAK"].iter().enumerate() {
                    button { key: "{i}", onclick: move |_| app.write().kasus_tab = i,
                        class: if t == i { "btn btn-primary" } else { "btn" }, "{n}" }
                }
            }
            div { class: if t == 0 { "" } else { "card overflow-x-auto" },
                match t {
                    0 => rsx! { Profil { rows: d.case.background.clone() } },
                    1 => rsx! { RowsTable { rows: d.case.policies.clone(), header: true } },
                    4 => rsx! { RowsTable { rows: d.case.sak.clone() } },
                    2 => rsx! { CoaTable {} },
                    _ => rsx! { table { thead { tr { th { "Kode" } th { "Nama akun" } th { class: "num", "Debit (Rp)" } th { class: "num", "Kredit (Rp)" } th { "Catatan" } } }
                        tbody { for o in d.opening.iter() { tr { key: "{o.code}", td { class: "whitespace-nowrap font-mono text-xs", "{o.code}" } td { "{dekri_core::content::any_account_name(&o.code).unwrap_or_default()}" }
                            td { class: "num", "{blank(o.debit)}" } td { class: "num", "{blank(o.credit)}" } td { class: "text-xs", "{o.note.clone().unwrap_or_default()}" } } } }
                        tfoot { tr { td { colspan: "2", "TOTAL" } td { class: "num", "{format_rupiah(od, false)}" } td { class: "num", "{format_rupiah(oc, false)}" }
                            td { if od == oc { span { class: "badge badge-success", "Seimbang" } } else { span { class: "badge badge-danger", "TIDAK seimbang" } } } } } } },
                }
            }
        }
    }
}

fn tidy(t: &str) -> String {
    let mut s = t.to_string();
    if let Some(p) = s.find(" - ") {
        let head = &s[..p];
        if head.chars().next().is_some_and(|c| c.is_ascii_digit())
            && head.chars().all(|c| c.is_ascii_alphanumeric())
        {
            s = s[p + 3..].to_string();
        }
    }
    while let Some(i) = s.find(" (lihat sheet ") {
        match s[i..].find(')') {
            Some(j) => s.replace_range(i..i + j + 1, ""),
            None => break,
        }
    }
    if let Some(i) = s.find("; perubahan pada PSAK 118 dijelaskan di sheet ") {
        let rest: String = s[i + 46..]
            .chars()
            .skip_while(|c| c.is_ascii_digit())
            .collect();
        s = format!("{}{}", &s[..i], rest);
    }
    s
}

#[component]
pub fn Laporan() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut tab = use_signal(|| {
        std::env::var("DEKRI_REPORT_TAB")
            .ok()
            .and_then(|v| v.parse::<usize>().ok())
            .unwrap_or(0)
    });
    let mut sel = use_signal(|| {
        // kait debug untuk screenshot: DEKRI_TRACE=<id sel>
        std::env::var("DEKRI_TRACE").ok().map(|id| {
            let idx = build_trace_index(&app.read().st);
            let lines = idx.by_cell.get(&id).cloned().unwrap_or_default();
            (id.clone(), id, lines)
        })
    });
    let codes = ["S12", "S12A", "S13", "S14", "S15", "S15A"];
    let names = [
        "Laba rugi",
        "PSAK 118",
        "Ekuitas",
        "Posisi keuangan",
        "Arus kas",
        "PSAK 207",
    ];
    let layout = dekri_core::statement_layout();
    let s = app.read();
    let has_data = !s.report.cells.is_empty()
        && (s.st.journal.values().any(|v| !v.is_empty()) || !s.st.adjusting.is_empty());
    let sheet = &layout[codes[(*tab.read()).min(5)]];
    let title = tidy(sheet["title"].as_str().unwrap_or(""));
    let subtitle = tidy(sheet["subtitle"].as_str().unwrap_or(""));
    struct Rw {
        label: String,
        bold: bool,
        cells: Vec<String>,
        neg: Vec<bool>,
        ok: Vec<Option<bool>>,
        ids: Vec<Option<String>>,
        ncols: usize,
        note: String,
    }
    let rows_json: Vec<&serde_json::Value> = sheet["rows"]
        .as_array()
        .map(|a| a.iter().collect())
        .unwrap_or_default();
    let mut cols: Vec<String> = rows_json
        .iter()
        .flat_map(|r| r["cells"].as_array().into_iter().flatten())
        .filter_map(|c| c["col"].as_str().map(String::from))
        .collect();
    cols.sort();
    cols.dedup();
    let rows: Vec<Rw> = rows_json
        .iter()
        .filter(|r| {
            r["label"]
                .as_str()
                .map(|l| l.chars().count() < 110)
                .unwrap_or(true)
                && r["r"].as_i64().unwrap_or(0) > 2
        })
        .map(|r| {
            let mut cells = vec![];
            let mut neg = vec![];
            let mut ok = vec![];
            let mut ids = vec![];
            for c in &cols {
                let cell = r["cells"]
                    .as_array()
                    .and_then(|a| a.iter().find(|x| x["col"].as_str() == Some(c)));
                let (mut txt, mut n, mut o) = (String::new(), false, None);
                let mut cid = None;
                if let Some(cell) = cell {
                    if let Some(t) = cell["text"].as_str() {
                        txt = t.to_string();
                    } else if let Some(id) = cell["id"].as_str() {
                        match s.report.cells.get(id) {
                            Some(Cell::Num(v)) => {
                                let fmt = cell["fmt"].as_str().unwrap_or("");
                                cid = Some(id.to_string());
                                txt = if fmt.contains('%') {
                                    format!("{:.1}%", v * 100.0)
                                } else {
                                    format_rupiah(*v, true)
                                };
                                n = *v < 0.0;
                            }
                            Some(Cell::Str(t)) => {
                                o = Some(
                                    t.starts_with("BENAR")
                                        || t.starts_with("SEIMBANG")
                                        || t.starts_with("SAMA"),
                                );
                                txt = t.clone();
                            }
                            None => {}
                        }
                    }
                }
                cells.push(txt);
                neg.push(n);
                ok.push(o);
                ids.push(cid);
            }
            Rw {
                label: tidy(r["label"].as_str().unwrap_or("")),
                bold: r["bold"].as_bool().unwrap_or(false),
                cells,
                neg,
                ok,
                ids,
                ncols: cols.len(),
                note: String::new(),
            }
        })
        .collect();
    // Kolom teks dengan satu catatan saja dilipat menjadi baris catatan di bawah label; kolom kosong dibuang.
    let has_id: Vec<bool> = (0..cols.len())
        .map(|j| rows.iter().any(|r| r.ids[j].is_some()))
        .collect();
    let n_txt: Vec<usize> = (0..cols.len())
        .map(|j| rows.iter().filter(|r| !r.cells[j].is_empty()).count())
        .collect();
    let keep: Vec<bool> = (0..cols.len())
        .map(|j| has_id[j] || n_txt[j] >= 2)
        .collect();
    let is_text: Vec<bool> = (0..cols.len())
        .filter(|j| keep[*j])
        .map(|j| !has_id[j])
        .collect();
    let nk = is_text.len();
    let n_text_cols = is_text.iter().filter(|t| **t).count();
    let rows: Vec<Rw> = rows
        .into_iter()
        .map(|r| {
            let note = (0..cols.len())
                .filter(|j| !keep[*j])
                .map(|j| r.cells[j].clone())
                .find(|c| !c.is_empty())
                .unwrap_or_default();
            let f = |i: usize| keep[i];
            Rw {
                cells: r
                    .cells
                    .into_iter()
                    .enumerate()
                    .filter(|(i, _)| f(*i))
                    .map(|(_, v)| v)
                    .collect(),
                neg: r
                    .neg
                    .into_iter()
                    .enumerate()
                    .filter(|(i, _)| f(*i))
                    .map(|(_, v)| v)
                    .collect(),
                ok: r
                    .ok
                    .into_iter()
                    .enumerate()
                    .filter(|(i, _)| f(*i))
                    .map(|(_, v)| v)
                    .collect(),
                ids: r
                    .ids
                    .into_iter()
                    .enumerate()
                    .filter(|(i, _)| f(*i))
                    .map(|(_, v)| v)
                    .collect(),
                ncols: nk,
                label: r.label,
                bold: r.bold,
                note,
            }
        })
        .collect();
    drop(s);
    let t = *tab.read();
    rsx! {
        div { class: "card",
            div { class: "no-print mb-3 flex flex-wrap items-center gap-1",
                div { class: "seg", role: "group", "aria-label": "Pilih laporan",
                    for (i, n) in names.iter().enumerate() { button { key: "{i}", class: if t == i { "btn btn-primary" } else { "btn" }, "aria-pressed": "{t == i}", onclick: move |_| tab.set(i), "{n}" } }
                }
                span { class: "ml-auto flex flex-wrap gap-1",
                    button { class: if t == 6 { "btn btn-primary" } else { "btn" }, "aria-pressed": "{t == 6}", title: "Ubah nominal satu jurnal dan lihat dampaknya", onclick: move |_| tab.set(if t == 6 { 0 } else { 6 }), "Bagaimana-jika" }
                    button { class: "btn", title: "Pemeriksaan konsistensi antar-laporan dan rekonsiliasi dengan kunci", onclick: move |_| app.write().page = Page::Pemeriksaan, "Pemeriksaan silang" }
                    button { class: "btn", onclick: move |_| { let _ = document::eval("window.print()"); }, "Cetak" }
                }
            }
            if t == 6 { WhatIf {} } else {
            div { class: "callout callout-warning mb-3",
                if has_data { "Laporan ini dihitung dari jurnal Anda saat ini; belum final sampai semua jurnal dan penyesuaian benar." } else { "Belum final: jurnal belum diisi, sehingga laporan baru mencerminkan saldo awal." } }
            h2 { class: "mb-1", "{title}" }
            if !subtitle.is_empty() { p { class: "mb-2 text-xs text-slate-500", "{subtitle}" } }
            {
                let ncols = nk;
                let min_w = format!("min-width:{}px", 280 + 160 * (ncols - n_text_cols) + 240 * n_text_cols);
                let wrap = if ncols <= 1 { "max-w-3xl" } else if ncols == 2 && n_text_cols == 0 { "max-w-4xl" } else { "" };
                rsx! {
            div { class: "overflow-x-auto {wrap}",
            table { class: "ap-fade w-full table-fixed", style: "{min_w}",
                colgroup { col {} for j in 0..ncols { col { key: "{j}", class: if is_text[j] { "w-60" } else { "w-40" } } } }
                tbody {
                for (i, r) in rows.iter().enumerate() {
                    {
                        let head = r.cells.iter().all(|c| c.is_empty());
                        let tr_cls = if head { "font-bold [&>td]:bg-[var(--tag-lilac-bg)] [&>td]:uppercase [&>td]:tracking-wide [&>td]:text-[13px]" } else if r.bold { "font-bold [&>td]:bg-[var(--tag-lilac-bg)] [&>td]:border-t-2 [&>td]:border-slate-900" } else { "" };
                        let lab_cls = if head || r.bold { "" } else { "pl-6" };
                        rsx! {
                    tr { key: "{i}", class: "{tr_cls}",
                        td { class: "{lab_cls}", colspan: if head { "{r.ncols + 1}" } else { "1" }, "{r.label}"
                            if !r.note.is_empty() { div { class: "mt-0.5 text-xs font-normal normal-case tracking-normal text-slate-500", "{r.note}" } } }
                        if !head {
                        for (j, c) in r.cells.iter().enumerate() {
                            td { key: "{j}", class: if r.neg[j] { "num text-red-700" } else if r.ok[j] == Some(true) { "num text-emerald-700" } else if r.ok[j] == Some(false) { "num text-red-700" } else if is_text[j] { "text-left text-xs font-normal text-slate-600" } else if c == "0" || c == "-" { "num text-slate-400" } else { "num" },
                                if let (Some(id), false) = (r.ids[j].clone(), c.is_empty()) {
                                    button { class: "num underline decoration-dotted underline-offset-2 hover:text-blue-700", title: "Klik untuk menelusuri asal angka",
                                        onclick: { let label = r.label.clone(); let val = c.clone(); move |_| {
                                            let idx = app.write().trace_index();
                                            let lines = idx.by_cell.get(&id).cloned().unwrap_or_default();
                                            sel.set(Some((format!("{label} = {val}"), id.clone(), lines)));
                                        } }, "{c}" }
                                } else { "{c}" }
                            }
                        }
                        }
                    }
                        }
                    }
                }
            } }
            }
                }
            }
            if let Some((title, _, lines)) = sel.read().clone() { TracePanel { title: title, lines: lines, on_close: move |_| sel.set(None) } }
            }
        }
    }
}

#[component]
fn TracePanel(title: String, lines: Vec<TraceLine>, on_close: EventHandler<()>) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut all = use_signal(|| false);
    let mut groups: Vec<((TraceSource, String), Vec<TraceLine>)> = vec![];
    for l in lines.iter() {
        let k = (l.source, l.key.clone());
        match groups.iter_mut().find(|g| g.0 == k) {
            Some(g) => g.1.push(l.clone()),
            None => groups.push((k, vec![l.clone()])),
        }
    }
    groups.sort_by(|a, b| {
        a.0 .0
            .cmp(&b.0 .0)
            .then_with(|| match (a.0 .1.parse::<u32>(), b.0 .1.parse::<u32>()) {
                (Ok(x), Ok(y)) => x.cmp(&y),
                _ => a.0 .1.cmp(&b.0 .1),
            })
    });
    let n = groups.len();
    let shown: Vec<_> = if *all.read() {
        groups.clone()
    } else {
        groups.iter().take(40).cloned().collect()
    };
    rsx! {
        div { class: "callout callout-info no-print mt-4", "aria-label": "Asal angka",
            div { class: "mb-1 flex items-start justify-between gap-2",
                b { "Asal angka: {title}" }
                button { class: "btn", onclick: move |_| on_close.call(()), "Tutup" }
            }
            if n == 0 { p { "Tidak ada baris jurnal Anda atau saldo awal yang membentuk angka ini (misalnya baris nol, subtotal tetap, atau jurnal belum diisi)." } }
            else {
                p { class: "mb-2 text-xs text-slate-600", "{n} sumber membentuk angka ini. Tanda ▲ berarti baris itu menaikkan angka, ▼ menurunkannya." }
                ul { class: "space-y-1",
                    for ((src, key), ls) in shown.iter().cloned() {
                        li { key: "{key}-{ls[0].code}-{ls[0].side}-{ls.len()}", class: "rounded-sm border border-blue-200 bg-white p-1.5",
                            div { class: "font-medium",
                                if src == TraceSource::Opening { "Saldo awal" }
                                else {
                                    button { class: "text-blue-700 underline", onclick: { let key = key.clone(); move |_| { let h = format!("{}/{}", if src == TraceSource::Txn { "transaksi" } else { "penyesuaian" }, key); app.write().open_href(&h); } },
                                        if src == TraceSource::Txn { "Transaksi {key}" } else { "Penyesuaian {key}" } }
                                }
                            }
                            for (i, l) in ls.iter().enumerate() {
                                div { key: "{i}", class: "flex justify-between gap-2 text-xs",
                                    {let nm = dekri_core::content::any_account_name(&l.code).unwrap_or_default(); let sd = if l.side == 'D' { "debit" } else { "kredit" }; rsx! { span { span { class: "font-mono", "{l.code}" } " {nm} ({sd})" } }}
                                    {let am = format_rupiah(l.amount, false); let ar = if l.effect > 0.0 { "▲" } else { "▼" }; rsx! { span { class: "tabular-nums", "{am} {ar}" } }}
                                }
                            }
                        }
                    }
                }
                if n > 40 { button { class: "btn mt-2", onclick: move |_| { let v = *all.read(); all.set(!v); }, if *all.read() { "Ringkas" } else { "Tampilkan semua ({n})" } } }
            }
        }
    }
}

#[component]
pub fn Pemeriksaan() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let s = app.read();
    let checks = run_checks(&s.report, &s.st.closing);
    let expected: Vec<(String, f64)> = data()
        .key
        .expected_statements
        .iter()
        .map(|e| (e.item.clone(), e.value))
        .collect();
    let rec = reconcile_with_key(&s.report, &expected);
    let has_entries = !s.st.journal.is_empty() || !s.st.adjusting.is_empty();
    drop(s);
    let ok = checks.iter().filter(|c| c.ok).count();
    let failing: Vec<(String, f64)> = checks
        .iter()
        .filter(|c| !c.ok)
        .map(|c| (c.label.to_string(), c.a - c.b))
        .chain(
            rec.iter()
                .filter(|r| !r.ok)
                .map(|r| (format!("Kunci: {}", r.item), r.user - r.key)),
        )
        .take(8)
        .collect();
    let n = |v: f64| {
        if v.round() == 0.0 {
            "-".to_string()
        } else {
            format_rupiah(v, true)
        }
    };
    rsx! {
        div { class: "space-y-4",
            div { class: "card",
                button { class: "btn mb-2", onclick: move |_| app.write().page = Page::Laporan, "← Kembali ke Laporan" }
                h2 { class: "mb-1", "Pemeriksaan konsistensi antar-laporan" }
                p { class: "mb-2 text-sm text-slate-600", "{ok} dari {checks.len()} pemeriksaan sesuai." }
                table { thead { tr { th { "" } th { "Pemeriksaan" } th { class: "num", "Nilai A" } th { class: "num", "Nilai B" } } }
                    tbody { for (i, c) in checks.iter().enumerate() { tr { key: "{i}", td { span { class: if c.ok { "inline-block size-2 rounded-full bg-emerald-600" } else { "inline-block size-2 rounded-full bg-red-600" } } } td { "{c.label}" } td { class: "num", "{n(c.a)}" } td { class: "num", "{n(c.b)}" } } } } }
            }
            if has_entries && !failing.is_empty() {
                div { class: "card",
                    h2 { class: "mb-1", "Kemungkinan penyebab selisih" }
                    p { class: "mb-2 text-xs text-slate-500", "Dugaan dari nominal jurnal Anda: jurnal tidak seimbang, baris sama dengan selisih, atau separuh selisih (sisi terbalik). Hanya petunjuk, bukan kepastian." }
                    for (label, diff) in failing.iter().cloned() { Suspects { key: "{label}", label: label, diff: diff } }
                }
            }
            div { class: "card",
                h2 { class: "mb-1", "Rekonsiliasi dengan kunci" }
                p { class: "mb-2 text-xs text-slate-500", "Angka laporan Anda dibandingkan dengan kunci (selisih ≤ Rp1 dianggap sama)." }
                table { thead { tr { th { "" } th { "Item" } th { class: "num", "Laporan Anda" } th { class: "num", "Kunci" } } }
                    tbody { for (i, r) in rec.iter().enumerate() { tr { key: "{i}", td { span { class: if r.ok { "inline-block size-2 rounded-full bg-emerald-600" } else { "inline-block size-2 rounded-full bg-red-600" } } } td { "{r.item}" } td { class: "num", "{n(r.user)}" } td { class: "num", "{n(r.key)}" } } } } }
            }
        }
    }
}

/// Bagan akun dengan pencarian (kode, nama, tipe, saldo normal, klasifikasi) dan filter tipe.
#[component]
fn CoaTable() -> Element {
    let d = dekri_core::data::data();
    let mut q = use_signal(String::new);
    let mut kind = use_signal(|| "Semua".to_string());
    let mut kinds: Vec<String> = vec![];
    for a in d.coa.iter() {
        if !kinds.contains(&a.kind) {
            kinds.push(a.kind.clone());
        }
    }
    let needle = q.read().trim().to_lowercase();
    let rows: Vec<_> = d
        .coa
        .iter()
        .filter(|a| *kind.read() == "Semua" || a.kind == *kind.read())
        .filter(|a| {
            needle.is_empty()
                || needle.split_whitespace().all(|w| {
                    format!(
                        "{} {} {} {} {}",
                        a.code, a.name, a.kind, a.normal, a.report_class
                    )
                    .to_lowercase()
                    .contains(w)
                })
        })
        .collect();
    let total = d.coa.len();
    rsx! {
        div { class: "mb-2 flex flex-wrap items-center gap-2",
            input { class: "min-w-[16rem] flex-1", "aria-label": "Cari akun", placeholder: "Cari kode, nama, tipe, saldo normal, atau klasifikasi", value: "{q}", oninput: move |e| q.set(e.value()) }
            div { class: "flex flex-wrap gap-1", role: "group", "aria-label": "Filter tipe akun",
                for k in std::iter::once("Semua".to_string()).chain(kinds.clone()) {
                    button { key: "{k}", class: if *kind.read() == k { "btn btn-primary text-xs" } else { "btn text-xs" }, "aria-pressed": "{*kind.read() == k}", onclick: { let k = k.clone(); move |_| kind.set(k.clone()) }, "{id_kind(&k)}" }
                }
            }
        }
        p { role: "status", class: "mb-1 text-xs text-slate-500", "{rows.len()} dari {total} akun" }
        table {
            thead { tr { th { "Kode" } th { "Nama akun" } th { "Tipe" } th { "Saldo normal" } th { "Klasifikasi laporan" } } }
            tbody {
                for a in rows.iter() { tr { key: "{a.code}", td { class: "whitespace-nowrap font-mono text-xs", "{a.code}" } td { "{a.name}" } td { "{id_kind(&a.kind)}" } td { "{id_normal(&a.normal)}" } td { "{a.report_class}" } } }
                if rows.is_empty() { tr { td { colspan: "5", class: "text-sm text-slate-500", "Tidak ada akun yang cocok dengan pencarian." } } }
            }
        }
    }
}

/// Simulasi "bagaimana jika": ubah nominal satu jurnal dan lihat dampaknya ke seluruh laporan.
#[component]
fn WhatIf() -> Element {
    let app = use_context::<Signal<Session>>();
    let mut pick = use_signal(String::new);
    let mut pct = use_signal(|| "10".to_string());
    let (txn, adj) = {
        let s = app.read();
        (
            dekri_core::impact::entry_keys(&s.st, TraceSource::Txn),
            dekri_core::impact::entry_keys(&s.st, TraceSource::Adj),
        )
    };
    if txn.is_empty() && adj.is_empty() {
        return rsx! {
            div { class: "ap-fade rounded-2xl border-2 border-dashed border-slate-900 bg-white p-5",
                div { class: "font-medium", "Belum ada jurnal untuk disimulasikan" }
                p { class: "text-sm text-slate-600", "Isi jurnal di Transaksi atau Penyesuaian dulu. Simulasi memakai jawaban Anda, bukan kunci." }
            }
        };
    }
    let cur = pick.read().clone();
    let (source, key) = match cur.split_once(':') {
        Some(("adj", k)) => (TraceSource::Adj, k.to_string()),
        Some((_, k)) => (TraceSource::Txn, k.to_string()),
        None => (TraceSource::Txn, String::new()),
    };
    let pct_v: f64 = pct.read().trim().replace(',', ".").parse().unwrap_or(0.0);
    let diffs = if key.is_empty() {
        vec![]
    } else {
        dekri_core::impact::whatif(&app.read().st, source, &key, 1.0 + pct_v / 100.0)
    };
    let n = |v: f64| format_rupiah(v, true);
    rsx! {
        div { class: "space-y-3 ap-fade",
            h2 { "Bagaimana jika…" }
            p { class: "text-sm text-slate-600", "Pilih satu jurnal Anda, ubah nominalnya (semua barisnya dikali sama, jadi tetap seimbang), lalu lihat angka laporan mana yang bergeser. Hanya simulasi: jawaban Anda tidak berubah." }
            div { class: "flex flex-wrap items-end gap-3",
                label { class: "text-sm", span { class: "mb-0.5 block text-xs text-slate-500", "Jurnal" }
                    select { "aria-label": "Pilih jurnal", onchange: move |e| pick.set(e.value()),
                        option { value: "", selected: cur.is_empty(), "— pilih —" }
                        for k in txn.iter() { option { key: "t{k}", value: "txn:{k}", selected: cur == format!("txn:{k}"), "Transaksi {k}" } }
                        for k in adj.iter() { option { key: "a{k}", value: "adj:{k}", selected: cur == format!("adj:{k}"), "Penyesuaian {k}" } }
                    } }
                label { class: "text-sm", span { class: "mb-0.5 block text-xs text-slate-500", "Perubahan nominal (%)" }
                    input { class: "w-28", inputmode: "decimal", "aria-label": "Perubahan persen", value: "{pct}", oninput: move |e| pct.set(e.value()) } }
                div { class: "flex gap-1", for v in ["-50", "-10", "10", "50", "100"] { button { key: "{v}", class: "btn text-xs", onclick: move |_| pct.set(v.to_string()), "{v}%" } } }
            }
            if key.is_empty() { p { class: "text-sm text-slate-500", "Pilih jurnal untuk memulai." } }
            else if diffs.is_empty() { p { class: "text-sm text-slate-600", "Tidak ada angka laporan yang berubah." } }
            else {
                p { role: "status", class: "text-xs text-slate-500", "{diffs.len()} angka laporan berubah (menampilkan 40 terbesar)." }
                table { thead { tr { th { "Laporan" } th { "Pos" } th { class: "num", "Sekarang" } th { class: "num", "Setelah" } th { class: "num", "Selisih" } } }
                    tbody { for d in diffs.iter().take(40) {
                        tr { key: "{d.id}", td { class: "text-xs text-slate-500", "{d.sheet}" } td { "{d.label}" } td { class: "num", "{n(d.before)}" } td { class: "num", "{n(d.after)}" }
                            td { class: if d.after >= d.before { "num text-emerald-700" } else { "num text-red-700" }, "{n(d.after - d.before)}" } } } } }
            }
        }
    }
}

#[component]
fn Suspects(label: String, diff: f64) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let list = dekri_core::impact::suspects(&app.read().st, diff);
    let amount = format_rupiah(diff.abs(), true);
    rsx! {
        div { class: "mb-3 text-sm",
            div { class: "font-medium", "{label} " span { class: "text-xs text-slate-500", "(selisih {amount})" } }
            if list.is_empty() { p { class: "text-xs text-slate-600", "Tidak ada baris yang nominalnya cocok. Periksa jurnal berstatus PERIKSA di Transaksi/Penyesuaian, atau jurnal yang belum diisi." } }
            ul { class: "mt-1 space-y-0.5 text-xs",
                for (i, sp) in list.iter().take(6).enumerate() {
                    {let href = format!("{}/{}", if sp.source == dekri_core::trace::TraceSource::Txn { "transaksi" } else { "penyesuaian" }, sp.key);
                     let name = if sp.source == dekri_core::trace::TraceSource::Txn { format!("Transaksi {}", sp.key) } else { format!("Penyesuaian {}", sp.key) };
                     let acc = if sp.code.is_empty() { String::new() } else { format!(" · {}", sp.code) };
                     rsx! { li { key: "{i}", button { class: "text-blue-700 underline", onclick: move |_| app.write().open_href(&href), "{name}" } "{acc}: {sp.why}" } }}
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sumber() -> Vec<Vec<Option<String>>> {
        data().case.background.clone()
    }
    fn teks(a: &[&str]) -> Vec<String> {
        a.iter().map(|x| x.to_string()).collect()
    }
    /// Hanya huruf dan angka, huruf kecil: pembanding yang tidak terganggu tanda baca, titik ribuan, atau huruf besar.
    fn norm(s: &str) -> String {
        s.chars()
            .filter(|c| c.is_alphanumeric())
            .flat_map(char::to_lowercase)
            .collect()
    }
    fn isi(label: &str) -> String {
        profil_blok(&sumber())
            .into_iter()
            .find_map(|b| match b {
                Blok::Isi(k, v) if k == label => Some(v),
                _ => None,
            })
            .unwrap_or_else(|| panic!("tidak ada isi berlabel {label}"))
    }
    fn tabel() -> TabelProfil {
        profil_blok(&sumber())
            .into_iter()
            .find_map(|b| match b {
                Blok::Tabel(t) => Some(t),
                _ => None,
            })
            .expect("tabel aging")
    }
    fn gabung(b: &[Butir]) -> String {
        b.iter()
            .map(|x| format!("{}{}", x.teks, x.anak.concat()))
            .collect()
    }

    #[test]
    fn urutan_dan_jenis_blok_sesuai_sumber() {
        let blok = profil_blok(&sumber());
        let isi_n = blok.iter().filter(|b| matches!(b, Blok::Isi(..))).count();
        assert_eq!(isi_n, 17, "label-isi: identitas dan informasi kasus");
        assert_eq!(blok.len(), 19, "17 label-isi + 1 tabel + 1 daftar");
        assert!(matches!(&blok[0], Blok::Isi(k, _) if k == "Nama perusahaan"));
        assert!(matches!(&blok[17], Blok::Tabel(_)));
        assert!(matches!(&blok[18], Blok::Daftar(..)));
        // baris tabel dan butir tidak bocor menjadi kartu label-isi
        for b in &blok {
            if let Blok::Isi(k, _) = b {
                for salah in [
                    "Kelompok Umur",
                    "Belum jatuh tempo",
                    "TOTAL",
                    "•",
                    ">60 hari",
                ] {
                    assert_ne!(k, salah);
                }
            }
        }
    }

    #[test]
    fn petunjuk_menjadi_daftar_tanpa_butir_kosong() {
        let blok = profil_blok(&sumber());
        let Some(Blok::Daftar(judul, butir)) = blok.last() else {
            panic!("blok terakhir harus petunjuk");
        };
        assert_eq!(judul, "PETUNJUK PENGGUNAAN");
        assert_eq!(kalimat_biasa(judul), "Petunjuk penggunaan");
        assert_eq!(butir.len(), 4);
        assert!(butir[0].starts_with("Kerjakan berurutan"));
        assert!(butir.iter().all(|t| t != "•" && t.chars().count() > 20));
        assert_eq!(
            panah(&butir[0]),
            "Kerjakan berurutan: Transaksi (analisis dan jurnal umum) → Penyesuaian → Laporan → Penutup."
        );
    }

    #[test]
    fn tabel_aging_menjadi_tabel_dengan_angka_terformat() {
        let t = tabel();
        assert_eq!(
            t.kepala,
            teks(&[
                "Kelompok Umur",
                "Saldo (Rp)",
                "% Cadangan",
                "Cadangan Dibutuhkan (Rp)"
            ])
        );
        assert_eq!(t.baris.len(), 4);
        assert_eq!(
            t.baris[0],
            teks(&["Belum jatuh tempo", "240.000.000", "1%", "2.400.000"])
        );
        assert_eq!(t.baris[1], teks(&["1-30 hari", "0", "3%", "0"]));
        assert_eq!(t.baris[2], teks(&["31-60 hari", "0", "10%", "0"]));
        assert_eq!(
            t.baris[3],
            teks(&[">60 hari", "85.000.000", "30%", "25.500.000"])
        );
        assert_eq!(
            t.total,
            Some(teks(&["TOTAL", "325.000.000", "", "27.900.000"]))
        );
        assert_eq!(
            pisah_ket(&t.judul),
            (
                "Tabel aging piutang usaha".to_string(),
                "31 Desember 2024".to_string(),
                "Dipakai pada AJ18".to_string()
            )
        );
        assert_eq!(t.catatan.len(), 1, "catatan di bawah tabel tidak hilang");
        assert!(t.catatan[0].starts_with("Total piutang usaha per tabel ini"));
    }

    #[test]
    fn daftar_dari_satu_kalimat_tidak_memotong_kurung() {
        let pemasok = butir_tampil(&isi("Pemasok utama"));
        assert_eq!(pemasok.len(), 3);
        assert_eq!(
            pemasok[2].teks,
            "Global Electronics Supplier Pte Ltd (valas, n/60)"
        );

        let pembiayaan = butir_tampil(&isi("Informasi pembiayaan"));
        assert_eq!(pembiayaan.len(), 3);
        assert!(
            pembiayaan[1].teks.ends_with("setiap 30 Desember)"),
            "{:?}",
            pembiayaan[1]
        );
        assert_eq!(
            pembiayaan[2].teks,
            "Obligasi korporasi diterbitkan Juli 2024"
        );

        // titik koma di dalam kurung ("6% p.a.; berjangka ...") tidak boleh memecah butir
        let investasi = butir_tampil(&isi("Informasi investasi"));
        assert_eq!(investasi.len(), 3);
        assert!(
            investasi[0].teks.contains("(6% p.a.; berjangka 3 bulan"),
            "{:?}",
            investasi[0]
        );
        assert!(investasi[0].teks.ends_with("setara kas)"));
        assert_eq!(investasi[2].teks, "Saham perdagangan jangka pendek (FVTPL)");
        assert_eq!(butir_tampil(&isi("Pelanggan utama")).len(), 5);
    }

    #[test]
    fn beberapa_kalimat_menjadi_butir_per_kalimat_dan_dua_kalimat_tetap_paragraf() {
        assert_eq!(butir_tampil(&isi("Informasi tenaga kerja")).len(), 3);
        let pajak = butir_tampil(&isi("Informasi pajak"));
        assert_eq!(pajak.len(), 5);
        assert_eq!(pajak[0].teks, "Tarif pajak penghasilan badan 22%");
        assert_eq!(pajak[3].teks, "Tidak ada beda tetap");
        // satu kalimat pendek dan dua kalimat tetap paragraf
        for label in ["Model bisnis", "Informasi sewa", "Saldo awal akun deferral"] {
            assert!(butir_tampil(&isi(label)).is_empty(), "{label}");
        }
    }

    #[test]
    fn kurung_pada_semua_butir_seimbang() {
        let seimbang = |t: &str| t.matches('(').count() == t.matches(')').count();
        for b in profil_blok(&sumber()) {
            let semua: Vec<Butir> = match b {
                Blok::Isi(_, v) => butir_tampil(&v),
                Blok::Tabel(t) => t.catatan.iter().flat_map(|c| butir_catatan(c)).collect(),
                Blok::Daftar(..) => Vec::new(),
            };
            for x in semua {
                assert!(seimbang(&x.teks), "{:?}", x.teks);
                assert!(x.anak.iter().all(|a| seimbang(a)), "{:?}", x.anak);
            }
        }
    }

    #[test]
    fn catatan_tabel_memberi_sub_butir_pada_rincian() {
        let catatan = butir_catatan(&tabel().catatan[0]);
        assert_eq!(catatan.len(), 4);
        assert_eq!(
            catatan[1].teks,
            "Total cadangan yang dibutuhkan menurut tabel ini: Rp27.900.000"
        );
        assert_eq!(catatan[2].teks, "Rincian faktur terbuka:");
        assert_eq!(catatan[2].anak.len(), 2);
        assert!(catatan[2].anak[0].starts_with("Rp240.000.000 = faktur No.133 (jatuh tempo"));
        assert!(catatan[2].anak[1].ends_with("(lebih dari 60 hari)"));
        assert_eq!(catatan[3].teks, "Kelompok umur lain tidak memiliki saldo");
    }

    #[test]
    fn singkatan_tidak_dikira_akhir_kalimat() {
        assert_eq!(
            pisah_kalimat("Bunga 8% p.a. Dibayar tiap tahun. Selesai."),
            teks(&["Bunga 8% p.a. Dibayar tiap tahun.", "Selesai."])
        );
        assert_eq!(
            pisah_kalimat("Faktur No.133 jatuh tempo. Lunas Januari."),
            teks(&["Faktur No.133 jatuh tempo.", "Lunas Januari."])
        );
        assert_eq!(rapikan("kredit bunga 8% p.a."), "Kredit bunga 8% p.a.");
        assert_eq!(
            rapikan("obligasi diterbitkan Juli 2024."),
            "Obligasi diterbitkan Juli 2024"
        );
        assert_eq!(pisah_luar("a (b; c); d"), teks(&["a (b; c)", "d"]));
        assert_eq!(pisah_luar("tanpa pemisah"), teks(&["tanpa pemisah"]));
    }

    /// Kegagalan lama: baris tabel dan butir menjadi kartu berjudul "•" atau "Belum jatuh tempo", dan catatan di bawah
    /// tabel hilang. Setiap sel sumber harus tetap tampil, dalam bentuk apa pun.
    #[test]
    fn profil_tidak_menghilangkan_sel_sumber() {
        let rows = sumber();
        let mut tampil = String::from(JUDUL_PROFIL); // "PROFIL PERUSAHAAN" tampil sebagai judul kartu identitas
        for b in profil_blok(&rows) {
            match b {
                Blok::Isi(k, v) => {
                    let butir = butir_tampil(&v);
                    tampil += &k;
                    tampil += &if butir.is_empty() { v } else { gabung(&butir) };
                }
                Blok::Daftar(j, butir) => {
                    tampil += &kalimat_biasa(&j);
                    tampil += &butir.iter().map(|t| panah(t)).collect::<String>();
                }
                Blok::Tabel(t) => {
                    let (nama, ket, pakai) = pisah_ket(&t.judul);
                    tampil += &format!("{nama}{ket}{pakai}");
                    tampil += &t.kepala.concat();
                    tampil += &t.baris.iter().map(|r| r.concat()).collect::<String>();
                    tampil += &t.total.iter().map(|r| r.concat()).collect::<String>();
                    let catatan: Vec<Butir> =
                        t.catatan.iter().flat_map(|c| butir_catatan(c)).collect();
                    tampil += &gabung(&catatan);
                }
            }
        }
        let tampil = norm(&tampil);
        let mut diperiksa = 0;
        for r in &rows {
            for sel in r
                .iter()
                .flatten()
                .map(|c| c.trim())
                .filter(|c| !c.is_empty())
            {
                // angka tabel tampil terformat (240000000 -> 240.000.000, 0.01 -> 1%)
                let ada = tampil.contains(&norm(sel)) || tampil.contains(&norm(&fmt_num(sel)));
                assert!(ada, "sel sumber tidak tampil: {sel:?}");
                diperiksa += 1;
            }
        }
        assert!(
            diperiksa >= 50,
            "terlalu sedikit sel diperiksa: {diperiksa}"
        );
    }
}
