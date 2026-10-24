import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { curatedDreamResults, safeSocialPreviewUrl } from '@/lib/dream-discovery-index';
import { hasDreamPhoto, isDreamSourceUrl } from '@/lib/dream-match';

describe('keyless Instagram/Pinterest Dream Match photographs', () => {
  it('finds real photographed Pampulha venue posts without a paid search service', () => {
    const cards = curatedDreamResults('Locais', 'Pampulha');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(curatedDreamResults('Locais', 'Belo Horizonte').length).toBe(cards.length);
    for (const c of cards) {
      expect(isDreamSourceUrl(c.source_url,'Locais')).toBe(true);
      expect(safeSocialPreviewUrl(c.image,'Locais')).toBe(true);
      expect(c.title.trim().length).toBeGreaterThan(12);
      expect(c.description.trim().length).toBeGreaterThan(24);
    }
    expect(new Set(cards.map(c=>c.source_url)).size).toBe(cards.length);
  });
  it('shows verified Pinterest photo URLs for garden wedding inspirations', () => {
    const cards = curatedDreamResults('Decoração','jardim inglês');
    expect(cards.length).toBeGreaterThanOrEqual(3);
    for (const card of cards) {
      expect(isDreamSourceUrl(card.source_url,'Decoração')).toBe(true);
      expect(safeSocialPreviewUrl(card.image,'Decoração')).toBe(true);
    }
  });
  it('does not misrepresent curated cards as a live complete search for another city', () => {
    expect(curatedDreamResults('Locais','Tiradentes')).toEqual([]);
    expect(curatedDreamResults('Locais','Rio de Janeiro')).toEqual([]);
  });
  it('rejects injected or unrelated thumbnails and preserves the platform whitelist', () => {
    expect(safeSocialPreviewUrl('https://example.com/image.jpg','Locais')).toBe(false);
    expect(safeSocialPreviewUrl('https://lookaside.instagram.com.evil.test/seo/google_widget/crawler/?media_id=3882650950662597379','Locais')).toBe(false);
    expect(safeSocialPreviewUrl('http://i.pinimg.com/736x/ea/3e/57/ea3e57dde9e0f2f4c57a0474b6b3367f.jpg','Decoração')).toBe(false);
    expect(safeSocialPreviewUrl('https://i.pinimg.com/736x/ea/3e/57/ea3e57dde9e0f2f4c57a0474b6b3367f.jpg','Locais')).toBe(false);
  });
  it('makes original hosted thumbnails eligible for discover, Super Likes and matches', () => {
    const card = curatedDreamResults('Locais','Pampulha')[0]!;
    expect(hasDreamPhoto({ image_path:null, image_url: card.image, category:'Locais'})).toBe(true);
    expect(hasDreamPhoto({ image_path:null, image_url:null, category:'Locais'})).toBe(false);
  });
  it('presents thumbnails with credits and a publisher embed fallback', () => {
    const media = readFileSync('src/components/dream-media.tsx','utf8');
    const source = readFileSync('src/lib/duet.functions.ts','utf8');
    expect(media).toContain('DreamSearchPhoto');
    expect(media).toContain('onError={() => setFailed(true)}');
    expect(media).toContain('<DreamPlatformPreview sourceUrl={sourceUrl} category={category}/>');
    expect(source).toContain('curatedDreamResults(data.category, region)');
    expect(source).toContain('preview_url');
    expect(source).toContain('safeSocialPreviewUrl');
    expect(source).not.toContain('getCuratedWeddingVenues');
  });
});
