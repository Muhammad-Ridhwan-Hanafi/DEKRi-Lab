//! Data kasus (PT Sumber Cahaya Elektrindo TA 2024) yang dibenamkan dari folder `data/` di akar repositori
//! (berkas JSON yang sama dengan versi web, jadi tidak ada salinan kedua).
use crate::grade::{AnalysisKey, NetMap};
use crate::types::{Account, OpeningBalance};
use indexmap::IndexMap;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::OnceLock;

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceTransaction {
    pub no: u32,
    pub date: String,
    pub level: String,
    pub topic: String,
    pub narrative: String,
    pub party: String,
    pub amount_info: String,
    pub is_distractor: bool,
}
#[derive(Clone, Debug, Deserialize)]
pub struct Adjustment {
    pub code: String,
    pub level: String,
    pub category: String,
    pub facts: String,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scenario {
    pub no: u32,
    pub topic: String,
    pub case_and_facts: String,
    pub question: String,
    pub kind: String, // "numeric" | "choice"
    pub options: Option<Vec<String>>,
    pub user_response_prompt: Option<String>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct NumberedEvent {
    pub no: u32,
    pub event: String,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CorrectingData {
    pub correcting: Vec<NumberedEvent>,
    pub detect: Vec<NumberedEvent>,
    pub error_type_options: Vec<String>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct CaseInfo {
    pub title: String,
    pub intro: String,
    pub background: Vec<Vec<Option<String>>>,
    pub policies: Vec<Vec<Option<String>>>,
    pub sak: Vec<Vec<Option<String>>>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct ClosingRowInfo {
    pub code: String,
    pub group: String,
    pub instruction: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct ReversingCase {
    pub no: u32,
    pub reversed: String,
    pub why: String,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClosingData {
    pub closing_rows: Vec<ClosingRowInfo>,
    pub reversing_cases: Vec<ReversingCase>,
    pub closing_intro: String,
    pub reversing_intro: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct ReadableLine {
    pub code: String,
    pub name: String,
    pub debit: f64,
    pub credit: f64,
}
#[derive(Clone, Debug, Deserialize)]
pub struct ReadableTxn {
    pub no: u32,
    pub date: String,
    pub level: String,
    pub topic: String,
    pub lines: Vec<ReadableLine>,
    pub explain: Option<String>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct ReadableAdj {
    pub code: String,
    pub category: String,
    pub lines: Vec<ReadableLine>,
    pub calc: Option<String>,
    pub explain: Option<String>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct ScenarioKey {
    pub key: serde_json::Value,
    pub explanation: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct TbExpect {
    pub pre: f64,
    pub adj: f64,
}
#[derive(Clone, Debug, Deserialize)]
pub struct ExpectedStatement {
    pub item: String,
    pub sheet: String,
    pub value: f64,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerKey {
    pub txn_net: IndexMap<String, NetMap>,
    pub adj_net: IndexMap<String, NetMap>,
    pub analysis: IndexMap<String, AnalysisKey>,
    pub correcting_net: IndexMap<String, NetMap>,
    pub error_type: IndexMap<String, String>,
    pub scenario: IndexMap<String, ScenarioKey>,
    pub reversing_net: IndexMap<String, NetMap>,
    pub readable_txn: Vec<ReadableTxn>,
    pub readable_adj: Vec<ReadableAdj>,
    #[serde(rename = "expectedTB")]
    pub expected_tb: IndexMap<String, TbExpect>,
    pub expected_statements: Vec<ExpectedStatement>,
    #[serde(default)]
    pub tolerance: HashMap<String, f64>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisOptions {
    pub cash_class: Vec<String>,
    pub yes_no: Vec<String>,
    pub decision: Vec<String>,
}

pub struct Data {
    pub analysis_options: AnalysisOptions,
    pub coa: Vec<Account>,
    pub opening: Vec<OpeningBalance>,
    pub transactions: Vec<SourceTransaction>,
    pub adjustments: Vec<Adjustment>,
    pub scenarios: Vec<Scenario>,
    pub correcting: CorrectingData,
    pub case: CaseInfo,
    pub closing: ClosingData,
    pub key: AnswerKey,
    /// sub-kategori arus kas per no. transaksi (dari kunci analisis)
    pub cf_sub: HashMap<String, String>,
}

/// Topik pengecoh di sumber memuat kunci; aplikasi menampilkan label netral yang tidak membocorkan jawaban.
fn neutral_topic(no: u32) -> &'static str {
    match no {
        23 => "Penawaran harga dari pemasok",
        50 => "Somasi mantan karyawan",
        63 => "Kenaikan harga pasar saham",
        67 => "Laporan umur piutang",
        82 => "Penandatanganan kontrak instalasi",
        86 => "Indikasi nilai properti investasi",
        128 => "Faktur pembelian masih terbuka",
        134 => "Faktur pembelian dari pemasok",
        144 => "Kontrak pasokan tahunan",
        145 => "Hasil stock opname persediaan",
        146 => "Deposito: bunga semester II",
        _ => "Peristiwa tanpa kategori",
    }
}

fn parse<T: for<'de> Deserialize<'de>>(name: &str, text: &str) -> T {
    serde_json::from_str(text).unwrap_or_else(|e| panic!("data/{name}.json rusak: {e}"))
}

pub fn data() -> &'static Data {
    static D: OnceLock<Data> = OnceLock::new();
    D.get_or_init(|| {
        let mut transactions: Vec<SourceTransaction> = parse(
            "transactions",
            include_str!("../../../data/transactions.json"),
        );
        for t in transactions.iter_mut().filter(|t| t.is_distractor) {
            t.topic = neutral_topic(t.no).to_string();
        }
        let key: AnswerKey = parse("answer-key", include_str!("../../../data/answer-key.json"));
        let cf_sub = key
            .analysis
            .iter()
            .filter_map(|(no, a)| a.cash_sub.clone().map(|s| (no.clone(), s)))
            .collect();
        Data {
            analysis_options: parse(
                "analysis-options",
                include_str!("../../../data/analysis-options.json"),
            ),
            coa: parse("coa", include_str!("../../../data/coa.json")),
            opening: parse(
                "opening-balances",
                include_str!("../../../data/opening-balances.json"),
            ),
            transactions,
            adjustments: parse(
                "adjustments",
                include_str!("../../../data/adjustments.json"),
            ),
            scenarios: parse("scenarios", include_str!("../../../data/scenarios.json")),
            correcting: parse(
                "correcting-cases",
                include_str!("../../../data/correcting-cases.json"),
            ),
            case: parse("case", include_str!("../../../data/case.json")),
            closing: parse(
                "closing-reversing",
                include_str!("../../../data/closing-reversing.json"),
            ),
            key,
            cf_sub,
        }
    })
}
