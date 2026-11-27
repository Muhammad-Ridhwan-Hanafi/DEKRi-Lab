#!/usr/bin/env python3
"""Membuat THIRD_PARTY_NOTICES.md dari Cargo.lock (dependensi yang ikut terkompilasi ke dekri-lab.exe untuk Windows).

Pemakaian (dari akar repositori): python3 tools/gen_notices.py
Butuh cargo. Jalankan ulang setiap Cargo.lock berubah, lalu periksa diff-nya.
"""
import collections
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
meta = json.loads(
    subprocess.check_output(
        ["cargo", "metadata", "--format-version", "1", "--locked", "--filter-platform", "x86_64-pc-windows-msvc"],
        cwd=ROOT,
        text=True,
    )
)
nodes = {n["id"]: n for n in meta["resolve"]["nodes"]}
pk = {p["id"]: p for p in meta["packages"]}
root = next(p["id"] for p in meta["packages"] if p["name"] == "dekri-ui")

seen, stack = set(), [root]
while stack:
    i = stack.pop()
    if i in seen:
        continue
    seen.add(i)
    for d in nodes[i]["deps"]:
        if any(k["kind"] in (None, "normal") for k in d["dep_kinds"]):
            stack.append(d["pkg"])

rows = sorted(
    (pk[i]["name"], pk[i]["version"], pk[i].get("license") or "TIDAK TERCANTUM")
    for i in seen
    if pk[i]["name"] not in ("dekri-ui", "dekri-core")
)
count = collections.Counter(r[2] for r in rows)

out = ["# Pemberitahuan pihak ketiga", ""]
out.append(
    "DEKRi Lab (kode sumber: MIT, lihat `LICENSE`) dikompilasi bersama pustaka Rust sumber terbuka berikut. "
    "Daftar ini dibuat otomatis oleh `tools/gen_notices.py` dari `Cargo.lock` untuk target Windows x64 "
    f"({len(rows)} paket). Teks lengkap setiap lisensi ada di paket sumber masing-masing (crates.io)."
)
out += ["", "## Ringkasan lisensi", "", "| Lisensi (SPDX) | Jumlah paket |", "| --- | --- |"]
out += [f"| {k} | {v} |" for k, v in count.most_common()]
out += [
    "",
    "## Font",
    "",
    "Antarmuka memakai font **Inter** (variabel, tertanam di CSS; SIL Open Font License 1.1, salinan di `assets/fonts/OFL.txt`). Font tidak dimodifikasi oleh proyek ini.",
    "",
    "## Daftar paket",
    "",
    "| Paket | Versi | Lisensi |",
    "| --- | --- | --- |",
]
out += [f"| {n} | {v} | {l} |" for n, v, l in rows]
out.append("")
(ROOT / "THIRD_PARTY_NOTICES.md").write_text("\n".join(out), encoding="utf-8")
print(f"Menulis THIRD_PARTY_NOTICES.md ({len(rows)} paket)")
