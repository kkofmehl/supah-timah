import type { Phase, SoundSettings } from '@supah-timah/shared';
import type { TimerEvent, TimerEventType } from './timerEngine';

export type SoundKey =
  | 'intervalStart'
  | 'intervalEnd'
  | 'halfway'
  | 'switchSides'
  | 'startRest'
  | 'getReady'
  | 'countdown'
  | 'workoutComplete';

const SOUND_FILES: Record<SoundKey, string> = {
  intervalStart: '/sounds/interval-start.wav',
  intervalEnd: '/sounds/interval-end.wav',
  halfway: '/sounds/halfway.wav',
  switchSides: '/sounds/switch.wav',
  startRest: '/sounds/rest.wav',
  getReady: '/sounds/get-ready.wav',
  countdown: '/sounds/tick.wav',
  workoutComplete: '/sounds/complete.wav',
};

const EVENT_TO_SOUND: Partial<Record<TimerEventType, SoundKey>> = {
  phaseStart: 'intervalStart',
  phaseEnd: 'intervalEnd',
  halfway: 'halfway',
  switchSides: 'switchSides',
  repeatRestStart: 'startRest',
  countdown: 'countdown',
  timerComplete: 'workoutComplete',
};

const PHASE_TYPE_SOUND: Partial<Record<Phase['type'], SoundKey>> = {
  get_ready: 'getReady',
  rest: 'startRest',
};

function resolveSoundKey(
  event: TimerEvent,
  globalSounds: SoundSettings,
  phaseSounds?: Partial<SoundSettings>,
): SoundKey | null {
  const sounds = { ...globalSounds, ...phaseSounds };

  let key: SoundKey | undefined;

  if (event.type === 'phaseStart' && event.phase) {
    key = PHASE_TYPE_SOUND[event.phase.type] ?? 'intervalStart';
  } else {
    key = EVENT_TO_SOUND[event.type];
  }

  if (!key) return null;
  if (!sounds[key]) return null;
  return key;
}

export class SoundManager {
  private buffers = new Map<SoundKey, AudioBuffer>();
  private context: AudioContext | null = null;
  private loaded = false;
  private loading: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.loaded) return;
    if (this.loading) return this.loading;

    this.loading = this.loadAll();
    await this.loading;
  }

  private async loadAll(): Promise<void> {
    this.context = new AudioContext();
    await Promise.all(
      (Object.entries(SOUND_FILES) as [SoundKey, string][]).map(
        async ([key, url]) => {
          try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = await this.context!.decodeAudioData(arrayBuffer);
            this.buffers.set(key, buffer);
          } catch {
            // Sound file missing — skip silently
          }
        },
      ),
    );
    this.loaded = true;
  }

  play(key: SoundKey): void {
    if (!this.context || !this.buffers.has(key)) return;

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }

    const source = this.context.createBufferSource();
    source.buffer = this.buffers.get(key)!;
    source.connect(this.context.destination);
    source.start(0);
  }

  playRepeated(key: SoundKey, count: number, intervalMs = 150): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => this.play(key), i * intervalMs);
    }
  }

  handleEvent(
    event: TimerEvent,
    globalSounds: SoundSettings,
    phaseSounds?: Partial<SoundSettings>,
  ): void {
    if (event.type === 'halfway') {
      const sounds = { ...globalSounds, ...phaseSounds };
      if (sounds.halfway) {
        this.playRepeated('halfway', 3);
      }
      return;
    }

    const key = resolveSoundKey(event, globalSounds, phaseSounds);
    if (key) this.play(key);
  }
}

export const soundManager = new SoundManager();
