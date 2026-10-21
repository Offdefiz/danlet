/** Presentation is owned by Duet; the OS controls the outside notification chrome. */
export type PushCopy = { title: string; body: string };
export function formatPartnerPush(person: string, kind: string, eventBody: string): PushCopy {
  const title = 'Duet ♡';
  if (kind === 'online') return { title, body: `${person} está por aqui! Que tal mandar um oi? 💗` };
  if (/enviou uma mensagem no chat/i.test(eventBody)) return { title, body: `${person} te mandou uma mensagem. Abre nossa conversa! 💌` };
  if (/referência/i.test(eventBody)) return { title, body: `${person} encontrou uma inspiração! Vamos descobrir juntos? ✨` };
  if (/avaliou uma referência/i.test(eventBody)) return { title, body: `${person} escolheu algo no Dream Match! ♡` };
  if (/assinou uma meta/i.test(eventBody)) return { title, body: `${person} assinou uma meta de vocês. Mais um passo! 💕` };
  if (/adicionou uma música/i.test(eventBody)) return { title, body: `${person} colocou uma música na trilha de vocês. 🎶` };
  return { title, body: `${person} trouxe novidades para os planos de vocês. ♡` };
}

export const sweetReminders = [
  'O que será que vocês vão sonhar juntos hoje? 💗',
  'Uma ideia nova pode virar a próxima história de vocês. ✨',
  'Que tal descobrir um lugar bonito no Dream Match? ♡',
  'Se o dia estiver corrido, um recadinho de carinho já vale. 💌',
  'Os planos mais lindos começam em pequenos passos. 🌷',
  'Vocês têm um cantinho só de vocês esperando. ♡',
  'Já viram as novidades dos planos do casal? 💕',
  'Uma musiquinha nova para a história de vocês? 🎶',
  'Seu par pode ter feito uma escolha que você vai amar. 💗',
] as const;

export const reminderSlots = [
  { id: 'manha', startHour: 9, endHour: 12 },
  { id: 'tarde', startHour: 13, endHour: 16 },
  { id: 'noite', startHour: 18, endHour: 21 },
] as const;

/** Up to three gentle reminders/day, never overnight (America/Sao_Paulo). */
export function currentReminderSlot(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const item = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const hour = Number(item('hour'));
  const slot = reminderSlots.find(s => hour >= s.startHour && hour < s.endHour);
  return slot ? { id: slot.id, date: `${item('year')}-${item('month')}-${item('day')}` } : null;
}

export function reminderMessage(day: string, slot: string): string {
  const seed = [...`${day}-${slot}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return sweetReminders[seed % sweetReminders.length]!;
}
