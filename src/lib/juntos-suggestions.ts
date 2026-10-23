import { brazilianToday } from '@/lib/duet-calendar';

/** Tiny, curated suggestions instead of generated messages about the couple. */
export const juntosIdeas = [
  { id: 'guacamole', category: 'Comidinhas', emoji: '🥑', title: 'Guacamole hoje?', time: '19:30' },
  { id: 'cozinhar', category: 'Comidinhas', emoji: '🍳', title: 'Vamos cozinhar juntos?', time: '19:00' },
  { id: 'jantar', category: 'Comidinhas', emoji: '🍝', title: 'Jantar especial em casa?', time: '20:00' },
  { id: 'pedir', category: 'Comidinhas', emoji: '🍕', title: 'Pedir uma comida gostosa?', time: '20:00' },
  { id: 'cafe', category: 'Comidinhas', emoji: '☕', title: 'Um café juntinhos?', time: '16:00' },
  { id: 'filme', category: 'Tempo a dois', emoji: '🎬', title: 'Filme ou série hoje?', time: '20:30' },
  { id: 'jogo', category: 'Tempo a dois', emoji: '🎲', title: 'Noite de jogo a dois?', time: '20:00' },
  { id: 'sem-celular', category: 'Tempo a dois', emoji: '💗', title: 'Uma hora só nossa, sem telas?', time: '20:00' },
  { id: 'caminhada', category: 'Bem-estar', emoji: '🌿', title: 'Uma caminhada juntos?', time: '18:00' },
  { id: 'descanso', category: 'Bem-estar', emoji: '🛋️', title: 'Vamos reservar um tempinho de descanso?', time: '20:00' },
  { id: 'mercado', category: 'Casa e rotina', emoji: '🛒', title: 'Precisamos passar no mercado?', time: '18:00' },
  { id: 'compras', category: 'Casa e rotina', emoji: '📝', title: 'Montar nossa lista de compras?', time: '19:00' },
  { id: 'arrumar', category: 'Casa e rotina', emoji: '🏡', title: 'Organizar a casa juntos?', time: '17:30' },
  { id: 'refeicoes', category: 'Casa e rotina', emoji: '🥗', title: 'Planejar as refeições da semana?', time: '18:30' },
  { id: 'agenda', category: 'Organização', emoji: '📆', title: 'Conferir nossos compromissos?', time: '19:30' },
  { id: 'contas', category: 'Organização', emoji: '💳', title: 'Olhar os gastos da semana?', time: '19:00' },
  { id: 'pendencias', category: 'Organização', emoji: '✅', title: 'Resolver uma pendência juntos?', time: '18:30' },
  { id: 'passeio', category: 'Passeios', emoji: '🚗', title: 'Planejar nosso próximo passeio?', time: '19:00' },
  { id: 'cinema', category: 'Passeios', emoji: '🍿', title: 'Cinema no fim de semana?', time: '20:00' },
  { id: 'date', category: 'Passeios', emoji: '🌷', title: 'Marcar um encontro especial?', time: '19:30' },
  { id: 'musica', category: 'Tempo a dois', emoji: '🎶', title: 'Ouvir músicas juntos?', time: '20:00' },
  { id: 'lembrancas', category: 'Tempo a dois', emoji: '📸', title: 'Escolher fotos e lembranças nossas?', time: '20:00' },
] as const;

export type JuntosIdea = (typeof juntosIdeas)[number];
export const proactiveProposalHours = [9, 11, 13, 15, 17, 19] as const;

export function dailyProposalSuggestion(day: string, hour: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !proactiveProposalHours.some(h => h === hour)) return null;
  const daySeed = Math.floor(Date.parse(day + 'T12:00:00Z') / 86_400_000);
  const index = ((daySeed + Math.floor((hour - 9) / 2) * 7) % juntosIdeas.length + juntosIdeas.length) % juntosIdeas.length;
  const idea = juntosIdeas[index]!;
  const targetHour = Math.min(21, Math.max(Number(idea.time.slice(0, 2)), hour + 1));
  const time = String(targetHour).padStart(2, '0') + ':' + (targetHour === Number(idea.time.slice(0, 2)) ? idea.time.slice(3) : '00');
  return { ...idea, date: day, time, dedupeKey: `auto:${day}:${hour}` };
}

export function makeProposalLink(id: string): string {
  return '/?' + new URLSearchParams({ duet_view: 'together', duet_proposal: id }).toString();
}
export function parseProposalLink(search: string): string | null {
  const id = new URLSearchParams(search).get('duet_proposal') || '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}
export function newSuggestionDate(now = new Date()) { return brazilianToday(now); }
