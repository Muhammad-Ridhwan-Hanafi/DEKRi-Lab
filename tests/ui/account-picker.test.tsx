// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPicker, matchRank } from '../../src/ui/components/AccountPicker';
import { COA } from '../../src/data';

afterEach(cleanup);

function Harness({ onPick }: { onPick: (c: string | null) => void }) {
  return <AccountPicker label="Akun uji" value={null} onChange={onPick} />;
}
const byName = (n: string) => COA.find((a) => a.name === n)!;

describe('pemilih akun', () => {
  it('"utang us" menempatkan Utang Usaha di atas Piutang Usaha', () => {
    const q = 'utang us';
    expect(matchRank(byName('Utang Usaha'), q)).toBeLessThan(matchRank(byName('Piutang Usaha'), q));
  });

  it('mengetik "utang us" lalu Enter memilih Utang Usaha, bukan Piutang Usaha', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<Harness onPick={onPick} />);
    await user.click(screen.getByLabelText('Akun uji'));
    await user.type(screen.getByLabelText('Akun uji'), 'utang us{Enter}');
    expect(onPick).toHaveBeenCalledWith(byName('Utang Usaha').code);
  });

  it('panah bawah/atas memindahkan sorotan dan Enter memilih akun yang disorot', async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<Harness onPick={onPick} />);
    const input = screen.getByLabelText('Akun uji');
    await user.click(input);
    const opts = () => screen.getAllByRole('option');
    expect(opts()[0].getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(opts()[2].getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowUp}');
    expect(opts()[1].getAttribute('aria-selected')).toBe('true');
    const second = opts()[1].textContent ?? '';
    await user.keyboard('{Enter}');
    expect(onPick).toHaveBeenCalledTimes(1);
    const code = onPick.mock.calls[0][0] as string;
    expect(second).toContain(code);
  });
});
