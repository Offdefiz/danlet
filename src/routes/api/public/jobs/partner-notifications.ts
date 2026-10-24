import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

export const Route = createFileRoute('/api/public/jobs/partner-notifications')({
  server: { handlers: { POST: async ({ request }) => {
    const failure = await authenticateCronRequest(request);
    if (failure) return failure;
    const { drainPartnerPush } = await import('@/lib/notifications.server');
    const { sendReleaseAnnouncements } = await import('@/lib/release-announcements.server');
    const partnerSent = await drainPartnerPush();
    const release = await sendReleaseAnnouncements();
    return Response.json({ sent: partnerSent + release.sent, partnerSent, releaseSent: release.sent, releaseVersion: release.version });
  } } },
});