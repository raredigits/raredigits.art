import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tooltip } from '../assets/charts/src/core/Tooltip.js';
import { defaultTheme } from '../assets/charts/src/core/theme.js';

const tick = () => new Promise(r => setTimeout(r, 0));

describe('Tooltip pin (opt-in)', () => {
  let host, tt;
  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
    tt = new Tooltip(host, defaultTheme);
  });

  it('hover show/hide behaves as before when nothing is pinned', () => {
    tt.show(10, 10, 'hello');
    expect(tt.el.classList.contains('is-visible')).toBe(true);
    expect(tt.el.classList.contains('is-pinned')).toBe(false);
    tt.hide();
    expect(tt.el.classList.contains('is-visible')).toBe(false);
  });

  it('ignores hover show/hide while pinned', () => {
    tt.pin(10, 10, '<a href="#x">proof</a>');
    tt.show(50, 50, 'hover');
    tt.hide();
    expect(tt.el.textContent).toBe('proof');
    expect(tt.el.classList.contains('is-visible')).toBe(true);
    expect(tt.isPinned).toBe(true);
  });

  it('closes on an outside pointerdown and on Escape, calling onClose once', async () => {
    const onClose = vi.fn();
    tt.pin(10, 10, 'a', { onClose });
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(tt.isPinned).toBe(true);          // the pinning click itself must not close it
    await tick();
    tt.el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(tt.isPinned).toBe(true);          // clicks inside keep it
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(tt.isPinned).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);

    tt.pin(10, 10, 'b');
    await tick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tt.isPinned).toBe(false);
    expect(tt.el.classList.contains('is-visible')).toBe(false);
  });

  it('re-pinning replaces the content and releases the previous onClose', () => {
    const first = vi.fn();
    tt.pin(10, 10, 'one', { onClose: first });
    tt.pin(20, 20, 'two');
    expect(first).toHaveBeenCalledTimes(1);
    expect(tt.el.textContent).toBe('two');
    expect(tt.isPinned).toBe(true);
  });
});
