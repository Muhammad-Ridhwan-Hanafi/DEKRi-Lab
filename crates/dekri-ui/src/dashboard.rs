//! Dashboard (padanan pages/Dashboard.tsx versi 1).
use crate::session::{Page, Session};
use crate::shell::Icon;
use crate::widgets::*;
use dekri_core::activity::{daily_activity, streak, weekly_accuracy};
use dekri_core::checks::run_checks;
use dekri_core::data::data;
use dekri_core::derive::*;
use dekri_core::learning::*;
use dekri_core::ledger::tb_totals;
use dekri_core::review::{due_reviews, today_str};
use dekri_core::weakness::{reason_tip, weakness_report};
use dioxus::prelude::*;

struct Row {
    label: &'static str,
    href: &'static str,
    cat: &'static str,
    tone: Tone,
    sum: Summary,
}

#[component]
pub fn Dashboard() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let d = data();
    let s = app.read();
    let c = s.ctx();
    let defs: [(ItemKind, &str, &str, &str, Tone); 8] = [
        (
            ItemKind::Ana,
            "Analisis transaksi",
            "transaksi",
            "Pencatatan",
            Tone::Lilac,
        ),
        (
            ItemKind::Txn,
            "Jurnal umum (147 transaksi)",
            "transaksi",
            "Pencatatan",
            Tone::Lilac,
        ),
        (
            ItemKind::Adj,
            "Jurnal penyesuaian",
            "penyesuaian",
            "Penyesuaian",
            Tone::Lime,
        ),
        (
            ItemKind::Clo,
            "Jurnal penutup",
            "penutup",
            "Penutupan",
            Tone::Blush,
        ),
        (
            ItemKind::Rev,
            "Jurnal pembalik",
            "penutup",
            "Penutupan",
            Tone::Blush,
        ),
        (
            ItemKind::Cor,
            "Jurnal koreksi",
            "koreksi",
            "Koreksi",
            Tone::Aqua,
        ),
        (
            ItemKind::Err,
            "Deteksi kesalahan",
            "koreksi",
            "Koreksi",
            Tone::Aqua,
        ),
        (
            ItemKind::Sc,
            "Soal skenario",
            "skenario",
            "Evaluasi",
            Tone::Lime,
        ),
    ];
    let rows: Vec<Row> = defs
        .iter()
        .map(|(k, l, h, cat, t)| Row {
            label: l,
            href: h,
            cat,
            tone: *t,
            sum: summarize(&s.st, *k, &c),
        })
        .collect();
    let worked: usize = rows.iter().map(|r| r.sum.worked).sum();
    let correct: usize = rows.iter().map(|r| r.sum.correct).sum();
    let total_items: usize = rows.iter().map(|r| r.sum.total).sum();
    let acc = if worked > 0 {
        correct as f64 / worked as f64
    } else {
        0.0
    };
    let progress = if total_items > 0 {
        correct as f64 / total_items as f64
    } else {
        0.0
    };
    let statuses = module_statuses(&s.st.learning, &practice_map(&s.st, &c));
    let overall = overall_percent(&statuses);
    let modules_done = statuses
        .iter()
        .filter(|m| m.status == LearnStatus::Completed)
        .count();
    let next_mod = recommend(&statuses).map(|n| {
        (
            n.module.id.to_string(),
            n.module.no.to_string(),
            n.module.title.to_string(),
        )
    });
    let due = due_reviews(&s.st, &today_str());
    let (weak, reasons) = weakness_report(&s.st, &c);
    // peta konsep: per topik transaksi (total, benar, salah, soal pertama yang belum benar)
    let heat: Vec<(String, u32, u32, u32, Option<u32>)> = {
        let mut m: Vec<(String, u32, u32, u32, Option<u32>)> = vec![];
        for k in d.key.readable_txn.iter().filter(|k| !k.lines.is_empty()) {
            let r = result_for(&s.st, ItemKind::Txn, &k.no.to_string(), &c);
            let i = match m.iter().position(|x| x.0 == k.topic) {
                Some(i) => i,
                None => {
                    m.push((k.topic.clone(), 0, 0, 0, None));
                    m.len() - 1
                }
            };
            m[i].1 += 1;
            match r.shown {
                Some(dekri_core::grade::Status::Benar) => m[i].2 += 1,
                Some(dekri_core::grade::Status::Periksa) => {
                    m[i].3 += 1;
                    m[i].4.get_or_insert(k.no);
                }
                _ => {
                    m[i].4.get_or_insert(k.no);
                }
            }
        }
        m.sort_by(|a, b| {
            (b.3, b.1 - b.2)
                .cmp(&(a.3, a.1 - a.2))
                .then_with(|| a.0.cmp(&b.0))
        });
        m
    };
    let next = d
        .transactions
        .iter()
        .find(|t| {
            result_for(&s.st, ItemKind::Txn, &t.no.to_string(), &c).shown
                != Some(dekri_core::grade::Status::Benar)
        })
        .map(|t| (t.no, t.topic.clone()));
    let today = chrono::Local::now().date_naive();
    let days = daily_activity(&s.st.log, 14, today);
    let weeks = weekly_accuracy(&s.st.log, 4, today);
    let run = streak(&s.st.log, today);
    let attempts14: usize = days.iter().map(|x| x.attempts as usize).sum();
    let (pre_d, pre_c) = tb_totals(&c.report.tb, dekri_core::ledger::Stage::Pre);
    let (adj_d, adj_c) = tb_totals(&c.report.tb, dekri_core::ledger::Stage::Adjusted);
    let checks = run_checks(c.report, &s.st.closing);
    let checks_ok = checks.iter().filter(|x| x.ok).count();
    let empty = !c.has_entries;
    let stage = |ok: bool| {
        if empty {
            "— belum ada jurnal".to_string()
        } else if ok {
            "Seimbang".into()
        } else {
            "TIDAK seimbang".into()
        }
    };
    let hour = {
        use chrono::Timelike;
        chrono::Local::now().hour()
    };
    let greet = match hour {
        0..=10 => "Selamat pagi",
        11..=14 => "Selamat siang",
        15..=17 => "Selamat sore",
        _ => "Selamat malam",
    };
    let user = s.user.clone().unwrap_or_default();
    let max_att = days.iter().map(|x| x.attempts).max().unwrap_or(0).max(1) as f64;
    let stage_status = |r: &Row| {
        if r.sum.total > 0 && r.sum.correct == r.sum.total {
            "Selesai".to_string()
        } else if r.sum.worked + r.sum.pending == 0 {
            "Belum dimulai".to_string()
        } else {
            format!("{} dari {} diperiksa", r.sum.worked, r.sum.total)
        }
    };

    let mut ach: Vec<(Tone, String, String)> = vec![];
    if correct >= 1 {
        ach.push((
            Tone::Lilac,
            "Jawaban benar pertama".into(),
            format!("{correct} soal benar sejauh ini"),
        ));
    }
    if correct >= 25 {
        ach.push((
            Tone::Lime,
            "25 jawaban benar".into(),
            format!("{correct} soal benar sejauh ini"),
        ));
    }
    let done_stages: Vec<&str> = rows
        .iter()
        .filter(|r| r.sum.total > 0 && r.sum.correct == r.sum.total)
        .map(|r| r.label)
        .collect();
    if !done_stages.is_empty() {
        ach.push((
            Tone::Aqua,
            "Satu tahap tuntas".into(),
            done_stages.join(", "),
        ));
    }
    if modules_done > 0 {
        ach.push((
            Tone::Blush,
            "Materi pertama selesai".into(),
            format!("{modules_done} dari {} materi selesai", statuses.len()),
        ));
    }
    if run >= 3 {
        ach.push((
            Tone::Lime,
            format!("Berlatih {run} hari berturut-turut"),
            "Dihitung dari log percobaan".into(),
        ));
    }

    let pre_v = stage(pre_d == pre_c);
    let adj_v = stage(adj_d == adj_c);
    drop(s);

    let go = move |href: String| move |_| app.write().go(&href);
    let bars = |r: &Row| {
        let e = r.sum.total.saturating_sub(r.sum.worked + r.sum.pending);
        vec![
            (r.sum.correct, "bg-emerald-600", "benar"),
            (r.sum.review, "bg-amber-500", "perlu diperiksa"),
            (r.sum.pending, "bg-blue-500", "menunggu periksa"),
            (e, "bg-slate-200", "kosong"),
        ]
    };

    rsx! {
        div { class: "ap-stagger space-y-5",
            Onboarding {}
            section { class: "card card-featured relative overflow-hidden bg-[var(--tag-lilac-bg)] !p-6",
                span { class: "pointer-events-none absolute -right-8 -top-10 size-36 rounded-full border-2 border-slate-900 bg-[var(--tag-lime-bg)] opacity-80" }
                div { class: "relative flex flex-wrap items-center gap-6",
                    div { class: "min-w-0 flex-1 basis-80",
                        div { class: "eyebrow", "{greet}", if !user.is_empty() { ", {user}" } }
                        h2 { class: "mt-1 text-4xl font-extrabold leading-tight tracking-tight text-slate-900", "Lanjutkan pembelajaran Anda" }
                        if let Some((no, topic)) = next.clone() {
                            p { class: "mt-2 text-sm text-slate-700", "Langkah berikutnya: " b { class: "font-semibold", "Transaksi {no}" } " — {topic}. Isi jurnalnya, lalu tekan Periksa untuk melihat letak salahnya." }
                        } else {
                            p { class: "mt-2 text-sm text-slate-700", "Semua transaksi sudah dikerjakan. Perbaiki yang masih salah atau lanjut ke tahap penyesuaian." }
                        }
                        div { class: "mt-4 flex flex-wrap items-center gap-3",
                            if let Some((no, _)) = next.clone() {
                                button { class: "btn btn-primary h-11 px-6 text-base", onclick: go(format!("transaksi/{no}")), "Lanjutkan: transaksi {no} " Icon { name: "arrow", size: 17 } }
                            } else {
                                button { class: "btn btn-primary h-11 px-6 text-base", onclick: go("penyesuaian".into()), "Lanjut ke penyesuaian " Icon { name: "arrow", size: 17 } }
                            }
                            button { class: "btn h-11 px-5", onclick: go("latihan".into()), "Latihan hari ini" if !due.is_empty() { " ({due.len()} ulangan)" } }
                        }
                    }
                    div { class: "card card-stat relative flex items-center gap-4 !p-4", title: "Soal yang sudah dijawab benar dibanding seluruh soal di semua tahap.",
                        Ring { value: progress, label: "Kemajuan", size: 88 }
                        div {
                            div { class: "t-label", "Kemajuan belajar" }
                            div { class: "text-4xl font-extrabold tracking-tight tabular-nums text-slate-900", "{pct(progress)}" }
                            div { class: "text-xs text-slate-600", "{correct} dari {total_items} soal benar" }
                        }
                    }
                }
            }

            dl { class: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
                div { class: "card card-stat tag-lilac", dt { class: "eyebrow !text-inherit", "Soal diperiksa" } dd { class: "mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-slate-900", "{worked}" } dd { class: "text-xs font-medium text-slate-700", "dari {total_items} soal tersedia" } }
                div { class: "card card-stat tag-aqua", title: "Benar dibagi diperiksa. Soal yang kuncinya dibuka tidak dihitung.",
                    dt { class: "eyebrow !text-inherit", "Akurasi jawaban" }
                    dd { class: "mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-slate-900", if worked > 0 { "{pct(acc)}" } else { "—" } }
                    dd { class: "text-xs font-medium text-slate-700", "{correct} benar dari {worked} diperiksa" } }
                div { class: if due.is_empty() { "card card-stat tag-lime" } else { "card card-stat tag-blush" },
                    dt { class: "eyebrow !text-inherit", "Perlu diulas" }
                    dd { class: "mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-slate-900", "{due.len()}" }
                    dd { class: "text-xs font-medium text-slate-700", if due.is_empty() { "tidak ada yang tertunda" } else { "siap dikerjakan ulang hari ini" } } }
                div { class: "card card-stat", dt { class: "eyebrow", "Aktivitas 14 hari" } dd { class: "mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-slate-900", "{attempts14}" } dd { class: "text-xs font-medium text-slate-600", "percobaan jawaban · streak {run} hari" } }
            }

            div {
                h2 { class: "mb-3", "Progres siklus akuntansi" }
                ul { class: "grid gap-3 md:grid-cols-2 2xl:grid-cols-4",
                    for r in rows.iter() {
                        li { key: "{r.label}",
                            button { class: "card card-interactive block h-full w-full !p-4 text-left", onclick: go(r.href.to_string()),
                                span { class: "mb-2 flex items-center justify-between gap-2",
                                    Tag { tone: r.tone, "{r.cat}" }
                                    if r.sum.total > 0 && r.sum.correct == r.sum.total { DoneMark {} }
                                }
                                span { class: "block text-sm font-medium text-slate-900", "{r.label}" }
                                span { class: "mb-2 mt-0.5 block text-xs text-slate-500", "{stage_status(r)}" }
                                StackedBar { total: r.sum.total, parts: bars(r) }
                            }
                        }
                    }
                }
            }

            div { class: "grid gap-5 xl:grid-cols-2",
                div { class: "card space-y-3",
                    div { class: "flex flex-wrap items-baseline justify-between gap-2",
                        h2 { "Jalur Belajar" }
                        div { class: "text-sm text-slate-600", "{modules_done} dari {statuses.len()} materi selesai · {overall}%" }
                    }
                    Meter { percent: overall as f64, label: format!("Kemajuan jalur belajar {overall} persen") }
                    if let Some((id, no, title)) = next_mod {
                        button { class: "btn btn-primary", onclick: go(format!("belajar/{id}")), "Materi berikutnya: {no}. {title} " Icon { name: "arrow", size: 16 } }
                    } else {
                        span { class: "text-sm text-emerald-800", "Seluruh materi selesai." }
                    }
                }
                section { class: "card",
                    h2 { class: "mb-3", "Pencapaian" }
                    if ach.is_empty() {
                        p { class: "text-sm text-slate-600", "Belum ada pencapaian. Pencapaian muncul di sini setelah Anda benar-benar menyelesaikan sesuatu, misalnya satu jurnal yang diperiksa BENAR." }
                    } else {
                        ul { class: "grid gap-2 sm:grid-cols-2",
                            for (t, title, detail) in ach { Achievement { key: "{title}", tone: t, title, detail } }
                        }
                    }
                }
            }

            div { class: "grid gap-5 xl:grid-cols-2",
                div { class: "card",
                    h2 { class: "mb-2", "Ulasan hari ini " if !due.is_empty() { span { class: "text-sm font-normal text-slate-500", "({due.len()})" } } }
                    if due.is_empty() {
                        p { class: "text-sm text-slate-600", "Tidak ada yang perlu diulas. Soal yang pernah salah dijadwalkan kembali otomatis ({dekri_core::review::schedule_text()} setelah Anda menjawab benar)." }
                    } else {
                        ul { class: "divide-y divide-slate-200 text-sm",
                            for it in due.iter().take(8) {
                                {let href = match it.kind { ItemKind::Adj => format!("penyesuaian/{}", it.id), ItemKind::Sc => "skenario".to_string(), _ => format!("transaksi/{}", it.id) };
                                 let name = match it.kind { ItemKind::Txn => "Transaksi", ItemKind::Adj => "Penyesuaian", _ => "Skenario" };
                                 rsx! { li { key: "{it.id}", class: "flex items-center justify-between gap-2 py-2",
                                    span { "{name} {it.id} " span { class: "text-xs text-slate-500", "· tahap {it.box_ + 1}" } }
                                    button { class: "btn text-xs", onclick: go(href), "Buka →" }
                                } }}
                            }
                        }
                    }
                }
                div { class: "card",
                    h2 { class: "mb-2", "Titik lemah" }
                    if weak.is_empty() {
                        div { class: "space-y-2",
                            p { class: "text-sm text-slate-600", "Belum ada topik yang sering salah. Bagian ini terisi setelah Anda menekan Periksa pada beberapa soal." }
                            button { class: "btn", onclick: go("transaksi".into()), "Buka Transaksi" }
                        }
                    } else {
                        div { class: "space-y-4",
                            ul { class: "divide-y divide-slate-200 text-sm",
                                for t in weak.iter().take(6) {
                                    li { key: "{t.topic}", class: "py-2", b { class: "font-medium", "{t.topic}" } br {}
                                        span { class: "text-xs text-slate-600", "{t.wrong} dari {t.worked} masih salah" } }
                                }
                            }
                            ul { class: "divide-y divide-slate-200 text-sm",
                                for r in reasons.iter() {
                                    {let tip = reason_tip(r.reason); rsx! { li { class: "py-2", b { class: "font-medium", "{tip.map(|t| t.0).unwrap_or(\"Lainnya\")}" } " · {r.count} item"
                                        if let Some((_, t)) = tip { div { class: "text-xs text-slate-600", "{t}" } } } }}
                                }
                            }
                        }
                    }
                }
            }

            div { class: "card",
                h2 { class: "mb-1", "Peta konsep" }
                p { class: "mb-2 text-xs text-slate-600", "Tiap kotak satu jenis transaksi: " span { class: "rounded bg-red-300 px-1", "ada yang salah" } " " span { class: "rounded bg-amber-200 px-1", "sebagian" } " " span { class: "rounded bg-emerald-300 px-1", "benar semua" } " " span { class: "rounded bg-slate-200 px-1", "belum dikerjakan" } ". Klik untuk membuka soal berikutnya pada jenis itu." }
                div { class: "flex flex-wrap gap-1",
                    for (topic, total, benar, salah, first) in heat.iter().cloned() {
                        {let cls = if salah > 0 { "bg-red-300" } else if benar == total { "bg-emerald-300" } else if benar > 0 { "bg-amber-200" } else { "bg-slate-200" };
                         let tip = format!("{topic}: {benar} benar, {salah} salah, dari {total}");
                         let href = format!("transaksi/{}", first.unwrap_or(1));
                         rsx! { button { key: "{topic}", title: "{tip}", class: "rounded-md border border-slate-900 px-2 py-1 text-left text-xs transition-transform hover:-translate-y-px {cls}", onclick: go(href), "{topic}" } }}
                    }
                }
            }

            div { class: "card",
                div { class: "mb-2 flex flex-wrap items-baseline justify-between gap-2",
                    h2 { "Aktivitas 14 hari" }
                    span { class: "text-sm text-slate-600", "{attempts14} percobaan · streak {run} hari" }
                }
                if s_log_empty(app) {
                    p { class: "text-sm text-slate-500", "Belum ada percobaan tercatat. Tekan Periksa pada sebuah soal dan grafik akan muncul di sini." }
                } else {
                    div { class: "flex h-20 items-end gap-1",
                        for x in days.iter() {
                            div { key: "{x.day}", class: "flex h-full flex-1 flex-col justify-end", title: "{x.day}: {x.correct}/{x.attempts} benar",
                                div { class: "rounded-t-sm bg-blue-200", style: "height:{(x.attempts - x.correct) as f64 / max_att * 100.0}%" }
                                div { class: "bg-emerald-600", style: "height:{x.correct as f64 / max_att * 100.0}%" }
                            }
                        }
                    }
                    div { class: "mt-3 text-sm",
                        span { class: "text-slate-500", "Akurasi mingguan: " }
                        for w in weeks.iter() {
                            span { key: "{w.label}", class: "mr-3 whitespace-nowrap", "{w.label}: " b { "{w.accuracy.map(pct).unwrap_or(\"—\".into())}" } }
                        }
                    }
                }
            }

            div { class: "card",
                h2 { class: "mb-2", "Status tahapan siklus akuntansi" }
                ul { class: "divide-y divide-slate-200 text-sm",
                    StageRow { label: "Neraca saldo sebelum penyesuaian (09)".to_string(), value: pre_v }
                    StageRow { label: "Neraca saldo setelah penyesuaian (11)".to_string(), value: adj_v }
                    StageRow { label: "Pemeriksaan antar-laporan (23)".to_string(), value: format!("{checks_ok} dari {} konsisten", checks.len()) }
                }
            }
        }
    }
}

fn s_log_empty(app: Signal<Session>) -> bool {
    app.read().st.log.is_empty()
}

#[component]
fn StageRow(label: String, value: String) -> Element {
    let bad = value.contains("TIDAK") || value.contains("selisih");
    let good = value == "Seimbang";
    rsx! {
        li { class: "flex items-center justify-between gap-3 py-2",
            span { class: "text-slate-600", "{label}:" }
            b { class: if bad { "flex items-center gap-1 font-medium text-red-700" } else { "flex items-center gap-1 font-medium text-slate-800" },
                if good { Icon { name: "check", size: 16, class: "text-emerald-600" } }
                if bad { Icon { name: "alert", size: 16 } }
                "{value}"
            }
        }
    }
}

/// Panduan singkat untuk pemakaian pertama; hilang permanen setelah ditutup (padanan Onboarding.tsx).
#[component]
fn Onboarding() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut open = use_signal(|| false);
    let slug = app
        .read()
        .user
        .clone()
        .unwrap_or_default()
        .to_lowercase()
        .replace(['\'', '"', '\\'], "");
    let key = format!("akuntansi-practice:onboarded:{slug}");
    let k2 = key.clone();
    use_effect(move || {
        let mut ev = document::eval(&format!(
            "try{{dioxus.send(localStorage.getItem('{k2}')==='1')}}catch(e){{dioxus.send(true)}}"
        ));
        spawn(async move {
            if let Ok(seen) = ev.recv::<bool>().await {
                open.set(!seen);
            }
        });
    });
    if !*open.read() {
        return rsx! {};
    }
    let mut close = {
        let key = key.clone();
        move || {
            let _ = document::eval(&format!(
                "try{{localStorage.setItem('{key}','1')}}catch(e){{}}"
            ));
            open.set(false);
        }
    };
    let mut close2 = close.clone();
    rsx! {
        section { class: "card no-print mb-1 bg-[var(--tag-lime-bg)] !p-4", "aria-label": "Panduan awal",
            div { class: "flex flex-wrap items-start justify-between gap-3",
                div {
                    div { class: "eyebrow !text-[var(--tag-lime-fg)]", "Mulai di sini" }
                    h2 { class: "text-xl", "Selamat datang" }
                }
                div { class: "flex gap-2",
                    button { class: "btn btn-primary", onclick: move |_| { close2(); let mut s = app.write(); s.page = Page::Belajar; s.nonce += 1; }, "Buka Jalur Belajar" }
                    button { class: "btn", onclick: move |_| close(), "Tutup panduan" }
                }
            }
            ol { class: "mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4",
                li { class: "flex gap-2", b { class: "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-900 bg-white text-xs", "1" } span { "Mulai dari " b { "Jalur Belajar" } ": 13 materi berurutan dengan kuis dan latihan." } }
                li { class: "flex gap-2", b { class: "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-900 bg-white text-xs", "2" } span { "Kerjakan jurnal di " b { "Transaksi" } "; Periksa menilai jawaban dan menjelaskan letak salahnya." } }
                li { class: "flex gap-2", b { class: "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-900 bg-white text-xs", "3" } span { "Pekerjaan tersimpan otomatis di perangkat ini. Ekspor cadangan dari " b { "Pengaturan" } " secara berkala." } }
                li { class: "flex gap-2", b { class: "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-slate-900 bg-white text-xs", "4" } span { "Tekan " kbd { "?" } " untuk melihat pintasan keyboard." } }
            }
        }
    }
}
