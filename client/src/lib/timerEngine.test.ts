import { describe, it, expect } from 'vitest';
import type { Phase, RepeatBlock } from '@supah-timah/shared';
import { createId } from '@supah-timah/shared';
import {
  flattenTimer,
  calculateTotalDurationAccurate,
  computeStateAtElapsed,
  getPhaseRemainingMs,
  formatTime,
  PRE_PHASE_COUNTDOWN_SECONDS,
} from '../lib/timerEngine';

function makePhase(overrides: Partial<Phase> & Pick<Phase, 'durationSeconds'>): Phase {
  return {
    kind: 'phase',
    id: createId(),
    type: overrides.type ?? 'work',
    label: overrides.label ?? 'Work',
    color: overrides.color ?? '#E74C3C',
    halfwayNotification: overrides.halfwayNotification ?? false,
    ...overrides,
  };
}

function makeRepeat(
  repeatCount: number,
  children: Phase[],
  restBetweenRepeatsSeconds?: number,
): RepeatBlock {
  return {
    kind: 'repeat',
    id: createId(),
    label: 'Round',
    repeatCount,
    restBetweenRepeatsSeconds,
    children,
  };
}

describe('flattenTimer', () => {
  it('flattens simple phase list', () => {
    const nodes = [
      makePhase({ durationSeconds: 30, label: 'Warmup', type: 'warmup' }),
      makePhase({ durationSeconds: 40, label: 'Work' }),
      makePhase({ durationSeconds: 20, label: 'Rest', type: 'rest' }),
    ];

    const flat = flattenTimer(nodes);
    expect(flat.phases).toHaveLength(3);
    expect(flat.totalDurationMs).toBe(
      90_000 + PRE_PHASE_COUNTDOWN_SECONDS * 1000,
    );
  });

  it('expands repeat blocks', () => {
    const nodes = [
      makeRepeat(3, [
        makePhase({ durationSeconds: 40, label: 'Work' }),
        makePhase({ durationSeconds: 20, label: 'Rest', type: 'rest' }),
      ]),
    ];

    const flat = flattenTimer(nodes);
    expect(flat.phases).toHaveLength(6);
    expect(flat.phases[0].repeatIndex).toBe(1);
    expect(flat.phases[1].repeatIndex).toBe(1);
    expect(flat.phases[2].repeatIndex).toBe(2);
    expect(flat.totalDurationMs).toBe(
      180_000 + PRE_PHASE_COUNTDOWN_SECONDS * 1000,
    );
  });

  it('generates halfway events', () => {
    const nodes = [
      makePhase({
        durationSeconds: 40,
        halfwayNotification: true,
      }),
    ];

    const flat = flattenTimer(nodes);
    const halfway = flat.events.find((e) => e.type === 'halfway');
    expect(halfway?.atMs).toBe(
      PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 20_000,
    );
  });

  it('does not add pre-phase countdown before later phases', () => {
    const nodes = [
      makePhase({ durationSeconds: 30, label: 'A' }),
      makePhase({ durationSeconds: 20, label: 'B' }),
    ];

    const flat = flattenTimer(nodes);
    const phaseBStart = PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 30_000;
    const preCountdownBeforeB = flat.events.filter(
      (e) =>
        e.type === 'countdown' &&
        e.atMs >= phaseBStart - PRE_PHASE_COUNTDOWN_SECONDS * 1000 &&
        e.atMs < phaseBStart,
    );
    expect(preCountdownBeforeB).toHaveLength(0);
  });

  it('generates pre-phase countdown events only at timer start', () => {
    const nodes = [makePhase({ durationSeconds: 30 })];

    const flat = flattenTimer(nodes);
    const preCountdown = flat.events.filter(
      (e) => e.type === 'countdown' && e.atMs < PRE_PHASE_COUNTDOWN_SECONDS * 1000,
    );
    expect(preCountdown).toHaveLength(3);
    expect(preCountdown.map((e) => e.countdownValue)).toEqual([3, 2, 1]);
  });

  it('generates end-of-phase countdown events', () => {
    const nodes = [makePhase({ durationSeconds: 40 })];

    const flat = flattenTimer(nodes);
    const phaseStart = PRE_PHASE_COUNTDOWN_SECONDS * 1000;
    const phaseEnd = phaseStart + 40_000;
    const endCountdown = flat.events.filter(
      (e) =>
        e.type === 'countdown' &&
        e.atMs >= phaseStart &&
        e.atMs < phaseEnd,
    );
    expect(endCountdown).toHaveLength(3);
    expect(endCountdown.map((e) => e.countdownValue)).toEqual([3, 2, 1]);
  });

  it('generates switch side events', () => {
    const nodes = [
      makePhase({
        durationSeconds: 60,
        splitSides: { enabled: true, switchDurationSeconds: 5 },
      }),
    ];

    const flat = flattenTimer(nodes);
    const switchEvent = flat.events.find((e) => e.type === 'switchSides');
    const switchEnd = flat.events.find((e) => e.type === 'switchEnd');
    expect(switchEvent?.atMs).toBe(
      PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 30_000,
    );
    expect(switchEnd?.atMs).toBe(
      PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 35_000,
    );
  });
});

describe('computeStateAtElapsed', () => {
  it('tracks current phase', () => {
    const nodes = [
      makePhase({ durationSeconds: 30, label: 'A' }),
      makePhase({ durationSeconds: 20, label: 'B' }),
    ];
    const flat = flattenTimer(nodes);

    const at15 = computeStateAtElapsed(flat, 15_000);
    expect(at15.state.currentPhase?.phase.label).toBe('A');

    const at35 = computeStateAtElapsed(
      flat,
      PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 30_000 + 2_000,
    );
    expect(at35.state.currentPhase?.phase.label).toBe('B');
  });

  it('detects switch hold', () => {
    const nodes = [
      makePhase({
        durationSeconds: 60,
        splitSides: { enabled: true, switchDurationSeconds: 5 },
      }),
    ];
    const flat = flattenTimer(nodes);

    const duringSwitch = computeStateAtElapsed(
      flat,
      PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 32_000,
    );
    expect(duringSwitch.state.isInSwitchHold).toBe(true);
    expect(duringSwitch.state.isOnRightSide).toBe(true);
  });

  it('shows pre-phase countdown value', () => {
    const nodes = [makePhase({ durationSeconds: 30 })];
    const flat = flattenTimer(nodes);

    const duringCountdown = computeStateAtElapsed(flat, 1_000);
    expect(duringCountdown.state.isPrePhaseCountdown).toBe(true);
    expect(duringCountdown.state.countdownValue).toBe(2);
  });

  it('shows end-of-phase countdown value', () => {
    const nodes = [makePhase({ durationSeconds: 40 })];
    const flat = flattenTimer(nodes);

    const phaseEnd =
      PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 40_000;
    const duringEndCountdown = computeStateAtElapsed(flat, phaseEnd - 2_000);
    expect(duringEndCountdown.state.countdownValue).toBe(2);
  });

  it('marks complete at end', () => {
    const nodes = [makePhase({ durationSeconds: 10 })];
    const flat = flattenTimer(nodes);
    const done = computeStateAtElapsed(flat, flat.totalDurationMs);
    expect(done.state.status).toBe('complete');
  });
});

describe('getPhaseRemainingMs', () => {
  it('returns correct remaining time', () => {
    const nodes = [makePhase({ durationSeconds: 40 })];
    const flat = flattenTimer(nodes);
    expect(
      getPhaseRemainingMs(
        flat,
        PRE_PHASE_COUNTDOWN_SECONDS * 1000 + 15_000,
        0,
      ),
    ).toBe(25_000);
  });
});

describe('calculateTotalDurationAccurate', () => {
  it('sums all phases including repeats', () => {
    const nodes = [
      makeRepeat(5, [
        makePhase({ durationSeconds: 40 }),
        makePhase({ durationSeconds: 20, type: 'rest' }),
      ]),
    ];
    expect(calculateTotalDurationAccurate(nodes)).toBe(
      300 + PRE_PHASE_COUNTDOWN_SECONDS,
    );
  });
});

describe('formatTime', () => {
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(600)).toBe('10:00');
  });
});
