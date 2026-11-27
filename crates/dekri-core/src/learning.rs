//! Jalur Belajar: materi, kuis, dan kemajuan. Port src/learning/progress.ts; isi materi dibangkitkan dari modules.ts (tools/export_content.ts).
use crate::derive::{summarize, Ctx, ItemKind};
use crate::ledger::{tb_totals, Stage};
use crate::state::{LearningState, UserState};
use serde::Deserialize;
use std::collections::{BTreeMap, HashSet};
use std::sync::OnceLock;

pub const PASS_RATIO: f64 = 2.0 / 3.0;

#[derive(Clone, Debug, Deserialize)]
pub struct Question {
    pub q: String,
    pub options: Vec<String>,
    pub answer: usize,
    pub why: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct VariantRef {
    pub pattern: String,
    pub seed: i64,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Example {
    pub case_text: Option<String>,
    pub solution_text: Option<String>,
    pub variant: Option<VariantRef>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct PracticeLink {
    pub label: String,
    pub href: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct LearnModule {
    pub id: String,
    pub no: u32,
    pub title: String,
    pub prereq: Vec<String>,
    pub objectives: Vec<String>,
    pub concept: String,
    pub theory: Vec<String>,
    pub example: Example,
    pub practice: Option<PracticeLink>,
    pub quiz: Vec<Question>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct JurnalStd {
    pub judul: String,
    pub baris: Vec<String>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct Materi {
    pub bab: u32,
    pub title: String,
    pub ringkas: String,
    pub jurnal: Vec<JurnalStd>,
    pub rumus: Vec<String>,
    pub jebakan: Vec<String>,
    pub scenarios: Vec<u32>,
}

pub fn modules() -> &'static [LearnModule] {
    static M: OnceLock<Vec<LearnModule>> = OnceLock::new();
    M.get_or_init(|| {
        serde_json::from_str(include_str!("../data/modules.json")).expect("modules.json rusak")
    })
}
pub fn materi() -> &'static [Materi] {
    static M: OnceLock<Vec<Materi>> = OnceLock::new();
    M.get_or_init(|| {
        serde_json::from_str(include_str!("../data/materi.json")).expect("materi.json rusak")
    })
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LearnStatus {
    NotStarted,
    InProgress,
    Completed,
}
impl LearnStatus {
    pub fn label(self) -> &'static str {
        match self {
            LearnStatus::NotStarted => "Belum dimulai",
            LearnStatus::InProgress => "Sedang berjalan",
            LearnStatus::Completed => "Selesai",
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct PracticeProgress {
    pub done: usize,
    pub target: usize,
    pub label: &'static str,
}

/// Syarat latihan per materi, dihitung dari jawaban nyata (item yang kuncinya dibuka tidak dihitung).
pub fn practice_map(state: &UserState, ctx: &Ctx) -> BTreeMap<&'static str, PracticeProgress> {
    let c = |k: ItemKind| summarize(state, k, ctx).correct;
    let has = |ls: &Vec<crate::types::JournalLine>| {
        ls.iter().any(|l| {
            l.code.as_deref().is_some_and(|c| !c.is_empty()) && (l.debit != 0.0 || l.credit != 0.0)
        })
    };
    let filled = state.journal.values().filter(|l| has(l)).count();
    let adj_filled = state.adjusting.values().filter(|l| has(l)).count();
    let (pd, pc) = tb_totals(&ctx.report.tb, Stage::Pre);
    let (ad, ac) = tb_totals(&ctx.report.tb, Stage::Adjusted);
    let balanced = |d: f64, c: f64| d == c && d > 0.0;
    let p = |done, target, label| PracticeProgress {
        done,
        target,
        label,
    };
    BTreeMap::from([
        (
            "analisis",
            p(c(ItemKind::Ana), 10, "analisis transaksi BENAR"),
        ),
        ("jurnal", p(c(ItemKind::Txn), 20, "jurnal transaksi BENAR")),
        (
            "buku-besar",
            p(filled, 20, "transaksi sudah dijurnal (buku besar terisi)"),
        ),
        (
            "neraca-saldo",
            p(
                if balanced(pd, pc) { filled.min(30) } else { 0 },
                30,
                "transaksi dijurnal dengan neraca saldo seimbang",
            ),
        ),
        (
            "penyesuaian",
            p(c(ItemKind::Adj), 10, "jurnal penyesuaian BENAR"),
        ),
        (
            "ns-penyesuaian",
            p(
                if balanced(ad, ac) {
                    adj_filled.min(10)
                } else {
                    0
                },
                10,
                "penyesuaian dijurnal dengan neraca saldo setelah penyesuaian seimbang",
            ),
        ),
        (
            "laporan",
            p(
                usize::from(balanced(ad, ac) && ctx.net_income != 0.0),
                1,
                "laporan tersusun dari jawaban Anda (seimbang dan ada laba/rugi)",
            ),
        ),
        (
            "penutup",
            p(c(ItemKind::Clo), 10, "baris jurnal penutup BENAR"),
        ),
        (
            "pasca-penutup",
            p(c(ItemKind::Clo), 20, "baris jurnal penutup BENAR"),
        ),
    ])
}

#[derive(Clone, Debug)]
pub struct ModuleStatus {
    pub module: &'static LearnModule,
    pub status: LearnStatus,
    pub locked: bool,
    pub missing: Vec<&'static LearnModule>,
    pub percent: u32,
    pub quiz_best: f64,
    pub attempts: u32,
    pub passed: bool,
    pub practice: Option<PracticeProgress>,
    pub practice_done: bool,
}

pub fn module_by_id(id: &str) -> Option<&'static LearnModule> {
    modules().iter().find(|m| m.id == id)
}

pub fn module_statuses(
    learning: &LearningState,
    practice: &BTreeMap<&'static str, PracticeProgress>,
) -> Vec<ModuleStatus> {
    let mut out = Vec::new();
    let mut completed: HashSet<&str> = HashSet::new();
    for m in modules() {
        let q = learning.quiz.get(&m.id);
        let best = q.map(|q| q.best).unwrap_or(0.0);
        let passed = best >= PASS_RATIO - 1e-9;
        let p = practice.get(m.id.as_str()).cloned();
        let practice_done = p.as_ref().is_none_or(|p| p.done >= p.target);
        let done = passed && practice_done;
        let missing: Vec<&'static LearnModule> = m
            .prereq
            .iter()
            .filter(|id| !completed.contains(id.as_str()))
            .filter_map(|id| module_by_id(id))
            .collect();
        let parts = if p.is_some() { 2.0 } else { 1.0 };
        let quiz_part = if passed { 1.0 } else { best };
        let practice_part = p
            .as_ref()
            .map(|p| (p.done as f64 / p.target as f64).min(1.0))
            .unwrap_or(0.0);
        let started = q.is_some_and(|q| q.attempts > 0) || p.as_ref().is_some_and(|p| p.done > 0);
        if done {
            completed.insert(m.id.as_str());
        }
        out.push(ModuleStatus {
            module: m,
            status: if done {
                LearnStatus::Completed
            } else if started {
                LearnStatus::InProgress
            } else {
                LearnStatus::NotStarted
            },
            locked: !missing.is_empty(),
            missing,
            percent: (((quiz_part + practice_part) / parts) * 100.0).round() as u32,
            quiz_best: best,
            attempts: q.map(|q| q.attempts).unwrap_or(0),
            passed,
            practice: p,
            practice_done,
        });
    }
    out
}

pub fn overall_percent(s: &[ModuleStatus]) -> u32 {
    (s.iter().map(|x| x.percent as f64).sum::<f64>() / s.len().max(1) as f64).round() as u32
}
pub fn recommend(s: &[ModuleStatus]) -> Option<&ModuleStatus> {
    s.iter()
        .find(|x| x.status != LearnStatus::Completed && !x.locked)
}

#[derive(Clone, Debug)]
pub struct QuizResult {
    pub correct: usize,
    pub total: usize,
    pub passed: bool,
    pub items: Vec<(i32, bool)>,
}
pub fn grade_quiz(quiz: &[Question], chosen: &[i32]) -> QuizResult {
    let items: Vec<(i32, bool)> = quiz
        .iter()
        .enumerate()
        .map(|(i, q)| {
            let c = chosen
                .get(i)
                .copied()
                .filter(|c| *c >= 0 && (*c as usize) < q.options.len())
                .unwrap_or(-1);
            (c, c >= 0 && c as usize == q.answer)
        })
        .collect();
    let correct = items.iter().filter(|x| x.1).count();
    QuizResult {
        correct,
        total: quiz.len(),
        passed: correct as f64 / quiz.len() as f64 >= PASS_RATIO - 1e-9,
        items,
    }
}
