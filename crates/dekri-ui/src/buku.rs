//! Jurnal Umum, Buku Besar, Neraca Saldo (padanan halaman versi 1).
use crate::components::*;
use crate::session::Session;
use crate::shell::Icon;
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::ledger::{tb_totals, Stage};
use dekri_core::money::format_rupiah;
use dioxus::prelude::*;

fn fr(n: f64) -> String {
    if n.round() == 0.0 {
        String::new()
    } else {
        format_rupiah(n, false)
    }
}
fn acct(n: f64) -> String {
    if n.round() == 0.0 {
        "-".into()
    } else {
        format_rupiah(n, true)
    }
}
fn adj_cell(n: f64) -> String {
    if n.round() != 0.0 {
        format_rupiah(n, true)
    } else {
        String::new()
    }
}
fn acct_name(code: &str) -> String {
    dekri_core::content::any_account_name(code).unwrap_or_default()
}

#[component]
fn Empty(title: String, children: Element) -> Element {
    rsx! { div { class: "card text-center", h2 { class: "mb-1", "{title}" } p { class: "text-sm text-slate-600", {children} } } }
}

#[component]
pub fn JurnalUmum() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut q = use_signal(String::new);
    let d = data();
    let s = app.read();
    let c = s.ctx();
    let blocks: Vec<_> = d
        .transactions
        .iter()
        .filter_map(|t| {
            let lines: Vec<_> =
                s.st.journal
                    .get(&t.no.to_string())
                    .map(|v| {
                        v.iter()
                            .filter(|l| l.code.is_some() && (l.debit != 0.0 || l.credit != 0.0))
                            .cloned()
                            .collect()
                    })
                    .unwrap_or_default();
            if lines.is_empty() {
                None
            } else {
                Some((
                    t.clone(),
                    result_for(&s.st, ItemKind::Txn, &t.no.to_string(), &c).shown,
                    lines,
                ))
            }
        })
        .collect();
    drop(s);
    let td: f64 = blocks
        .iter()
        .flat_map(|b| b.2.iter())
        .map(|l| l.debit)
        .sum();
    let tc: f64 = blocks
        .iter()
        .flat_map(|b| b.2.iter())
        .map(|l| l.credit)
        .sum();
    let diff = td - tc;
    // transaksi yang debit-kreditnya tidak sama (nomor, selisih)
    let unbalanced: Vec<(u32, f64)> = blocks
        .iter()
        .filter_map(|b| {
            let d: f64 = b.2.iter().map(|l| l.debit).sum();
            let k: f64 = b.2.iter().map(|l| l.credit).sum();
            ((d - k).abs() >= 0.5).then_some((b.0.no, d - k))
        })
        .collect();
    let needle = q.read().trim().to_lowercase();
    let shown_blocks: Vec<_> = blocks
        .iter()
        .filter(|(t, _, lines)| {
            needle.is_empty()
                || t.no.to_string() == needle
                || t.topic.to_lowercase().contains(&needle)
                || lines.iter().any(|l| {
                    let code = l.code.clone().unwrap_or_default();
                    code.to_lowercase().contains(&needle)
                        || acct_name(&code).to_lowercase().contains(&needle)
                        || l.memo.to_lowercase().contains(&needle)
                })
        })
        .cloned()
        .collect();
    if blocks.is_empty() {
        return rsx! { Empty { title: "Jurnal umum masih kosong", "Belum ada jurnal. Isi jurnal pada halaman Transaksi; semuanya terkumpul di sini."
        br {} button { class: "btn btn-primary mt-3", onclick: move |_| app.write().go("transaksi/1"), "Mulai dari Transaksi 1" } } };
    }
    let filtering = !needle.is_empty();
    let (fd, fc): (f64, f64) = shown_blocks
        .iter()
        .flat_map(|b| b.2.iter())
        .fold((0.0, 0.0), |a, l| (a.0 + l.debit, a.1 + l.credit));
    let has_memo = blocks
        .iter()
        .any(|b| b.2.iter().any(|l| !l.memo.trim().is_empty()));
    let balanced = diff.abs() < 0.5 && unbalanced.is_empty();
    let n_all = blocks.len();
    let n_shown = shown_blocks.len();
    rsx! {
        div { class: "space-y-4",
            section { class: "card card-stat", "aria-label": "Ringkasan jurnal umum",
                div { class: "grid gap-4 sm:grid-cols-3",
                    div { div { class: "t-label", "Total debit" } div { class: "mt-0.5 text-2xl t-figure", "{format_rupiah(td, false)}" } }
                    div { div { class: "t-label", "Total kredit" } div { class: "mt-0.5 text-2xl t-figure", "{format_rupiah(tc, false)}" } }
                    div { div { class: "t-label", "Status keseimbangan" }
                        div { class: "mt-1.5",
                            if balanced { span { class: "badge badge-success", Icon { name: "check", size: 13 } "Seimbang" } }
                            else { span { class: "badge badge-danger", Icon { name: "alert", size: 13 } "Tidak seimbang · selisih {format_rupiah(diff.abs(), false)}" } }
                        }
                    }
                }
                if !unbalanced.is_empty() {
                    {let first = unbalanced[0].0; let n = unbalanced.len();
                    rsx! { div { class: "callout callout-danger mt-3 flex flex-wrap items-center gap-2", span { "{n} transaksi debit dan kreditnya tidak sama." }
                        button { class: "btn btn-sm", onclick: move |_| { let _ = document::eval(&format!("var e=document.getElementById('jt-{first}');e&&e.scrollIntoView({{block:'center',behavior:'smooth'}});")); }, "Lompat ke Transaksi {first}" } } }}
                }
                p { class: "mt-3 text-xs text-slate-500", "Ringkasan ini selalu mencakup seluruh {n_all} transaksi yang sudah dijurnal, bukan hanya hasil pencarian." }
            }
            div { class: "flex flex-wrap items-center gap-2",
                input { r#type: "search", class: "w-full max-w-md", "aria-label": "Cari di jurnal umum", placeholder: "Cari nomor, kode/nama akun, atau keterangan", value: "{q}", oninput: move |e| q.set(e.value()) }
                if filtering { button { class: "btn btn-sm", onclick: move |_| q.set(String::new()), "Hapus pencarian" } }
                span { class: "text-xs text-slate-500", "{n_shown} dari {n_all} transaksi" }
            }
            if n_shown == 0 {
                div { class: "card text-center text-sm text-slate-600", "Tidak ada jurnal yang cocok dengan pencarian ini." }
            } else {
            div { class: "card-data sticky-wrap",
                table { class: "sticky-head data-table",
                    thead { tr { th { class: "w-28", "Tanggal" } th { class: "w-16", "No." } th { "Akun" } if has_memo { th { "Keterangan" } } th { class: "num w-36", "Debit (Rp)" } th { class: "num w-36", "Kredit (Rp)" } th { class: "w-40", "Status" } } }
                    tbody {
                        for (t, shown, lines) in shown_blocks {
                            for (i, l) in lines.iter().enumerate() {
                                {
                                    let code = l.code.clone().unwrap_or_default();
                                    let name = acct_name(&code);
                                    let indent = l.credit != 0.0 && l.debit == 0.0;
                                    rsx! {
                                tr { key: "{t.no}-{l.id}", id: if i == 0 { "jt-{t.no}" } else { "" }, class: if i == 0 { "sep" } else { "" },
                                    td { class: "whitespace-nowrap", if i == 0 { "{crate::transaksi::date_id(&t.date)}" } }
                                    td { if i == 0 { button { class: "font-semibold text-blue-700 underline decoration-dotted underline-offset-2 hover:decoration-solid", title: "Buka transaksi {t.no}", onclick: { let no = t.no; move |_| app.write().go(&format!("transaksi/{no}")) }, "{t.no}" } } }
                                    td { class: if indent { "pl-9" } else { "" },
                                        span { class: "mr-2 font-mono text-xs text-slate-500", "{code}" } "{name}" }
                                    if has_memo { td { class: "text-xs text-slate-600", "{l.memo}" } }
                                    td { class: "num", "{fr(l.debit)}" } td { class: "num", "{fr(l.credit)}" }
                                    td { if i == 0 { div { class: "flex flex-wrap items-center gap-1", StatusBadge { status: shown }
                                        {let ub = unbalanced.iter().find(|u| u.0 == t.no).map(|u| u.1); rsx! { if let Some(x) = ub { span { class: "badge badge-danger", title: "Debit dan kredit transaksi ini tidak sama", "selisih {format_rupiah(x.abs(), false)}" } } }} } } }
                                }
                                    }
                                }
                            }
                        }
                    }
                    tfoot { tr {
                        td { colspan: if has_memo { "4" } else { "3" }, if filtering { "Total hasil pencarian ({n_shown} transaksi)" } else { "Total seluruh jurnal ({n_all} transaksi)" } }
                        td { class: "num", "{format_rupiah(fd, false)}" } td { class: "num", "{format_rupiah(fc, false)}" } td {}
                    } }
                }
            }
            }
        }
    }
}

#[component]
pub fn NeracaSaldo() -> Element {
    let app = use_context::<Signal<Session>>();
    let mut adjusted = use_signal(|| false);
    let mut only = use_signal(|| true);
    let s = app.read();
    let c = s.ctx();
    let stage = if *adjusted.read() {
        Stage::Adjusted
    } else {
        Stage::Pre
    };
    let (td, tc) = tb_totals(&c.report.tb, stage);
    let rows: Vec<_> = c
        .report
        .tb
        .iter()
        .filter(|r| {
            !*only.read()
                || (if *adjusted.read() {
                    r.adj_balance
                } else {
                    r.pre_balance
                }) != 0.0
        })
        .cloned()
        .collect();
    drop(s);
    let adj = *adjusted.read();
    let ok = (td - tc).abs() < 0.5;
    let empty = td == 0.0 && tc == 0.0;
    let abnormal = |r: &dekri_core::types::TbRow, b: f64| -> bool {
        (r.normal == "Debit" && b < 0.0) || (r.normal == "Credit" && b > 0.0)
    };
    let n_abn = rows
        .iter()
        .filter(|r| abnormal(r, if adj { r.adj_balance } else { r.pre_balance }))
        .count();
    let strip_cls = if empty {
        "border-[var(--ds-border-strong)]"
    } else if ok {
        "border-[var(--ds-success-bd)] bg-[var(--ds-success-bg)]"
    } else {
        "border-[var(--ds-danger-bd)] bg-[var(--ds-danger-bg)]"
    };
    rsx! {
        div { class: "space-y-3",
            div { role: "status", class: "sticky top-[4.35rem] z-10 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border-[1.5px] px-4 py-2 text-sm {strip_cls}",
                span { class: "text-slate-600", "Total debit " b { class: "t-figure text-slate-900", "{format_rupiah(td, false)}" } }
                span { class: "text-slate-600", "Total kredit " b { class: "t-figure text-slate-900", "{format_rupiah(tc, false)}" } }
                if empty { b { class: "text-slate-600", "Belum ada saldo" } }
                else if ok { span { class: "badge badge-success", Icon { name: "check", size: 13 } "Seimbang" } }
                else { span { class: "badge badge-danger", Icon { name: "alert", size: 13 } "Tidak seimbang · selisih {format_rupiah((td - tc).abs(), false)}" } }
            }
            div { class: "no-print flex flex-wrap items-center gap-3",
                div { class: "seg", role: "group", "aria-label": "Tahap neraca saldo",
                    button { class: if !adj { "btn btn-primary" } else { "btn" }, "aria-pressed": "{!adj}", onclick: move |_| adjusted.set(false), "Sebelum penyesuaian" }
                    button { class: if adj { "btn btn-primary" } else { "btn" }, "aria-pressed": "{adj}", onclick: move |_| adjusted.set(true), "Setelah penyesuaian" }
                }
                p { class: "min-w-0 flex-1 text-xs text-slate-500", "Saldo akun di sisi debit ditulis di kolom Debit, saldo di sisi kredit di kolom Kredit. Kedua total harus sama." }
                label { class: "flex items-center gap-2 text-sm", input { r#type: "checkbox", checked: *only.read(), onchange: move |e| only.set(e.checked()) } " Hanya akun bersaldo" }
            }
            div { class: "card-data sticky-wrap",
                table { class: "sticky-head with-strip data-table",
                    thead { tr { th { class: "w-24", "Kode" } th { "Nama akun" } th { class: "w-28", "Saldo normal" } if adj { th { class: "num", "Penyesuaian (D−K)" } } th { class: "num w-44", "Debit (Rp)" } th { class: "num w-44", "Kredit (Rp)" } } }
                    tbody {
                        for r in rows.iter() {
                            {let b = if adj { r.adj_balance } else { r.pre_balance };
                            let abn = abnormal(r, b);
                            let ncls = if abn { "num font-semibold text-[var(--ds-warning-fg)]" } else { "num" };
                            rsx! { tr { key: "{r.code}", td { class: "font-mono text-xs text-slate-500", "{r.code}" } td { "{r.name}" }
                                td { span { class: if r.normal == "Debit" { "badge badge-info" } else { "badge badge-neutral" }, "{id_normal(&r.normal)}" } }
                                if adj { td { class: "num text-slate-600", "{adj_cell(r.adj_debit - r.adj_credit)}" } }
                                td { class: "{ncls}", title: if abn { "Saldo berada di sisi debit, padahal saldo normal akun ini kredit. Periksa kembali jurnalnya." } else { "" }, if b > 0.0 { if abn { "⚠ " } "{format_rupiah(b, false)}" } }
                                td { class: "{ncls}", title: if abn { "Saldo berada di sisi kredit, padahal saldo normal akun ini debit. Periksa kembali jurnalnya." } else { "" }, if b < 0.0 { if abn { "⚠ " } "{format_rupiah(-b, false)}" } } } }}
                        }
                    }
                    tfoot { tr { td { colspan: if adj { "4" } else { "3" }, "TOTAL" } td { class: "num", "{format_rupiah(td, false)}" } td { class: "num", "{format_rupiah(tc, false)}" } } }
                }
            }
            if n_abn > 0 { p { class: "callout callout-warning", "⚠ {n_abn} akun bersaldo di luar sisi normalnya (ditandai kuning). Itu tidak selalu salah, tetapi layak dicek di Buku Besar dan jurnalnya." } }
        }
    }
}

struct Mv {
    date: String,
    r#ref: String,
    memo: String,
    debit: f64,
    credit: f64,
}

#[component]
pub fn BukuBesar() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut code = use_signal(|| {
        app.read()
            .gl_code
            .clone()
            .unwrap_or_else(|| "1-1100".to_string())
    });
    let mut only = use_signal(|| true);
    let mut period = use_signal(|| 0usize);
    let d = data();
    let s = app.read();
    let c = s.ctx();
    let cd = code.read().clone();
    let row = c.report.tb.iter().find(|r| r.code == cd).cloned();
    let mut moves: Vec<Mv> = vec![];
    for t in &d.transactions {
        for l in s.st.journal.get(&t.no.to_string()).into_iter().flatten() {
            if l.code.as_deref() == Some(cd.as_str()) && (l.debit != 0.0 || l.credit != 0.0) {
                moves.push(Mv {
                    date: t.date.clone(),
                    r#ref: format!("Txn {}", t.no),
                    memo: if l.memo.is_empty() {
                        t.topic.clone()
                    } else {
                        l.memo.clone()
                    },
                    debit: l.debit,
                    credit: l.credit,
                });
            }
        }
    }
    for a in &d.adjustments {
        for l in s.st.adjusting.get(&a.code).into_iter().flatten() {
            if l.code.as_deref() == Some(cd.as_str()) && (l.debit != 0.0 || l.credit != 0.0) {
                moves.push(Mv {
                    date: "2024-12-31".into(),
                    r#ref: a.code.clone(),
                    memo: if l.memo.is_empty() {
                        a.category.clone()
                    } else {
                        l.memo.clone()
                    },
                    debit: l.debit,
                    credit: l.credit,
                });
            }
        }
    }
    let tb: Vec<_> = c
        .report
        .tb
        .iter()
        .filter(|r| {
            !*only.read()
                || r.opening != 0.0
                || r.journal_debit != 0.0
                || r.journal_credit != 0.0
                || r.adj_debit != 0.0
                || r.adj_credit != 0.0
        })
        .cloned()
        .collect();
    let all_tb = c.report.tb.clone();
    drop(s);
    let mut running = row.as_ref().map(|r| r.opening).unwrap_or(0.0);
    let start = running;
    // semua mutasi dengan saldo berjalan (dihitung dari seluruh periode agar saldo tetap benar saat difilter)
    let all_mv: Vec<(usize, String, String, String, f64, f64, f64)> = moves
        .iter()
        .enumerate()
        .map(|(i, m)| {
            running += m.debit - m.credit;
            (
                i,
                m.date.clone(),
                m.r#ref.clone(),
                m.memo.clone(),
                m.debit,
                m.credit,
                running,
            )
        })
        .collect();
    let month_of = |d: &str| -> usize {
        d.split('-')
            .nth(1)
            .and_then(|m| m.parse::<usize>().ok())
            .unwrap_or(0)
    };
    const BULAN: [&str; 12] = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
    ];
    let per = *period.read();
    let shown_mv: Vec<_> = all_mv
        .iter()
        .filter(|m| per == 0 || month_of(&m.1) == per)
        .cloned()
        .collect();
    // saldo awal periode = saldo berjalan sebelum baris pertama yang tampil
    let open_bal = if per == 0 {
        start
    } else {
        all_mv
            .iter()
            .take_while(|m| month_of(&m.1) < per)
            .last()
            .map(|m| m.6)
            .unwrap_or(start)
    };
    let (sum_d, sum_c) = shown_mv
        .iter()
        .fold((0.0, 0.0), |a, m| (a.0 + m.4, a.1 + m.5));
    let close_bal = open_bal + sum_d - sum_c;
    let dk = |n: f64| -> &'static str {
        if n.round() == 0.0 {
            ""
        } else if n > 0.0 {
            "D"
        } else {
            "K"
        }
    };
    let n_mv = shown_mv.len();
    rsx! {
        div { class: "space-y-4",
            div { class: "card",
                {let opts: Vec<(String, String)> = all_tb.iter().map(|r| (r.code.clone(), r.name.clone())).collect();
                 let cur = code.read().clone();
                 let pos = all_tb.iter().position(|r| r.code == cur);
                 let prev = pos.and_then(|i| i.checked_sub(1)).map(|i| all_tb[i].code.clone());
                 let next = pos.and_then(|i| all_tb.get(i + 1)).map(|r| r.code.clone());
                 rsx! { div { class: "flex flex-wrap items-center gap-3",
                    div { class: "flex min-w-72 max-w-xl flex-1 items-center gap-2",
                        button { class: "btn btn-icon", title: "Akun sebelumnya", "aria-label": "Akun sebelumnya", disabled: prev.is_none(), onclick: { let p = prev.clone(); move |_| { if let Some(p) = p.clone() { code.set(p); } } }, "←" }
                        div { class: "min-w-0 flex-1",
                            AccountPicker { p: PickerProps { value: if cur.is_empty() { None } else { Some(cur.clone()) }, label: "Pilih akun buku besar".to_string(), cell: "gl-akun".to_string(), options: opts, exclusive: true,
                                on_change: EventHandler::new(move |v: Option<String>| { if let Some(v) = v { code.set(v); } }), on_nav: EventHandler::new(|_| {}) } }
                        }
                        button { class: "btn btn-icon", title: "Akun berikutnya", "aria-label": "Akun berikutnya", disabled: next.is_none(), onclick: { let n = next.clone(); move |_| { if let Some(n) = n.clone() { code.set(n); } } }, "→" }
                    }
                    label { class: "flex items-center gap-2 text-sm text-slate-600", span { class: "t-label", "Periode" }
                        select { "aria-label": "Filter periode", onchange: move |e| period.set(e.value().parse::<usize>().unwrap_or(0)),
                            option { value: "0", selected: per == 0, "Seluruh tahun" }
                            for (i, b) in BULAN.iter().enumerate() { option { key: "{i}", value: "{i + 1}", selected: per == i + 1, "{b}" } }
                        }
                    }
                } }}
                if let Some(r) = row.as_ref() {
                    div { class: "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5",
                        div { class: "rounded-xl border border-[var(--ds-border)] p-3", div { class: "t-label", "{r.name}" }
                            div { class: "mt-1", span { class: if r.normal == "Debit" { "badge badge-info" } else { "badge badge-warning" }, title: "Sisi tempat saldo akun ini normalnya berada", "Saldo normal {r.normal}" } } }
                        div { class: "rounded-xl border border-[var(--ds-border)] p-3", div { class: "t-label", if per == 0 { "Saldo awal" } else { "Saldo awal periode" } } div { class: "mt-1 text-lg t-figure", "{format_rupiah(open_bal.abs(), false)} " span { class: "text-xs font-semibold text-slate-500", "{dk(open_bal)}" } } }
                        div { class: "rounded-xl border border-[var(--ds-border)] p-3", div { class: "t-label", "Mutasi debit" } div { class: "mt-1 text-lg t-figure", "{format_rupiah(sum_d, false)}" } }
                        div { class: "rounded-xl border border-[var(--ds-border)] p-3", div { class: "t-label", "Mutasi kredit" } div { class: "mt-1 text-lg t-figure", "{format_rupiah(sum_c, false)}" } }
                        div { class: "rounded-xl border-2 border-slate-900 bg-[var(--tag-lime-bg)] p-3 text-[var(--tag-lime-fg)]", div { class: "text-xs font-semibold", if per == 0 { "Saldo akhir" } else { "Saldo akhir periode" } } div { class: "mt-1 text-lg t-figure", "{format_rupiah(close_bal.abs(), false)} " span { class: "text-xs font-semibold", "{dk(close_bal)}" } } }
                    }
                    p { class: "mt-2 text-xs text-slate-500", "D = saldo di sisi debit, K = saldo di sisi kredit. Saldo berjalan = saldo sebelumnya + debit − kredit." }
                }
            }
            div { class: "card-data sticky-wrap",
                table { class: "sticky-head data-table",
                    thead { tr { th { class: "w-28", "Tanggal" } th { class: "w-24", "Sumber" } th { "Keterangan" } th { class: "num w-36", "Debit" } th { class: "num w-36", "Kredit" } th { class: "num w-40", "Saldo berjalan" } th { class: "w-8" } } }
                    tbody {
                        tr { class: "bg-[var(--ds-surface-2)] font-medium", td { colspan: "5", if per == 0 { "Saldo awal 1 Januari 2024" } else { "Saldo awal periode ({BULAN[per - 1]})" } } td { class: "num", "{format_rupiah(open_bal.abs(), false)}" } td { class: "text-xs font-semibold text-slate-500", "{dk(open_bal)}" } }
                        {
                            let mut last_m = 0usize;
                            let items: Vec<_> = shown_mv.iter().cloned().map(|m| { let mm = month_of(&m.1); let head = if mm != last_m { last_m = mm; Some(mm) } else { None }; (m, head) }).collect();
                            rsx! {
                                for ((i, date, rf, memo, dr, cr, run), head) in items {
                                  Fragment { key: "{i}",
                                    if let (Some(mm), true) = (head, per == 0) {
                                        tr { td { colspan: "7", class: "!border-t !border-[var(--ds-border)] bg-[var(--ds-surface-2)] !py-1 t-label", "{BULAN.get(mm.wrapping_sub(1)).copied().unwrap_or(\"\")} 2024" } }
                                    }
                                    tr {
                                        td { class: "whitespace-nowrap", "{crate::transaksi::date_id(&date)}" }
                                        td { { let r2 = rf.clone(); let no = rf.strip_prefix("Txn ").and_then(|n| n.parse::<u32>().ok());
                                            rsx! { if let Some(n) = no { button { class: "font-semibold text-blue-700 underline decoration-dotted underline-offset-2 hover:decoration-solid", title: "Buka transaksi {n}", onclick: move |_| app.write().go(&format!("transaksi/{n}")), "{r2}" } } else { span { class: "text-xs text-slate-600", "{r2}" } } } } }
                                        td { "{memo}" }
                                        td { class: "num", "{fr(dr)}" } td { class: "num", "{fr(cr)}" }
                                        td { class: "num font-medium", "{format_rupiah(run.abs(), false)}" }
                                        td { class: "text-xs font-semibold text-slate-500", "{dk(run)}" }
                                    }
                                  }
                                }
                            }
                        }
                        if n_mv == 0 { tr { td { colspan: "7", class: "py-6 text-center text-slate-500", "Tidak ada mutasi pada akun ini untuk periode yang dipilih." } } }
                    }
                    tfoot { tr {
                        td { colspan: "3", "Jumlah mutasi ({n_mv} baris) · saldo akhir" }
                        td { class: "num", "{format_rupiah(sum_d, false)}" } td { class: "num", "{format_rupiah(sum_c, false)}" } td { class: "num", "{format_rupiah(close_bal.abs(), false)}" } td { class: "text-xs", "{dk(close_bal)}" }
                    } }
                }
            }
            div { class: "card-data sticky-wrap",
                div { class: "flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ds-border)] px-4 py-3",
                    h2 { class: "text-base", "Ringkasan saldo semua akun" }
                    label { class: "flex items-center gap-2 text-sm", input { r#type: "checkbox", checked: *only.read(), onchange: move |e| only.set(e.checked()) } " Hanya akun bersaldo atau bergerak" }
                }
                table { class: "data-table",
                    thead { tr { th { class: "w-24", "Kode" } th { "Nama akun" } th { class: "num", "Saldo awal" } th { class: "num", "Mutasi debit" } th { class: "num", "Mutasi kredit" } th { class: "num", "Saldo akhir (D−K)" } } }
                    tbody {
                        for r in tb.iter() {
                            tr { key: "{r.code}", class: if r.code == *code.read() { "cursor-pointer bg-[var(--ds-secondary)]" } else { "cursor-pointer" }, title: "Klik untuk membuka buku besar akun ini",
                                onclick: { let c = r.code.clone(); move |_| { code.set(c.clone()); let _ = document::eval("window.scrollTo({top:0,behavior:'smooth'})"); } },
                                td { class: "whitespace-nowrap font-mono text-xs", "{r.code}" } td { "{r.name}" } td { class: "num", "{acct(r.opening)}" }
                                td { class: "num", "{acct(r.journal_debit + r.adj_debit)}" } td { class: "num", "{acct(r.journal_credit + r.adj_credit)}" } td { class: "num font-medium", "{acct(r.adj_balance)}" } }
                        }
                    }
                }
                p { class: "border-t border-[var(--ds-border)] px-4 py-2 text-xs text-slate-500", "{all_tb.len()} akun dalam bagan akun. Klik baris untuk membuka akun di atas." }
            }
        }
    }
}

fn date_short(d: &str) -> String {
    const M: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    let p: Vec<&str> = d.split('-').collect();
    match (
        p.get(1).and_then(|m| m.parse::<usize>().ok()),
        p.get(2).and_then(|x| x.parse::<u32>().ok()),
    ) {
        (Some(m @ 1..=12), Some(day)) => format!("{day} {}", M[m - 1]),
        _ => d.to_string(),
    }
}

#[component]
pub fn BukuPembantu() -> Element {
    use dekri_core::subledger::*;
    let mut app = use_context::<Signal<Session>>();
    let mut tab = use_signal(|| 0usize);
    let mut pf = use_signal(String::new);
    let tabs = [
        ("1-1200", "Piutang usaha per pelanggan"),
        ("2-1000", "Utang usaha per pemasok"),
        ("1-1400", "Kartu persediaan"),
    ];
    let d = data();
    let code = tabs[*tab.read()].0;
    let s = app.read();
    let c = s.ctx();
    let opening: f64 = d
        .opening
        .iter()
        .filter(|o| o.code == code)
        .map(|o| o.debit - o.credit)
        .sum();
    let pre = c
        .report
        .tb
        .iter()
        .find(|r| r.code == code)
        .map(|r| r.pre_balance)
        .unwrap_or(0.0);
    let has = c.has_entries;
    let txns: Vec<TxnRef> = d
        .transactions
        .iter()
        .map(|t| TxnRef {
            no: t.no,
            date: &t.date,
            party: &t.party,
            topic: &t.topic,
        })
        .collect();
    let credit = code == "2-1000";
    let sign = if credit { -1.0 } else { 1.0 };
    let inv = if code == "1-1400" {
        inventory_card(opening, &txns, &s.st.journal, code)
    } else {
        vec![]
    };
    let moves = if code != "1-1400" {
        movements(code, &txns, &s.st.journal)
    } else {
        vec![]
    };
    let parties = by_party(&moves);
    let rec = reconcile(opening, &moves, pre);
    drop(s);
    let t = *tab.read();
    let party_sel = pf.read().clone();
    let filtering = !party_sel.is_empty();
    let account_name = acct_name(code);
    // saldo berjalan: akun kontrol (saldo awal + mutasi kumulatif); bila disaring per pihak: mutasi kumulatif pihak itu
    let mut run = if filtering { 0.0 } else { sign * opening };
    let detail: Vec<(Movement, f64)> = moves
        .iter()
        .filter(|m| !filtering || m.party == party_sel)
        .map(|m| {
            run += sign * (m.debit - m.credit);
            (m.clone(), run)
        })
        .collect();
    let (fd, fc) = detail
        .iter()
        .fold((0.0, 0.0), |a, (m, _)| (a.0 + m.debit, a.1 + m.credit));
    let (n_shown, n_all) = (detail.len(), moves.len());
    let (inv_in, inv_out) = inv
        .iter()
        .fold((0.0, 0.0), |a, r| (a.0 + r.in_amount, a.1 + r.out_amount));
    let inv_end = inv.last().map(|r| r.balance).unwrap_or(0.0);
    let (tot_d, tot_c) = parties
        .iter()
        .fold((0.0, 0.0), |a, p| (a.0 + p.debit, a.1 + p.credit));
    let tot_n: u32 = parties.iter().map(|p| p.count).sum();
    let run_head = if filtering {
        "Mutasi kumulatif pihak"
    } else {
        "Saldo akun kontrol"
    };
    let party_names: Vec<String> = parties.iter().map(|p| p.party.clone()).collect();
    let tile = "rounded-xl border border-[var(--ds-border)] p-3";
    let tile_key = if rec.ok {
        "rounded-xl border-2 border-slate-900 bg-[var(--tag-lime-bg)] p-3 text-[var(--tag-lime-fg)]"
    } else {
        "rounded-xl border-2 border-slate-900 bg-[var(--tag-blush-bg)] p-3 text-[var(--tag-blush-fg)]"
    };
    rsx! {
        div { class: "space-y-4",
            div { class: "seg", role: "group", "aria-label": "Jenis buku pembantu",
                for (i, (_, l)) in tabs.iter().enumerate() { button { key: "{i}", class: if t == i { "btn btn-primary" } else { "btn" }, onclick: move |_| { tab.set(i); pf.set(String::new()); }, "{l}" } }
            }
            if !has { p { class: "callout callout-info", role: "note", "Belum ada jurnal transaksi. Buku pembantu disusun dari jurnal yang Anda isi." } }
            if code == "1-1400" {
                div { class: "card",
                    h2 { class: "t-card mb-1", "Kartu persediaan (nilai rupiah, metode perpetual)" }
                    p { class: "mb-3 text-xs text-slate-500", "Data kasus hanya memuat nilai rupiah, tanpa kuantitas, sehingga tidak ada harga rata-rata per unit. Saldo akhir sama dengan akun Persediaan sebelum jurnal penyesuaian." }
                    div { class: "card-data",
                        table { class: "data-table",
                            thead { tr { th { "No" } th { "Tanggal" } th { "Keterangan" } th { class: "num", "Masuk" } th { class: "num", "Keluar" } th { class: "num", "Saldo" } } }
                            tbody { for (i, r) in inv.iter().enumerate() { tr { key: "{i}",
                                td { if let Some(n) = r.no { button { class: "text-blue-700 underline", onclick: move |_| app.write().go(&format!("transaksi/{n}")), "{n}" } } }
                                td { class: "whitespace-nowrap", "{date_short(&r.date)}" } td { "{r.note}" }
                                td { class: "num", "{acct(r.in_amount)}" } td { class: "num", "{acct(r.out_amount)}" } td { class: "num font-semibold", "{acct(r.balance)}" } } } }
                            tfoot { tr { td { colspan: "3", "Total mutasi dan saldo akhir" } td { class: "num", "{acct(inv_in)}" } td { class: "num", "{acct(inv_out)}" } td { class: "num", "{acct(inv_end)}" } } }
                        }
                    }
                }
            } else {
                div { class: "card",
                    div { class: "mb-3 flex flex-wrap items-center justify-between gap-2",
                        h2 { class: "t-card", "Rekonsiliasi dengan akun kontrol {code} {account_name}" }
                        if rec.ok { span { class: "badge badge-success", Icon { name: "check", size: 13 } "Cocok" } }
                        else { span { class: "badge badge-danger", Icon { name: "alert", size: 13 } "Tidak cocok" } }
                    }
                    dl { class: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                        div { class: "{tile}", dt { class: "t-label", "Saldo awal" } dd { class: "mt-1 text-lg t-figure", "{acct(sign * rec.opening)}" } }
                        div { class: "{tile}", dt { class: "t-label", "Mutasi semua pihak" } dd { class: "mt-1 text-lg t-figure", "{acct(sign * rec.mutation)}" } }
                        div { class: "{tile_key}", dt { class: "text-xs font-semibold", "Saldo menurut buku pembantu" } dd { class: "mt-1 text-lg t-figure", "{acct(sign * rec.expected)}" } }
                        div { class: "{tile}", dt { class: "t-label", "Saldo akun kontrol (buku besar, sebelum penyesuaian)" } dd { class: "mt-1 text-lg t-figure", "{acct(sign * rec.control)}" } }
                    }
                    p { class: "mt-3 text-xs text-slate-500", "Saldo awal ditambah mutasi semua pihak harus sama dengan saldo akun kontrol. Data kasus tidak memuat rincian saldo awal per pihak, sehingga saldo awal ditampilkan sebagai satu angka. Nama pihak diambil dari data transaksi, bukan dari jurnal Anda." }
                }
                div { class: "card",
                    h2 { class: "t-card mb-1", if credit { "Mutasi per pemasok (dari jurnal)" } else { "Mutasi per pelanggan (dari jurnal)" } }
                    p { class: "mb-3 text-xs text-slate-500", "Pilih nama pihak untuk menyaring rincian transaksi di bawah." }
                    if parties.is_empty() { p { class: "text-sm text-slate-500", "Belum ada mutasi." } }
                    else {
                        div { class: "card-data",
                            table { class: "data-table",
                                thead { tr { th { "Pihak" } th { class: "num", "Transaksi" } th { class: "num", "Debit" } th { class: "num", "Kredit" } th { class: "num", if credit { "Mutasi neto (kredit)" } else { "Mutasi neto (debit)" } } } }
                                tbody { for (i, p) in parties.iter().enumerate() { tr { key: "{i}", class: if party_sel == p.party { "bg-[var(--tag-lime-bg)]" } else { "" },
                                    td { button { class: "text-left font-medium text-blue-700 hover:underline", "aria-pressed": "{party_sel == p.party}", onclick: { let name = p.party.clone(); move |_| pf.set(name.clone()) }, "{p.party}" } }
                                    td { class: "num", "{p.count}" } td { class: "num", "{acct(p.debit)}" } td { class: "num", "{acct(p.credit)}" } td { class: "num font-semibold", "{acct(sign * p.net)}" } } } }
                                tfoot { tr { td { "Total seluruh pihak" } td { class: "num", "{tot_n}" } td { class: "num", "{acct(tot_d)}" } td { class: "num", "{acct(tot_c)}" } td { class: "num", "{acct(sign * (tot_d - tot_c))}" } } }
                            }
                        }
                    }
                }
                div { class: "card",
                    div { class: "mb-3 flex flex-wrap items-center justify-between gap-3",
                        div { class: "min-w-0",
                            h2 { class: "t-card", "Rincian transaksi" }
                            p { class: "text-xs text-slate-500", if filtering { "Menampilkan {n_shown} dari {n_all} transaksi · pihak: {party_sel}" } else { "Menampilkan seluruh {n_all} transaksi" } }
                        }
                        div { class: "flex flex-wrap items-center gap-2",
                            label { class: "flex items-center gap-2 text-sm text-slate-600", span { class: "t-label", "Pihak" }
                                select { class: "w-56", "aria-label": "Saring rincian transaksi per pihak", onchange: move |e| pf.set(e.value()),
                                    option { value: "", selected: !filtering, "Semua pihak" }
                                    for n in party_names.iter() { option { key: "{n}", value: "{n}", selected: *n == party_sel, "{n}" } }
                                }
                            }
                            if filtering { button { class: "btn btn-sm", onclick: move |_| pf.set(String::new()), "Tampilkan semua" } }
                        }
                    }
                    if detail.is_empty() { p { class: "text-sm text-slate-500", "Belum ada mutasi." } }
                    else {
                        div { class: "card-data",
                            table { class: "data-table",
                                thead { tr { th { "No" } th { "Tanggal" } th { "Pihak" } th { "Uraian" } th { class: "num", "Debit" } th { class: "num", "Kredit" } th { class: "num", "{run_head}" } } }
                                tbody { for (m, bal) in detail.iter() { tr { key: "{m.no}",
                                    td { button { class: "text-blue-700 underline", onclick: { let n = m.no; move |_| app.write().go(&format!("transaksi/{n}")) }, "{m.no}" } }
                                    td { class: "whitespace-nowrap", "{date_short(&m.date)}" } td { "{m.party}" } td { "{m.topic}" }
                                    td { class: "num", "{acct(m.debit)}" } td { class: "num", "{acct(m.credit)}" } td { class: "num font-semibold", "{acct(*bal)}" } } } }
                                tfoot { tr { td { colspan: "4", if filtering { "Total hasil penyaringan ({n_shown} transaksi)" } else { "Total seluruh transaksi ({n_all} transaksi)" } } td { class: "num", "{acct(fd)}" } td { class: "num", "{acct(fc)}" } td {} } }
                            }
                        }
                    }
                }
            }
        }
    }
}
