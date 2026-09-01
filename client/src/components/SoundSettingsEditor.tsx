import type { SoundSettings } from '@supah-timah/shared';

const SOUND_LABELS: Record<keyof SoundSettings, string> = {
  intervalStart: 'Interval start',
  intervalEnd: 'Interval end',
  halfway: 'Halfway',
  switchSides: 'Switch sides',
  startRest: 'Start rest',
  getReady: 'Get ready',
  countdown: 'Countdown',
  workoutComplete: 'Workout complete',
};

interface SoundSettingsEditorProps {
  settings: SoundSettings;
  onChange: (settings: SoundSettings) => void;
  title?: string;
}

export function SoundSettingsEditor({
  settings,
  onChange,
  title = 'Sounds',
}: SoundSettingsEditorProps) {
  const toggle = (key: keyof SoundSettings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SOUND_LABELS) as (keyof SoundSettings)[]).map((key) => (
          <label
            key={key}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={() => toggle(key)}
              className="w-4 h-4 rounded"
            />
            {SOUND_LABELS[key]}
          </label>
        ))}
      </div>
    </div>
  );
}
