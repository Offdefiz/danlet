import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const oscillatorStart = vi.fn();
const resume = vi.fn(async () => {});
const audio = {
  state: 'suspended',
  currentTime: 0,
  destination: {},
  resume,
  createOscillator: vi.fn(() => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(), start: oscillatorStart, stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  })),
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  window.localStorage.clear();
  vi.stubGlobal('AudioContext', vi.fn(() => audio));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('Duet sound reliability on iPhone', () => {
  it('uses the active logged-in account rather than a global mute key', async () => {
    const sounds = await import('@/lib/duet-sounds');
    sounds.rememberActiveSoundUser('daniel-id');
    expect(sounds.activeSoundUser()).toBe('daniel-id');
    sounds.setSoundsEnabled('daniel-id', false);
    expect(sounds.soundsEnabled(sounds.activeSoundUser())).toBe(false);
    expect(sounds.soundsEnabled('leticia-id')).toBe(true);
    sounds.playDuetSound('tap', sounds.activeSoundUser());
    expect(oscillatorStart).not.toHaveBeenCalled();
    sounds.rememberActiveSoundUser(null);
    expect(sounds.activeSoundUser()).toBe('global');
  });
  it('schedules audio synchronously before resuming a suspended browser context', async () => {
    const sounds = await import('@/lib/duet-sounds');
    sounds.playDuetSound('tap', 'daniel-id');
    expect(oscillatorStart).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
    expect(oscillatorStart.mock.invocationCallOrder[0]).toBeLessThan(resume.mock.invocationCallOrder[0]!);
    sounds.playDuetSound('navigate', 'daniel-id');
    expect(audio.createOscillator).toHaveBeenCalledTimes(3);
  });
  it('allows an individual mute preference to turn off further taps', async () => {
    const sounds = await import('@/lib/duet-sounds');
    sounds.setSoundsEnabled('leticia-id', false);
    sounds.playDuetSound('tap', 'leticia-id');
    expect(oscillatorStart).not.toHaveBeenCalled();
  });
});
