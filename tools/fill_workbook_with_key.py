#!/usr/bin/env python3
"""Isi workbook sumber dengan jawaban KUNCI, hitung ulang di LibreOffice, dan simpan nilai sel laporan
ke tests/parity/excel-values.json (fixture uji kesetaraan sel demi sel).

Pemakaian: python3 tools/fill_workbook_with_key.py <path.xlsx>
Butuh LibreOffice (soffice). Hasil kerja di direktori sementara; workbook asli tidak diubah.
"""
import json
import re
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
key = json.loads((ROOT / "data/answer-key.json").read_text())
closing = json.loads((ROOT / "data/closing-reversing.json").read_text())

tmp = Path(tempfile.mkdtemp(prefix="fill-"))
work = tmp / "filled.xlsx"
wb = openpyxl.load_workbook(SRC)

j = wb["07_GENERAL_JOURNAL"]
for t in key["readableTxn"]:
    base = 6 + 6 * (t["no"] - 1)
    assert j.cell(base, 2).value == t["no"], f"baris awal txn {t['no']} tidak cocok"
    for i, l in enumerate(t["lines"]):
        assert i < 6
        j.cell(base + i, 3).value = l["code"]
        if l["debit"]:
            j.cell(base + i, 6).value = l["debit"]
        if l["credit"]:
            j.cell(base + i, 7).value = l["credit"]

a = wb["10_ADJUSTING_ENTRIES"]
start, size = {}, {}
for r in range(6, a.max_row + 1):  # blok baris tiap AJ tidak seragam: pindai kolom A
    code = a.cell(r, 1).value
    if isinstance(code, str) and code.startswith("AJ"):
        start.setdefault(code, r)
        size[code] = size.get(code, 0) + 1
for adj in key["readableAdj"]:
    assert len(adj["lines"]) <= size[adj["code"]], f"{adj['code']}: {len(adj['lines'])} baris > {size[adj['code']]} tersedia"
    for i, l in enumerate(adj["lines"]):
        r = start[adj["code"]] + i
        a.cell(r, 5).value = l["code"]
        if l["debit"]:
            a.cell(r, 7).value = l["debit"]
        if l["credit"]:
            a.cell(r, 8).value = l["credit"]

# jurnal penutup: isi dari saldo kunci (neraca saldo disesuaikan) dan laba bersih kunci
bal = {c: v["adj"] for c, v in key["expectedTB"].items()}
net_income = next(s["value"] for s in key["expectedStatements"] if s["item"] == "Laba bersih tahun berjalan")
c16 = wb["16_CLOSING_ENTRIES"]
for r in range(6, 41):
    code = c16.cell(r, 1).value
    b = bal.get(code, 0)
    if code == "3-3000":
        c16.cell(r, 5).value = net_income
    elif code == "3-9000":
        c16.cell(r, 6).value = b
    else:
        c16.cell(r, 5).value = max(-b, 0)
        c16.cell(r, 6).value = max(b, 0)

wb.save(work)
subprocess.run(["soffice", "--headless", "--calc", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", str(tmp / "out"), str(work)],
               check=True, capture_output=True, timeout=300)
calc = openpyxl.load_workbook(tmp / "out" / "filled.xlsx", data_only=True)

STAT = {"S12": "12_INCOME_STATEMENT", "S12A": "12A_PSAK118_PRO_FORMA", "S13": "13_CHANGES_IN_EQUITY",
        "S14": "14_FINANCIAL_POSITION", "S15": "15_STATEMENT_OF_CASH_FLOWS", "S15A": "15A_PSAK207_PRO_FORMA"}
gen = (ROOT / "src/engine/statements.generated.ts").read_text()
ids = re.findall(r"^  const (S\d+A?_[A-Z]+\d+) =", gen, re.M)
values = {}
for cid in ids:
    code, coord = cid.split("_", 1)
    v = calc[STAT[code]][coord].value
    values[cid] = 0 if v is None else v

atb = {}
sh = calc["11_ADJUSTED_TRIAL_BALANCE"]
for r in range(6, 90):
    code = sh.cell(r, 1).value
    if code:
        atb[code] = (sh.cell(r, 4).value or 0) - (sh.cell(r, 5).value or 0)
pre = {}
sh = calc["09_TRIAL_BALANCE"]
for r in range(6, 90):
    code = sh.cell(r, 1).value
    if code:
        pre[code] = (sh.cell(r, 4).value or 0) - (sh.cell(r, 5).value or 0)
pctb = {}
sh = calc["17_POST_CLOSING_TRIAL_BALANCE"]
for r in range(5, 55):
    code = sh.cell(r, 1).value
    if code:
        pctb[code] = (sh.cell(r, 4).value or 0) - (sh.cell(r, 5).value or 0)
checks = [calc["23_FORMULA_CHECKS"].cell(r, 4).value for r in range(5, 19)]

out = ROOT / "tests/parity/excel-values.json"
out.write_text(json.dumps({"source": SRC.name, "cells": values, "preTB": pre, "adjTB": atb, "postClosingTB": pctb, "checks": checks}, ensure_ascii=False, indent=0))
shutil.rmtree(tmp, ignore_errors=True)
bad = [c for c in checks if not str(c).startswith("BENAR")]
print(f"{len(values)} sel laporan, {len(atb)} akun; pemeriksaan sheet 23 yang tidak BENAR: {bad}")
