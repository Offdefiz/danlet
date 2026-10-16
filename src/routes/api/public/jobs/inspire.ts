import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

export const Route = createFileRoute('/api/public/jobs/inspire')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const fail = await authenticateCronRequest(request);
        if (fail) return fail;
        const { pushTo, inspirations } = await import('@/lib/push.server');
        const msg = inspirations[new Date().getDate() % inspirations.length]!;
        const sent = await pushTo(null, 'Duet ♡', msg);
        return Response.json({ sent });
      },
    },
  },
});
