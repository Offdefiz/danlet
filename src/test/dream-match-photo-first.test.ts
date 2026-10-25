import { describe, expect, it } from 'vitest';
import { dreamCollections, hasDreamPhoto, isDreamSourceUrl, pinId, sourceForCategory } from '@/lib/dream-match';
import { readFileSync } from 'node:fs';

const photos = [
  { id: 'venue', image_path: 'person/dream-venue.jpg' },
  { id: 'decor', image_path: 'person/dream-decor.jpg' },
  { id: 'old', image_path: null },
];
const votes = [
  { reference_id: 'venue', user_id: 'daniel', liked: true, super_liked: true },
  { reference_id: 'venue', user_id: 'leticia', liked: true, super_liked: false },
  { reference_id: 'decor', user_id: 'daniel', liked: true, super_liked: true },
];

describe('Dream Match separate Super Likes and couple Matches', () => {
  it('keeps the Super Like personal and a Match mutual', () => {
    const daniel = dreamCollections(photos, votes, 'daniel');
    const leticia = dreamCollections(photos, votes, 'leticia');
    expect(daniel.favorites.map(ref => ref.id)).toEqual(['venue', 'decor']);
    expect(leticia.favorites).toEqual([]);
    expect(daniel.matches.map(ref => ref.id)).toEqual(['venue']);
    expect(leticia.matches.map(ref => ref.id)).toEqual(['venue']);
    expect(daniel.discovery).toEqual([]);
    expect(leticia.discovery.map(ref => ref.id)).toEqual(['decor']);
  });
  it('never displays an item without photo in discovery, favorite or match', () => {
    const result = dreamCollections(photos, votes, 'daniel');
    expect(result.photoPending.map(ref => ref.id)).toEqual(['old']);
    expect([...result.discovery,...result.favorites,...result.matches].every(hasDreamPhoto)).toBe(true);
  });
});

describe('Restricted social discovery without fake sources', () => {
  it('accepts only authentic public Instagram URLs for venues', () => {
    expect(sourceForCategory('Locais')).toBe('instagram');
    expect(isDreamSourceUrl('https://www.instagram.com/p/Abcd1234/', 'Locais')).toBe(true);
    expect(isDreamSourceUrl('https://www.instagram.com/reel/a-10_B/', 'Locais')).toBe(true);
    expect(isDreamSourceUrl('https://www.instagram.com/espacobonito/', 'Locais')).toBe(true);
    expect(isDreamSourceUrl('https://instagram.com.evil.test/p/AAAA/', 'Locais')).toBe(false);
    expect(isDreamSourceUrl('https://pinterest.com/pin/12345/', 'Locais')).toBe(false);
    expect(isDreamSourceUrl('http://www.instagram.com/p/aaaa/', 'Locais')).toBe(false);
    expect(isDreamSourceUrl('https://google.com/search?q=venues', 'Locais')).toBe(false);
  });
  it('accepts only genuine Pinterest Pin pages for decorations', () => {
    expect(sourceForCategory('Decoração')).toBe('pinterest');
    expect(isDreamSourceUrl('https://br.pinterest.com/pin/123456789/', 'Decoração')).toBe(true);
    expect(isDreamSourceUrl('https://fr.pinterest.com/pin/123456789/', 'Decoração')).toBe(true);
    expect(isDreamSourceUrl('https://es.pinterest.com/pin/123456789/', 'Decoração')).toBe(true);
    expect(isDreamSourceUrl('https://www.pinterest.com/pin/123456789/', 'Decoração')).toBe(true);
    expect(pinId('https://www.pinterest.com/pin/123456789/')).toBe('123456789');
    expect(isDreamSourceUrl('https://pinterest.com/search/pins/?q=flowers', 'Decoração')).toBe(false);
    expect(isDreamSourceUrl('https://www.instagram.com/p/AAAA/', 'Decoração')).toBe(false);
    expect(isDreamSourceUrl('https://pinterest.com.evil.test/pin/1234/', 'Decoração')).toBe(false);
  });
  it('uses official embedded Pinterest content instead of forbidden scraper', () => {
    const widget = readFileSync('src/components/dream-media.tsx','utf8');
    const server = readFileSync('src/lib/duet.functions.ts','utf8');
    expect(widget).toContain('https://assets.pinterest.com/js/pinit.js');
    expect(widget).toContain('data-pin-do="embedPin"');
    const autoSearch = readFileSync('src/lib/dream-auto-search.ts','utf8');
    expect(autoSearch).toContain('site:pinterest.com/pin/');
    expect(autoSearch).toContain('site:instagram.com');
    expect(server).toContain('findAutonomousDreamPhotos');
    expect(server).toContain('upload');
    expect(server).not.toContain('getCuratedWeddingVenues');
  });
});
