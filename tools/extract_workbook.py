#!/usr/bin/env python3
"""Ekstrak workbook latihan akuntansi ke data/*.json. Dapat dijalankan ulang.

Pemakaian: python3 tools/extract_workbook.py <path.xlsx> [out_dir]
Hanya membaca nilai tersimpan (openpyxl tidak menghitung rumus). Sel rumus yang
nilai tersimpannya kosong dicatat di data/extract-report.json.
"""
import json
import sys
import warnings
from datetime import datetime
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore")

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "Accounting_Practice_Workbook_Rapi_dan_Audit_v4.xlsx")
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "data")
OUT.mkdir(parents=True, exist_ok=True)

wf = openpyxl.load_workbook(SRC)  # rumus
wv = openpyxl.load_workbook(SRC, data_only=True)  # nilai tersimpan

report = {"source": SRC.name, "warnings": [], "counts": {}}


def val(ws, r, c):
    v = ws.cell(r, c).value
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, float) and v == int(v):
        return int(v)
    return v


def text(v):
    return None if v is None else str(v).strip()


def write(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def rows(sheet, r1, r2, cols):
    ws = wv[sheet]
    for r in range(r1, r2 + 1):
        yield r, [val(ws, r, c) for c in cols]


# ---------- COA ----------
coa = []
for r, (code, name, typ, normal, cls, extra) in rows("04_COA", 6, 89, range(1, 7)):
    if code is None:
        continue
    coa.append({"code": code, "name": name, "type": typ, "normal": normal, "reportClass": cls})
write("coa.json", coa)

# ---------- Saldo awal ----------
coa_name = {a["code"]: a["name"] for a in coa}
opening = []
ws = wv["03_OPENING_BALANCES"]
for r in range(5, ws.max_row + 1):
    code = val(ws, r, 1)
    if not code or code not in coa_name:
        continue
    opening.append({"code": code, "debit": val(ws, r, 3) or 0, "credit": val(ws, r, 4) or 0, "note": text(val(ws, r, 5))})
write("opening-balances.json", opening)

# ---------- Transaksi sumber ----------
tx = []
for r, v in rows("05_SOURCE_TRANSACTIONS", 5, 151, range(1, 8)):
    if v[0] is None:
        continue
    tx.append({"no": v[0], "date": v[1], "level": v[2], "topic": v[3], "narrative": v[4], "party": v[5], "amountInfo": v[6]})

# kunci analisis (bagian E) -> menentukan pengecoh
ak = wv["22_ANSWER_KEY"]
analysis = {}
for r in range(6, 153):
    no = val(ak, r, 24)
    if no is None:
        continue
    analysis[no] = {
        "debit": text(val(ak, r, 25)),
        "credit": text(val(ak, r, 26)),
        "amount": val(ak, r, 27),
        "cashClass": text(val(ak, r, 28)),
        "needsAdj": text(val(ak, r, 29)),
        "affectsProfit": text(val(ak, r, 30)),
        "affectsCash": text(val(ak, r, 31)),
        "reason": text(val(ak, r, 32)),
        "cashSub": text(val(ak, r, 33)),
    }

# bagian A: neto per akun per transaksi
txn_net = {}
for r in range(6, 370):
    no, code, net = val(ak, r, 1), val(ak, r, 2), val(ak, r, 3)
    if no is None:
        continue
    txn_net.setdefault(str(no), {})[code] = net
for t in tx:
    t["isDistractor"] = str(t["no"]) not in txn_net
write("transactions.json", tx)

# ---------- Penyesuaian ----------
ws = wv["10_ADJUSTING_ENTRIES"]
adjustments = []
for r in range(6, 146):
    code = val(ws, r, 1)
    if code and val(ws, r, 3) is not None and str(code).startswith("AJ"):
        adjustments.append({"code": code, "level": val(ws, r, 2), "category": val(ws, r, 3), "facts": val(ws, r, 4)})
write("adjustments.json", adjustments)

# ---------- Kasus koreksi + deteksi kesalahan ----------
ws = wv["19_CORRECTING_ENTRIES"]
correcting = []
for r in range(6, ws.max_row + 1):
    no = val(ws, r, 1)
    if isinstance(no, int):
        correcting.append({"no": no, "event": val(ws, r, 2)})
ws = wv["20_ERROR_DETECTION"]
err_options = None
for dv in ws.data_validations.dataValidation if ws.data_validations else []:
    if dv.formula1:
        err_options = [s.strip() for s in dv.formula1.strip('"').split(",")]
detect = []
for r in range(5, ws.max_row + 1):
    no = val(ws, r, 1)
    if isinstance(no, int):
        detect.append({"no": no, "event": val(ws, r, 2)})
write("correcting-cases.json", {"correcting": correcting, "detect": detect, "errorTypeOptions": err_options})

# ---------- Skenario ----------
ws = wv["21_SCENARIO_QUESTIONS"]
wsf = wf["21_SCENARIO_QUESTIONS"]
dv_opts = {}
for dv in wsf.data_validations.dataValidation if wsf.data_validations else []:
    for rng in str(dv.sqref).split():
        dv_opts[rng] = [s.strip() for s in dv.formula1.strip('"').split(",")] if dv.formula1 else None
scenarios = []
for r in range(6, ws.max_row + 1):
    no = val(ws, r, 1)
    if not isinstance(no, int):
        continue
    options = dv_opts.get(f"F{r}")
    scenarios.append({
        "no": no, "topic": val(ws, r, 2), "caseAndFacts": val(ws, r, 3), "question": val(ws, r, 4),
        "kind": "choice" if options else "numeric", "options": options, "userResponsePrompt": val(ws, r, 5),
    })
write("scenarios.json", scenarios)

# ---------- Kasus (01, 02, 24, 26) ----------
def kv(sheet, r1, r2, cols):
    ws = wv[sheet]
    out = []
    for r in range(r1, r2 + 1):
        row = [text(val(ws, r, c)) for c in cols]
        if any(row):
            out.append(row)
    return out

case = {
    "title": text(val(wv["01_CASE_BACKGROUND"], 1, 1)),
    "intro": text(val(wv["01_CASE_BACKGROUND"], 2, 1)),
    "background": kv("01_CASE_BACKGROUND", 4, wv["01_CASE_BACKGROUND"].max_row, range(1, 7)),
    "policies": kv("02_ACCOUNTING_POLICIES", 4, wv["02_ACCOUNTING_POLICIES"].max_row, range(1, 4)),
    "notes": kv("24_INSTRUCTOR_NOTES", 4, wv["24_INSTRUCTOR_NOTES"].max_row, range(1, 3)),
    "sak": kv("26_PEMBARUAN_SAK", 1, wv["26_PEMBARUAN_SAK"].max_row, range(1, 6)),
}
# case.json disunting manual untuk aplikasi (tanpa catatan pengajar/log SAK); hasil ekstraksi ditulis terpisah agar tidak menimpa.
write("case.extracted.json", case)

# ---------- Pilihan dropdown analisis (sheet 06) ----------
opts = {}
for dv in wf["06_TRANSACTION_ANALYSIS"].data_validations.dataValidation:
    items = [x.strip() for x in dv.formula1.strip('"').split(",")] if dv.formula1 else []
    opts[str(dv.sqref)] = items
analysis_options = {
    "cashClass": opts.get("I5:I151", []),
    "yesNo": opts.get("J5:L151", []),
    "decision": opts.get("N5:N151", []),
}
write("analysis-options.json", analysis_options)

# ---------- Baris penutup (16) dan kasus pembalik (18) ----------
ws = wv["16_CLOSING_ENTRIES"]
closing_rows = []
for r in range(6, 41):
    code = val(ws, r, 1)
    if code:
        closing_rows.append({"code": code, "group": val(ws, r, 3), "instruction": val(ws, r, 4)})
ws = wv["18_REVERSING_ENTRIES"]
reversing_cases = []
for r in range(5, ws.max_row + 1):
    no = val(ws, r, 1)
    if isinstance(no, int):
        reversing_cases.append({"no": no, "reversed": val(ws, r, 2), "why": val(ws, r, 3)})
write("closing-reversing.json", {"closingRows": closing_rows, "reversingCases": reversing_cases,
                                 "closingIntro": text(val(wv["16_CLOSING_ENTRIES"], 2, 1)), "reversingIntro": text(val(ws, 2, 1))})

# ---------- Kunci jawaban A-M ----------
def pairs(rr, c_no, c_code, c_net):
    out = {}
    for r in range(*rr):
        no, code, net = val(ak, r, c_no), val(ak, r, c_code), val(ak, r, c_net)
        if no is None:
            continue
        out.setdefault(str(no), {})[code] = net
    return out

adj_net = pairs((6, 64), 16, 17, 18)
correcting_net = pairs((6, 30), 35, 36, 37)
reversing_net = pairs((6, 10), 44, 45, 46)

def readable(r1, r2, cols):
    out, cur = [], None
    for r in range(r1, r2):
        row = {k: val(ak, r, c) for k, c in cols.items()}
        if row.get("no") is not None:
            cur = row
            cur = {**row, "lines": []}
            out.append(cur)
        if cur is not None and row.get("code"):
            cur["lines"].append({"code": row["code"], "name": row["name"], "debit": row.get("debit") or 0, "credit": row.get("credit") or 0})
            if row.get("explain") and not cur.get("explain"):
                cur["explain"] = row["explain"]
    for o in out:
        for k in ("code", "name", "debit", "credit"):
            o.pop(k, None)
    return out

# J: jurnal transaksi terbaca. Baris pertama tiap transaksi memuat no/tanggal/tingkat/topik.
readable_txn = []
cur = None
for r in range(6, 382):
    no = val(ak, r, 48)  # AV
    code = val(ak, r, 52)  # AZ
    if no is not None and (cur is None or cur["no"] != no):
        cur = {"no": no, "date": val(ak, r, 49), "level": val(ak, r, 50), "topic": val(ak, r, 51), "lines": [], "explain": None}
        readable_txn.append(cur)
    if cur is not None and code:
        cur["lines"].append({"code": code, "name": val(ak, r, 53), "debit": val(ak, r, 54) or 0, "credit": val(ak, r, 55) or 0})
    if cur is not None and val(ak, r, 56):
        cur["explain"] = val(ak, r, 56)

readable_adj = []
cur = None
for r in range(6, 64):
    code_aj = val(ak, r, 58)  # BF
    acct = val(ak, r, 60)  # BH
    if code_aj is not None and (cur is None or cur["code"] != code_aj):
        cur = {"code": code_aj, "category": val(ak, r, 59), "lines": [], "calc": None, "explain": None}
        readable_adj.append(cur)
    if cur is not None and acct:
        cur["lines"].append({"code": acct, "name": val(ak, r, 61), "debit": val(ak, r, 62) or 0, "credit": val(ak, r, 63) or 0})
    if cur is not None and val(ak, r, 64):
        cur["calc"] = val(ak, r, 64)
    if cur is not None and val(ak, r, 65):
        cur["explain"] = val(ak, r, 65)

expected_tb = {}
for r in range(6, 90):
    code = val(ak, r, 67)  # BO
    if code:
        expected_tb[code] = {"pre": val(ak, r, 69), "adj": val(ak, r, 70)}

expected_statements = []
for r in range(6, 20):
    if val(ak, r, 72):  # BT
        expected_statements.append({"item": val(ak, r, 72), "sheet": val(ak, r, 73), "value": val(ak, r, 74)})

error_type = {str(val(ak, r, 38)): val(ak, r, 39) for r in range(6, 18) if val(ak, r, 38) is not None}  # AL, AM
scenario_key = {str(val(ak, r, 40)): {"key": val(ak, r, 41), "explanation": val(ak, r, 42)} for r in range(6, 32) if val(ak, r, 40) is not None}

answer_key = {
    "txnNet": txn_net, "adjNet": adj_net, "analysis": {str(k): v for k, v in analysis.items()},
    "correctingNet": correcting_net, "errorType": error_type, "scenario": scenario_key,
    "reversingNet": reversing_net, "readableTxn": readable_txn, "readableAdj": readable_adj,
    "expectedTB": expected_tb, "expectedStatements": expected_statements,
}
write("answer-key.json", answer_key)

# ---------- Laporan & verifikasi ----------
report["counts"] = {
    "coa": len(coa), "openingBalances": len(opening), "transactions": len(tx),
    "distractors": sum(1 for t in tx if t["isDistractor"]), "adjustments": len(adjustments),
    "scenarios": len(scenarios), "auditFindings": len(findings), "correctingCases": len(correcting),
    "detectCases": len(detect), "closingRows": len(closing_rows), "reversingCases": len(reversing_cases), "keyTxnNet": len(txn_net), "keyAdjNet": len(adj_net),
    "keyReadableTxn": len(readable_txn), "keyReadableAdj": len(readable_adj),
    "keyExpectedTB": len(expected_tb), "keyExpectedStatements": len(expected_statements),
}

# formula tanpa nilai tersimpan (di luar sheet interaktif yang memang kosong di file sumber)
for ws in wf.worksheets:
    n = 0
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith("=") and wv[ws.title][c.coordinate].value is None:
                n += 1
    if n:
        report["warnings"].append(f"{ws.title}: {n} sel rumus tanpa nilai tersimpan (data pengguna kosong atau belum dihitung)")

write("extract-report.json", report)
print(json.dumps(report["counts"], indent=1))
for w in report["warnings"]:
    print("WARN", w)
