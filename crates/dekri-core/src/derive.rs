//! Turunan murni dari UserState: masukan mesin dan status tiap item. Setara bagian inti src/store/derive.ts.
use crate::closing::grade_closing_row;
use crate::data::data;
use crate::grade::*;
use crate::state::{signature_lines, UserState};
use crate::types::{EntryLines, JournalLine};
use crate::{compute_report, ledger::LedgerInput, Report};
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum ItemKind {
    Ana,
    Txn,
    Adj,
    Clo,
    Rev,
    Cor,
    Err,
    Sc,
}
impl ItemKind {
    pub fn tag(self) -> &'static str {
        match self {
            ItemKind::Ana => "ana",
            ItemKind::Txn => "txn",
            ItemKind::Adj => "adj",
            ItemKind::Clo => "clo",
            ItemKind::Rev => "rev",
            ItemKind::Cor => "cor",
            ItemKind::Err => "err",
            ItemKind::Sc => "sc",
        }
    }
}
pub fn item_key(kind: ItemKind, id: &str) -> String {
    format!("{}:{}", kind.tag(), id)
}

pub(crate) fn entries(map: &BTreeMap<String, Vec<JournalLine>>) -> Vec<EntryLines> {
    let mut out: Vec<EntryLines> = map
        .iter()
        .filter_map(|(key, lines)| {
            let used: Vec<_> = lines
                .iter()
                .filter(|l| {
                    l.code.as_deref().is_some_and(|c| !c.is_empty())
                        && (l.debit != 0.0 || l.credit != 0.0)
                })
                .map(|l| (l.code.clone().unwrap_or_default(), l.debit, l.credit))
                .collect();
            (!used.is_empty()).then(|| EntryLines {
                key: key.clone(),
                lines: used,
            })
        })
        .collect();
    // Urutan transaksi numerik (kunci "2" sebelum "10"); penyesuaian (AJ-xx) urut teks.
    out.sort_by(|a, b| match (a.key.parse::<u32>(), b.key.parse::<u32>()) {
        (Ok(x), Ok(y)) => x.cmp(&y),
        _ => a.key.cmp(&b.key),
    });
    out
}

pub fn journal_has_entries(state: &UserState) -> bool {
    !entries(&state.journal).is_empty()
}

/// Hitung seluruh laporan dari jawaban pengguna.
pub fn report_for(state: &UserState) -> Report {
    let d = data();
    let (journal, adjusting) = (entries(&state.journal), entries(&state.adjusting));
    compute_report(&LedgerInput {
        coa: &d.coa,
        opening: &d.opening,
        journal: &journal,
        adjusting: &adjusting,
        cf_sub: &d.cf_sub,
    })
}

pub fn tolerance_for(kind: ItemKind, id: &str) -> f64 {
    data()
        .key
        .tolerance
        .get(&item_key(kind, id))
        .copied()
        .unwrap_or(DEFAULT_TOL)
}

pub struct Ctx<'a> {
    pub report: &'a Report,
    pub net_income: f64,
    pub has_entries: bool,
}

pub fn ctx_for<'a>(state: &UserState, report: &'a Report) -> Ctx<'a> {
    Ctx {
        report,
        net_income: report.cells.get("S12_B53").map(|c| c.num()).unwrap_or(0.0),
        has_entries: journal_has_entries(state),
    }
}

/// Nilai satu item dan tanda tangan jawabannya.
pub fn grade_item(state: &UserState, kind: ItemKind, id: &str, ctx: &Ctx) -> (GradeResult, String) {
    let k = &data().key;
    let none: Vec<JournalLine> = Vec::new();
    match kind {
        ItemKind::Ana => (
            grade_analysis(
                state.analysis.get(id),
                &k.analysis.get(id).cloned().unwrap_or_default(),
            ),
            format!("{:?}", state.analysis.get(id)),
        ),
        ItemKind::Txn => {
            let lines = state.journal.get(id).unwrap_or(&none);
            let sig = format!(
                "{}#{}",
                signature_lines(lines),
                state
                    .analysis
                    .get(id)
                    .and_then(|a| a.decision.clone())
                    .unwrap_or_default()
            );
            let declared_none = state.analysis.get(id).and_then(|a| a.decision.as_deref())
                == Some("Tidak perlu jurnal");
            let g = match k.txn_net.get(id) {
                // Kunci memerlukan jurnal tetapi pengguna menyatakan tidak perlu: beri tahu, jangan diam.
                Some(net) => declared_none
                    .then(|| grade_needed_but_declared_none(lines))
                    .flatten()
                    .unwrap_or_else(|| grade_journal(lines, net, tolerance_for(kind, id))),
                None => grade_no_journal(lines, declared_none),
            };
            (g, sig)
        }
        ItemKind::Adj => {
            let lines = state.adjusting.get(id).unwrap_or(&none);
            (
                grade_journal(lines, &k.adj_net[id], tolerance_for(kind, id)),
                signature_lines(lines),
            )
        }
        ItemKind::Rev => {
            let lines = state.reversing.get(id).unwrap_or(&none);
            (
                grade_journal(lines, &k.reversing_net[id], tolerance_for(kind, id)),
                signature_lines(lines),
            )
        }
        ItemKind::Cor => {
            let lines = state.correcting.get(id).unwrap_or(&none);
            let sig = format!(
                "{}#{}",
                signature_lines(lines),
                state.error_type.get(id).cloned().unwrap_or_default()
            );
            if let Some(net) = k.correcting_net.get(id) {
                return (grade_journal(lines, net, tolerance_for(kind, id)), sig);
            }
            if lines
                .iter()
                .any(|l| l.code.as_deref().is_some_and(|c| !c.is_empty()))
            {
                return (
                    res(
                        Status::Periksa,
                        Reason::NotNeeded,
                        "Kasus ini tidak memerlukan jurnal koreksi.",
                    ),
                    sig,
                );
            }
            let g = match state.error_type.get(id) {
                None => res(
                    Status::Belum,
                    Reason::Empty,
                    "Identifikasi jenis kesalahan lebih dulu.",
                ),
                Some(p) if p == &k.error_type[id] => res(
                    Status::Benar,
                    Reason::Ok,
                    "Benar: tidak perlu jurnal koreksi (jurnalnya sudah benar).",
                ),
                Some(_) => res(
                    Status::Periksa,
                    Reason::CheckAmount,
                    "Memang tidak perlu jurnal koreksi, tetapi jenis kesalahannya belum tepat.",
                ),
            };
            (g, sig)
        }
        ItemKind::Err => (
            grade_error_type(
                state.error_type.get(id).map(String::as_str),
                &k.error_type[id],
            ),
            state.error_type.get(id).cloned().unwrap_or_default(),
        ),
        ItemKind::Sc => {
            let s = data()
                .scenarios
                .iter()
                .find(|s| s.no.to_string() == id)
                .expect("skenario");
            let raw = state.scenarios.get(id).and_then(|a| a.answer.clone());
            let kind = if s.kind == "numeric" {
                ScenarioKind::Numeric
            } else {
                ScenarioKind::Choice
            };
            (
                grade_scenario(raw.as_deref(), &k.scenario[id].key, kind),
                raw.unwrap_or_default(),
            )
        }
        ItemKind::Clo => (
            grade_closing_row(
                id,
                state.closing.get(id),
                &ctx.report.tb,
                ctx.net_income,
                ctx.has_entries,
            ),
            format!("{:?}#{}", state.closing.get(id), ctx.net_income),
        ),
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ItemResult {
    pub key: String,
    pub grade: GradeResult,
    /// status yang ditampilkan; None = "BELUM DIPERIKSA" (mode Periksa, jawaban belum diperiksa atau sudah berubah)
    pub shown: Option<Status>,
    pub checked: bool,
    pub revealed: bool,
}

/// Mode Periksa menilai hanya jawaban yang sudah diperiksa dan belum berubah; mode live selalu menilai.
pub fn result_for(state: &UserState, kind: ItemKind, id: &str, ctx: &Ctx) -> ItemResult {
    let key = item_key(kind, id);
    let (grade, sig) = grade_item(state, kind, id, ctx);
    let revealed = state.revealed.contains(&key);
    let checked = state.checked.get(&key).is_some_and(|s| *s == sig);
    let live = state.settings.validation_mode == "live";
    let shown = if grade.status == Status::Belum {
        Some(Status::Belum)
    } else if live || checked {
        Some(grade.status)
    } else {
        None
    };
    ItemResult {
        key,
        grade,
        shown,
        checked: live || checked,
        revealed,
    }
}

/// Daftar id per jenis item (urutan data kasus).
pub fn section_ids(kind: ItemKind) -> Vec<String> {
    let d = data();
    match kind {
        ItemKind::Ana | ItemKind::Txn => d.transactions.iter().map(|t| t.no.to_string()).collect(),
        ItemKind::Adj => d.adjustments.iter().map(|a| a.code.clone()).collect(),
        ItemKind::Clo => d
            .closing
            .closing_rows
            .iter()
            .map(|r| r.code.clone())
            .collect(),
        ItemKind::Rev => d
            .closing
            .reversing_cases
            .iter()
            .map(|r| r.no.to_string())
            .collect(),
        ItemKind::Cor => d
            .correcting
            .correcting
            .iter()
            .map(|c| c.no.to_string())
            .collect(),
        ItemKind::Err => d
            .correcting
            .detect
            .iter()
            .map(|c| c.no.to_string())
            .collect(),
        ItemKind::Sc => d.scenarios.iter().map(|s| s.no.to_string()).collect(),
    }
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Summary {
    pub total: usize,
    pub worked: usize,
    pub correct: usize,
    pub review: usize,
    pub pending: usize,
    pub accuracy: Option<f64>,
}

/// Ringkasan satu bagian: item yang kuncinya dibuka tidak dihitung.
pub fn summarize(state: &UserState, kind: ItemKind, ctx: &Ctx) -> Summary {
    let ids = section_ids(kind);
    let (mut worked, mut correct, mut pending) = (0, 0, 0);
    for id in &ids {
        let r = result_for(state, kind, id, ctx);
        let untouched = kind == ItemKind::Clo
            && state
                .closing
                .get(id)
                .is_none_or(|e| e.debit == 0.0 && e.credit == 0.0);
        if r.shown.is_none() && !untouched {
            pending += 1;
        }
        if r.shown.is_none() || r.shown == Some(Status::Belum) || r.revealed {
            continue;
        }
        worked += 1;
        if r.shown == Some(Status::Benar) {
            correct += 1;
        }
    }
    Summary {
        total: ids.len(),
        worked,
        correct,
        review: worked - correct,
        pending,
        accuracy: (worked > 0).then(|| correct as f64 / worked as f64),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::grade::AnalysisAnswer;

    fn declare_none(s: &mut UserState, id: &str) {
        s.analysis.insert(
            id.to_string(),
            AnalysisAnswer {
                decision: Some("Tidak perlu jurnal".into()),
                ..Default::default()
            },
        );
    }

    fn grade_txn(s: &UserState, id: &str) -> GradeResult {
        let report = report_for(s);
        let ctx = ctx_for(s, &report);
        grade_item(s, ItemKind::Txn, id, &ctx).0
    }

    /// Nomor transaksi pertama yang kuncinya memerlukan jurnal, dan yang kuncinya memang tanpa jurnal.
    fn ids() -> (String, String) {
        let d = data();
        let all = || d.transactions.iter().map(|t| t.no.to_string());
        (
            all().find(|id| d.key.txn_net.contains_key(id)).unwrap(),
            all().find(|id| !d.key.txn_net.contains_key(id)).unwrap(),
        )
    }

    fn key_lines(id: &str) -> Vec<JournalLine> {
        data().key.txn_net[id]
            .iter()
            .enumerate()
            .map(|(i, (code, net))| JournalLine {
                id: format!("t{i}"),
                code: Some(code.clone()),
                debit: net.max(0.0),
                credit: (-net).max(0.0),
                memo: String::new(),
            })
            .collect()
    }

    #[test]
    fn centang_tidak_perlu_jurnal_pada_transaksi_yang_perlu_jurnal_diberi_tahu() {
        let (needs, _) = ids();
        let mut s = UserState::default();
        declare_none(&mut s, &needs);
        let g = grade_txn(&s, &needs);
        assert_eq!(g.status, Status::Periksa);
        assert_eq!(g.reason, Reason::Needed);
        assert!(g.message.contains("memerlukan jurnal"), "{}", g.message);
        // tidak membocorkan jawaban: tanpa daftar akun atau nominal
        assert_eq!(g.hint, Hint::default());
    }

    #[test]
    fn tanpa_centang_dan_tanpa_baris_tetap_belum_diisi() {
        let (needs, _) = ids();
        let g = grade_txn(&UserState::default(), &needs);
        assert_eq!(g.status, Status::Belum);
    }

    #[test]
    fn centang_dengan_jurnal_yang_benar_tetap_dinilai_dari_barisnya() {
        let (needs, _) = ids();
        let mut s = UserState::default();
        declare_none(&mut s, &needs);
        s.journal.insert(needs.clone(), key_lines(&needs));
        assert_eq!(grade_txn(&s, &needs).status, Status::Benar);
    }

    #[test]
    fn transaksi_tanpa_jurnal_tidak_berubah() {
        let (_, none) = ids();
        let mut s = UserState::default();
        assert_eq!(grade_txn(&s, &none).status, Status::Belum);
        declare_none(&mut s, &none);
        assert_eq!(grade_txn(&s, &none).status, Status::Benar);
        s.journal.insert(
            none.clone(),
            vec![JournalLine {
                id: "x".into(),
                code: Some("1-1100".into()),
                debit: 1.0,
                credit: 0.0,
                memo: String::new(),
            }],
        );
        let g = grade_txn(&s, &none);
        assert_eq!((g.status, g.reason), (Status::Periksa, Reason::NotNeeded));
    }

    #[test]
    fn jawaban_ujian_tanpa_jurnal_pada_soal_yang_perlu_jurnal_dihitung_dijawab_dan_salah() {
        use crate::exam::{grade_exam, ExamAnswers, ExamItem};
        let (needs, _) = ids();
        let item = ExamItem {
            kind: "txn".into(),
            id: needs.clone(),
        };
        let mut a = ExamAnswers::default();
        a.no_journal.insert(needs.clone(), true);
        let score = grade_exam(&[item], &a);
        assert_eq!(score.correct, 0);
        assert!(
            score.results[0].2,
            "soal yang dijawab 'tidak perlu jurnal' dihitung sudah dijawab"
        );
    }
}
