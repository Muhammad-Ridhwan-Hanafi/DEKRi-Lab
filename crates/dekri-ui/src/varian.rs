//! Latihan Varian, Latihan Pajak, dan soal berbagai industri.
use crate::components::*;
use crate::practice::*;
use crate::session::Session;
use dekri_core::actions;
use dekri_core::content::{ext_accounts, pack_net, packs};
use dekri_core::data::data;
use dekri_core::grade::{grade_journal, GradeResult, NetMap};
use dekri_core::types::JournalLine;
use dekri_core::variants::*;
use dioxus::prelude::*;

fn parse_lines(s: Option<&String>) -> Vec<JournalLine> {
    s.and_then(|t| serde_json::from_str::<Vec<JournalLine>>(t).ok())
        .unwrap_or_default()
}
fn side_letter(n: &str) -> &'static str {
    if n == "Debit" {
        "D"
    } else {
        "K"
    }
}
fn rand_seed() -> i64 {
    (std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as i64 ^ d.as_secs() as i64)
        .unwrap_or(1)
        & 0x7fffffff)
        % 1_000_000
}

#[derive(Clone, PartialEq)]
struct LatihanData {
    key_id: String,
    title: String,
    narrative: String,
    options: Vec<(String, String)>,
    exclusive: bool,
    net: NetMap,
    key_lines: Vec<KLine>,
    explain: Option<String>,
    log_kind: String,
    log_id: String,
}

/// Satu soal latihan berjurnal: editor, Periksa, kunci. Jawaban disimpan di `pajak[key]`.
#[component]
fn Latihan(p: LatihanData) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let lines = parse_lines(app.read().st.pajak.get(&p.key_id));
    let shown: Option<GradeResult> = app.read().var_shown.get(&p.key_id).cloned();
    let rk = format!("{}:key", p.key_id);
    let revealed = app.read().var_reveal.contains(&rk);
    let steps = dekri_core::explain::explain_journal(
        &p.key_lines,
        dekri_core::explain::ExplainOpts {
            topic: None,
            explain: p.explain.as_deref(),
            calc: None,
            reason: None,
        },
    );
    let result = shown.as_ref().map(|g| dekri_core::derive::ItemResult {
        key: p.key_id.clone(),
        grade: g.clone(),
        shown: Some(g.status),
        checked: true,
        revealed,
    });
    rsx! {
        div { class: "card space-y-2",
            h2 { class: "text-lg", "{p.title}" }
            p { class: "text-sm", "{p.narrative}" }
            JournalForm { id_prefix: p.title.clone(), lines: lines.clone(), min_rows: 3, result: result.clone(), options: p.options.clone(), exclusive: p.exclusive,
                on_change: { let k = p.key_id.clone(); move |v: Vec<JournalLine>| { let mut s = app.write(); s.st.pajak.insert(k.clone(), serde_json::to_string(&v).unwrap_or_default()); s.var_shown.remove(&k); s.refresh(); } },
                on_check: { let (k, net, kind, id) = (p.key_id.clone(), p.net.clone(), p.log_kind.clone(), p.log_id.clone()); let lines = lines.clone();
                    move |_| { let g = grade_journal(&lines, &net, 0.0); let mut s = app.write(); actions::log_attempt(&mut s.st, &kind, &id, g.status); s.var_shown.insert(k.clone(), g); s.refresh(); } } }
            if !revealed {
                button { class: "btn", onclick: { let rk = rk.clone(); move |_| { app.write().var_reveal.insert(rk.clone()); } }, "Lihat kunci dan penjelasan" }
            } else {
                div { class: "card tag-lilac space-y-2",
                    h3 { class: "text-lg font-extrabold", "Kunci dan penjelasan" }
                    table { class: "bg-white", thead { tr { th { "Akun" } th { class: "num", "Debit" } th { class: "num", "Kredit" } } }
                        tbody { for (i, (c, n, d, k)) in p.key_lines.iter().enumerate() { tr { key: "{i}", td { span { class: "font-mono text-xs", "{c}" } " {n}" } td { class: "num", "{rp(*d)}" } td { class: "num", "{rp(*k)}" } } } } }
                    for (n, s) in steps.iter().enumerate() {
                        div { key: "{n}", class: "rounded-xl border-2 border-slate-900 bg-white p-3 text-sm", b { "{n + 1}. {s.title}" }
                            if let Some(b) = &s.body { p { class: "mt-1", "{b}" } }
                            if !s.items.is_empty() { ul { class: "mt-1 list-disc pl-5", for (j, it) in s.items.iter().enumerate() { li { key: "{j}", "{it}" } } } } }
                    }
                    p { class: "text-xs text-slate-600", "Kunci atau penjelasan tampak keliru? Lihat Pengaturan > Tentang untuk melapor. Soal ini tidak dihitung ke akurasi Dashboard." }
                }
            }
        }
    }
}

#[component]
pub fn Varian(tax: bool) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let slot = tax as usize;
    let pool: Vec<&PatternInfo> = PATTERNS.iter().filter(|p| p.tax == tax).collect();
    let cur_key = if tax { "cur:pajak" } else { "cur:varian" };
    {
        let mut s = app.write();
        if s.var_seed[slot] == 1 && s.var_idx[slot] == 0 {
            if let Some((p, sd)) = s.st.tables.get(cur_key).and_then(|v| parse_id(v)) {
                if let Some(i) = pool.iter().position(|x| x.pattern == p) {
                    s.var_idx[slot] = i;
                    s.var_seed[slot] = sd;
                }
            }
        }
    }
    let (idx, seed) = {
        let s = app.read();
        (s.var_idx[slot], s.var_seed[slot])
    };
    let v = generate(pool[idx].pattern, seed).expect("pola dikenal");
    if app.read().st.tables.get(cur_key) != Some(&v.id) {
        let mut s = app.write();
        s.st.tables.insert(cur_key.into(), v.id.clone());
        s.refresh();
    }
    let opts: Vec<(String, String)> = if tax {
        data()
            .coa
            .iter()
            .map(|a| (a.code.clone(), a.name.clone()))
            .chain(
                ext_accounts()
                    .iter()
                    .map(|a| (a.code.clone(), a.name.clone())),
            )
            .collect()
    } else {
        data()
            .coa
            .iter()
            .map(|a| (a.code.clone(), a.name.clone()))
            .collect()
    };
    let kl: Vec<KLine> = v
        .lines
        .iter()
        .map(|l| (l.code.clone(), l.name.clone(), l.debit, l.credit))
        .collect();
    rsx! {
        div { class: "space-y-4",
            div { class: "card space-y-2",
                div { class: "flex flex-wrap items-end gap-2",
                    label { class: "block text-sm", span { class: "mb-0.5 block text-xs text-slate-500", "Pola soal" }
                        select { class: "w-full sm:w-96", onchange: move |e| { if let Ok(i) = e.value().parse::<usize>() { let mut s = app.write(); s.var_idx[slot] = i; s.var_seed[slot] = rand_seed(); } },
                            for (i, p) in pool.iter().enumerate() { option { key: "{i}", value: "{i}", selected: i == idx, "{p.title}" } } } }
                    button { class: "btn btn-primary", onclick: move |_| { app.write().var_seed[slot] = rand_seed(); }, "Soal baru" }
                }
                p { class: "text-xs text-slate-500", "Kode soal {v.id}. Kode yang sama selalu memberi angka yang sama." }
                if tax { p { class: "callout callout-warning", "Latihan pajak memakai akun tambahan (PPN Masukan, Utang PPN, Utang PPh 23) yang tidak ada di bagan akun kasus. Tarif: PPN 11%, PPh 23 jasa 2%. Soal ini terpisah dari kasus utama dan tidak memengaruhi laporan maupun akurasi Dashboard." } }
            }
            Latihan { key: "{v.id}", p: LatihanData { key_id: format!("v:{}", v.id), title: v.title.to_string(), narrative: v.narrative.clone(), options: opts, exclusive: false, net: v.net.clone(), key_lines: kl, explain: Some(v.explain.clone()), log_kind: if tax { "pajak".into() } else { "var".into() }, log_id: v.id.clone() } }
            if !tax { Industri {} }
        }
    }
}

#[component]
fn Industri() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let ps = packs();
    let sel = app.read().pack_sel;
    let filled = |pid: &str, iid: &str| {
        parse_lines(app.read().st.pajak.get(&format!("v:pack:{pid}:{iid}")))
            .iter()
            .any(|l| l.code.is_some())
    };
    rsx! {
        div { class: "space-y-3",
            h2 { "Soal berbagai industri" }
            p { class: "text-sm text-slate-600", "Siklus akuntansi yang sama pada jenis usaha berbeda. Tiap industri punya bagan akun sendiri. Terpisah dari kasus utama dan tidak memengaruhi laporan maupun akurasi Dashboard." }
            div { class: "flex flex-wrap gap-1",
                for (i, p) in ps.iter().enumerate() {
                    {
                        let done = p.items.iter().filter(|it| filled(&p.id, &it.id)).count();
                        let on = sel.map(|x| x.0) == Some(i);
                        let name = p.title.split(':').nth(1).map(str::trim).unwrap_or(&p.title).to_string();
                        rsx! { button { key: "{p.id}", class: if on { "btn btn-primary" } else { "btn" }, onclick: move |_| { app.write().pack_sel = if on { None } else { Some((i, usize::MAX)) }; },
                            "{name} ({p.items.len()} soal" if done > 0 { ", {done} terisi" } ")" } }
                    }
                }
            }
            if let Some((pi, ii)) = sel {
                {
                    let pack = &ps[pi];
                    let opts: Vec<(String, String)> = match &pack.accounts {
                        Some(a) => a.iter().map(|x| (x.code.clone(), x.name.clone())).collect(),
                        None => data().coa.iter().map(|a| (a.code.clone(), a.name.clone())).chain(ext_accounts().iter().map(|a| (a.code.clone(), a.name.clone()))).collect(),
                    };
                    rsx! {
                        div { class: "space-y-3",
                            p { class: "text-xs text-slate-500", "{pack.description}" }
                            details { class: "card !p-3", summary { class: "cursor-pointer text-sm font-semibold", "Bagan akun {pack.title}" }
                                ul { class: "mt-2 text-sm", for a in pack.accounts.iter().flatten() { li { key: "{a.code}", span { class: "font-mono text-xs", "{a.code}" } " {a.name} ({side_letter(&a.normal)})" } } } }
                            div { class: "flex flex-wrap gap-1",
                                for (k, it) in pack.items.iter().enumerate() {
                                    button { key: "{it.id}", class: if ii == k { "btn btn-primary" } else { "btn" }, onclick: move |_| { app.write().pack_sel = Some((pi, k)); },
                                        "{k + 1}. {it.title}" if filled(&pack.id, &it.id) { " ✓" } }
                                }
                            }
                            if ii != usize::MAX {
                                {
                                    let item = &pack.items[ii];
                                    let name_of = |c: &str| pack.accounts.iter().flatten().find(|a| a.code == c).map(|a| a.name.clone()).unwrap_or_else(|| dekri_core::content::any_account_name(c).unwrap_or_default());
                                    let kl: Vec<KLine> = item.lines.iter().map(|l| (l.code.clone(), name_of(&l.code), l.debit, l.credit)).collect();
                                    rsx! { Latihan { key: "{pack.id}{item.id}", p: LatihanData { key_id: format!("v:pack:{}:{}", pack.id, item.id), title: item.title.clone(), narrative: item.narrative.clone(), options: opts.clone(), exclusive: true, net: pack_net(item), key_lines: kl, explain: item.explain.clone(), log_kind: "pack".into(), log_id: format!("{}:{}", pack.id, item.id) } } }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
