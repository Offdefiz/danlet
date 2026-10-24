/**
 * A zero-key, source-filtered hand-off for regions that do not have indexed
 * image results on the Duet server. This opens the public publisher search
 * instead of pretending a five-card starter catalogue is a general search.
 *
 * Full in-app search needs a configured search API on the Render server.
 */
export function socialImageSearchUrl(category: string, rawTerm: string): string {
  const term = rawTerm.trim().replace(/\s+/g, ' ').slice(0, 100);
  if (category === 'Decoração') {
    const q = [term, 'decoração casamento inspiração'].filter(Boolean).join(' ');
    const u = new URL('https://www.pinterest.com/search/pins/');
    u.searchParams.set('q', q);
    return u.toString();
  }
  const q = [
    'espaço para casamento eventos',
    term || 'Minas Gerais',
    'site:instagram.com',
  ].join(' ');
  const u = new URL('https://www.google.com/search');
  u.searchParams.set('tbm', 'isch');
  u.searchParams.set('hl', 'pt-BR');
  u.searchParams.set('q', q);
  return u.toString();
}

export function socialSearchSource(category: string): string {
  return category === 'Decoração' ? 'Pinterest' : 'Instagram';
}

export function needsLiveSearchConfig(mode: string, resultsCount: number): boolean {
  return mode === 'unavailable' && resultsCount === 0;
}
