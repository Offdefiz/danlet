import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { DreamSwipeDeck } from '@/components/dream-swipe-deck';
vi.mock('framer-motion',async importOriginal=>({...await importOriginal<typeof import('framer-motion')>(),useReducedMotion:()=>true}));
const item={title:'Casa em Kyoto',description:'Foto pública',source_url:'https://www.instagram.com/p/ABC123/',image:'https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3882650950662597379'};
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});
const photo=()=>screen.getByAltText(item.title);
function setup(onChoose=vi.fn().mockResolvedValue(false), skip=vi.fn()){
  render(<DreamSwipeDeck items={[item]} category="Locais" onChoose={onChoose} onMore={vi.fn()} onSkipUnavailable={skip}/>);return {onChoose,skip};
}
describe('main swipe deck photo availability',()=>{
  it.each([['Passar','skip'],['Curtir','like'],['Super Like','superlike']] as const)('gates %s on image load and sends the corresponding decision',async(label,decision)=>{
    const {onChoose}=setup();const button=screen.getByRole('button',{name:label+': '+item.title});
    expect(button).toBeDisabled();fireEvent.click(button);expect(onChoose).not.toHaveBeenCalled();
    fireEvent.load(photo());fireEvent.click(button);await waitFor(()=>expect(onChoose).toHaveBeenCalledWith(item,decision));
  });
  it('prevents duplicate decisions and permits retry after failed save',async()=>{
    let finish!:(value:boolean)=>void;const onChoose=vi.fn(()=>new Promise<boolean>(resolve=>{finish=resolve;}));setup(onChoose);
    fireEvent.load(photo());const button=screen.getByRole('button',{name:'Curtir: '+item.title});fireEvent.click(button);fireEvent.click(button);
    expect(onChoose).toHaveBeenCalledOnce();expect(button).toBeDisabled();await act(async()=>finish(false));expect(button).toBeEnabled();expect(photo()).toBeInTheDocument();
  });
  it('shows failed media fallback, reload and a skip that does not vote',()=>{
    const {skip,onChoose}=setup();fireEvent.error(photo());expect(screen.getByText('Abrindo publicação original…')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Pular publicação sem votar'}));expect(skip).toHaveBeenCalledWith(item);expect(onChoose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Recarregar foto'}));fireEvent.load(photo());expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('recognizes images loaded from cache before effects',()=>{
    vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true);vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(736);setup();expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('times out media that never loaded',async()=>{
    vi.useFakeTimers();setup();await act(async()=>vi.advanceTimersByTime(12001));expect(screen.getByText('Abrindo publicação original…')).toBeInTheDocument();
    await act(async()=>vi.advanceTimersByTime(12001));expect(screen.getByText(/A publicação não carregou aqui/)).toBeInTheDocument();
  });
  it('does not expire an image after a successful load',async()=>{
    vi.useFakeTimers();setup();fireEvent.load(photo());await act(async()=>vi.advanceTimersByTime(12001));expect(photo()).toBeInTheDocument();expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  async function addFrame(src='https://www.instagram.com/p/ABC123/embed/') {
    const root=document.querySelector('.dream-social-embed')!;
    const frame=document.createElement('iframe'); frame.src=src;
    await act(async()=>{root.appendChild(frame);await Promise.resolve();});
    fireEvent.load(frame);return frame;
  }
  it.each([['Passar','skip'],['Curtir','like'],['Super Like','superlike']] as const)('allows %s when the official embed loads after the thumbnail failed',async(label,decision)=>{
    const {onChoose}=setup();fireEvent.error(photo());
    expect(screen.getByRole('button',{name:label+': '+item.title})).toBeDisabled();
    await addFrame();const button=screen.getByRole('button',{name:label+': '+item.title});
    expect(button).toBeEnabled();expect(screen.getByRole('group',{name:item.title})).toHaveAttribute('data-media-state','embed-ready');
    expect(screen.queryByText(/Foto indisponível nesta tentativa/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:item.title})).not.toBeInTheDocument();
    fireEvent.click(button);await waitFor(()=>expect(onChoose).toHaveBeenCalledWith(item,decision));
  });
  it('does not count a widget script load, a mere frame insertion or an unrelated frame as a rendered post',async()=>{
    setup();fireEvent.error(photo());
    const frame=document.createElement('iframe');frame.src='https://www.instagram.com/p/ABC123/embed/';
    await act(async()=>{document.querySelector('.dream-social-embed')!.appendChild(frame);await Promise.resolve();});
    expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeDisabled();
    await addFrame('https://instagram.com.evil.test/p/ABC123/embed/');
    const script=document.querySelector('script[src="https://www.instagram.com/embed.js"]')!;fireEvent.load(script);
    expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeDisabled();
  });
  it('can recover when an official embed loads after the fallback timeout',async()=>{
    vi.useFakeTimers();setup();fireEvent.error(photo());await act(async()=>vi.advanceTimersByTime(12001));
    expect(screen.getByText(/A publicação não carregou aqui/)).toBeInTheDocument();
    await addFrame();expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('does not let stale embed events enable voting for the next card',async()=>{
    const {unmount}=render(<DreamSwipeDeck items={[item]} category="Locais" onChoose={vi.fn()} onMore={vi.fn()} onSkipUnavailable={vi.fn()}/>);
    fireEvent.error(photo());const frame=document.createElement('iframe');frame.src='https://www.instagram.com/p/ABC123/embed/';
    await act(async()=>{document.querySelector('.dream-social-embed')!.appendChild(frame);await Promise.resolve();});
    unmount();setup();fireEvent.load(frame);expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeDisabled();
  });

  it('keeps a loaded embed usable when the failed thumbnail timer expires',async()=>{
    vi.useFakeTimers();setup();fireEvent.error(photo());await addFrame();
    await act(async()=>vi.advanceTimersByTime(24001));expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
    expect(screen.getByText(/Prévia da publicação original/)).toBeInTheDocument();
  });
  it('accepts a loaded Pinterest photo rendered by its official widget',async()=>{
    const pin={...item,source_url:'https://www.pinterest.com/pin/123456789/',image:'https://i.pinimg.com/736x/aa/bb/cc/aabbcc.jpg'};
    render(<DreamSwipeDeck items={[pin]} category="Decoração" onChoose={vi.fn()} onMore={vi.fn()} onSkipUnavailable={vi.fn()}/>);
    fireEvent.error(photo());const image=document.createElement('img');image.src=pin.image;
    Object.defineProperty(image,'naturalWidth',{value:736});
    await act(async()=>{document.querySelector('.dream-social-embed')!.appendChild(image);await Promise.resolve();});
    fireEvent.load(image);expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });

});
