//! Turunan murni dari log percobaan: aktivitas harian, streak, tren akurasi (zona waktu lokal). Port src/store/activity.ts.
use crate::state::LogEntry;
use chrono::{DateTime, Duration, Local, NaiveDate};
use std::collections::HashSet;

fn day_of(ts: &str) -> Option<NaiveDate> {
    DateTime::parse_from_rfc3339(ts)
        .ok()
        .map(|d| d.with_timezone(&Local).date_naive())
}
fn counted(e: &LogEntry) -> bool {
    e.status != "BELUM DIISI"
}

#[derive(Clone, Debug, PartialEq)]
pub struct DayStat {
    pub day: NaiveDate,
    pub attempts: u32,
    pub correct: u32,
}

/// `days` hari terakhir (termasuk hari ini), urut lama -> baru. Hari tanpa percobaan tetap muncul dengan 0.
pub fn daily_activity(log: &[LogEntry], days: i64, today: NaiveDate) -> Vec<DayStat> {
    let mut out: Vec<DayStat> = (0..days)
        .rev()
        .map(|i| DayStat {
            day: today - Duration::days(i),
            attempts: 0,
            correct: 0,
        })
        .collect();
    for e in log.iter().filter(|e| counted(e)) {
        if let Some(d) = day_of(&e.ts) {
            if let Some(s) = out.iter_mut().find(|s| s.day == d) {
                s.attempts += 1;
                if e.status == "BENAR" {
                    s.correct += 1;
                }
            }
        }
    }
    out
}

/// Hari berturut-turut (berakhir hari ini, atau kemarin bila hari ini belum belajar) yang ada percobaan.
pub fn streak(log: &[LogEntry], today: NaiveDate) -> u32 {
    let days: HashSet<NaiveDate> = log
        .iter()
        .filter(|e| counted(e))
        .filter_map(|e| day_of(&e.ts))
        .collect();
    let mut d = today;
    if !days.contains(&d) {
        d -= Duration::days(1);
    }
    let mut n = 0;
    while days.contains(&d) {
        n += 1;
        d -= Duration::days(1);
    }
    n
}

#[derive(Clone, Debug, PartialEq)]
pub struct WeekStat {
    pub label: String,
    pub attempts: u32,
    pub accuracy: Option<f64>,
}

/// Akurasi per minggu (7 hari bergulir) untuk `weeks` minggu terakhir.
pub fn weekly_accuracy(log: &[LogEntry], weeks: i64, today: NaiveDate) -> Vec<WeekStat> {
    (0..weeks)
        .rev()
        .map(|w| {
            let from = today - Duration::days(w * 7 + 6);
            let to = today - Duration::days(w * 7);
            let rows: Vec<&LogEntry> = log
                .iter()
                .filter(|e| counted(e) && day_of(&e.ts).is_some_and(|d| d >= from && d <= to))
                .collect();
            let ok = rows.iter().filter(|e| e.status == "BENAR").count();
            WeekStat {
                label: to.format("%m-%d").to_string(),
                attempts: rows.len() as u32,
                accuracy: (!rows.is_empty()).then(|| ok as f64 / rows.len() as f64),
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn le(ts: &str, st: &str) -> LogEntry {
        LogEntry {
            ts: ts.into(),
            kind: "txn".into(),
            id: "1".into(),
            status: st.into(),
        }
    }
    #[test]
    fn streak_dan_harian() {
        let today = Local::now().date_naive();
        let ts = |back: i64| (Local::now() - Duration::days(back)).to_rfc3339();
        let log = vec![
            le(&ts(0), "BENAR"),
            le(&ts(1), "PERIKSA"),
            le(&ts(2), "BENAR"),
            le(&ts(4), "BENAR"),
            le(&ts(0), "BELUM DIISI"),
        ];
        assert_eq!(streak(&log, today), 3);
        let d = daily_activity(&log, 3, today);
        assert_eq!(d.len(), 3);
        assert_eq!((d[2].attempts, d[2].correct), (1, 1));
        assert_eq!((d[1].attempts, d[1].correct), (1, 0));
        assert_eq!(streak(&[], today), 0);
    }
}
