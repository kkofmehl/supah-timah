import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Timer } from '@supah-timah/shared';
import { getTimer } from '../lib/api';
import { useTimerEngine } from '../hooks/useTimerEngine';
import { useWakeLock } from '../hooks/useWakeLock';
import { soundManager } from '../lib/soundManager';
import { formatTimeMs } from '../lib/timerEngine';

export function RunTimerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timer, setTimer] = useState<Timer | null>(null);
  const [started, setStarted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    if (!id) return;
    getTimer(id).then(setTimer);
  }, [id]);

  useEffect(() => {
    if (timer) document.title = `${timer.name} — Supah Timah`;
  }, [timer]);

  const handleEvent = useCallback(
    (event: Parameters<typeof soundManager.handleEvent>[0]) => {
      if (!timer) return;
      soundManager.handleEvent(
        event,
        timer.globalSounds,
        event.phase?.soundOverrides,
      );
    },
    [timer],
  );

  const { state, start, pause, resume, stop, skipPhase, phaseRemainingMs } =
    useTimerEngine({
      nodes: timer?.nodes ?? [],
      onEvent: handleEvent,
    });

  const isActive =
    state.status === 'running' ||
    state.status === 'paused' ||
    state.status === 'switchHold';

  useWakeLock(isActive);

  const handleStart = async () => {
    await soundManager.init();
    setAudioReady(true);
    setStarted(true);
    start();
  };

  const handleStop = () => {
    stop();
    setStarted(false);
    navigate('/');
  };

  if (!timer) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-[#1a1a2e]">
        <h1 className="text-3xl font-bold mb-2">{timer.name}</h1>
        <p className="text-gray-400 mb-8">Ready to start?</p>
        <button
          onClick={handleStart}
          className="w-full max-w-xs py-4 rounded-2xl bg-green-600 text-2xl font-bold active:bg-green-700"
        >
          Start
        </button>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-gray-400 text-sm"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state.status === 'complete') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 bg-green-700">
        <h1 className="text-4xl font-bold mb-4">Complete!</h1>
        <p className="text-xl mb-8 opacity-80">{timer.name}</p>
        <button
          onClick={handleStop}
          className="w-full max-w-xs py-4 rounded-2xl bg-white/20 text-xl font-bold"
        >
          Done
        </button>
      </div>
    );
  }

  const phase = state.currentPhase?.phase;
  const bgColor = phase?.color ?? '#1a1a2e';
  const displayTime = state.isInSwitchHold
    ? formatTimeMs(state.switchRemainingMs)
    : state.countdownValue !== null
      ? String(state.countdownValue)
      : formatTimeMs(phaseRemainingMs);

  return (
    <div
      className="min-h-full flex flex-col transition-colors duration-300"
      style={{ backgroundColor: bgColor }}
    >
      <div className="p-4 flex justify-between items-start">
        <button
          onClick={handleStop}
          className="text-white/70 text-sm px-3 py-1 rounded-lg bg-black/20"
        >
          Stop
        </button>
        {state.currentPhase && state.currentPhase.repeatTotal > 1 && (
          <span className="text-white/80 text-sm font-medium bg-black/20 px-3 py-1 rounded-lg">
            Round {state.currentPhase.repeatIndex}/
            {state.currentPhase.repeatTotal}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {state.isInSwitchHold ? (
          <>
            <p className="text-2xl font-bold uppercase tracking-widest mb-4">
              Switch Sides
            </p>
            <p className="text-8xl font-mono font-bold tabular-nums">
              {displayTime}
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-medium uppercase tracking-wide mb-2 opacity-90">
              {state.isPrePhaseCountdown ? 'Get Ready' : phase?.label}
            </p>
            {phase?.splitSides?.enabled && (
              <p className="text-lg font-bold uppercase tracking-widest mb-4 opacity-80">
                {state.isOnRightSide ? 'RIGHT' : 'LEFT'}
              </p>
            )}
            <p className="text-8xl font-mono font-bold tabular-nums">
              {displayTime}
            </p>
            <p className="text-sm mt-4 opacity-60 capitalize">
              {phase?.type.replace('_', ' ')}
            </p>
          </>
        )}
      </div>

      <div className="p-6 flex gap-3 justify-center">
        {state.status === 'running' ? (
          <button
            onClick={pause}
            className="flex-1 max-w-[140px] py-4 rounded-2xl bg-black/30 text-lg font-bold"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={resume}
            className="flex-1 max-w-[140px] py-4 rounded-2xl bg-black/30 text-lg font-bold"
          >
            Resume
          </button>
        )}
        <button
          onClick={skipPhase}
          className="flex-1 max-w-[140px] py-4 rounded-2xl bg-black/30 text-lg font-bold"
        >
          Skip
        </button>
      </div>

      <div className="h-1 bg-black/20">
        <div
          className="h-full bg-white/40 transition-all duration-200"
          style={{ width: `${state.progress * 100}%` }}
        />
      </div>

      {!audioReady && (
        <p className="text-center text-xs text-white/40 pb-2">
          Tap start to enable sounds
        </p>
      )}
    </div>
  );
}
