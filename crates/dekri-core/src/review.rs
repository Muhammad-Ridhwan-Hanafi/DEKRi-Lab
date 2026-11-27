//! Pengulangan terjadwal (kotak Leitner sederhana). Port src/store/review.ts.
//! Hanya soal yang pernah SALAH masuk jadwal: salah -> ulas hari ini; benar -> ulas lagi 1, 3, 7, 14, lalu 30 hari; benar sesudah itu -> lulus.
use crate::derive::ItemKind;
use crate::grade::Status;
use crate::state::{ReviewEntry, UserState};
use chrono::{Duration, Local, NaiveDate};

pub const INTERVAL_DAYS: [i64; 6] = [0, 1, 3, 7, 14, 30];

/// Teks jadwal ulasan untuk antarmuka ("1, 3, 7, 14, lalu 30 hari"), satu sumber dengan `INTERVAL_DAYS`.
pub fn schedule_text() -> String {
    let d: Vec<String> = INTERVAL_DAYS
        .iter()
        .filter(|x| **x > 0)
        .map(|x| x.to_string())
        .collect();
    match d.split_last() {
        Some((last, rest)) => format!("{}, lalu {last} hari", rest.join(", ")),
        None => String::new(),
    }
}

pub fn is_review_kind(k: ItemKind) -> bool {
    matches!(k, ItemKind::Txn | ItemKind::Adj | ItemKind::Sc)
}

pub fn today_str() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

pub fn add_days(date: &str, n: i64) -> String {
    NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|d| (d + Duration::days(n)).format("%Y-%m-%d").to_string())
        .unwrap_or_else(|_| date.to_string())
}

/// Hasil `next_review`: tidak berubah / hapus (lulus) / entri baru.
#[derive(Debug, PartialEq)]
pub enum Next {
    Unchanged,
    Remove,
    Set(ReviewEntry),
}

pub fn next_review(prev: Option<&ReviewEntry>, status: Status, today: &str) -> Next {
    if status == Status::Periksa {
        return Next::Set(ReviewEntry {
            box_: 0,
            due: today.to_string(),
        });
    }
    let Some(p) = prev else {
        return Next::Unchanged;
    };
    if p.due.as_str() > today {
        return Next::Unchanged; // belum jatuh tempo: periksa ulang tidak menaikkan kotak
    }
    if p.box_ as usize >= INTERVAL_DAYS.len() - 1 {
        return Next::Remove;
    }
    let b = p.box_ + 1;
    Next::Set(ReviewEntry {
        box_: b,
        due: add_days(today, INTERVAL_DAYS[b as usize]),
    })
}

#[derive(Clone, Debug, PartialEq)]
pub struct DueItem {
    pub kind: ItemKind,
    pub id: String,
    pub box_: u32,
    pub due: String,
}

fn natural(a: &str, b: &str) -> std::cmp::Ordering {
    match (a.parse::<u64>(), b.parse::<u64>()) {
        (Ok(x), Ok(y)) => x.cmp(&y),
        _ => a.cmp(b),
    }
}

pub fn due_reviews(state: &UserState, today: &str) -> Vec<DueItem> {
    let mut out = Vec::new();
    for (key, e) in &state.review {
        let (kind, id) = key.split_once(':').unwrap_or((key, ""));
        let kind = match kind {
            "txn" => ItemKind::Txn,
            "adj" => ItemKind::Adj,
            "sc" => ItemKind::Sc,
            _ => continue,
        };
        if e.due.as_str() > today || state.revealed.contains(key) {
            continue;
        }
        out.push(DueItem {
            kind,
            id: id.to_string(),
            box_: e.box_,
            due: e.due.clone(),
        });
    }
    out.sort_by(|a, b| {
        a.due
            .cmp(&b.due)
            .then(a.box_.cmp(&b.box_))
            .then_with(|| natural(&a.id, &b.id))
    });
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    fn e(b: u32, d: &str) -> ReviewEntry {
        ReviewEntry {
            box_: b,
            due: d.into(),
        }
    }
    #[test]
    fn jadwal_leitner() {
        assert_eq!(
            next_review(None, Status::Periksa, "2026-11-10"),
            Next::Set(e(0, "2026-11-10"))
        );
        assert_eq!(
            next_review(None, Status::Benar, "2026-11-10"),
            Next::Unchanged
        );
        assert_eq!(
            next_review(Some(&e(0, "2026-11-10")), Status::Benar, "2026-11-10"),
            Next::Set(e(1, "2026-11-11"))
        );
        assert_eq!(
            next_review(Some(&e(1, "2026-11-11")), Status::Benar, "2026-11-11"),
            Next::Set(e(2, "2026-11-14"))
        );
        assert_eq!(
            next_review(Some(&e(2, "2026-11-20")), Status::Benar, "2026-11-14"),
            Next::Unchanged
        );
        assert_eq!(
            next_review(Some(&e(5, "2026-11-14")), Status::Benar, "2026-11-14"),
            Next::Remove
        );
        assert_eq!(add_days("2026-12-30", 3), "2027-01-02");
    }
}
