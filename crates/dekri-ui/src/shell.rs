//! Layar masuk, sidebar, dan bilah atas (padanan App.tsx dan LoginScreen.tsx versi 1).
use crate::brand::*;
use crate::icons;
use crate::pages::PageView;
use crate::session::{Page, Session};
use dekri_core::derive::{summarize, ItemKind};
use dioxus::prelude::*;

#[component]
pub fn Icon(
    name: String,
    #[props(default = 20)] size: u32,
    #[props(default = String::new())] class: String,
) -> Element {
    let d = icons::path(&name);
    rsx! {
        svg {
            width: "{size}", height: "{size}", view_box: "0 0 24 24", fill: "none", stroke: "currentColor",
            stroke_width: "1.8", stroke_linecap: "round", stroke_linejoin: "round", class: "shrink-0 {class}",
            path { d: "{d}" }
        }
    }
}

#[component]
pub fn BrandIcon(#[props(default = "size-9".to_string())] class: String) -> Element {
    rsx! {
        svg { class: "{class}", view_box: "0 0 100 100", fill: "none",
            rect { x: "2", y: "2", width: "96", height: "96", rx: "22", fill: "#ffffff", stroke: "#1a0e69", stroke_width: "4" }
            svg { x: "17", y: "18", width: "66", height: "64", view_box: MARK_VIEWBOX, preserve_aspect_ratio: "xMidYMid meet",
                path { d: MARK_PURPLE, fill: "#5229fc" }
                path { d: MARK_INDIGO, fill: "#2811a0" }
                path { d: MARK_NAVY, fill: "#1a0e69" }
                path { d: MARK_LIME, fill: "#c8e968" }
            }
        }
    }
}

#[component]
pub fn BrandLogo(#[props(default = "h-10 w-auto".to_string())] class: String) -> Element {
    rsx! {
        svg { class: "{class}", view_box: LOGO_VIEWBOX, fill: "none", role: "img", "aria-label": "DEKRi Lab",
            path { d: MARK_PURPLE, fill: "#5229fc" }
            path { d: MARK_INDIGO, fill: "var(--dk-indigo, #2811a0)" }
            path { d: MARK_NAVY, fill: "var(--dk-navy, #1a0e69)" }
            path { d: MARK_LIME, fill: "#c8e968" }
            path { d: TEXT_NAVY, fill: "var(--dk-navy, #1a0e69)" }
            path { d: TEXT_LIME, fill: "#c8e968" }
            path { d: TEXT_LAB, fill: "var(--dk-lab, #2e0fce)" }
        }
    }
}

/// Splash startup (padanan StartupSplash.tsx): tampil minimal 1,1 dtk, memudar 300 ms.
#[component]
pub fn StartupSplash() -> Element {
    let mut phase = use_signal(|| 1u8);
    use_future(move || async move {
        tokio::time::sleep(std::time::Duration::from_millis(1100)).await;
        phase.set(2);
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        phase.set(0);
    });
    let p = *phase.read();
    if p == 0 {
        return rsx! {};
    }
    rsx! {
        div { class: "ap-splash", "data-splash": true, "data-leaving": if p == 2 { "true" } else { "false" }, role: "status", "aria-live": "polite", "aria-label": "DEKRi Lab sedang dimuat",
            div { class: "ap-splash__content",
                span { class: "ap-splash__shape ap-splash__shape--a" }
                span { class: "ap-splash__shape ap-splash__shape--b" }
                span { class: "ap-splash__shape ap-splash__shape--c" }
                span { class: "ap-splash__shape ap-splash__shape--d" }
                div { class: "ap-splash__card", BrandLogo { class: "ap-splash__mark" } }
                div { class: "ap-splash__tagline", "Belajar • Berlatih • Menguasai Akuntansi" }
                div { class: "ap-splash__progress", role: "progressbar", "aria-label": "Memuat aplikasi", "aria-busy": "true", span { class: "ap-splash__bar" } }
                div { class: "ap-splash__status", "Menyiapkan workspace..." }
            }
        }
    }
}

fn initials(name: &str) -> String {
    let parts: Vec<&str> = name.split_whitespace().collect();
    let a = parts.first().and_then(|p| p.chars().next()).unwrap_or('?');
    let b = if parts.len() > 1 {
        parts.last().and_then(|p| p.chars().next())
    } else {
        None
    };
    format!("{}{}", a, b.map(String::from).unwrap_or_default()).to_uppercase()
}

fn name_error(raw: &str) -> Option<String> {
    let n = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    let len = n.chars().count();
    if len < 2 {
        return Some("Nama minimal 2 karakter.".into());
    }
    if len > 30 {
        return Some("Nama maksimal 30 karakter.".into());
    }
    if !n
        .chars()
        .all(|c| c.is_alphanumeric() || " .'_-".contains(c))
    {
        return Some(
            "Gunakan huruf, angka, spasi, titik, apostrof, garis bawah, atau tanda hubung.".into(),
        );
    }
    None
}

#[component]
pub fn LoginScreen() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut name = use_signal(String::new);
    let mut error = use_signal(|| None::<String>);
    let recent: Vec<String> = app.read().users.recent.clone();
    let mut submit = move |raw: String| match name_error(&raw) {
        Some(e) => error.set(Some(e)),
        None => app.write().login(Some(raw)),
    };
    let deco = |cls: &str, extra: &str| {
        rsx! {
            span { "aria-hidden": "true", class: "{cls} absolute hidden border-2 border-slate-900 shadow-[4px_4px_0_var(--neo-shadow)] md:block", style: "{extra}" }
        }
    };
    rsx! {
        main { class: "ap-dots relative grid min-h-screen place-items-center overflow-hidden p-6",
            {deco("ap-float left-[11%] top-[13%] size-20 rounded-full bg-[var(--tag-lime-bg)]", "")}
            {deco("ap-spin right-[12%] top-[17%] size-16 rounded-2xl bg-[var(--tag-blush-bg)]", "")}
            {deco("ap-sway bottom-[15%] left-[13%] h-10 w-32 rounded-full bg-[var(--tag-aqua-bg)]", "")}
            {deco("ap-spin-rev bottom-[11%] right-[15%] size-14 rounded-xl bg-[var(--tag-lilac-bg)]", "")}
            {deco("ap-float right-[26%] top-[8%] size-8 rounded-full bg-[var(--tag-blush-bg)]", "animation-delay:-2s")}
            {deco("ap-spin bottom-[30%] left-[6%] size-9 rounded-lg bg-[var(--tag-lime-bg)]", "animation-duration:9s")}
            {deco("ap-sway right-[6%] top-[46%] h-8 w-20 rounded-full bg-[var(--tag-lilac-bg)]", "animation-delay:-3s")}
            div { class: "ap-enter relative w-full max-w-md",
                div { class: "card !p-7",
                    div { class: "flex items-center gap-3",
                        BrandIcon { class: "ap-wiggle size-12 shrink-0" }
                        div {
                            div { class: "eyebrow", "DEKRi Lab" }
                            h1 { class: "page-title leading-tight", "Masuk" }
                        }
                    }
                    p { class: "mt-3 text-sm text-slate-700", "Ketik nama Anda untuk mulai belajar." }
                    form { class: "mt-4 space-y-3", novalidate: true,
                        onsubmit: move |e| { e.prevent_default(); submit(name.read().clone()); },
                        div {
                            label { r#for: "login-name", class: "mb-1 block text-sm font-bold text-slate-900", "Nama pengguna" }
                            input { id: "login-name", class: "w-full", value: "{name}", autofocus: true, autocomplete: "off", spellcheck: false,
                                placeholder: "Contoh: Rina",
                                oninput: move |e| { name.set(e.value()); error.set(None); } }
                            p { class: "mt-1 text-xs text-slate-600", "2–30 karakter. Huruf besar dan kecil dianggap sama." }
                            if let Some(e) = error.read().as_ref() {
                                p { role: "alert", class: "ap-shake mt-1 text-sm font-semibold text-red-700", "{e}" }
                            }
                        }
                        button { r#type: "submit", class: "btn btn-primary h-11 w-full", "Masuk " Icon { name: "arrow", size: 16 } }
                    }
                    if !recent.is_empty() {
                        section { class: "mt-5 border-t-2 border-slate-900 pt-4",
                            h2 { class: "eyebrow mb-2 !text-xs !font-semibold", "Pernah masuk di perangkat ini" }
                            ul { class: "flex flex-wrap gap-2",
                                for n in recent {
                                    li { key: "{n}",
                                        button { r#type: "button", class: "btn !gap-2 !px-3 !py-1",
                                            onclick: { let n = n.clone(); move |_| submit(n.clone()) },
                                            span { class: "tag-lilac flex size-6 items-center justify-center rounded-full text-[11px] font-bold", "{initials(&n)}" }
                                            "{n}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                p { class: "mt-4 text-center text-xs text-slate-700",
                    "Kemajuan belajar disimpan per nama pengguna di perangkat ini. Masuk dengan nama yang sama untuk melanjutkan progres Anda." }
            }
        }
    }
}

/// (halaman, jalur v1, ikon, nama)
const NAV: &[(Page, &str, &str)] = &[
    (Page::Beranda, "dashboard", "Dashboard"),
    (Page::Belajar, "belajar", "Jalur Belajar"),
    (Page::Materi, "materi", "Ringkasan BAB"),
    (Page::Kasus, "kasus", "Kasus"),
    (Page::Transaksi, "transaksi", "Transaksi"),
    (Page::JurnalUmum, "jurnal", "Jurnal Umum"),
    (Page::BukuBesar, "buku-besar", "Buku Besar"),
    (Page::NeracaSaldo, "neraca-saldo", "Neraca Saldo"),
    (Page::Penyesuaian, "penyesuaian", "Penyesuaian"),
    (Page::Laporan, "laporan", "Laporan"),
    (Page::BukuPembantu, "buku-pembantu", "Buku Pembantu"),
    (Page::Penutup, "penutup", "Penutup"),
    (Page::Koreksi, "koreksi", "Koreksi"),
    (Page::Skenario, "skenario", "Skenario"),
    (Page::ArusKas, "analisis", "Arus Kas"),
    (Page::Varian, "varian", "Latihan Varian"),
    (Page::Pajak, "pajak", "Latihan Pajak"),
    (Page::Pemeriksaan, "koreksi", "Pemeriksaan"),
    (Page::Ujian, "ujian", "Ujian"),
    (Page::Latihan, "belajar", "Latihan Hari Ini"),
    (Page::Pengaturan, "pengaturan", "Pengaturan"),
];
const GROUPS: &[(&str, &[Page])] = &[
    ("Ruang kerja", &[Page::Beranda]),
    (
        "Siklus akuntansi",
        &[
            Page::Kasus,
            Page::Transaksi,
            Page::JurnalUmum,
            Page::BukuBesar,
            Page::BukuPembantu,
            Page::NeracaSaldo,
            Page::Penyesuaian,
            Page::Laporan,
            Page::Penutup,
        ],
    ),
    ("Belajar", &[Page::Belajar]),
    (
        "Latihan dan evaluasi",
        &[
            Page::Latihan,
            Page::Koreksi,
            Page::Skenario,
            Page::Varian,
            Page::Pajak,
            Page::Ujian,
        ],
    ),
];

fn nav_of(p: Page) -> (&'static str, &'static str) {
    NAV.iter()
        .find(|(x, _, _)| *x == p)
        .map(|(_, i, n)| (*i, *n))
        .unwrap_or(("dashboard", "Dashboard"))
}

#[component]
fn NavItem(page: Page) -> Element {
    let mut app = use_context::<Signal<Session>>();
    let cur = app.read().page;
    let active = cur == page || (page == Page::Belajar && cur == Page::Materi);
    let (icon, label) = nav_of(page);
    let cls = if active {
        "border-slate-900 bg-[var(--tag-lime-bg)] font-bold text-[var(--tag-lime-fg)] shadow-[2px_2px_0_var(--neo-shadow)]"
    } else {
        "border-transparent text-slate-700 hover:bg-white/80 hover:text-slate-900"
    };
    rsx! {
        li {
            button {
                class: "ap-nav group relative flex w-full items-center gap-3 whitespace-nowrap rounded-lg border-[1.5px] px-3 py-[7px] text-left text-sm transition-[background-color,color,transform] duration-150 {cls}",
                "aria-current": if active { "page" } else { "false" },
                onclick: move |_| app.write().page = page,
                Icon { name: icon, size: 19, class: if active { "" } else { "transition-transform duration-150 group-hover:scale-105" } }
                "{label}"
            }
        }
    }
}

#[component]
pub fn Shell() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let (page, user, _dark, saved, can_undo, can_redo, acc) = {
        let s = app.read();
        let c = s.ctx();
        let acc = summarize(&s.st, ItemKind::Txn, &c).accuracy;
        (
            s.page,
            s.user.clone().unwrap_or_default(),
            s.dark,
            !s.dirty,
            !s.past.is_empty(),
            !s.future.is_empty(),
            acc,
        )
    };
    let focus = app.read().focus;
    // Menu aktif selalu terlihat di sidebar (daftar menu bisa digulir).
    use_effect(move || {
        let _ = app.read().page;
        let _ = document::eval("setTimeout(function(){var a=document.querySelector('#nav-scroll [aria-current=\"page\"]');a&&a.scrollIntoView({block:'nearest'});},60)");
    });
    let title = if page == Page::Materi {
        "Jalur Belajar"
    } else {
        nav_of(page).1
    };
    let acc_txt = acc
        .map(|a| format!("{}%", (a * 100.0).round() as i64))
        .unwrap_or("—".into());
    rsx! {
        div { class: "flex min-h-screen",
            crate::extras::Overlays {}
            a { href: "#konten-utama", class: "no-print sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-blue-700 focus:shadow",
                onclick: move |e| { e.prevent_default(); let _ = document::eval("var m=document.getElementById('konten-utama');m&&m.focus();m&&m.scrollIntoView();"); },
                "Lewati ke konten utama" }
            nav { style: if focus { "display:none" } else { "display:flex" }, class: "no-print sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r-2 border-slate-900 bg-[var(--tag-lilac-bg)]", "aria-label": "Navigasi utama",
                div { class: "flex items-center gap-3 px-4 py-4",
                    BrandIcon { class: "size-9 shrink-0" }
                    span { class: "leading-tight",
                        span { class: "block text-sm font-semibold tracking-tight text-slate-800", "DEKRi Lab" }
                        span { class: "block text-xs font-medium text-slate-700", "Latihan akuntansi" }
                    }
                }
                div { id: "nav-scroll", class: "flex-1 space-y-3.5 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]",
                    for (label, pages) in GROUPS.iter() {
                        div { key: "{label}",
                            div { class: "eyebrow px-3 pb-1", "{label}" }
                            ul { class: "space-y-0.5",
                                for p in pages.iter() { NavItem { key: "{nav_of(*p).1}", page: *p } }
                            }
                        }
                    }
                }
                div { class: "border-t-2 border-slate-900 px-3 py-3",
                    div { class: "flex items-center gap-2.5",
                        span { class: "tag-lime flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 text-sm font-bold", "{initials(&user)}" }
                        span { class: "min-w-0 leading-tight",
                            span { class: "block truncate text-sm font-bold text-slate-900", title: "{user}", "{user}" }
                            button { class: "text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900",
                                onclick: move |_| { let mut s = app.write(); s.save(true); s.logged_in = false; s.users.last = None; },
                                "Ganti pengguna" }
                        }
                    }
                }
                ul { class: "border-t border-slate-300 px-3 py-2", NavItem { page: Page::Pengaturan } }
            }
            main { id: "konten-utama", tabindex: "-1", class: "min-w-0 flex-1 outline-none",
                header { class: "no-print sticky top-0 z-10 flex h-[4.3rem] items-center gap-4 border-b-2 border-slate-900 bg-canvas px-6",
                    div { class: "min-w-0 shrink-0",
                        h1 { class: "page-title leading-tight", "{title}" }
                        div { class: "text-xs text-slate-500", "PT Sumber Cahaya Elektrindo · TA 2024" }
                    }
                    button { onclick: move |_| { let mut s = app.write(); s.search_open = true; s.search_q.clear(); }, title: "Cari halaman, soal, dan akun (Ctrl+K)",
                        class: "flex h-9 min-w-0 max-w-sm flex-1 items-center gap-2 rounded-full border-[1.5px] border-slate-900 bg-white px-4 text-sm text-slate-600 transition-colors duration-150 hover:bg-[var(--tag-lilac-bg)] hover:text-slate-900",
                        Icon { name: "search", size: 17 }
                        span { class: "flex-1 text-left", "Cari…" }
                        kbd { class: "hidden 2xl:inline", "Ctrl+K" }
                    }
                    div { class: "ml-auto flex items-center gap-3 text-sm text-slate-600",
                        div { class: "seg", role: "group", "aria-label": "Alat bantu",
                            button { class: if focus { "btn btn-primary" } else { "btn" }, "aria-pressed": "{focus}", title: "Mode fokus: sembunyikan menu dan perbesar tampilan (Alt+F; Esc untuk keluar)", onclick: move |_| { let mut s = app.write(); s.focus = !s.focus; },
                                Icon { name: "fokus", size: 16 } span { class: "hidden xl:inline", if focus { "Keluar fokus" } else { "Fokus" } } }
                            button { class: "btn", title: "Kalkulator (Alt+C)", onclick: move |_| { let mut s = app.write(); s.calc_open = !s.calc_open; },
                                Icon { name: "kalkulator", size: 16 } span { class: "hidden xl:inline", "Kalkulator" } }
                        }
                        div { class: "seg", role: "group", "aria-label": "Riwayat perubahan",
                            button { class: "btn btn-icon", disabled: !can_undo, title: "Urungkan (Ctrl+Z)", "aria-label": "Urungkan", onclick: move |_| app.write().undo(), Icon { name: "undo", size: 16 } }
                            button { class: "btn btn-icon", disabled: !can_redo, title: "Ulangi (Ctrl+Y)", "aria-label": "Ulangi", onclick: move |_| app.write().redo(), Icon { name: "redo", size: 16 } }
                        }
                        span { class: "badge badge-info", title: "Akurasi jawaban Transaksi yang sudah diperiksa (kunci yang dibuka tidak dihitung)",
                            "Akurasi " b { "{acc_txt}" } }
                        span { class: "flex items-center gap-1 whitespace-nowrap text-xs", role: "status",
                            span { class: if saved { "inline-flex ap-pop text-emerald-600" } else { "inline-flex animate-pulse text-slate-400" }, Icon { name: "check", size: 15 } }
                            span { class: "hidden xl:inline", if saved { "Tersimpan" } else { "Menyimpan…" } }
                        }
                    }
                }
                div { class: "p-6 print:p-0", style: if focus { "zoom:1.15" } else { "zoom:1" },
                    RestoreBanner {}
                    div { class: "ap-enter", PageView { page } }
                }
            }
        }
    }
}

/// Banner: progres kosong tetapi ada cadangan otomatis (mis. setelah data aplikasi terhapus).
#[component]
fn RestoreBanner() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut hidden = use_signal(|| false);
    let mut msg = use_signal(String::new);
    let latest = use_hook(|| {
        let s = app.read();
        dekri_core::backup::info(&s.paths.backup_dir, s.user.as_deref())
            .ok()
            .and_then(|i| i.latest_at)
    });
    let empty = {
        let st = &app.read().st;
        st.journal.is_empty()
            && st.adjusting.is_empty()
            && st.analysis.is_empty()
            && st.scenarios.is_empty()
            && st.revealed.is_empty()
            && st.attempts.is_empty()
    };
    let show = empty && !*hidden.read() && latest.is_some();
    if !show {
        return if msg.read().is_empty() {
            rsx! {}
        } else {
            rsx! { p { role: "status", class: "mb-4 text-sm text-emerald-800", "{msg}" } }
        };
    }
    let when = latest
        .as_deref()
        .map(|t| t.chars().take(16).collect::<String>().replace('T', " "))
        .unwrap_or_default();
    rsx! {
        div { class: "callout callout-info no-print mb-4 flex flex-wrap items-center gap-2", role: "status",
            Icon { name: "alert", size: 18 }
            span { "Progres kosong, tetapi ditemukan cadangan otomatis ({when} UTC)." }
            button { class: "btn btn-primary", onclick: move |_| {
                let mut s = app.write();
                let user = s.user.clone();
                match crate::session::read_latest_backup(&s.paths, user.as_deref()) {
                    Some(st) => { s.st = st; s.bufs.clear(); s.changed(); msg.set("Progres dipulihkan dari cadangan terbaru.".into()); }
                    None => msg.set("Belum ada cadangan.".into()),
                }
            }, "Pulihkan sekarang" }
            button { class: "btn", onclick: move |_| hidden.set(true), "Abaikan" }
        }
    }
}
