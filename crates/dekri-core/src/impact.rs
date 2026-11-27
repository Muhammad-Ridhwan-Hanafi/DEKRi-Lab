//! Dampak perubahan jurnal ke laporan: simulasi "bagaimana jika", label sel laporan, dan dugaan penyebab selisih.
//! Semuanya memakai mesin laporan yang sama (tidak ada rumus kedua), sehingga angka selalu sejalan dengan Laporan.
use crate::compute_report;
use crate::data::data;
use crate::derive::entries;
use crate::ledger::LedgerInput;
use crate::state::UserState;
use crate::trace::TraceSource;
use crate::types::{Cell, EntryLines};
use std::collections::HashMap;
use std::sync::OnceLock;

/// id sel -> (judul laporan, label baris), hanya sel angka berlabel.
pub fn cell_labels() -> &'static HashMap<String, (String, String)> {
    static M: OnceLock<HashMap<String, (String, String)>> = OnceLock::new();
    M.get_or_init(|| {
        let mut m = HashMap::new();
        let layout = crate::statement_layout();
        if let Some(obj) = layout.as_object() {
            for (_, sheet) in obj {
                let title = sheet["title"].as_str().unwrap_or("").to_string();
                for row in sheet["rows"].as_array().into_iter().flatten() {
                    let label = row["label"].as_str().unwrap_or("").trim().to_string();
                    if label.is_empty() {
                        continue;
                    }
                    for c in row["cells"].as_array().into_iter().flatten() {
                        if let (Some(id), None) = (c["id"].as_str(), c.get("text")) {
                            m.insert(id.to_string(), (title.clone(), label.clone()));
                        }
                    }
                }
            }
        }
        m
    })
}

#[derive(Clone, Debug, PartialEq)]
pub struct CellDiff {
    pub id: String,
    pub sheet: String,
    pub label: String,
    pub before: f64,
    pub after: f64,
}

/// Entri jurnal (transaksi atau penyesuaian) yang ada isinya, untuk dipilih di simulasi.
pub fn entry_keys(state: &UserState, source: TraceSource) -> Vec<String> {
    let set = match source {
        TraceSource::Adj => entries(&state.adjusting),
        _ => entries(&state.journal),
    };
    set.into_iter().map(|e| e.key).collect()
}

/// Kalikan semua baris satu entri dengan `factor` (saldo tetap seimbang), lalu hitung ulang seluruh laporan.
/// Mengembalikan sel berlabel yang berubah, diurutkan dari perubahan terbesar.
pub fn whatif(state: &UserState, source: TraceSource, key: &str, factor: f64) -> Vec<CellDiff> {
    let d = data();
    let journal = entries(&state.journal);
    let adjusting = entries(&state.adjusting);
    let run = |j: &[EntryLines], a: &[EntryLines]| {
        compute_report(&LedgerInput {
            coa: &d.coa,
            opening: &d.opening,
            journal: j,
            adjusting: a,
            cf_sub: &d.cf_sub,
        })
    };
    let base = run(&journal, &adjusting);
    let scale = |set: &[EntryLines]| -> Vec<EntryLines> {
        set.iter()
            .map(|e| {
                if e.key == key {
                    EntryLines {
                        key: e.key.clone(),
                        lines: e
                            .lines
                            .iter()
                            .map(|(c, dr, cr)| {
                                (c.clone(), (dr * factor).round(), (cr * factor).round())
                            })
                            .collect(),
                    }
                } else {
                    e.clone()
                }
            })
            .collect()
    };
    let alt = match source {
        TraceSource::Adj => run(&journal, &scale(&adjusting)),
        _ => run(&scale(&journal), &adjusting),
    };
    let labels = cell_labels();
    let mut out: Vec<CellDiff> = vec![];
    for (id, a) in base.cells.iter() {
        if let (Cell::Num(x), Some(Cell::Num(y))) = (a, alt.cells.get(id)) {
            if (x - y).abs() >= 0.5 {
                if let Some((sheet, label)) = labels.get(*id) {
                    out.push(CellDiff {
                        id: (*id).to_string(),
                        sheet: sheet.clone(),
                        label: label.clone(),
                        before: *x,
                        after: *y,
                    });
                }
            }
        }
    }
    out.sort_by(|a, b| {
        (b.after - b.before)
            .abs()
            .total_cmp(&(a.after - a.before).abs())
            .then_with(|| a.id.cmp(&b.id))
    });
    out
}

#[derive(Clone, Debug, PartialEq)]
pub struct Suspect {
    pub source: TraceSource,
    pub key: String,
    pub code: String,
    pub amount: f64,
    pub why: &'static str,
}

/// Dugaan penyebab selisih `diff` antara dua angka yang seharusnya sama:
/// jurnal yang tidak seimbang, baris yang nominalnya sama dengan selisih, atau separuh selisih (sisi terbalik).
pub fn suspects(state: &UserState, diff: f64) -> Vec<Suspect> {
    let target = diff.abs();
    let mut out = vec![];
    if target < 0.5 {
        return out;
    }
    for (source, set) in [
        (TraceSource::Txn, entries(&state.journal)),
        (TraceSource::Adj, entries(&state.adjusting)),
    ] {
        for e in &set {
            let (dr, cr) = e
                .lines
                .iter()
                .fold((0.0, 0.0), |a, l| (a.0 + l.1, a.1 + l.2));
            if (dr - cr).abs() >= 0.5 {
                out.push(Suspect {
                    source,
                    key: e.key.clone(),
                    code: String::new(),
                    amount: (dr - cr).abs(),
                    why: "jurnal tidak seimbang (selisih debit dan kredit)",
                });
            }
            for (c, d, k) in &e.lines {
                let a = if *d != 0.0 { *d } else { *k };
                if (a - target).abs() < 0.5 {
                    out.push(Suspect {
                        source,
                        key: e.key.clone(),
                        code: c.clone(),
                        amount: a,
                        why: "nominal baris sama dengan selisih (mungkin terlewat atau dobel)",
                    });
                } else if (a * 2.0 - target).abs() < 0.5 {
                    out.push(Suspect {
                        source,
                        key: e.key.clone(),
                        code: c.clone(),
                        amount: a,
                        why: "nominal baris separuh selisih (mungkin sisi debit/kredit terbalik)",
                    });
                }
            }
        }
    }
    out.truncate(20);
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::JournalLine;

    fn line(code: &str, d: f64, k: f64) -> JournalLine {
        JournalLine {
            id: code.into(),
            code: Some(code.into()),
            debit: d,
            credit: k,
            memo: String::new(),
        }
    }

    #[test]
    fn whatif_changes_reported_cells() {
        let mut st = UserState::default();
        st.journal.insert(
            "1".into(),
            vec![
                line("1-1000", 10_000_000.0, 0.0),
                line("4-1000", 0.0, 10_000_000.0),
            ],
        );
        let diffs = whatif(&st, TraceSource::Txn, "1", 2.0);
        assert!(!diffs.is_empty());
        assert!(diffs
            .iter()
            .all(|d| (d.after - d.before).abs() >= 0.5 && !d.label.is_empty()));
        // faktor 1 = tidak ada perubahan
        assert!(whatif(&st, TraceSource::Txn, "1", 1.0).is_empty());
    }

    #[test]
    fn suspects_find_matching_and_unbalanced() {
        let mut st = UserState::default();
        st.journal.insert(
            "7".into(),
            vec![
                line("1-1000", 5_000_000.0, 0.0),
                line("4-1000", 0.0, 4_000_000.0),
            ],
        );
        let s = suspects(&st, 1_000_000.0);
        assert!(s
            .iter()
            .any(|x| x.why.starts_with("jurnal tidak seimbang") && x.key == "7"));
        let s2 = suspects(&st, 10_000_000.0);
        assert!(s2
            .iter()
            .any(|x| x.why.contains("separuh") && x.code == "1-1000"));
    }

    #[test]
    fn labels_cover_statements() {
        assert!(cell_labels().get("S12_B53").is_some());
    }
}
