//! Transaksi (padanan pages/Transaksi.tsx versi 1): daftar, narasi, analisis, jurnal, Periksa, kunci.
use crate::components::*;
use crate::practice::*;
use crate::session::Session;
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::grade::Status;
use dioxus::prelude::*;

const LEVELS: [&str; 4] = ["Semua", "Intermediate", "Advanced", "Expert"];
const STATUSES: [&str; 6] = [
    "Semua",
    "Ditandai",
    "BELUM DIISI",
    "BELUM DIPERIKSA",
    "PERIKSA",
    "BENAR",
];

pub(crate) fn date_id(d: &str) -> String {
    const BLN: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    let p: Vec<&str> = d.split('-').collect();
    if p.len() == 3 {
        if let (Ok(y), Ok(m), Ok(dd)) = (
            p[0].parse::<i32>(),
            p[1].parse::<usize>(),
            p[2].parse::<u32>(),
        ) {
            return format!("{dd} {} {y}", BLN[(m.max(1) - 1).min(11)]);
        }
    }
    d.to_string()
}

#[component]
pub fn Transaksi() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut level = use_signal(|| "Semua".to_string());
    let mut status = use_signal(|| "Semua".to_string());
    let mut q = use_signal(String::new);
    let d = data();
    let s = app.read();
    let c = s.ctx();
    let sel = s.sel.get("txn").copied().or_else(|| {
        d.transactions
            .iter()
            .position(|t| {
                result_for(&s.st, ItemKind::Txn, &t.no.to_string(), &c).shown != Some(Status::Benar)
            })
            .or(Some(0))
    });
    let list: Vec<(u32, String, String, String, Option<Status>)> = d
        .transactions
        .iter()
        .filter_map(|t| {
            let id = t.no.to_string();
            if *level.read() != "Semua" && t.level != *level.read() {
                return None;
            }
            let hay = format!("{} {} {}", t.no, t.topic, t.party).to_lowercase();
            if !q.read().is_empty() && !hay.contains(&q.read().to_lowercase()) {
                return None;
            }
            let r = result_for(&s.st, ItemKind::Txn, &id, &c);
            let txt = status_text(r.shown);
            match status.read().as_str() {
                "Ditandai" => {
                    if !s.st.flags.contains(&format!("txn:{}", t.no)) {
                        return None;
                    }
                }
                "Semua" => {}
                st => {
                    if txt != st {
                        return None;
                    }
                }
            }
            Some((
                t.no,
                t.topic.clone(),
                format!("{} · {}", date_id(&t.date), t.level),
                id,
                r.shown,
            ))
        })
        .collect();
    let total = d.transactions.len();
    let (prev_no, next_no) = match sel.map(|i| i as u32 + 1) {
        Some(cur) => (
            list.iter().rev().map(|x| x.0).find(|n| *n < cur),
            list.iter().map(|x| x.0).find(|n| *n > cur),
        ),
        None => (None, None),
    };
    let tx = sel.and_then(|i| d.transactions.get(i)).cloned();
    let detail = tx.as_ref().map(|t| {
        let id = t.no.to_string();
        let r = result_for(&s.st, ItemKind::Txn, &id, &c);
        let ra = result_for(&s.st, ItemKind::Ana, &id, &c);
        let lines = s.st.journal.get(&id).cloned().unwrap_or_default();
        let ana = s.st.analysis.get(&id).cloned().unwrap_or_default();
        let key = d.key.readable_txn.iter().find(|k| k.no == t.no).cloned();
        (id, r, ra, lines, ana, key)
    });
    let check_mode = s.st.settings.validation_mode != "live";
    drop(s);

    rsx! {
        div { class: "grid gap-4 xl:grid-cols-[272px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]",
            aside { class: "card h-fit xl:sticky xl:top-4",
                div { class: "mb-2 grid grid-cols-2 gap-2",
                    label { class: "block text-xs text-slate-600", "Tingkat"
                        select { class: "mt-0.5 w-full", "aria-label": "Filter tingkat", onchange: move |e| level.set(e.value()),
                            for l in LEVELS { option { key: "{l}", selected: *level.read() == l, "{l}" } } } }
                    label { class: "block text-xs text-slate-600", "Status"
                        select { class: "mt-0.5 w-full", "aria-label": "Filter status", onchange: move |e| status.set(e.value()),
                            for l in STATUSES { option { key: "{l}", selected: *status.read() == l, "{l}" } } } }
                }
                input { "aria-label": "Cari transaksi", class: "mb-2 w-full", placeholder: "Cari topik atau pihak", value: "{q}", oninput: move |e| q.set(e.value()) }
                div { class: "mb-1 text-xs text-slate-500", "{list.len()} dari {total} transaksi" }
                ul { class: "max-h-48 overflow-auto xl:max-h-[60vh]",
                    for (no, topic, meta, _id, shown) in list.iter().cloned() {
                        li { key: "{no}",
                            button { class: if sel == Some(no as usize - 1) { "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100 bg-blue-50" } else { "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-slate-100" },
                                onclick: move |_| { app.write().sel.insert("txn", no as usize - 1); },
                                span { class: "min-w-0 flex-1",
                                    span { class: "block", b { "{no}." } " {topic}" }
                                    span { class: "mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600",
                                        span { "{meta}" }
                                        StatusBadge { status: shown }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            section {
                if let (Some(t), Some((id, r, ra, lines, ana, key))) = (tx.clone(), detail.clone()) {
                    div { class: "card card-featured",
                        div { class: "mb-2 flex flex-wrap items-start justify-between gap-2",
                            h2 { class: "min-w-[14rem] flex-1 text-2xl", "Transaksi {t.no}: {t.topic}" }
                            div { class: "flex shrink-0 gap-1",
                                button { class: "btn", disabled: prev_no.is_none(), onclick: move |_| { if let Some(n) = prev_no { app.write().sel.insert("txn", n as usize - 1); } }, "← Sebelumnya" }
                                button { class: "btn", disabled: next_no.is_none(), onclick: move |_| { if let Some(n) = next_no { app.write().sel.insert("txn", n as usize - 1); } }, "Berikutnya →" }
                            }
                        }
                        div { class: "mb-3 flex flex-wrap items-center gap-2 text-sm",
                            span { class: "badge badge-neutral", title: "Tanggal kejadian", "{date_id(&t.date)}" }
                            span { class: "badge badge-info", title: "Tingkat kesulitan", "{t.level}" }
                            span { class: "min-w-0 text-slate-600", span { class: "t-label", "Pihak terkait: " } "{t.party}" }
                        }
                        section { class: "rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-2)] p-4", "aria-label": "Narasi kejadian",
                            div { class: "t-label", "Narasi kejadian" }
                            p { class: "mt-1 text-[15px] leading-relaxed text-slate-900", "{t.narrative}" }
                            if !t.amount_info.trim().is_empty() {
                                div { class: "mt-3 border-t border-[var(--ds-border)] pt-3",
                                    div { class: "t-label", "Nominal dan syarat" }
                                    p { class: "mt-1 text-sm leading-relaxed text-slate-800", "{t.amount_info}" }
                                }
                            }
                        }
                        p { class: "mt-2 text-xs text-slate-500", "Tidak semua peristiwa memerlukan jurnal. Centang \"tidak perlu jurnal\" di bagian Jurnal bila memang tidak ada jurnalnya." }
                        h3 { class: "t-card mb-1 mt-5", "Jurnal" }
                        label { class: "mb-2 flex items-center gap-2 text-sm",
                            input { r#type: "checkbox", checked: ana.decision.as_deref() == Some("Tidak perlu jurnal"),
                                onchange: { let id = id.clone(); move |e: Event<FormData>| {
                                    let mut s = app.write();
                                    let a = s.st.analysis.entry(id.clone()).or_default();
                                    a.decision = Some(if e.checked() { "Tidak perlu jurnal" } else { "Perlu jurnal" }.into());
                                    s.changed();
                                } } }
                            "Peristiwa ini tidak perlu jurnal"
                        }
                        {let go_next = { let n = t.no; move || {
                            let target = {
                                let s = app.read();
                                let c = s.ctx();
                                let d = data();
                                d.transactions.iter().find(|x| x.no > n && result_for(&s.st, ItemKind::Txn, &x.no.to_string(), &c).shown != Some(Status::Benar)).map(|x| x.no)
                                    .or_else(|| d.transactions.iter().find(|x| x.no == n + 1).map(|x| x.no))
                            };
                            if let Some(no) = target { app.write().sel.insert("txn", no as usize - 1); }
                        } };
                        let benar = r.shown == Some(Status::Benar);
                        let none = ana.decision.as_deref() == Some("Tidak perlu jurnal");
                        let user_lines = lines.clone();
                        let adopt_lines = key.as_ref().map(|k| key_lines(&k.lines)).unwrap_or_default();
                        let narrative = format!("{} {}", t.narrative, t.amount_info);
                        rsx! {
                        JournalForm {
                            id_prefix: format!("Jurnal {}", t.no), lines: lines.clone(), min_rows: 4, result: Some(r.clone()), show_check: check_mode,
                            options: dekri_core::data::data().coa.iter().map(|a| (a.code.clone(), a.name.clone())).collect::<Vec<_>>(),
                            on_change: { let id = id.clone(); move |v| { let mut s = app.write(); s.st.journal.insert(id.clone(), v); s.changed(); } },
                            on_check: { let id = id.clone(); move |_| { let mut s = app.write(); s.check_item(ItemKind::Txn, &id); s.check_item(ItemKind::Ana, &id); } },
                            on_submit: { let id = id.clone(); let mut gn = go_next; move |_| { if benar { gn(); } else { let mut s = app.write(); s.check_item(ItemKind::Txn, &id); s.check_item(ItemKind::Ana, &id); } } },
                        }
                        Riwayat { kind: ItemKind::Txn, id: id.clone() }
                        if benar {
                            div { class: "mt-2", button { class: "btn btn-primary", onclick: { let mut gn = go_next; move |_| gn() }, "Soal berikutnya →" } }
                        }
                        if let Some(k) = key.clone() {
                            if r.shown == Some(Status::Periksa) && !r.revealed && !k.lines.is_empty() && !none {
                                Diagnosis { lines: user_lines.clone(), key_lines: key_lines(&k.lines), text: narrative.clone() }
                            }
                            if benar && !r.revealed { WhyCorrect { explain: k.explain.clone(), lines: key_lines(&k.lines), topic: Some(k.topic.clone()) } }
                            if !benar && !r.revealed { Hints { kind: ItemKind::Txn, id: id.clone(), topic: k.topic.clone(), lines: key_lines(&k.lines) } }
                            FlagNote { kind: ItemKind::Txn, id: id.clone() }
                            KeyBlock { kind: ItemKind::Txn, id: id.clone(), revealed: r.revealed, lines: key_lines(&k.lines), topic: Some(k.topic.clone()),
                                explain: k.explain.clone(), reason: data().key.analysis.get(&id).and_then(|a| a.reason.clone()), user_lines: Some(user_lines.clone()),
                                on_adopt: if adopt_lines.is_empty() { None } else { Some(EventHandler::new({ let id = id.clone(); move |_| {
                                    let mut s = app.write();
                                    s.st.analysis.entry(id.clone()).or_default().decision = Some("Perlu jurnal".into());
                                    let v: Vec<_> = adopt_lines.iter().enumerate().map(|(i, (c, _, d, k))| dekri_core::types::JournalLine { id: format!("k{i}"), code: Some(c.clone()), debit: *d, credit: *k, memo: String::new() }).collect();
                                    s.st.journal.insert(id.clone(), v);
                                    s.changed();
                                } })) } }
                        }
                        details { class: "mt-4 rounded-md border border-slate-200 p-2",
                            summary { class: "cursor-pointer select-none text-sm font-semibold", "Dampak jurnal ini ke laporan" }
                            div { class: "mt-2", Dampak { id: id.clone() } }
                        }
                        details { class: "mt-4 rounded-md border border-slate-200 p-2",
                            summary { class: "cursor-pointer select-none text-sm font-semibold", "Analisis (opsional) " StatusBadge { status: ra.shown } }
                            div { class: "mt-2", Analisis { id: id.clone(), check_mode: check_mode } }
                        }
                        } }
                    }
                } else {
                    div { class: "card text-sm text-slate-600", "Pilih transaksi dari daftar untuk membaca narasi, menganalisis, dan menjurnal." }
                }
            }
        }
    }
}

fn cash_info(k: &str) -> Option<&'static str> {
    Some(match k {
        "Operasi" => "Arus kas operasi: kas dari kegiatan utama usaha, misalnya penjualan, pembelian persediaan, gaji, dan beban operasional.",
        "Investasi" => "Arus kas investasi: kas untuk membeli atau menjual aset jangka panjang, misalnya peralatan, kendaraan, dan investasi.",
        "Pendanaan" => "Arus kas pendanaan: kas dari pemilik atau kreditur, misalnya setoran modal, pinjaman bank, dan pembayaran dividen.",
        "Non-kas / Reklasifikasi" => "Tidak ada kas yang bergerak: hanya pencatatan antarakun, misalnya penyusutan, amortisasi, atau pemindahan saldo.",
        "Tidak ada transaksi" => "Peristiwa ini bukan transaksi akuntansi, jadi tidak masuk laporan arus kas.",
        _ => return None,
    })
}

fn yn_info(field: &str, v: &str) -> Option<&'static str> {
    Some(match (field, v) {
        ("needsAdj", "Ya") => "Ya: ada bagian yang baru diakui seiring waktu (mis. beban dibayar di muka, pendapatan diterima di muka, penyusutan), sehingga perlu jurnal penyesuaian pada akhir tahun.",
        ("needsAdj", "Tidak") => "Tidak: transaksi sudah dicatat penuh pada periode ini, jadi tidak ada penyesuaian akhir tahun.",
        ("affectsProfit", "Ya") => "Ya: transaksi ini menambah pendapatan atau beban, sehingga mengubah laba rugi periode ini.",
        ("affectsProfit", "Tidak") => "Tidak: hanya menukar atau mengubah aset, kewajiban, atau ekuitas tanpa pendapatan atau beban, jadi laba tidak berubah.",
        ("affectsCash", "Ya") => "Ya: ada kas atau bank yang masuk atau keluar pada transaksi ini.",
        ("affectsCash", "Tidak") => "Tidak: tidak ada kas atau bank yang bergerak (mis. transaksi kredit, atau jurnal non-kas).",
        _ => return None,
    })
}

fn analysis_why(k: &dekri_core::grade::AnalysisKey) -> Vec<String> {
    if k.debit.is_none() || k.debit.as_deref() == Some("-") {
        return vec![format!(
            "Peristiwa ini tidak perlu jurnal.{}",
            k.reason
                .as_ref()
                .map(|r| format!(" {r}"))
                .unwrap_or_default()
        )];
    }
    let strip = |s: &str| {
        s.split_once(':')
            .map(|(_, r)| r.trim().to_string())
            .unwrap_or_else(|| s.to_string())
    };
    let mut v = vec![];
    if let Some(c) = k.cash_class.as_deref().filter(|c| !c.is_empty()) {
        v.push(format!(
            "Arus kas — {c}: {}",
            cash_info(c).map(strip).unwrap_or_default()
        ));
    }
    if let Some(c) = k.needs_adj.as_deref().filter(|c| !c.is_empty()) {
        v.push(format!(
            "Penyesuaian akhir tahun — {}",
            yn_info("needsAdj", c).unwrap_or(c)
        ));
    }
    if let Some(c) = k.affects_profit.as_deref().filter(|c| !c.is_empty()) {
        v.push(format!(
            "Laba — {}",
            yn_info("affectsProfit", c).unwrap_or(c)
        ));
    }
    if let Some(c) = k.affects_cash.as_deref().filter(|c| !c.is_empty()) {
        v.push(format!("Kas — {}", yn_info("affectsCash", c).unwrap_or(c)));
    }
    v
}

#[component]
fn Analisis(id: String, check_mode: bool) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let d = data();
    let (a, r) = {
        let s = app.read();
        let c = s.ctx();
        (
            s.st.analysis.get(&id).cloned().unwrap_or_default(),
            result_for(&s.st, ItemKind::Ana, &id, &c),
        )
    };
    let key = d.key.analysis.get(&id).cloned().unwrap_or_default();
    let opts = &d.analysis_options;
    let none = key.debit.is_none() || key.debit.as_deref() == Some("-");
    let cc = a.cash_class.clone().unwrap_or_default();
    let fields: [(&str, &str, Vec<String>, String); 3] = [
        (
            "needsAdj",
            "Perlu penyesuaian akhir tahun?",
            opts.yes_no.clone(),
            a.needs_adj.clone().unwrap_or_default(),
        ),
        (
            "affectsProfit",
            "Memengaruhi laba?",
            opts.yes_no.clone(),
            a.affects_profit.clone().unwrap_or_default(),
        ),
        (
            "affectsCash",
            "Memengaruhi kas?",
            opts.yes_no.clone(),
            a.affects_cash.clone().unwrap_or_default(),
        ),
    ];
    let msg = if !matches!(r.shown, None | Some(Status::Belum)) {
        r.grade.message.clone()
    } else {
        String::new()
    };
    let why = analysis_why(&key);
    let id_c = id.clone();
    let id_r = id.clone();
    rsx! {
        div { class: "space-y-3",
            div { class: "grid gap-3 sm:grid-cols-2",
                label { class: "block text-sm",
                    span { class: "mb-0.5 block text-xs text-slate-500", "Klasifikasi arus kas" }
                    select { class: "w-full", onchange: { let id = id.clone(); move |e: Event<FormData>| { let mut s = app.write(); s.st.analysis.entry(id.clone()).or_default().cash_class = Some(e.value()); s.changed(); } },
                        option { value: "", selected: cc.is_empty(), "— pilih —" }
                        for o in opts.cash_class.iter() { option { key: "{o}", value: "{o}", selected: *o == cc, "{o}" } }
                    }
                    if let Some(t) = cash_info(&cc) { span { class: "mt-1 block text-xs text-slate-600", "{t}" } }
                }
                for (f, label, os, cur) in fields.iter().cloned() {
                    label { key: "{f}", class: "block text-sm",
                        span { class: "mb-0.5 block text-xs text-slate-500", "{label}" }
                        select { class: "w-full", onchange: { let id = id.clone(); move |e: Event<FormData>| {
                                let mut s = app.write(); let an = s.st.analysis.entry(id.clone()).or_default(); let v = Some(e.value());
                                match f { "needsAdj" => an.needs_adj = v, "affectsProfit" => an.affects_profit = v, _ => an.affects_cash = v }
                                s.changed(); } },
                            option { value: "", selected: cur.is_empty(), "— pilih —" }
                            for o in os.iter() { option { key: "{o}", value: "{o}", selected: *o == cur, "{o}" } }
                        }
                        if let Some(t) = yn_info(f, &cur) { span { class: "mt-1 block text-xs text-slate-600", "{t}" } }
                    }
                }
            }
            div { class: "flex flex-wrap items-center gap-2",
                if check_mode { button { class: "btn btn-primary", onclick: move |_| { let mut s = app.write(); s.check_item(ItemKind::Ana, &id_c); }, "Periksa" } }
                StatusBadge { status: r.shown }
                if !msg.is_empty() { span { class: "text-sm", "{msg}" } }
            }
            if r.shown == Some(Status::Benar) && !r.revealed { WhyCorrect { points: why } }
            KeyReveal { revealed: r.revealed, on_reveal: move |_| { let mut s = app.write(); s.st.revealed.push(item_key(ItemKind::Ana, &id_r)); s.changed(); },
                if none { p { "Tidak ada jurnal untuk peristiwa ini. {key.reason.clone().unwrap_or_default()}" } }
                else { ul { class: "list-disc pl-5",
                    li { "Klasifikasi arus kas: {key.cash_class.clone().unwrap_or_default()}" }
                    li { "Perlu penyesuaian: {key.needs_adj.clone().unwrap_or_default()} · Memengaruhi laba: {key.affects_profit.clone().unwrap_or_default()} · Memengaruhi kas: {key.affects_cash.clone().unwrap_or_default()}" }
                } }
            }
        }
    }
}

/// Peta aliran: jurnal -> akun (buku besar, neraca saldo) -> angka laporan yang bergeser karenanya.
#[component]
fn Dampak(id: String) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut shown = use_signal(|| false);
    let lines = app.read().st.journal.get(&id).cloned().unwrap_or_default();
    let used: Vec<_> = lines
        .iter()
        .filter(|l| l.code.is_some() && (l.debit != 0.0 || l.credit != 0.0))
        .cloned()
        .collect();
    if used.is_empty() {
        return rsx! { p { class: "text-sm text-slate-500", "Isi jurnal transaksi ini dulu; setelah itu terlihat angka laporan mana yang dibentuknya." } };
    }
    if !*shown.read() {
        return rsx! { button { class: "btn", onclick: move |_| shown.set(true), "Tampilkan dampak" } };
    }
    let idx = app.write().trace_index();
    let labels = dekri_core::impact::cell_labels();
    // akun -> sel terdampak
    type Hit = (String, String, bool);
    let mut per: Vec<(String, char, f64, Vec<Hit>)> = vec![];
    for l in used.iter() {
        let code = l.code.clone().unwrap_or_default();
        let (side, amt) = if l.debit != 0.0 {
            ('D', l.debit)
        } else {
            ('K', l.credit)
        };
        let mut cells: Vec<Hit> = vec![];
        for (cid, ls) in idx.by_cell.iter() {
            if let Some(tl) = ls.iter().find(|x| {
                x.source == dekri_core::trace::TraceSource::Txn
                    && x.key == id
                    && x.code == code
                    && x.side == side
            }) {
                if let Some((sheet, label)) = labels.get(cid) {
                    cells.push((sheet.clone(), label.clone(), tl.effect > 0.0));
                }
            }
        }
        cells.sort();
        cells.dedup();
        per.push((code, side, amt, cells));
    }
    rsx! {
        div { class: "space-y-2 text-sm",
            p { class: "text-xs text-slate-600", "Tiap baris jurnal masuk ke buku besar akunnya, lalu ke neraca saldo, lalu ke pos laporan di bawah. ▲ berarti baris itu menaikkan pos, ▼ menurunkannya." }
            for (code, side, amt, cells) in per.iter() {
                {let nm = dekri_core::content::any_account_name(code).unwrap_or_default(); let sd = if *side == 'D' { "Debit" } else { "Kredit" }; let am = dekri_core::money::format_rupiah(*amt, false); let n = cells.len();
                rsx! { div { key: "{code}{sd}", class: "rounded-md border border-slate-200 bg-white p-2",
                    div { class: "font-medium", span { class: "font-mono text-xs", "{code}" } " {nm} · {sd} {am} " span { class: "text-xs text-slate-500", "→ Buku Besar → Neraca Saldo → {n} pos laporan" } }
                    ul { class: "mt-1 columns-1 text-xs sm:columns-2",
                        for (i, (sheet, label, up)) in cells.iter().take(14).enumerate() { li { key: "{i}", "{label} " span { class: "text-slate-500", "({sheet}) " } if *up { "▲" } else { "▼" } } }
                    }
                    if n > 14 { p { class: "text-xs text-slate-500", "dan {n - 14} pos lainnya" } }
                } }}
            }
        }
    }
}
