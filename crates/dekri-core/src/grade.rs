//! Penilaian jawaban terhadap kunci. Setara src/validation/grade.ts. Murni.
//! Membandingkan saldo NETO (debit-kredit) per akun, bukan urutan atau jumlah baris.
use crate::excel::xround;
use crate::types::JournalLine;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Status {
    #[serde(rename = "BELUM DIISI")]
    Belum,
    #[serde(rename = "BENAR")]
    Benar,
    #[serde(rename = "PERIKSA")]
    Periksa,
}
impl Status {
    pub fn label(self) -> &'static str {
        match self {
            Status::Belum => "BELUM DIISI",
            Status::Benar => "BENAR",
            Status::Periksa => "PERIKSA",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Reason {
    Empty,
    Ok,
    Unbalanced,
    ExtraAccount,
    WrongSide,
    CheckAmount,
    WrongAmount,
    NotNeeded,
    Needed,
    Incomplete,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct Hint {
    pub missing: Vec<String>,
    pub extra: Vec<String>,
    pub wrong_side: Vec<String>,
    /// nominal benar TIDAK ditampilkan
    pub wrong_amount: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct GradeResult {
    pub status: Status,
    pub reason: Reason,
    pub message: String,
    pub hint: Hint,
}

pub const DEFAULT_TOL: f64 = 1.0;
pub type NetMap = IndexMap<String, f64>;

pub fn res(status: Status, reason: Reason, message: &str) -> GradeResult {
    GradeResult {
        status,
        reason,
        message: message.to_string(),
        hint: Hint::default(),
    }
}
fn res_hint(status: Status, reason: Reason, message: &str, hint: Hint) -> GradeResult {
    GradeResult {
        status,
        reason,
        message: message.to_string(),
        hint,
    }
}

/// Neto D-K per akun dari baris jawaban (urutan kemunculan dipertahankan).
pub fn net_by_account(lines: &[JournalLine]) -> NetMap {
    let mut out = NetMap::new();
    for l in lines {
        if let Some(c) = &l.code {
            if !c.is_empty() {
                *out.entry(c.clone()).or_insert(0.0) += l.debit - l.credit;
            }
        }
    }
    out
}

fn used(lines: &[JournalLine]) -> Vec<JournalLine> {
    lines
        .iter()
        .filter(|l| l.code.as_deref().is_some_and(|c| !c.is_empty()))
        .cloned()
        .collect()
}

pub fn grade_journal(lines: &[JournalLine], key_net: &NetMap, tol: f64) -> GradeResult {
    let used = used(lines);
    if used.is_empty() {
        return res(Status::Belum, Reason::Empty, "Belum diisi.");
    }
    let sum_d: f64 = used.iter().map(|l| l.debit).sum();
    let sum_c: f64 = used.iter().map(|l| l.credit).sum();
    if xround(sum_d - sum_c, 0.0) != 0.0 {
        return res(
            Status::Periksa,
            Reason::Unbalanced,
            "Saldo tidak seimbang: total debit tidak sama dengan total kredit.",
        );
    }
    let user = net_by_account(&used);
    let mut hint = Hint {
        extra: user
            .keys()
            .filter(|c| !key_net.contains_key(*c))
            .cloned()
            .collect(),
        missing: key_net
            .keys()
            .filter(|c| !user.contains_key(*c))
            .cloned()
            .collect(),
        ..Hint::default()
    };
    for (c, k) in key_net {
        let Some(u) = user.get(c) else { continue };
        if (u - k).abs() <= tol {
            continue;
        }
        if u * k < 0.0 {
            hint.wrong_side.push(c.clone());
        } else {
            hint.wrong_amount.push(c.clone());
        }
    }
    if !hint.extra.is_empty() {
        return res_hint(
            Status::Periksa,
            Reason::ExtraAccount,
            "Ada akun yang tidak seharusnya terlibat.",
            hint,
        );
    }
    if hint.missing.is_empty() && hint.wrong_side.is_empty() && hint.wrong_amount.is_empty() {
        return res(Status::Benar, Reason::Ok, "Benar.");
    }
    if !hint.wrong_side.is_empty() {
        return res_hint(
            Status::Periksa,
            Reason::WrongSide,
            "Ada akun yang sisi debit/kreditnya terbalik.",
            hint,
        );
    }
    let key_total_debit: f64 = key_net.values().map(|v| v.max(0.0)).sum();
    if (sum_d - key_total_debit).abs() <= tol {
        return res_hint(
            Status::Periksa,
            Reason::CheckAmount,
            "Akun atau nominal perlu diperiksa.",
            hint,
        );
    }
    res_hint(
        Status::Periksa,
        Reason::WrongAmount,
        "Nominal salah; periksa perhitungannya.",
        hint,
    )
}

#[derive(Clone, Debug, PartialEq)]
pub struct ComponentScore {
    pub earned: i64,
    pub total: i64,
    pub akun: i64,
    pub sisi: i64,
    pub nominal: i64,
    pub extra: i64,
}

/// Skor komponen: metrik TAMBAHAN untuk umpan balik, tidak mengubah status BENAR/PERIKSA.
pub fn component_score(
    lines: &[JournalLine],
    key_net: &NetMap,
    tol: f64,
) -> Option<ComponentScore> {
    let used = used(lines);
    if used.is_empty() {
        return None;
    }
    let user = net_by_account(&used);
    let (mut akun, mut sisi, mut nominal) = (0i64, 0i64, 0i64);
    for (c, k) in key_net {
        let Some(u) = user.get(c) else { continue };
        akun += 1;
        if u * k < 0.0 {
            continue;
        }
        sisi += 1;
        if (u - k).abs() <= tol {
            nominal += 1;
        }
    }
    let extra = user.keys().filter(|c| !key_net.contains_key(*c)).count() as i64;
    Some(ComponentScore {
        earned: (akun + sisi + nominal - extra).max(0),
        total: key_net.len() as i64 * 3,
        akun,
        sisi,
        nominal,
        extra,
    })
}

/// Transaksi pengecoh (kunci tanpa jurnal).
pub fn grade_no_journal(lines: &[JournalLine], decided_no_journal: bool) -> GradeResult {
    if !used(lines).is_empty() {
        return res(
            Status::Periksa,
            Reason::NotNeeded,
            "Transaksi ini tidak memerlukan jurnal.",
        );
    }
    if decided_no_journal {
        return res(Status::Benar, Reason::Ok, "Benar: memang tidak ada jurnal.");
    }
    res(
        Status::Belum,
        Reason::Empty,
        "Nyatakan \"Tidak perlu jurnal\" bila memang tidak ada jurnal.",
    )
}

/// Transaksi yang kuncinya memerlukan jurnal, tetapi pengguna mencentang "Tidak perlu jurnal" dan belum
/// mengisi satu pun baris. Umpan baliknya hanya menyatakan bahwa jurnal diperlukan (tanpa akun atau nominal).
/// `None` bila sudah ada baris terisi: penilaian jurnal biasa yang berlaku.
pub fn grade_needed_but_declared_none(lines: &[JournalLine]) -> Option<GradeResult> {
    used(lines).is_empty().then(|| {
        res(
            Status::Periksa,
            Reason::Needed,
            "Transaksi ini memerlukan jurnal, jadi pilihan \"tidak perlu jurnal\" belum tepat. Hapus centangnya, lalu isi jurnalnya.",
        )
    })
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisAnswer {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decision: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub debit: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub credit: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amount: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cash_class: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub needs_adj: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub affects_profit: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub affects_cash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisKey {
    pub debit: Option<String>,
    pub credit: Option<String>,
    pub amount: Option<f64>,
    pub cash_class: Option<String>,
    pub needs_adj: Option<String>,
    pub affects_profit: Option<String>,
    pub affects_cash: Option<String>,
    pub reason: Option<String>,
    pub cash_sub: Option<String>,
}

fn non_empty(o: &Option<String>) -> bool {
    o.as_deref().is_some_and(|s| !s.is_empty())
}

/// Analisis transaksi (sheet 06). Satu pesan per kesalahan pertama, sesuai urutan rumus workbook.
pub fn grade_analysis(a: Option<&AnalysisAnswer>, key: &AnalysisKey) -> GradeResult {
    let Some(a) = a else {
        return res(Status::Belum, Reason::Empty, "Belum diisi.");
    };
    let filled = non_empty(&a.cash_class)
        || non_empty(&a.needs_adj)
        || non_empty(&a.affects_profit)
        || non_empty(&a.affects_cash);
    let decision = match (&a.decision, filled) {
        (Some(d), _) if !d.is_empty() => d.as_str(),
        (_, true) => "Perlu jurnal",
        _ => return res(Status::Belum, Reason::Empty, "Belum diisi."),
    };
    let is_none = key.debit.as_deref() == Some("-") || key.debit.is_none();
    if is_none {
        return if decision == "Tidak perlu jurnal" {
            res(Status::Benar, Reason::Ok, "Benar: memang tidak ada jurnal.")
        } else {
            res(
                Status::Periksa,
                Reason::NotNeeded,
                "Transaksi ini tidak memerlukan jurnal.",
            )
        };
    }
    if decision == "Tidak perlu jurnal" {
        return res(
            Status::Periksa,
            Reason::Needed,
            "Transaksi ini memerlukan jurnal.",
        );
    }
    if !non_empty(&a.needs_adj) || !non_empty(&a.affects_profit) || !non_empty(&a.affects_cash) {
        return res(
            Status::Periksa,
            Reason::Incomplete,
            "Belum lengkap: isi kebutuhan penyesuaian dan dampak laba/kas.",
        );
    }
    if a.needs_adj != key.needs_adj {
        return res(
            Status::Periksa,
            Reason::CheckAmount,
            "Kebutuhan penyesuaian salah.",
        );
    }
    if a.affects_profit != key.affects_profit {
        return res(Status::Periksa, Reason::CheckAmount, "Dampak laba salah.");
    }
    if a.affects_cash != key.affects_cash {
        return res(Status::Periksa, Reason::CheckAmount, "Dampak kas salah.");
    }
    res(Status::Benar, Reason::Ok, "Benar.")
}

pub fn grade_error_type(choice: Option<&str>, key: &str) -> GradeResult {
    match choice {
        None | Some("") => res(Status::Belum, Reason::Empty, "Belum diisi."),
        Some(c) if c == key => res(Status::Benar, Reason::Ok, "Benar."),
        _ => res(
            Status::Periksa,
            Reason::CheckAmount,
            "Bukan itu jenis kesalahannya.",
        ),
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ScenarioKind {
    Numeric,
    Choice,
}

/// Soal skenario: pilihan = cocok persis; angka = selisih mutlak <= Rp1.000 (rumus sheet 21).
pub fn grade_scenario(
    answer: Option<&str>,
    key: &serde_json::Value,
    kind: ScenarioKind,
) -> GradeResult {
    let Some(ans) = answer.filter(|a| !a.is_empty()) else {
        return res(Status::Belum, Reason::Empty, "Belum diisi.");
    };
    let key_str = match key {
        serde_json::Value::String(s) => s.clone(),
        other => other.to_string(),
    };
    if kind == ScenarioKind::Choice {
        return if ans == key_str {
            res(Status::Benar, Reason::Ok, "Benar.")
        } else {
            res(
                Status::Periksa,
                Reason::CheckAmount,
                "Periksa kembali pilihan Anda.",
            )
        };
    }
    let Ok(n) = ans.trim().parse::<f64>() else {
        return res(Status::Periksa, Reason::Incomplete, "Isi dengan angka.");
    };
    let k = key.as_f64().or_else(|| key_str.parse().ok()).unwrap_or(0.0);
    if !n.is_finite() {
        return res(Status::Periksa, Reason::Incomplete, "Isi dengan angka.");
    }
    if (n - k).abs() <= 1000.0 {
        res(Status::Benar, Reason::Ok, "Benar.")
    } else {
        res(Status::Periksa, Reason::WrongAmount, "Coba hitung ulang.")
    }
}
