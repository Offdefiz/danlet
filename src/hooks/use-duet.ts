import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDuet(userId: string) {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['duet', userId], queryFn: async () => {
    const member = await supabase.from('couple_members').select('*');
    if (member.error) throw member.error;
    if (!member.data.some(m => m.user_id === userId)) throw new Error('Esta conta não está vinculada ao casal.');
    const [records, references, votes, signatures, activity] = await Promise.all([
      supabase.from('records').select('*').order('created_at', { ascending: false }),
      supabase.from('references_catalog').select('*').order('created_at'),
      supabase.from('votes').select('*'), supabase.from('signatures').select('*'),
      supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    for (const r of [records, references, votes, signatures, activity]) if (r.error) throw r.error;
    return { members: member.data, records: records.data ?? [], references: references.data ?? [], votes: votes.data ?? [], signatures: signatures.data ?? [], activity: activity.data ?? [] };
  }, refetchOnWindowFocus: true });
  useEffect(() => {
    const channel = supabase.channel(`duet-${userId}`);
    for (const table of ['records', 'references_catalog', 'votes', 'signatures', 'activity']) channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void cache.invalidateQueries({ queryKey: ['duet', userId] }));
    channel.subscribe(status => { if (status === 'SUBSCRIBED') void cache.invalidateQueries({ queryKey: ['duet', userId] }); });
    const reconnect = () => void cache.invalidateQueries({ queryKey: ['duet', userId] });
    window.addEventListener('online', reconnect);
    return () => { void supabase.removeChannel(channel); window.removeEventListener('online', reconnect); };
  }, [cache, userId]);
  return query;
}