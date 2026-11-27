//! Petunjuk bertingkat (tidak pernah memuat nominal jawaban). Port hintTexts di src/ui/components/StudyAids.tsx.
use crate::data::data;
use crate::money::format_rupiah;

pub type KeyLineT = (String, String, f64, f64); // kode, nama, debit, kredit

fn type_id(kind: &str) -> &'static str {
    match kind {
        "Asset" => "Aset",
        "Liability" => "Liabilitas",
        "Equity" => "Ekuitas",
        "Revenue" => "Pendapatan",
        "Expense" => "Beban",
        _ => "?",
    }
}

/// Buang angka hasil di ujung rumus ("... = 108.000.000") agar dasar perhitungan tidak membocorkan jawaban.
pub fn mask_calc(calc: &str, hide: &[f64]) -> String {
    let mut out = match calc.rfind('=') {
        Some(i) => format!("{} = …", calc[..i].trim()),
        None => {
            let mut s = String::new();
            let cs: Vec<char> = calc.chars().collect();
            let mut i = 0;
            while i < cs.len() {
                if cs[i].is_ascii_digit() {
                    while i < cs.len() && (cs[i].is_ascii_digit() || cs[i] == '.') {
                        i += 1;
                    }
                    s.push('…');
                } else {
                    s.push(cs[i]);
                    i += 1;
                }
            }
            s
        }
    };
    for n in hide.iter().filter(|n| **n >= 1000.0) {
        out = out.replace(&format_rupiah(*n, false), "…");
    }
    out
}

pub fn hint_texts(topic: &str, lines: &[KeyLineT], calc: Option<&str>) -> Vec<String> {
    if lines.is_empty() || lines[0].0 == "-" {
        return vec![
            format!("Topik: {topic}."),
            "Pikirkan apakah peristiwa ini memang mengubah akun.".into(),
            "Jawabannya mungkin tidak perlu jurnal. Kalau yakin, centang \"tidak perlu jurnal\"."
                .into(),
        ];
    }
    let mut types: Vec<&str> = Vec::new();
    for l in lines {
        let t = data()
            .coa
            .iter()
            .find(|a| a.code == l.0)
            .map(|a| type_id(&a.kind))
            .unwrap_or("?");
        if !types.contains(&t) {
            types.push(t);
        }
    }
    let mut accounts: Vec<String> = lines.iter().map(|l| format!("{} {}", l.0, l.1)).collect();
    accounts.sort();
    let first = &lines[0];
    let amounts: Vec<f64> = lines.iter().flat_map(|l| [l.2, l.3]).collect();
    vec![
        format!(
            "Topik: {topic}. Jurnalnya melibatkan {} baris, dari kelompok akun: {}.",
            lines.len(),
            types.join(", ")
        ),
        match calc {
            Some(c) if !c.is_empty() => format!("Dasar perhitungan: {}", mask_calc(c, &amounts)),
            _ => format!("Akun yang terlibat (urutan acak): {}.", accounts.join("; ")),
        },
        format!(
            "Baris pertama: {} {} {}. Nominalnya tetap Anda hitung sendiri.",
            if first.2 != 0.0 { "DEBIT" } else { "KREDIT" },
            first.0,
            first.1
        ),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn petunjuk_tidak_membocorkan_nominal() {
        assert_eq!(
            mask_calc("72.000.000 / 12 = 6.000.000", &[]),
            "72.000.000 / 12 = …"
        );
        assert_eq!(mask_calc("Rp72.000.000 x 3", &[]), "Rp… x …");
        assert_eq!(mask_calc("72.000.000 / 12 + 6.000.000", &[]), "… / … + …");
        // angka antara yang sama dengan nominal jurnal ikut disamarkan
        assert_eq!(
            mask_calc("kos 72.000.000 / 12 = 6.000.000", &[72_000_000.0]),
            "kos … / 12 = …"
        );
        let l = vec![
            (
                "1-1600".to_string(),
                "Sewa Dibayar di Muka".to_string(),
                72_000_000.0,
                0.0,
            ),
            (
                "1-1100".to_string(),
                "Bank Arunika".to_string(),
                0.0,
                72_000_000.0,
            ),
        ];
        let h = hint_texts("Beban dibayar di muka", &l, None);
        assert_eq!(h.len(), 3);
        assert!(h[0].contains("2 baris") && h[0].contains("Aset"));
        assert!(h.iter().all(|t| !t.contains("72.000.000")));
        assert!(h[2].contains("DEBIT 1-1600"));
        assert!(hint_texts("x", &[], None)[2].contains("tidak perlu jurnal"));
    }
}
