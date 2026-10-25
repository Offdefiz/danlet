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
    const {skip,onChoose}=setup();fireEvent.error(photo());expect(screen.getByText(/Foto indisponível nesta tentativa/)).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Pular foto indisponível sem votar'}));expect(skip).toHaveBeenCalledWith(item);expect(onChoose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Recarregar foto'}));fireEvent.load(photo());expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('recognizes images loaded from cache before effects',()=>{
    vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true);vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(736);setup();expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
  it('times out media that never loaded',async()=>{
    vi.useFakeTimers();setup();await act(async()=>vi.advanceTimersByTime(12001));expect(screen.getByText(/Foto indisponível nesta tentativa/)).toBeInTheDocument();
  });
  it('does not expire an image after a successful load',async()=>{
    vi.useFakeTimers();setup();fireEvent.load(photo());await act(async()=>vi.advanceTimersByTime(12001));expect(photo()).toBeInTheDocument();expect(screen.getByRole('button',{name:'Curtir: '+item.title})).toBeEnabled();
  });
});
