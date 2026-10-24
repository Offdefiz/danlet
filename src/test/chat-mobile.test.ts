import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatPartnerLastSeen } from '@/lib/duet-presence';
import { chatIsNearBottom, scrollChatToBottom } from '@/lib/chat-scroll';

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMock }));
import { showPartnerChatBanner } from '@/lib/chat-banners';

beforeEach(() => { vi.clearAllMocks(); });

describe('Native-feeling Duet chat', () => {
  it('scrolls only the internal list to the last message, never its outer page', () => {
    const list = { scrollTop: 0, scrollHeight: 1320, clientHeight: 360 };
    const page = { scrollTop: 210 };
    scrollChatToBottom(list);
    expect(list.scrollTop).toBe(1320);
    expect(page.scrollTop).toBe(210);
    expect(chatIsNearBottom(list)).toBe(true);
  });
  it('follows new messages only when the reader is near the bottom', () => {
    expect(chatIsNearBottom({ scrollTop: 470, scrollHeight: 1000, clientHeight: 360 })).toBe(false);
    expect(chatIsNearBottom({ scrollTop: 590, scrollHeight: 1000, clientHeight: 360 })).toBe(true);
  });
  it('presents the last partner heartbeat in São Paulo local time', () => {
    const now = new Date('2026-10-23T23:30:00Z');
    expect(formatPartnerLastSeen('2026-10-23T22:30:00Z', now)).toBe('Visto por último hoje às 19:30');
    expect(formatPartnerLastSeen('2026-10-22T22:30:00Z', now)).toBe('Visto por último ontem às 19:30');
    expect(formatPartnerLastSeen('2026-10-20T22:30:00Z', now)).toContain('20/10/2026');
    expect(formatPartnerLastSeen(null)).toContain('indisponível');
  });
  it('shows a top in-app banner with the received message and a working chat shortcut', () => {
    const handler = vi.fn();
    window.addEventListener('duet:open-chat', handler);
    expect(showPartnerChatBanner('Letícia', 'Vamos caminhar hoje? ♡ 987')).toBe(true);
    expect(showPartnerChatBanner('Letícia', 'Vamos caminhar hoje? ♡ 987')).toBe(false);
    expect(toastMock).toHaveBeenCalledTimes(1);
    const [title, options] = toastMock.mock.calls[0]!;
    expect(title).toContain('Letícia');
    expect(options).toMatchObject({
      description: 'Vamos caminhar hoje? ♡ 987', position: 'top-center',
      action: { label: 'Ver conversa' },
    });
    options.action.onClick();
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('duet:open-chat', handler);
  });
  it('keeps a dedicated scrollable list and fixed chat composer in mobile markup', () => {
    const chat = readFileSync('src/components/duet-extras.tsx', 'utf8');
    const css = readFileSync('src/styles.css', 'utf8');
    expect(chat).not.toMatch(/\\.scrollIntoView\\(/);
    expect(chat).toContain('ref={messagesRef}');
    expect(chat).toContain('scrollChatToBottom(list)');
    expect(chat).toContain('duet-chat-composer');
    expect(css).toContain('overscroll-behavior: contain');
    expect(css).toContain('body:has(.duet-chat-dialog[data-state="open"])');
    expect(css).toContain('touch-action: pan-y');
  });
});
