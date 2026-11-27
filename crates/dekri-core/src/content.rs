//! Konten tambahan: akun pajak, paket industri, dan soal klasifikasi arus kas.
use crate::grade::NetMap;
use crate::types::Account;
use serde::Deserialize;
use std::collections::BTreeMap;
use std::sync::OnceLock;

/// Akun tambahan khusus latihan pajak (tidak masuk bagan akun kasus).
pub fn ext_accounts() -> &'static [Account] {
    static A: OnceLock<Vec<Account>> = OnceLock::new();
    A.get_or_init(|| {
        let a = |code: &str, name: &str, kind: &str, normal: &str, rc: &str| Account {
            code: code.into(),
            name: name.into(),
            kind: kind.into(),
            normal: normal.into(),
            report_class: rc.into(),
        };
        vec![
            a("1-1850", "PPN Masukan", "Asset", "Debit", "Current Asset"),
            a(
                "2-1550",
                "Utang PPN (PPN Keluaran)",
                "Liability",
                "Credit",
                "Current Liability",
            ),
            a(
                "2-1560",
                "Utang PPh 23",
                "Liability",
                "Credit",
                "Current Liability",
            ),
        ]
    })
}

#[derive(Clone, Debug, Deserialize)]
pub struct PackLine {
    pub code: String,
    pub debit: f64,
    pub credit: f64,
}
#[derive(Clone, Debug, Deserialize)]
pub struct PackItem {
    pub id: String,
    pub title: String,
    pub narrative: String,
    pub lines: Vec<PackLine>,
    pub explain: Option<String>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct PackAccount {
    pub code: String,
    pub name: String,
    pub normal: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct Pack {
    pub id: String,
    pub title: String,
    pub description: String,
    pub accounts: Option<Vec<PackAccount>>,
    pub items: Vec<PackItem>,
}

pub fn packs() -> &'static [Pack] {
    static P: OnceLock<Vec<Pack>> = OnceLock::new();
    P.get_or_init(|| {
        serde_json::from_str(include_str!("../../../data/industri-packs.json"))
            .expect("industri-packs.json rusak")
    })
}

/// Saldo neto per akun (debit positif) dari kunci satu soal paket.
pub fn pack_net(item: &PackItem) -> NetMap {
    let mut m = NetMap::new();
    for l in &item.lines {
        *m.entry(l.code.clone()).or_insert(0.0) += l.debit - l.credit;
    }
    m
}

#[derive(Clone, Debug, Deserialize)]
pub struct KasOpsi {
    pub teks: String,
    pub alasan: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct KasSoal {
    pub id: String,
    pub kelompok: String,
    pub judul: String,
    pub narasi: String,
    pub pertanyaan: String,
    pub opsi: Vec<KasOpsi>,
    pub kunci: usize,
    pub penjelasan: String,
    pub dasar: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct KasKelompok {
    pub judul: String,
    pub standar: String,
    pub periode: String,
    pub asumsi: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct KasData {
    pub kelompok: BTreeMap<String, KasKelompok>,
    pub soal: Vec<KasSoal>,
}
pub fn kas() -> &'static KasData {
    static K: OnceLock<KasData> = OnceLock::new();
    K.get_or_init(|| {
        serde_json::from_str(include_str!("../data/arus-kas.json")).expect("arus-kas.json rusak")
    })
}

/// Nama akun dari bagan kasus, akun pajak, atau akun paket industri.
pub fn any_account_name(code: &str) -> Option<String> {
    crate::data::data()
        .coa
        .iter()
        .find(|a| a.code == code)
        .map(|a| a.name.clone())
        .or_else(|| {
            ext_accounts()
                .iter()
                .find(|a| a.code == code)
                .map(|a| a.name.clone())
        })
        .or_else(|| {
            packs()
                .iter()
                .flat_map(|p| p.accounts.iter().flatten())
                .find(|a| a.code == code)
                .map(|a| a.name.clone())
        })
}
