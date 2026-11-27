//! Halaman. Yang belum dipindahkan menampilkan penanda sementara.
use crate::belajar::{ArusKas, Belajar, BelajarTabs, Materi};
use crate::buku::{BukuBesar, BukuPembantu, JurnalUmum, NeracaSaldo};
use crate::dashboard::Dashboard;
use crate::kerja::{Koreksi, Penutup, Penyesuaian, Skenario};
use crate::laporan::{Kasus, Laporan, Pemeriksaan};
use crate::latihan::Latihan;
use crate::pengaturan::Pengaturan;
use crate::session::Page;
use crate::transaksi::Transaksi;
use crate::ujian::Ujian;
use crate::varian::Varian;
use dioxus::prelude::*;

#[component]
pub fn PageView(page: Page) -> Element {
    match page {
        Page::Beranda => rsx! { Dashboard {} },
        Page::Transaksi => rsx! { Transaksi {} },
        Page::Penyesuaian => rsx! { Penyesuaian {} },
        Page::Penutup => rsx! { Penutup {} },
        Page::Koreksi => rsx! { Koreksi {} },
        Page::Skenario => rsx! { div { class: "space-y-4", Skenario {} ArusKas {} } },
        Page::JurnalUmum => rsx! { JurnalUmum {} },
        Page::BukuBesar => rsx! { BukuBesar {} },
        Page::NeracaSaldo => rsx! { NeracaSaldo {} },
        Page::Kasus => rsx! { Kasus {} },
        Page::Ujian => rsx! { Ujian {} },
        Page::Latihan => rsx! { Latihan {} },
        Page::Pengaturan => rsx! { Pengaturan {} },
        Page::Varian => rsx! { Varian { tax: false } },
        Page::Pajak => rsx! { Varian { tax: true } },
        Page::Belajar => rsx! { BelajarTabs { active: 0 } Belajar {} },
        Page::Materi => rsx! { BelajarTabs { active: 1 } Materi {} },
        Page::ArusKas => rsx! { ArusKas {} },
        Page::BukuPembantu => rsx! { BukuPembantu {} },
        Page::Laporan => rsx! { Laporan {} },
        Page::Pemeriksaan => rsx! { Pemeriksaan {} },
    }
}
