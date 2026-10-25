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
    version: '2.8.4', date: '2026-10-25', title: 'Dream Match pesquisa sozinho',
    kind: 'Melhorias',
    highlights: [
      'Digite qualquer cidade, bairro, destino ou região: o Dream Match faz várias buscas automáticas mantendo exatamente o local escolhido.',
      'Resultados com fotografias públicas do Instagram para locais e do Pinterest para decorações aparecem diretamente no aplicativo, sem catálogos fixos de outras regiões.',
      'Se a primeira pesquisa não encontrar fotos, o sistema amplia os termos e procura novas publicações automaticamente, removendo repetições.',
      'Toque em Curtir ou Super Like para salvar a inspiração, sua foto original e o voto de uma vez só, sem copiar links ou enviar arquivos.',
      'Busca e decisão não dependem de cadastro manual; quando não existir mídia pública acessível, o Duet informa a indisponibilidade sem inventar lugares ou fotos.',
    ],
  },
  {
    version: '2.8.3', date: '2026-10-24', title: 'Qualquer lugar, novas descobertas',
    kind: 'Melhorias',
    highlights: [
      'A pesquisa de fotos do Dream Match agora tenta buscar novas localidades em tempo real usando o modo gratuito do Firecrawl, mesmo sem chave configurada.',
      'Busque bairro, cidade, região ou país: resultados de locais continuam restritos ao Instagram e decoração a Pins do Pinterest.',
      'A pesquisa une resultados de páginas e imagens públicas, preserva a publicação original e usa sua miniatura quando disponível.',
      'A busca gratuita tem um limite diário por IP; se ele for atingido, o Duet oferece a pesquisa visual diretamente nas plataformas.',
      'Menos requisições de metadados por busca, para preservar os limites gratuitos e manter a interface rápida.',
    ],
  },
  {
    version: '2.8.2', date: '2026-10-24', title: 'Buscar inspirações em qualquer lugar',
    kind: 'Melhorias',
    highlights: [
      'A pesquisa do Dream Match aceita o nome completo de qualquer cidade, bairro, região ou país.',
      'Acesso à busca de imagens do Instagram filtradas para cada região e à busca de Pins do Pinterest para decoração.',
      'Em locais ainda fora do catálogo inicial, agora mostramos um caminho real para pesquisar, em vez de resultados fixos de outra cidade.',
      'As fotos encontradas podem ser vinculadas a uma nova referência pelo formulário de publicação, com a fonte original preservada.',
      'A busca totalmente automática dentro do Duet continua dependendo da integração do serviço de pesquisa no Render.',
    ],
  },
  {
    version: '2.8.1', date: '2026-10-24', title: 'Dream Match com fotos de verdade',
    kind: 'Correções',
    highlights: [
      'A busca de Pampulha agora oferece resultados públicos do Instagram com fotos, mesmo quando o serviço de pesquisa externa não está configurado.',
      'Sugestões visuais de decoração do Pinterest também ficam disponíveis no catálogo inicial, com prévias públicas.',
      'Miniaturas públicas do Instagram e Pinterest podem ser salvas no Dream Match como links de mídia, sem copiar fotografias de terceiros.',
      'Caso uma miniatura não carregue, o Duet tenta exibir a incorporação original; você também pode anexar uma foto autorizada.',
      'Busca externa direta de Instagram ou Pinterest disponível dentro do fluxo, sem mensagens técnicas sobre chaves de API.',
    ],
  },
  {
    version: '2.8.0', date: '2026-10-23', title: 'Dream Match de verdade ♡',
    kind: 'Novidades',
    highlights: [
      'Dream Match agora tem três áreas distintas: Descobrir, Super Likes e Matches do casal, além de Histórico.',
      'O Super Like guarda uma inspiração favorita individual sem presumir que o parceiro concordou.',
      'Um Match aparece no seu espaço próprio somente depois de dois likes.',
      'Busca de locais restrita a publicações e perfis públicos do Instagram; decoração restrita a Pins do Pinterest.',
      'Nenhuma referência nova entra no swipe sem fotografia; itens antigos sem imagem ficam na aba Sem foto para recuperar.',
      'Fotos do casal ficam otimizadas no Supabase. Prévia pública do Instagram é usada quando disponível; Pins são mostrados pelo widget oficial e precisam de imagem autorizada para salvar.',
    ],
  },
  {
    version: '2.7.0', date: '2026-10-23', title: 'Todas as novidades, sempre pertinho',
    kind: 'Novidades',
    highlights: [
      'Aviso push de nova versão para cada integrante do casal, uma vez por lançamento.',
      'Janela flutuante automática ao entrar no Duet após uma atualização, com novidades desde a última versão vista.',
      'Nesta primeira visita, um resumo completo de tudo que chegou depois da migração para o novo Supabase.',
      'Confirmação individual de leitura e histórico de versões disponível a qualquer momento no perfil, no menu e na tela inicial.',
    ],
  },
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


/** The first-time release tour covers the improvements shipped AFTER moving
 * Duet's data off the original Lovable-managed Supabase. Later visits show
 * only release notes newer than the version acknowledged on this device. */
export const postMigrationHighlights = [
  {
    title: 'Juntos e planos compartilhados',
    items: [
      '22 ideias de atividades organizadas entre refeições, passeios, casa, bem-estar, organização e tempo a dois.',
      'Vocês podem criar propostas próprias, com data e horário, como “Guacamole hoje?”.',
      'Uma proposta só vira compromisso na Agenda e em Planos quando os dois dizem sim.',
      'Aceites, recusas e confirmações de acordo geram avisos próprios; a resposta do outro nunca é presumida.',
      'Propostas recusadas ou com data vencida ficam no Histórico, sem poluir o Juntos.',
      'Botão Reenviar notificação para lembrar quem ainda não respondeu, sem duplicar a proposta.',
      'Dream Match em Descobrir, Super Likes individuais, Matches confirmados pelos dois e Histórico separados.',
      'Locais descobertos pelo Instagram e decoração em Pins do Pinterest, com fotos obrigatórias e recuperação das referências antigas sem imagem.',
    ],
  },
  {
    title: 'Notificações e lembretes',
    items: [
      'Lembretes automáticos variados a cada aproximadamente 20 minutos, inclusive à noite, sem teto diário artificial no app.',
      'Sugestões do Juntos também chegam por push e abrem a decisão correspondente.',
      'Mensagens e novas entradas online recebem avisos prioritários, separados dos lembretes automáticos.',
      'O conteúdo da mensagem e o nome de quem enviou aparecem na prévia da push, conforme as permissões do iPhone.',
      'Mensagens recebidas com o Duet aberto aparecem em um aviso no topo, com atalho para o chat.',
      'Sons de clique, navegação, decisões e notificações foram ampliados e ajustados para o Safari.',
    ],
  },
  {
    title: 'Chat e presença',
    items: [
      'Status online/offline atualizado por presença em tempo real com verificação alternativa no servidor.',
      'O chat mostra quando a outra pessoa esteve online pela última vez.',
      'A conversa sempre abre na mensagem mais recente, sem abrir o teclado automaticamente.',
      'A lista de mensagens rola sozinha; a página atrás da janela fica parada.',
      'Balões, campo de envio e botões ganharam espaçamento e bordas mais arredondadas.',
    ],
  },
  {
    title: 'Temas e personalização',
    items: [
      'Os temas agora ficam divididos em Premium, Elegantes e Simples e são escolhidos individualmente.',
      'Barbie Glitter com cintilação, e Metallic Purple com roxo cromado e metal líquido.',
      'Black Diamond e Champagne Gold, com acabamento sofisticado de vidro e metal.',
      'Aqua Mercury, Opal Holographic e Midnight Stardust, cada um com sua própria animação.',
      'No total, são 16 opções de tema, com respeito às preferências de reduzir movimentos.',
    ],
  },
  {
    title: 'Perfil, fotos e navegação',
    items: [
      'Nova tela de perfil com foto maior, nome editável e atalhos para preferências.',
      'Fotos de perfil otimizadas antes do envio, com cache temporário para carregar mais rápido.',
      'Menu inferior flutuante e translúcido, com seleção animada no estilo liquid glass.',
      'Tocar novamente na aba atual leva a página ao topo, como nos aplicativos de celular.',
      'Áreas de toque, encaixe dos botões e espaço seguro do iPhone foram revisados.',
    ],
  },
  {
    title: 'Novidades do próprio Duet',
    items: [
      'Histórico de atualizações acessível pelo menu, perfil e tela inicial.',
      'Agora cada nova versão pode avisar vocês por push e abrir automaticamente uma janela de novidades.',
      'As novidades vistas ficam registradas por conta neste aparelho, sem repetir o mesmo aviso de abertura a cada visita.',
    ],
  },
] as const;

export function compareReleaseVersions(a: string, b: string): number {
  const parse = (value: string) => value.split('.').map(part => /^\d+$/.test(part) ? Number(part) : -1);
  const left = parse(a), right = parse(b);
  if (left.length !== 3 || right.length !== 3 || [...left, ...right].some(part => part < 0 || !Number.isFinite(part))) return 0;
  for (let i = 0; i < 3; i++) {
    if (left[i]! !== right[i]!) return left[i]! > right[i]! ? 1 : -1;
  }
  return 0;
}

export function newReleaseNotesSince(acknowledgedVersion: string | null): readonly ReleaseNote[] {
  if (!acknowledgedVersion) return releaseNotes;
  return releaseNotes.filter(note => compareReleaseVersions(note.version, acknowledgedVersion) > 0);
}

export function releaseAcknowledgementKey(userId: string): string {
  return 'duet:updates:last-read:' + userId;
}
