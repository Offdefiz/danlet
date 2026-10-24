/**
 * Duet release history lives in source control. Every user-visible
 * enhancement, new theme or bug fix must add a note when shipped.
 * Dates refer to the release, not the author's commit time.
 */
export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  kind: 'Novidades' | 'Melhorias' | 'Correções';
  highlights: readonly string[];
};
export const releaseNotes: readonly ReleaseNote[] = [
  {
    version: '2.6.0', date: '2026-10-23', title: 'Liquid Glass para o seu Duet',
    kind: 'Novidades',
    highlights: [
      'Novo menu inferior flutuante: cápsula translúcida com seleção de vidro líquido que desliza entre telas.',
      'Ao tocar de novo na aba atual, a página retorna suavemente ao topo, como nos apps para iPhone.',
      'Abrir o chat não exibe o teclado; ele só aparece quando você toca no campo de mensagem.',
      'Três novos Premium com efeitos animados: Aqua Mercury, Opal Holographic e Midnight Stardust.',
      'Ajustes de espaçamento, contraste, segurança de área no iPhone e suporte à opção Reduzir Movimento.',
    ],
  },
  {
    version: '2.5.1', date: '2026-10-23', title: 'Conversa mais fluida',
    kind: 'Melhorias',
    highlights: [
      'Chat abre sempre na última mensagem; só a conversa rola, sem mover a tela de trás.',
      'Última vez online do parceiro no topo da conversa, com horário de Brasília.',
      'Mensagem nova mostra uma notificação dentro do Duet, no topo, com o texto e atalho para o chat.',
      'Botões, campos e janelas mais arredondados e melhor alinhados nos celulares.',
    ],
  },
  {
    version: '2.5.0', date: '2026-10-23', title: 'O Duet ainda mais seu',
    kind: 'Novidades',
    highlights: [
      'Novidades: histórico de atualizações direto no perfil e no menu.',
      'Mensagens de chat mostram uma prévia do texto na push, com o nome de quem enviou.',
      'Notificações especiais quando um de vocês aceita ou recusa uma proposta do Juntos.',
      'Dois novos Premium: Black Diamond e Champagne Gold.',
      'Galeria de temas organizada em Premium, Elegantes e Simples.',
      'Perfil com foto ampliada, melhorias de carregamento e experiência focada no celular.',
    ],
  },
  {
    version: '2.4.0', date: '2026-10-23', title: 'O brilho chegou',
    kind: 'Novidades',
    highlights: [
      'Barbie Glitter: rosa brilhante com partículas delicadas.',
      'Metallic Purple: nosso tema lilás cromado, com liquid glass.',
      'Juntos: botão para reenviar uma proposta e status online aprimorado.',
    ],
  },
  {
    version: '2.3.0', date: '2026-10-23', title: 'Juntos com mais carinho',
    kind: 'Melhorias',
    highlights: [
      'Sugestões recusadas vão para o Histórico, sem poluir os planos pendentes.',
      'Online e mensagens passaram a ter prioridade nas notificações.',
      'Sons dos botões ajustados para funcionar melhor no Safari do iPhone.',
    ],
  },
  {
    version: '2.2.0', date: '2026-10-23', title: 'Ideias que viram planos',
    kind: 'Novidades',
    highlights: [
      'Propostas do Juntos viram compromissos apenas quando ambos dizem sim.',
      'Sugestões de refeições, lazer, casa e organização.',
      'Notificações automáticas programadas para cerca de 20 em 20 minutos.',
    ],
  },
] as const;
export const currentVersion = releaseNotes[0]!.version;
