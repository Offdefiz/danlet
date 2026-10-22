import { describe, it, expect } from 'vitest';
import { getCuratedWeddingVenues } from '@/lib/duet-venue-fallback';

describe('Dream Match venue fallback', () => {
  it('offers real, sourced venues for Tiradentes even when Firecrawl is unavailable', () => {
    const venues = getCuratedWeddingVenues('Locais', 'Tiradentes, MG');
    expect(venues).toHaveLength(3);
    expect(venues.map(v => v.title)).toEqual([
      'Alma Serra Vila — eventos',
      'Espaço Raízes — Tiradentes',
      'Pousada Brisa da Serra — casamentos',
    ]);
    for (const venue of venues) {
      expect(venue.url).toMatch(/^https:\/\//);
      expect(venue.description).toMatch(/consulte|confirme|verifique/i);
    }
  });

  it('only offers sourced entries for a relevant city and category', () => {
    expect(getCuratedWeddingVenues('Locais', 'TIRADENTES / Minas Gerais')).toHaveLength(3);
    expect(getCuratedWeddingVenues('Locais', 'Ouro Preto, MG')).toEqual([]);
    expect(getCuratedWeddingVenues('Locais', '')).toEqual([]);
    expect(getCuratedWeddingVenues('Decoração', 'Tiradentes, MG')).toEqual([]);
  });
});
