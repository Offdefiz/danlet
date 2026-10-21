import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

export const Route = createFileRoute('/api/public/jobs/inspire')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const failure = await authenticateCronRequest(request);
        if (failure) return failure;
        const { sendDueInspirations } = await import('@/lib/reminders.server');
        return Response.json(await sendDueInspirations());
      },
    },
  },
});
