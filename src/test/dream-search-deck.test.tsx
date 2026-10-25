import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { DreamSearchDeck } from '@/components/dream-search-deck';
import { dreamSwipeDecision } from '@/lib/dream-swipe';
const item = {title:'Casa em Kyoto', description:'Foto pública', source_url:'https://www.instagram.com/p/ABC123/',image:'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3882650950662597379'};
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});
const photo = () => screen.getByAltText('Foto real da publicação: Casa em Kyoto');
describe('publication swipe deck',()=>{
  it('requires a deliberate swipe distance, including on narrow screens',()=>{
    expect(dreamSwipeDecision(79)).toBeNull(); expect(dreamSwipeDecision(-79)).toBeNull();
    expect(dreamSwipeDecision(80)).toBe('like'); expect(dreamSwipeDecision(-80)).toBe('pass');
  });
  it.each([['Passar','pass'], ['Curtir','like'], ['Super Like','super']] as const)('sends %s only after the real photo loaded',async(label,decision)=>{
    const onDecide=vi.fn().mockResolvedValue(true);
    render(<DreamSearchDeck items={[item]} category="Locais" busy={false} onDecide={onDecide} onSkipUnavailable={vi.fn()}/>);
    const button=screen.getByRole('button',{name:label+': '+item.title});
    expect(button).toBeDisabled(); fireEvent.click(button); expect(onDecide).not.toHaveBeenCalled();
    fireEvent.load(photo()); expect(button).toBeEnabled(); fireEvent.click(button);
    await waitFor(()=>expect(onDecide).toHaveBeenCalledWith(item,decision));
  });
  it('prevents duplicate choices while a save is in progress',async()=>{
    let finish!: (value:boolean)=>void;
    const onDecide=vi.fn(()=>new Promise<boolean>(resolve=>{finish=resolve;}));
    render(<DreamSearchDeck items={[item]} category="Locais" busy={false} onDecide={onDecide} onSkipUnavailable={vi.fn()}/>);
    fireEvent.load(photo());const button=screen.getByRole('button',{name:'Curtir: '+item.title});
    fireEvent.click(button);fireEvent.click(button);expect(onDecide).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();await act(async()=>finish(false));expect(button).toBeEnabled();expect(photo()).toBeInTheDocument();
  });
  it('offers reload, original source and non-voting skip on image failure',()=>{
    const skip=vi.fn(), onDecide=vi.fn();
    render(<DreamSearchDeck items={[item]} category="Locais" busy={false} onDecide={onDecide} onSkipUnavailable={skip}/>);
    fireEvent.error(photo());expect(screen.getByText(/Foto indisponível nesta tentativa/)).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeDisabled();
    expect(screen.getByRole('link',{name:'Publicação original'})).toHaveAttribute('href',item.source_url);
    fireEvent.click(screen.getByRole('button',{name:'Pular foto indisponível sem votar'}));expect(skip).toHaveBeenCalledWith(item);expect(onDecide).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Recarregar foto'}));fireEvent.load(photo());
    expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('does not load the next publication until it is the active card',()=>{
    render(<DreamSearchDeck items={[item,{...item,title:'Outra foto',source_url:'https://www.instagram.com/p/DEF456/'}]} category="Locais" busy={false} onDecide={vi.fn()} onSkipUnavailable={vi.fn()}/>);
    expect(screen.getAllByRole('img')).toHaveLength(1);expect(screen.queryByText('Outra foto')).toBeNull();
  });
  it('recognizes an image already loaded from the browser cache before effects run',()=>{
    vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(736);
    render(<DreamSearchDeck items={[item]} category="Locais" busy={false} onDecide={vi.fn()} onSkipUnavailable={vi.fn()}/>);
    expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('does not expire a successfully loaded image after twelve seconds',async()=>{
    vi.useFakeTimers();render(<DreamSearchDeck items={[item]} category="Locais" busy={false} onDecide={vi.fn()} onSkipUnavailable={vi.fn()}/>);
    fireEvent.load(photo()); await act(async()=>vi.advanceTimersByTime(12001));
    expect(photo()).toBeInTheDocument();expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('shows the image-unavailable fallback after a hung media request',async()=>{
    vi.useFakeTimers();render(<DreamSearchDeck items={[item]} category="Locais" busy={false} onDecide={vi.fn()} onSkipUnavailable={vi.fn()}/>);
    await act(async()=>vi.advanceTimersByTime(12001));expect(screen.getByText(/Foto indisponível nesta tentativa/)).toBeInTheDocument();
  });
});
