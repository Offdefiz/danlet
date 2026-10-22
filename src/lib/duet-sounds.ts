/** Short, optional UI sounds. No external audio service, download or tracking. */
export type DuetSound = 'match' | 'notification' | 'success' | 'welcome' | 'question';
const key = (userId: string) => `duet:sounds:${userId}`;
export function soundsEnabled(userId: string): boolean {
  if (typeof window === 'undefined') return true;
  try { return window.localStorage.getItem(key(userId)) !== 'off'; } catch { return false; }
}
export function setSoundsEnabled(userId: string, enabled: boolean) {
  try { window.localStorage.setItem(key(userId), enabled ? 'on' : 'off'); } catch { /* private mode */ }
}
export function playDuetSound(type: DuetSound, userId: string) {
  if (typeof window === 'undefined' || !soundsEnabled(userId) || document.visibilityState !== 'visible') return;
  try {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    // iOS requires user interaction before an AudioContext can play.
    if (ctx.state === 'suspended') { void ctx.close(); return; }
    const notes = type === 'match' ? [523.25, 659.25, 783.99] : type === 'notification' ? [659.25, 783.99] : [523.25, 659.25];
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      const start = ctx.currentTime + i * .11;
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(.028, start + .014);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + .24);
      oscillator.connect(envelope);
      envelope.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + .245);
    });
    window.setTimeout(() => { void ctx.close().catch(() => {}); }, notes.length * 110 + 500);
  } catch { /* Browser/device sound capability unavailable; do not interrupt user flow. */ }
}
