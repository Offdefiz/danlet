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
