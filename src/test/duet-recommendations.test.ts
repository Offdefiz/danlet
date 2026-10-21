import { describe, expect, it } from 'vitest';
import { rankReferences } from '@/lib/duet-recommendations';

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
