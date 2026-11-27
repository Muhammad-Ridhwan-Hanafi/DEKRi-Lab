//! Buku pembantu per pihak dan kartu persediaan; turunan murni dari jurnal pengguna. Port src/engine/subledger.ts.
use crate::types::JournalLine;
use std::collections::BTreeMap;

pub struct TxnRef<'a> {
    pub no: u32,
    pub date: &'a str,
    pub party: &'a str,
    pub topic: &'a str,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Movement {
    pub no: u32,
    pub date: String,
    pub party: String,
    pub topic: String,
    pub debit: f64,
    pub credit: f64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct PartyTotal {
    pub party: String,
    pub debit: f64,
    pub credit: f64,
    pub net: f64,
    pub count: u32,
}

fn used(lines: Option<&Vec<JournalLine>>, code: &str) -> (f64, f64) {
    lines
        .map(|ls| {
            ls.iter()
                .filter(|l| l.code.as_deref() == Some(code))
                .fold((0.0, 0.0), |t, l| (t.0 + l.debit, t.1 + l.credit))
        })
        .unwrap_or((0.0, 0.0))
}

/// Mutasi akun kontrol per transaksi, urut nomor. Transaksi tanpa mutasi pada akun itu dilewati.
pub fn movements(
    code: &str,
    txns: &[TxnRef],
    journal: &BTreeMap<String, Vec<JournalLine>>,
) -> Vec<Movement> {
    txns.iter()
        .filter_map(|t| {
            let (debit, credit) = used(journal.get(&t.no.to_string()), code);
            (debit != 0.0 || credit != 0.0).then(|| Movement {
                no: t.no,
                date: t.date.into(),
                party: t.party.into(),
                topic: t.topic.into(),
                debit,
                credit,
            })
        })
        .collect()
}

pub fn by_party(moves: &[Movement]) -> Vec<PartyTotal> {
    let mut m: Vec<PartyTotal> = Vec::new();
    for v in moves {
        let i = match m.iter().position(|p| p.party == v.party) {
            Some(i) => i,
            None => {
                m.push(PartyTotal {
                    party: v.party.clone(),
                    debit: 0.0,
                    credit: 0.0,
                    net: 0.0,
                    count: 0,
                });
                m.len() - 1
            }
        };
        let p = &mut m[i];
        p.debit += v.debit;
        p.credit += v.credit;
        p.net = p.debit - p.credit;
        p.count += 1;
    }
    m.sort_by_key(|a| a.party.to_lowercase());
    m
}

#[derive(Clone, Debug, PartialEq)]
pub struct Reconciliation {
    pub opening: f64,
    pub mutation: f64,
    pub expected: f64,
    pub control: f64,
    pub ok: bool,
}
/// Saldo awal + mutasi semua pihak harus sama dengan saldo akun kontrol di buku besar (sebelum penyesuaian).
pub fn reconcile(opening: f64, moves: &[Movement], control_pre: f64) -> Reconciliation {
    let mutation: f64 = moves.iter().map(|v| v.debit - v.credit).sum();
    let expected = opening + mutation;
    Reconciliation {
        opening,
        mutation,
        expected,
        control: control_pre,
        ok: expected == control_pre,
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct InventoryRow {
    pub no: Option<u32>,
    pub date: String,
    pub note: String,
    pub in_amount: f64,
    pub out_amount: f64,
    pub balance: f64,
}
/// Kartu persediaan dalam nilai rupiah (data kasus tidak memuat kuantitas).
pub fn inventory_card(
    opening: f64,
    txns: &[TxnRef],
    journal: &BTreeMap<String, Vec<JournalLine>>,
    code: &str,
) -> Vec<InventoryRow> {
    let mut rows = vec![InventoryRow {
        no: None,
        date: String::new(),
        note: "Saldo awal".into(),
        in_amount: 0.0,
        out_amount: 0.0,
        balance: opening,
    }];
    let mut bal = opening;
    for m in movements(code, txns, journal) {
        bal += m.debit - m.credit;
        rows.push(InventoryRow {
            no: Some(m.no),
            date: m.date,
            note: m.topic,
            in_amount: m.debit,
            out_amount: m.credit,
            balance: bal,
        });
    }
    rows
}
