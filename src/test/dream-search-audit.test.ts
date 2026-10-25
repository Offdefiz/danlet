import { afterEach, describe, expect, it, vi } from 'vitest';
import { findAutonomousDreamPhotos } from '@/lib/dream-auto-search';
import { DreamSearchError, dreamSearchMessage } from '@/lib/dream-search-status';

const photo = { title: 'Local', url: 'https://www.instagram.com/p/ABC123/',
  image: 'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3882650950662597379' };

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('priority search regressions', () => {
  it('stops on 429 instead of issuing two more requests, preserving partial results', async () => {
    const search = vi.fn().mockResolvedValueOnce([photo]).mockRejectedValueOnce(new DreamSearchError('rate_limited', 120));
    const found = await findAutonomousDreamPhotos({ category: 'Locais', place: 'Kyoto 日本', search });
    expect(search).toHaveBeenCalledTimes(2);
    expect(found).toMatchObject({ searches: 2, issue: 'rate_limited', retryAfterSeconds: 120 });
    expect(found.results).toHaveLength(1);
    expect(dreamSearchMessage(found.issue, true)).toContain('fotos já encontradas');
  });
  it.each(['rate_limited', 'unauthorized'] as const)('does not change queries after %s on the first request', async code => {
    const search = vi.fn().mockRejectedValue(new DreamSearchError(code, 60));
    const found = await findAutonomousDreamPhotos({category:'Locais',place:'Ushuaia, Argentina',search});
    expect(found.results).toEqual([]); expect(search).toHaveBeenCalledOnce();
    expect(found.issue).toBe(code); expect(found.searches).toBe(1);
  });
  it('stops subsequent requests when metadata scraping reports a shared quota block', async () => {
    const search = vi.fn().mockResolvedValue([{...photo,image:undefined}, {...photo,url:'https://www.instagram.com/p/DEF456/'}]);
    const enrich = vi.fn().mockRejectedValue(new DreamSearchError('rate_limited', 300));
    const found = await findAutonomousDreamPhotos({category:'Locais',place:'Ilha remota', search, enrich});
    expect(search).toHaveBeenCalledOnce(); expect(enrich).toHaveBeenCalledOnce();
    expect(found.issue).toBe('rate_limited'); expect(found.results).toHaveLength(1);
  });
  it('retains Unicode places, rejects fake social media, and widens sparse results', async () => {
    const search = vi.fn().mockResolvedValue([{...photo,url:'https://instagram.com.evil.test/p/X/'}, {...photo,image:'https://example.com/stock.jpg'}]);
    const found = await findAutonomousDreamPhotos({category:'Locais',place:'京都 日本',search});
    expect(found.results).toEqual([]); expect(found.issue).toBeNull();
    expect(search).toHaveBeenCalledTimes(3);
    for (const [query, limit] of search.mock.calls) { expect(query).toContain('京都 日本'); expect(limit).toBe(10); }
    expect(dreamSearchMessage(null, false)).toContain('Não encontramos fotografias');
  });
  it('parses Retry-After seconds and dates, and never calls a rate limit free when a key is set', async () => {
    vi.resetModules();
    const { searchWeb } = await import('@/lib/firecrawl-direct.server');
    vi.stubEnv('FIRECRAWL_API_KEY','test-only');
    const fake = vi.fn().mockResolvedValue({ok:false,status:429,headers:new Headers({'Retry-After':'120'})});
    vi.stubGlobal('fetch',fake);
    await expect(searchWeb('audit retry seconds')).rejects.toMatchObject({code:'rate_limited',retryAfterSeconds:120});
    fake.mockResolvedValue({ok:false,status:429,headers:new Headers({'Retry-After':new Date(Date.now()+120_000).toUTCString()})});
    await expect(searchWeb('audit retry date')).rejects.toMatchObject({code:'rate_limited',retryAfterSeconds:expect.any(Number)});
    expect(dreamSearchMessage('rate_limited', false)).not.toContain('gratuita');
  });
  it('reports a failed 200 payload as unavailable instead of caching an empty success', async () => {
    vi.resetModules();
    const { searchWeb } = await import('@/lib/firecrawl-direct.server');
    const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>({success:false})}); vi.stubGlobal('fetch',fetch);
    await expect(searchWeb('audit false success')).rejects.toMatchObject({code:'provider_error'});
    await expect(searchWeb('audit false success')).rejects.toMatchObject({code:'provider_error'});
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('caches public queries and returns copies rather than allowing caller mutation', async () => {
    vi.resetModules();
    const { searchWeb } = await import('@/lib/firecrawl-direct.server');
    const fetch = vi.fn().mockResolvedValue({ok:true,json:async()=>({success:true,data:{web:[photo],images:[]}})}); vi.stubGlobal('fetch',fetch);
    const first = await searchWeb('Cache audit',10); first[0]!.title='mutated';
    expect((await searchWeb(' cache AUDIT ',10))[0]?.title).toBe('Local');
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('aborts a slow provider and returns a distinguishable timeout', async () => {
    vi.useFakeTimers(); vi.resetModules();
    const { searchWeb } = await import('@/lib/firecrawl-direct.server');
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve,reject) => options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))));
    const pending = expect(searchWeb('audit timeout')).rejects.toMatchObject({code:'timeout'});
    await vi.advanceTimersByTimeAsync(14000); await pending;
  });
});
