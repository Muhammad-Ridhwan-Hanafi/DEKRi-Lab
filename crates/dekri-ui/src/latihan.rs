//! Latihan Hari Ini: satu antrean pendek (maks. 10 soal) dari ulangan yang jatuh tempo,
//! topik terlemah, lalu transaksi berikutnya yang belum benar.
use crate::components::*;
use crate::practice::*;
use crate::session::{Page, Session};
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::grade::Status;
use dekri_core::review::{due_reviews, today_str};
use dekri_core::weakness::weakness_report;
use dioxus::prelude::*;

const MAX: usize = 10;

/// Antrean: ulangan jatuh tempo (Leitner) > soal dari topik paling lemah > transaksi berikutnya yang belum benar.
pub(crate) fn build_queue(s: &Session) -> Vec<(ItemKind, String, &'static str)> {
    let c = s.ctx();
    let mut q: Vec<(ItemKind, String, &'static str)> = vec![];
    let add = |q: &mut Vec<(ItemKind, String, &'static str)>,
               k: ItemKind,
               id: String,
               why: &'static str| {
        if q.len() < MAX
            && !q.iter().any(|x| x.0 == k && x.1 == id)
            && !s.st.revealed.contains(&item_key(k, &id))
        {
            q.push((k, id, why));
        }
    };
    for d in due_reviews(&s.st, &today_str()) {
        if matches!(d.kind, ItemKind::Txn | ItemKind::Adj) {
            add(&mut q, d.kind, d.id, "Ulangan: waktunya diulang");
        }
    }
    let (weak, _) = weakness_report(&s.st, &c);
    for w in weak.iter() {
        if let Some((k, id)) = &w.next {
            if matches!(k, ItemKind::Txn | ItemKind::Adj) {
                add(&mut q, *k, id.clone(), "Topik yang sering salah");
            }
        }
    }
    for t in data().transactions.iter() {
        let id = t.no.to_string();
        if result_for(&s.st, ItemKind::Txn, &id, &c).shown != Some(Status::Benar) {
            add(&mut q, ItemKind::Txn, id, "Soal berikutnya");
        }
    }
    q
}

#[component]
pub fn Latihan() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let queue = use_hook(|| build_queue(&app.read()));
    let mut idx = use_signal(|| 0usize);
    let n = queue.len();
    let i = *idx.read();
    if n == 0 {
        return rsx! {
            div { class: "ap-fade rounded-2xl border-2 border-dashed border-slate-900 bg-white p-5",
                div { class: "font-medium", "Tidak ada soal yang perlu dilatih sekarang" }
                p { class: "text-sm text-slate-600", "Semua transaksi sudah benar dan tidak ada ulangan yang jatuh tempo. Coba Varian, Pajak, atau Ujian untuk tantangan baru." }
                button { class: "btn btn-primary mt-2", onclick: move |_| app.write().page = Page::Varian, "Buka Latihan Varian" }
            }
        };
    }
    if i >= n {
        let (benar, total) = {
            let s = app.read();
            let c = s.ctx();
            let b = queue
                .iter()
                .filter(|(k, id, _)| result_for(&s.st, *k, id, &c).shown == Some(Status::Benar))
                .count();
            (b, n)
        };
        return rsx! {
            div { class: "card ap-pop space-y-2",
                h2 { class: "text-2xl", "Latihan hari ini selesai" }
                p { class: "text-sm", "{benar} dari {total} soal benar." }
                p { class: "text-sm text-slate-600", "Soal yang masih salah akan muncul lagi sesuai jadwal ulangan ({dekri_core::review::schedule_text()} setelah Anda menjawab benar) dan di antrean berikutnya." }
                div { class: "flex gap-2",
                    button { class: "btn btn-primary", onclick: move |_| app.write().page = Page::Beranda, "Kembali ke Dashboard" }
                    button { class: "btn", onclick: move |_| idx.set(0), "Lihat ulang antrean" }
                }
            }
        };
    }
    let (kind, id, why) = queue[i].clone();
    let d = data();
    // data soal
    let (title, body, topic, key_lines, explain, calc, lines, r) = {
        let s = app.read();
        let c = s.ctx();
        let r = result_for(&s.st, kind, &id, &c);
        match kind {
            ItemKind::Txn => {
                let t = d.transactions.iter().find(|t| t.no.to_string() == id);
                let k = d.key.readable_txn.iter().find(|k| k.no.to_string() == id);
                (
                    t.map(|t| format!("Transaksi {} · {}", t.no, t.topic))
                        .unwrap_or_default(),
                    t.map(|t| format!("{}\n{}", t.narrative, t.amount_info))
                        .unwrap_or_default(),
                    k.map(|k| k.topic.clone()).unwrap_or_default(),
                    k.map(|k| key_lines(&k.lines)).unwrap_or_default(),
                    k.and_then(|k| k.explain.clone()),
                    None::<String>,
                    s.st.journal.get(&id).cloned().unwrap_or_default(),
                    r,
                )
            }
            _ => {
                let a = d.adjustments.iter().find(|a| a.code == id);
                let k = d.key.readable_adj.iter().find(|k| k.code == id);
                (
                    a.map(|a| format!("Penyesuaian {} · {}", a.code, a.category))
                        .unwrap_or_default(),
                    a.map(|a| a.facts.clone()).unwrap_or_default(),
                    a.map(|a| a.category.clone()).unwrap_or_default(),
                    k.map(|k| key_lines(&k.lines)).unwrap_or_default(),
                    k.and_then(|k| k.explain.clone()),
                    k.and_then(|k| k.calc.clone()),
                    s.st.adjusting.get(&id).cloned().unwrap_or_default(),
                    r,
                )
            }
        }
    };
    let benar = r.shown == Some(Status::Benar);
    let options: Vec<(String, String)> = d
        .coa
        .iter()
        .map(|a| (a.code.clone(), a.name.clone()))
        .collect();
    let pct = (i * 100) / n;
    let (idc, idd, ide) = (id.clone(), id.clone(), id.clone());
    rsx! {
        div { class: "space-y-3",
            div { class: "card",
                div { class: "mb-1 flex flex-wrap items-center justify-between gap-2",
                    span { class: "eyebrow", "Soal {i + 1} dari {n} · {why}" }
                    StatusBadge { status: r.shown }
                }
                div { class: "mb-3 h-2.5 overflow-hidden rounded-full border border-[var(--ds-border-strong)] bg-[var(--ds-surface)]", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "{n}", "aria-valuenow": "{i}", "aria-label": "Kemajuan antrean latihan", div { class: "h-full bg-[var(--tag-lime-bg)] transition-[width] duration-300", style: "width:{pct}%" } }
                h2 { class: "text-2xl", "{title}" }
                p { class: "mt-2 whitespace-pre-line rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-3 text-[0.9375rem] leading-6", "{body}" }
                div { class: "mt-3",
                    JournalForm { key: "{kind:?}{id}", id_prefix: format!("Latihan {id}"), lines: lines.clone(), min_rows: 4, result: Some(r.clone()), show_check: true,
                        options: options.clone(),
                        on_change: { let id = idc.clone(); move |v| { let mut s = app.write(); if kind == ItemKind::Txn { s.st.journal.insert(id.clone(), v); } else { s.st.adjusting.insert(id.clone(), v); } s.changed(); } },
                        on_check: { let id = idd.clone(); move |_| { let mut s = app.write(); s.check_item(kind, &id); if kind == ItemKind::Txn { s.check_item(ItemKind::Ana, &id); } } },
                        on_submit: { let id = ide.clone(); move |_| { if benar { idx.set(i + 1); } else { let mut s = app.write(); s.check_item(kind, &id); if kind == ItemKind::Txn { s.check_item(ItemKind::Ana, &id); } } } },
                    }
                }
                if r.shown == Some(Status::Periksa) && !r.revealed && !key_lines.is_empty() { Diagnosis { lines: lines.clone(), key_lines: key_lines.clone(), text: body.clone() } }
                if benar && !r.revealed { WhyCorrect { explain: explain.clone(), calc: calc.clone(), lines: key_lines.clone(), topic: Some(topic.clone()) } }
                if !benar && !r.revealed { Hints { kind: kind, id: id.clone(), topic: topic.clone(), lines: key_lines.clone(), calc: calc.clone() } }
                KeyBlock { kind: kind, id: id.clone(), revealed: r.revealed, lines: key_lines.clone(), topic: Some(topic.clone()), explain: explain.clone(), calc: calc.clone(), user_lines: Some(lines.clone()) }
                div { class: "mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--ds-border)] pt-4",
                    if i > 0 { button { class: "btn", onclick: move |_| idx.set(i - 1), "← Sebelumnya" } }
                    button { class: "btn btn-primary ml-auto", onclick: move |_| idx.set(i + 1), if benar { "Soal berikutnya →" } else { "Lewati →" } }
                }
            }
        }
    }
}
