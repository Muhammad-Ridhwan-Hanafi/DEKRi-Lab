/** Kolom nominal terakhir yang difokuskan di halaman (di luar kalkulator), agar hasil hitung bisa dimasukkan ke sana. */
let last: HTMLInputElement | null = null;

const eligible = (el: EventTarget | null): el is HTMLInputElement =>
  el instanceof HTMLInputElement && el.inputMode === 'numeric' && !el.closest('[data-calculator]');

export function trackLastField(): () => void {
  const onFocus = (e: FocusEvent) => {
    if (eligible(e.target)) last = e.target;
  };
  document.addEventListener('focusin', onFocus);
  return () => document.removeEventListener('focusin', onFocus);
}

/** Isi kolom nominal terakhir dengan bilangan bulat rupiah. Mengembalikan false bila tidak ada kolom yang layak. */
export function insertIntoLastField(n: number): boolean {
  if (!last || !last.isConnected || last.disabled || last.readOnly) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(last, String(Math.round(n)));
  last.dispatchEvent(new Event('input', { bubbles: true }));
  last.focus();
  return true;
}
