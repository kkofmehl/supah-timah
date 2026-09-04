import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PLAYBACK_GAIN, SoundManager, WORK_BELL_REPEAT_MS } from './soundManager';
import type { Phase } from '@supah-timah/shared';

const ALL_SOUNDS_ON = {
  intervalStart: true,
  intervalEnd: false,
  halfway: true,
  switchSides: true,
  startRest: true,
  getReady: true,
  countdown: true,
  workoutComplete: true,
};

const workPhase: Phase = {
  kind: 'phase',
  id: 'work-1',
  type: 'work',
  label: 'Work',
  durationSeconds: 40,
  color: '#E74C3C',
  halfwayNotification: false,
};

describe('SoundManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports a louder-than-unity playback gain', () => {
    expect(PLAYBACK_GAIN).toBeGreaterThan(1);
  });

  it('plays three quick tones for halfway events', () => {
    const manager = new SoundManager();
    const play = vi.spyOn(manager, 'play');

    manager.handleEvent({ type: 'halfway', atMs: 10_000 }, ALL_SOUNDS_ON);

    expect(play).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(0);
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('halfway');

    vi.advanceTimersByTime(150);
    expect(play).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(150);
    expect(play).toHaveBeenCalledTimes(3);
  });

  it('skips halfway tones when disabled', () => {
    const manager = new SoundManager();
    const play = vi.spyOn(manager, 'play');

    manager.handleEvent(
      { type: 'halfway', atMs: 10_000 },
      { ...ALL_SOUNDS_ON, halfway: false },
    );

    expect(play).not.toHaveBeenCalled();
  });

  it('plays a triple boxing bell for work interval starts', () => {
    const manager = new SoundManager();
    const play = vi.spyOn(manager, 'play');

    manager.handleEvent(
      { type: 'phaseStart', atMs: 0, phase: workPhase },
      ALL_SOUNDS_ON,
    );

    vi.advanceTimersByTime(0);
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('intervalStart');

    vi.advanceTimersByTime(WORK_BELL_REPEAT_MS);
    expect(play).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(WORK_BELL_REPEAT_MS);
    expect(play).toHaveBeenCalledTimes(3);
  });

  it('plays a single start sound for non-work phases', () => {
    const manager = new SoundManager();
    const play = vi.spyOn(manager, 'play');
    const warmup: Phase = { ...workPhase, id: 'wu', type: 'warmup', label: 'Warmup' };

    manager.handleEvent(
      { type: 'phaseStart', atMs: 0, phase: warmup },
      ALL_SOUNDS_ON,
    );

    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('intervalStart');
    vi.advanceTimersByTime(WORK_BELL_REPEAT_MS * 2);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
