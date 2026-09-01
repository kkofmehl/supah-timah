import { describe, it, expect } from 'vitest';
import {
  createSimpleTimer,
  createHiitTimer,
  createTabataTimer,
  createCircuitTimer,
  createEmomTimer,
  createBlankTimer,
} from './templates';
import { calculateTotalDurationAccurate } from './timerEngine';
import { isPhase, isRepeatBlock } from '@supah-timah/shared';

describe('createSimpleTimer', () => {
  it('creates work/rest repeat block', () => {
    const timer = createSimpleTimer({
      name: 'Simple',
      workSeconds: 40,
      restSeconds: 20,
      rounds: 5,
    });
    expect(timer.nodes).toHaveLength(1);
    expect(isRepeatBlock(timer.nodes[0])).toBe(true);
    expect(calculateTotalDurationAccurate(timer.nodes)).toBe(300);
  });
});

describe('createHiitTimer', () => {
  it('includes warmup and cooldown', () => {
    const timer = createHiitTimer({
      name: 'HIIT',
      warmupSeconds: 300,
      workSeconds: 40,
      restSeconds: 20,
      rounds: 5,
      roundRestSeconds: 60,
      cooldownSeconds: 300,
    });
    expect(timer.nodes.length).toBeGreaterThanOrEqual(3);
    expect(isPhase(timer.nodes[0])).toBe(true);
    expect(timer.nodes[0].kind === 'phase' && timer.nodes[0].type).toBe('warmup');
  });
});

describe('createTabataTimer', () => {
  it('creates 8 rounds of 20/10 by default', () => {
    const timer = createTabataTimer({ name: 'Tabata', rounds: 8 });
    expect(calculateTotalDurationAccurate(timer.nodes)).toBe(240);
  });
});

describe('createCircuitTimer', () => {
  it('creates exercises with rest between', () => {
    const timer = createCircuitTimer({
      name: 'Circuit',
      exercises: [
        { name: 'Push-ups', durationSeconds: 30 },
        { name: 'Squats', durationSeconds: 30 },
      ],
      rounds: 3,
      restBetweenExercisesSeconds: 10,
      restBetweenRoundsSeconds: 60,
    });
    expect(isRepeatBlock(timer.nodes[0])).toBe(true);
    const block = timer.nodes[0];
    if (block.kind === 'repeat') {
      expect(block.children.length).toBe(3);
    }
  });
});

describe('createEmomTimer', () => {
  it('creates minute intervals', () => {
    const timer = createEmomTimer({
      name: 'EMOM',
      intervalSeconds: 60,
      rounds: 10,
      exerciseLabel: 'Burpees',
      workSeconds: 40,
    });
    expect(calculateTotalDurationAccurate(timer.nodes)).toBe(600);
  });
});

describe('createBlankTimer', () => {
  it('creates a single work phase', () => {
    const timer = createBlankTimer();
    expect(timer.nodes).toHaveLength(1);
    expect(isPhase(timer.nodes[0])).toBe(true);
  });
});
