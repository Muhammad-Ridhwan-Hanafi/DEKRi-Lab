// Tes pemformat ketikan kalkulator (assets/kalkulator-ketik.js) terhadap vektor bersama dengan tes Rust.
// Tanpa DOM dan tanpa paket tambahan: node tests/ui/kalkulator-ketik.cjs
'use strict';
const assert = require('assert');
const path = require('path');

const akar = path.resolve(__dirname, '..', '..');
const api = require(path.join(akar, 'crates/dekri-ui/assets/kalkulator-ketik.js'));
const vektor = require(path.join(akar, 'crates/dekri-ui/test-data/kalkulator-ketik.json'));

let jumlah = 0;
const sama = (f, c, label) => {
  assert.deepStrictEqual([f.text, f.caret], [c.text, c.pos], label);
  jumlah += 1;
};

for (const c of vektor.format) {
  sama(api.formatTyped(c.raw, c.caret), c, `format: ${c.nama} (${JSON.stringify(c.raw)} @${c.caret})`);
}

for (const c of vektor.delete) {
  const d = api.deleteAcross(c.value, c.caret, c.key);
  if (c.none) {
    assert.strictEqual(d, null, `delete: ${c.nama}`);
    jumlah += 1;
    continue;
  }
  assert.ok(d, `delete: ${c.nama} harus ditangani`);
  sama(api.formatTyped(d.raw, d.caret), c, `delete: ${c.nama}`);
}

// Idempoten: teks yang sudah berformat tidak berubah lagi. Inilah yang membuat Dioxus tidak menulis ulang kolom
// (dan kursor tidak melompat) setelah menerima nilai dari kolom.
for (const c of vektor.format) {
  sama(api.formatTyped(c.text, c.pos), c, `idempoten: ${c.nama}`);
}

// Acak terkendali: format dua kali sama dengan satu kali, dan titik ribuan tidak pernah mengubah angka.
let benih = 12345;
const acak = () => (benih = (benih * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const abjad = '0123456789,.+-*/xX()% 00';
for (let n = 0; n < 5000; n += 1) {
  const panjang = 1 + Math.floor(acak() * 14);
  let raw = '';
  for (let i = 0; i < panjang; i += 1) raw += abjad[Math.floor(acak() * abjad.length)];
  const caret = Math.floor(acak() * (raw.length + 1));
  const a = api.formatTyped(raw, caret);
  const b = api.formatTyped(a.text, a.caret);
  assert.deepStrictEqual(b, a, `acak tidak idempoten: ${JSON.stringify(raw)} @${caret}`);
  assert.ok(a.caret >= 0 && a.caret <= a.text.length, `kursor di luar teks: ${JSON.stringify(raw)} @${caret}`);
  const angka = (t) => t.replace(/\./g, '').replace(/[xX*]/g, '×').replace(/\//g, '÷');
  assert.strictEqual(angka(a.text), angka(raw).replace(/\./g, ''), `isi berubah selain titik: ${JSON.stringify(raw)}`);
  jumlah += 1;
}

console.log(`kalkulator-ketik: ${jumlah} pemeriksaan lulus`);
