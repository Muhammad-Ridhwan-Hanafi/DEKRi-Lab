//! StatusBadge dan JournalForm (padanan komponen versi 1).
use crate::session::Session;
use crate::shell::Icon;
use dekri_core::derive::ItemResult;
use dekri_core::grade::Status;
use dekri_core::money::format_rupiah;
use dekri_core::types::JournalLine;
use dioxus::prelude::*;
use std::cell::RefCell;
use std::collections::HashSet;
use std::rc::Rc;
use std::sync::atomic::{AtomicU64, Ordering};

static SEQ: AtomicU64 = AtomicU64::new(1);
pub fn blank_line() -> JournalLine {
    JournalLine {
        id: format!("w{}", SEQ.fetch_add(1, Ordering::Relaxed)),
        ..Default::default()
    }
}

pub fn status_text(s: Option<Status>) -> &'static str {
    match s {
        Some(Status::Benar) => "BENAR",
        Some(Status::Periksa) => "PERIKSA",
        Some(Status::Belum) => "BELUM DIISI",
        None => "BELUM DIPERIKSA",
    }
}

#[component]
pub fn StatusBadge(status: Option<Status>) -> Element {
    let (cls, dot) = match status {
        Some(Status::Benar) => ("badge-success", "var(--ds-success-fg)"),
        Some(Status::Periksa) => ("badge-warning", "var(--ds-warning-fg)"),
        Some(Status::Belum) => ("badge-neutral", "var(--color-slate-400)"),
        None => ("badge-info", "var(--ds-info-fg)"),
    };
    rsx! {
        span { class: "badge {cls}",
            span { class: "size-1.5 rounded-full", style: "background:{dot}" }
            "{status_text(status)}"
        }
    }
}

fn parse_money(s: &str) -> f64 {
    let d: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    d.parse::<f64>().unwrap_or(0.0)
}
fn show_money(n: f64) -> String {
    if n.round() == 0.0 {
        String::new()
    } else {
        format_rupiah(n, false)
    }
}

fn name_of(code: &str, opts: &[(String, String)]) -> String {
    let n = opts
        .iter()
        .find(|(c, _)| c == code)
        .map(|(_, n)| n.as_str())
        .unwrap_or("");
    format!("{code} {n}").trim().to_string()
}

fn blank_display(i: usize) -> JournalLine {
    JournalLine {
        id: format!("blank-{i}"),
        ..Default::default()
    }
}

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Nav {
    Enter,
    CopyRow,
    Submit,
}

fn focus_js(wrap: &str, cell: &str) {
    let _ = document::eval(&format!("setTimeout(function(){{var e=document.querySelector('#{wrap} [data-cell=\"{cell}\"]');e&&e.focus();}},0)"));
}

/// Peringkat kecocokan (kecil = lebih baik); padanan matchRank versi 1.
pub fn match_rank(code: &str, name: &str, query: &str) -> i32 {
    let q = query.trim().to_lowercase();
    let name = name.to_lowercase();
    let code = code.to_lowercase();
    if code == q {
        return 0;
    }
    if code.starts_with(&q) {
        return 1;
    }
    if name.starts_with(&q) {
        return 2;
    }
    let words: Vec<&str> = name
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .collect();
    let tokens: Vec<&str> = q.split_whitespace().collect();
    if !tokens.is_empty()
        && tokens
            .iter()
            .all(|t| words.iter().any(|w| w.starts_with(t)))
    {
        return 3;
    }
    if name.contains(&q) {
        return 4;
    }
    if code.contains(&q) {
        return 5;
    }
    -1
}

/// Tampilan Indonesia untuk saldo normal dan tipe akun (data sumber memakai istilah Inggris).
pub fn id_normal(s: &str) -> &str {
    match s {
        "Credit" => "Kredit",
        o => o,
    }
}
pub fn id_kind(s: &str) -> &str {
    match s {
        "Asset" => "Aset",
        "Liability" => "Kewajiban",
        "Equity" => "Ekuitas",
        "Revenue" => "Pendapatan",
        "Expense" => "Beban",
        o => o,
    }
}

fn normal_of(code: &str) -> &'static str {
    let d = dekri_core::data::data();
    let n = d
        .coa
        .iter()
        .find(|a| a.code == code)
        .map(|a| a.normal.as_str())
        .or_else(|| {
            dekri_core::content::ext_accounts()
                .iter()
                .find(|a| a.code == code)
                .map(|a| a.normal.as_str())
        });
    if n == Some("Debit") {
        "D"
    } else {
        "K"
    }
}

#[derive(Props, Clone, PartialEq)]
pub struct PickerProps {
    pub value: Option<String>,
    pub label: String,
    pub cell: String,
    pub options: Vec<(String, String)>,
    #[props(default = false)]
    pub exclusive: bool,
    pub on_change: EventHandler<Option<String>>,
    pub on_nav: EventHandler<Nav>,
}

/// Pencarian akun menurut kode atau nama (padanan AccountPicker.tsx).
#[component]
pub fn AccountPicker(p: PickerProps) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut open = use_signal(|| false);
    let mut q = use_signal(String::new);
    let mut active = use_signal(|| 0usize);
    let recent = app.read().recent.clone();
    let query = q.read().trim().to_lowercase();
    let limit = if p.exclusive { 40 } else { 14 };
    let list: Vec<(String, String)> = if !query.is_empty() {
        let mut v: Vec<(i32, usize, &(String, String))> = p
            .options
            .iter()
            .enumerate()
            .map(|(i, a)| (match_rank(&a.0, &a.1, &query), i, a))
            .filter(|x| x.0 >= 0)
            .collect();
        v.sort_by(|x, y| x.0.cmp(&y.0).then(x.1.cmp(&y.1)));
        v.into_iter().map(|x| x.2.clone()).take(limit).collect()
    } else if p.exclusive {
        p.options.iter().take(40).cloned().collect()
    } else {
        let rec: Vec<(String, String)> = recent
            .iter()
            .filter_map(|c| p.options.iter().find(|o| &o.0 == c).cloned())
            .collect();
        let mut v = rec.clone();
        v.extend(
            p.options
                .iter()
                .filter(|o| !rec.iter().any(|r| r.0 == o.0))
                .cloned(),
        );
        v.truncate(14);
        v
    };
    let n = list.len();
    let act = (*active.read()).min(n.saturating_sub(1));
    let showing_recent = query.is_empty() && !p.exclusive && !recent.is_empty();
    let shown = if *open.read() {
        q.read().clone()
    } else {
        p.value
            .as_ref()
            .map(|c| {
                format!(
                    "{} · {}",
                    c,
                    p.options
                        .iter()
                        .find(|o| &o.0 == c)
                        .map(|o| o.1.clone())
                        .or_else(|| dekri_core::content::any_account_name(c))
                        .unwrap_or_default()
                )
            })
            .unwrap_or_default()
    };
    let cell = p.cell.clone();
    let on_change = p.on_change;
    let on_nav = p.on_nav;
    let exclusive = p.exclusive;
    let mut pick = move |code: Option<String>| {
        if let Some(c) = code.clone() {
            if !exclusive {
                let mut s = app.write();
                s.recent.retain(|x| *x != c);
                s.recent.insert(0, c);
                s.recent.truncate(8);
            }
        }
        on_change.call(code);
        open.set(false);
    };
    let list_k = list.clone();
    rsx! {
        div { class: "relative",
            input { role: "combobox", "aria-expanded": "{open}", "aria-autocomplete": "list", "aria-label": "{p.label}", "data-cell": "{cell}", "data-marquee": true, title: "{shown}", class: "w-full", placeholder: "Cari kode atau nama akun", value: "{shown}", autocomplete: "off", spellcheck: false,
                onfocus: move |_| { q.set(String::new()); open.set(true); active.set(0); },
                oninput: move |e| { q.set(e.value()); open.set(true); active.set(0); },
                onblur: move |_| { spawn(async move { tokio::time::sleep(std::time::Duration::from_millis(120)).await; open.set(false); }); },
                onkeydown: move |e| {
                    let k = e.key();
                    let m = e.modifiers();
                    if k == Key::ArrowDown || k == Key::ArrowUp {
                        e.prevent_default();
                        if !*open.read() { q.set(String::new()); open.set(true); return; }
                        if n == 0 { return; }
                        active.set(if k == Key::ArrowDown { (act + 1) % n } else { (act + n - 1) % n });
                        let _ = document::eval("setTimeout(function(){var e=document.querySelector('[aria-label=\"Daftar akun\"] [aria-selected=true]');e&&e.scrollIntoView&&e.scrollIntoView({block:'nearest'})},0)");
                    } else if k == Key::Enter && (m.ctrl() || m.meta()) {
                        e.prevent_default(); on_nav.call(Nav::Submit);
                    } else if k == Key::Enter && *open.read() && n > 0 {
                        e.prevent_default();
                        pick(Some(list_k[act].0.clone()));
                        on_nav.call(Nav::Enter);
                    } else if k == Key::Escape && *open.read() {
                        e.stop_propagation(); open.set(false);
                    } else if (m.ctrl() || m.meta()) && k == Key::Character("d".into()) {
                        e.prevent_default(); on_nav.call(Nav::CopyRow);
                    }
                } }
            if *open.read() {
                ul { role: "listbox", "aria-label": "Daftar akun", class: "absolute z-30 mt-1 max-h-64 w-80 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg",
                    if p.value.is_some() { li { class: "cursor-pointer px-2 py-1 text-xs text-slate-500 hover:bg-slate-100", onmousedown: move |e| { e.prevent_default(); pick(None); }, "Kosongkan akun" } }
                    if showing_recent { li { class: "px-2 py-0.5 text-xs uppercase tracking-wide text-slate-500", "Terakhir dipakai di atas" } }
                    if list.is_empty() { li { class: "px-2 py-1 text-sm text-slate-500", "Tidak ada akun yang cocok" } }
                    for (i, (c, nm)) in list.iter().enumerate() {
                        li { key: "{c}", role: "option", "aria-selected": "{i == act}", class: if i == act { "cursor-pointer px-2 py-1 text-sm hover:bg-blue-50 bg-blue-100" } else { "cursor-pointer px-2 py-1 text-sm hover:bg-blue-50" },
                            onmouseenter: move |_| active.set(i),
                            onmousedown: { let c = c.clone(); move |e| { e.prevent_default(); pick(Some(c.clone())); } },
                            span { class: "font-mono text-xs text-slate-500", "{c}" } " {nm}"
                            span { class: "ml-1 text-xs text-slate-500", "({normal_of(c)})" }
                        }
                    }
                }
            }
        }
    }
}

#[derive(Props, Clone, PartialEq)]
pub struct MoneyProps {
    pub value: f64,
    pub label: String,
    pub cell: String,
    pub on_change: EventHandler<f64>,
    pub on_nav: EventHandler<Nav>,
}

/// Input nominal berformat Indonesia (padanan MoneyInput.tsx).
#[component]
pub fn MoneyInput(p: MoneyProps) -> Element {
    let mut focused = use_signal(|| false);
    let mut text = use_signal(String::new);
    let shown = if *focused.read() {
        text.read().clone()
    } else {
        show_money(p.value)
    };
    let on_change = p.on_change;
    let on_nav = p.on_nav;
    let value = p.value;
    rsx! {
        input { "aria-label": "{p.label}", "data-cell": "{p.cell}", inputmode: "numeric", class: "num w-full font-medium", placeholder: "0", autocomplete: "off", value: "{shown}",
            onfocus: move |_| { text.set(show_money(value)); focused.set(true); },
            onblur: move |_| focused.set(false),
            oninput: move |e| {
                let raw = e.value();
                let n = parse_money(&raw);
                text.set(if raw.is_empty() { String::new() } else { format_rupiah(n, false) });
                on_change.call(n);
            },
            onkeydown: move |e| {
                let m = e.modifiers(); let k = e.key();
                if k == Key::Enter && (m.ctrl() || m.meta()) { e.prevent_default(); on_nav.call(Nav::Submit); }
                else if k == Key::Enter { e.prevent_default(); on_nav.call(Nav::Enter); }
                else if (m.ctrl() || m.meta()) && k == Key::Character("d".into()) { e.prevent_default(); on_nav.call(Nav::CopyRow); }
            } }
    }
}

#[derive(Props, Clone, PartialEq)]
pub struct JournalFormProps {
    pub lines: Vec<JournalLine>,
    pub on_change: EventHandler<Vec<JournalLine>>,
    #[props(default = 4)]
    pub min_rows: usize,
    #[props(default = None)]
    pub result: Option<ItemResult>,
    #[props(default = true)]
    pub show_check: bool,
    #[props(default = None)]
    pub on_check: Option<EventHandler<()>>,
    /// Ctrl+Enter; bila kosong memakai `on_check`.
    #[props(default = None)]
    pub on_submit: Option<EventHandler<()>>,
    pub id_prefix: String,
    pub options: Vec<(String, String)>,
    /// Mode ujian: sembunyikan petunjuk yang menyinggung Periksa/status.
    #[props(default = false)]
    pub exam: bool,
    /// Hanya tawarkan akun dari `options` (soal industri memakai bagan akunnya sendiri).
    #[props(default = false)]
    pub exclusive: bool,
}

#[component]
pub fn JournalForm(props: JournalFormProps) -> Element {
    let wrap = use_hook(|| format!("jf{}", SEQ.fetch_add(1, Ordering::Relaxed)));
    let seen = use_hook(|| Rc::new(RefCell::new(None::<HashSet<String>>)));
    let fresh = use_hook(|| Rc::new(RefCell::new(HashSet::<String>::new())));
    let rows: Vec<JournalLine> = if props.lines.is_empty() {
        (0..props.min_rows).map(blank_display).collect()
    } else {
        props.lines.clone()
    };
    {
        let mut sn = seen.borrow_mut();
        if sn.is_none() {
            *sn = Some(rows.iter().map(|r| r.id.clone()).collect());
        }
        for r in &rows {
            if sn.as_mut().unwrap().insert(r.id.clone()) {
                fresh.borrow_mut().insert(r.id.clone());
            }
        }
    }
    let total_d: f64 = rows
        .iter()
        .filter(|r| r.code.is_some())
        .map(|r| r.debit)
        .sum();
    let total_c: f64 = rows
        .iter()
        .filter(|r| r.code.is_some())
        .map(|r| r.credit)
        .sum();
    let diff = total_d - total_c;
    let on_change = props.on_change;
    let on_check = props.on_check;
    let on_submit = props.on_submit;
    let opts = props.options.clone();
    // Tempel dari Excel/Sheets: beberapa baris sekaligus (Akun [tab] Debit [tab] Kredit).
    {
        let wrap = wrap.clone();
        let paste_opts = props.options.clone();
        let mut app = use_context::<Signal<Session>>();
        use_future(move || {
            let wrap = wrap.clone();
            let paste_opts = paste_opts.clone();
            async move {
                let js = format!(
                    "var w=document.getElementById('{wrap}');if(w&&!w.__pst){{w.__pst=1;w.addEventListener('paste',function(e){{var t=(e.clipboardData||window.clipboardData).getData('text');if(t&&(t.indexOf('\\t')>=0||t.indexOf('\\n')>=0)){{e.preventDefault();dioxus.send(t);}}}});}}"
                );
                let mut ev = document::eval(&js);
                while let Ok(t) = ev.recv::<String>().await {
                    let (lines, skipped) = parse_paste(&t, &paste_opts);
                    if lines.is_empty() {
                        app.write()
                            .say("Tempelan tidak dikenali: pakai kolom Akun, Debit, Kredit.");
                    } else {
                        let n = lines.len();
                        on_change.call(lines);
                        app.write().say(if skipped > 0 { format!("{n} baris ditempel; {skipped} baris dilewati karena akunnya tidak dikenal.") } else { format!("{n} baris ditempel.") });
                    }
                }
            }
        });
    }
    let result = props.result.clone();
    let shown = result
        .as_ref()
        .map(|r| r.shown.is_some() && r.shown != Some(Status::Belum))
        .unwrap_or(false);
    let exclusive = props.exclusive;
    let rows_len = rows.len();
    let nav = {
        let rows = rows.clone();
        let wrap = wrap.clone();
        move |i: usize, col: &'static str, k: Nav| match k {
            Nav::CopyRow => {
                let mut v = rows.clone();
                let mut c = v[i].clone();
                c.id = blank_line().id;
                v.insert(i + 1, c);
                on_change.call(v);
                focus_js(&wrap, &format!("{}-acc", i + 1));
            }
            Nav::Submit => {
                if let Some(os) = on_submit {
                    os.call(());
                } else if let Some(oc) = on_check {
                    oc.call(());
                }
            }
            Nav::Enter => {
                if col == "acc" {
                    focus_js(&wrap, &format!("{i}-debit"));
                } else if col == "debit" {
                    focus_js(&wrap, &format!("{i}-credit"));
                } else if i + 1 < rows.len() {
                    focus_js(&wrap, &format!("{}-acc", i + 1));
                } else {
                    let mut v = rows.clone();
                    v.push(blank_line());
                    on_change.call(v);
                    focus_js(&wrap, &format!("{}-acc", i + 1));
                }
            }
        }
    };
    let fresh_set = fresh.borrow().clone();
    rsx! {
        div { id: "{wrap}",
            div { class: "overflow-x-auto",
                table { class: "min-w-[600px]",
                    thead { tr {
                        th { class: "w-[30%]", "Akun" }
                        th { class: "w-36 min-w-32 text-right", "Debit (Rp)" }
                        th { class: "w-36 min-w-32 text-right", "Kredit (Rp)" }
                        th { class: "w-16" }
                    } }
                    tbody {
                        for (i, r) in rows.iter().enumerate() {
                            tr { key: "{r.id}", class: if fresh_set.contains(&r.id) { "ap-row-in" } else { "" },
                                td { AccountPicker { p: PickerProps { value: r.code.clone(), label: format!("{} akun baris {}", props.id_prefix, i + 1), cell: format!("{i}-acc"), options: opts.clone(), exclusive,
                                        on_change: EventHandler::new({ let rows = rows.clone(); move |code: Option<String>| { let mut v = rows.clone(); v[i].code = code; on_change.call(v); } }),
                                        on_nav: EventHandler::new({ let nav = nav.clone(); move |k| nav(i, "acc", k) }) } } }
                                td { MoneyInput { p: MoneyProps { value: r.debit, label: format!("{} debit baris {}", props.id_prefix, i + 1), cell: format!("{i}-debit"),
                                        on_change: EventHandler::new({ let rows = rows.clone(); move |n: f64| { let mut v = rows.clone(); v[i].debit = n; on_change.call(v); } }),
                                        on_nav: EventHandler::new({ let nav = nav.clone(); move |k| nav(i, "debit", k) }) } } }
                                td { MoneyInput { p: MoneyProps { value: r.credit, label: format!("{} kredit baris {}", props.id_prefix, i + 1), cell: format!("{i}-credit"),
                                        on_change: EventHandler::new({ let rows = rows.clone(); move |n: f64| { let mut v = rows.clone(); v[i].credit = n; on_change.call(v); } }),
                                        on_nav: EventHandler::new({ let nav = nav.clone(); move |k| nav(i, "credit", k) }) } } }
                                td { class: "whitespace-nowrap",
                                    button { class: "btn btn-ghost btn-icon btn-sm !text-slate-500", title: "Salin baris (Ctrl+D)", "aria-label": "Salin baris {i + 1}",
                                        onclick: { let rows = rows.clone(); move |_| { let mut v = rows.clone(); let mut c = v[i].clone(); c.id = blank_line().id; v.insert(i + 1, c); on_change.call(v); } }, "⧉" }
                                    button { class: "btn btn-ghost btn-icon btn-sm !text-slate-500 hover:!bg-[var(--ds-danger-bg)] hover:!text-[var(--ds-danger-fg)]", title: "Hapus baris", "aria-label": "Hapus baris {i + 1}",
                                        onclick: { let rows = rows.clone(); move |_| { let mut v = rows.clone(); v.remove(i); on_change.call(v); } }, "✕" }
                                }
                            }
                        }
                    }
                    tfoot { tr { class: "font-semibold",
                        td { class: "!align-middle",
                            span { class: "mr-2", "Total" }
                            if total_d == 0.0 && total_c == 0.0 {
                            } else if diff.abs() < 0.5 {
                                span { class: "badge badge-success", role: "status", Icon { name: "check", size: 12 } "Seimbang" }
                            } else {
                                span { class: "badge badge-danger", role: "status", title: "Jumlah debit dan kredit harus sama sebelum jurnal bisa benar.",
                                    "Selisih {format_rupiah(diff.abs(), false)}: " { if diff > 0.0 { "debit lebih besar" } else { "kredit lebih besar" } } }
                            }
                        }
                        td { class: "num !align-middle", "{format_rupiah(total_d, false)}" }
                        td { class: "num !align-middle", "{format_rupiah(total_c, false)}" }
                        td {}
                    } }
                }
            }
            if props.exam { p { class: "no-print mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500", span { kbd { "Enter" } " pindah kolom" } span { kbd { "Ctrl+D" } " salin baris" } span { kbd { "Ctrl+Z" } " urungkan" } } }
            else { p { class: "no-print mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500", title: "Di baris terakhir, Enter menambah baris. Setelah jawaban BENAR, Ctrl+Enter membuka soal berikutnya.", span { kbd { "Enter" } " pindah kolom/baris" } span { kbd { "Ctrl+D" } " salin baris" } span { kbd { "Ctrl+Z" } " urungkan" } span { kbd { "Ctrl+Enter" } " periksa" } } }
            div { class: "mt-2 flex flex-wrap items-center gap-2",
                button { class: "btn", onclick: { let rows = rows.clone(); move |_| { let mut v = rows.clone(); v.push(blank_line()); on_change.call(v); } }, "+ Tambah baris" }
                if props.show_check { if let Some(oc) = props.on_check { button { class: "btn btn-primary", onclick: move |_| oc.call(()), "Periksa" } } }
                if let Some(r) = result.as_ref() {
                    StatusBadge { status: r.shown }
                    if r.shown.is_none() { span { class: "text-xs text-slate-500", "Tekan Periksa untuk menilai jawaban ini." } }
                    if r.revealed { span { class: "text-xs text-slate-500", "Kunci sudah dibuka: tidak dihitung dalam akurasi." } }
                }
            }
            if shown {
                if let Some(r) = result.as_ref() {
                    {
                        let ok = r.shown == Some(Status::Benar);
                        let h = &r.grade.hint;
                        let box_cls = if ok { "callout-success ap-pop" } else { "callout-warning ap-shake" };
                        let dot_bg = if ok { "var(--ds-success-fg)" } else { "var(--ds-warning-fg)" };
                        let any = !(h.missing.is_empty() && h.extra.is_empty() && h.wrong_side.is_empty() && h.wrong_amount.is_empty());
                        rsx! {
                            div { key: "{status_text(r.shown)}", role: "status", class: "callout mt-3 flex items-start gap-2.5 {box_cls}",
                                span { class: "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white", style: "background:{dot_bg}", Icon { name: if ok { "check" } else { "alert" }, size: 13 } }
                                div { class: "min-w-0",
                                    div { class: "font-semibold", "{r.grade.message}" }
                                    if any { ul { class: "mt-1 list-disc space-y-0.5 pl-5 text-[13px]",
                                        if !h.missing.is_empty() { li { "Akun yang belum ada: {h.missing.iter().map(|c| name_of(c, &opts)).collect::<Vec<_>>().join(\"; \")}" } }
                                        if !h.extra.is_empty() { li { "Akun yang tidak seharusnya terlibat: {h.extra.iter().map(|c| name_of(c, &opts)).collect::<Vec<_>>().join(\"; \")}" } }
                                        if !h.wrong_side.is_empty() { li { "Sisi debit/kredit terbalik: {h.wrong_side.iter().map(|c| name_of(c, &opts)).collect::<Vec<_>>().join(\"; \")}" } }
                                        if !h.wrong_amount.is_empty() { li { "Nominal belum sesuai: {h.wrong_amount.iter().map(|c| name_of(c, &opts)).collect::<Vec<_>>().join(\"; \")}" } }
                                    } }
                                }
                            }
                        }
                    }
                }
            }
            { let _ = rows_len; rsx! {} }
        }
    }
}

/// Tombol dengan konfirmasi di tempat (padanan ConfirmButton.tsx).
#[component]
pub fn ConfirmButton(
    label: String,
    message: String,
    #[props(default = "Ya, lanjutkan".to_string())] confirm_label: String,
    on_confirm: EventHandler<()>,
    #[props(default = "btn".to_string())] class: String,
) -> Element {
    let mut asking = use_signal(|| false);
    if !*asking.read() {
        return rsx! { button { class: "{class}", onclick: move |_| asking.set(true), "{label}" } };
    }
    rsx! {
        span { class: "callout callout-warning inline-flex flex-wrap items-center gap-2 !py-1", role: "alert",
            span { "{message}" }
            button { class: "btn btn-danger", autofocus: true, onclick: move |_| { asking.set(false); on_confirm.call(()); }, "{confirm_label}" }
            button { class: "btn", onclick: move |_| asking.set(false), "Batal" }
        }
    }
}

fn paste_num(s: &str) -> f64 {
    let t: String = s
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '\u{a0}')
        .collect();
    let t = t
        .trim_start_matches("Rp")
        .trim_start_matches("rp")
        .to_string();
    if t.is_empty() || t == "-" {
        return 0.0;
    }
    let t = if t.contains('.') && t.contains(',') {
        t.replace('.', "").replace(',', ".")
    } else if t.contains(',') {
        let after = t.rsplit(',').next().unwrap_or("");
        if after.len() == 3 && t.matches(',').count() >= 1 && !t.starts_with(',') {
            t.replace(',', "")
        } else {
            t.replace(',', ".")
        }
    } else if t.matches('.').count() > 1
        || t.rsplit('.')
            .next()
            .is_some_and(|a| a.len() == 3 && t.contains('.'))
    {
        t.replace('.', "")
    } else {
        t
    };
    t.parse::<f64>().unwrap_or(0.0).round()
}

/// Ubah teks tempelan (baris dipisah newline, kolom dipisah tab) menjadi baris jurnal.
/// Kolom akun boleh berisi kode, nama, atau "kode · nama". Mengembalikan (baris, jumlah baris dilewati).
pub(crate) fn parse_paste(text: &str, options: &[(String, String)]) -> (Vec<JournalLine>, usize) {
    let find = |cell: &str| -> Option<String> {
        let c = cell.trim().trim_matches('"').trim();
        if c.is_empty() {
            return None;
        }
        let lc = c.to_lowercase();
        if let Some(o) = options.iter().find(|o| o.0.to_lowercase() == lc) {
            return Some(o.0.clone());
        }
        let head = lc
            .split(|ch: char| ch == '·' || ch.is_whitespace())
            .next()
            .unwrap_or("");
        if let Some(o) = options.iter().find(|o| o.0.to_lowercase() == head) {
            return Some(o.0.clone());
        }
        if let Some(o) = options.iter().find(|o| o.1.to_lowercase() == lc) {
            return Some(o.0.clone());
        }
        let hits: Vec<_> = options
            .iter()
            .filter(|o| o.1.to_lowercase().contains(&lc))
            .collect();
        if hits.len() == 1 {
            Some(hits[0].0.clone())
        } else {
            None
        }
    };
    let mut out = vec![];
    let mut skipped = 0;
    for row in text
        .lines()
        .map(str::trim_end)
        .filter(|r| !r.trim().is_empty())
    {
        let cols: Vec<&str> = row.split('\t').collect();
        if cols.len() < 2 {
            skipped += 1;
            continue;
        }
        let (d, k) = (
            paste_num(cols.get(1).copied().unwrap_or("")),
            paste_num(cols.get(2).copied().unwrap_or("")),
        );
        match find(cols[0]) {
            Some(code) => out.push(JournalLine {
                code: Some(code),
                debit: d,
                credit: k,
                ..blank_line()
            }),
            None => {
                // baris judul kolom (mis. "Akun, Debit, Kredit") tidak dihitung sebagai kesalahan
                if !cols[0].to_lowercase().contains("akun") {
                    skipped += 1;
                }
            }
        }
    }
    (out, skipped)
}

#[cfg(test)]
mod paste_tests {
    use super::*;
    fn opts() -> Vec<(String, String)> {
        vec![
            ("1-1000".into(), "Kas".into()),
            ("2-1000".into(), "Utang Usaha".into()),
            ("4-1000".into(), "Penjualan".into()),
        ]
    }
    #[test]
    fn numbers_id_and_en() {
        assert_eq!(paste_num("Rp 1.250.000"), 1_250_000.0);
        assert_eq!(paste_num("1,250,000"), 1_250_000.0);
        assert_eq!(paste_num("1.250.000,50"), 1_250_001.0);
        assert_eq!(paste_num("12500"), 12_500.0);
        assert_eq!(paste_num(""), 0.0);
    }
    #[test]
    fn parses_rows_by_code_name_and_combined() {
        let t = "Akun\tDebit\tKredit\n1-1000\t5.000.000\t\nUtang Usaha\t\t2.000.000\n4-1000 · Penjualan\t\t3.000.000\nZZZ\t1\t";
        let (l, skipped) = parse_paste(t, &opts());
        assert_eq!(l.len(), 3);
        assert_eq!(
            (l[0].code.as_deref(), l[0].debit),
            (Some("1-1000"), 5_000_000.0)
        );
        assert_eq!(
            (l[1].code.as_deref(), l[1].credit),
            (Some("2-1000"), 2_000_000.0)
        );
        assert_eq!(l[2].code.as_deref(), Some("4-1000"));
        assert_eq!(skipped, 1);
    }
}
