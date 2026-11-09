#!/usr/bin/env python3
"""Uji kesetaraan penilaian pada jawaban SALAH.

Untuk setiap putaran, tiap transaksi dan tiap jurnal penyesuaian diberi jawaban yang dimutasi
(sisi terbalik, nominal meleset, akun kurang/lebih, selisih 1 dan 2 rupiah, dsb.), workbook dihitung ulang
di LibreOffice, lalu teks status Excel (sheet 07 kolom H, sheet 10 kolom I) disimpan bersama jawaban yang
benar-benar ditulis ke tests/parity/excel-grading.json. Tes vitest membandingkan dengan gradeJournal.

Pemakaian: python3 tools/mutated_parity.py <path.xlsx> [jumlah_putaran]
Butuh LibreOffice (soffice). Workbook asli tidak diubah.
"""
import copy
import json
import shutil
import subprocess
import sys
import tempfile
import warnings
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1])
KEY = json.loads((ROOT / "data/answer-key.json").read_text())
COA = [a["code"] for a in json.loads((ROOT / "data/coa.json").read_text())]

MUTATIONS = ["exact", "reverse", "amount", "amount_same_total", "drop", "missing_balanced",
             "extra_replace", "extra_added", "tol1", "tol2", "split", "empty"]
PASSES = int(sys.argv[2]) if len(sys.argv) > 2 else len(MUTATIONS)


def pick_extra(used):
    for c in COA:
        if c not in used and c.startswith(("6-", "7-")):
            return c
    raise RuntimeError("tidak ada akun cadangan")


def mutate(kind, lines, cap):
    """Kembalikan (jenis_efektif, baris_baru). Bila mutasi tidak bisa diterapkan, jawaban dibiarkan benar."""
    L = copy.deepcopy(lines)
    deb = [i for i, l in enumerate(L) if l["debit"]]
    cre = [i for i, l in enumerate(L) if l["credit"]]
    used = {l["code"] for l in L}
    if kind == "exact":
        return kind, L
    if kind == "empty":
        return kind, []
    if kind == "reverse":
        for l in L:
            l["debit"], l["credit"] = l["credit"], l["debit"]
        return kind, L
    if kind == "amount" and deb and cre:
        L[deb[0]]["debit"] += 5000
        L[cre[0]]["credit"] += 5000
        return kind, L
    if kind == "amount_same_total" and len(deb) >= 2 and L[deb[0]]["debit"] > 10000:
        L[deb[0]]["debit"] -= 10000
        L[deb[1]]["debit"] += 10000
        return kind, L
    if kind == "drop" and len(L) >= 2:
        return kind, L[:-1]
    if kind == "missing_balanced" and len(deb) >= 2:
        moved = L[deb[-1]]["debit"]
        L[deb[0]]["debit"] += moved
        del L[deb[-1]]
        return kind, L
    if kind == "extra_replace" and L:
        i = len(L) - 1
        L[i]["code"] = pick_extra(used)
        return kind, L
    if kind == "extra_added" and len(L) + 2 <= cap:
        a, b = pick_extra(used), pick_extra(used | {pick_extra(used)})
        L.append({"code": a, "debit": 1000, "credit": 0})
        L.append({"code": b, "debit": 0, "credit": 1000})
        return kind, L
    if kind in ("tol1", "tol2") and deb and cre:
        d = 1 if kind == "tol1" else 2
        L[deb[0]]["debit"] += d
        L[cre[0]]["credit"] += d
        return kind, L
    if kind == "split" and len(L) + 1 <= cap and L and (L[0]["debit"] > 1 or L[0]["credit"] > 1):
        first = L[0]
        if first["debit"]:
            half = first["debit"] // 2
            first["debit"] -= half
            L.insert(1, {"code": first["code"], "debit": half, "credit": 0})
        else:
            half = first["credit"] // 2
            first["credit"] -= half
            L.insert(1, {"code": first["code"], "debit": 0, "credit": half})
        return kind, L
    return "exact", L


def main():
    cases = []
    for p in range(PASSES):
        tmp = Path(tempfile.mkdtemp(prefix="mut-"))
        wb = openpyxl.load_workbook(SRC)
        j, a, s06 = wb["07_GENERAL_JOURNAL"], wb["10_ADJUSTING_ENTRIES"], wb["06_TRANSACTION_ANALYSIS"]
        batch = []
        for t in KEY["readableTxn"]:
            no = t["no"]
            is_key = str(no) in KEY["txnNet"]
            base = 6 + 6 * (no - 1)
            kind, lines = mutate(MUTATIONS[(no + p) % len(MUTATIONS)], t["lines"] if is_key else [], 6)
            decided = False
            if not is_key:  # transaksi pengecoh: tanpa jurnal / sudah menyatakan tidak perlu / jurnal salah
                mode = (no + p) % 3
                if mode == 1:
                    decided = True
                    s06.cell(4 + no, 14).value = "Tidak perlu jurnal"
                    kind = "decided"
                elif mode == 2:
                    lines = [{"code": "1-1000", "debit": 1000, "credit": 0}, {"code": "3-1000", "debit": 0, "credit": 1000}]
                    kind = "bogus"
                else:
                    kind = "empty"
            for i, l in enumerate(lines):
                j.cell(base + i, 3).value = l["code"]
                if l["debit"]:
                    j.cell(base + i, 6).value = l["debit"]
                if l["credit"]:
                    j.cell(base + i, 7).value = l["credit"]
            batch.append({"kind": "txn", "id": str(no), "mutation": kind, "lines": lines, "decided": decided, "cell": ("07_GENERAL_JOURNAL", base, 8)})
        start, size = {}, {}
        for r in range(6, a.max_row + 1):
            code = a.cell(r, 1).value
            if isinstance(code, str) and code.startswith("AJ"):
                start.setdefault(code, r)
                size[code] = size.get(code, 0) + 1
        for n, adj in enumerate(KEY["readableAdj"]):
            kind, lines = mutate(MUTATIONS[(n + p) % len(MUTATIONS)], adj["lines"], size[adj["code"]])
            for i, l in enumerate(lines):
                r = start[adj["code"]] + i
                a.cell(r, 5).value = l["code"]
                if l["debit"]:
                    a.cell(r, 7).value = l["debit"]
                if l["credit"]:
                    a.cell(r, 8).value = l["credit"]
            batch.append({"kind": "adj", "id": adj["code"], "mutation": kind, "lines": lines, "decided": False, "cell": ("10_ADJUSTING_ENTRIES", start[adj["code"]], 9)})
        work = tmp / "m.xlsx"
        wb.save(work)
        subprocess.run(["soffice", "--headless", "--calc", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", str(tmp / "out"), str(work)],
                       check=True, capture_output=True, timeout=600)
        calc = openpyxl.load_workbook(tmp / "out" / "m.xlsx", data_only=True)
        for b in batch:
            sheet, r, c = b.pop("cell")
            b["excel"] = str(calc[sheet].cell(r, c).value)
            b["pass"] = p
            cases.append(b)
        shutil.rmtree(tmp, ignore_errors=True)
        print(f"putaran {p + 1}/{PASSES} selesai", flush=True)
    (ROOT / "tests/parity/excel-grading.json").write_text(json.dumps(cases, ensure_ascii=False, indent=0))
    from collections import Counter
    print(Counter(c["excel"].split(" - ")[0] for c in cases))


main()
