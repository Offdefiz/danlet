/** Curated public venue sources when automatic search is unavailable.
 * This is a small, transparent fallback, not a live search or a verified booking directory.
 */
export type VenueSource = { title: string; url: string; description: string };

const TIRADENTES_VENUES: readonly VenueSource[] = [
  {
    title: 'Alma Serra Vila — eventos',
    url: 'https://almaserravila.com.br/eventos/',
    description: 'Pousada e espaço para eventos em Tiradentes. Consulte diretamente as condições para casamentos, datas e valores.',
  },
  {
    title: 'Espaço Raízes — Tiradentes',
    url: 'https://www.instagram.com/espacoraizesmg/',
    description: 'Espaço citado em relatos de casamentos realizados em Tiradentes. Confirme a operação atual, a estrutura e as datas disponíveis.',
  },
  {
    title: 'Pousada Brisa da Serra — casamentos',
    url: 'https://www.brisadaserra.com.br/casamentos',
    description: 'Pousada em Tiradentes com página oficial de casamentos boutique; consulte propostas, visitas e datas diretamente.',
  },
];

/** Only supply real, named sources for a specifically requested city; never invent results for other regions. */
export function getCuratedWeddingVenues(category: string, region: string): VenueSource[] {
  if (category !== 'Locais') return [];
  const normalized = region.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!/\btiradentes\b/.test(normalized)) return [];
  return TIRADENTES_VENUES.map(venue => ({ ...venue }));
}
