import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { classifyDreamSwipe } from '@/components/dream-swipe-deck';

const speed = { x: 0, y: 0 };

describe('Dream Match Tinder-style gestures', () => {
  it('swipes right to like and left to pass with distance threshold', () => {
    expect(classifyDreamSwipe({ x: 125, y: 20 }, speed)).toBe('like');
    expect(classifyDreamSwipe({ x: -132, y: 18 }, speed)).toBe('pass');
    expect(classifyDreamSwipe({ x: 10, y: 4 }, speed)).toBeNull();
  });
  it('swipes up to Super Like and ignores downward movement', () => {
    expect(classifyDreamSwipe({ x: 12, y: -165 }, speed)).toBe('super');
    expect(classifyDreamSwipe({ x: 0, y: 140 }, speed)).toBeNull();
  });
  it('recognizes a decisive fast flick without a long drag', () => {
    expect(classifyDreamSwipe({ x: 60, y: 9 }, { x: 900, y: 0 })).toBe('like');
    expect(classifyDreamSwipe({ x: -60, y: 10 }, { x: -920, y: 0 })).toBe('pass');
    expect(classifyDreamSwipe({ x: 14, y: -42 }, { x: 15, y: -940 })).toBe('super');
  });
  it('does not turn a short diagonal scroll into an accidental vote', () => {
    expect(classifyDreamSwipe({ x: 45, y: 70 }, { x: 150, y: 160 })).toBeNull();
    expect(classifyDreamSwipe({ x: 105, y: 180 }, speed)).toBeNull();
  });
});

describe('Dream Match full-photo swipe deck', () => {
  const swipeSource = readFileSync('src/components/dream-swipe-deck.tsx', 'utf8');
  const organizer = readFileSync('src/components/duet-organizer.tsx', 'utf8');
  const css = readFileSync('src/styles.css', 'utf8');

  it('replaces vertical search results with a stack of true Instagram/Pinterest photographs', () => {
    const searchDialog = organizer.slice(organizer.indexOf('<Dialog open={searchOpen}'), organizer.indexOf('<Dialog open={addReference}'));
    expect(searchDialog).toContain('<DreamSwipeDeck');
    expect(searchDialog).not.toContain('rankedResults.map(item => <article');
    expect(swipeSource).toContain('DreamSearchPhoto image={item.image}');
    expect(swipeSource).toContain('items.slice(1, 3).reverse()');
    expect(swipeSource).toContain('onDragEnd');
    expect(swipeSource).toContain('useMotionValue');
    expect(swipeSource).toContain('useTransform');
    expect(swipeSource).toContain('useAnimationControls');
    expect(swipeSource).toContain("action === 'super'");
  });
  it('records all three choices automatically including passed publications', () => {
    const choose = organizer.slice(organizer.indexOf('async function chooseDiscovered('), organizer.indexOf('async function saveReference('));
    expect(choose).toContain("const liked = action !== 'pass'");
    expect(choose).toContain("const superLike = action === 'super'");
    expect(choose).toContain('reference_id: saved.id, user_id: userId, liked,');
    expect(choose).toContain('super_liked: superLike');
    expect(choose).toContain('importReference({ data: {');
    expect(choose).toContain('setResults(previous => previous.filter');
    expect(choose).toContain('return false');
    expect(choose).toContain('return true');
    expect(searchDialogState()).toContain('setSearching(true)');
    expect(searchDialogState()).toContain('setSearching(false)');
  });
  it('keeps deck visible and gesture locked while saving a vote', () => {
    const dialog = organizer.slice(organizer.indexOf('<Dialog open={searchOpen}'),organizer.indexOf('<Dialog open={addReference}'));
    expect(dialog).toContain('{!searching && rankedResults.length > 0 && <DreamSwipeDeck');
    expect(dialog).toContain('disabled={busy}');
    expect(swipeSource).toContain('inFlight.current = true');
    expect(swipeSource).toContain('if (saved) return');
    expect(swipeSource).toContain('controls.start({ x: 0, y: 0');
    expect(css).toContain('touch-action: none');
  });
  it('shows celebratory mutual matches without inventing partner approval', () => {
    const celebration = readFileSync('src/components/dream-match-celebration.tsx', 'utf8');
    expect(organizer).toContain('partnerVote(data.votes, saved.id, userId)?.liked');
    expect(organizer).toContain('setDreamMatchTitle(saved.title)');
    expect(celebration).toContain('É MATCH! ♡');
    expect(celebration).toContain("setTimeout(onClose, 3600)");
    expect(celebration).toContain('useReducedMotion');
    expect(celebration).toContain('Continuar descobrindo');
  });
  function searchDialogState() {
    return organizer.slice(organizer.indexOf('async function runSearch()'),organizer.indexOf('async function uploadDreamPhoto('));
  }
});
