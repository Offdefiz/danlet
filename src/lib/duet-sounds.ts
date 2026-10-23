/** Tiny, optional sounds synthesized on-device; no remote audio files. */
export type DuetSound = 'match' | 'notification' | 'success' | 'welcome' | 'question' | 'tap' | 'navigate' | 'toggle' | 'cancel';
const key = (id: string) => 'duet:sounds:' + id;
let context: AudioContext | null = null;
export function soundsEnabled(id: string): boolean {
  if (typeof window === 'undefined') return true;
  try { return localStorage.getItem(key(id)) !== 'off'; } catch { return false; }
}
export function setSoundsEnabled(id: string, enabled: boolean) {
  try { localStorage.setItem(key(id), enabled ? 'on' : 'off'); } catch { /* disabled */ }
}
const melodies: Record<DuetSound, number[]> = {
  match: [523.25,659.25,783.99,1046.5],
  notification: [659.25,783.99],
  success: [523.25,659.25],
  welcome: [392,523.25,659.25],
  question: [523.25,622.25],
  tap: [660],
  navigate: [520, 660],
  toggle: [780],
  cancel: [420],
};
export function playDuetSound(type: DuetSound, userId: string) {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible' || !soundsEnabled(userId)) return;
  try {
    if (!window.AudioContext) return;
    if (!context || context.state === 'closed') context = new AudioContext();
    const audio = context;
    const schedule = () => {
      melodies[type].forEach((freq, index) => {
        const start = audio.currentTime + index * (type === 'tap' || type === 'toggle' || type === 'cancel' ? 0.06 : 0.12);
        const tone = audio.createOscillator(), gain = audio.createGain();
        tone.type = 'sine'; tone.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime((type === 'tap' || type === 'toggle' || type === 'cancel' ? 0.012 : 0.03), start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + (type === 'tap' || type === 'toggle' || type === 'cancel' ? 0.09 : 0.23));
        tone.connect(gain); gain.connect(audio.destination);
        tone.start(start); tone.stop(start + (type === 'tap' || type === 'toggle' || type === 'cancel' ? 0.1 : 0.24));
      });
    };
    // On iPhone, this resumes only after a real user gesture. Background
    // notifications must use OS sounds, never an attempted autoplay hack.
    if (audio.state === 'suspended') { void audio.resume().then(schedule).catch(() => {}); }
    else schedule();
  } catch { /* device preference takes precedence over decoration */ }
}
