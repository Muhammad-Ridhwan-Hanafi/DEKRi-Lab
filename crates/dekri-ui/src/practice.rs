//! Blok bantu belajar bersama: petunjuk, penanda, catatan, kunci jawaban, penjelasan langkah.
use crate::session::Session;
use dekri_core::actions;
use dekri_core::derive::*;
use dekri_core::explain::{explain_journal, ExplainOpts};
use dekri_core::feedback::{compare_with_key, diagnose, numbers_in, VerdictKind};
use dekri_core::grade::NetMap;
use dekri_core::hints::hint_texts;
use dekri_core::money::format_rupiah;
use dekri_core::types::JournalLine;
use dioxus::prelude::*;

pub type KLine = (String, String, f64, f64);

pub fn key_lines(ls: &[dekri_core::data::ReadableLine]) -> Vec<KLine> {
    ls.iter()
        .map(|l| (l.code.clone(), l.name.clone(), l.debit, l.credit))
        .collect()
}
pub fn rp(n: f64) -> String {
    if n.round() == 0.0 {
        String::new()
    } else {
        format_rupiah(n, false)
    }
}

fn to_net(lines: &[KLine]) -> NetMap {
    let mut m = NetMap::new();
    for (c, _, d, k) in lines {
        *m.entry(c.clone()).or_insert(0.0) += d - k;
    }
    m
}

fn id_num(n: f64) -> String {
    format_rupiah(n, false)
}

/// Petunjuk bertingkat (padanan Hints di StudyAids.tsx).
#[component]
pub fn Hints(
    kind: ItemKind,
    id: String,
    topic: String,
    lines: Vec<KLine>,
    #[props(default = None)] calc: Option<String>,
) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let key = item_key(kind, &id);
    let level = app.read().st.hints.get(&key).copied().unwrap_or(0) as usize;
    let texts = hint_texts(&topic, &lines, calc.as_deref());
    rsx! {
        div { class: "mt-3 text-sm",
            for (i, t) in texts.iter().take(level).enumerate() {
                p { key: "{i}", class: "callout callout-warning mb-1 !py-1.5", b { "Petunjuk {i + 1}:" } " {t}" }
            }
            if level < 3 {
                button { class: "btn", onclick: move |_| { let mut s = app.write(); actions::open_hint(&mut s.st, kind, &id); s.refresh(); },
                    if level == 0 { "Beri petunjuk" } else { "Petunjuk berikutnya ({level + 1}/3)" } }
            }
        }
    }
}

/// Penanda + catatan pribadi per soal.
#[component]
pub fn FlagNote(kind: ItemKind, id: String) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let key = item_key(kind, &id);
    let (flagged, note) = {
        let s = app.read();
        (
            s.st.flags.contains(&key),
            s.st.notes.get(&key).cloned().unwrap_or_default(),
        )
    };
    let id2 = id.clone();
    rsx! {
        div { class: "mt-3 flex flex-wrap items-start gap-2 text-sm",
            button { class: if flagged { "btn btn-primary" } else { "btn" }, "aria-pressed": "{flagged}", onclick: move |_| { let mut s = app.write(); actions::toggle_flag(&mut s.st, kind, &id); s.refresh(); }, if flagged { "★ Ditandai" } else { "☆ Tandai" } }
            label { class: "min-w-[14rem] flex-1",
                span { class: "sr-only", "Catatan pribadi" }
                textarea { "aria-label": "Catatan pribadi", class: "w-full", rows: "1", placeholder: "Catatan pribadi untuk soal ini", value: "{note}",
                    oninput: move |e: Event<FormData>| { let mut s = app.write(); actions::set_note(&mut s.st, kind, &id2, &e.value()); s.refresh(); } }
            }
        }
    }
}

/// Penjelasan kunci langkah demi langkah (padanan StepExplain).
#[component]
pub fn StepExplain(
    lines: Vec<KLine>,
    #[props(default = None)] topic: Option<String>,
    #[props(default = None)] explain: Option<String>,
    #[props(default = None)] calc: Option<String>,
    #[props(default = None)] reason: Option<String>,
) -> Element {
    let steps = explain_journal(
        &lines,
        ExplainOpts {
            topic: topic.as_deref(),
            explain: explain.as_deref(),
            calc: calc.as_deref(),
            reason: reason.as_deref(),
        },
    );
    rsx! {
        ol { class: "mt-2 space-y-2", "aria-label": "Penjelasan langkah demi langkah",
            for (i, st) in steps.iter().enumerate() {
                li { key: "{i}", class: "rounded-md bg-white/70 px-2 py-1.5",
                    div { class: "font-medium", "{i + 1}. {st.title}" }
                    if let Some(b) = &st.body { p { class: "mt-0.5", "{b}" } }
                    if !st.items.is_empty() { ul { class: "mt-0.5 list-disc space-y-0.5 pl-5", for (j, t) in st.items.iter().enumerate() { li { key: "{j}", "{t}" } } } }
                }
            }
        }
    }
}

/// Penjelasan setelah jawaban BENAR (padanan WhyCorrect).
#[component]
pub fn WhyCorrect(
    #[props(default = None)] explain: Option<String>,
    #[props(default = None)] calc: Option<String>,
    #[props(default = vec![])] points: Vec<String>,
    #[props(default = vec![])] lines: Vec<KLine>,
    #[props(default = None)] topic: Option<String>,
) -> Element {
    if explain.is_none() && calc.is_none() && points.is_empty() && lines.is_empty() {
        return rsx! {};
    }
    rsx! {
        details { class: "mt-2 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-sm",
            summary { class: "cursor-pointer select-none font-medium", "Mengapa jawaban ini benar?" }
            if !lines.is_empty() { StepExplain { lines: lines.clone(), topic: topic.clone(), explain: explain.clone(), calc: calc.clone() } }
            else {
                if let Some(c) = &calc { p { class: "mt-1", b { "Perhitungan:" } " {c}" } }
                if let Some(e) = &explain { p { class: "mt-1", "{e}" } }
                if !points.is_empty() { ul { class: "mt-1 list-disc space-y-1 pl-5", for (i, t) in points.iter().enumerate() { li { key: "{i}", "{t}" } } } }
            }
        }
    }
}

#[component]
pub fn KeyJournal(lines: Vec<KLine>) -> Element {
    rsx! {
        table { class: "my-1 bg-white",
            tbody { for (i, (c, n, d, k)) in lines.iter().enumerate() {
                tr { key: "{i}", td { class: "whitespace-nowrap font-mono text-xs", "{c}" } td { "{n}" } td { class: "num", "{rp(*d)}" } td { class: "num", "{rp(*k)}" } } } }
        }
    }
}

/// Kunci tersembunyi sampai pengguna memilih membukanya (padanan KeyReveal).
#[component]
pub fn KeyReveal(
    revealed: bool,
    on_reveal: EventHandler<()>,
    #[props(default = None)] on_adopt: Option<EventHandler<()>>,
    #[props(default = None)] report: Option<(ItemKind, String)>,
    children: Element,
) -> Element {
    if !revealed {
        return rsx! { div { class: "mt-3", crate::components::ConfirmButton { label: "Lihat kunci dan penjelasan", message: "Membuka kunci mengeluarkan item ini dari perhitungan akurasi.", confirm_label: "Ya, buka kunci", on_confirm: move |_| on_reveal.call(()) } } };
    }
    rsx! {
        div { class: "callout callout-info mt-3",
            div { class: "mb-1 font-semibold text-blue-900", "Kunci dan penjelasan" }
            {children}
            p { class: "mt-2 text-xs text-slate-600", "Merasa kunci atau penjelasan ini keliru? Tombol Laporkan menyiapkan laporan siap tempel." }
            div { class: "mt-2 flex flex-wrap items-center gap-2",
                if let Some(a) = on_adopt { button { class: "btn", onclick: move |_| a.call(()), "Pakai jawaban kunci sebagai jawaban saya" } }
                if let Some((k, i)) = report { ReportButton { kind: k, id: i } }
            }
        }
    }
}

/// Perbandingan jawaban Anda dengan kunci (padanan KeyCompare).
#[component]
pub fn KeyCompare(lines: Vec<JournalLine>, key_lines: Vec<KLine>) -> Element {
    if !lines.iter().any(|l| l.code.is_some()) {
        return rsx! {};
    }
    let rows = compare_with_key(&lines, &to_net(&key_lines));
    let cell = |c: Option<(char, f64)>| {
        c.map(|(s, a)| {
            format!(
                "{} {}",
                if s == 'D' { "Debit" } else { "Kredit" },
                id_num(a)
            )
        })
        .unwrap_or_else(|| "—".to_string())
    };
    rsx! {
        table { class: "my-2 bg-white",
            thead { tr { th { "Akun" } th { "Jawaban Anda" } th { "Kunci" } th { "Hasil" } } }
            tbody { for r in rows.iter() {
                tr { key: "{r.code}",
                    td { span { class: "font-mono text-xs", "{r.code}" } " {r.name}" }
                    td { class: "num", "{cell(r.user)}" } td { class: "num", "{cell(r.key)}" }
                    td { class: if r.matched { "text-green-800" } else { "text-red-800" }, if r.matched { "Cocok" } else if r.key.is_some() && r.user.is_none() { "Belum ada" } else if r.key.is_none() { "Tidak diperlukan" } else { "Berbeda" } }
                } } }
        }
    }
}

/// Diagnosis kesalahan tanpa membuka kunci (padanan Diagnosis).
#[component]
pub fn Diagnosis(lines: Vec<JournalLine>, key_lines: Vec<KLine>, text: String) -> Element {
    let f = diagnose(&lines, &to_net(&key_lines), &numbers_in(&text));
    rsx! {
        div { class: "callout callout-danger ap-fade mt-3",
            div { class: "mb-1 font-semibold", "Mengapa belum tepat" }
            ul { class: "space-y-0.5",
                for v in f.verdicts.iter() {
                    {let (cls, label) = match v.kind { VerdictKind::Ok => ("text-green-800", "Tepat"), VerdictKind::WrongSide => ("text-red-800", "Sisi terbalik"), VerdictKind::WrongAmount => ("text-red-800", "Nominal"), VerdictKind::Extra => ("text-red-800", "Tidak diperlukan"), VerdictKind::Missing => ("text-amber-900", "Belum ada") };
                     rsx! { li { key: "{v.code}", class: "{cls}", b { "{label}" } " · " span { class: "font-mono text-xs", "{v.code}" } " {v.note}" } }}
                }
            }
            if !f.concepts.is_empty() { div { class: "mt-2", div { class: "font-medium", "Kemungkinan kesalahan konsep" }
                ul { class: "list-disc pl-5", for (i, c) in f.concepts.iter().enumerate() { li { key: "{i}", "{c}" } } } } }
        }
    }
}

/// Kompatibilitas: petunjuk (bila diminta) + penanda/catatan.
#[derive(Props, Clone, PartialEq)]
pub struct AidsProps {
    pub kind: ItemKind,
    pub id: String,
    pub topic: String,
    pub lines: Vec<KLine>,
    #[props(default = None)]
    pub calc: Option<String>,
    #[props(default = true)]
    pub hints: bool,
}

#[component]
pub fn StudyAids(props: AidsProps) -> Element {
    rsx! {
        if props.hints { Hints { kind: props.kind, id: props.id.clone(), topic: props.topic.clone(), lines: props.lines.clone(), calc: props.calc.clone() } }
        FlagNote { kind: props.kind, id: props.id.clone() }
    }
}

#[derive(Props, Clone, PartialEq)]
pub struct KeyProps {
    pub kind: ItemKind,
    pub id: String,
    pub revealed: bool,
    pub lines: Vec<KLine>,
    #[props(default = None)]
    pub topic: Option<String>,
    #[props(default = None)]
    pub explain: Option<String>,
    #[props(default = None)]
    pub calc: Option<String>,
    #[props(default = None)]
    pub reason: Option<String>,
    #[props(default = None)]
    pub user_lines: Option<Vec<JournalLine>>,
    #[props(default = None)]
    pub on_adopt: Option<EventHandler<()>>,
}

/// Kunci dan penjelasan: pembungkus KeyReveal + KeyCompare + KeyJournal + StepExplain, seperti halaman versi 1.
#[component]
pub fn KeyBlock(props: KeyProps) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let (kind, id) = (props.kind, props.id.clone());
    let empty = props.lines.is_empty();
    rsx! {
        KeyReveal { revealed: props.revealed, on_reveal: move |_| { let mut s = app.write(); s.st.revealed.push(item_key(kind, &id)); s.changed(); }, on_adopt: props.on_adopt, report: Some((props.kind, props.id.clone())),
            if empty { p { "Tidak ada jurnal untuk peristiwa ini." } }
            else {
                if let Some(u) = props.user_lines.clone() { KeyCompare { lines: u, key_lines: props.lines.clone() } }
                KeyJournal { lines: props.lines.clone() }
            }
            StepExplain { lines: props.lines.clone(), topic: props.topic.clone(), explain: props.explain.clone(), calc: props.calc.clone(), reason: props.reason.clone() }
        }
    }
}

/// Susun laporan soal keliru: simpan ke berkas lokal dan salin ke papan klip untuk ditempel di GitHub.
fn build_report(s: &Session, kind: ItemKind, id: &str) -> String {
    let d = dekri_core::data::data();
    let fmt = |ls: &[JournalLine]| {
        ls.iter()
            .filter(|l| l.code.is_some())
            .map(|l| {
                format!(
                    "  {} | D {} | K {}",
                    l.code.clone().unwrap_or_default(),
                    format_rupiah(l.debit, false),
                    format_rupiah(l.credit, false)
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };
    let (judul, user, kunci) = match kind {
        ItemKind::Txn => {
            let t = d.transactions.iter().find(|t| t.no.to_string() == id);
            let k = d.key.readable_txn.iter().find(|k| k.no.to_string() == id);
            (
                t.map(|t| {
                    format!(
                        "Transaksi {} - {}\nNarasi: {}\nInfo: {}",
                        t.no, t.topic, t.narrative, t.amount_info
                    )
                })
                .unwrap_or_default(),
                s.st.journal.get(id).map(|l| fmt(l)).unwrap_or_default(),
                k.map(|k| {
                    k.lines
                        .iter()
                        .map(|l| {
                            format!(
                                "  {} | D {} | K {}",
                                l.code,
                                format_rupiah(l.debit, false),
                                format_rupiah(l.credit, false)
                            )
                        })
                        .collect::<Vec<_>>()
                        .join("\n")
                })
                .unwrap_or_default(),
            )
        }
        ItemKind::Adj => {
            let a = d.adjustments.iter().find(|a| a.code == id);
            let k = d.key.readable_adj.iter().find(|k| k.code == id);
            (
                a.map(|a| {
                    format!(
                        "Penyesuaian {} - {}\nFakta: {}",
                        a.code, a.category, a.facts
                    )
                })
                .unwrap_or_default(),
                s.st.adjusting.get(id).map(|l| fmt(l)).unwrap_or_default(),
                k.map(|k| {
                    k.lines
                        .iter()
                        .map(|l| {
                            format!(
                                "  {} | D {} | K {}",
                                l.code,
                                format_rupiah(l.debit, false),
                                format_rupiah(l.credit, false)
                            )
                        })
                        .collect::<Vec<_>>()
                        .join("\n")
                })
                .unwrap_or_default(),
            )
        }
        _ => (
            format!("Soal {} {}", item_key(kind, id), ""),
            String::new(),
            String::new(),
        ),
    };
    let note =
        s.st.notes
            .get(&item_key(kind, id))
            .cloned()
            .unwrap_or_default();
    format!(
        "Laporan soal/kunci keliru - DEKRi Lab {}\n{}\n\nJawaban saya:\n{}\n\nKunci di aplikasi:\n{}\n\nYang menurut saya keliru (mohon diisi):\n{}\n",
        env!("CARGO_PKG_VERSION"),
        judul,
        if user.is_empty() { "  (kosong)".to_string() } else { user },
        if kunci.is_empty() { "  (tanpa jurnal)".to_string() } else { kunci },
        note
    )
}

#[component]
pub fn ReportButton(kind: ItemKind, id: String) -> Element {
    let mut app = use_context::<Signal<Session>>();
    rsx! {
        button { class: "btn", title: "Simpan laporan ke berkas dan salin ke papan klip", onclick: move |_| {
            let mut s = app.write();
            let text = build_report(&s, kind, &id);
            let dir = s.paths.data_dir.join("laporan");
            let _ = std::fs::create_dir_all(&dir);
            let name = format!("laporan-{}-{}.txt", item_key(kind, &id).replace(':', "-"), chrono::Local::now().format("%Y%m%d-%H%M%S"));
            let path = dir.join(&name);
            let saved = std::fs::write(&path, &text).is_ok();
            let js = format!("navigator.clipboard&&navigator.clipboard.writeText({})", serde_json::to_string(&text).unwrap_or_default());
            let _ = document::eval(&js);
            s.say(if saved { format!("Laporan disalin dan disimpan di {}. Tempel di {}", path.display(), crate::pengaturan::FEEDBACK_URL) } else { "Laporan disalin ke papan klip. Tempel di GitHub.".to_string() });
        }, "Laporkan soal ini" }
    }
}

/// Riwayat jawaban: salinan tiap kali Periksa ditekan, bisa dipulihkan.
#[component]
pub fn Riwayat(kind: ItemKind, id: String) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let key = item_key(kind, &id);
    let snaps: Vec<(String, Vec<JournalLine>)> = app
        .read()
        .st
        .extra
        .get("riwayat")
        .and_then(|r| r.get(&key))
        .and_then(|a| a.as_array())
        .map(|a| {
            a.iter()
                .rev()
                .filter_map(|e| {
                    let t = e["t"]
                        .as_str()?
                        .chars()
                        .take(16)
                        .collect::<String>()
                        .replace('T', " ");
                    let ls: Vec<JournalLine> = serde_json::from_value(e["lines"].clone()).ok()?;
                    Some((t, ls))
                })
                .collect()
        })
        .unwrap_or_default();
    if snaps.is_empty() {
        return rsx! {};
    }
    let n = snaps.len();
    rsx! {
        details { class: "mt-3 rounded-md border border-slate-200 p-2 text-sm",
            summary { class: "cursor-pointer select-none font-medium", "Riwayat jawaban ({n})" }
            p { class: "mt-1 text-xs text-slate-500", "Salinan jawaban setiap kali Anda menekan Periksa (waktu UTC). Memulihkan menimpa isian saat ini; Urungkan (Ctrl+Z) masih bisa membatalkan." }
            ul { class: "mt-1 space-y-1",
                for (i, (t, ls)) in snaps.iter().cloned().enumerate() {
                    {let total: f64 = ls.iter().map(|l| l.debit).sum(); let sum = format!("{} baris · debit {}", ls.len(), format_rupiah(total, false)); let id = id.clone();
                    rsx! { li { key: "{i}", class: "flex flex-wrap items-center gap-2",
                        span { class: "font-mono text-xs", "{t}" } span { class: "text-xs text-slate-600", "{sum}" }
                        button { class: "btn text-xs", onclick: move |_| {
                            let mut s = app.write();
                            let fresh: Vec<JournalLine> = ls.iter().map(|l| JournalLine { id: crate::components::blank_line().id, ..l.clone() }).collect();
                            if kind == ItemKind::Txn { s.st.journal.insert(id.clone(), fresh); } else { s.st.adjusting.insert(id.clone(), fresh); }
                            s.bufs.clear();
                            s.changed();
                            s.say("Jawaban dipulihkan.");
                        }, "Pulihkan" } } }}
                }
            }
        }
    }
}
