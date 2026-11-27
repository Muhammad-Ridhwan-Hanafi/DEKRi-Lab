#!/usr/bin/env python3
"""Membangun crates/dekri-ui/assets/main.css dari tools/css/input.css (Tailwind CLI, hanya saat pengembangan).
Hasilnya di-commit sehingga pengguna dan CI tidak perlu Node.js. Pemakaian: python3 tools/css/build.py <folder-tailwind-cli>"""
import base64, pathlib, subprocess, sys
root = pathlib.Path(__file__).resolve().parents[2]
tw = pathlib.Path(sys.argv[1]).resolve()
out = root / "crates/dekri-ui/assets/main.css"
subprocess.run([str(tw / "node_modules/.bin/tailwindcss"), "-i", str(root / "tools/css/input.css"), "-o", str(out), "--minify"], check=True, cwd=tw)
css = out.read_text()
font = base64.b64encode((root / "crates/dekri-ui/assets/inter-latin-wght.woff2").read_bytes()).decode()
css = css.replace("./assets/fonts/inter-latin-wght.woff2", "data:font/woff2;base64," + font)
out.write_text(css)
print(out, len(css))
