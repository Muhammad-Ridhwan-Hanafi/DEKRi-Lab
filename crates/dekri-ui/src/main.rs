#![cfg_attr(windows, windows_subsystem = "windows")]
//! DEKRi Lab: antarmuka web (Dioxus) di atas dekri-core. CSS sama dengan versi 1 (Tailwind, dibangun lewat tools/css/build.py).
mod belajar;
#[allow(dead_code)]
mod brand;
mod buku;
mod components;
mod dashboard;
mod extras;
mod icons;
mod kerja;
mod laporan;
mod latihan;
mod pages;
mod pengaturan;
mod practice;
#[allow(dead_code)]
mod session;
mod shell;
mod transaksi;
mod ujian;
mod varian;
mod widgets;

use dioxus::prelude::*;
use session::Session;

const CSS: &str = include_str!("../assets/main.css");

fn main() {
    // DEKRI_SIZE=1366x820 mengatur ukuran awal (untuk tangkapan layar dan uji DPI); minimum 1024x640.
    let (w, h) = std::env::var("DEKRI_SIZE")
        .ok()
        .and_then(|v| {
            let (a, b) = v.split_once('x')?;
            Some((a.parse::<f64>().ok()?, b.parse::<f64>().ok()?))
        })
        .unwrap_or((1366.0, 820.0));
    let cfg = dioxus::desktop::Config::new().with_menu(None).with_window(
        dioxus::desktop::WindowBuilder::new()
            .with_title("DEKRi Lab")
            .with_window_icon(dioxus::desktop::icon_from_memory(include_bytes!("../icon.png")).ok())
            .with_min_inner_size(dioxus::desktop::LogicalSize::new(1024.0, 640.0))
            .with_inner_size(dioxus::desktop::LogicalSize::new(
                w.max(1024.0),
                h.max(640.0),
            )),
    );
    dioxus::LaunchBuilder::desktop().with_cfg(cfg).launch(App);
}

#[component]
fn App() -> Element {
    let app = use_signal(Session::new);
    use_context_provider(|| app);

    // Simpan otomatis tiap detik bila ada perubahan.
    use_future(move || {
        let mut app = app;
        async move {
            loop {
                tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
                if app.read().exam.dirty {
                    app.write().persist_exam();
                }
                let dirty = app.read().dirty;
                if dirty {
                    app.write().save(false);
                }
            }
        }
    });

    use_effect(move || {
        let pref = app.read().theme_pref.clone();
        let js = format!(
            "(function(){{var p='{pref}';var mq=matchMedia('(prefers-color-scheme: dark)');var f=function(){{document.documentElement.classList.toggle('dark',p==='gelap'||(p==='otomatis'&&mq.matches));}};f();if(window.__dkMq)window.__dkMq.removeEventListener('change',window.__dkMq.__f);mq.__f=f;mq.addEventListener('change',f);window.__dkMq=mq;try{{var s=Number(localStorage.getItem('akuntansi-practice:scale'));if(s)document.documentElement.style.fontSize=(16*s/100)+'px';}}catch(e){{}}}})()"
        );
        let _ = document::eval(&js);
    });

    rsx! {
        document::Style { "{CSS}" }
        shell::StartupSplash {}
        if app.read().logged_in {
            shell::Shell {}
        } else {
            shell::LoginScreen {}
        }
    }
}
