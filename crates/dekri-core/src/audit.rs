//! Audit konsistensi data kasus dan kunci. Dipakai tes (`cargo test audit`) dan layar Pengaturan > Tentang.
//! Tujuan: menangkap kesalahan konten (jurnal tidak seimbang, akun tak dikenal, kunci yatim) sebelum sampai ke pengguna.
use crate::content::any_account_name;
use crate::data::data;

#[derive(Clone, Debug, PartialEq)]
pub struct Issue {
    pub area: &'static str,
    pub id: String,
    pub message: String,
}

fn bad(out: &mut Vec<Issue>, area: &'static str, id: impl ToString, message: impl Into<String>) {
    out.push(Issue {
        area,
        id: id.to_string(),
        message: message.into(),
    });
}

pub fn audit() -> Vec<Issue> {
    let d = data();
    let mut out = Vec::new();
    let known = |c: &str| any_account_name(c).is_some();

    // saldo awal
    let (od, oc) = d
        .opening
        .iter()
        .fold((0.0, 0.0), |a, o| (a.0 + o.debit, a.1 + o.credit));
    if (od - oc).abs() > 0.5 {
        bad(
            &mut out,
            "saldo awal",
            "-",
            format!("tidak seimbang: debit {od} kredit {oc}"),
        );
    }
    for o in &d.opening {
        if !known(&o.code) {
            bad(
                &mut out,
                "saldo awal",
                &o.code,
                "kode akun tidak ada di bagan akun",
            );
        }
    }

    // transaksi
    let mut prev_date = String::new();
    for t in &d.transactions {
        let id = t.no.to_string();
        if t.narrative.trim().is_empty() {
            bad(&mut out, "transaksi", &id, "narasi kosong");
        }
        if t.date < prev_date {
            bad(
                &mut out,
                "transaksi",
                &id,
                format!(
                    "tanggal {} lebih awal dari transaksi sebelumnya ({prev_date})",
                    t.date
                ),
            );
        }
        prev_date = t.date.clone();
        if !t.date.starts_with("2024-") {
            bad(
                &mut out,
                "transaksi",
                &id,
                format!("tanggal di luar TA 2024: {}", t.date),
            );
        }
        for bad_word in ["TODO", "??", "lorem"] {
            if t.narrative.contains(bad_word) || t.amount_info.contains(bad_word) {
                bad(
                    &mut out,
                    "transaksi",
                    &id,
                    format!("teks mengandung \"{bad_word}\""),
                );
            }
        }
        let no_journal = d
            .key
            .analysis
            .get(&id)
            .is_some_and(|a| a.debit.as_deref() == Some("-"));
        if !no_journal && !d.key.txn_net.contains_key(&id) {
            bad(&mut out, "kunci", &id, "tidak ada txnNet");
        }
        if !d.key.analysis.contains_key(&id) {
            bad(&mut out, "kunci", &id, "tidak ada kunci analisis");
        }
        if !d.key.readable_txn.iter().any(|r| r.no == t.no) {
            bad(
                &mut out,
                "kunci",
                &id,
                "tidak ada jurnal terbaca (readableTxn)",
            );
        }
    }
    for r in &d.key.readable_txn {
        let id = r.no.to_string();
        if !d.transactions.iter().any(|t| t.no == r.no) {
            bad(&mut out, "kunci", &id, "readableTxn tanpa transaksi");
        }
        check_lines(&mut out, "kunci txn", &id, &r.lines, d.key.txn_net.get(&id));
    }
    for (id, net) in &d.key.txn_net {
        let s: f64 = net.values().sum();
        if s.abs() > 0.5 {
            bad(
                &mut out,
                "kunci txn",
                id,
                format!("saldo bersih tidak nol: {s}"),
            );
        }
        for c in net.keys() {
            if !known(c) {
                bad(&mut out, "kunci txn", id, format!("akun {c} tidak dikenal"));
            }
        }
    }

    // opsi analisis
    for (id, a) in &d.key.analysis {
        let journal = a.debit.as_deref().is_some_and(|x| x != "-");
        if journal {
            match a.cash_class.as_deref() {
                Some(c) if d.analysis_options.cash_class.iter().any(|o| o == c) => {}
                other => bad(
                    &mut out,
                    "analisis",
                    id,
                    format!("klasifikasi arus kas tidak valid: {other:?}"),
                ),
            }
            for (name, v) in [
                ("needsAdj", &a.needs_adj),
                ("affectsProfit", &a.affects_profit),
                ("affectsCash", &a.affects_cash),
            ] {
                match v.as_deref() {
                    Some(x) if d.analysis_options.yes_no.iter().any(|o| o == x) => {}
                    other => bad(
                        &mut out,
                        "analisis",
                        id,
                        format!("{name} tidak valid: {other:?}"),
                    ),
                }
            }
        }
    }

    // penyesuaian
    for a in &d.adjustments {
        if !d.key.adj_net.contains_key(&a.code) {
            bad(&mut out, "kunci adj", &a.code, "tidak ada adjNet");
        }
        if !d.key.readable_adj.iter().any(|r| r.code == a.code) {
            bad(
                &mut out,
                "kunci adj",
                &a.code,
                "tidak ada jurnal terbaca (readableAdj)",
            );
        }
    }
    for r in &d.key.readable_adj {
        check_lines(
            &mut out,
            "kunci adj",
            &r.code,
            &r.lines,
            d.key.adj_net.get(&r.code),
        );
    }

    // skenario
    for s in &d.scenarios {
        let id = s.no.to_string();
        match d.key.scenario.get(&id) {
            None => bad(&mut out, "skenario", &id, "tanpa kunci"),
            Some(k) => {
                if s.kind == "choice" {
                    let ks = k.key.as_str().unwrap_or("");
                    if !s
                        .options
                        .as_ref()
                        .is_some_and(|o| o.iter().any(|x| x == ks))
                    {
                        bad(
                            &mut out,
                            "skenario",
                            &id,
                            format!("kunci \"{ks}\" bukan salah satu opsi"),
                        );
                    }
                }
                if k.explanation.trim().is_empty() {
                    bad(&mut out, "skenario", &id, "penjelasan kosong");
                }
            }
        }
    }
    out
}

fn check_lines(
    out: &mut Vec<Issue>,
    area: &'static str,
    id: &str,
    lines: &[crate::data::ReadableLine],
    net: Option<&crate::grade::NetMap>,
) {
    let lines: Vec<_> = lines.iter().filter(|l| l.code != "-").cloned().collect();
    let lines = &lines[..];
    let (dr, cr) = lines
        .iter()
        .fold((0.0, 0.0), |a, l| (a.0 + l.debit, a.1 + l.credit));
    if (dr - cr).abs() > 0.5 {
        bad(
            out,
            area,
            id,
            format!("jurnal tidak seimbang: debit {dr} kredit {cr}"),
        );
    }
    for l in lines.iter().filter(|l| l.code != "-") {
        match any_account_name(&l.code) {
            None => bad(out, area, id, format!("akun {} tidak dikenal", l.code)),
            Some(n) if n != l.name => bad(
                out,
                area,
                id,
                format!(
                    "nama akun {} \"{}\" berbeda dari bagan akun \"{}\"",
                    l.code, l.name, n
                ),
            ),
            _ => {}
        }
    }
    if let Some(net) = net {
        let mut mine: std::collections::BTreeMap<&str, f64> = Default::default();
        for l in lines {
            *mine.entry(l.code.as_str()).or_default() += l.debit - l.credit;
        }
        for (c, v) in net {
            let m = mine.get(c.as_str()).copied().unwrap_or(0.0);
            if (m - v).abs() > 0.5 {
                bad(
                    out,
                    area,
                    id,
                    format!("akun {c}: jurnal terbaca {m} berbeda dari saldo bersih kunci {v}"),
                );
            }
        }
        for (c, m) in &mine {
            if m.abs() > 0.5 && !net.contains_key(*c) {
                bad(
                    out,
                    area,
                    id,
                    format!("akun {c} ada di jurnal terbaca tetapi tidak di saldo bersih kunci"),
                );
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn data_kasus_dan_kunci_konsisten() {
        let issues = audit();
        let text: Vec<String> = issues
            .iter()
            .map(|i| format!("[{}] {}: {}", i.area, i.id, i.message))
            .collect();
        assert!(
            issues.is_empty(),
            "temuan audit ({}):\n{}",
            issues.len(),
            text.join("\n")
        );
    }
}
