//! Penyesuaian, Penutup, Koreksi, Skenario (padanan halaman versi 1).
use crate::components::*;
use crate::practice::*;
use crate::session::Session;
use dekri_core::closing::{expected_closing, post_closing_tb, ClosingEntry};
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::grade::Status;
use dekri_core::money::format_rupiah;
use dioxus::prelude::*;

pub fn coa() -> Vec<(String, String)> {
    data()
        .coa
        .iter()
        .map(|a| (a.code.clone(), a.name.clone()))
        .collect()
}
fn acct(code: &str) -> String {
    data()
        .coa
        .iter()
        .find(|a| a.code == code)
        .map(|a| a.name.clone())
        .unwrap_or_default()
}

#[component]
pub fn Penyesuaian() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let d = data();
    let mut open = use_signal(|| {
        d.adjustments
            .get(app.read().sel.get("adj").copied().unwrap_or(0))
            .map(|a| a.code.clone())
            .unwrap_or_default()
    });
    let s = app.read();
    let c = s.ctx();
    let cards: Vec<_> = d
        .adjustments
        .iter()
        .map(|a| {
            let r = result_for(&s.st, ItemKind::Adj, &a.code, &c);
            let key = d
                .key
                .readable_adj
                .iter()
                .find(|x| x.code == a.code)
                .cloned();
            let lines = s.st.adjusting.get(&a.code).cloned().unwrap_or_default();
            (a.clone(), r, key, lines)
        })
        .collect();
    drop(s);
    rsx! {
        div { class: "space-y-2",
            p { class: "text-sm text-slate-600", "Jurnal penyesuaian 31 Desember 2024. Baca fakta, lalu jurnal. Hasilnya otomatis masuk Neraca Saldo setelah penyesuaian dan seluruh laporan." }
            for (idx, (a, r, key, lines)) in cards.iter().cloned().enumerate() {
                div { key: "{a.code}", class: "card",
                    button { class: "flex w-full items-center justify-between gap-2 text-left", "aria-expanded": "{*open.read() == a.code}",
                        onclick: { let code = a.code.clone(); move |_| { let o = *open.read() == code; open.set(if o { String::new() } else { code.clone() }); } },
                        span { b { "{a.code}" } " · {a.category} " span { class: "text-xs text-slate-500", "({a.level})" } }
                        StatusBadge { status: r.shown }
                    }
                    if *open.read() == a.code {
                        div { class: "mt-2",
                            p { class: "mb-2 rounded-sm bg-slate-50 p-2 text-sm", "{a.facts}" }
                            JournalForm { id_prefix: a.code.clone(), lines: lines.clone(), min_rows: 3, result: Some(r.clone()), options: coa(),
                                on_change: { let code = a.code.clone(); move |v| { let mut s = app.write(); s.st.adjusting.insert(code.clone(), v); s.changed(); } },
                                on_check: { let code = a.code.clone(); move |_| { app.write().check_item(ItemKind::Adj, &code); } } }
                            Riwayat { kind: ItemKind::Adj, id: a.code.clone() }
                            if r.shown == Some(Status::Benar) {
                                button { class: "btn btn-primary mt-2", onclick: move |_| { if let Some(n) = cards_next(idx) { open.set(n); } }, "Penyesuaian berikutnya →" }
                            }
                            {
                                let kl = key.as_ref().map(|k| key_lines(&k.lines)).unwrap_or_default();
                                let benar = r.shown == Some(Status::Benar);
                                let calc = key.as_ref().and_then(|k| k.calc.clone());
                                let explain = key.as_ref().and_then(|k| k.explain.clone());
                                let text = a.facts.clone();
                                rsx! {
                                    if r.shown == Some(Status::Periksa) && !r.revealed && !kl.is_empty() { Diagnosis { lines: lines.clone(), key_lines: kl.clone(), text: text } }
                                    if benar && !r.revealed { WhyCorrect { explain: explain.clone(), calc: calc.clone(), lines: kl.clone(), topic: Some(a.category.clone()) } }
                                    if !benar && !r.revealed { Hints { kind: ItemKind::Adj, id: a.code.clone(), topic: a.category.clone(), lines: kl.clone(), calc: calc.clone() } }
                                    FlagNote { kind: ItemKind::Adj, id: a.code.clone() }
                                    KeyBlock { kind: ItemKind::Adj, id: a.code.clone(), revealed: r.revealed, lines: kl.clone(), topic: Some(a.category.clone()),
                                        explain: explain, calc: calc, user_lines: Some(lines.clone()),
                                        on_adopt: if kl.is_empty() { None } else { Some(EventHandler::new({ let code = a.code.clone(); let kl = kl.clone(); move |_| {
                                            let mut s = app.write();
                                            let v: Vec<_> = kl.iter().enumerate().map(|(i, (c, _, d, k))| dekri_core::types::JournalLine { id: format!("k{i}"), code: Some(c.clone()), debit: *d, credit: *k, memo: String::new() }).collect();
                                            s.st.adjusting.insert(code.clone(), v);
                                            s.changed();
                                        } })) } }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
fn cards_next(idx: usize) -> Option<String> {
    data().adjustments.get(idx + 1).map(|a| a.code.clone())
}

#[component]
pub fn Penutup() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let d = data();
    let s = app.read();
    let c = s.ctx();
    let net = c.net_income;
    let rows: Vec<_> = d
        .closing
        .closing_rows
        .iter()
        .map(|row| {
            let e = s.st.closing.get(&row.code).copied().unwrap_or_default();
            let mut r = result_for(&s.st, ItemKind::Clo, &row.code, &c);
            if e.debit == 0.0 && e.credit == 0.0 && r.shown.is_none() {
                r.shown = Some(Status::Belum);
            }
            let k = expected_closing(&row.code, &c.report.tb, net);
            (row.clone(), e, r, k)
        })
        .collect();
    let post = post_closing_tb(&c.report.tb, &s.st.closing);
    let revs: Vec<_> = d
        .closing
        .reversing_cases
        .iter()
        .map(|rc| {
            let id = rc.no.to_string();
            (
                rc.clone(),
                result_for(&s.st, ItemKind::Rev, &id, &c),
                s.st.reversing.get(&id).cloned().unwrap_or_default(),
            )
        })
        .collect();
    drop(s);
    let mut set_entry = move |code: String, e: ClosingEntry| {
        let mut s = app.write();
        s.st.closing.insert(code, e);
        s.changed();
    };
    rsx! {
        div { class: "space-y-4",
            div { class: "card",
                div { class: "mb-3 flex flex-wrap items-start justify-between gap-3",
                    div { class: "min-w-0 flex-1",
                        h2 { class: "t-card mb-1", "Jurnal penutup" }
                        p { class: "text-sm text-slate-600", "{d.closing.closing_intro}" }
                    }
                    button { class: "btn btn-primary shrink-0", onclick: move |_| {
                        let mut s = app.write();
                        for row in &data().closing.closing_rows { s.check_item(ItemKind::Clo, &row.code); }
                    }, "Periksa semua baris penutup" }
                }
                p { class: "mb-3 text-sm", if net < 0.0 { "Rugi bersih" } else { "Laba bersih" } " tahun berjalan menurut jurnal Anda: " b { class: "t-figure", "{format_rupiah(net, true)}" } }
                if net < 0.0 {
                    p { class: "callout callout-warning mb-3", role: "note",
                        "Jurnal Anda saat ini menghasilkan " b { "rugi" } ". Untuk baris 3-3000, isi kolom " b { "Kredit" } " (bukan Debit) sebesar rugi bersih; Saldo Laba didebit." }
                }
                div { class: "card-data",
                    table { class: "data-table",
                        thead { tr { th { "Akun" } th { "Instruksi" } th { class: "num", "Debit" } th { class: "num", "Kredit" } th { "Status" } th { "Kunci" } } }
                        tbody {
                            for (row, e, r, k) in rows.iter().cloned() {
                                tr { key: "{row.code}",
                                    td { class: "min-w-[13rem]", div { class: "font-mono text-xs text-slate-500", "{row.code}" } div { class: "font-medium", "{acct(&row.code)}" } }
                                    td { class: "min-w-[10rem] text-xs leading-5 text-slate-600", "{row.instruction}" }
                                    td { input { class: "num w-32 font-medium", value: "{rp(e.debit)}", "aria-label": "Debit {row.code}",
                                        onchange: { let code = row.code.clone(); move |ev: Event<FormData>| set_entry(code.clone(), ClosingEntry { debit: parse(&ev.value()), credit: e.credit }) } } }
                                    td { input { class: "num w-32 font-medium", value: "{rp(e.credit)}", "aria-label": "Kredit {row.code}",
                                        onchange: { let code = row.code.clone(); move |ev: Event<FormData>| set_entry(code.clone(), ClosingEntry { debit: e.debit, credit: parse(&ev.value()) }) } } }
                                    td { class: "min-w-[7rem] max-w-[13rem]", StatusBadge { status: r.shown }
                                        if r.shown.is_some() && r.shown != Some(Status::Belum) { div { class: "mt-1 text-xs leading-4 text-slate-600", "{r.grade.message}" } } }
                                    td { class: "w-[7.5rem]",
                                        if r.revealed {
                                            div { class: "text-xs leading-5 tabular-nums text-slate-700",
                                                div { class: "font-semibold", "Kunci" }
                                                div { "D {format_rupiah(k.debit, false)}" }
                                                div { "K {format_rupiah(k.credit, false)}" }
                                            }
                                        } else { button { class: "btn btn-sm", onclick: { let code = row.code.clone(); move |_| { let mut s = app.write(); s.st.revealed.push(item_key(ItemKind::Clo, &code)); s.changed(); } }, "Lihat kunci" } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            div { class: "card",
                h2 { class: "t-card mb-1", "Neraca saldo setelah penutupan" }
                p { class: "mb-3 text-xs text-slate-500", "Dihitung dari jurnal penutup Anda. Akun nominal harus bersaldo nol dan Saldo Laba memuat laba bersih dikurangi dividen." }
                div { class: "card-data",
                    table { class: "data-table",
                        thead { tr { th { "Kode" } th { "Nama akun" } th { class: "num", "Debit" } th { class: "num", "Kredit" } } }
                        tbody {
                            for r in post.rows.iter().filter(|r| r.debit != 0.0 || r.credit != 0.0) {
                                tr { key: "{r.code}", td { class: "whitespace-nowrap font-mono text-xs", "{r.code}" } td { "{r.name}" } td { class: "num", "{rp(r.debit)}" } td { class: "num", "{rp(r.credit)}" } }
                            }
                        }
                        tfoot { tr { td { colspan: "2", "TOTAL" } td { class: "num", "{format_rupiah(post.debit, false)}" } td { class: "num", "{format_rupiah(post.credit, false)}" } } }
                    }
                }
                div { class: "mt-3",
                    if (post.debit - post.credit).abs() < 0.5 { span { class: "badge badge-success", "SEIMBANG" } }
                    else { span { class: "badge badge-danger", "TIDAK SEIMBANG (selisih {format_rupiah(post.debit - post.credit, false)})" } }
                }
            }
            div { class: "card",
                h2 { class: "t-card mb-1", "Jurnal pembalik 1 Januari 2025" }
                p { class: "mb-2 text-sm text-slate-600", "{d.closing.reversing_intro}" }
                for (rc, r, lines) in revs {
                    div { key: "{rc.no}", class: "mt-4 border-t border-[var(--ds-border)] pt-3",
                        div { class: "mb-1 flex items-center justify-between", b { "Kasus {rc.no}: {rc.reversed}" } StatusBadge { status: r.shown } }
                        JournalForm { id_prefix: format!("Pembalik {}", rc.no), lines: lines.clone(), min_rows: 3, result: Some(r.clone()), options: coa(),
                            on_change: { let id = rc.no.to_string(); move |v| { let mut s = app.write(); s.st.reversing.insert(id.clone(), v); s.changed(); } },
                            on_check: { let id = rc.no.to_string(); move |_| { app.write().check_item(ItemKind::Rev, &id); } } }
                        if !r.revealed {
                            button { class: "btn btn-sm mt-2", onclick: { let id = rc.no.to_string(); move |_| { let mut s = app.write(); s.st.revealed.push(item_key(ItemKind::Rev, &id)); s.changed(); } }, "Lihat kunci" }
                        } else { p { class: "callout callout-info mt-2", "{rc.why}" } }
                    }
                }
            }
        }
    }
}
fn side(v: f64) -> &'static str {
    if v > 0.0 {
        "debit"
    } else {
        "kredit"
    }
}
fn parse(s: &str) -> f64 {
    let d: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    d.parse().unwrap_or(0.0)
}

/// Memecah teks kasus koreksi menjadi narasi, judul jurnal yang sudah dibukukan, baris jurnalnya, dan referensi materi.
/// Hanya untuk tampilan: teks sumber tidak diubah dan kasus tanpa bagian jurnal tetap tampil utuh sebagai narasi.
type EventParts = (String, Option<String>, Vec<String>, Option<String>);
fn split_event(e: &str) -> EventParts {
    let mut narr: Vec<&str> = Vec::new();
    let mut title: Option<String> = None;
    let mut lines: Vec<String> = Vec::new();
    let mut reference: Option<String> = None;
    for l in e.lines() {
        let t = l.trim();
        if t.is_empty() {
            continue;
        }
        if let Some(r) = t.strip_prefix("Referensi materi:") {
            reference = Some(r.trim().to_string());
        } else if t.starts_with("Jurnal yang telah dibukukan") {
            match t.split_once(':') {
                Some((h, rest)) => {
                    title = Some(format!("{h}:"));
                    if !rest.trim().is_empty() {
                        lines.push(rest.trim().to_string());
                    }
                }
                None => title = Some(t.to_string()),
            }
        } else if title.is_some() {
            lines.push(t.split_whitespace().collect::<Vec<_>>().join(" "));
        } else {
            narr.push(t);
        }
    }
    (narr.join(" "), title, lines, reference)
}

#[component]
pub fn Koreksi() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut tab = use_signal(|| 0usize);
    let d = data();
    let s = app.read();
    let c = s.ctx();
    let mk = |kind: ItemKind, evs: &Vec<dekri_core::data::NumberedEvent>| {
        evs.iter()
            .map(|e| {
                let id = e.no.to_string();
                (
                    e.no,
                    e.event.clone(),
                    result_for(&s.st, kind, &id, &c),
                    s.st.error_type.get(&id).cloned().unwrap_or_default(),
                    s.st.correcting.get(&id).cloned().unwrap_or_default(),
                )
            })
            .collect::<Vec<_>>()
    };
    let cor = mk(ItemKind::Cor, &d.correcting.correcting);
    let err = mk(ItemKind::Err, &d.correcting.detect);
    drop(s);
    let types = d.correcting.error_type_options.clone();
    let list = if *tab.read() == 0 {
        cor.clone()
    } else {
        err.clone()
    };
    let is_cor = *tab.read() == 0;
    let list: Vec<_> = list
        .into_iter()
        .map(|(no, event, r, et, lines)| (no, split_event(&event), r, et, lines))
        .collect();
    rsx! {
        div { class: "space-y-4",
            div { class: "seg", role: "group", "aria-label": "Jenis latihan koreksi",
                button { class: if is_cor { "btn btn-primary" } else { "btn" }, onclick: move |_| tab.set(0), "Jurnal koreksi ({cor.len()})" }
                button { class: if !is_cor { "btn btn-primary" } else { "btn" }, onclick: move |_| tab.set(1), "Deteksi kesalahan ({err.len()})" }
            }
            for (no, (narr, jtitle, jlines, jref), r, et, lines) in list {
                div { key: "{no}", class: "card",
                    div { class: "mb-2 flex flex-wrap items-center justify-between gap-2",
                        h2 { class: "t-card", "Kasus {no}" }
                        div { class: "flex items-center gap-2",
                            if let Some(rf) = jref { span { class: "badge badge-info", "{rf}" } }
                            StatusBadge { status: r.shown }
                        }
                    }
                    p { class: "mb-3 text-[0.9375rem] leading-6", "{narr}" }
                    if let Some(t) = jtitle {
                        div { class: "mb-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-3",
                            div { class: "t-label mb-1", "{t}" }
                            for (i, l) in jlines.iter().enumerate() {
                                {
                                    let parts: Vec<&str> = l.split_whitespace().collect();
                                    let row = parts.len() == 3 && (parts[0] == "Dr." || parts[0] == "Cr.");
                                    let cr = parts.first() == Some(&"Cr.");
                                    let name = if row { acct(parts[1]) } else { String::new() };
                                    let cls = if cr { "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 pl-6 font-mono text-xs leading-6" } else { "grid grid-cols-[2.5rem_minmax(0,1fr)_auto] gap-x-3 font-mono text-xs leading-6" };
                                    rsx! {
                                        if row {
                                            div { key: "{i}", class: "{cls}", span { class: "font-semibold", "{parts[0]}" } span { class: "truncate", "{parts[1]} {name}" } span { class: "text-right tabular-nums", "{parts[2]}" } }
                                        } else {
                                            div { key: "{i}", class: "font-mono text-xs leading-6", "{l}" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    div { class: "mb-3 flex flex-wrap items-center gap-2",
                        label { class: "flex flex-wrap items-center gap-2", span { class: "t-label", "Jenis kesalahan" }
                            select { class: "w-full sm:w-80", "aria-label": "Jenis kesalahan {no}",
                                onchange: move |e| { let mut s = app.write(); s.st.error_type.insert(no.to_string(), e.value()); s.changed(); },
                                option { value: "", selected: et.is_empty(), "— pilih —" }
                                for t in types.iter() { option { key: "{t}", value: "{t}", selected: *t == et, "{t}" } }
                            }
                        }
                        if !is_cor { button { class: "btn btn-primary", onclick: move |_| { app.write().check_item(ItemKind::Err, &no.to_string()); }, "Periksa" } }
                    }
                    if is_cor {
                        JournalForm { id_prefix: format!("Koreksi {no}"), lines: lines.clone(), min_rows: 3, result: Some(r.clone()), options: coa(),
                            on_change: move |v| { let mut s = app.write(); s.st.correcting.insert(no.to_string(), v); s.changed(); },
                            on_check: move |_| { app.write().check_item(ItemKind::Cor, &no.to_string()); } }
                    } else if r.shown.is_some() { p { class: "text-sm", "{r.grade.message}" } }
                    {
                        let id = no.to_string();
                        let key_type = data().key.error_type.get(&id).cloned().unwrap_or_default();
                        let net = data().key.correcting_net.get(&id).cloned();
                        let kind = if is_cor { ItemKind::Cor } else { ItemKind::Err };
                        rsx! {
                            if !r.revealed {
                                button { class: "btn mt-2", onclick: { let id = id.clone(); move |_| { let mut s = app.write(); s.st.revealed.push(item_key(kind, &id)); s.changed(); } }, "Lihat kunci" }
                            } else {
                                div { class: "callout callout-info mt-3",
                                    p { "Jenis kesalahan: " b { "{key_type}" } }
                                    if is_cor {
                                        if let Some(n) = net { ul { class: "list-disc pl-5", for (k, v) in n.iter() { li { key: "{k}", "{k} {acct(k)}: {side(*v)} {format_rupiah(v.abs(), false)}" } } } }
                                        else { p { "Tidak perlu jurnal koreksi." } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Memecah "CASE: ...\n\nFACTS: ..." menjadi (kasus, fakta) hanya untuk tampilan; teks lain tampil utuh sebagai fakta.
fn split_case(t: &str) -> (String, String) {
    let t = t.trim();
    let body = t.strip_prefix("CASE:").unwrap_or(t);
    match body.split_once("FACTS:") {
        Some((c, f)) => (c.trim().to_string(), f.trim().to_string()),
        None => (String::new(), body.trim().to_string()),
    }
}
/// Memecah judul "Topik\n(BAB n - Nama)" menjadi (judul, rujukan BAB).
fn split_topic(t: &str) -> (String, Option<String>) {
    let mut lines = t.lines().map(str::trim).filter(|l| !l.is_empty());
    let first = lines.next().unwrap_or("").to_string();
    let rest: Vec<&str> = lines.collect();
    let refr = rest.join(" ");
    let refr = refr
        .trim()
        .trim_start_matches('(')
        .trim_end_matches(')')
        .trim()
        .to_string();
    (first, (!refr.is_empty()).then_some(refr))
}

#[component]
pub fn Skenario() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let d = data();
    let s = app.read();
    let c = s.ctx();
    let items: Vec<_> = d
        .scenarios
        .iter()
        .map(|sc| {
            let id = sc.no.to_string();
            (
                sc.clone(),
                result_for(&s.st, ItemKind::Sc, &id, &c),
                s.st.scenarios.get(&id).cloned().unwrap_or_default(),
            )
        })
        .collect();
    drop(s);
    let items: Vec<_> = items
        .into_iter()
        .map(|(sc, r, a)| {
            let (title, bab) = split_topic(&sc.topic);
            let (kasus, fakta) = split_case(&sc.case_and_facts);
            (sc, r, a, title, bab, kasus, fakta)
        })
        .collect();
    rsx! {
        div { class: "space-y-4",
            for (sc, r, a, title, bab, kasus, fakta) in items {
                div { key: "{sc.no}", class: "card",
                    div { class: "mb-2 flex flex-wrap items-center justify-between gap-2",
                        h2 { class: "t-card", "{sc.no}. {title}" }
                        div { class: "flex items-center gap-2",
                            if let Some(b) = bab { span { class: "badge badge-info", "{b}" } }
                            StatusBadge { status: r.shown }
                        }
                    }
                    div { class: "mb-3 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-4 text-[0.9375rem] leading-6",
                        if !kasus.is_empty() { div { class: "t-label", "Kasus" } p { class: "font-semibold", "{kasus}" } }
                        div { class: if kasus.is_empty() { "t-label" } else { "t-label mt-3" }, "Fakta" }
                        p { "{fakta}" }
                    }
                    p { class: "mb-2 font-semibold", "{sc.question}" }
                    if sc.kind == "choice" {
                        select { class: "w-full", "aria-label": "Jawaban skenario {sc.no}",
                            onchange: { let id = sc.no.to_string(); move |e: Event<FormData>| { let mut s = app.write(); s.st.scenarios.entry(id.clone()).or_default().answer = Some(e.value()); s.changed(); } },
                            option { value: "", selected: a.answer.is_none(), "— pilih —" }
                            for o in sc.options.clone().unwrap_or_default() { option { key: "{o}", value: "{o}", selected: a.answer.as_deref() == Some(o.as_str()), "{o}" } }
                        }
                    } else {
                        input { class: "w-full sm:w-64", inputmode: "numeric", placeholder: "Angka (Rp)", "aria-label": "Jawaban skenario {sc.no}", value: "{a.answer.clone().unwrap_or_default()}",
                            oninput: { let id = sc.no.to_string(); move |e: Event<FormData>| { let v: String = e.value().chars().filter(|c| c.is_ascii_digit() || *c == '-').collect(); let mut s = app.write(); s.st.scenarios.entry(id.clone()).or_default().answer = Some(v); s.changed(); } } }
                    }
                    textarea { class: "mt-2 w-full", rows: "2", "aria-label": "Penalaran {sc.no}", placeholder: "{sc.user_response_prompt.clone().unwrap_or(\"Penalaran Anda (tidak dinilai)\".into())}", value: "{a.reasoning.clone().unwrap_or_default()}",
                        oninput: { let id = sc.no.to_string(); move |e: Event<FormData>| { let mut s = app.write(); s.st.scenarios.entry(id.clone()).or_default().reasoning = Some(e.value()); s.changed(); } } }
                    div { class: "mt-2 flex flex-wrap items-center gap-2",
                        button { class: "btn btn-primary", onclick: { let id = sc.no.to_string(); move |_| { app.write().check_item(ItemKind::Sc, &id); } }, "Periksa" }
                        if r.shown.is_some() && r.shown != Some(Status::Belum) { span { class: "text-sm", "{r.grade.message}" } }
                    }
                    FlagNote { kind: ItemKind::Sc, id: sc.no.to_string() }
                    {
                        let k = data().key.scenario.get(&sc.no.to_string()).cloned();
                        let id = sc.no.to_string();
                        rsx! {
                            KeyReveal { revealed: r.revealed, on_reveal: move |_| { let mut s = app.write(); s.st.revealed.push(item_key(ItemKind::Sc, &id)); s.changed(); },
                                if let Some(k) = k { p { "Kunci: " b { "{k.key}" } } p { "{k.explanation}" } }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_event_memisah_narasi_jurnal_dan_rujukan() {
        let e = "Staf mencatat pembelian mobil.\nJurnal yang telah dibukukan (SALAH):\n  Dr. 1-2500  85.000.000\n  Cr. 1-1100  85.000.000\n\nReferensi materi: BAB 3 - Pencatatan";
        let (narr, title, lines, refr) = split_event(e);
        assert_eq!(narr, "Staf mencatat pembelian mobil.");
        assert_eq!(
            title.as_deref(),
            Some("Jurnal yang telah dibukukan (SALAH):")
        );
        assert_eq!(
            lines,
            vec!["Dr. 1-2500 85.000.000", "Cr. 1-1100 85.000.000"]
        );
        assert_eq!(refr.as_deref(), Some("BAB 3 - Pencatatan"));
    }

    #[test]
    fn split_event_tanpa_bagian_jurnal_tetap_utuh() {
        let (narr, title, lines, refr) = split_event("Pembayaran gaji dicatat dua kali.");
        assert_eq!(narr, "Pembayaran gaji dicatat dua kali.");
        assert!(title.is_none() && lines.is_empty() && refr.is_none());
    }

    #[test]
    fn split_event_jurnal_tidak_ada_ikut_sebagai_baris() {
        let e = "Penjualan belum dicatat.\nJurnal yang telah dibukukan: TIDAK ADA (belum dicatat).\n\nReferensi materi: BAB 3 - Pencatatan";
        let (_, title, lines, _) = split_event(e);
        assert_eq!(title.as_deref(), Some("Jurnal yang telah dibukukan:"));
        assert_eq!(lines, vec!["TIDAK ADA (belum dicatat)."]);
    }

    #[test]
    fn semua_kasus_koreksi_terbaca_lengkap() {
        let d = data();
        for e in &d.correcting.correcting {
            let (narr, title, lines, refr) = split_event(&e.event);
            assert!(!narr.is_empty(), "kasus {} tanpa narasi", e.no);
            assert!(
                title.is_some() && !lines.is_empty(),
                "kasus {} tanpa jurnal",
                e.no
            );
            assert!(refr.is_some(), "kasus {} tanpa rujukan", e.no);
        }
        for e in &d.correcting.detect {
            let (narr, title, _, _) = split_event(&e.event);
            assert!(!narr.is_empty(), "deteksi {} tanpa narasi", e.no);
            assert!(title.is_none(), "deteksi {} tidak memuat jurnal", e.no);
        }
    }

    #[test]
    fn kasus_skenario_dipecah_menjadi_kasus_dan_fakta() {
        for sc in &data().scenarios {
            let (kasus, fakta) = split_case(&sc.case_and_facts);
            assert!(
                !kasus.is_empty() && !fakta.is_empty(),
                "skenario {} tidak terpecah",
                sc.no
            );
            assert!(!split_topic(&sc.topic).0.is_empty());
        }
        assert_eq!(
            split_case("teks bebas"),
            (String::new(), "teks bebas".to_string())
        );
        assert_eq!(
            split_topic("Aset\n(BAB 9 - Aset Tetap)"),
            ("Aset".to_string(), Some("BAB 9 - Aset Tetap".to_string()))
        );
        assert_eq!(split_topic("Aset").1, None);
    }
}
