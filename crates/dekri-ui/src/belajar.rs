//! Jalur Belajar, Ringkasan BAB, Klasifikasi arus kas.
use crate::components::*;
use crate::practice::rp;
use crate::session::{Page, Session};
use crate::shell::Icon;
use crate::widgets::*;
use dekri_core::actions;
use dekri_core::content::kas;
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::grade::Status;
use dekri_core::learning::*;
use dekri_core::variants::generate;
use dioxus::prelude::*;

#[component]
fn ModBadge(label: String, locked: bool, done: bool, running: bool) -> Element {
    if locked {
        return rsx! { span { class: "badge badge-neutral", "Terkunci" } };
    }
    let cls = if done {
        "badge badge-success"
    } else if running {
        "badge badge-info"
    } else {
        "badge badge-neutral"
    };
    rsx! { span { class: "{cls}", if done { Icon { name: "check", size: 12 } } "{label}" } }
}

#[component]
pub fn Belajar() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let s = app.read();
    let c = s.ctx();
    let all = module_statuses(&s.st.learning, &practice_map(&s.st, &c));
    let learn_sel = s.learn_sel;
    let hist: Vec<_> = s.st.learning.history.clone();
    let chosen_map = s.quiz_chosen.clone();
    let result_map = s.quiz_result.clone();
    drop(s);
    let next = recommend(&all).map(|n| (n.module.id.clone(), n.module.no, n.module.title.clone()));
    let sel = if learn_sel < all.len() {
        learn_sel
    } else {
        recommend(&all)
            .and_then(|r| all.iter().position(|a| a.module.id == r.module.id))
            .unwrap_or(all.len() - 1)
    };
    let overall = overall_percent(&all);
    let st = &all[sel];
    let m = st.module;
    let ex_variant = m
        .example
        .variant
        .as_ref()
        .and_then(|v| generate(&v.pattern, v.seed));
    let history: Vec<_> = hist
        .iter()
        .filter(|h| h.module == m.id)
        .rev()
        .take(5)
        .cloned()
        .collect();
    let chosen = chosen_map
        .get(&m.id)
        .cloned()
        .unwrap_or_else(|| vec![-1; m.quiz.len()]);
    let result = result_map.get(&m.id).cloned();
    let locked = st.locked;
    let mid = m.id.clone();
    let missing_txt = st
        .missing
        .iter()
        .map(|x| format!("{}. {}", x.no, x.title))
        .collect::<Vec<_>>()
        .join(", ");
    let best_txt = if st.attempts > 0 {
        format!(
            "{}/{}",
            (st.quiz_best * m.quiz.len() as f64).round(),
            m.quiz.len()
        )
    } else {
        "belum ada".to_string()
    };
    let hist_txt: Vec<String> = history
        .iter()
        .map(|h| {
            format!(
                "{}: {}/{} benar",
                h.ts.get(..16).unwrap_or(&h.ts).replace('T', " "),
                h.correct,
                h.total
            )
        })
        .collect();
    rsx! {
        div { class: "grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]",
            aside { class: "space-y-3",
                div { class: "card",
                    div { class: "t-label", "Kemajuan keseluruhan" }
                    div { class: "mt-0.5 text-3xl t-figure", "{overall}%" }
                    div { class: "mt-2", Meter { percent: overall as f64, label: format!("Kemajuan {overall} persen") } }
                    if let Some((id, no, title)) = next.clone() {
                        button { class: "btn btn-primary mt-3 w-full", onclick: move |_| { let pos = modules().iter().position(|x| x.id == id).unwrap_or(0); app.write().learn_sel = pos; }, "Lanjut: {no}. {title}" }
                    } else { p { class: "mt-3 text-sm text-emerald-800", "Seluruh materi selesai." } }
                }
                ul { class: "card ap-stagger !p-1",
                    for (i, x) in all.iter().enumerate() {
                        li { key: "{x.module.id}",
                            button { class: if sel == i { "ap-nav relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm bg-blue-50" } else { "ap-nav relative flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100" },
                                onclick: move |_| app.write().learn_sel = i,
                                span { class: "min-w-0 flex-1", span { class: "block truncate", "{x.module.no}. {x.module.title}" } span { class: "text-xs text-slate-500", "{x.percent}%" } }
                                ModBadge { label: x.status.label().to_string(), locked: x.locked, done: x.status == LearnStatus::Completed, running: x.status == LearnStatus::InProgress }
                            }
                        }
                    }
                }
            }
            section { key: "{m.id}", class: "card space-y-5",
                div { class: "flex flex-wrap items-center gap-2",
                    h2 { class: "text-2xl", "{m.no}. {m.title}" }
                    ModBadge { label: st.status.label().to_string(), locked, done: st.status == LearnStatus::Completed, running: st.status == LearnStatus::InProgress }
                    span { class: "ml-auto text-sm font-medium text-slate-600", "{st.percent}% selesai" }
                }
                if locked {
                    div { class: "callout callout-warning", role: "status",
                        "Materi ini terkunci untuk kuis dan penyelesaian. Selesaikan dulu: {missing_txt}. Anda tetap boleh membaca materinya." }
                }
                div { h3 { class: "t-card mb-1.5", "Tujuan pembelajaran" } ul { class: "list-disc space-y-1 pl-5 text-[0.9375rem] leading-6", for (i, o) in m.objectives.iter().enumerate() { li { key: "{i}", "{o}" } } } }
                div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Konsep" } p { class: "text-[0.9375rem] leading-6", "{m.concept}" } }
                div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Teori dasar" } ul { class: "list-disc space-y-1 pl-5 text-[0.9375rem] leading-6", for (i, t) in m.theory.iter().enumerate() { li { key: "{i}", "{t}" } } } }
                div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Contoh kasus dan penyelesaian" }
                    div { class: "rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-4 text-[0.9375rem] leading-6",
                        if let Some(v) = ex_variant.as_ref() {
                            p { "{v.narrative}" }
                            table { class: "my-2 bg-white", thead { tr { th { "Akun" } th { class: "num", "Debit" } th { class: "num", "Kredit" } } }
                                tbody { for (i, l) in v.lines.iter().enumerate() { tr { key: "{i}", td { span { class: "font-mono text-xs", "{l.code}" } " {l.name}" } td { class: "num", "{rp(l.debit)}" } td { class: "num", "{rp(l.credit)}" } } } } }
                            p { class: "mt-1", b { "Penyelesaian:" } " {v.explain}" }
                        } else {
                            p { "{m.example.case_text.clone().unwrap_or_default()}" }
                            p { class: "mt-1", b { "Penyelesaian:" } " {m.example.solution_text.clone().unwrap_or_default()}" }
                        }
                    }
                }
                if st.practice.is_some() || m.practice.is_some() {
                    div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Latihan di aplikasi" }
                        if let Some(p) = st.practice.as_ref() {
                            p { class: "text-sm", "{p.done.min(p.target)} dari {p.target} {p.label}." }
                            div { class: "my-1 max-w-sm", Meter { percent: p.done as f64 / p.target.max(1) as f64 * 100.0, label: format!("Latihan {} dari {}", p.done, p.target) } }
                            p { class: "text-xs text-slate-500", "Hanya jawaban yang diperiksa BENAR tanpa membuka kunci yang dihitung." }
                        }
                        if let Some(p) = m.practice.as_ref() {
                            button { class: "btn mt-1", onclick: { let h = p.href.clone(); move |_| app.write().go(&h) }, "{p.label} →" }
                        }
                    }
                }
                div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Evaluasi pemahaman" }
                    p { class: "mb-2 text-xs text-slate-500", "Lulus bila minimal 2 dari {m.quiz.len()} benar. Hasil terbaik Anda: {best_txt}." }
                    ol { class: "space-y-3",
                        for (i, q) in m.quiz.iter().enumerate() {
                            li { key: "{i}", class: "rounded-xl border border-[var(--ds-border)] p-3 text-[0.9375rem] leading-6",
                                p { class: "mb-1.5 font-semibold", "{i + 1}. {q.q}" }
                                div { class: "space-y-1", role: "radiogroup",
                                    for (k, o) in q.options.iter().enumerate() {
                                        label { key: "{k}", class: if let Some(r) = result.as_ref() { if k == q.answer { "flex items-start gap-2 rounded-lg bg-[var(--ds-success-bg)] px-2 py-1 font-medium text-[var(--ds-success-fg)]" } else if r.items[i].0 == k as i32 { "flex items-start gap-2 rounded-lg bg-[var(--ds-danger-bg)] px-2 py-1 font-medium text-[var(--ds-danger-fg)]" } else { "flex items-start gap-2 rounded-lg px-2 py-1" } } else { "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 hover:bg-[var(--ds-surface-2)]" },
                                            input { r#type: "radio", name: "{m.id}-{i}", disabled: locked || result.is_some(), checked: chosen[i] == k as i32,
                                                onchange: { let mid = mid.clone(); let n = m.quiz.len(); move |_| { let mut s = app.write(); let e = s.quiz_chosen.entry(mid.clone()).or_insert_with(|| vec![-1; n]); e[i] = k as i32; } } }
                                            span { "{o}" }
                                        }
                                    }
                                }
                                if let Some(r) = result.as_ref() {
                                    p { class: if r.items[i].1 { "callout callout-success mt-2" } else { "callout callout-danger mt-2" }, if r.items[i].1 { "Benar. " } else { "Belum tepat. " } "{q.why}" }
                                }
                            }
                        }
                    }
                    div { class: "mt-3 flex flex-wrap items-center gap-2",
                        if let Some(r) = result.clone() {
                            span { class: "text-sm font-medium", "{r.correct}/{r.total} benar · " if r.passed { "Lulus" } else { "Belum lulus" } }
                            button { class: "btn", onclick: { let mid = mid.clone(); move |_| { let mut s = app.write(); s.quiz_result.remove(&mid); s.quiz_chosen.remove(&mid); } }, "Coba lagi" }
                        } else {
                            button { class: "btn btn-primary", disabled: locked || chosen.iter().any(|c| *c < 0),
                                onclick: { let mid = mid.clone(); let ch = chosen.clone(); move |_| { let mut s = app.write(); if let Some(r) = actions::submit_quiz(&mut s.st, &mid, &ch) { s.quiz_result.insert(mid.clone(), r); s.refresh(); } } }, "Kirim jawaban" }
                        }
                    }
                }
                if !history.is_empty() {
                    div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Riwayat kuis materi ini" }
                        ul { class: "text-sm text-slate-700", for (i, t) in hist_txt.iter().enumerate() { li { key: "{i}", "{t}" } } } }
                }
            }
        }
    }
}

#[component]
pub fn Materi() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let ms = materi();
    let sel = app.read().bab_sel.min(ms.len() - 1);
    let m = &ms[sel];
    let s = app.read();
    let c = s.ctx();
    let scs: Vec<_> = m
        .scenarios
        .iter()
        .filter_map(|no| {
            data().scenarios.iter().find(|x| x.no == *no).map(|x| {
                (
                    *no,
                    x.topic.lines().next().unwrap_or("").to_string(),
                    result_for(&s.st, ItemKind::Sc, &no.to_string(), &c).shown,
                )
            })
        })
        .collect();
    drop(s);
    rsx! {
        div { class: "space-y-3",
            p { class: "text-sm text-slate-600", "Ringkasan satu halaman per BAB: jurnal standar, rumus, dan jebakan umum. Alat belajar, bukan pengganti teks standar (PSAK)." }
            div { class: "grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]",
                ul { class: "card h-fit !p-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto",
                    for (i, x) in ms.iter().enumerate() {
                        li { key: "{i}", button { class: if sel == i { "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm bg-blue-50" } else { "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100" }, onclick: move |_| app.write().bab_sel = i, "BAB {x.bab} · {x.title}" } }
                    }
                }
                section { key: "{sel}", class: "card space-y-5 ap-enter",
                    h2 { class: "text-2xl", "BAB {m.bab} · {m.title}" }
                    p { class: "text-[0.9375rem] leading-6", "{m.ringkas}" }
                    div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Jurnal standar" }
                        for (i, j) in m.jurnal.iter().enumerate() {
                            div { key: "{i}", class: "mb-2 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-3", div { class: "text-sm font-semibold", "{j.judul}" }
                                for (k, b) in j.baris.iter().enumerate() { div { key: "{k}", class: "font-mono text-xs", "{b}" } } }
                        } }
                    div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Rumus" } ul { class: "list-disc space-y-1 pl-5 text-[0.9375rem] leading-6", for (i, r) in m.rumus.iter().enumerate() { li { key: "{i}", "{r}" } } } }
                    div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Jebakan umum" } ul { class: "list-disc space-y-1 pl-5 text-[0.9375rem] leading-6", for (i, r) in m.jebakan.iter().enumerate() { li { key: "{i}", "{r}" } } } }
                    div { class: "border-t border-[var(--ds-border)] pt-4", h3 { class: "t-card mb-1.5", "Soal skenario BAB ini" }
                        if scs.is_empty() { p { class: "text-sm text-slate-500", "Tidak ada skenario untuk BAB ini." } }
                        ul { class: "space-y-1 text-sm", for (no, topic, shown) in scs { li { key: "{no}", class: "flex items-center gap-2",
                            button { class: "text-blue-700 underline", onclick: move |_| app.write().go(&format!("skenario/{no}")), "Skenario {no}: {topic}" } StatusBadge { status: shown } } } } }
                }
            }
        }
    }
}

#[component]
pub fn ArusKas() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let k = kas();
    let reveal = app.read().var_reveal.clone();
    let chosen = app.read().kas_chosen.clone();
    rsx! {
        div { class: "space-y-4",
            p { class: "text-sm text-slate-600", "Latihan terpisah dari 26 skenario inti: tidak memengaruhi akurasi Dashboard maupun pool ujian. Dua kelompok dipisah menurut periode berlaku." }
            for (g, info) in k.kelompok.iter() {
                section { key: "{g}", class: "space-y-3",
                    div { h2 { "{info.judul}" } p { class: "text-xs", "{info.standar} · {info.periode}" } p { class: "text-xs text-slate-500", "{info.asumsi}" } }
                    for q in k.soal.iter().filter(|q| &q.kelompok == g) {
                        {
                            let chk = format!("kas:{}", q.id);
                            let done = reveal.contains(&chk);
                            let cur = chosen.get(&q.id).copied();
                            let ok = cur == Some(q.kunci);
                            let qid = q.id.clone();
                            let qkey = q.kunci;
                            rsx! {
                                div { key: "{q.id}", class: "card",
                                    div { class: "mb-1 flex items-center justify-between", b { "{q.id} · {q.judul}" }
                                        if done { StatusBadge { status: Some(if ok { Status::Benar } else { Status::Periksa }) } } }
                                    p { class: "text-sm", "{q.narasi}" }
                                    p { class: "my-2 text-sm font-medium", "{q.pertanyaan}" }
                                    div { class: "space-y-2",
                                        for (i, o) in q.opsi.iter().enumerate() {
                                            div { key: "{i}",
                                                label { class: "flex items-start gap-2 text-sm", input { r#type: "radio", name: "{q.id}", checked: cur == Some(i), disabled: done,
                                                    onchange: { let qid = qid.clone(); move |_| { app.write().kas_chosen.insert(qid.clone(), i); } } } span { "{o.teks}" } }
                                                if done { p { class: if i == q.kunci { "ml-6 text-xs text-green-800" } else if cur == Some(i) { "ml-6 text-xs text-red-800" } else { "ml-6 text-xs text-slate-500" }, "{o.alasan}" } }
                                            }
                                        }
                                    }
                                    div { class: "mt-2 flex items-center gap-2",
                                        if !done {
                                            button { class: "btn btn-primary", disabled: cur.is_none(), onclick: { let chk = chk.clone(); let qid = qid.clone(); move |_| {
                                                let mut s = app.write(); s.var_reveal.insert(chk.clone());
                                                actions::log_attempt(&mut s.st, "kas", &qid, if cur == Some(qkey) { Status::Benar } else { Status::Periksa }); s.refresh(); } }, "Periksa" }
                                        } else {
                                            button { class: "btn", onclick: { let chk = chk.clone(); let qid = qid.clone(); move |_| { let mut s = app.write(); s.var_reveal.remove(&chk); s.kas_chosen.remove(&qid); } }, "Coba lagi" }
                                        }
                                    }
                                    if done { div { class: "callout callout-info mt-3", p { "{q.penjelasan}" } p { class: "mt-1 text-xs opacity-80", "Dasar: {q.dasar}" } } }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Pindah antara jalur berurutan dan ringkasan BAB (padanan BelajarTabs versi 1).
#[component]
pub fn BelajarTabs(active: u8) -> Element {
    let mut app = use_context::<Signal<Session>>();
    rsx! {
        div { class: "seg no-print mb-3", role: "tablist", "aria-label": "Bagian belajar",
            button { role: "tab", "aria-selected": "{active == 0}", class: if active == 0 { "btn btn-primary" } else { "btn" }, onclick: move |_| { let mut s = app.write(); s.page = Page::Belajar; s.nonce += 1; }, "Jalur 13 materi" }
            button { role: "tab", "aria-selected": "{active == 1}", class: if active == 1 { "btn btn-primary" } else { "btn" }, onclick: move |_| { let mut s = app.write(); s.page = Page::Materi; s.nonce += 1; }, "Ringkasan BAB 7–18" }
        }
    }
}
