import { describe, expect, it, vi } from 'vitest';
import { dreamPhotoQueries, distinctDreamPhotoResults, findAutonomousDreamPhotos } from '@/lib/dream-auto-search';

const image = (id: string) =>
  'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=' + id;
const photo = (id: string, title = 'Espaço e paisagem') => ({
  title,
  url: 'https://www.instagram.com/p/' + id + '/',
  description: 'Publicação pública com fotos reais',
  image: image('3882650950662597379'),
});

describe('Dream Match automatic search: every user-supplied location', () => {
  it.each([
    'Pampulha',
    'Tiradentes, MG',
    'Ouro Preto',
    'São José dos Campos',
    'Santa Rita do Sapucaí',
    'Paris, França',
    'Roma, Itália',
    'Shinjuku, Tokyo',
    'Rua das Flores, Curitiba',
  ])('keeps %s across all queries instead of switching to a fixed city', place => {
    const queries = dreamPhotoQueries('Locais', place);
    expect(queries).toHaveLength(3);
    for (const query of queries) {
      expect(query).toContain(place);
      expect(query).toContain('site:instagram.com');
      if (place !== 'Pampulha') expect(query).not.toContain('Pampulha');
    }
  });
  it('continues automatically when the first result has no photos or only profiles', async () => {
    const search = vi.fn()
      .mockResolvedValueOnce([{ title: 'Perfil sem foto', url: 'https://www.instagram.com/venue/', description: '' }])
      .mockResolvedValueOnce([photo('LUGAR1234')]);
    const result = await findAutonomousDreamPhotos({
      category: 'Locais', place: 'Tiradentes, MG', search, minimumPhotos: 1,
    });
    expect(search).toHaveBeenCalledTimes(2);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.image).toContain('lookaside.instagram.com');
    expect(result.results[0]?.source_url).toBe('https://www.instagram.com/p/LUGAR1234/');
  });
  it('tries next variant if the provider temporarily fails', async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error('429')).mockResolvedValueOnce([photo('CASA1234')]);
    const result = await findAutonomousDreamPhotos({ category:'Locais', place:'Paris', search, minimumPhotos:1 });
    expect(result.blocked).toBe(true);
    expect(result.results.map(v=>v.title)).toEqual(['Espaço e paisagem']);
    expect(search).toHaveBeenCalledTimes(2);
  });
  it('accepts ONLY Pinterest Pin images for decoration, no text cards', async () => {
    const pin = {
      title: 'Jardim floral',
      url: 'https://fr.pinterest.com/pin/123456789/',
      description: 'Inspiração para decoração',
      image: 'https://i.pinimg.com/736x/ea/3e/57/ea3e57dde9e0f2f4c57a0474b6b3367f.jpg',
    };
    const search = vi.fn().mockResolvedValue([pin, photo('NOTAPIN'), {title:'Pin sem imagem',url:'https://www.pinterest.com/pin/22222/',description:''}]);
    const result = await findAutonomousDreamPhotos({category:'Decoração', place:'flores francesas', search, minimumPhotos:1});
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.source_url).toBe('https://www.pinterest.com/pin/123456789/');
    expect(result.results[0]?.image).toContain('i.pinimg.com');
  });
  it('deduplicates alternate URLs and refuses out-of-platform images', () => {
    const valid = {
      title: 'Casa', description: '', source_url: 'https://www.instagram.com/p/ABC123/',
      image: image('3882650950662597379'),
    };
    const duplicates = [{...valid}, {...valid, source_url:'https://instagram.com/p/ABC123/?utm_source=share'}];
    const filtered = distinctDreamPhotoResults([...duplicates, {...valid, source_url:'https://fake.instagram.com/p/ABC123/'},
      {...valid,image:'https://stock.example.com/photo.jpg'}], 'Locais');
    expect(filtered).toHaveLength(1);
  });
  it('does not invent an image for an unavailable or private place', async () => {
    const search = vi.fn().mockResolvedValue([{ title:'No image',url:'https://www.instagram.com/p/ABC/',description:'' }]);
    const result = await findAutonomousDreamPhotos({ category:'Locais', place:'some remote location',search, enrich:async()=>''});
    expect(result.results).toEqual([]);
    expect(search).toHaveBeenCalledTimes(3);
  });
});
