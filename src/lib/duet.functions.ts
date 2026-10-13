import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const nameLogin = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ person: z.enum(['Daniel', 'Letícia']), password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: member } = await supabaseAdmin.from('couple_members').select('user_id').eq('person', data.person).maybeSingle();
    if (!member) return { session: null, error: 'Conta ainda não configurada ou senha incorreta.' };
    const { data: account } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key || !account.user?.email) return { session: null, error: 'Não foi possível entrar.' };
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInWithPassword({ email: account.user.email, password: data.password });
    return { session: result.data.session, error: result.error ? 'Conta ainda não configurada ou senha incorreta.' : null };
  });

export const findReferences = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ category: z.string().max(50), region: z.string().max(100) }))
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase.from('couple_members').select('person').eq('user_id', context.userId).maybeSingle();
    if (!member) throw new Error('Acesso reservado a Daniel e Letícia.');
    const key = process.env['FIRECRAWL_API_KEY'];
    const auth = process.env['LOVABLE_API_KEY'];
    if (!key || !auth) return { results: [], error: 'Pesquisa indisponível. Verifique a conexão de pesquisa.' };
    const query = data.category === 'Locais' ? `locais casamento ${data.region || 'Capitólio Tiradentes Ouro Preto MG Serra Guarapari Vitória ES Búzios Petrópolis RJ Ilhabela SP'} site oficial` : `${data.category} casamento English Garden ${data.region} referências reais`;
    const response = await fetch('https://connector-gateway.lovable.dev/firecrawl/v2/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key },
      body: JSON.stringify({ query, limit: 8, lang: 'pt-br' }),
    });
    if (!response.ok) return { results: [], error: `Pesquisa indisponível (${response.status}). Tente novamente mais tarde ou confira os créditos do serviço.` };
    const body = await response.json() as { success?: boolean; data?: { web?: { title: string; url: string; description?: string }[] } | { title: string; url: string; description?: string }[] };
    const items = Array.isArray(body.data) ? body.data : body.data?.web ?? [];
    return { results: items.filter(item => item.url.startsWith('https://')).map(item => ({ title: item.title, source_url: item.url, description: item.description ?? '' })), error: null };
  });