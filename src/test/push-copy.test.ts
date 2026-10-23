import { describe, expect, it } from 'vitest';
import { currentReminderSlot, formatPartnerPush, formatQuickReplyPush, formatChatPreviewPush, formatJuntosVotePush, reminderMessage, reminderSlots } from '@/lib/push-copy';

describe('Duet notification presentation', () => {
  it('does not repeat Duet/actor in notification title and formats partner presence', () => {
    expect(formatPartnerPush('Letícia', 'online', 'ficou online no Duet ♡')).toEqual({
      title: 'Duet ♡',
      body: 'Letícia está por aqui! Que tal mandar um oi? 💗',
    });
  });
  it('marks deliberate admin diagnostics as tests without inventing partner activity', () => {
    const notification = formatPartnerPush('Letícia', 'test', 'qa_push_delivery_20261023');
    expect(notification.title).toContain('Teste');
    expect(notification.body).toMatch(/confirme.*iPhone/);
    expect(notification.body).not.toMatch(/Letícia.*enviou/);
  });
  it('keeps message content private on the lock screen', () => {
    const result = formatPartnerPush('Daniel', 'addition', 'enviou uma mensagem no chat');
    expect(result.title).toBe('Duet ♡');
    expect(result.body).toMatch(/Daniel.*mensagem/);
  });
  it('personalizes only explicit quick replies, never arbitrary chat contents', () => {
    expect(formatQuickReplyPush('Letícia', 'Já bebeu água hoje? — Sim, já bebi 💗')?.body).toMatch(/Letícia.*bebeu água/);
    expect(formatQuickReplyPush('Daniel', 'Já bebeu água hoje? — Ainda não 😅')?.body).toMatch(/Daniel.*ainda não/);
    expect(formatQuickReplyPush('Letícia', 'Que passeio? — Ainda não sei')?.body).toMatch(/escolherem juntos/);
    expect(formatQuickReplyPush('Letícia', 'Mensagem secreta')).toBeNull();
  });
  it('shows the sender and the message text in the phone preview', () => {
    expect(formatChatPreviewPush('Letícia', 'Quero guacamole hoje 🥑')).toEqual({
      title: 'Letícia te mandou uma mensagem 💬',
      body: 'Quero guacamole hoje 🥑',
    });
    expect(formatChatPreviewPush('Daniel', 'Oi\n  tudo bem?').body).toBe('Oi tudo bem?');
    expect(formatChatPreviewPush('Daniel', 'x'.repeat(280)).body.length).toBe(198);
    expect(formatChatPreviewPush('Daniel', '   ').body).toBe('Nova mensagem no Duet.');
  });
  it('distinguishes a first yes, a final mutual agreement, and a decline', () => {
    expect(formatJuntosVotePush('Letícia', 'accepted', 'Guacamole hoje?').title).toMatch(/Letícia.*topou/);
    expect(formatJuntosVotePush('Letícia', 'accepted', 'Guacamole hoje?').body).toMatch(/falta sua resposta/);
    expect(formatJuntosVotePush('Daniel', 'agreed', 'Cinema').body).toMatch(/Agenda/);
    expect(formatJuntosVotePush('Daniel', 'declined', 'Cinema').body).toMatch(/Histórico/);
  });
  it('maintains exact 20-minute boundaries across midnight in São Paulo', () => {
    const samples = [
      ['2026-10-23T02:59:00Z', 't23-40', '2026-10-22'],
      ['2026-10-23T03:00:00Z', 't00-00', '2026-10-23'],
      ['2026-10-23T03:19:59Z', 't00-00', '2026-10-23'],
      ['2026-10-23T03:20:00Z', 't00-20', '2026-10-23'],
      ['2026-10-23T03:40:00Z', 't00-40', '2026-10-23'],
      ['2026-10-23T04:00:00Z', 't01-00', '2026-10-23'],
    ] as const;
    for (const [iso, id, date] of samples)
      expect(currentReminderSlot(new Date(iso))).toEqual({ id, date });
    expect(new Set(reminderSlots.map(slot => slot.id)).size).toBe(72);
  });
  it('has a varied message for every scheduled slot in one calendar day', () => {
    expect(reminderSlots).toHaveLength(72);
    const messages = reminderSlots.map(slot => reminderMessage('2026-10-23', slot.id, 'daniel'));
    expect(new Set(messages).size).toBe(72);
    expect(reminderMessage('2026-10-23', reminderSlots[0]!.id, 'daniel'))
      .not.toBe(reminderMessage('2026-10-24', reminderSlots[0]!.id, 'daniel'));
  });
  it('provides 72 twenty-minute slots over the full day without a daily ceiling', () => {
    expect(reminderSlots).toHaveLength(72);
    expect(currentReminderSlot(new Date('2026-10-20T06:00:00Z'))).toEqual({ id: 't03-00', date: '2026-10-20' }); // 03h Brazil
    expect(currentReminderSlot(new Date('2026-10-20T13:30:00Z'))).toEqual({ id: 't10-20', date: '2026-10-20' });
    expect(currentReminderSlot(new Date('2026-10-20T16:00:00Z'))).toEqual({ id: 't13-00', date: '2026-10-20' });
    expect(currentReminderSlot(new Date('2026-10-20T22:00:00Z'))).toEqual({ id: 't19-00', date: '2026-10-20' });
    expect(currentReminderSlot(new Date('2026-10-21T00:30:00Z'))).toEqual({ id: 't21-20', date: '2026-10-20' });
    expect(currentReminderSlot(new Date('2026-10-21T01:00:00Z'))).toEqual({ id: 't22-00', date: '2026-10-20' });
    expect(reminderMessage('2026-10-20','cafe','couple-a').length).toBeGreaterThan(12);
    expect(reminderMessage('2026-10-20','manha')).toBe(reminderMessage('2026-10-20','manha'));
  });
});
