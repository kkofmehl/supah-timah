import { formatTime, formatTimeMs } from '../lib/timerEngine';

interface DurationStepperProps {
  valueSeconds: number;
  onChange: (seconds: number) => void;
  label?: string;
  min?: number;
  step?: number;
}

export function DurationStepper({
  valueSeconds,
  onChange,
  label,
  min = 0,
  step = 5,
}: DurationStepperProps) {
  const adjust = (delta: number) => {
    onChange(Math.max(min, valueSeconds + delta));
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-gray-400">{label}</label>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => adjust(-step)}
          className="w-12 h-12 rounded-full bg-white/10 text-xl font-bold active:bg-white/20"
        >
          −
        </button>
        <span className="text-2xl font-mono min-w-[5rem] text-center">
          {formatTime(valueSeconds)}
        </span>
        <button
          type="button"
          onClick={() => adjust(step)}
          className="w-12 h-12 rounded-full bg-white/10 text-xl font-bold active:bg-white/20"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function formatDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export { formatTime, formatTimeMs };
