import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { socialImageSearchUrl, socialSearchSource, shouldOfferExternalDreamSearch } from '@/lib/dream-anywhere';

describe('Dream Match arbitrary-region search', () => {
  it.each([
    'Tiradentes, MG',
    'Santa Rita do Sapucaí',
    'São José dos Campos',
    'Paris, França',
    'Zona Sul do Rio de Janeiro',
  ])('preserves the full name of any place: %s', place => {
    const url = new URL(socialImageSearchUrl('Locais', place));
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toBe('www.google.com');
    expect(url.searchParams.get('tbm')).toBe('isch');
    expect(url.searchParams.get('q')).toContain(place);
    expect(url.searchParams.get('q')).toContain('site:instagram.com');
    expect(url.searchParams.get('q')).toContain('casamento');
  });
  it('restricts decoration searches to real Pinterest results with the entire phrase', () => {
    const url = new URL(socialImageSearchUrl('Decoração', 'jardim secreto com luzes'));
    expect(url.hostname).toBe('www.pinterest.com');
    expect(url.pathname).toBe('/search/pins/');
    expect(url.searchParams.get('q')).toContain('jardim secreto com luzes');
    expect(socialSearchSource('Decoração')).toBe('Pinterest');
    expect(socialSearchSource('Locais')).toBe('Instagram');
  });
  it('does not pretend a static catalog is a search for every city', () => {
    expect(shouldOfferExternalDreamSearch('unavailable', 0)).toBe(true);
    expect(shouldOfferExternalDreamSearch('curated', 5)).toBe(false);
    expect(shouldOfferExternalDreamSearch('live', 8)).toBe(false);
  });
  it('explains the provider limitation instead of displaying a technical API error', () => {
    const organizer = readFileSync('src/components/duet-organizer.tsx','utf8');
    expect(organizer).toContain('Onde quer descobrir lugares?');
    expect(organizer).toContain('chooseDiscovered(item, false)');
    expect(organizer).toContain('chooseDiscovered(item, true)');
    expect(organizer).not.toContain('Adicionar publicação encontrada');
    expect(organizer).not.toContain('FIRECRAWL_API_KEY');
  });
});
