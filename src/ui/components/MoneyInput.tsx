import { useEffect, useState } from 'react';
import { formatRupiah, parseRupiah } from '../../engine/money';

interface Props {
  value: number;
  onChange: (n: number) => void;
  label: string;
  className?: string;
  cell?: string;
}

/** Input nominal berformat Indonesia (1.250.000). Menyimpan bilangan bulat rupiah. */
export function MoneyInput({ value, onChange, label, className = '', cell }: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value ? formatRupiah(value) : '');
  useEffect(() => {
    if (!focused) setText(value ? formatRupiah(value) : '');
  }, [value, focused]);
  return (
    <input
      aria-label={label}
      data-cell={cell}
      inputMode="numeric"
      className={`num w-full ${className}`}
      value={text}
      placeholder="0"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const n = Math.max(0, parseRupiah(e.target.value));
        setText(e.target.value === '' ? '' : formatRupiah(n));
        onChange(n);
      }}
    />
  );
}
