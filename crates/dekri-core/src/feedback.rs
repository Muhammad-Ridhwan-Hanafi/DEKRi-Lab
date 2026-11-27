//! Diagnosis kesalahan jurnal yang spesifik terhadap jenis kesalahannya (port src/validation/feedback.ts).
//! Hanya memakai data yang sudah ada (bagan akun, kunci neto, angka pada soal); tidak menyebut nominal jawaban yang benar.
use crate::content::ext_accounts;
use crate::data::data;
use crate::grade::{net_by_account, NetMap};
use crate::types::{Account, JournalLine};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum VerdictKind {
    Ok,
    WrongSide,
    WrongAmount,
    Extra,
    Missing,
}

#[derive(Clone, Debug, PartialEq)]
pub struct LineVerdict {
    pub code: String,
    pub name: String,
    pub kind: VerdictKind,
    pub user_net: f64,
    pub note: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Feedback {
    pub diff: f64,
    pub verdicts: Vec<LineVerdict>,
    pub concepts: Vec<String>,
}

const TOL: f64 = 1.0;

fn type_id(kind: &str) -> &'static str {
    match kind {
        "Asset" => "aset",
        "Liability" => "liabilitas",
        "Equity" => "ekuitas",
        "Revenue" => "pendapatan",
        "Expense" => "beban",
        _ => "akun",
    }
}

fn acc(code: &str) -> Option<&'static Account> {
    data()
        .coa
        .iter()
        .find(|a| a.code == code)
        .or_else(|| ext_accounts().iter().find(|a| a.code == code))
}

fn name_of(code: &str) -> String {
    acc(code)
        .map(|a| a.name.clone())
        .unwrap_or_else(|| code.to_string())
}

fn rp(n: f64) -> String {
    format!("Rp{}", crate::money::format_rupiah(n.abs().round(), false))
}

/// Angka bulat >= 1.000 yang tertulis di teks soal (format 1.234.567 atau 1234567).
pub fn numbers_in(text: &str) -> Vec<f64> {
    let ch: Vec<char> = text.chars().collect();
    let mut out: Vec<f64> = vec![];
    let mut i = 0;
    while i < ch.len() {
        if !ch[i].is_ascii_digit() {
            i += 1;
            continue;
        }
        let start = i;
        while i < ch.len() && ch[i].is_ascii_digit() {
            i += 1;
        }
        let lead = i - start;
        let mut digits: String = ch[start..i].iter().collect();
        let mut groups = 0;
        while i + 3 < ch.len()
            && ch[i] == '.'
            && ch[i + 1..i + 4].iter().all(|c| c.is_ascii_digit())
        {
            digits.extend(&ch[i + 1..i + 4]);
            i += 4;
            groups += 1;
        }
        let ok = (groups > 0 && lead <= 3) || (groups == 0 && lead >= 4);
        if ok {
            if let Ok(n) = digits.parse::<f64>() {
                if !out.contains(&n) {
                    out.push(n);
                }
            }
        }
    }
    out
}

pub fn diagnose(lines: &[JournalLine], key_net: &NetMap, text_numbers: &[f64]) -> Feedback {
    let used: Vec<JournalLine> = lines
        .iter()
        .filter(|l| l.code.as_deref().is_some_and(|c| !c.is_empty()))
        .cloned()
        .collect();
    let debit: f64 = used.iter().map(|l| l.debit).sum();
    let credit: f64 = used.iter().map(|l| l.credit).sum();
    let user = net_by_account(&used);
    let key_abs: Vec<f64> = key_net.values().map(|v| v.abs()).collect();
    let mut verdicts: Vec<LineVerdict> = vec![];
    for (code, &u) in user.iter() {
        let name = name_of(code);
        let a = acc(code);
        let Some(&k) = key_net.get(code) else {
            verdicts.push(LineVerdict {
                code: code.clone(),
                name: name.clone(),
                kind: VerdictKind::Extra,
                user_net: u,
                note: format!("{name} tidak terlibat pada kejadian ini."),
            });
            continue;
        };
        if (u - k).abs() <= TOL {
            verdicts.push(LineVerdict {
                code: code.clone(),
                name,
                kind: VerdictKind::Ok,
                user_net: u,
                note: "Akun, sisi, dan nominal sudah tepat.".into(),
            });
            continue;
        }
        if u * k < 0.0 {
            let t = type_id(a.map(|x| x.kind.as_str()).unwrap_or(""));
            let normal = if a.map(|x| x.normal.as_str()) == Some("Credit") {
                "kredit"
            } else {
                "debit"
            };
            let note = format!(
                "{name} adalah akun {t} bersaldo normal {normal}. Pada kejadian ini akun itu perlu {}, sedangkan Anda {}.",
                if k > 0.0 { "didebit" } else { "dikredit" },
                if u > 0.0 { "mendebitnya" } else { "mengkreditnya" }
            );
            verdicts.push(LineVerdict {
                code: code.clone(),
                name,
                kind: VerdictKind::WrongSide,
                user_net: u,
                note,
            });
            continue;
        }
        let au = u.abs();
        let note = if text_numbers.contains(&au) {
            format!("Nominal {name} sama dengan angka mentah yang tertulis di soal. Kunci memerlukan perhitungan dari angka itu (misalnya persentase, diskon, atau prorata).")
        } else if key_abs.iter().any(|x| (x - au).abs() <= TOL) && (k.abs() - au).abs() > TOL {
            format!("Nominal {name} sama dengan nominal akun lain pada jurnal. Periksa apakah angkanya tertukar antar akun.")
        } else {
            format!(
                "Nominal {name} {} dari seharusnya; periksa langkah perhitungannya.",
                if au > k.abs() {
                    "lebih besar"
                } else {
                    "lebih kecil"
                }
            )
        };
        verdicts.push(LineVerdict {
            code: code.clone(),
            name,
            kind: VerdictKind::WrongAmount,
            user_net: u,
            note,
        });
    }
    for (code, _) in key_net.iter() {
        if user.contains_key(code) {
            continue;
        }
        let a = acc(code);
        verdicts.push(LineVerdict {
            code: code.clone(),
            name: name_of(code),
            kind: VerdictKind::Missing,
            user_net: 0.0,
            note: format!(
                "{} ({}) belum ada; kejadian ini mengubah akun tersebut.",
                name_of(code),
                type_id(a.map(|x| x.kind.as_str()).unwrap_or(""))
            ),
        });
    }

    let mut concepts: Vec<String> = vec![];
    let diff = debit - credit;
    if diff.abs() > TOL {
        concepts.push(format!(
            "Prinsip dasar: total debit harus sama dengan total kredit. Saat ini {} lebih besar {}; selisih sebesar itu sering menunjuk baris yang terlewat atau salah ketik.",
            if diff > 0.0 { "debit" } else { "kredit" },
            rp(diff)
        ));
    }
    let wrong_side = verdicts
        .iter()
        .filter(|v| v.kind == VerdictKind::WrongSide)
        .count();
    let non_missing = verdicts
        .iter()
        .filter(|v| v.kind != VerdictKind::Missing)
        .count();
    if wrong_side > 0 && wrong_side == non_missing {
        concepts.push("Semua akun Anda berlawanan sisi dengan seharusnya: kemungkinan seluruh jurnal terbalik. Tanyakan dulu apakah tiap akun bertambah atau berkurang, baru tentukan debit atau kredit.".into());
    } else if wrong_side > 0 {
        concepts.push("Aturan saldo normal: aset dan beban bertambah di debit; liabilitas, ekuitas, dan pendapatan bertambah di kredit. Akun kontra berlawanan dengan induknya.".into());
    }
    let missing: Vec<&LineVerdict> = verdicts
        .iter()
        .filter(|v| v.kind == VerdictKind::Missing)
        .collect();
    for e in verdicts.iter().filter(|v| v.kind == VerdictKind::Extra) {
        let et = acc(&e.code).map(|a| a.kind.clone());
        if let Some(pair) = missing
            .iter()
            .find(|m| acc(&m.code).map(|a| a.kind.clone()) == et)
        {
            concepts.push(format!(
                "{} dan {} sama-sama akun {}: kemungkinan Anda memilih akun yang kurang spesifik. Pilih akun yang paling sesuai dengan kejadian (jenis aset, pihak, atau rekening bank yang dipakai).",
                e.name,
                pair.name,
                type_id(et.as_deref().unwrap_or(""))
            ));
        }
    }
    if missing.iter().any(|m| m.code == "5-1000") {
        concepts.push("Metode perpetual: setiap penjualan memerlukan jurnal kedua untuk harga pokok (debit HPP, kredit Persediaan) di samping jurnal pendapatan.".into());
    }
    if missing.iter().any(|m| m.code == "4-1200") {
        concepts.push("Potongan penjualan dicatat di akun kontra pendapatan tersendiri, tidak langsung mengurangi akun Penjualan.".into());
    }
    let amounts_only = !verdicts.is_empty()
        && verdicts
            .iter()
            .all(|v| matches!(v.kind, VerdictKind::Ok | VerdictKind::WrongAmount))
        && verdicts.iter().any(|v| v.kind == VerdictKind::WrongAmount);
    if amounts_only {
        concepts.push(
            "Akun dan sisi sudah tepat; yang perlu diperbaiki adalah perhitungan nominal.".into(),
        );
    }
    Feedback {
        diff,
        verdicts,
        concepts,
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct CompareRow {
    pub code: String,
    pub name: String,
    pub user: Option<(char, f64)>,
    pub key: Option<(char, f64)>,
    pub matched: bool,
}

/// Perbandingan jawaban pengguna dengan kunci per akun (dipakai setelah kunci dibuka).
pub fn compare_with_key(lines: &[JournalLine], key_net: &NetMap) -> Vec<CompareRow> {
    let used: Vec<JournalLine> = lines
        .iter()
        .filter(|l| l.code.as_deref().is_some_and(|c| !c.is_empty()))
        .cloned()
        .collect();
    let user = net_by_account(&used);
    let side = |n: f64| if n >= 0.0 { 'D' } else { 'K' };
    let mut codes: Vec<&String> = key_net.keys().collect();
    for c in user.keys() {
        if !key_net.contains_key(c) {
            codes.push(c);
        }
    }
    codes
        .into_iter()
        .map(|code| {
            let u = user.get(code).copied();
            let k = key_net.get(code).copied();
            CompareRow {
                code: code.clone(),
                name: name_of(code),
                user: u.map(|x| (side(x), x.abs())),
                key: k.map(|x| (side(x), x.abs())),
                matched: matches!((u, k), (Some(a), Some(b)) if (a - b).abs() <= TOL),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn angka_di_teks() {
        assert_eq!(
            numbers_in("Rp198.000.000 dan 1500000 serta 250"),
            vec![198_000_000.0, 1_500_000.0]
        );
    }

    #[test]
    fn sisi_terbalik_dan_kurang() {
        let mut key = NetMap::new();
        key.insert("1-1100".into(), 100_000.0);
        key.insert("3-1000".into(), -100_000.0);
        let lines = vec![JournalLine {
            id: "a".into(),
            code: Some("1-1100".into()),
            debit: 0.0,
            credit: 100_000.0,
            ..Default::default()
        }];
        let f = diagnose(&lines, &key, &[]);
        assert!(f.verdicts.iter().any(|v| v.kind == VerdictKind::WrongSide));
        assert!(f.verdicts.iter().any(|v| v.kind == VerdictKind::Missing));
        let rows = compare_with_key(&lines, &key);
        assert_eq!(rows.len(), 2);
        assert!(!rows[0].matched);
    }
}
