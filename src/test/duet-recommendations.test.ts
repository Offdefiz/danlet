import { describe, expect, it } from 'vitest';
import { rankReferences, rankDiscoveredVenues } from '@/lib/duet-recommendations';

const refs = [
  { id: 'a', category: 'Locais', state: 'MG', scenery: 'Jardim' },
  { id: 'b', category: 'Locais', state: 'RJ', scenery: 'Praia' },
  { id: 'c', category: 'Locais', state: 'MG', scenery: 'Jardim' },
];
describe('Dream Match recommendations', () => {
  it('prioritizes locations matching prior likes and partner interest', () => {
    const votes = [
      { reference_id: 'a', user_id: 'daniel', liked: true },
      { reference_id: 'c', user_id: 'leticia', liked: true },
    ];
    const ranked = rankReferences([refs[1]!, refs[2]!], votes, 'daniel', refs);
    expect(ranked.map(r => r.id)).toEqual(['c','b']);
  });
  it('never creates venues or modifies original catalog', () => {
    const pending = [refs[1]!, refs[0]!];
    const ranked = rankReferences(pending, [], 'daniel', refs);
    expect(ranked).toEqual(pending);
    expect(ranked).not.toBe(pending);
  });
});

describe('New venue discoveries without generative AI', () => {
  const venues = [
    { title: 'Espaço Praia', description: 'Cerimônia à beira-mar' },
    { title: 'Casa Jardim', description: 'Jardim rústico e vista para serra' },
  ];

  it('uses saved likes to prefer matching venue styles', () => {
    const previous = [{ id: 'liked', title: 'Jardim da Serra', description: 'Casamento rústico, natureza e montanha' }];
    const votes = [{ reference_id: 'liked', liked: true }];
    const ordered = rankDiscoveredVenues(venues, previous, votes);
    expect(ordered[0]?.title).toBe('Casa Jardim');
  });

  it('preserves the external sources and ranking when preferences are unknown', () => {
    const ordered = rankDiscoveredVenues(venues, [], []);
    expect(ordered).toEqual(venues);
    expect(ordered).not.toBe(venues);
  });
});
