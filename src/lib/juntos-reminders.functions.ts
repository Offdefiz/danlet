import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { brazilianToday } from '@/lib/duet-calendar';
import { makeProposalLink, canRemindPartner } from '@/lib/juntos-suggestions';

// A short technical debounce against accidental double taps. No daily cap.
const previousResend = new Map<string, number>();

/** Re-notify the other member about an EXISTING unanswered proposal. */
export const resendJuntosProposal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ proposalId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: members, error: membersError } = await context.supabase
      .from('couple_members').select('user_id, person');
    if (membersError) throw membersError;
    if (!members?.some(member => member.user_id === context.userId)) {
      throw new Error('Acesso reservado ao casal.');
    }
    const partner = members.find(member => member.user_id !== context.userId);
    if (!partner) throw new Error('O outro membro não está vinculado ao Duet.');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('couple_proposals').select('id, title, status, date')
      .eq('id', data.proposalId).maybeSingle();
    if (proposalError) throw proposalError;
    if (!proposal || !canRemindPartner(proposal, false, brazilianToday())) {
      throw new Error('Esta proposta já foi encerrada ou saiu da lista de pendências.');
    }
    const { data: answer, error: answerError } = await supabaseAdmin
      .from('couple_proposal_votes').select('user_id')
      .eq('proposal_id', proposal.id).eq('user_id', partner.user_id).maybeSingle();
    if (answerError) throw answerError;
    if (!canRemindPartner(proposal, Boolean(answer), brazilianToday())) throw new Error('Seu par já respondeu a essa proposta.');

    const key = context.userId + ':' + proposal.id;
    const now = Date.now();
    const previous = previousResend.get(key) ?? 0;
    if (now - previous < 20_000) {
      throw new Error('Aguarde alguns segundos para reenviar esta notificação.');
    }
    previousResend.set(key, now);
    try {
      const { pushTo } = await import('@/lib/push.server');
      const requester = members.find(member => member.user_id === context.userId)?.person ?? 'Seu par';
      const sent = await pushTo(
        [partner.user_id],
        requester + ' quer saber sua resposta ♡',
        proposal.title + ' — toque para responder no Juntos.',
        'juntos-reminder-' + proposal.id + '-' + now,
        makeProposalLink(proposal.id),
        'high',
      );
      if (sent === 0) previousResend.delete(key);
      return { sent, recipient: partner.person ?? 'seu par' };
    } catch (error) {
      previousResend.delete(key);
      throw error;
    }
  });
