/** Presentation is owned by Duet; the OS controls the outside notification chrome. */
export type PushCopy = { title: string; body: string };
export function formatPartnerPush(person: string, kind: string, eventBody: string): PushCopy {
  const title = 'Duet ♡';
  // Diagnostic queue events are injected only by the privileged backend.
  // They never imply that the partner sent a message or created a plan.
  if (kind === 'test') return { title: 'Teste de notificação do Duet ♡', body: 'Teste do Duet: confirme se este aviso apareceu no seu iPhone.' };
  if (kind === 'online') return { title, body: `${person} está por aqui! Que tal mandar um oi? 💗` };
  if (/enviou uma mensagem no chat/i.test(eventBody)) return { title, body: `${person} te mandou uma mensagem. Abre nossa conversa! 💌` };
  if (/referência/i.test(eventBody)) return { title, body: `${person} encontrou uma inspiração! Vamos descobrir juntos? ✨` };
  if (/avaliou uma referência/i.test(eventBody)) return { title, body: `${person} escolheu algo no Dream Match! ♡` };
  if (/assinou uma meta/i.test(eventBody)) return { title, body: `${person} assinou uma meta de vocês. Mais um passo! 💕` };
  if (/adicionou uma música/i.test(eventBody)) return { title, body: `${person} colocou uma música na trilha de vocês. 🎶` };
  return { title, body: `${person} trouxe novidades para os planos de vocês. ♡` };
}

// Little surprises unrelated to the planning/agenda area. No generative AI,
// external API or fabricated claims about the partner are used.
/** Only known, opt-in quick-answer formats appear on the partner's lock screen.
 * Ordinary chat messages always remain private ("you have a message"). */
export function formatQuickReplyPush(person: string, body: string): PushCopy | null {
  const title = 'Duet ♡';
  if (body.startsWith('Já bebeu água hoje? — ')) {
    if (body.includes('Sim, já bebi')) return { title, body: person + ' bebeu água hoje! Missão hidratação cumprida. 💧' };
    if (body.includes('Ainda não')) return { title, body: person + ' ainda não bebeu água. Que tal um lembrete carinhoso? 🥤' };
    if (body.includes('Não sei')) return { title, body: person + ' está investigando se já bebeu água hoje. 🕵️' };
  }
  if (body.endsWith(' — Ainda não sei') || body.endsWith(' — Nada planejado por enquanto')) {
    return { title, body: person + ' ainda está pensando num plano. Que tal escolherem juntos? ♡' };
  }
  return null;
}

export const sweetReminders = [
  'Boletim do Duet: hoje vale mandar um oi só porque sim. 💌',
  'Atenção: um abraço gostoso está oficialmente recomendado. 🤗',
  'O app foi convocado para lembrar que carinho não tem hora marcada. 💗',
  'Se saudade desse pontos, o Duet já tinha programa de fidelidade. ✨',
  'Aviso importante: beijinho não entra na lista de tarefas. Mas pode! 😚',
  'Uma pausa no mundo para lembrar que vocês têm um ao outro. 🌷',
  'Previsão não oficial: chance de abraço quando vocês se encontrarem. ☁️',
  'O Duet veio fazer uma pergunta séria: cadê o romance de hoje? 👀',
  'Seu bilhete de hoje: uma mensagem boba pode virar um sorriso. 💌',
  'Alerta de fofura ativado. Alguém merece um carinho surpresa. 💕',
  'Toc toc! É só o Duet deixando um coração por aqui. ♡',
  'O amor não pediu lembrete, mas o Duet apareceu mesmo assim. 😌',
  'Dica para hoje: um meme enviado com carinho também conta como declaração. 😂',
  'Um abraço imaginário acaba de sair da nossa central de fofura. 🤍',
  'Aviso do departamento de beijinhos: funcionamento todos os dias. 💋',
  'Pausa para uma pergunta aleatória: quem merece um cafuné hoje? ☕',
  'Não temos boletim de ocorrência, só boletim de saudade. 💌',
  'O Duet recomenda: compartilhe uma música que lembre vocês. 🎶',
  'Mini desafio: mande uma mensagem que arranque um sorriso do seu par. 😏',
  'Entre uma correria e outra, cabe um recadinho carinhoso. 🌼',
  'Uma curiosidade sobre casais: piadas internas merecem respeito. 😂',
  'O aplicativo declarou feriado imaginário para cafunés. 🫶',
  'O Duet está tentando ser discreto, mas vocês são muito fofos. ✨',
  'Uma notificação sem obrigação: só um coração passando. 💗',
  'Que tal compartilhar a melhor parte do seu dia? 🌤️',
  'Se hoje for cansativo, lembre que carinho não precisa de discurso. ♡',
  'Uma mensagem de dois segundos pode melhorar a tarde de alguém. 💌',
  'Atividade sugerida: escolher a foto mais engraçada dos dois. 📸',
  'Notícia urgente: o departamento de abraços segue trabalhando. 🤗',
  'O Duet não sabe dançar, mas recomenda uma música boa a dois. 🎧',
  'Lembrete totalmente não obrigatório: sorria ao lembrar do seu par. 😄',
  'Um pouquinho de atenção também é um presente. 🎁',
  'A ciência do Duet diz que risadinhas internas não têm preço. 😅',
  'Aquele bom-dia atrasado ainda pode virar boa-tarde carinhosa. 💕',
  'Não é cobrança, é só o Duet fazendo companhia no dia. 🌸',
  'Uma mensagem divertida pode ser o encontro de cinco segundos de hoje. 📱',
  'A fofoca do dia: um simples oi continua sendo uma ótima ideia. 👀',
  'Escolham uma música para a trilha sonora de hoje. 🎧',
  'Uma perguntinha: o que faria a nossa tarde mais gostosa? 🌤️',
  'Que tal compartilhar uma receita para testar juntos? 🍽️',
  'Vale combinar quem prepara o café da próxima vez. ☕',
  'Um lembrete de casal: a lista de compras não se faz sozinha. 🛒',
  'Vocês já decidiram o que vão assistir esta semana? 🎬',
  'Que tal escolher um passeio simples para o próximo dia livre? 🚶',
  'Hoje combina com uma piada interna que só vocês entendem. 😄',
  'Uma foto antiga pode render uma conversa muito boa. 📷',
  'Um recadinho gentil pode chegar na hora certa. 💬',
  'O Duet sugere: cinco minutos para planejar algo divertido. 🗓️',
  'Vale conferir se tem algum compromisso importante chegando. 📅',
  'Uma pergunta para os dois: qual comida bateu vontade hoje? 🥑',
  'Um pouquinho de descanso compartilhado também é programa. 🛋️',
  'Dois minutos para escolher uma sobremesa? 🍫',
  'Já contaram um ao outro a melhor parte do dia? ✨',
  'Um desafio simples: escolher um lugar novo para conhecer. 🧭',
  'Que tal deixar a roupa do passeio separada com antecedência? 👕',
  'Um bilhetinho surpresa nunca sai de moda. 💌',
  'O Duet aprovou um cafuné fora de hora. 🤍',
  'Lembrete leve: o plano mais gostoso pode ser ficar em casa. 🏡',
  'Que tal pensar no cardápio do próximo jantar? 🍝',
  'Hoje vale escolher uma lembrança favorita do casal. 🌷',
  'Vocês merecem conversar sobre o que querem fazer no fim de semana. ☀️',
  'Pausa rápida: que tal beber uma água e mandar um carinho? 💧',
  'A próxima música da playlist pode ser escolhida a dois. 🎶',
  'Uma ideia boba às vezes vira uma noite inesquecível. 🌙',
  'Boletim especial: um elogio sincero é sempre bem-vindo. 💗',
  'Já existe alguma tarefa da casa para dividir melhor? 🧺',
  'Que tal conferir os planos de amanhã juntos? 📆',
  'Sugestão do Duet: uma caminhada para conversar sem pressa. 🌿',
  'Vale reservar um tempinho para ver fotos antigas. 📸',
  'Uma pergunta diferente: qual foi a risada favorita da semana? 😂',
  'O Duet recomenda: escolher um filme de surpresa. 🍿',
  'Que tal mandar uma mensagem agradecendo uma coisa pequena? 💞',
  'Até um lanche improvisado pode virar encontro. 🥪',
] as const;

// The cron runs every ~20 minutes in São Paulo time, including overnight.
// Slots describe the requested frequency, not an extra daily quota.
// Idempotent IDs prevent the same slot being sent twice on scheduler retries.
export const reminderSlots = Array.from({ length: 24 * 3 }, (_, index) => {
  const hour = Math.floor(index / 3);
  const minute = (index % 3) * 20;
  return {
    id: 't' + String(hour).padStart(2, '0') + '-' + String(minute).padStart(2, '0'),
    hour, minute,
  };
});

/** São Paulo wall-clock slot; 72 eligible windows per full 24-hour day. */
export function currentReminderSlot(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const item = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const hour = Number(item('hour'));
  const minute = Number(item('minute'));
  const slot = reminderSlots[hour * 3 + Math.floor(minute / 20)];
  return slot ? { id: slot.id, date: `${item('year')}-${item('month')}-${item('day')}` } : null;
}

export function reminderMessage(day: string, slot: string, recipientSeed = ''): string {
  // Stable per recipient and slot: no duplicate within a day, no AI tokens.
  const seed = [...day + recipientSeed].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 17);
  const i = reminderSlots.findIndex(s => s.id === slot);
  const turn = i < 0 ? [...slot].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) : i * 7;
  return sweetReminders[(seed + turn) % sweetReminders.length]!;
}
