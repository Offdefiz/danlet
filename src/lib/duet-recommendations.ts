/** Rank real catalog entries from the couple's choices, without fabricating venues or relying on AI. */
export function rankReferences<T extends { id: string; state: string; scenery: string; category: string }>(
  pending: T[],
  votes: Array<{ reference_id: string; user_id: string; liked: boolean }>,
  userId: string,
  catalog: T[],
): T[] {
  const liked = catalog.filter(item => votes.some(v => v.reference_id === item.id && v.user_id === userId && v.liked));
  const partnerLikes = new Set(votes.filter(v => v.user_id !== userId && v.liked).map(v => v.reference_id));
  const score = (item: T) =>
    (partnerLikes.has(item.id) ? 10 : 0) +
    liked.reduce((sum, previous) => sum +
      (item.category === previous.category ? 1 : 0) +
      (item.state && item.state === previous.state ? 3 : 0) +
      (item.scenery && item.scenery === previous.scenery ? 2 : 0), 0);
  return [...pending].sort((a, b) => score(b) - score(a));
}


/** Order discovered venues by the couple's saved likes. No AI calls or invented popularity metrics. */
export function rankDiscoveredVenues<T extends { title: string; description: string }>(
  results: T[],
  catalog: Array<{ id: string; title: string; description: string }>,
  votes: Array<{ reference_id: string; liked: boolean }>,
): T[] {
  const liked = new Set(votes.filter(v => v.liked).map(v => v.reference_id));
  const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cues = ['jardim', 'serra', 'natureza', 'rustico', 'pousada', 'montanha', 'ar livre',
    'historico', 'igreja', 'fazenda', 'praia', 'campo', 'vista', 'cachoeira',
    'lago', 'vila', 'piscina', 'capela', 'bosque', 'verde', 'intimista'];
  const weights = new Map<string, number>();
  for (const item of catalog) {
    if (!liked.has(item.id)) continue;
    const text = normalize(item.title + ' ' + item.description);
    for (const cue of cues) if (text.includes(cue)) weights.set(cue, (weights.get(cue) ?? 0) + 1);
  }
  if (!weights.size) return [...results];
  const score = (item: T) => {
    const text = normalize(item.title + ' ' + item.description);
    return [...weights].reduce((total, [cue, weight]) => total + (text.includes(cue) ? weight : 0), 0);
  };
  return [...results].sort((a, b) => score(b) - score(a));
}
