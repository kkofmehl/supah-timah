import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerNode } from '@supah-timah/shared';
import {
  computeStateAtElapsed,
  createInitialState,
  flattenTimer,
  getEventsBetween,
  getPhaseBoundaries,
  getPhaseRemainingMs,
  type FlattenResult,
  type TimerEngineState,
  type TimerEvent,
  type TimerStatus,
} from '../lib/timerEngine';

export interface UseTimerEngineOptions {
  nodes: TimerNode[];
  onEvent?: (event: TimerEvent) => void;
}

export interface UseTimerEngineReturn {
  state: TimerEngineState;
  flat: FlattenResult;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skipPhase: () => void;
  phaseRemainingMs: number;
}

export function useTimerEngine({
  nodes,
  onEvent,
}: UseTimerEngineOptions): UseTimerEngineReturn {
  const flat = flattenTimer(nodes);
  const [state, setState] = useState<TimerEngineState>(() =>
    createInitialState(flat),
  );

  const statusRef = useRef<TimerStatus>('idle');
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const lastProcessedRef = useRef(0);
  const rafRef = useRef<number>(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const tick = useCallback(() => {
    if (statusRef.current !== 'running') return;

    const now = performance.now();
    const elapsed = pausedElapsedRef.current + (now - startTimeRef.current);

    const events = getEventsBetween(flat, lastProcessedRef.current, elapsed);
    lastProcessedRef.current = elapsed;
    for (const event of events) {
      onEventRef.current?.(event);
    }

    const { state: newState } = computeStateAtElapsed(flat, elapsed, 'running');
    setState(newState);

    if (newState.status === 'complete') {
      statusRef.current = 'complete';
      onEventRef.current?.({ type: 'timerComplete', atMs: flat.totalDurationMs });
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [flat]);

  const start = useCallback(() => {
    statusRef.current = 'running';
    startTimeRef.current = performance.now();
    pausedElapsedRef.current = 0;
    lastProcessedRef.current = 0;

    const initial = createInitialState(flat);
    setState({ ...initial, status: 'running' });

    rafRef.current = requestAnimationFrame(tick);
  }, [flat, tick]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    cancelAnimationFrame(rafRef.current);
    const now = performance.now();
    pausedElapsedRef.current += now - startTimeRef.current;
    statusRef.current = 'paused';
    setState((s: TimerEngineState) => ({ ...s, status: 'paused' }));
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    statusRef.current = 'running';
    startTimeRef.current = performance.now();
    setState((s: TimerEngineState) => ({ ...s, status: 'running' }));
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    statusRef.current = 'idle';
    pausedElapsedRef.current = 0;
    lastProcessedRef.current = 0;
    setState(createInitialState(flat));
  }, [flat]);

  const skipPhase = useCallback(() => {
    const currentElapsed =
      statusRef.current === 'running'
        ? pausedElapsedRef.current + (performance.now() - startTimeRef.current)
        : pausedElapsedRef.current;

    const { state: current } = computeStateAtElapsed(
      flat,
      currentElapsed,
      statusRef.current,
    );

    if (!current.currentPhase) return;

    const { activeEndMs } = getPhaseBoundaries(
      flat,
      current.currentPhaseIndex,
    );

    pausedElapsedRef.current = activeEndMs;
    lastProcessedRef.current = activeEndMs;

    if (statusRef.current === 'running') {
      startTimeRef.current = performance.now();
    }

    const { state: newState } = computeStateAtElapsed(
      flat,
      activeEndMs,
      statusRef.current === 'idle' ? 'idle' : statusRef.current,
    );

    if (newState.status === 'complete') {
      statusRef.current = 'complete';
      onEventRef.current?.({ type: 'timerComplete', atMs: flat.totalDurationMs });
    }

    setState(newState);
  }, [flat]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const phaseRemainingMs = state.currentPhase
    ? getPhaseRemainingMs(flat, state.elapsedMs, state.currentPhaseIndex)
    : 0;

  return {
    state,
    flat,
    start,
    pause,
    resume,
    stop,
    skipPhase,
    phaseRemainingMs,
  };
}
