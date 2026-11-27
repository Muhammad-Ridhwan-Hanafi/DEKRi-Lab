//! Mode ujian: setup, pengerjaan tanpa umpan balik, hasil dan pembahasan.
use crate::components::{ConfirmButton, JournalForm, StatusBadge};
use crate::kerja::coa;
use crate::practice::*;
use crate::session::{unix_now, ExamUi, Phase, Session};
use crate::widgets::pct;
use dekri_core::actions;
use dekri_core::data::data;
use dekri_core::exam::*;
use dekri_core::grade::Status;
use dekri_core::state::ExamRecord;
use dekri_core::types::JournalLine;
use dioxus::prelude::*;

pub fn fmt_time(sec: i64) -> String {
    let s = sec.max(0);
    format!("{}:{:02}", s / 60, s % 60)
}
fn ratio(c: usize, t: usize) -> String {
    if t > 0 {
        pct(c as f64 / t as f64)
    } else {
        "—".to_string()
    }
}
fn iso(secs: i64) -> String {
    chrono::DateTime::from_timestamp(secs, 0)
        .unwrap_or_default()
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

impl Session {
    pub fn finish_exam(&mut self) {
        if self.exam.phase != Phase::Run {
            return;
        }
        let score = grade_exam(&self.exam.items, &self.exam.answers);
        let now = unix_now();
        let doubtful = self
            .exam
            .items
            .iter()
            .filter(|it| {
                self.exam
                    .answers
                    .doubt
                    .get(&it.key())
                    .copied()
                    .unwrap_or(false)
            })
            .count() as u32;
        actions::add_exam(
            &mut self.st,
            ExamRecord {
                id: (now * 1000).to_string(),
                started_at: iso(self.exam.started_at),
                finished_at: iso(now),
                total: score.total as u32,
                correct: score.correct as u32,
                doubtful,
                seconds: (now - self.exam.started_at).max(0) as u32,
                scope: self.exam.scope.clone(),
            },
        );
        self.exam.finished_at = now;
        self.exam.score = Some(score);
        self.exam.phase = Phase::Done;
        self.exam.dirty = true;
        self.refresh();
    }
    /// Khusus pengembangan (DEKRI_EXAM=run|done): langsung mulai ujian untuk tangkapan layar.
    pub fn debug_exam(&mut self, mode: &str) {
        let kinds = ["txn", "adj", "sc", "cor", "err"];
        let items = pick_exam(8, &kinds, 7, |_| true);
        let e = &mut self.exam;
        e.items = items;
        e.answers = ExamAnswers::default();
        e.index = 0;
        e.started_at = unix_now() - 75;
        e.limit_sec = 600;
        e.phase = Phase::Run;
        if mode == "done" {
            self.finish_exam();
        }
    }
    pub fn exam_expired(&self) -> bool {
        self.exam.phase == Phase::Run
            && self.exam.limit_sec > 0
            && unix_now() - self.exam.started_at >= self.exam.limit_sec
    }
}

fn answered(e: &ExamUi, it: &ExamItem) -> bool {
    let has = |m: &std::collections::BTreeMap<String, Vec<JournalLine>>| {
        m.get(&it.id).is_some_and(|ls| {
            ls.iter()
                .any(|l| l.code.is_some() || l.debit != 0.0 || l.credit != 0.0)
        })
    };
    match it.kind.as_str() {
        "txn" => {
            has(&e.answers.journal) || e.answers.no_journal.get(&it.id).copied().unwrap_or(false)
        }
        "adj" => has(&e.answers.adjusting),
        "cor" => has(&e.answers.correcting) || e.answers.error_type.contains_key(&it.id),
        "err" => e.answers.error_type.contains_key(&it.id),
        _ => e
            .answers
            .scenarios
            .get(&it.id)
            .is_some_and(|a| a.answer.as_deref().is_some_and(|x| !x.is_empty())),
    }
}

#[component]
pub fn Ujian() -> Element {
    let app = use_context::<Signal<Session>>();
    let mut tick = use_signal(|| 0u32);
    use_future(move || async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
            tick += 1;
        }
    });
    let _ = tick();
    {
        let exp = app.read().exam_expired();
        if exp {
            let mut a = app;
            a.write().finish_exam();
        }
    }
    let phase = app.read().exam.phase;
    rsx! { match phase { Phase::Setup => rsx! { Setup {} }, Phase::Run => rsx! { Run {} }, Phase::Done => rsx! { Done {} } } }
}

#[component]
fn Setup() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let s = app.read();
    let kinds_on = s.exam.kinds;
    let scope = s.exam.scope_sel;
    let count = s.exam.count;
    let minutes = s.exam.minutes;
    let kinds: Vec<&str> = EXAM_KINDS
        .iter()
        .enumerate()
        .filter(|(i, _)| kinds_on[*i])
        .map(|(_, k)| k.0)
        .collect();
    let available = if kinds.is_empty() {
        0
    } else {
        pick_exam(999, &kinds, 1, |it| in_scope(scope, &s.st, it)).len()
    };
    let hist: Vec<_> = s.st.exams.iter().rev().cloned().collect();
    drop(s);
    let kinds_len = kinds.len();
    rsx! {
        div { class: "grid gap-4 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]",
            div { class: "card space-y-3",
                h2 { class: "t-card", "Mode ujian" }
                p { class: "text-sm text-slate-600", "Soal diacak dan dijawab tanpa umpan balik dan tanpa kunci. Nilai dan pembahasan muncul setelah ujian selesai. Ujian tidak mengubah progres belajar. Sesi yang sedang berjalan tersimpan, jadi aman bila aplikasi ditutup (waktu tetap berjalan)." }
                fieldset { class: "space-y-1 text-sm",
                    legend { class: "mb-1 font-medium", "Jenis soal" }
                    for (i, (_, label)) in EXAM_KINDS.iter().enumerate() {
                        label { key: "{i}", class: "flex items-center gap-2",
                            input { r#type: "checkbox", checked: kinds_on[i], onchange: move |e| { app.write().exam.kinds[i] = e.checked(); } } " {label}" }
                    }
                }
                label { class: "block text-sm",
                    span { class: "mb-1 block font-medium", "Cakupan" }
                    select { "aria-label": "Cakupan ujian", onchange: move |e| { if let Some((sc, _, _)) = SCOPES.iter().find(|x| x.1 == e.value()) { app.write().exam.scope_sel = *sc; } },
                        for (sc, id, label) in SCOPES.iter() { option { key: "{id}", value: "{id}", selected: *sc == scope, "{label}" } } }
                    span { class: "mt-0.5 block text-xs text-slate-500", "{available} soal tersedia untuk pilihan ini. Tingkat hanya berlaku untuk jurnal transaksi dan penyesuaian." }
                }
                div { class: "flex flex-wrap gap-4",
                    label { class: "block text-sm", span { class: "mb-1 block font-medium", "Jumlah soal" }
                        input { "aria-label": "Jumlah soal", r#type: "number", min: "1", max: "60", class: "w-24", value: "{count}", onchange: move |e| { let n = e.value().parse::<usize>().unwrap_or(1); app.write().exam.count = n.clamp(1, 60); } } }
                    label { class: "block text-sm", span { class: "mb-1 block font-medium", "Batas waktu (menit, 0 = tanpa batas)" }
                        input { "aria-label": "Batas waktu menit", r#type: "number", min: "0", max: "240", class: "w-24", value: "{minutes}", onchange: move |e| { let n = e.value().parse::<i64>().unwrap_or(0); app.write().exam.minutes = n.clamp(0, 240); } } }
                }
                button { class: "btn btn-primary", disabled: kinds_len == 0 || available == 0, onclick: move |_| {
                    let mut s = app.write();
                    let kinds: Vec<&str> = EXAM_KINDS.iter().enumerate().filter(|(i, _)| s.exam.kinds[*i]).map(|(_, k)| k.0).collect();
                    let seed = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(1) & 0x7fffffff;
                    let sc = s.exam.scope_sel; let cnt = s.exam.count;
                    let items = pick_exam(cnt, &kinds, seed, |it| in_scope(sc, &s.st, it));
                    if !items.is_empty() {
                        let e = &mut s.exam;
                        e.items = items; e.answers = ExamAnswers::default(); e.index = 0; e.started_at = unix_now(); e.limit_sec = e.minutes * 60; e.scope = scope_id(e.scope_sel).to_string(); e.score = None; e.phase = Phase::Run; e.dirty = true;
                    }
                }, "Mulai ujian" }
            }
            div { class: "card",
                h2 { class: "t-card mb-2", "Riwayat ujian" }
                if hist.is_empty() { p { class: "text-sm text-slate-500", "Belum ada ujian yang diselesaikan. Atur jumlah soal di atas, lalu tekan Mulai ujian; hasilnya tersimpan di sini." } }
                else { table { thead { tr { th { "Tanggal" } th { "Cakupan" } th { class: "num", "Skor" } th { class: "num", "Ragu" } th { class: "num", "Waktu" } } }
                    tbody { for e in hist.iter() { {let when = e.finished_at.get(..16).unwrap_or(&e.finished_at).replace('T', " "); let sc = scope_label(&e.scope); let score = format!("{}/{} ({})", e.correct, e.total, ratio(e.correct as usize, e.total as usize)); let wt = fmt_time(e.seconds as i64); rsx! { tr { key: "{e.id}", td { "{when}" } td { "{sc}" } td { class: "num", "{score}" } td { class: "num", "{e.doubtful}" } td { class: "num", "{wt}" } } }} } } } }
            }
        }
    }
}

fn lines_of(
    m: &std::collections::BTreeMap<String, Vec<JournalLine>>,
    id: &str,
) -> Vec<JournalLine> {
    m.get(id).cloned().unwrap_or_default()
}

#[component]
fn Run() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let d = data();
    let s = app.read();
    let e = &s.exam;
    let n = e.items.len();
    let idx = e.index.min(n.saturating_sub(1));
    let elapsed = unix_now() - e.started_at;
    let left = e.items.iter().filter(|it| !answered(e, it)).count();
    let nav: Vec<(bool, bool)> = e
        .items
        .iter()
        .map(|it| {
            (
                answered(e, it),
                e.answers.doubt.get(&it.key()).copied().unwrap_or(false),
            )
        })
        .collect();
    let it = e.items[idx].clone();
    let limit = e.limit_sec;
    let doubt = e.answers.doubt.get(&it.key()).copied().unwrap_or(false);
    let answers = e.answers.clone();
    drop(s);
    let remaining = limit - elapsed;
    let id = it.id.clone();
    let types = d.correcting.error_type_options.clone();
    let et = answers.error_type.get(&id).cloned().unwrap_or_default();
    let mut upd = move |f: Box<dyn FnOnce(&mut ExamUi)>| {
        let mut s = app.write();
        f(&mut s.exam);
        s.exam.dirty = true;
    };
    let opts = coa();
    let none = answers.no_journal.get(&id).copied().unwrap_or(false);
    rsx! {
        div { class: "space-y-3",
            div { class: "card flex flex-wrap items-center gap-2",
                b { "Soal {idx + 1} dari {n}" }
                span { class: "text-sm text-slate-600", "· belum dijawab: {left}" }
                if limit == 0 { span { class: "text-sm text-slate-600", "Waktu: {fmt_time(elapsed)}" } }
                else { span { class: if remaining <= 60 { "text-sm font-medium text-red-700" } else { "text-sm font-medium text-slate-700" }, role: "timer", "aria-label": "Sisa waktu", "Sisa waktu: {fmt_time(remaining)}" } }
                span { class: "ml-auto flex flex-wrap gap-1",
                    for (i, (done, dbt)) in nav.iter().enumerate() {
                        {let label = format!("{}{}", i + 1, if *dbt { "?" } else { "" }); rsx! {
                            button { key: "{i}", class: if i == idx { "btn px-2 py-0.5 btn-primary" } else if *done { "btn px-2 py-0.5" } else { "btn px-2 py-0.5 text-slate-500" }, onclick: move |_| { app.write().exam.index = i; }, "{label}" } }}
                    }
                }
            }
            div { class: "card",
                {
                    match it.kind.as_str() {
                        "txn" => { let t = d.transactions.iter().find(|t| t.no.to_string() == id).cloned(); rsx! {
                            div { class: "space-y-2",
                                if let Some(t) = t { h3 { class: "font-semibold", "Transaksi {id} · {t.date}" } p { class: "text-sm", "{t.narrative}" } p { class: "text-sm text-slate-600", "{t.party} · {t.amount_info}" } }
                                label { class: "flex items-center gap-2 text-sm", input { r#type: "checkbox", checked: none, onchange: { let id = id.clone(); move |ev: Event<FormData>| { let c = ev.checked(); let id = id.clone(); upd(Box::new(move |e| { e.answers.no_journal.insert(id, c); })); } } } " Peristiwa ini tidak perlu jurnal" }
                                if !none { JournalForm { key: "{id}", id_prefix: format!("Ujian {id}"), lines: lines_of(&answers.journal, &id), min_rows: 4, show_check: false, exam: true, options: opts.clone(),
                                    on_change: { let id = id.clone(); move |v: Vec<JournalLine>| { let id = id.clone(); upd(Box::new(move |e| { e.answers.journal.insert(id, v); })); } } } }
                            }
                        } },
                        "adj" => { let a = d.adjustments.iter().find(|a| a.code == id).cloned(); rsx! {
                            div { class: "space-y-2",
                                if let Some(a) = a { h3 { class: "font-semibold", "{a.code} · {a.category}" } p { class: "rounded-sm bg-slate-50 p-2 text-sm", "{a.facts}" } }
                                JournalForm { key: "{id}", id_prefix: format!("Ujian {id}"), lines: lines_of(&answers.adjusting, &id), min_rows: 3, show_check: false, exam: true, options: opts.clone(),
                                    on_change: { let id = id.clone(); move |v: Vec<JournalLine>| { let id = id.clone(); upd(Box::new(move |e| { e.answers.adjusting.insert(id, v); })); } } }
                            }
                        } },
                        "sc" => { let sc = d.scenarios.iter().find(|s| s.no.to_string() == id).cloned(); let a = answers.scenarios.get(&id).cloned().unwrap_or_default(); rsx! {
                            div { class: "space-y-2",
                            if let Some(sc) = sc {
                                h3 { class: "font-semibold", "Skenario {id} · {sc.topic}" } p { class: "text-sm", "{sc.case_and_facts}" } p { class: "text-sm font-medium", "{sc.question}" }
                                if sc.kind == "choice" {
                                    select { "aria-label": "Jawaban ujian {id}", class: "w-full", onchange: { let id = id.clone(); move |ev: Event<FormData>| { let v = ev.value(); let id = id.clone(); upd(Box::new(move |e| { e.answers.scenarios.entry(id).or_default().answer = Some(v); })); } },
                                        option { value: "", selected: a.answer.as_deref().unwrap_or("").is_empty(), "— pilih —" }
                                        for o in sc.options.clone().unwrap_or_default() { option { key: "{o}", value: "{o}", selected: a.answer.as_deref() == Some(o.as_str()), "{o}" } } }
                                } else {
                                    input { "aria-label": "Jawaban ujian {id}", class: "w-full sm:w-64", inputmode: "numeric", placeholder: "Angka (Rp)", value: "{a.answer.clone().unwrap_or_default()}", oninput: { let id = id.clone(); move |ev: Event<FormData>| { let v: String = ev.value().chars().filter(|c| c.is_ascii_digit() || *c == '-').collect(); let id = id.clone(); upd(Box::new(move |e| { e.answers.scenarios.entry(id).or_default().answer = Some(v); })); } } }
                                }
                            } }
                        } },
                        kind => { let cor = kind == "cor"; let ev = (if cor { &d.correcting.correcting } else { &d.correcting.detect }).iter().find(|e| e.no.to_string() == id).cloned(); let ev_txt = ev.map(|e| e.event).unwrap_or_default(); rsx! {
                            div { class: "space-y-2",
                                h3 { class: "font-semibold", if cor { "Koreksi {id}" } else { "Deteksi kesalahan {id}" } }
                                p { class: "text-sm", "{ev_txt}" }
                                if cor {
                                    label { class: "block text-sm", span { class: "mb-0.5 block text-xs text-slate-500", "Jenis kesalahan" }
                                        select { "aria-label": "Jenis kesalahan ujian {id}", class: "w-full sm:w-80", onchange: { let id = id.clone(); move |ev: Event<FormData>| { let v = ev.value(); let id = id.clone(); upd(Box::new(move |e| { e.answers.error_type.insert(id, v); })); } },
                                            option { value: "", selected: et.is_empty(), "— pilih —" } for t in types.iter() { option { key: "{t}", value: "{t}", selected: *t == et, "{t}" } } } }
                                    JournalForm { id_prefix: format!("Ujian koreksi {id}"), lines: lines_of(&answers.correcting, &id), min_rows: 3, show_check: false, exam: true, options: opts.clone(),
                                        on_change: { let id = id.clone(); move |v: Vec<JournalLine>| { let id = id.clone(); upd(Box::new(move |e| { e.answers.correcting.insert(id, v); })); } } }
                                } else {
                                    select { "aria-label": "Jenis kesalahan ujian {id}", class: "w-full sm:w-80", onchange: { let id = id.clone(); move |ev: Event<FormData>| { let v = ev.value(); let id = id.clone(); upd(Box::new(move |e| { e.answers.error_type.insert(id, v); })); } },
                                        option { value: "", selected: et.is_empty(), "— pilih —" } for t in types.iter() { option { key: "{t}", value: "{t}", selected: *t == et, "{t}" } } }
                                }
                            }
                        } },
                    }
                }
                label { class: "mt-3 flex items-center gap-2 text-sm", input { r#type: "checkbox", checked: doubt, onchange: { let key = it.key(); move |ev: Event<FormData>| { let c = ev.checked(); let key = key.clone(); upd(Box::new(move |e| { e.answers.doubt.insert(key, c); })); } } } " Ragu-ragu (tandai untuk ditinjau lagi)" }
                div { class: "mt-3 flex flex-wrap gap-2",
                    button { class: "btn", disabled: idx == 0, onclick: move |_| { app.write().exam.index = idx - 1; }, "← Sebelumnya" }
                    button { class: "btn", disabled: idx + 1 >= n, onclick: move |_| { app.write().exam.index = idx + 1; }, "Berikutnya →" }
                    span { class: "ml-auto flex gap-2",
                        ConfirmButton { label: "Batalkan", message: "Jawaban ujian dibuang.", confirm_label: "Ya, batalkan", on_confirm: move |_| { let mut s = app.write(); s.exam = Default::default(); s.exam.dirty = true; } }
                        if left == 0 { button { class: "btn btn-primary", onclick: move |_| app.write().finish_exam(), "Selesai dan nilai" } }
                        else { ConfirmButton { label: "Selesai dan nilai", message: format!("{left} soal belum dijawab."), confirm_label: "Nilai sekarang", on_confirm: move |_| app.write().finish_exam() } }
                    }
                }
            }
        }
    }
}

fn kind_label(k: &str) -> &'static str {
    match k {
        "txn" => "Jurnal transaksi",
        "adj" => "Jurnal penyesuaian",
        "sc" => "Soal skenario",
        "cor" => "Jurnal koreksi",
        _ => "Deteksi kesalahan",
    }
}

#[component]
fn Pembahasan(kind: String, id: String) -> Element {
    let d = data();
    match kind.as_str() {
        "txn" => {
            let k = d
                .key
                .readable_txn
                .iter()
                .find(|k| k.no.to_string() == id)
                .cloned();
            rsx! { if let Some(k) = k {
            if k.lines.is_empty() { p { "Tidak ada jurnal." } }
            KeyJournal { lines: key_lines(&k.lines) } StepExplain { lines: key_lines(&k.lines), topic: Some(k.topic.clone()), explain: k.explain.clone() } } }
        }
        "adj" => {
            let k = d.key.readable_adj.iter().find(|k| k.code == id).cloned();
            rsx! { if let Some(k) = k { KeyJournal { lines: key_lines(&k.lines) } StepExplain { lines: key_lines(&k.lines), topic: Some(k.category.clone()), explain: k.explain.clone(), calc: k.calc.clone() } } }
        }
        "sc" => {
            let k = d.key.scenario.get(&id).cloned();
            rsx! { if let Some(k) = k { p { "Kunci: " b { "{k.key}" } } } }
        }
        "err" => {
            let k = d.key.error_type.get(&id).cloned().unwrap_or_default();
            rsx! { p { "Jawaban: " b { "{k}" } } }
        }
        _ => {
            let et = d
                .key
                .error_type
                .get(&id)
                .cloned()
                .unwrap_or_else(|| "—".into());
            let net: Vec<String> = d
                .key
                .correcting_net
                .get(&id)
                .map(|m| {
                    m.iter()
                        .map(|(k, v)| {
                            format!(
                                "{}: {} {}",
                                k,
                                if *v > 0.0 { "debit" } else { "kredit" },
                                dekri_core::money::format_rupiah(v.abs(), false)
                            )
                        })
                        .collect()
                })
                .unwrap_or_default();
            rsx! { p { "Jenis kesalahan: " b { "{et}" } }
            if net.is_empty() { p { "Tidak perlu jurnal koreksi." } } else { ul { class: "list-disc pl-5", for (i, l) in net.iter().enumerate() { li { key: "{i}", "{l}" } } } } }
        }
    }
}

#[component]
fn Done() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let s = app.read();
    let Some(score) = s.exam.score.as_ref() else {
        drop(s);
        app.write().exam.phase = Phase::Setup;
        return rsx! {};
    };
    let total = score.total;
    let correct = score.correct;
    let secs = (s.exam.finished_at - s.exam.started_at).max(1);
    let rows: Vec<_> = score
        .results
        .iter()
        .map(|(it, r, ans)| {
            (
                it.clone(),
                r.grade.status,
                r.grade.message.clone(),
                *ans,
                s.exam
                    .answers
                    .doubt
                    .get(&it.key())
                    .copied()
                    .unwrap_or(false),
            )
        })
        .collect();
    drop(s);
    let doubtful = rows.iter().filter(|r| r.4).count();
    let doubt_ok = rows
        .iter()
        .filter(|r| r.4 && r.3 && r.1 == Status::Benar)
        .count();
    let wrong: Vec<ExamItem> = rows
        .iter()
        .filter(|r| !(r.3 && r.1 == Status::Benar))
        .map(|r| r.0.clone())
        .collect();
    let can_flag = wrong.iter().any(|i| i.kind != "cor" && i.kind != "err");
    let ratio_txt = ratio(correct, total);
    let info = format!("Waktu pengerjaan {}. {}Buka \"Pembahasan\" pada tiap soal untuk melihat kunci dan penjelasan.", fmt_time(secs), if doubtful > 0 { format!("Soal ragu-ragu: {doubtful}, benar {doubt_ok}. ") } else { String::new() });
    rsx! {
        div { class: "card space-y-3",
            div { class: "flex flex-wrap items-start justify-between gap-3",
                div {
                    h2 { class: "t-card", "Hasil ujian" }
                    p { class: "mt-1 text-4xl t-figure text-blue-700", "{correct} / {total} " span { class: "text-lg font-semibold text-slate-600", "({ratio_txt})" } }
                }
                div { class: "flex flex-wrap items-center gap-2",
                    if can_flag { button { class: "btn", onclick: { let wrong = wrong.clone(); move |_| { let mut s = app.write(); for it in wrong.iter().filter(|i| i.kind == "txn" || i.kind == "adj" || i.kind == "sc") { if !s.st.flags.contains(&it.key()) { actions::toggle_flag(&mut s.st, it.item_kind(), &it.id); } } s.changed(); s.say("Soal yang belum benar ditandai."); } }, "Tandai semua soal yang belum benar untuk dikerjakan ulang" } }
                    button { class: "btn btn-primary", onclick: move |_| { app.write().exam = Default::default(); }, "Ujian baru" }
                }
            }
            p { class: "callout callout-info", "{info}" }
            div { class: "card-data", table { class: "data-table",
                thead { tr { th { "Soal" } th { "Hasil" } th { "Keterangan" } th {} } }
                tbody {
                    for (it, st, msg, ans, dbt) in rows {
                        tr { key: "{it.kind}-{it.id}",
                            td { "{kind_label(&it.kind)} {it.id}" if dbt { span { class: "ml-1 text-xs text-amber-700", "(ragu)" } } }
                            td { StatusBadge { status: Some(if ans { st } else { Status::Belum }) } }
                            td { class: "text-sm", { if ans { msg.clone() } else { "Tidak dijawab.".to_string() } }
                                details { class: "mt-1",
                                    summary { class: "cursor-pointer select-none text-xs text-blue-700", "Pembahasan" }
                                    div { class: "callout callout-info mt-1", Pembahasan { kind: it.kind.clone(), id: it.id.clone() } }
                                }
                            }
                            td { button { class: "btn", onclick: { let it = it.clone(); move |_| { let href = match it.kind.as_str() { "txn" => format!("transaksi/{}", it.id), "adj" => format!("penyesuaian/{}", it.id), "sc" => "skenario".to_string(), _ => "koreksi".to_string() }; app.write().open_href(&href); } }, "Buka soal" } }
                        }
                    }
                }
            } }
        }
    }
}
