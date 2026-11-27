//! Aksi pengguna atas UserState (setara aksi store di src/store/useApp.ts). Murni: tidak menyentuh disk atau UI.
use crate::derive::*;
use crate::grade::Status;
use crate::learning::{grade_quiz, module_by_id, module_statuses, practice_map, QuizResult};
use crate::review::{is_review_kind, next_review, today_str, Next};
use crate::state::*;
use crate::types::JournalLine;
use std::collections::BTreeMap;

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn touch(st: &mut UserState) {
    st.updated_at = now_iso();
}

fn log_push(st: &mut UserState, kind: &str, id: &str, status: &str) {
    st.log.push(LogEntry {
        ts: now_iso(),
        kind: kind.into(),
        id: id.into(),
        status: status.into(),
    });
    if st.log.len() > LOG_MAX {
        st.log.drain(0..st.log.len() - LOG_MAX);
    }
}

/// Tombol Periksa: simpan tanda tangan jawaban, tambah percobaan, catat log, dan perbarui jadwal ulasan.
pub fn check(st: &mut UserState, kind: ItemKind, id: &str) {
    let key = item_key(kind, id);
    let report = report_for(st);
    let (_, sig) = grade_item(st, kind, id, &ctx_for(st, &report));
    st.checked.insert(key.clone(), sig);
    *st.attempts.entry(key.clone()).or_insert(0.0) += 1.0;
    let r = result_for(st, kind, id, &ctx_for(st, &report));
    let status = match r.shown {
        Some(Status::Benar) => Status::Benar,
        Some(Status::Periksa) => Status::Periksa,
        _ => Status::Belum,
    };
    log_push(st, kind.tag(), id, status.label());
    if is_review_kind(kind) && !st.revealed.contains(&key) && status != Status::Belum {
        match next_review(st.review.get(&key), status, &today_str()) {
            Next::Unchanged => {}
            Next::Remove => {
                st.review.remove(&key);
            }
            Next::Set(e) => {
                st.review.insert(key, e);
            }
        }
    }
    touch(st);
}

/// Periksa banyak item sekaligus (tanpa log dan jadwal ulasan, seperti versi web).
pub fn check_many(st: &mut UserState, kind: ItemKind, ids: &[String]) {
    let report = report_for(st);
    let sigs: Vec<(String, String)> = ids
        .iter()
        .map(|id| {
            (
                item_key(kind, id),
                grade_item(st, kind, id, &ctx_for(st, &report)).1,
            )
        })
        .collect();
    for (key, sig) in sigs {
        st.checked.insert(key.clone(), sig);
        *st.attempts.entry(key).or_insert(0.0) += 1.0;
    }
    touch(st);
}

pub fn reveal(st: &mut UserState, kind: ItemKind, id: &str) {
    let key = item_key(kind, id);
    if !st.revealed.contains(&key) {
        st.revealed.push(key);
        touch(st);
    }
}

pub fn open_hint(st: &mut UserState, kind: ItemKind, id: &str) {
    let e = st.hints.entry(item_key(kind, id)).or_insert(0);
    if *e < 3 {
        *e += 1;
        touch(st);
    }
}

pub fn toggle_flag(st: &mut UserState, kind: ItemKind, id: &str) {
    let key = item_key(kind, id);
    if let Some(i) = st.flags.iter().position(|k| *k == key) {
        st.flags.remove(i);
    } else {
        st.flags.push(key);
    }
    touch(st);
}

pub fn set_note(st: &mut UserState, kind: ItemKind, id: &str, text: &str) {
    let key = item_key(kind, id);
    if text.trim().is_empty() {
        st.notes.remove(&key);
    } else {
        st.notes.insert(key, text.to_string());
    }
    touch(st);
}

pub fn add_exam(st: &mut UserState, e: ExamRecord) {
    st.exams.push(e);
    if st.exams.len() > EXAMS_MAX {
        st.exams.drain(0..st.exams.len() - EXAMS_MAX);
    }
    touch(st);
}

/// Catat satu percobaan di luar soal utama (varian, pajak, paket soal).
pub fn log_attempt(st: &mut UserState, kind: &str, id: &str, status: Status) {
    let s = match status {
        Status::Benar => "BENAR",
        Status::Periksa => "PERIKSA",
        Status::Belum => "BELUM DIISI",
    };
    log_push(st, kind, id, s);
    touch(st);
}

/// Kosongkan jawaban satu soal agar bisa dikerjakan ulang dari awal.
pub fn start_review(st: &mut UserState, kind: ItemKind, id: &str) {
    st.checked.remove(&item_key(kind, id));
    match kind {
        ItemKind::Txn => {
            st.journal.insert(id.into(), vec![]);
            st.analysis.entry(id.into()).or_default().decision = None;
        }
        ItemKind::Adj => {
            st.adjusting.insert(id.into(), vec![]);
        }
        ItemKind::Sc => {
            let reasoning = st.scenarios.get(id).and_then(|a| a.reasoning.clone());
            st.scenarios.insert(
                id.into(),
                ScenarioAnswer {
                    answer: None,
                    reasoning,
                },
            );
        }
        _ => {}
    }
    touch(st);
}

/// Nilai kuis materi. None bila materi terkunci (prasyarat belum selesai) atau tidak dikenal; tidak mencatat apa pun.
pub fn submit_quiz(st: &mut UserState, module_id: &str, chosen: &[i32]) -> Option<QuizResult> {
    let m = module_by_id(module_id)?;
    let report = report_for(st);
    let ctx = ctx_for(st, &report);
    let statuses = module_statuses(&st.learning, &practice_map(st, &ctx));
    if statuses.iter().find(|s| s.module.id == module_id)?.locked {
        return None;
    }
    let r = grade_quiz(&m.quiz, chosen);
    let ts = now_iso();
    let prev = st.learning.quiz.get(module_id).cloned();
    let best = prev
        .as_ref()
        .map(|p| p.best)
        .unwrap_or(0.0)
        .max(r.correct as f64 / r.total as f64);
    st.learning.quiz.insert(
        module_id.into(),
        QuizEntry {
            best,
            attempts: prev.map(|p| p.attempts).unwrap_or(0) + 1,
            last_at: ts.clone(),
        },
    );
    st.learning.history.push(QuizHistory {
        ts,
        module: module_id.into(),
        correct: r.correct as u32,
        total: r.total as u32,
    });
    if st.learning.history.len() > LEARN_HISTORY_MAX {
        st.learning
            .history
            .drain(0..st.learning.history.len() - LEARN_HISTORY_MAX);
    }
    touch(st);
    Some(r)
}

/// Bagian jawaban yang ikut undo/redo (bukan log, jadwal ulasan, atau ujian).
#[derive(Clone, Debug, PartialEq)]
pub struct Content {
    analysis: BTreeMap<String, crate::grade::AnalysisAnswer>,
    journal: BTreeMap<String, Vec<JournalLine>>,
    adjusting: BTreeMap<String, Vec<JournalLine>>,
    closing: ClosingMap,
    reversing: BTreeMap<String, Vec<JournalLine>>,
    correcting: BTreeMap<String, Vec<JournalLine>>,
    error_type: BTreeMap<String, String>,
    scenarios: BTreeMap<String, ScenarioAnswer>,
    pajak: BTreeMap<String, String>,
    tables: BTreeMap<String, String>,
}
type ClosingMap = BTreeMap<String, crate::closing::ClosingEntry>;

pub fn pick_content(st: &UserState) -> Content {
    Content {
        analysis: st.analysis.clone(),
        journal: st.journal.clone(),
        adjusting: st.adjusting.clone(),
        closing: st.closing.clone(),
        reversing: st.reversing.clone(),
        correcting: st.correcting.clone(),
        error_type: st.error_type.clone(),
        scenarios: st.scenarios.clone(),
        pajak: st.pajak.clone(),
        tables: st.tables.clone(),
    }
}
pub fn apply_content(st: &mut UserState, c: Content) {
    st.analysis = c.analysis;
    st.journal = c.journal;
    st.adjusting = c.adjusting;
    st.closing = c.closing;
    st.reversing = c.reversing;
    st.correcting = c.correcting;
    st.error_type = c.error_type;
    st.scenarios = c.scenarios;
    st.pajak = c.pajak;
    st.tables = c.tables;
    touch(st);
}
