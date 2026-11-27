//! Pemeriksaan konsistensi antar-laporan (sheet 23) dan rekonsiliasi dengan kunci. Setara src/engine/checks.ts.
use crate::closing::{post_closing_tb, ClosingInput};
use crate::excel::xround;
use crate::ledger::{tb_totals, Stage};
use crate::types::{Cell, Row, Val};
use crate::Report;

#[derive(Clone, Debug)]
pub struct Check {
    pub label: &'static str,
    pub a: f64,
    pub b: f64,
    pub ok: bool,
}

/// Pos kunci bagian M (sheet 22) -> id sel laporan yang harus sama.
pub const KEY_STATEMENT_CELLS: [(&str, &str); 14] = [
    ("Total pendapatan (penjualan neto + jasa)", "S12_B11"),
    ("Laba kotor", "S12_B14"),
    ("Laba usaha (EBIT)", "S12_B36"),
    ("Laba sebelum pajak", "S12_B48"),
    ("Total beban pajak penghasilan", "S12_B52"),
    ("Laba bersih tahun berjalan", "S12_B53"),
    ("Saldo laba akhir", "S13_D9"),
    ("Total aset", "S14_B31"),
    ("Total liabilitas", "S14_B54"),
    ("Total ekuitas", "S14_B60"),
    ("Arus kas neto dari aktivitas operasi", "S15_B28"),
    ("Arus kas neto dari aktivitas investasi", "S15_B35"),
    ("Arus kas neto dari aktivitas pendanaan", "S15_B42"),
    ("Kas dan setara kas akhir tahun", "S15_B47"),
];

fn col_sum(rows: &[Row], col: char) -> f64 {
    rows.iter()
        .map(|r| {
            if let Some(Val::N(v)) = r.get(&col) {
                *v
            } else {
                0.0
            }
        })
        .sum()
}

pub fn run_checks(report: &Report, closing: &ClosingInput) -> Vec<Check> {
    let n = |id: &str| report.cells.get(id).map(Cell::num).unwrap_or(0.0);
    let (pre_d, pre_c) = tb_totals(&report.tb, Stage::Pre);
    let (adj_d, adj_c) = tb_totals(&report.tb, Stage::Adjusted);
    let pc = post_closing_tb(&report.tb, closing);
    let t = &report.tables;
    let (gl_d, gl_c) = (col_sum(&t.gl, 'P'), col_sum(&t.gl, 'Q'));
    let jrn_d = col_sum(&t.jrn, 'F') + col_sum(&t.adj, 'G');
    let jrn_c = col_sum(&t.jrn, 'G') + col_sum(&t.adj, 'H');
    let gl_net: f64 = report.tb.iter().map(|r| r.adj_balance).sum();
    let gl_pos: f64 = report.tb.iter().map(|r| r.adj_balance.max(0.0)).sum();
    let rows: [(&'static str, f64, f64); 14] = [
        (
            "Neraca Saldo (09): total debit = total kredit",
            pre_d,
            pre_c,
        ),
        (
            "Neraca Saldo Disesuaikan (11): total debit = total kredit",
            adj_d,
            adj_c,
        ),
        (
            "Laba bersih (12) = laba bersih pada Laporan Arus Kas (15)",
            n("S12_B53"),
            n("S15_B6"),
        ),
        (
            "Saldo laba akhir (13) = saldo laba pada Laporan Posisi Keuangan (14)",
            n("S13_D9"),
            n("S14_B59"),
        ),
        (
            "Total aset (14) = total liabilitas + ekuitas (14)",
            n("S14_B31"),
            n("S14_B62"),
        ),
        (
            "Total aset awal (14) = total liabilitas + ekuitas awal (14)",
            n("S14_C31"),
            n("S14_C62"),
        ),
        (
            "Kas akhir hasil rekonsiliasi arus kas (15) = kas pada neraca saldo disesuaikan",
            n("S15_B47"),
            n("S15_B57"),
        ),
        (
            "Arus kas operasi tidak langsung (15) = arus kas operasi dari jurnal (15)",
            n("S15_B28"),
            n("S15_B60"),
        ),
        (
            "Neraca Saldo Setelah Penutupan (17): total debit = total kredit",
            pc.debit,
            pc.credit,
        ),
        (
            "Total ekuitas akhir (13) = total ekuitas pada Laporan Posisi Keuangan (14)",
            n("S13_E9"),
            n("S14_B60"),
        ),
        (
            "Buku Besar (08): total mutasi debit = jurnal umum + jurnal penyesuaian",
            gl_d,
            jrn_d,
        ),
        (
            "Buku Besar (08): total mutasi kredit = jurnal umum + jurnal penyesuaian",
            gl_c,
            jrn_c,
        ),
        (
            "Buku Besar (08): jumlah saldo akhir seluruh akun (D-K) = 0",
            gl_net,
            0.0,
        ),
        (
            "Neraca Saldo Disesuaikan (11) = saldo akhir Buku Besar (08): total debit",
            adj_d,
            gl_pos,
        ),
    ];
    rows.iter()
        .map(|&(label, a, b)| Check {
            label,
            a,
            b,
            ok: xround(a - b, 0.0) == 0.0,
        })
        .collect()
}

#[derive(Clone, Debug)]
pub struct Reconciliation {
    pub item: &'static str,
    pub cell: &'static str,
    pub user: f64,
    pub key: f64,
    pub ok: bool,
}

/// Rekonsiliasi 14 angka laporan pengguna dengan kunci (bagian M).
pub fn reconcile_with_key(report: &Report, expected: &[(String, f64)]) -> Vec<Reconciliation> {
    KEY_STATEMENT_CELLS
        .iter()
        .map(|&(item, cell)| {
            let key = expected
                .iter()
                .find(|(i, _)| i == item)
                .map(|(_, v)| *v)
                .unwrap_or(0.0);
            let user = report.cells.get(cell).map(Cell::num).unwrap_or(0.0);
            Reconciliation {
                item,
                cell,
                user,
                key,
                ok: (user - key).abs() <= 1.0,
            }
        })
        .collect()
}
