// Pemformat ketikan untuk kolom ekspresi kalkulator. Dimuat satu kali setiap kalkulator dibuka (extras.rs).
//
// Kolom ini milik DOM: Dioxus tidak mengikat atribut value-nya, jadi tidak ada penulisan ulang dari Rust yang
// bisa menimpa ketikan yang masih dalam perjalanan. Itu penyebab angka hilang dan kursor melompat ke akhir
// saat mengetik cepat atau menahan Backspace di tengah rumus. Titik ribuan dan kursor dirapikan di sini, pada
// kejadian "input" yang sama dan sebelum Dioxus membaca nilainya, sehingga teks yang sampai ke Rust sudah
// identik dengan hasil format Rust (Rust hanya menulis ke kolom lewat tulis_kolom, untuk tombol dan riwayat).
//
// Fungsi murni di bawah harus selalu sama dengan to_display, group_expr, dan reformat di
// crates/dekri-ui/src/extras.rs. Kesamaannya dijaga oleh crates/dekri-ui/test-data/kalkulator-ketik.json yang
// dibaca oleh tes Rust dan oleh tests/ui/kalkulator-ketik.cjs.
(function () {
  'use strict';

  const KALI = '×';
  const BAGI = '÷';
  const isDigit = (c) => c >= '0' && c <= '9';

  // Operator dalam bentuk tampilan: * x X menjadi ×, / menjadi ÷ (padanan to_display).
  function toDisplay(s) {
    return s.replace(/[*xX]/g, KALI).replace(/\//g, BAGI);
  }

  // Titik ribuan pada tiap angka bulat; bagian desimal (setelah koma) tidak disentuh (padanan group_expr).
  function groupExpr(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
      // Titik tepat setelah koma atau angka desimal bukan pemisah ribuan: dibiarkan (lihat group_expr).
      const prev = i > 0 ? s[i - 1] : '';
      const setelahDesimal = isDigit(prev) || prev === ',';
      if (!isDigit(s[i]) && !(s[i] === '.' && !setelahDesimal)) {
        out += s[i];
        i += 1;
        continue;
      }
      const start = i;
      let digits = '';
      while (i < s.length && (isDigit(s[i]) || s[i] === '.')) {
        if (s[i] !== '.') digits += s[i];
        i += 1;
      }
      if (digits === '') {
        out += s.slice(start, i);
        continue;
      }
      for (let k = 0; k < digits.length; k += 1) {
        if (k > 0 && (digits.length - k) % 3 === 0) out += '.';
        out += digits[k];
      }
      if (s[i] === ',') {
        out += ',';
        i += 1;
        while (i < s.length && isDigit(s[i])) {
          out += s[i];
          i += 1;
        }
      }
    }
    return out;
  }

  // Format teks hasil ketikan dan petakan kursor: kursor tetap berada setelah jumlah karakter bermakna
  // (bukan titik ribuan) yang sama seperti sebelum pemformatan (padanan reformat).
  function formatTyped(raw, caret) {
    const disp = toDisplay(raw);
    const upto = Math.max(0, Math.min(caret, disp.length));
    let sig = 0;
    for (let i = 0; i < upto; i += 1) if (disp[i] !== '.') sig += 1;
    const text = groupExpr(disp);
    let pos = 0;
    if (sig > 0) {
      let seen = 0;
      for (let j = 0; j < text.length; j += 1) {
        if (text[j] !== '.') seen += 1;
        pos = j + 1;
        if (seen === sig) break;
      }
    }
    return { text: text, caret: pos };
  }

  // Backspace tepat setelah titik ribuan, atau Delete tepat sebelumnya: hapus angka di seberang titik itu.
  // Kalau yang terhapus hanya titiknya, titik langsung dipasang ulang dan tombol terasa macet (Delete tidak
  // pernah maju). null = biarkan perilaku bawaan.
  function deleteAcross(value, caret, key) {
    let from;
    let to;
    if (key === 'Backspace' && caret >= 2 && value[caret - 1] === '.' && isDigit(value[caret - 2])) {
      from = caret - 2;
      to = caret;
    } else if (key === 'Delete' && value[caret] === '.' && isDigit(value[caret + 1] || '')) {
      from = caret;
      to = caret + 2;
    } else {
      return null;
    }
    return { raw: value.slice(0, from) + value.slice(to), caret: from };
  }

  const api = { toDisplay: toDisplay, groupExpr: groupExpr, formatTyped: formatTyped, deleteAcross: deleteAcross };
  if (typeof module === 'object' && module && module.exports) {
    module.exports = api;
    return;
  }

  function pasang(el) {
    if (el.__dkKetik) return;
    el.__dkKetik = true;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const kursor = () => (el.selectionStart == null ? el.value.length : el.selectionStart);
    const tulis = (f) => {
      if (f.text !== el.value) setValue.call(el, f.text);
      try {
        el.setSelectionRange(f.caret, f.caret);
      } catch (e) {
        /* kolom tidak mendukung seleksi */
      }
    };
    el.addEventListener('input', (e) => {
      if (e.isComposing) return;
      const raw = el.value;
      const f = formatTyped(raw, kursor());
      if (f.text !== raw) tulis(f);
    });
    el.addEventListener('keydown', (e) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (e.key === 'Delete' && e.shiftKey) return; // Shift+Delete = potong
      if (el.selectionStart !== el.selectionEnd) return;
      const d = deleteAcross(el.value, kursor(), e.key);
      if (!d) return;
      e.preventDefault();
      tulis(formatTyped(d.raw, d.caret));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  // Kolom baru ada di DOM sesaat setelah komponen dipasang; coba beberapa kali.
  let percobaan = 0;
  (function cari() {
    const el = document.querySelector('[data-calculator] input');
    if (el) {
      pasang(el);
      return;
    }
    percobaan += 1;
    if (percobaan < 40) setTimeout(cari, 25);
  })();
})();
