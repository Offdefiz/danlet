export type DreamDecision = 'pass' | 'like' | 'super';
export function dreamSwipeDecision(offset: number): DreamDecision | null {
  return Math.abs(offset) >= 80 ? offset > 0 ? 'like' : 'pass' : null;
}

