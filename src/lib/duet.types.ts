import type { Database } from '@/integrations/supabase/types';
export type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Person = 'Daniel' | 'Letícia';
export type Tab = 'home' | 'dream' | 'plans' | 'list' | 'profile' | 'calendar';
export const periods = ['Curto Prazo', 'Médio Prazo', 'Longo Prazo'];
export const categories = ['Locais', 'Decoração', 'Outras referências'];
export function partnerVote(votes: Row<'votes'>[], referenceId: string, userId: string) {
  return votes.find(v => v.reference_id === referenceId && v.user_id !== userId);
}
export function isMatch(votes: Row<'votes'>[], referenceId: string) {
  return votes.filter(v => v.reference_id === referenceId && v.liked).length === 2;
}