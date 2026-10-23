import { toast } from 'sonner';
import { formatChatPreviewPush } from '@/lib/push-copy';

// Realtime and Firebase often report the same message within a few seconds.
// A short shared window prevents stacking two banners for one arrival.
const shown = new Map<string, number>();
const DEDUPE_MS = 15_000;

export function showDuetTopNotice(title: string, body: string, destination = '/'): boolean {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible' || !body.trim()) return false;
  const key = title.trim() + '\n' + body.trim();
  const now = Date.now();
  for (const [item, at] of shown) if (now - at > DEDUPE_MS) shown.delete(item);
  if (shown.has(key)) return false;
  shown.set(key, now);
  toast(title, {
    description: body,
    position: 'top-center',
    duration: 7200,
    className: 'duet-in-app-banner',
    action: {
      label: destination.includes('duet_view=chat') ? 'Ver conversa' : 'Abrir',
      onClick: () => {
        if (destination.includes('duet_view=chat')) window.dispatchEvent(new Event('duet:open-chat'));
        else if (destination !== '/') window.location.assign(destination);
      },
    },
  });
  return true;
}

export function showPartnerChatBanner(name: string, message: string): boolean {
  const preview = formatChatPreviewPush(name, message);
  return showDuetTopNotice(preview.title, preview.body, '/?duet_view=chat');
}
