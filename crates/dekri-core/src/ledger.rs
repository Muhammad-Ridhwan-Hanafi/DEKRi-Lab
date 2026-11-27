//! Buku besar dan neraca saldo dari saldo awal + jurnal. Setara src/engine/ledger.ts. Murni.
use crate::types::*;
use std::collections::HashMap;

const CASH_ACCOUNTS: [&str; 3] = ["1-1000", "1-1100", "1-1150"];

pub struct LedgerInput<'a> {
    pub coa: &'a [Account],
    pub opening: &'a [OpeningBalance],
    pub journal: &'a [EntryLines],
    pub adjusting: &'a [EntryLines],
    /// Sub-kategori arus kas per no. transaksi (kolom K sheet 07).
    pub cf_sub: &'a HashMap<String, String>,
}

pub struct Ledger {
    pub tb: Vec<TbRow>,
    pub tables: Tables,
}

fn row(cols: &[(char, Val)]) -> Row {
    cols.iter().cloned().collect()
}
fn s(x: &str) -> Val {
    Val::S(x.to_string())
}

pub fn build_ledger(input: &LedgerInput) -> Ledger {
    let mut jrn: Vec<Row> = Vec::new();
    for e in input.journal {
        let sub = input.cf_sub.get(&e.key).cloned().unwrap_or_default();
        for (code, d, c) in &e.lines {
            let cash = if CASH_ACCOUNTS.contains(&code.as_str()) {
                d - c
            } else {
                0.0
            };
            jrn.push(row(&[
                ('B', s(&e.key)),
                ('C', s(code)),
                ('F', Val::N(*d)),
                ('G', Val::N(*c)),
                ('K', s(&sub)),
                ('L', Val::N(cash)),
            ]));
        }
    }
    let mut adj: Vec<Row> = Vec::new();
    for e in input.adjusting {
        for (code, d, c) in &e.lines {
            adj.push(row(&[
                ('A', s(&e.key)),
                ('E', s(code)),
                ('G', Val::N(*d)),
                ('H', Val::N(*c)),
            ]));
        }
    }
    let sum_by = |rows: &[Row], code_col: char, col: char| {
        let mut m: HashMap<String, f64> = HashMap::new();
        for r in rows {
            if let (Some(Val::S(code)), Some(Val::N(v))) = (r.get(&code_col), r.get(&col)) {
                *m.entry(code.clone()).or_insert(0.0) += v;
            }
        }
        m
    };
    let (jd, jc) = (sum_by(&jrn, 'C', 'F'), sum_by(&jrn, 'C', 'G'));
    let (ad, ac) = (sum_by(&adj, 'E', 'G'), sum_by(&adj, 'E', 'H'));
    let mut ob: HashMap<&str, f64> = HashMap::new();
    for o in input.opening {
        *ob.entry(o.code.as_str()).or_insert(0.0) += o.debit - o.credit;
    }
    let get = |m: &HashMap<String, f64>, k: &str| m.get(k).copied().unwrap_or(0.0);

    let tb: Vec<TbRow> = input
        .coa
        .iter()
        .map(|a| {
            let opening = ob.get(a.code.as_str()).copied().unwrap_or(0.0);
            let (journal_debit, journal_credit) = (get(&jd, &a.code), get(&jc, &a.code));
            let (adj_debit, adj_credit) = (get(&ad, &a.code), get(&ac, &a.code));
            let pre_balance = opening + journal_debit - journal_credit;
            let adj_balance = pre_balance + adj_debit - adj_credit;
            TbRow {
                code: a.code.clone(),
                name: a.name.clone(),
                normal: a.normal.clone(),
                opening,
                journal_debit,
                journal_credit,
                adj_debit,
                adj_credit,
                pre_balance,
                adj_balance,
            }
        })
        .collect();

    let tables = Tables {
        atb: tb
            .iter()
            .map(|r| {
                row(&[
                    ('A', s(&r.code)),
                    ('D', Val::N(r.adj_balance.max(0.0))),
                    ('E', Val::N((-r.adj_balance).max(0.0))),
                ])
            })
            .collect(),
        ob: input
            .opening
            .iter()
            .map(|o| {
                row(&[
                    ('A', s(&o.code)),
                    ('C', Val::N(o.debit)),
                    ('D', Val::N(o.credit)),
                ])
            })
            .collect(),
        jrn,
        adj,
        gl: tb
            .iter()
            .map(|r| {
                row(&[
                    ('L', s(&r.code)),
                    ('P', Val::N(r.journal_debit + r.adj_debit)),
                    ('Q', Val::N(r.journal_credit + r.adj_credit)),
                ])
            })
            .collect(),
    };
    Ledger { tb, tables }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Stage {
    Pre,
    Adjusted,
}

/// Total kolom debit/kredit neraca saldo: saldo positif = debit, negatif = kredit.
pub fn tb_totals(tb: &[TbRow], stage: Stage) -> (f64, f64) {
    let (mut debit, mut credit) = (0.0, 0.0);
    for r in tb {
        let b = if stage == Stage::Pre {
            r.pre_balance
        } else {
            r.adj_balance
        };
        if b > 0.0 {
            debit += b;
        } else {
            credit += -b;
        }
    }
    (debit, credit)
}
