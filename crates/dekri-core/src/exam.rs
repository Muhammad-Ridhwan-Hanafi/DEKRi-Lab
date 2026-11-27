//! Mode ujian: soal acak dijawab tanpa umpan balik, dinilai sekaligus. Tidak menyentuh progres belajar. Port src/store/exam.ts.
use crate::data::data;
use crate::derive::*;
use crate::grade::{AnalysisAnswer, Status};
use crate::state::{ScenarioAnswer, UserState};
use crate::types::JournalLine;
use crate::variants::mulberry32;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const EXAM_KINDS: [(&str, &str); 5] = [
    ("txn", "Jurnal transaksi"),
    ("adj", "Jurnal penyesuaian"),
    ("sc", "Soal skenario"),
    ("cor", "Jurnal koreksi"),
    ("err", "Deteksi kesalahan"),
];

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ExamItem {
    pub kind: String,
    pub id: String,
}
impl ExamItem {
    pub fn key(&self) -> String {
        format!("{}:{}", self.kind, self.id)
    }
    pub fn item_kind(&self) -> ItemKind {
        match self.kind.as_str() {
            "txn" => ItemKind::Txn,
            "adj" => ItemKind::Adj,
            "sc" => ItemKind::Sc,
            "cor" => ItemKind::Cor,
            _ => ItemKind::Err,
        }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ExamAnswers {
    pub journal: BTreeMap<String, Vec<JournalLine>>,
    pub adjusting: BTreeMap<String, Vec<JournalLine>>,
    pub no_journal: BTreeMap<String, bool>,
    pub scenarios: BTreeMap<String, ScenarioAnswer>,
    pub correcting: BTreeMap<String, Vec<JournalLine>>,
    pub error_type: BTreeMap<String, String>,
    /// soal yang ditandai ragu-ragu: kunci `kind:id`
    pub doubt: BTreeMap<String, bool>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Scope {
    Semua,
    Intermediate,
    Advanced,
    Expert,
    Ditandai,
    Lemah,
}
pub const SCOPES: [(Scope, &str, &str); 6] = [
    (Scope::Semua, "semua", "Semua soal"),
    (Scope::Intermediate, "Intermediate", "Tingkat Intermediate"),
    (Scope::Advanced, "Advanced", "Tingkat Advanced"),
    (Scope::Expert, "Expert", "Tingkat Expert"),
    (Scope::Ditandai, "ditandai", "Soal yang saya tandai"),
    (Scope::Lemah, "lemah", "Topik lemah (jadwal ulasan)"),
];
pub fn scope_id(s: Scope) -> &'static str {
    SCOPES
        .iter()
        .find(|x| x.0 == s)
        .map(|x| x.1)
        .unwrap_or("semua")
}
pub fn scope_label(id: &str) -> String {
    SCOPES
        .iter()
        .find(|x| x.1 == id)
        .map(|x| x.2.to_string())
        .unwrap_or_else(|| id.to_string())
}

/// Penyaring cakupan. Tingkat hanya berlaku untuk transaksi dan penyesuaian.
pub fn in_scope(scope: Scope, state: &UserState, it: &ExamItem) -> bool {
    let d = data();
    match scope {
        Scope::Semua => true,
        Scope::Ditandai => state.flags.contains(&it.key()),
        Scope::Lemah => state.review.contains_key(&it.key()),
        lvl => {
            let want = scope_id(lvl);
            match it.kind.as_str() {
                "txn" => d
                    .transactions
                    .iter()
                    .find(|t| t.no.to_string() == it.id)
                    .is_some_and(|t| t.level == want),
                "adj" => d
                    .adjustments
                    .iter()
                    .find(|a| a.code == it.id)
                    .is_some_and(|a| a.level == want),
                _ => false,
            }
        }
    }
}

pub fn pick_exam(
    count: usize,
    kinds: &[&str],
    seed: i64,
    allow: impl Fn(&ExamItem) -> bool,
) -> Vec<ExamItem> {
    let d = data();
    let mut pool: Vec<ExamItem> = Vec::new();
    let mut add = |k: &str, ids: Vec<String>| {
        pool.extend(ids.into_iter().map(|id| ExamItem { kind: k.into(), id }))
    };
    if kinds.contains(&"txn") {
        add(
            "txn",
            d.transactions.iter().map(|t| t.no.to_string()).collect(),
        );
    }
    if kinds.contains(&"adj") {
        add(
            "adj",
            d.adjustments.iter().map(|a| a.code.clone()).collect(),
        );
    }
    if kinds.contains(&"sc") {
        add("sc", d.scenarios.iter().map(|s| s.no.to_string()).collect());
    }
    if kinds.contains(&"cor") {
        add(
            "cor",
            d.correcting
                .correcting
                .iter()
                .map(|c| c.no.to_string())
                .collect(),
        );
    }
    if kinds.contains(&"err") {
        add(
            "err",
            d.correcting
                .detect
                .iter()
                .map(|c| c.no.to_string())
                .collect(),
        );
    }
    pool.retain(|it| allow(it));
    let mut rand = mulberry32(seed);
    for i in (1..pool.len()).rev() {
        let j = (rand() * (i as f64 + 1.0)).floor() as usize;
        pool.swap(i, j);
    }
    pool.truncate(count.min(pool.len()));
    pool
}

pub struct ExamScore {
    pub results: Vec<(ExamItem, ItemResult, bool)>,
    pub correct: usize,
    pub total: usize,
}

pub fn grade_exam(items: &[ExamItem], a: &ExamAnswers) -> ExamScore {
    let mut s = UserState::default();
    s.settings.validation_mode = "live".into();
    s.journal = a.journal.clone();
    s.adjusting = a.adjusting.clone();
    s.scenarios = a.scenarios.clone();
    s.correcting = a.correcting.clone();
    s.error_type = a.error_type.clone();
    for (no, v) in &a.no_journal {
        if *v {
            s.analysis.insert(
                no.clone(),
                AnalysisAnswer {
                    decision: Some("Tidak perlu jurnal".into()),
                    ..Default::default()
                },
            );
        }
    }
    let report = report_for(&s);
    let ctx = ctx_for(&s, &report);
    let results: Vec<_> = items
        .iter()
        .map(|it| {
            let r = result_for(&s, it.item_kind(), &it.id, &ctx);
            let answered = r.grade.status != Status::Belum;
            (it.clone(), r, answered)
        })
        .collect();
    let correct = results
        .iter()
        .filter(|(_, r, _)| r.grade.status == Status::Benar)
        .count();
    ExamScore {
        total: items.len(),
        correct,
        results,
    }
}
