//! Pengaturan (padanan Pengaturan.tsx dan DesktopBackup.tsx versi 1).
use crate::components::ConfirmButton;
use crate::extras::ShortcutList;
use crate::session::Session;
use dekri_core::state::{make_backup, parse_backup, UserState};
use dioxus::prelude::*;

pub(crate) const FEEDBACK_URL: &str =
    "https://github.com/Muhammad-Ridhwan-Hanafi/DEKRi-Lab/issues/new?template=soal_salah.yml";

pub fn open_path(p: &std::path::Path) -> bool {
    let prog = if cfg!(windows) {
        "explorer"
    } else if cfg!(target_os = "macos") {
        "open"
    } else {
        "xdg-open"
    };
    std::process::Command::new(prog).arg(p).spawn().is_ok()
}

struct Pending {
    journals: usize,
    adjustments: usize,
    scenarios: usize,
    state: UserState,
}

#[component]
pub fn Pengaturan() -> Element {
    let mut app = use_context::<Signal<Session>>();
    let mut msg = use_signal(|| None::<(bool, String)>);
    let mut pending = use_signal(|| None::<std::rc::Rc<Pending>>);
    let mut confirm = use_signal(String::new);
    let mut copied = use_signal(|| None::<bool>);
    let mut scale = use_signal(|| 100u32);
    use_effect(move || {
        let mut ev = document::eval("try{dioxus.send(Number(localStorage.getItem('akuntansi-practice:scale'))||100)}catch(e){dioxus.send(100)}");
        spawn(async move {
            if let Ok(v) = ev.recv::<u32>().await {
                scale.set(v);
            }
        });
    });
    let s = app.read();
    let state_file = s.paths.state_file.display().to_string();
    let backup_dir = s.paths.backup_dir.display().to_string();
    let pref = s.theme_pref.clone();
    let live = s.st.settings.validation_mode == "live";
    let last_export = s.st.settings.last_export_at.clone();
    let saved = if s.dirty { "menyimpan…" } else { "tersimpan" };
    drop(s);
    let version = env!("CARGO_PKG_VERSION");
    let mut audit_msg = use_signal(|| None::<String>);
    let js_copy = format!("navigator.clipboard && navigator.clipboard.writeText('{FEEDBACK_URL}')");
    let sc = *scale.read();
    let pend = pending.read().clone();
    let m = msg.read().clone();
    rsx! {
        div { class: "grid max-w-5xl gap-4 xl:grid-cols-2 xl:items-start",
            div { class: "space-y-4",
            section { class: "card",
                h2 { class: "t-card mb-2", "Cara penilaian" }
                label { class: "mb-1 flex items-start gap-2 text-sm",
                    input { r#type: "radio", name: "mode", checked: !live, onchange: move |_| { let mut s = app.write(); s.st.settings.validation_mode = "check".into(); s.changed(); } }
                    span { b { "Periksa" } " (bawaan): jawaban dinilai saat tombol Periksa ditekan dan jumlah percobaan dicatat. Cocok untuk belajar karena umpan balik instan membuat menebak terlalu mudah." } }
                label { class: "flex items-start gap-2 text-sm",
                    input { r#type: "radio", name: "mode", checked: live, onchange: move |_| { let mut s = app.write(); s.st.settings.validation_mode = "live".into(); s.changed(); } }
                    span { b { "Langsung" } ": status tampil otomatis setiap kali isian berubah, tanpa menekan tombol Periksa. Percobaan tidak dihitung." } }
            }
            section { class: "card",
                h2 { class: "t-card mb-2", "Tampilan" }
                div { class: "flex flex-wrap gap-4 text-sm",
                    for (v, label) in [("otomatis", "Ikuti sistem"), ("terang", "Terang"), ("gelap", "Gelap")] {
                        label { key: "{v}", class: "flex items-center gap-1",
                            input { r#type: "radio", name: "theme", checked: pref == v, onchange: move |_| app.write().set_theme_pref(v) } " {label}" }
                    }
                }
                p { class: "mt-1 text-xs text-slate-500", "Saat mencetak, tampilan selalu terang." }
                label { class: "mt-3 flex items-center gap-2 text-sm", "Ukuran tampilan"
                    select { "aria-label": "Ukuran tampilan", onchange: move |e| { if let Ok(v) = e.value().parse::<u32>() { scale.set(v); let _ = document::eval(&format!("try{{localStorage.setItem('akuntansi-practice:scale','{v}')}}catch(e){{}};document.documentElement.style.fontSize='{}px'", 16.0 * v as f64 / 100.0)); } },
                        for v in [90u32, 100, 110, 125, 150] { option { key: "{v}", value: "{v}", selected: v == sc, "{v}%" } } } }
            }
            section { class: "card",
                h2 { class: "t-card mb-2", "Pintasan keyboard" }
                ShortcutList {}
            }
            }
            div { class: "space-y-4",
            section { class: "card",
                h2 { class: "t-card mb-2", "Cadangan" }
                p { class: "mb-2 text-sm text-slate-600", "Progres disimpan otomatis di komputer ini ({saved}). Ekspor satu file JSON untuk pindah perangkat atau berjaga-jaga bila data terhapus."
                    if let Some(t) = last_export { " Ekspor terakhir: {t.get(..16).unwrap_or(&t).replace('T', \" \")}." } }
                div { class: "flex flex-wrap items-center gap-2",
                    button { class: "btn btn-primary", onclick: move |_| {
                        let mut s = app.write();
                        let now = chrono::Utc::now();
                        let iso = now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
                        let text = make_backup(&s.st, &iso);
                        let name = format!("akuntansi-backup-{}.json", now.format("%Y-%m-%d"));
                        let target = rfd::FileDialog::new().set_file_name(&name).add_filter("JSON", &["json"]).save_file();
                        if let Some(p) = target {
                            match std::fs::write(&p, text) { Ok(()) => { s.st.settings.last_export_at = Some(iso); s.changed(); msg.set(Some((true, "Cadangan disimpan.".into()))); } Err(e) => msg.set(Some((false, format!("Gagal mengekspor: {e}")))) }
                        }
                    }, "Ekspor cadangan" }
                    button { class: "btn", onclick: move |_| {
                        pending.set(None); msg.set(None);
                        if let Some(p) = rfd::FileDialog::new().add_filter("JSON", &["json"]).pick_file() {
                            match std::fs::read_to_string(&p).map_err(|e| e.to_string()).and_then(|t| parse_backup(&t).map_err(|e| e.0)) {
                                Ok(st) => pending.set(Some(std::rc::Rc::new(Pending { journals: st.journal.len(), adjustments: st.adjusting.len(), scenarios: st.scenarios.len(), state: st }))),
                                Err(e) => msg.set(Some((false, e))),
                            }
                        }
                    }, "Impor cadangan…" }
                }
                if let Some((ok, t)) = m.clone() { p { class: if ok { "mt-2 text-sm text-emerald-700" } else { "mt-2 text-sm text-red-700" }, "{t}" } }
                if let Some(p) = pend.clone() {
                    div { class: "callout callout-warning mt-3",
                        p { "Cadangan berisi {p.journals} transaksi berjurnal, {p.adjustments} penyesuaian, {p.scenarios} jawaban skenario." }
                        p { class: "mt-1 font-medium", "Mengimpor akan MENGGANTI seluruh progres saat ini. Salinan pengaman progres sekarang disimpan lebih dulu di folder cadangan." }
                        div { class: "mt-2 flex gap-2",
                            button { class: "btn btn-danger", onclick: { let p = p.clone(); move |_| { let mut s = app.write(); s.save(true); s.st = p.state.clone(); s.bufs.clear(); s.changed(); pending.set(None); msg.set(Some((true, "Cadangan dipulihkan.".into()))); } }, "Ganti progres dengan cadangan" }
                            button { class: "btn", onclick: move |_| pending.set(None), "Batal" }
                        }
                    }
                }
            }
            section { class: "card",
                h2 { class: "t-card mb-2", "Cadangan otomatis" }
                p { class: "mb-2 text-sm text-slate-600", "Progres dicadangkan otomatis beberapa detik setelah perubahan dan saat pengguna berganti: satu berkas \u{201c}terbaru\u{201d} dan satu berkas per hari. Data tidak dikirim ke mana pun." }
                p { class: "mb-2 text-sm", "Folder: " b { class: "break-all", "{backup_dir}" } }
                p { class: "mb-2 text-xs text-slate-500", "Berkas simpanan: {state_file}" }
                div { class: "flex flex-wrap gap-2",
                    button { class: "btn btn-primary", onclick: move |_| { let mut s = app.write(); s.save(true); s.say("Cadangan disimpan."); }, "Cadangkan sekarang" }
                    button { class: "btn", onclick: move |_| { let mut s = app.write(); let _ = std::fs::create_dir_all(&s.paths.backup_dir); let d = s.paths.backup_dir.clone(); if !open_path(&d) { s.say("Tidak bisa membuka folder."); } }, "Buka folder" }
                    ConfirmButton { label: "Pulihkan dari cadangan terbaru", message: "Progres saat ini diganti dengan cadangan terbaru.", confirm_label: "Ya, pulihkan", on_confirm: move |_| {
                        let mut s = app.write();
                        let user = s.user.clone();
                        match crate::session::read_latest_backup(&s.paths, user.as_deref()) {
                            Some(st) => { s.st = st; s.bufs.clear(); s.changed(); msg.set(Some((true, "Progres dipulihkan dari cadangan terbaru.".into()))); }
                            None => msg.set(Some((false, "Belum ada cadangan.".into()))),
                        }
                    } }
                }
            }
            section { class: "card",
                h2 { class: "t-card mb-2", "Reset progres" }
                p { class: "mb-2 text-sm text-slate-600", "Menghapus seluruh jawaban, percobaan, dan kunci yang sudah dibuka. Ekspor cadangan lebih dulu bila perlu. Ketik " b { "RESET" } " untuk mengaktifkan tombol." }
                div { class: "flex gap-2",
                    input { "aria-label": "Konfirmasi reset", value: "{confirm}", placeholder: "RESET", class: "w-32", oninput: move |e| confirm.set(e.value()) }
                    button { class: "btn btn-danger", disabled: *confirm.read() != "RESET", onclick: move |_| {
                        let mut s = app.write(); s.save(true); s.st = Default::default(); s.bufs.clear(); s.changed(); confirm.set(String::new());
                        msg.set(Some((true, "Progres dihapus. Salinan terakhir ada di folder cadangan.".into())));
                    }, "Hapus semua progres" }
                }
            }
            }
            section { class: "card xl:col-span-2", "aria-label": "Tentang",
                h2 { class: "t-card mb-2", "Tentang" }
                p { class: "text-sm", "DEKRi Lab, versi " b { "{version}" } ". Studi kasus PT Sumber Cahaya Elektrindo tahun buku 2024." }
                p { class: "mt-1 text-xs text-slate-500", "Berjalan sepenuhnya offline; tidak ada server, akun, atau pengiriman data. Progres disimpan di komputer ini, jadi cadangkan secara berkala." }
                p { class: "mt-1 text-xs text-slate-500", "Proyek sumber terbuka yang independen dan tidak memiliki afiliasi apa pun. Aplikasi ini bukan nasihat akuntansi, pajak, atau hukum. Kasus dan materi disusun dengan bantuan kecerdasan buatan (AI). Soal disusun agar sesuai dengan standar akuntansi (PSAK), tetapi masih mungkin ada kesalahan. Lisensi MIT hanya untuk kode sumber. Lihat DISCLAIMER.md dan docs/LICENSING.md pada repositori." }
                p { class: "mt-1 text-xs text-slate-500", b { "Catatan PSAK:" } " mungkin terdapat soal, kunci, atau penjelasan yang tidak sesuai dengan PSAK. Bila berbeda, rujuk standar resmi yang berlaku atau tanyakan kepada pengajar Anda." }
                div { class: "mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs", "aria-label": "Laporkan kesalahan soal",
                    p { b { "Menemukan soal atau kunci yang keliru?" } " Laporkan lewat GitHub agar bisa diperbaiki di versi berikutnya. Sebutkan nomor soal dan bagian yang menurut Anda salah. Aplikasi ini bekerja offline, jadi salin tautan di bawah lalu buka di peramban." }
                    div { class: "mt-1 flex flex-wrap items-center gap-2",
                        code { class: "break-all rounded bg-white px-1.5 py-0.5", "{FEEDBACK_URL}" }
                        button { class: "btn", onclick: move |_| { let _ = document::eval(&js_copy); copied.set(Some(true)); }, "Salin tautan" }
                        if copied.read().is_some() { span { role: "status", "Tautan disalin." } }
                    }
                }
                div { class: "mt-2 flex flex-wrap items-center gap-2 text-xs",
                    button { class: "btn", onclick: move |_| {
                        let issues = dekri_core::audit::audit();
                        audit_msg.set(Some(if issues.is_empty() { "Data kasus dan kunci konsisten: semua jurnal kunci seimbang, akun dikenal, dan kunci lengkap.".to_string() } else { format!("{} temuan: {}", issues.len(), issues.iter().take(5).map(|i| format!("[{}] {}: {}", i.area, i.id, i.message)).collect::<Vec<_>>().join("; ")) }));
                    }, "Periksa konsistensi data kasus" }
                    if let Some(m) = audit_msg.read().clone() { span { role: "status", "{m}" } }
                }
                p { class: "mt-1 text-xs text-slate-500", b { "Perusahaan fiktif:" } " semua perusahaan, bank, nama, dan angka dalam aplikasi ini fiktif. Kesamaan dengan pihak nyata adalah ketidaksengajaan." }
            }
        }
    }
}
