#!/usr/bin/env python3
"""Terjemahkan rumus sheet laporan (12, 12A, 13, 14, 15, 15A) menjadi TypeScript.

Pemakaian: python3 tools/gen_statements.py <path.xlsx> [out.ts]

Keluaran: src/engine/statements.generated.ts
  - computeStatements(T): menghitung semua sel laporan dari tabel sumber (ATB, OB, JRN, ADJ, GL)
  - STATEMENT_LAYOUT: judul, baris, label, format angka, dan id sel tiap laporan

Setiap sel diterjemahkan 1:1 dari rumus Excel, sehingga hasilnya sama dengan workbook
oleh konstruksi. Fungsi yang tidak dikenal menghentikan generator (tidak diabaikan diam-diam).
"""
import json
import re
import sys
import warnings
from pathlib import Path

import openpyxl
from openpyxl.utils import column_index_from_string, get_column_letter

warnings.filterwarnings("ignore")

SRC = sys.argv[1] if len(sys.argv) > 1 else "Accounting_Practice_Workbook_Rapi_dan_Audit_v4.xlsx"
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "src/engine/statements.generated.ts")

wf = openpyxl.load_workbook(SRC)
wv = openpyxl.load_workbook(SRC, data_only=True)

STATEMENTS = {  # kode -> (nama sheet, kolom nilai, kolom catatan)
    "S12": "12_INCOME_STATEMENT",
    "S12A": "12A_PSAK118_PRO_FORMA",
    "S13": "13_CHANGES_IN_EQUITY",
    "S14": "14_FINANCIAL_POSITION",
    "S15": "15_STATEMENT_OF_CASH_FLOWS",
    "S15A": "15A_PSAK207_PRO_FORMA",
}
SHEET_TO_CODE = {v: k for k, v in STATEMENTS.items()}

# nama sheet sumber -> (tabel TS, peta kolom Excel -> kolom tabel)
SOURCES = {
    "11_ADJUSTED_TRIAL_BALANCE": "ATB",
    "03_OPENING_BALANCES": "OB",
    "07_GENERAL_JOURNAL": "JRN",
    "10_ADJUSTING_ENTRIES": "ADJ",
    "08_GENERAL_LEDGER": "GL",
}

# ---------------- tokenizer ----------------
TOKEN = re.compile(r"""
    \s*(?:
      (?P<str>"(?:[^"]|"")*")
    | (?P<ref>(?:(?:'[^']+'|[A-Za-z0-9_]+)!)?\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?)
    | (?P<num>\d+(?:\.\d+)?)
    | (?P<func>[A-Z][A-Z0-9\.]*)\(
    | (?P<op><>|<=|>=|[-+*/^&=<>(),%])
    )""", re.X)


def tokenize(s):
    pos, out = 0, []
    while pos < len(s):
        m = TOKEN.match(s, pos)
        if not m or m.end() == pos:
            if s[pos:].strip() == "":
                break
            raise ValueError(f"token tak dikenal di: {s[pos:pos+30]!r}")
        pos = m.end()
        kind = m.lastgroup
        out.append((kind, m.group(kind)))
    return out


# ---------------- parser (precedence climbing) ----------------
class Parser:
    PREC = {"=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5}

    def __init__(self, toks):
        self.t, self.i = toks, 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else (None, None)

    def eat(self):
        tok = self.t[self.i]
        self.i += 1
        return tok

    def parse(self, minp=0):
        left = self.unary()
        while True:
            k, v = self.peek()
            if k == "op" and v in self.PREC and self.PREC[v] >= minp:
                self.eat()
                right = self.parse(self.PREC[v] + 1)
                left = ("bin", v, left, right)
            else:
                return left

    def unary(self):
        k, v = self.peek()
        if k == "op" and v in "+-":
            self.eat()
            return ("neg" if v == "-" else "pos", self.unary())
        return self.postfix()

    def postfix(self):
        node = self.primary()
        while self.peek() == ("op", "%"):
            self.eat()
            node = ("bin", "/", node, ("num", "100"))
        return node

    def primary(self):
        k, v = self.eat()
        if k == "num":
            return ("num", v)
        if k == "str":
            return ("str", v[1:-1].replace('""', '"'))
        if k == "ref":
            return ("ref", v)
        if k == "func":
            args = []
            if self.peek() == ("op", ")"):
                self.eat()
                return ("func", v, args)
            while True:
                args.append(self.parse())
                k2, v2 = self.eat()
                if v2 == ")":
                    break
                if v2 != ",":
                    raise ValueError("koma/kurung diharapkan")
            return ("func", v, args)
        if k == "op" and v == "(":
            e = self.parse()
            k2, v2 = self.eat()
            assert v2 == ")"
            return ("paren", e)
        raise ValueError(f"token tak terduga {k} {v}")


# ---------------- model sel ----------------
def split_ref(ref, cur_sheet):
    sheet = cur_sheet
    if "!" in ref:
        sh, ref = ref.rsplit("!", 1)
        sheet = sh.strip("'")
    ref = ref.replace("$", "")
    return sheet, ref


def cell_id(sheet, coord):
    return f"{SHEET_TO_CODE[sheet]}_{coord}"


class Gen:
    def __init__(self):
        self.cells = {}  # id -> ("formula", ast) | ("const", value)
        self.deps = {}
        self.tables_used = set()

    def emit_range_arg(self, node, cur):
        """Argumen rentang untuk SUMIFS: (tabel, kolom)."""
        assert node[0] == "ref"
        sheet, ref = split_ref(node[1], cur)
        m = re.match(r"([A-Z]+)\d+:([A-Z]+)\d+$", ref)
        assert m and m.group(1) == m.group(2), f"rentang kolom tunggal diharapkan: {ref}"
        assert sheet in SOURCES, f"sumber tak dikenal: {sheet}"
        return SOURCES[sheet], m.group(1)

    def expr(self, node, cur, deps):
        k = node[0]
        if k == "num":
            return node[1]
        if k == "str":
            return json.dumps(node[1], ensure_ascii=False)
        if k == "paren":
            return f"({self.expr(node[1], cur, deps)})"
        if k == "neg":
            return f"(-{self.expr(node[1], cur, deps)})"
        if k == "pos":
            return self.expr(node[1], cur, deps)
        if k == "bin":
            op, a, b = node[1], self.expr(node[2], cur, deps), self.expr(node[3], cur, deps)
            if op in "+-*":
                return f"({a} {op} {b})"
            if op == "/":
                return f"div({a}, {b})"
            if op == "^":
                return f"Math.pow({a}, {b})"
            if op == "&":
                return f"str({a}, {b})"
            return {"=": "eq", "<>": "ne", "<": "lt", ">": "gt", "<=": "le", ">=": "ge"}[op] + f"({a}, {b})"
        if k == "ref":
            sheet, ref = split_ref(node[1], cur)
            if ":" in ref:
                raise ValueError(f"rentang di luar fungsi: {node[1]}")
            if sheet not in SHEET_TO_CODE:
                raise ValueError(f"rujukan ke sheet non-laporan {sheet}!{ref}")
            cid = cell_id(sheet, ref)
            deps.add(cid)
            return cid
        if k == "func":
            return self.func(node[1], node[2], cur, deps)
        raise ValueError(k)

    def flat_args(self, args, cur, deps):
        out = []
        for a in args:
            if a[0] == "ref" and ":" in split_ref(a[1], cur)[1]:
                sheet, ref = split_ref(a[1], cur)
                if sheet not in SHEET_TO_CODE:
                    raise ValueError(f"rentang ke sheet non-laporan: {a[1]}")
                m = re.match(r"([A-Z]+)(\d+):([A-Z]+)(\d+)$", ref)
                c1, r1, c2, r2 = column_index_from_string(m.group(1)), int(m.group(2)), column_index_from_string(m.group(3)), int(m.group(4))
                ws = wf[sheet]
                for r in range(r1, r2 + 1):
                    for c in range(c1, c2 + 1):
                        coord = f"{get_column_letter(c)}{r}"
                        v = ws[coord].value
                        if v is None:
                            continue
                        if not (isinstance(v, str) and v.startswith("=")) and not isinstance(v, (int, float)):
                            continue
                        cid = cell_id(sheet, coord)
                        deps.add(cid)
                        out.append(cid)
            else:
                out.append(self.expr(a, cur, deps))
        return out

    def func(self, name, args, cur, deps):
        e = lambda n: self.expr(n, cur, deps)
        if name == "SUM":
            return f"sum({', '.join(self.flat_args(args, cur, deps))})"
        if name == "IF":
            assert len(args) == 3, "IF harus 3 argumen"
            return f"({e(args[0])} ? {e(args[1])} : {e(args[2])})"
        if name == "IFERROR":
            return f"iferror(() => {e(args[0])}, () => {e(args[1])})"
        if name == "ROUND":
            return f"xround({e(args[0])}, {e(args[1])})"
        if name == "ABS":
            return f"Math.abs({e(args[0])})"
        if name in ("MAX", "MIN"):
            return f"Math.{name.lower()}({', '.join(self.flat_args(args, cur, deps))})"
        if name in ("OR", "AND"):
            return "(" + (" || " if name == "OR" else " && ").join(e(a) for a in args) + ")"
        if name == "SUMIFS":
            table, col = self.emit_range_arg(args[0], cur)
            self.tables_used.add(table)
            crits = []
            for i in range(1, len(args), 2):
                t2, c2 = self.emit_range_arg(args[i], cur)
                assert t2 == table, "SUMIFS lintas tabel tidak didukung"
                crits.append(f"[{json.dumps(c2)}, {e(args[i + 1])}]")
            return f"sumifs(T.{table}, {json.dumps(col)}, [{', '.join(crits)}])"
        raise ValueError(f"fungsi tidak didukung: {name}")


gen = Gen()
layout = {}
order_meta = {}

for code, sheet in STATEMENTS.items():
    ws, wsv = wf[sheet], wv[sheet]
    rows = []
    for r in range(1, ws.max_row + 1):
        a = ws.cell(r, 1)
        label = wsv.cell(r, 1).value
        if label is None and isinstance(a.value, str) and a.value.startswith("="):
            # label berupa rujukan ke sel teks di sheet lain
            m = re.match(r"^='?([^'!]+)'?!([A-Z]+\d+)$", a.value)
            if m:
                label = wv[m.group(1)][m.group(2)].value
        cells = []
        for c in range(2, ws.max_column + 1):
            v = ws.cell(r, c).value
            if v is None:
                continue
            coord = f"{get_column_letter(c)}{r}"
            cid = f"{code}_{coord}"
            if isinstance(v, str) and v.startswith("="):
                ast = Parser(tokenize(v[1:])).parse()
                deps = set()
                ts = gen.expr(ast, sheet, deps)
                gen.cells[cid] = ts
                gen.deps[cid] = deps
                cells.append({"col": get_column_letter(c), "id": cid, "fmt": ws.cell(r, c).number_format})
            elif isinstance(v, (int, float)):
                gen.cells[cid] = repr(v)
                gen.deps[cid] = set()
                cells.append({"col": get_column_letter(c), "id": cid, "fmt": ws.cell(r, c).number_format})
            else:
                cells.append({"col": get_column_letter(c), "text": str(v)})
        if label is None and not cells:
            continue
        bold = bool(a.font and a.font.b)
        rows.append({"r": r, "label": None if label is None else str(label), "bold": bold, "cells": cells})
    layout[code] = {"sheet": sheet, "title": wsv.cell(1, 1).value, "subtitle": wsv.cell(2, 1).value, "rows": rows}

# urutan topologis
done, ordered, visiting = set(), [], set()


def visit(cid):
    if cid in done:
        return
    if cid in visiting:
        raise ValueError(f"siklus rujukan di {cid}")
    visiting.add(cid)
    for d in sorted(gen.deps.get(cid, ())):
        if d in gen.cells:
            visit(d)
        else:
            gen.cells[d] = "0"  # sel kosong dirujuk -> 0 seperti Excel
            gen.deps[d] = set()
            visit(d)
    visiting.discard(cid)
    done.add(cid)
    ordered.append(cid)


for cid in list(gen.cells):
    visit(cid)

lines = [
    "// GENERATED oleh tools/gen_statements.py dari workbook sumber. Jangan edit manual.",
    "// Setiap sel = terjemahan 1:1 dari rumus Excel (SUMIFS/IF/SUM/ROUND/OR/ABS/IFERROR).",
    "import { " + ", ".join(sorted(h for h in ("div", "eq", "ge", "gt", "iferror", "le", "lt", "ne", "str", "sum", "sumifs", "xround") if re.search(r"\b" + h + r"\(", " ".join(gen.cells.values())))) + " } from './excel';",
    "import type { Tables } from './types';",
    "",
    "export type CellValue = number | string;",
    "export type StatementCells = Record<string, CellValue>;",
    "",
    "export function computeStatements(T: Tables): StatementCells {",
]
for cid in ordered:
    lines.append(f"  const {cid} = {gen.cells[cid]};")
lines.append("  return {")
for i in range(0, len(ordered), 6):
    lines.append("    " + ", ".join(ordered[i : i + 6]) + ",")
lines.append("  };")
lines.append("}")
lines.append("")
lines.append("export interface LayoutCell { col: string; id?: string; text?: string; fmt?: string }")
lines.append("export interface LayoutRow { r: number; label: string | null; bold: boolean; cells: LayoutCell[] }")
lines.append("export interface StatementLayout { sheet: string; title: string; subtitle: string | null; rows: LayoutRow[] }")
lines.append("export const STATEMENT_LAYOUT: Record<string, StatementLayout> = " + json.dumps(layout, ensure_ascii=False, separators=(",", ":")) + ";")
lines.append("")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"ditulis {OUT}: {len(ordered)} sel, tabel dipakai: {sorted(gen.tables_used)}")
