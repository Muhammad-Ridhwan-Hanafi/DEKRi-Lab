//! Penjelasan jurnal langkah demi langkah, disusun dari kunci itu sendiri (tanpa menambah klaim akuntansi baru).
use crate::data::data;
use crate::types::Account;

pub type KeyLine = (String, String, f64, f64); // (kode, nama, debit, kredit)

#[derive(Clone, Debug, PartialEq)]
pub struct ExplainStep {
    pub title: &'static str,
    pub body: Option<String>,
    pub items: Vec<String>,
}

fn type_id(kind: &str) -> String {
    match kind {
        "Asset" => "aset".into(),
        "Liability" => "liabilitas".into(),
        "Equity" => "ekuitas".into(),
        "Revenue" => "pendapatan".into(),
        "Expense" => "beban".into(),
        other => other.to_lowercase(),
    }
}

fn default_normal(kind: &str) -> Option<&'static str> {
    match kind {
        "Asset" | "Expense" => Some("Debit"),
        "Liability" | "Equity" | "Revenue" => Some("Credit"),
        _ => None,
    }
}

/// Satu baris pendek per akun: sisi, nama akun, jenis, dan arah perubahannya.
pub fn explain_line(l: &KeyLine, acc: Option<&Account>) -> String {
    let name = if !l.1.is_empty() {
        l.1.as_str()
    } else {
        acc.map(|a| a.name.as_str()).unwrap_or(l.0.as_str())
    };
    let used = if l.2 != 0.0 { "Debit" } else { "Credit" };
    let side = if used == "Debit" { "Debit" } else { "Kredit" };
    let Some(acc) = acc else {
        return format!("{side} — {name}");
    };
    let kind = type_id(&acc.kind);
    let contra = default_normal(&acc.kind).is_some_and(|d| d != acc.normal);
    let grows = used == acc.normal;
    format!(
        "{side} — {name}: {}{kind} {}.",
        if contra { "akun pengurang " } else { "" },
        if grows { "bertambah" } else { "berkurang" }
    )
}

#[derive(Default, Clone, Copy)]
pub struct ExplainOpts<'a> {
    pub topic: Option<&'a str>,
    pub explain: Option<&'a str>,
    pub calc: Option<&'a str>,
    pub reason: Option<&'a str>,
}

fn ne(s: Option<&str>) -> Option<&str> {
    s.filter(|x| !x.is_empty())
}

pub fn explain_journal(lines: &[KeyLine], opts: ExplainOpts) -> Vec<ExplainStep> {
    let used: Vec<&KeyLine> = lines.iter().filter(|l| l.2 != 0.0 || l.3 != 0.0).collect();
    let mut steps = Vec::new();
    if used.is_empty() {
        steps.push(ExplainStep {
            title: "Mengapa tidak dijurnal",
            body: Some(
                opts.reason
                    .or(opts.explain)
                    .unwrap_or("Peristiwa ini belum mengubah aset, liabilitas, atau ekuitas, jadi belum dijurnal.")
                    .to_string(),
            ),
            items: vec![],
        });
        return steps;
    }
    let intro = match (ne(opts.topic), ne(opts.explain)) {
        (Some(t), Some(e)) => {
            let dot = if t.ends_with(['.', ':', '!', '?']) {
                ""
            } else {
                "."
            };
            Some(format!("{t}{dot} {e}"))
        }
        (_, Some(e)) => Some(e.to_string()),
        (Some(t), None) => Some(t.to_string()),
        _ => None,
    };
    if let Some(b) = intro {
        steps.push(ExplainStep {
            title: "Intinya",
            body: Some(b),
            items: vec![],
        });
    }
    if let Some(c) = ne(opts.calc) {
        steps.push(ExplainStep {
            title: "Perhitungan",
            body: Some(c.to_string()),
            items: vec![],
        });
    }
    let coa = &data().coa;
    steps.push(ExplainStep {
        title: "Mengapa dicatat begini",
        body: None,
        items: used
            .iter()
            .map(|l| explain_line(l, coa.iter().find(|a| a.code == l.0)))
            .collect(),
    });
    steps.push(ExplainStep {
        title: "Ingat",
        body: Some("Aset dan beban bertambah di debit. Liabilitas, ekuitas, dan pendapatan bertambah di kredit. Berkurang berarti sisi sebaliknya.".into()),
        items: vec![],
    });
    steps
}

#[cfg(test)]
mod tests {
    use super::*;

    fn l(code: &str, name: &str, d: f64, c: f64) -> KeyLine {
        (code.into(), name.into(), d, c)
    }

    #[test]
    fn baris_aset_bertambah_di_debit() {
        let acc = data().coa.iter().find(|a| a.kind == "Asset").unwrap();
        let s = explain_line(&l(&acc.code, "Bank", 100.0, 0.0), Some(acc));
        assert!(s.starts_with("Debit — Bank:"));
        assert!(s.contains("bertambah"));
    }

    #[test]
    fn akun_tak_dikenal_hanya_sisi_dan_nama() {
        assert_eq!(
            explain_line(&l("X", "Akun X", 0.0, 5.0), None),
            "Kredit — Akun X"
        );
    }

    #[test]
    fn tanpa_jurnal_hanya_satu_langkah_alasan() {
        let s = explain_journal(
            &[],
            ExplainOpts {
                reason: Some("Belum ada kas."),
                ..Default::default()
            },
        );
        assert_eq!(s.len(), 1);
        assert_eq!(s[0].title, "Mengapa tidak dijurnal");
        assert_eq!(s[0].body.as_deref(), Some("Belum ada kas."));
    }

    #[test]
    fn langkah_lengkap_dan_titik_tidak_ganda() {
        let acc = data().coa.iter().find(|a| a.kind == "Asset").unwrap();
        let lines = vec![l(&acc.code, "", 10.0, 0.0), l(&acc.code, "", 0.0, 10.0)];
        let s = explain_journal(
            &lines,
            ExplainOpts {
                topic: Some("Setoran modal."),
                explain: Some("Kas masuk."),
                calc: Some("10"),
                reason: None,
            },
        );
        let t: Vec<_> = s.iter().map(|x| x.title).collect();
        assert_eq!(
            t,
            ["Intinya", "Perhitungan", "Mengapa dicatat begini", "Ingat"]
        );
        assert_eq!(s[0].body.as_deref(), Some("Setoran modal. Kas masuk."));
        assert_eq!(s[2].items.len(), 2);
    }

    #[test]
    fn semua_kunci_transaksi_menghasilkan_langkah_tanpa_panik() {
        for k in &data().key.readable_txn {
            let s = explain_journal(
                &k.lines
                    .iter()
                    .map(|x| (x.code.clone(), x.name.clone(), x.debit, x.credit))
                    .collect::<Vec<_>>(),
                ExplainOpts {
                    topic: Some(&k.topic),
                    explain: k.explain.as_deref(),
                    ..Default::default()
                },
            );
            assert!(!s.is_empty());
        }
    }
}
