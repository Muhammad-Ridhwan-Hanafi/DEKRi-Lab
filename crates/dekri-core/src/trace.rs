//! Penelusuran angka laporan ke baris jurnal dengan analisis sensitivitas (setara engine/trace.ts).
//! Setiap baris (saldo awal, jurnal transaksi, jurnal penyesuaian) digeser PERTURB, laporan dihitung ulang;
//! sel yang berubah = sel yang dibentuk baris itu. Mesin laporan tidak diubah sama sekali.
use crate::compute_report;
use crate::data::data;
use crate::derive::entries;
use crate::ledger::LedgerInput;
use crate::state::UserState;
use crate::types::{Cell, EntryLines, OpeningBalance};
use std::collections::HashMap;

const PERTURB: f64 = 1_000_000.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum TraceSource {
    Opening,
    Txn,
    Adj,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TraceLine {
    pub source: TraceSource,
    pub key: String,
    pub code: String,
    /// 'D' atau 'K'
    pub side: char,
    pub amount: f64,
    /// perubahan angka laporan bila baris ini naik Rp1.000.000
    pub effect: f64,
}

#[derive(Default)]
pub struct TraceIndex {
    pub by_cell: HashMap<String, Vec<TraceLine>>,
    pub runs: usize,
}

fn nums(r: &crate::Report) -> HashMap<&'static str, f64> {
    r.cells
        .iter()
        .filter_map(|(k, v)| match v {
            Cell::Num(n) => Some((*k, *n)),
            _ => None,
        })
        .collect()
}

pub fn build_trace_index(state: &UserState) -> TraceIndex {
    let d = data();
    let journal = entries(&state.journal);
    let adjusting = entries(&state.adjusting);
    let run = |opening: &[OpeningBalance], j: &[EntryLines], a: &[EntryLines]| {
        compute_report(&LedgerInput {
            coa: &d.coa,
            opening,
            journal: j,
            adjusting: a,
            cf_sub: &d.cf_sub,
        })
    };
    let base = nums(&run(&d.opening, &journal, &adjusting));
    let mut idx = TraceIndex::default();
    let mut record = |line: TraceLine, rep: crate::Report| {
        idx.runs += 1;
        let cells = nums(&rep);
        for (id, a) in base.iter() {
            if let Some(b) = cells.get(id) {
                let effect = b - a;
                if effect.abs() >= 1e-6 {
                    idx.by_cell
                        .entry((*id).to_string())
                        .or_default()
                        .push(TraceLine {
                            effect,
                            ..line.clone()
                        });
                }
            }
        }
    };
    for (i, o) in d.opening.iter().enumerate() {
        if o.debit == 0.0 && o.credit == 0.0 {
            continue;
        }
        let mut op = d.opening.clone();
        let debit = o.debit != 0.0;
        if debit {
            op[i].debit += PERTURB;
        } else {
            op[i].credit += PERTURB;
        }
        let line = TraceLine {
            source: TraceSource::Opening,
            key: o.code.clone(),
            code: o.code.clone(),
            side: if debit { 'D' } else { 'K' },
            amount: if debit { o.debit } else { o.credit },
            effect: 0.0,
        };
        record(line, run(&op, &journal, &adjusting));
    }
    for (is_adj, set) in [(false, &journal), (true, &adjusting)] {
        for (ei, e) in set.iter().enumerate() {
            for (li, l) in e.lines.iter().enumerate() {
                if l.1 == 0.0 && l.2 == 0.0 {
                    continue;
                }
                let mut copy = set.clone();
                let debit = l.1 != 0.0;
                if debit {
                    copy[ei].lines[li].1 += PERTURB;
                } else {
                    copy[ei].lines[li].2 += PERTURB;
                }
                let line = TraceLine {
                    source: if is_adj {
                        TraceSource::Adj
                    } else {
                        TraceSource::Txn
                    },
                    key: e.key.clone(),
                    code: l.0.clone(),
                    side: if debit { 'D' } else { 'K' },
                    amount: if debit { l.1 } else { l.2 },
                    effect: 0.0,
                };
                let rep = if is_adj {
                    run(&d.opening, &journal, &copy)
                } else {
                    run(&d.opening, &copy, &adjusting)
                };
                record(line, rep);
            }
        }
    }
    idx
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::JournalLine;

    #[test]
    fn trace_finds_journal_line() {
        let mut st = UserState::default();
        st.journal.insert(
            "1".into(),
            vec![
                JournalLine {
                    id: "a".into(),
                    code: Some("1-1000".into()),
                    debit: 5_000_000.0,
                    credit: 0.0,
                    memo: String::new(),
                },
                JournalLine {
                    id: "b".into(),
                    code: Some("3-1000".into()),
                    debit: 0.0,
                    credit: 5_000_000.0,
                    memo: String::new(),
                },
            ],
        );
        let idx = build_trace_index(&st);
        assert!(idx.runs > 2);
        assert!(idx
            .by_cell
            .values()
            .flatten()
            .any(|l| l.source == TraceSource::Txn && l.key == "1"));
        assert!(idx
            .by_cell
            .values()
            .flatten()
            .any(|l| l.source == TraceSource::Opening));
    }
}
