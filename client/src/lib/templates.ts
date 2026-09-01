import {
  createId,
  DEFAULT_SOUND_SETTINGS,
  type Phase,
  type RepeatBlock,
  type Timer,
  type TimerNode,
} from '@supah-timah/shared';

const WORK_COLOR = '#E74C3C';
const REST_COLOR = '#2ECC71';
const WARMUP_COLOR = '#4A90D9';
const COOLDOWN_COLOR = '#3498DB';

function phase(
  type: Phase['type'],
  label: string,
  durationSeconds: number,
  color: string,
  extras?: Partial<Phase>,
): Phase {
  return {
    kind: 'phase',
    id: createId(),
    type,
    label,
    durationSeconds,
    color,
    halfwayNotification: false,
    ...extras,
  };
}

function repeat(
  label: string,
  repeatCount: number,
  children: TimerNode[],
  restBetweenRepeatsSeconds?: number,
): RepeatBlock {
  return {
    kind: 'repeat',
    id: createId(),
    label,
    repeatCount,
    restBetweenRepeatsSeconds,
    children,
  };
}

function baseTimer(name: string, nodes: TimerNode[]): Timer {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    globalSounds: { ...DEFAULT_SOUND_SETTINGS },
    nodes,
  };
}

export interface SimpleTemplateParams {
  name: string;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
}

export function createSimpleTimer(params: SimpleTemplateParams): Timer {
  return baseTimer(params.name, [
    repeat('Round', params.rounds, [
      phase('work', 'Work', params.workSeconds, WORK_COLOR),
      phase('rest', 'Rest', params.restSeconds, REST_COLOR),
    ]),
  ]);
}

export interface HiitTemplateParams {
  name: string;
  warmupSeconds: number;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  roundRestSeconds: number;
  cooldownSeconds: number;
}

export function createHiitTimer(params: HiitTemplateParams): Timer {
  const nodes: TimerNode[] = [];

  if (params.warmupSeconds > 0) {
    nodes.push(
      phase('warmup', 'Warmup', params.warmupSeconds, WARMUP_COLOR),
    );
  }

  nodes.push(
    repeat('Round', params.rounds, [
      phase('work', 'Work', params.workSeconds, WORK_COLOR, {
        halfwayNotification: true,
      }),
      phase('rest', 'Rest', params.restSeconds, REST_COLOR),
    ], params.roundRestSeconds),
  );

  if (params.cooldownSeconds > 0) {
    nodes.push(
      phase('cooldown', 'Cooldown', params.cooldownSeconds, COOLDOWN_COLOR),
    );
  }

  return baseTimer(params.name, nodes);
}

export interface TabataTemplateParams {
  name: string;
  rounds: number;
}

export function createTabataTimer(params: TabataTemplateParams): Timer {
  return baseTimer(params.name, [
    repeat('Tabata', params.rounds, [
      phase('work', 'Work', 20, WORK_COLOR, { halfwayNotification: true }),
      phase('rest', 'Rest', 10, REST_COLOR),
    ]),
  ]);
}

export interface CircuitExercise {
  name: string;
  durationSeconds: number;
  color?: string;
  splitSides?: boolean;
  switchDurationSeconds?: number;
}

export interface CircuitTemplateParams {
  name: string;
  exercises: CircuitExercise[];
  rounds: number;
  restBetweenExercisesSeconds: number;
  restBetweenRoundsSeconds: number;
}

export function createCircuitTimer(params: CircuitTemplateParams): Timer {
  const exerciseNodes: TimerNode[] = [];

  for (let i = 0; i < params.exercises.length; i++) {
    const ex = params.exercises[i];
    exerciseNodes.push(
      phase('work', ex.name, ex.durationSeconds, ex.color ?? WORK_COLOR, {
        halfwayNotification: !ex.splitSides,
        splitSides: ex.splitSides
          ? {
              enabled: true,
              switchDurationSeconds: ex.switchDurationSeconds ?? 5,
            }
          : undefined,
      }),
    );

    if (
      i < params.exercises.length - 1 &&
      params.restBetweenExercisesSeconds > 0
    ) {
      exerciseNodes.push(
        phase(
          'rest',
          'Rest',
          params.restBetweenExercisesSeconds,
          REST_COLOR,
        ),
      );
    }
  }

  return baseTimer(params.name, [
    repeat('Circuit', params.rounds, exerciseNodes, params.restBetweenRoundsSeconds),
  ]);
}

export interface EmomTemplateParams {
  name: string;
  intervalSeconds: number;
  rounds: number;
  exerciseLabel: string;
  workSeconds?: number;
}

export function createEmomTimer(params: EmomTemplateParams): Timer {
  const workSeconds = params.workSeconds ?? params.intervalSeconds;
  const restSeconds = Math.max(0, params.intervalSeconds - workSeconds);

  const roundChildren: TimerNode[] = [
    phase('work', params.exerciseLabel, workSeconds, WORK_COLOR),
  ];

  if (restSeconds > 0) {
    roundChildren.push(phase('rest', 'Rest', restSeconds, REST_COLOR));
  }

  return baseTimer(params.name, [
    repeat('EMOM', params.rounds, roundChildren),
  ]);
}

export function createBlankTimer(name = 'New Timer'): Timer {
  return baseTimer(name, [
    phase('work', 'Work', 30, WORK_COLOR),
  ]);
}

export type TemplateType =
  | 'blank'
  | 'simple'
  | 'hiit'
  | 'tabata'
  | 'circuit'
  | 'emom';

export const TEMPLATE_INFO: Record<
  TemplateType,
  { label: string; description: string }
> = {
  blank: { label: 'Blank', description: 'Start from scratch' },
  simple: { label: 'Simple', description: 'Work + rest intervals' },
  hiit: { label: 'HIIT', description: 'Warmup, rounds, cooldown' },
  tabata: { label: 'Tabata', description: '20s work / 10s rest' },
  circuit: { label: 'Circuit', description: 'Multiple exercises per round' },
  emom: { label: 'EMOM', description: 'Every minute on the minute' },
};
