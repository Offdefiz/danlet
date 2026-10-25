import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { classifyDreamGesture, getDreamSwipeExit } from '@/components/dream-swipe-deck';

describe('Dream Match photographic Tinder-style swipe', () => {
  it('rejects small accidental drags and quick vertical page movements', () => {
    expect(classifyDreamGesture({ x: 18, y: 12 }, { x: 100, y: 80 })).toBeNull();
    expect(classifyDreamGesture({ x: 0, y: 74 }, { x: 0, y: 1500 })).toBeNull();
    expect(classifyDreamGesture({ x: -36, y: 0 }, { x: -200, y: 0 })).toBeNull();
  });
  it('swipes left to pass, right to like and up for Super Like', () => {
    expect(classifyDreamGesture({ x: -125, y: 20 }, { x: -200, y: 50 })).toBe('skip');
    expect(classifyDreamGesture({ x: 140, y: -15 }, { x: 100, y: -50 })).toBe('like');
    expect(classifyDreamGesture({ x: 11, y: -135 }, { x: 60, y: -250 })).toBe('superlike');
  });
  it('supports intentional fast swipes, not near-static taps', () => {
    expect(classifyDreamGesture({ x: -46, y: -5 }, { x: -740, y: -70 })).toBe('skip');
    expect(classifyDreamGesture({ x: 50, y: 12 }, { x: 850, y: 0 })).toBe('like');
    expect(classifyDreamGesture({ x: 14, y: 0 }, { x: 850, y: 0 })).toBeNull();
  });
  it('throws decisions offscreen in their intended direction', () => {
    const left = getDreamSwipeExit('skip', 390);
    const right = getDreamSwipeExit('like', 390);
    const up = getDreamSwipeExit('superlike', 390);
    expect(left.x).toBeLessThan(-390);
    expect(right.x).toBeGreaterThan(390);
    expect(up.y).toBeLessThan(-390);
    expect(up.x).toBe(0);
    expect(getDreamSwipeExit('like', 300).x).toBeGreaterThan(300);
  });
  it('renders a genuine photo stack with origin links, decision labels and accessible touch buttons', () => {
    const deck = readFileSync('src/components/dream-swipe-deck.tsx', 'utf8');
    const css = readFileSync('src/styles.css', 'utf8');
    for (const part of [
      'DreamPlatformPreview','safeSocialPreviewUrl','object-cover',
      'aria-roledescription="cartão deslizável"','dragConstraints','onDragEnd',
      "decide('skip')","decide('superlike')","decide('like')",
      'aria-label={\'Curtir: \'','Ver publicação original',
      'await onDecision(decision, item)','if (!accepted) await reset()',
    ]) expect(deck).toContain(part);
    expect(css).toContain('.dream-swipe-card');
    expect(css).toContain('.dream-swipe-action');
    expect(css).toContain('prefers-reduced-motion: reduce');
  });
  it('opens live search cards as the Dream Match home deck, not a vertical results list', () => {
    const organizer = readFileSync('src/components/duet-organizer.tsx','utf8');
    expect(organizer).toContain('setDreamSection(\'discover\')');
    expect(organizer).toContain('setSearchOpen(false)');
    expect(organizer).toContain('<DreamSwipeDeck items={rankedResults}');
    expect(organizer).toContain('onChoose={chooseDiscovered}');
    expect(organizer).not.toContain('rankedResults.map(item => <article');
    expect(organizer).toContain("const liked = decision !== 'skip'");
    expect(organizer).toContain('super_liked: superLike');
    expect(organizer).toContain('setMatchCelebration({ title: saved.title, image: item.image })');
    expect(organizer).toContain('return false;');
  });
});
