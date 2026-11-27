//! Tipe dasar mesin. Setara dengan src/engine/types.ts.
use serde::{Deserialize, Serialize, Serializer};
use std::collections::BTreeMap;

pub type AccountCode = String;

/// Nilai sel tabel sumber (angka atau teks), seperti sel sheet Excel.
#[derive(Clone, Debug, PartialEq)]
pub enum Val {
    N(f64),
    S(String),
}
/// Baris tabel: kunci = huruf kolom sheet Excel asal.
pub type Row = BTreeMap<char, Val>;

/// Tabel sumber rumus laporan: ATB (11), OB (03), JRN (07), ADJ (10), GL (08).
#[derive(Default, Clone, Debug)]
pub struct Tables {
    pub atb: Vec<Row>,
    pub ob: Vec<Row>,
    pub jrn: Vec<Row>,
    pub adj: Vec<Row>,
    pub gl: Vec<Row>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Cell {
    Num(f64),
    Str(String),
}
impl Cell {
    pub fn num(&self) -> f64 {
        match self {
            Cell::Num(n) => *n,
            Cell::Str(_) => 0.0,
        }
    }
}
pub type StatementCells = BTreeMap<&'static str, Cell>;

/// Menulis angka bulat sebagai bilangan bulat JSON (kompatibel dengan cadangan versi web).
pub fn ser_num<S: Serializer>(v: &f64, s: S) -> Result<S::Ok, S::Error> {
    if v.is_finite() && v.fract() == 0.0 && v.abs() < 9.0e15 {
        s.serialize_i64(*v as i64)
    } else {
        s.serialize_f64(*v)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub code: AccountCode,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub normal: String, // "Debit" | "Credit"
    pub report_class: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct OpeningBalance {
    pub code: AccountCode,
    pub debit: f64,
    pub credit: f64,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Default)]
pub struct JournalLine {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub code: Option<AccountCode>,
    #[serde(default, serialize_with = "ser_num")]
    pub debit: f64,
    #[serde(default, serialize_with = "ser_num")]
    pub credit: f64,
    #[serde(default)]
    pub memo: String,
}

/// Entri jurnal siap hitung: transaksi (txn) atau penyesuaian (aj).
#[derive(Clone, Debug)]
pub struct EntryLines {
    pub key: String,
    pub lines: Vec<(AccountCode, f64, f64)>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TbRow {
    pub code: AccountCode,
    pub name: String,
    pub normal: String,
    pub opening: f64,
    pub journal_debit: f64,
    pub journal_credit: f64,
    pub adj_debit: f64,
    pub adj_credit: f64,
    pub pre_balance: f64,
    pub adj_balance: f64,
}
