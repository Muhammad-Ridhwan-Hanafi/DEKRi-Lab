//! dekri-core: mesin akuntansi DEKRi Lab tanpa UI. Port Rust dari src/engine, src/validation, dan bagian murni src/store.
pub mod actions;
pub mod activity;
pub mod audit;
pub mod backup;
pub mod checks;
pub mod closing;
pub mod content;
pub mod data;
pub mod derive;
pub mod exam;
pub mod excel;
pub mod explain;
pub mod feedback;
pub mod grade;
pub mod hints;
pub mod impact;
pub mod learning;
pub mod ledger;
pub mod money;
pub mod review;
pub mod state;
mod statements;
pub mod subledger;
pub mod trace;
pub mod types;
pub mod variants;
pub mod weakness;

use ledger::{build_ledger, Ledger, LedgerInput};
use types::{StatementCells, Tables, TbRow};

pub use statements::compute_statements;

/// Seluruh laporan dari saldo awal dan jurnal. Tidak ada state tersembunyi.
pub struct Report {
    pub tb: Vec<TbRow>,
    pub tables: Tables,
    pub cells: StatementCells,
}

pub fn compute_report(input: &LedgerInput) -> Report {
    let Ledger { tb, tables } = build_ledger(input);
    let cells = compute_statements(&tables);
    Report { tb, tables, cells }
}

/// Tata letak laporan (judul, baris, label, sel) dari sheet 12/12A/13/14/15/15A.
pub fn statement_layout() -> &'static serde_json::Value {
    static L: std::sync::OnceLock<serde_json::Value> = std::sync::OnceLock::new();
    L.get_or_init(|| {
        serde_json::from_str(include_str!("../data/statement-layout.json"))
            .expect("statement-layout.json rusak")
    })
}
