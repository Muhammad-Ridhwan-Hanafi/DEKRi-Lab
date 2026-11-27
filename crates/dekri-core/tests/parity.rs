//! Kesetaraan mesin Rust dengan Excel (dihitung ulang LibreOffice) dan dengan kunci, memakai fixture yang sama dengan uji TS.
use dekri_core::checks::{run_checks, KEY_STATEMENT_CELLS};
use dekri_core::closing::{expected_closing, post_closing_tb, ClosingInput};
use dekri_core::data::data;
use dekri_core::grade::*;
use dekri_core::ledger::LedgerInput;
use dekri_core::types::{Cell, EntryLines, JournalLine};
use dekri_core::{compute_report, Report};
use serde_json::Value;

fn fixture(name: &str) -> Value {
    let p = format!("{}/../../tests/parity/{name}", env!("CARGO_MANIFEST_DIR"));
    serde_json::from_str(&std::fs::read_to_string(&p).unwrap_or_else(|e| panic!("{p}: {e}")))
        .unwrap()
}

fn key_report() -> Report {
    let d = data();
    let journal: Vec<EntryLines> = d
        .key
        .readable_txn
        .iter()
        .filter(|t| !t.lines.is_empty())
        .map(|t| EntryLines {
            key: t.no.to_string(),
            lines: t
                .lines
                .iter()
                .map(|l| (l.code.clone(), l.debit, l.credit))
                .collect(),
        })
        .collect();
    let adjusting: Vec<EntryLines> = d
        .key
        .readable_adj
        .iter()
        .map(|a| EntryLines {
            key: a.code.clone(),
            lines: a
                .lines
                .iter()
                .map(|l| (l.code.clone(), l.debit, l.credit))
                .collect(),
        })
        .collect();
    compute_report(&LedgerInput {
        coa: &d.coa,
        opening: &d.opening,
        journal: &journal,
        adjusting: &adjusting,
        cf_sub: &d.cf_sub,
    })
}

#[test]
fn neraca_saldo_dan_14_angka_laporan_sama_dengan_kunci() {
    let r = key_report();
    assert_eq!(r.tb.len(), 84);
    for row in &r.tb {
        let e = &data().key.expected_tb[&row.code];
        assert_eq!(row.pre_balance, e.pre, "pre {}", row.code);
        assert_eq!(row.adj_balance, e.adj, "adj {}", row.code);
    }
    assert_eq!(
        data().key.expected_statements.len(),
        KEY_STATEMENT_CELLS.len()
    );
    for exp in &data().key.expected_statements {
        let (_, cell) = KEY_STATEMENT_CELLS
            .iter()
            .find(|(i, _)| *i == exp.item)
            .expect(&exp.item);
        assert_eq!(r.cells[cell].num(), exp.value, "{}", exp.item);
    }
}

#[test]
fn seluruh_298_sel_laporan_sama_dengan_excel() {
    let r = key_report();
    let fx = fixture("excel-values.json");
    let cells = fx["cells"].as_object().unwrap();
    assert_eq!(cells.len(), 298);
    let mut diffs = Vec::new();
    for (id, x) in cells {
        let mine = r
            .cells
            .get(id.as_str())
            .unwrap_or_else(|| panic!("sel {id} tidak dihitung"));
        let same = match (x, mine) {
            (Value::Number(n), Cell::Num(m)) => {
                let n = n.as_f64().unwrap();
                (n - m).abs() <= 1e-6 * n.abs().max(1.0)
            }
            (Value::String(s), Cell::Str(m)) => s == m,
            _ => false,
        };
        if !same {
            diffs.push(format!("{id}: excel={x} engine={mine:?}"));
        }
    }
    assert!(diffs.is_empty(), "{:#?}", &diffs[..diffs.len().min(20)]);
}

#[test]
fn neraca_saldo_penutupan_dan_pemeriksaan_sheet_23() {
    let r = key_report();
    let fx = fixture("excel-values.json");
    for row in &r.tb {
        assert_eq!(
            row.pre_balance,
            fx["preTB"][&row.code].as_f64().unwrap(),
            "09 {}",
            row.code
        );
        assert_eq!(
            row.adj_balance,
            fx["adjTB"][&row.code].as_f64().unwrap(),
            "11 {}",
            row.code
        );
    }
    let ni = r.cells["S12_B53"].num();
    let closing: ClosingInput = data()
        .closing
        .closing_rows
        .iter()
        .map(|c| (c.code.clone(), expected_closing(&c.code, &r.tb, ni)))
        .collect();
    let pc = post_closing_tb(&r.tb, &closing);
    for row in &pc.rows {
        assert_eq!(
            row.debit - row.credit,
            fx["postClosingTB"][&row.code].as_f64().unwrap(),
            "17 {}",
            row.code
        );
    }
    assert!(fx["checks"]
        .as_array()
        .unwrap()
        .iter()
        .all(|c| c.as_str().unwrap().starts_with("BENAR")));
    let checks = run_checks(&r, &closing);
    assert_eq!(checks.len(), 14);
    assert!(
        checks.iter().all(|c| c.ok),
        "{:?}",
        checks.iter().filter(|c| !c.ok).collect::<Vec<_>>()
    );
}

fn excel_category(text: &str) -> &'static str {
    for (p, c) in [
        ("BELUM DIISI", "empty"),
        ("SALDO TIDAK SEIMBANG", "unbalanced"),
        ("AKUN SALAH", "extra-account"),
        ("BENAR", "ok"),
        ("SISI DEBIT/KREDIT SALAH", "wrong-side"),
        ("AKUN/NOMINAL PERLU DIPERIKSA", "check-amount"),
        ("NOMINAL SALAH", "wrong-amount"),
        (
            "PERIKSA - transaksi ini tidak memerlukan jurnal",
            "not-needed",
        ),
    ] {
        if text.starts_with(p) {
            return c;
        }
    }
    panic!("status Excel tidak dikenal: {text}")
}
fn reason_name(r: Reason) -> &'static str {
    match r {
        Reason::Empty => "empty",
        Reason::Ok => "ok",
        Reason::Unbalanced => "unbalanced",
        Reason::ExtraAccount => "extra-account",
        Reason::WrongSide => "wrong-side",
        Reason::CheckAmount => "check-amount",
        Reason::WrongAmount => "wrong-amount",
        Reason::NotNeeded => "not-needed",
        Reason::Needed => "needed",
        Reason::Incomplete => "incomplete",
    }
}

#[test]
fn penilaian_sama_dengan_excel_pada_2100_jawaban_salah() {
    let cases = fixture("excel-grading.json");
    let cases = cases.as_array().unwrap();
    assert!(cases.len() > 2000);
    let k = &data().key;
    let mut diffs = Vec::new();
    for c in cases {
        let kind = c["kind"].as_str().unwrap();
        let id = c["id"].as_str().unwrap();
        let lines: Vec<JournalLine> = c["lines"]
            .as_array()
            .unwrap()
            .iter()
            .enumerate()
            .map(|(i, l)| JournalLine {
                id: format!("t{i}"),
                code: Some(l["code"].as_str().unwrap().into()),
                debit: l["debit"].as_f64().unwrap(),
                credit: l["credit"].as_f64().unwrap(),
                memo: String::new(),
            })
            .collect();
        let g = if kind == "adj" {
            grade_journal(&lines, &k.adj_net[id], DEFAULT_TOL)
        } else if let Some(net) = k.txn_net.get(id) {
            grade_journal(&lines, net, DEFAULT_TOL)
        } else {
            grade_no_journal(&lines, c["decided"].as_bool().unwrap())
        };
        let want = excel_category(c["excel"].as_str().unwrap());
        let got = reason_name(g.reason);
        let same_adj = kind == "adj"
            && want == "wrong-amount"
            && (got == "check-amount" || got == "wrong-amount");
        if got != want && !same_adj {
            diffs.push(format!(
                "{kind} {id} [{}] excel={} app={got}",
                c["mutation"], c["excel"]
            ));
        }
        assert_eq!(g.status == Status::Benar, want == "ok", "{kind} {id}");
    }
    assert!(diffs.is_empty(), "{:#?}", &diffs[..diffs.len().min(20)]);
}
