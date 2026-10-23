/** On-device UI sounds. Browsers may suspend audio in the background; an
 * actual interaction resumes the shared context synchronously with the tap.
 * Respect per-account mute and device accessibility settings.
 */
export type DuetSound = 'match' | 'notification' | 'success' | 'welcome' | 'question' | 'tap' | 'navigate' | 'toggle' | 'cancel';
const key = (id: string) => 'duet:sounds:' + id;
const activeUserKey = 'duet:active-user-id';
let context: AudioContext | null = null;
let lastNotificationTime = 0;

export function rememberActiveSoundUser(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) localStorage.setItem(activeUserKey, id);
    else localStorage.removeItem(activeUserKey);
  } catch { /* Session-only sound controls remain usable. */ }
}
export function activeSoundUser(): string {
  if (typeof window === 'undefined') return 'global';
  try { return localStorage.getItem(activeUserKey) || 'global'; } catch { return 'global'; }
}
export function soundsEnabled(id: string): boolean {
  if (typeof window === 'undefined') return true;
  try { return localStorage.getItem(key(id)) !== 'off'; }
  catch { return true; } // A storage denial must not silently mute every button.
}
export function setSoundsEnabled(id: string, enabled: boolean) {
  try { localStorage.setItem(key(id), enabled ? 'on' : 'off'); } catch { /* unavailable */ }
}
const melodies: Record<DuetSound, number[]> = {
  match: [523.25,659.25,783.99,1046.5],
  notification: [659.25,783.99],
  success: [523.25,659.25],
  welcome: [392,523.25,659.25],
  question: [523.25,622.25],
  tap: [660],
  navigate: [520,660],
  toggle: [780],
  cancel: [420],
};

export function playDuetSound(type: DuetSound, userId: string) {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible' || !soundsEnabled(userId)) return;
  // The Realtime feed and Firebase foreground handler can describe the same
  // event. Play it once rather than stacking two arrival jingles.
  if (type === 'notification') {
    const now = Date.now();
    if (now - lastNotificationTime < 750) return;
    lastNotificationTime = now;
  }
  try {
    const browser = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = browser.AudioContext ?? browser.webkitAudioContext;
    if (!Ctor) return;
    if (!context || context.state === 'closed') context = new Ctor();
    const audio = context;
    const short = type === 'tap' || type === 'toggle' || type === 'cancel';
    const step = short ? 0.055 : 0.11;
    const decay = short ? 0.105 : 0.23;
    // IMPORTANT: schedule immediately inside the trusted pointer/keyboard
    // gesture. Awaiting resume() before playing breaks Safari audio unlocking.
    const base = audio.currentTime + 0.008;
    for (const [index, frequency] of melodies[type].entries()) {
      const start = base + index * step;
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = short ? 'triangle' : 'sine';
      tone.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(short ? 0.052 : 0.055, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
      tone.connect(gain);
      gain.connect(audio.destination);
      tone.start(start);
      tone.stop(start + decay + 0.012);
    }
    // Resume within the same user gesture, not in a deferred promise callback.
    if (audio.state !== 'running') void audio.resume().catch(() => {});
  } catch {
    // OS silent mode or lack of AudioContext permission can still mute sound.
  }
}
