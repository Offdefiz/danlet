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
    description: 'Espaço divulgado para casamentos e eventos em Tiradentes. Confirme serviços e disponibilidade com o estabelecimento.',
  },
  {
    title: 'Pousada Brisa da Serra — guia de fornecedores',
    url: 'https://www.constancezahn.com/fornecedores/pousada-brisa-da-serra/',
    description: 'Referência pública de pousada para celebrações em Tiradentes. Verifique diretamente se recebe o evento desejado.',
  },
];

/** Only supply real, named sources for a specifically requested city; never invent results for other regions. */
export function getCuratedWeddingVenues(category: string, region: string): VenueSource[] {
  if (category !== 'Locais') return [];
  const normalized = region.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!/\btiradentes\b/.test(normalized)) return [];
  return TIRADENTES_VENUES.map(venue => ({ ...venue }));
}
