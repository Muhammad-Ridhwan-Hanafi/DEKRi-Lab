import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Perilaku dialog modal: fokus masuk ke dialog saat dibuka, Tab/Shift+Tab berputar di dalamnya,
 * dan fokus dikembalikan ke elemen pemicu saat ditutup.
 * Pasang `ref` pada elemen role="dialog" (bersama aria-modal="true").
 */
export function useDialog<T extends HTMLElement>(initialFocus?: RefObject<HTMLElement | null>): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = ref.current;
    const items = () =>
      root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement) : [];
    if (initialFocus?.current) initialFocus.current.focus();
    else (items()[0] ?? root)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !root) return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const active = document.activeElement;
      if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}
