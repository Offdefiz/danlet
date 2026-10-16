import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifyPartner } from '@/lib/duet.functions';

const labels: Record<string, string> = { votes: 'avaliou uma referência no Dream Match', signatures: 'assinou uma meta', records: 'atualizou os planos de vocês' };

export function useDuet(userId: string) {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['duet', userId], queryFn: async () => {
    const member = await supabase.from('couple_members').select('*');
    if (member.error) throw member.error;
    if (!member.data.some(m => m.user_id === userId)) throw new Error('Esta conta não está vinculada ao casal.');
    const [records, references, votes, signatures, activity, profiles, messages] = await Promise.all([
      supabase.from('records').select('*').order('created_at', { ascending: false }),
      supabase.from('references_catalog').select('*').order('created_at'),
      supabase.from('votes').select('*'), supabase.from('signatures').select('*'),
      supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'), supabase.from('messages').select('*').order('created_at').limit(200),
    ]);
    for (const r of [records, references, votes, signatures, activity, profiles, messages]) if (r.error) throw r.error;
    return { members: member.data, records: records.data ?? [], references: references.data ?? [], votes: votes.data ?? [], signatures: signatures.data ?? [], activity: activity.data ?? [], profiles: profiles.data ?? [], messages: messages.data ?? [] };
  }, refetchOnWindowFocus: true });
  useEffect(() => {
    const channel = supabase.channel(`duet-${userId}`);
    for (const table of ['records', 'references_catalog', 'votes', 'signatures', 'activity', 'messages']) channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void cache.invalidateQueries({ queryKey: ['duet', userId] }));
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity' }, p => { const a = p.new as { actor_id: string; entity_type: string }; if (a.actor_id === userId && labels[a.entity_type]) void notifyPartner({ data: { body: labels[a.entity_type]! } }).catch(() => {}); });
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => { const m = p.new as { user_id: string; body: string }; if (m.user_id === userId) void notifyPartner({ data: { body: `💬 ${m.body.slice(0, 120)}` } }).catch(() => {}); });
    channel.subscribe(status => { if (status === 'SUBSCRIBED') void cache.invalidateQueries({ queryKey: ['duet', userId] }); });
    const reconnect = () => void cache.invalidateQueries({ queryKey: ['duet', userId] });
    window.addEventListener('online', reconnect);
    return () => { void supabase.removeChannel(channel); window.removeEventListener('online', reconnect); };
  }, [cache, userId]);
  return query;
}