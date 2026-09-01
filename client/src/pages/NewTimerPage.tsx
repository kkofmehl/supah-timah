import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TEMPLATE_INFO,
  type TemplateType,
  createBlankTimer,
  createSimpleTimer,
  createHiitTimer,
  createTabataTimer,
  createCircuitTimer,
  createEmomTimer,
} from '../lib/templates';
import { createTimer } from '../lib/api';
import { DurationStepper } from '../components/DurationStepper';

export function NewTimerPage() {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TemplateType | null>(null);
  const [name, setName] = useState('My Timer');
  const [saving, setSaving] = useState(false);

  // Simple / HIIT params
  const [workSeconds, setWorkSeconds] = useState(40);
  const [restSeconds, setRestSeconds] = useState(20);
  const [rounds, setRounds] = useState(5);
  const [warmupSeconds, setWarmupSeconds] = useState(300);
  const [cooldownSeconds, setCooldownSeconds] = useState(300);
  const [roundRestSeconds, setRoundRestSeconds] = useState(60);

  // Circuit params
  const [exercises, setExercises] = useState([
    { name: 'Exercise 1', durationSeconds: 30 },
    { name: 'Exercise 2', durationSeconds: 30 },
  ]);
  const [restBetweenExercises, setRestBetweenExercises] = useState(10);
  const [restBetweenRounds, setRestBetweenRounds] = useState(60);

  // EMOM params
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [emomWorkSeconds, setEmomWorkSeconds] = useState(40);
  const [exerciseLabel, setExerciseLabel] = useState('Work');

  const handleCreate = async () => {
    if (!template) return;
    setSaving(true);

    let timer;
    switch (template) {
      case 'blank':
        timer = createBlankTimer(name);
        break;
      case 'simple':
        timer = createSimpleTimer({ name, workSeconds, restSeconds, rounds });
        break;
      case 'hiit':
        timer = createHiitTimer({
          name,
          warmupSeconds,
          workSeconds,
          restSeconds,
          rounds,
          roundRestSeconds,
          cooldownSeconds,
        });
        break;
      case 'tabata':
        timer = createTabataTimer({ name, rounds });
        break;
      case 'circuit':
        timer = createCircuitTimer({
          name,
          exercises,
          rounds,
          restBetweenExercisesSeconds: restBetweenExercises,
          restBetweenRoundsSeconds: restBetweenRounds,
        });
        break;
      case 'emom':
        timer = createEmomTimer({
          name,
          intervalSeconds,
          rounds,
          exerciseLabel,
          workSeconds: emomWorkSeconds,
        });
        break;
    }

    const saved = await createTimer(timer);
    setSaving(false);
    navigate(`/edit/${saved.id}`);
  };

  if (!template) {
    return (
      <div className="min-h-full p-4">
        <header className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 text-sm mb-2"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">New Timer</h1>
          <p className="text-gray-400 mt-1">Choose a template</p>
        </header>

        <div className="grid gap-3">
          {(Object.keys(TEMPLATE_INFO) as TemplateType[]).map((key) => (
            <button
              key={key}
              onClick={() => setTemplate(key)}
              className="text-left p-4 rounded-xl bg-white/5 active:bg-white/10"
            >
              <h2 className="font-semibold">{TEMPLATE_INFO[key].label}</h2>
              <p className="text-sm text-gray-400">
                {TEMPLATE_INFO[key].description}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 pb-24">
      <header className="mb-6">
        <button
          onClick={() => setTemplate(null)}
          className="text-gray-400 text-sm mb-2"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">
          {TEMPLATE_INFO[template].label} Timer
        </h1>
      </header>

      <div className="space-y-6">
        <div>
          <label className="text-sm text-gray-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none"
          />
        </div>

        {(template === 'simple' || template === 'hiit') && (
          <>
            {template === 'hiit' && (
              <DurationStepper
                label="Warmup"
                valueSeconds={warmupSeconds}
                onChange={setWarmupSeconds}
              />
            )}
            <DurationStepper
              label="Work"
              valueSeconds={workSeconds}
              onChange={setWorkSeconds}
            />
            <DurationStepper
              label="Rest"
              valueSeconds={restSeconds}
              onChange={setRestSeconds}
            />
            <div>
              <label className="text-sm text-gray-400">Rounds</label>
              <input
                type="number"
                min={1}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full mt-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              />
            </div>
            {template === 'hiit' && (
              <>
                <DurationStepper
                  label="Rest between rounds"
                  valueSeconds={roundRestSeconds}
                  onChange={setRoundRestSeconds}
                />
                <DurationStepper
                  label="Cooldown"
                  valueSeconds={cooldownSeconds}
                  onChange={setCooldownSeconds}
                />
              </>
            )}
          </>
        )}

        {template === 'tabata' && (
          <div>
            <label className="text-sm text-gray-400">Rounds</label>
            <input
              type="number"
              min={1}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full mt-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20"
            />
            <p className="text-sm text-gray-500 mt-2">20s work / 10s rest</p>
          </div>
        )}

        {template === 'circuit' && (
          <>
            <div className="space-y-3">
              <label className="text-sm text-gray-400">Exercises</label>
              {exercises.map((ex, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={ex.name}
                    onChange={(e) => {
                      const next = [...exercises];
                      next[i] = { ...ex, name: e.target.value };
                      setExercises(next);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20"
                  />
                  <input
                    type="number"
                    min={5}
                    value={ex.durationSeconds}
                    onChange={(e) => {
                      const next = [...exercises];
                      next[i] = {
                        ...ex,
                        durationSeconds: Number(e.target.value),
                      };
                      setExercises(next);
                    }}
                    className="w-20 px-3 py-2 rounded-lg bg-white/10 border border-white/20"
                  />
                </div>
              ))}
              <button
                onClick={() =>
                  setExercises([
                    ...exercises,
                    {
                      name: `Exercise ${exercises.length + 1}`,
                      durationSeconds: 30,
                    },
                  ])
                }
                className="text-sm text-indigo-400"
              >
                + Add exercise
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-400">Rounds</label>
              <input
                type="number"
                min={1}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full mt-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              />
            </div>
            <DurationStepper
              label="Rest between exercises"
              valueSeconds={restBetweenExercises}
              onChange={setRestBetweenExercises}
            />
            <DurationStepper
              label="Rest between rounds"
              valueSeconds={restBetweenRounds}
              onChange={setRestBetweenRounds}
            />
          </>
        )}

        {template === 'emom' && (
          <>
            <div>
              <label className="text-sm text-gray-400">Exercise</label>
              <input
                value={exerciseLabel}
                onChange={(e) => setExerciseLabel(e.target.value)}
                className="w-full mt-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              />
            </div>
            <DurationStepper
              label="Interval length"
              valueSeconds={intervalSeconds}
              onChange={setIntervalSeconds}
            />
            <DurationStepper
              label="Work duration"
              valueSeconds={emomWorkSeconds}
              onChange={setEmomWorkSeconds}
            />
            <div>
              <label className="text-sm text-gray-400">Rounds</label>
              <input
                type="number"
                min={1}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="w-full mt-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20"
              />
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1a1a2e] border-t border-white/10">
        <button
          onClick={handleCreate}
          disabled={saving || !name}
          className="w-full py-3 rounded-xl bg-indigo-600 font-semibold text-lg active:bg-indigo-700 disabled:opacity-50"
        >
          {saving
            ? 'Creating…'
            : template === 'blank'
              ? 'Create & Edit'
              : 'Create Timer'}
        </button>
      </div>
    </div>
  );
}
