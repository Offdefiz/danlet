/** Source-verified public posts with externally served thumbnails.
 * These are an explicitly labeled starter collection, NOT results from a
 * real-time search and NOT photo files hosted/copied by Duet.
 * Each pair of URLs was discovered as the same original post + thumbnail.
 * Search still uses Firecrawl for arbitrary queries when the app has a key.
 */
export type DreamSearchResult = {
  title: string;
  description: string;
  source_url: string;
  image: string;
};

const PAMPULHA_INSTAGRAM: readonly DreamSearchResult[] = [
  {
    title: 'CasaPampulha — salões e vista para a lagoa',
    description: 'Publicação da CasaPampulha com espaços climatizados, deck e vista para a Lagoa da Pampulha. Confira detalhes e disponibilidade no Instagram.',
    source_url: 'https://www.instagram.com/p/DWkLtarE6O4/',
    image: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3865265879718798264',
  },
  {
    title: 'CasaPampulha — casamento ao ar livre',
    description: 'Referência de cerimônia ao ar livre na CasaPampulha. Imagens e informações são de publicação pública do perfil do local.',
    source_url: 'https://www.instagram.com/p/DdcVW1qlrl-/',
    image: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3989157281921378511',
  },
  {
    title: 'LIAC Eventos — cerimônia ao pôr do sol',
    description: 'Inspiração de casamento na Pampulha em publicação de evento do LIAC. Consulte diretamente o local para confirmar características e valores.',
    source_url: 'https://www.instagram.com/p/DXh8oCuEx0p/',
    image: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3882650950662597379',
  },
  {
    title: 'CasaPampulha — celebração na área externa',
    description: 'Publicação sobre espaços abertos e infraestrutura da CasaPampulha, em Belo Horizonte.',
    source_url: 'https://www.instagram.com/p/DYA2CKfiJXG/',
    image: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3891347660791616499',
  },
  {
    title: 'Espaço de eventos na Pampulha — cerimônia',
    description: 'Foto de publicação pública de espaço para celebrações na Pampulha; confirme o nome e os serviços diretamente no post original.',
    source_url: 'https://www.instagram.com/reel/DR9yV6OkSw6/',
    image: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3986689687652956273',
  },
] as const;

const GARDEN_DECOR_PINTEREST: readonly DreamSearchResult[] = [
  {
    title: 'Muro inglês com flores e mesas rústicas',
    description: 'Painel de muro inglês com LED e elementos rústicos para inspirar a decoração do casamento.',
    source_url: 'https://www.pinterest.com/pin/333407178669984517/',
    image: 'https://i.pinimg.com/736x/ea/3e/57/ea3e57dde9e0f2f4c57a0474b6b3367f.jpg',
  },
  {
    title: 'Jardim vertical para cerimônia',
    description: 'Composição de parede verde com folhagens em referência visual do Pinterest.',
    source_url: 'https://br.pinterest.com/pin/411235009717519059/',
    image: 'https://i.pinimg.com/564x/2c/c6/c5/2cc6c5ab46136cb9ea880b7a2ce2b6cd.jpg',
  },
  {
    title: 'Decoração com muro inglês',
    description: 'Inspiração com painel verde de folhagens para casamento ou festa intimista.',
    source_url: 'https://br.pinterest.com/pin/569846159078846341/',
    image: 'https://i.pinimg.com/736x/e1/29/b5/e129b5ec68a08af582b1899281f640b5.jpg',
  },
  {
    title: 'Muro verde e folhagens de jardim',
    description: 'Referência visual de parede verde para recepção ou ambientação.',
    source_url: 'https://www.pinterest.com/pin/468796642464702600/',
    image: 'https://i.pinimg.com/564x/a3/75/0a/a3750a088d676feae7e3b17afce83e87.jpg',
  },
] as const;

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
export function curatedDreamResults(category: string, query: string): DreamSearchResult[] {
  const q = normalize(query);
  if (category === 'Locais' && (
    q.includes('pampulha') || q.includes('belo horizonte') || q === 'bh'
  )) return PAMPULHA_INSTAGRAM.map(item => ({ ...item }));
  if (category === 'Decoração' && (
    !q || /(jardim|ingles|rustic|folhag|verde|casamento|flor|natureza|painel|romantic)/.test(q)
  )) return GARDEN_DECOR_PINTEREST.map(item => ({ ...item }));
  return [];
}

/** Thumbnail is a *public external preview*, not an image licensed for
 * redistribution. Restrict hotlinks to publisher-owned photo hosts, and
 * require that the result's source is on the corresponding platform.
 * Never fetch user-provided URLs server-side with elevated credentials.
 */
export function safeSocialPreviewUrl(imageUrl: string | null | undefined, category: string): boolean {
  if (!imageUrl) return false;
  try {
    const u = new URL(imageUrl);
    if (u.protocol !== 'https:' || u.username || u.password) return false;
    if (category === 'Decoração') {
      return u.hostname === 'i.pinimg.com'
        && /^\/(?:236x|474x|564x|736x|originals)\/[\w/-]+\.(?:jpg|jpeg|png|webp)$/.test(u.pathname);
    }
    return u.hostname === 'lookaside.instagram.com'
      && u.pathname === '/seo/google_widget/crawler/'
      && /^\d{12,22}$/.test(u.searchParams.get('media_id') ?? '')
      || u.hostname.endsWith('.cdninstagram.com')
      && /\.(?:jpg|jpeg|png|webp)$/.test(u.pathname);
  } catch { return false; }
}
