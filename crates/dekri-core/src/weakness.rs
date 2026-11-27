//! Topik yang sering salah. Port src/store/weakness.ts: PERIKSA bernilai 2 poin, tiap percobaan ulang pada item yang akhirnya benar 1 poin.
use crate::data::data;
use crate::derive::*;
use crate::grade::{Reason, Status};
use crate::state::UserState;

#[derive(Clone, Debug)]
pub struct TopicStat {
    pub topic: String,
    pub kind: ItemKind,
    pub worked: u32,
    pub wrong: u32,
    pub retries: u32,
    pub next: Option<(ItemKind, String)>,
    pub score: u32,
}
#[derive(Clone, Debug)]
pub struct ReasonStat {
    pub reason: Reason,
    pub count: u32,
}

pub fn weakness_report(state: &UserState, ctx: &Ctx) -> (Vec<TopicStat>, Vec<ReasonStat>) {
    let d = data();
    let mut items: Vec<(ItemKind, String, String)> = Vec::new();
    items.extend(
        d.transactions
            .iter()
            .map(|t| (ItemKind::Txn, t.no.to_string(), t.topic.clone())),
    );
    items.extend(
        d.adjustments
            .iter()
            .map(|a| (ItemKind::Adj, a.code.clone(), a.category.clone())),
    );
    items.extend(
        d.scenarios
            .iter()
            .map(|s| (ItemKind::Sc, s.no.to_string(), s.topic.clone())),
    );
    let mut by: Vec<TopicStat> = Vec::new();
    let mut reasons: Vec<ReasonStat> = Vec::new();
    for (kind, id, topic) in items {
        let r = result_for(state, kind, &id, ctx);
        if r.revealed || r.shown.is_none() || r.shown == Some(Status::Belum) {
            continue;
        }
        let i = match by.iter().position(|t| t.kind == kind && t.topic == topic) {
            Some(i) => i,
            None => {
                by.push(TopicStat {
                    topic: topic.clone(),
                    kind,
                    worked: 0,
                    wrong: 0,
                    retries: 0,
                    next: None,
                    score: 0,
                });
                by.len() - 1
            }
        };
        let t = &mut by[i];
        t.worked += 1;
        if r.shown == Some(Status::Periksa) {
            t.wrong += 1;
            if t.next.is_none() {
                t.next = Some((kind, id.clone()));
            }
            match reasons.iter_mut().find(|x| x.reason == r.grade.reason) {
                Some(x) => x.count += 1,
                None => reasons.push(ReasonStat {
                    reason: r.grade.reason,
                    count: 1,
                }),
            }
        } else {
            let a = state
                .attempts
                .get(&item_key(kind, &id))
                .copied()
                .unwrap_or(1.0);
            t.retries += (a - 1.0).max(0.0) as u32;
        }
        t.score = t.wrong * 2 + t.retries;
    }
    by.retain(|t| t.score > 0);
    by.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.topic.cmp(&b.topic)));
    reasons.sort_by_key(|b| std::cmp::Reverse(b.count));
    (by, reasons)
}

pub fn reason_tip(r: Reason) -> Option<(&'static str, &'static str)> {
    Some(match r {
        Reason::WrongSide => ("Sisi debit/kredit terbalik", "Aset dan beban bertambah di debit; liabilitas, ekuitas, dan pendapatan bertambah di kredit."),
        Reason::Unbalanced => ("Total debit tidak sama dengan kredit", "Jumlahkan kolom debit dan kredit sebelum Periksa; selisih biasanya satu baris yang terlewat."),
        Reason::ExtraAccount => ("Memakai akun yang tidak seharusnya", "Cek bagan akun: apakah ada akun yang lebih spesifik (mis. kontra-akun, atau beban vs aset)?"),
        Reason::CheckAmount => ("Akun atau nominal perlu diperiksa", "Totalnya sudah sama dengan kunci tetapi pembagian antar-akun berbeda; telaah rincian tiap akun."),
        Reason::WrongAmount => ("Nominal salah", "Hitung ulang: periode, tarif, diskon, atau porsi yang diakui tahun ini."),
        Reason::NotNeeded => ("Menjurnal peristiwa yang tidak perlu jurnal", "Tanyakan: apakah ada pertukaran nilai atau kewajiban yang timbul pada tanggal itu?"),
        _ => return None,
    })
}
