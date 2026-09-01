export type PhaseType =
  | 'get_ready'
  | 'warmup'
  | 'work'
  | 'rest'
  | 'switch'
  | 'cooldown';

export interface SoundSettings {
  intervalStart: boolean;
  intervalEnd: boolean;
  halfway: boolean;
  switchSides: boolean;
  startRest: boolean;
  getReady: boolean;
  countdown: boolean;
  workoutComplete: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  intervalStart: true,
  intervalEnd: false,
  halfway: true,
  switchSides: true,
  startRest: true,
  getReady: true,
  countdown: true,
  workoutComplete: true,
};

export interface Phase {
  kind: 'phase';
  id: string;
  type: PhaseType;
  label: string;
  durationSeconds: number;
  color: string;
  halfwayNotification: boolean;
  splitSides?: {
    enabled: true;
    switchDurationSeconds: number;
  };
  soundOverrides?: Partial<SoundSettings>;
}

export interface RepeatBlock {
  kind: 'repeat';
  id: string;
  label: string;
  repeatCount: number;
  restBetweenRepeatsSeconds?: number;
  children: TimerNode[];
}

export type TimerNode = Phase | RepeatBlock;

export interface Timer {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  globalSounds: SoundSettings;
  nodes: TimerNode[];
}

export interface TimerSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  totalDurationSeconds: number;
}

export function isPhase(node: TimerNode): node is Phase {
  return node.kind === 'phase';
}

export function isRepeatBlock(node: TimerNode): node is RepeatBlock {
  return node.kind === 'repeat';
}

export function createId(): string {
  return crypto.randomUUID();
}
