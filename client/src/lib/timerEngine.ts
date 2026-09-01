import type { Phase, TimerNode } from '@supah-timah/shared';

export type TimerEventType =
  | 'phaseStart'
  | 'halfway'
  | 'switchSides'
  | 'switchEnd'
  | 'phaseEnd'
  | 'repeatRestStart'
  | 'repeatRestEnd'
  | 'countdown'
  | 'timerComplete';

export interface FlatPhaseEntry {
  phase: Phase;
  repeatIndex: number;
  repeatTotal: number;
  roundLabel?: string;
  globalIndex: number;
}

export interface TimerEvent {
  type: TimerEventType;
  atMs: number;
  phase?: Phase;
  repeatIndex?: number;
  repeatTotal?: number;
  roundLabel?: string;
  countdownValue?: number;
  restDurationSeconds?: number;
}

export interface FlattenResult {
  phases: FlatPhaseEntry[];
  events: TimerEvent[];
  totalDurationMs: number;
}

function makeRestPhase(durationSeconds: number, label: string): Phase {
  return {
    kind: 'phase',
    id: `rest-${label}-${durationSeconds}`,
    type: 'rest',
    label,
    durationSeconds,
    color: '#2ECC71',
    halfwayNotification: false,
  };
}

function flattenNodes(nodes: TimerNode[]): FlatPhaseEntry[] {
  const result: FlatPhaseEntry[] = [];
  let globalIndex = 0;

  const processNodes = (
    nodeList: TimerNode[],
    rIndex: number,
    rTotal: number,
    rLabel?: string,
  ) => {
    for (const node of nodeList) {
      if (node.kind === 'phase') {
        result.push({
          phase: node,
          repeatIndex: rIndex,
          repeatTotal: rTotal,
          roundLabel: rLabel,
          globalIndex: globalIndex++,
        });
      } else {
        for (let i = 1; i <= node.repeatCount; i++) {
          processNodes(node.children, i, node.repeatCount, node.label);
          if (
            i < node.repeatCount &&
            node.restBetweenRepeatsSeconds &&
            node.restBetweenRepeatsSeconds > 0
          ) {
            result.push({
              phase: makeRestPhase(
                node.restBetweenRepeatsSeconds,
                `Rest (${node.label})`,
              ),
              repeatIndex: i,
              repeatTotal: node.repeatCount,
              roundLabel: node.label,
              globalIndex: globalIndex++,
            });
          }
        }
      }
    }
  };

  processNodes(nodes, 1, 1);
  return result;
}

export function flattenTimer(nodes: TimerNode[]): FlattenResult {
  const phases = flattenNodes(nodes);
  const events: TimerEvent[] = [];
  let atMs = 0;

  for (let i = 0; i < phases.length; i++) {
    const entry = phases[i];
    const { phase, repeatIndex, repeatTotal, roundLabel } = entry;
    const durationMs = phase.durationSeconds * 1000;
    const eventBase = { phase, repeatIndex, repeatTotal, roundLabel };

    if (i === 0) {
      for (let v = PRE_PHASE_COUNTDOWN_SECONDS; v >= 1; v--) {
        events.push({
          type: 'countdown',
          atMs: atMs + (PRE_PHASE_COUNTDOWN_SECONDS - v) * 1000,
          countdownValue: v,
          ...eventBase,
        });
      }
      atMs += PRE_PHASE_COUNTDOWN_SECONDS * 1000;
    }

    events.push({
      type: 'phaseStart',
      atMs,
      ...eventBase,
    });

    if (phase.splitSides?.enabled) {
      const halfwayMs = atMs + durationMs / 2;
      events.push({
        type: 'switchSides',
        atMs: halfwayMs,
        ...eventBase,
      });
      events.push({
        type: 'switchEnd',
        atMs: halfwayMs + phase.splitSides.switchDurationSeconds * 1000,
        ...eventBase,
      });
    } else if (phase.halfwayNotification) {
      events.push({
        type: 'halfway',
        atMs: atMs + durationMs / 2,
        ...eventBase,
      });
    }

    const phaseEndAt = atMs + durationMs;
    const endBeeps = Math.min(
      END_COUNTDOWN_SECONDS,
      Math.floor(phase.durationSeconds),
    );
    for (let v = endBeeps; v >= 1; v--) {
      events.push({
        type: 'countdown',
        atMs: phaseEndAt - v * 1000,
        countdownValue: v,
        ...eventBase,
      });
    }

    atMs = phaseEndAt;

    events.push({
      type: 'phaseEnd',
      atMs,
      ...eventBase,
    });
  }

  events.push({ type: 'timerComplete', atMs });

  return { phases, events, totalDurationMs: atMs };
}

export function calculateTotalDuration(nodes: TimerNode[]): number {
  let total = 0;

  const processNodes = (nodeList: TimerNode[]) => {
    for (const node of nodeList) {
      if (node.kind === 'phase') {
        total += node.durationSeconds;
      } else {
        let blockDuration = 0;
        for (const child of node.children) {
          if (child.kind === 'phase') {
            blockDuration += child.durationSeconds;
          } else {
            processNodes([child]);
          }
        }
        const restBetween = node.restBetweenRepeatsSeconds ?? 0;
        total +=
          blockDuration * node.repeatCount +
          restBetween * Math.max(0, node.repeatCount - 1);
        for (const child of node.children) {
          if (child.kind === 'repeat') {
            processNodes([child]);
          }
        }
      }
    }
  };

  processNodes(nodes);
  return total;
}

export function calculateTotalDurationAccurate(nodes: TimerNode[]): number {
  return Math.round(flattenTimer(nodes).totalDurationMs / 1000);
}

export type TimerStatus = 'idle' | 'running' | 'paused' | 'switchHold' | 'complete';

export const PRE_PHASE_COUNTDOWN_SECONDS = 3;
export const END_COUNTDOWN_SECONDS = 3;

export interface PhaseBoundaries {
  preCountdownStartMs: number;
  activeStartMs: number;
  activeEndMs: number;
}

export function getPhaseBoundaries(
  flat: FlattenResult,
  phaseIndex: number,
): PhaseBoundaries {
  const introMs = PRE_PHASE_COUNTDOWN_SECONDS * 1000;
  let activeStartMs = introMs;
  for (let i = 0; i < phaseIndex; i++) {
    activeStartMs += flat.phases[i].phase.durationSeconds * 1000;
  }
  const activeEndMs =
    activeStartMs + flat.phases[phaseIndex].phase.durationSeconds * 1000;
  return {
    preCountdownStartMs: phaseIndex === 0 ? 0 : activeStartMs,
    activeStartMs,
    activeEndMs,
  };
}

export interface TimerEngineState {
  status: TimerStatus;
  currentPhaseIndex: number;
  elapsedMs: number;
  remainingMs: number;
  currentPhase: FlatPhaseEntry | null;
  isOnRightSide: boolean;
  isInSwitchHold: boolean;
  switchRemainingMs: number;
  totalDurationMs: number;
  progress: number;
  countdownValue: number | null;
  isPrePhaseCountdown: boolean;
}

export interface TimerEngineSnapshot {
  state: TimerEngineState;
  lastEvent: TimerEvent | null;
}

export function createInitialState(flat: FlattenResult): TimerEngineState {
  return {
    status: 'idle',
    currentPhaseIndex: 0,
    elapsedMs: 0,
    remainingMs: flat.totalDurationMs,
    currentPhase: flat.phases[0] ?? null,
    isOnRightSide: false,
    isInSwitchHold: false,
    switchRemainingMs: 0,
    totalDurationMs: flat.totalDurationMs,
    progress: 0,
    countdownValue: null,
    isPrePhaseCountdown: false,
  };
}

export function computeStateAtElapsed(
  flat: FlattenResult,
  elapsedMs: number,
  status: TimerStatus = 'running',
): { state: TimerEngineState; event: TimerEvent | null } {
  const clampedElapsed = Math.max(0, Math.min(elapsedMs, flat.totalDurationMs));
  let currentPhaseIndex = 0;
  let currentEntry: FlatPhaseEntry | null = null;
  let isInSwitchHold = false;
  let switchRemainingMs = 0;
  let isOnRightSide = false;
  let countdownValue: number | null = null;
  let isPrePhaseCountdown = false;
  let triggeredEvent: TimerEvent | null = null;

  for (let i = 0; i < flat.phases.length; i++) {
    const entry = flat.phases[i];
    const { activeStartMs, activeEndMs } = getPhaseBoundaries(flat, i);

    if (clampedElapsed < activeEndMs || i === flat.phases.length - 1) {
      currentPhaseIndex = i;
      currentEntry = entry;

      if (clampedElapsed < activeStartMs) {
        isPrePhaseCountdown = i === 0;
        countdownValue = Math.ceil((activeStartMs - clampedElapsed) / 1000);
      } else {
        const phaseElapsed = clampedElapsed - activeStartMs;
        const phaseDurationMs = entry.phase.durationSeconds * 1000;
        const remainingInPhaseMs = activeEndMs - clampedElapsed;
        const endBeeps = Math.min(
          END_COUNTDOWN_SECONDS,
          Math.floor(entry.phase.durationSeconds),
        );

        if (endBeeps > 0 && remainingInPhaseMs <= endBeeps * 1000) {
          countdownValue = Math.ceil(remainingInPhaseMs / 1000);
        }

        if (entry.phase.splitSides?.enabled) {
          const halfwayMs = phaseDurationMs / 2;
          const switchDurationMs =
            entry.phase.splitSides.switchDurationSeconds * 1000;

          if (phaseElapsed >= halfwayMs) {
            isOnRightSide = true;
            const switchElapsed = phaseElapsed - halfwayMs;
            if (switchElapsed < switchDurationMs) {
              isInSwitchHold = true;
              switchRemainingMs = switchDurationMs - switchElapsed;
            }
          }
        } else if (
          entry.phase.halfwayNotification &&
          phaseElapsed >= phaseDurationMs / 2
        ) {
          isOnRightSide = false;
        }
      }

      break;
    }
  }

  const isComplete = clampedElapsed >= flat.totalDurationMs;

  if (isComplete) {
    triggeredEvent = { type: 'timerComplete', atMs: flat.totalDurationMs };
  }

  return {
    state: {
      status: isComplete ? 'complete' : status,
      currentPhaseIndex,
      elapsedMs: clampedElapsed,
      remainingMs: Math.max(0, flat.totalDurationMs - clampedElapsed),
      currentPhase: isComplete ? null : currentEntry,
      isOnRightSide,
      isInSwitchHold,
      switchRemainingMs,
      totalDurationMs: flat.totalDurationMs,
      progress:
        flat.totalDurationMs > 0
          ? clampedElapsed / flat.totalDurationMs
          : 0,
      countdownValue,
      isPrePhaseCountdown,
    },
    event: triggeredEvent,
  };
}

export function getEventsBetween(
  flat: FlattenResult,
  fromMs: number,
  toMs: number,
): TimerEvent[] {
  return flat.events.filter((e) => e.atMs > fromMs && e.atMs <= toMs);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeMs(ms: number): string {
  return formatTime(Math.ceil(ms / 1000));
}

export function getPhaseRemainingMs(
  flat: FlattenResult,
  elapsedMs: number,
  phaseIndex: number,
): number {
  const { activeStartMs, activeEndMs } = getPhaseBoundaries(flat, phaseIndex);
  if (elapsedMs < activeStartMs) {
    return activeEndMs - activeStartMs;
  }
  return Math.max(0, activeEndMs - elapsedMs);
}

export function getCurrentPhaseElapsedMs(
  flat: FlattenResult,
  elapsedMs: number,
  phaseIndex: number,
): number {
  const { activeStartMs } = getPhaseBoundaries(flat, phaseIndex);
  return Math.max(0, elapsedMs - activeStartMs);
}
