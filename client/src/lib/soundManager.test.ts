import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SoundManager } from './soundManager';

describe('SoundManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays three quick tones for halfway events', () => {
    const manager = new SoundManager();
    const play = vi.spyOn(manager, 'play');

    manager.handleEvent(
      { type: 'halfway', atMs: 10_000 },
      {
        intervalStart: true,
        intervalEnd: false,
        halfway: true,
        switchSides: true,
        startRest: true,
        getReady: true,
        countdown: true,
        workoutComplete: true,
      },
    );

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
      {
        intervalStart: true,
        intervalEnd: false,
        halfway: false,
        switchSides: true,
        startRest: true,
        getReady: true,
        countdown: true,
        workoutComplete: true,
      },
    );

    expect(play).not.toHaveBeenCalled();
  });
});
