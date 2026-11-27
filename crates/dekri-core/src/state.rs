//! Satu-satunya data tersimpan: jawaban pengguna. Format JSON sama dengan UserState versi web, sehingga
//! berkas cadangan (`{app, version, exportedAt, state}`) bisa dipakai bolak-balik. Bidang tak dikenal dipertahankan.
use crate::closing::ClosingEntry;
use crate::grade::AnalysisAnswer;
use crate::types::JournalLine;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

pub const BACKUP_APP: &str = "akuntansi-practice";

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ScenarioAnswer {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub answer: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ReviewEntry {
    #[serde(rename = "box")]
    pub box_: u32,
    pub due: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct LogEntry {
    pub ts: String,
    pub kind: String,
    pub id: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamRecord {
    pub id: String,
    pub started_at: String,
    pub finished_at: String,
    pub total: u32,
    pub correct: u32,
    pub doubtful: u32,
    pub seconds: u32,
    pub scope: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuizEntry {
    pub best: f64,
    pub attempts: u32,
    pub last_at: String,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct QuizHistory {
    pub ts: String,
    pub module: String,
    pub correct: u32,
    pub total: u32,
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct LearningState {
    #[serde(default)]
    pub quiz: BTreeMap<String, QuizEntry>,
    #[serde(default)]
    pub history: Vec<QuizHistory>,
}

pub const LOG_MAX: usize = 3000;
pub const EXAMS_MAX: usize = 50;
pub const LEARN_HISTORY_MAX: usize = 200;

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "check_mode")]
    pub validation_mode: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_export_at: Option<String>,
}
fn check_mode() -> String {
    "check".into()
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserState {
    #[serde(default = "one")]
    pub version: u32,
    #[serde(default)]
    pub analysis: BTreeMap<String, AnalysisAnswer>,
    #[serde(default)]
    pub journal: BTreeMap<String, Vec<JournalLine>>,
    #[serde(default)]
    pub adjusting: BTreeMap<String, Vec<JournalLine>>,
    #[serde(default)]
    pub closing: BTreeMap<String, ClosingEntry>,
    #[serde(default)]
    pub reversing: BTreeMap<String, Vec<JournalLine>>,
    #[serde(default)]
    pub correcting: BTreeMap<String, Vec<JournalLine>>,
    #[serde(default)]
    pub error_type: BTreeMap<String, String>,
    #[serde(default)]
    pub scenarios: BTreeMap<String, ScenarioAnswer>,
    /// kunci item -> tanda tangan jawaban saat tombol Periksa ditekan
    #[serde(default)]
    pub checked: BTreeMap<String, String>,
    #[serde(default)]
    pub attempts: BTreeMap<String, f64>,
    #[serde(default)]
    pub revealed: Vec<String>,
    #[serde(default)]
    pub settings: Settings,
    #[serde(default)]
    pub flags: Vec<String>,
    #[serde(default)]
    pub notes: BTreeMap<String, String>,
    #[serde(default)]
    pub review: BTreeMap<String, ReviewEntry>,
    #[serde(default)]
    pub log: Vec<LogEntry>,
    #[serde(default)]
    pub learning: LearningState,
    #[serde(default)]
    pub exams: Vec<ExamRecord>,
    #[serde(default)]
    pub hints: BTreeMap<String, u32>,
    /// jawaban latihan pajak/varian/paket (kunci `v:...`, nilai JSON baris jurnal)
    #[serde(default)]
    pub pajak: BTreeMap<String, String>,
    #[serde(default)]
    pub tables: BTreeMap<String, String>,
    #[serde(default)]
    pub updated_at: String,
    /// Bidang lain/baru dari versi web dibawa apa adanya agar tidak hilang.
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}
fn one() -> u32 {
    1
}

impl Default for UserState {
    fn default() -> Self {
        serde_json::from_str("{}").expect("keadaan kosong")
    }
}

/// `signature` TS: tanda tangan jawaban agar status "sudah diperiksa" gugur bila jawaban berubah.
pub fn signature_lines(lines: &[JournalLine]) -> String {
    lines
        .iter()
        .filter(|l| l.code.as_deref().is_some_and(|c| !c.is_empty()))
        .map(|l| {
            format!(
                "{}:{}:{}",
                l.code.as_deref().unwrap_or(""),
                l.debit,
                l.credit
            )
        })
        .collect::<Vec<_>>()
        .join("|")
}

#[derive(Debug)]
pub struct BackupError(pub String);

/// Baca teks cadangan. Isi yang tidak sesuai ditolak dengan pesan yang sama seperti versi web.
pub fn parse_backup(text: &str) -> Result<UserState, BackupError> {
    if text.len() > 25 * 1024 * 1024 {
        return Err(BackupError(
            "File terlalu besar untuk berkas cadangan (maks. 25 MB).".into(),
        ));
    }
    let raw: Value = serde_json::from_str(text)
        .map_err(|_| BackupError("File bukan JSON yang valid.".into()))?;
    if raw.get("app").and_then(Value::as_str) != Some(BACKUP_APP) {
        return Err(BackupError(
            "File ini bukan cadangan aplikasi latihan akuntansi.".into(),
        ));
    }
    if raw.get("version").and_then(Value::as_f64) != Some(1.0) {
        return Err(BackupError("Versi cadangan tidak didukung.".into()));
    }
    let state = raw
        .get("state")
        .cloned()
        .unwrap_or(Value::Object(Map::new()));
    let mut st: UserState = serde_json::from_value(state)
        .map_err(|e| BackupError(format!("Isi cadangan tidak valid: {e}")))?;
    sanitize(&mut st);
    Ok(st)
}

pub fn make_backup(state: &UserState, now_iso: &str) -> String {
    let mut s = state.clone();
    s.settings.last_export_at = Some(now_iso.to_string());
    serde_json::json!({ "app": BACKUP_APP, "version": 1, "exportedAt": now_iso, "state": s })
        .to_string()
}

/// Batas wajar per sel: 10 triliun rupiah, sama dengan MAX_RUPIAH versi web. Nilai di luar batas/tidak terhingga dibuang.
pub const MAX_RUPIAH: f64 = 10_000_000_000_000.0;

fn clean_lines(map: &mut BTreeMap<String, Vec<JournalLine>>) {
    let coa: std::collections::HashSet<&str> = crate::data::data()
        .coa
        .iter()
        .map(|a| a.code.as_str())
        .collect();
    for lines in map.values_mut() {
        lines.retain(|l| {
            l.debit.is_finite()
                && l.credit.is_finite()
                && l.debit.abs() <= MAX_RUPIAH
                && l.credit.abs() <= MAX_RUPIAH
        });
        for l in lines.iter_mut() {
            if l.code.as_deref().is_some_and(|c| !coa.contains(c)) {
                l.code = None;
            }
        }
    }
}

pub fn sanitize(st: &mut UserState) {
    clean_lines(&mut st.journal);
    clean_lines(&mut st.adjusting);
    clean_lines(&mut st.reversing);
    clean_lines(&mut st.correcting);
    st.closing.retain(|_, e| {
        e.debit.is_finite()
            && e.credit.is_finite()
            && e.debit.abs() <= MAX_RUPIAH
            && e.credit.abs() <= MAX_RUPIAH
    });
}
