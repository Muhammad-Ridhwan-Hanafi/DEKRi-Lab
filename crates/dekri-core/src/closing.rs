//! Jurnal penutup dan neraca saldo setelah penutupan. Setara src/engine/closing.ts.
use crate::excel::xround;
use crate::grade::{res, GradeResult, Reason, Status};
use crate::types::TbRow;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ClosingEntry {
    #[serde(default, serialize_with = "crate::types::ser_num")]
    pub debit: f64,
    #[serde(default, serialize_with = "crate::types::ser_num")]
    pub credit: f64,
}
pub type ClosingInput = BTreeMap<String, ClosingEntry>;

pub const INCOME_SUMMARY: &str = "3-3000";
pub const DIVIDENDS: &str = "3-9000";

fn bal_of(tb: &[TbRow], code: &str) -> f64 {
    tb.iter()
        .find(|r| r.code == code)
        .map(|r| r.adj_balance)
        .unwrap_or(0.0)
}

/// Isian benar satu baris penutup (sheet 16): akun nominal ditutup ke sisi lawannya.
pub fn expected_closing(code: &str, tb: &[TbRow], net_income: f64) -> ClosingEntry {
    let bal = bal_of(tb, code);
    if code == INCOME_SUMMARY {
        return if net_income >= 0.0 {
            ClosingEntry {
                debit: net_income,
                credit: 0.0,
            }
        } else {
            ClosingEntry {
                debit: 0.0,
                credit: -net_income,
            }
        };
    }
    if code == DIVIDENDS {
        return ClosingEntry {
            debit: 0.0,
            credit: bal,
        };
    }
    ClosingEntry {
        debit: (-bal).max(0.0),
        credit: bal.max(0.0),
    }
}

pub fn grade_closing_row(
    code: &str,
    entry: Option<&ClosingEntry>,
    tb: &[TbRow],
    net_income: f64,
    journal_has_entries: bool,
) -> GradeResult {
    let e = entry.copied().unwrap_or_default();
    let bal = bal_of(tb, code);
    let empty = e.debit == 0.0 && e.credit == 0.0;
    let ok = || res(Status::Benar, Reason::Ok, "Benar.");
    let bad = |m: &str| res(Status::Periksa, Reason::WrongAmount, m);
    let blank = || res(Status::Belum, Reason::Empty, "Belum diisi.");
    let same = |a: f64, b: f64| xround(a - b, 0.0) == 0.0;

    if code == INCOME_SUMMARY {
        if empty {
            return blank();
        }
        let exp = expected_closing(code, tb, net_income);
        if same(e.debit, exp.debit) && same(e.credit, exp.credit) {
            return ok();
        }
        if net_income < 0.0 && e.debit != 0.0 && e.credit == 0.0 {
            return bad("Laporan Laba Rugi Anda menunjukkan rugi: Ikhtisar Laba Rugi dikredit (Saldo Laba didebit).");
        }
        if net_income >= 0.0 && e.credit != 0.0 && e.debit == 0.0 {
            return bad("Laporan Laba Rugi Anda menunjukkan laba: Ikhtisar Laba Rugi didebit (Saldo Laba dikredit).");
        }
        return bad("Selisih dengan laba/rugi bersih pada Laporan Laba Rugi.");
    }
    if code == DIVIDENDS {
        if empty && (xround(bal, 0.0) != 0.0 || !journal_has_entries) {
            return blank();
        }
        return if same(e.credit, bal) {
            ok()
        } else {
            bad("Bandingkan dengan saldo pada neraca saldo setelah penyesuaian.")
        };
    }
    if empty && (xround(bal, 0.0) != 0.0 || !journal_has_entries) {
        return blank();
    }
    let exp = expected_closing(code, tb, net_income);
    if same(e.debit, exp.debit) && same(e.credit, exp.credit) {
        ok()
    } else {
        bad("Bandingkan dengan saldo pada neraca saldo setelah penyesuaian.")
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PostClosingRow {
    pub code: String,
    pub name: String,
    pub debit: f64,
    pub credit: f64,
}
pub struct PostClosing {
    pub rows: Vec<PostClosingRow>,
    pub debit: f64,
    pub credit: f64,
}

/// Neraca saldo setelah penutupan (sheet 17): hanya akun riil; Saldo Laba memuat jurnal penutup pengguna.
pub fn post_closing_tb(tb: &[TbRow], closing: &ClosingInput) -> PostClosing {
    let g = |c: &str| closing.get(c).copied().unwrap_or_default();
    let rows: Vec<PostClosingRow> = tb
        .iter()
        .filter(|r| {
            matches!(r.code.chars().next(), Some('1' | '2' | '3'))
                && r.code.as_bytes().get(1) == Some(&b'-')
                && r.code != INCOME_SUMMARY
                && r.code != DIVIDENDS
        })
        .map(|r| {
            let mut bal = r.adj_balance;
            if r.code == "3-2000" {
                bal = r.adj_balance - g(INCOME_SUMMARY).debit
                    + g(INCOME_SUMMARY).credit
                    + g(DIVIDENDS).credit;
            }
            PostClosingRow {
                code: r.code.clone(),
                name: r.name.clone(),
                debit: if bal > 0.0 { bal } else { 0.0 },
                credit: if bal < 0.0 { -bal } else { 0.0 },
            }
        })
        .collect();
    let debit = rows.iter().map(|r| r.debit).sum();
    let credit = rows.iter().map(|r| r.credit).sum();
    PostClosing {
        rows,
        debit,
        credit,
    }
}
