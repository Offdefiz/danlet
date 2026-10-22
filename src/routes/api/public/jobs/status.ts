import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

// Signed scheduler diagnostics. This is deliberately POST-only and returns
// coarse, non-personal statuses. Never expose project keys or user tokens.
export const Route = createFileRoute('/api/public/jobs/status')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const failure = await authenticateCronRequest(request);
        if (failure) return failure;
        const supabaseAdminConfigured = Boolean(
          process.env['SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY'],
        );
        const { firebasePushConfigured, assertFirebasePushReady } = await import('@/lib/push.server');
        const firebaseConfigured = firebasePushConfigured();
        let firebaseAuthenticated = false;
        let supabaseReachable = false;
        let registeredDevices: number | null = null;
        if (firebaseConfigured) {
          try {
            await assertFirebasePushReady();
            firebaseAuthenticated = true;
          } catch { /* no credentials or tokens are returned in diagnostics */ }
        }
        if (supabaseAdminConfigured) {
          try {
            const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
            const { error, count } = await supabaseAdmin.from('push_tokens')
              .select('token', { count: 'exact', head: true });
            if (!error) {
              supabaseReachable = true;
              registeredDevices = count ?? 0;
            }
          } catch { /* reveal only booleans */ }
        }
        return Response.json({
          supabaseAdminConfigured,
          supabaseReachable,
          firebaseConfigured,
          firebaseAuthenticated,
          registeredDevices,
        }, { headers: { 'Cache-Control': 'no-store' } });
      },
    },
  },
});
