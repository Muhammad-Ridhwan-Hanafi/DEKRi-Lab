// Membuat THIRD_PARTY_NOTICES.md dari berkas lisensi asli di node_modules. Jalankan: node tools/gen-notices.cjs
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const bundled = ['react', 'react-dom', 'scheduler', 'zustand', 'idb-keyval'];
const find = (dir) => fs.readdirSync(dir).find((n) => /^licen[cs]e(\.md|\.txt)?$/i.test(n));
let out = `# Pemberitahuan pihak ketiga

**Kode sumber** DEKRi Lab berlisensi MIT (lihat \`LICENSE\`); lisensi itu tidak otomatis mencakup logo, kasus, kunci jawaban, dan materi pembelajaran (lihat \`docs/LICENSING.md\`). Berkas ini mencantumkan perangkat lunak dan aset pihak ketiga yang **ikut terdistribusi** bersama aplikasi, beserta teks lisensinya. Dibuat otomatis oleh \`tools/gen-notices.cjs\` dari berkas lisensi asli di \`node_modules\`; jalankan ulang setelah mengubah dependensi produksi.

Daftar lengkap seluruh dependensi (termasuk alat build/uji yang TIDAK ikut terdistribusi) ada pada SBOM CycloneDX (\`npm sbom --sbom-format cyclonedx\`, dilampirkan pada rilis).

## 1. Pustaka yang tertanam dalam aplikasi

| Paket | Versi | Lisensi |
| --- | --- | --- |
`;
const body = [];
for (const n of bundled) {
  const d = path.join(root, 'node_modules', n);
  const j = JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8'));
  out += `| ${n} | ${j.version} | ${j.license} |\n`;
  body.push(`### ${n} ${j.version} (${j.license})\n\n\`\`\`text\n${fs.readFileSync(path.join(d, find(d)), 'utf8').trim()}\n\`\`\`\n`);
}
out += `\n## 2. Font Inter\n\nBerkas \`src/assets/fonts/inter-latin-wght.woff2\` (subset Latin dari Inter, The Inter Project Authors, https://github.com/rsms/inter) berlisensi SIL Open Font License 1.1. Font ini tertanam di aplikasi dan tidak dijual terpisah. Teks lisensi lengkap:\n\n\`\`\`text\n${fs.readFileSync(path.join(root, 'src/assets/fonts/OFL.txt'), 'utf8').trim()}\n\`\`\`\n`;
out += `\n## 3. Electron dan Chromium (hanya pada installer/EXE Windows)\n\nInstaller memuat runtime Electron (MIT) yang menyertakan Chromium dan banyak komponen lain. Teks lisensinya disertakan oleh Electron pada folder instalasi: \`LICENSE.electron.txt\` dan \`LICENSES.chromium.html\`. Jangan menghapus kedua berkas itu dari paket.\n`;
out += `\n## 4. Teks lisensi pustaka tertanam\n\n${body.join('\n')}`;
out += `\n## 5. Alat build dan uji (tidak terdistribusi)\n\nVite, Vitest, TypeScript, Tailwind CSS, Playwright, electron-builder, dan paket pengembangan lain dipakai hanya saat membangun/menguji dan tidak ikut dalam aplikasi. Lisensinya (terutama MIT, ISC, Apache-2.0, BSD, BlueOak-1.0.0, MPL-2.0 untuk axe-core dan lightningcss) tercantum di SBOM. Paket dev yang berlisensi WTFPL/CC0/Python-2.0/0BSD hanya dipakai oleh alat build.\n`;
fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), out);
console.log('ditulis', out.length, 'karakter');
