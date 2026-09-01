import fs from 'fs/promises';
import path from 'path';
import type { Timer, TimerSummary } from '@supah-timah/shared';

interface StoreData {
  timers: Timer[];
}

const DATA_FILE_NAME = 'timers.json';

function getDataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
}

function getDataFile(): string {
  return path.join(getDataDir(), DATA_FILE_NAME);
}

let cache: StoreData | null = null;

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(getDataDir(), { recursive: true });
}

async function readStore(): Promise<StoreData> {
  if (cache) return cache;
  await ensureDataDir();
  try {
    const raw = await fs.readFile(getDataFile(), 'utf-8');
    cache = JSON.parse(raw) as StoreData;
  } catch {
    cache = { timers: [] };
    await writeStore(cache);
  }
  return cache;
}

async function writeStore(data: StoreData): Promise<void> {
  await ensureDataDir();
  const dataFile = getDataFile();
  const tmp = `${dataFile}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, dataFile);
  cache = data;
}

function computeDuration(nodes: Timer['nodes']): number {
  let total = 0;

  const process = (nodeList: Timer['nodes']) => {
    for (const node of nodeList) {
      if (node.kind === 'phase') {
        total += node.durationSeconds;
      } else {
        let blockDuration = 0;
        for (const child of node.children) {
          if (child.kind === 'phase') blockDuration += child.durationSeconds;
        }
        const rest = node.restBetweenRepeatsSeconds ?? 0;
        total +=
          blockDuration * node.repeatCount +
          rest * Math.max(0, node.repeatCount - 1);
        for (const child of node.children) {
          if (child.kind === 'repeat') process([child]);
        }
      }
    }
  };

  process(nodes);
  return total;
}

export async function listTimers(): Promise<TimerSummary[]> {
  const store = await readStore();
  return store.timers.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    totalDurationSeconds: computeDuration(t.nodes),
  }));
}

export async function getTimer(id: string): Promise<Timer | null> {
  const store = await readStore();
  return store.timers.find((t) => t.id === id) ?? null;
}

export async function createTimer(timer: Timer): Promise<Timer> {
  const store = await readStore();
  store.timers.push(timer);
  await writeStore(store);
  return timer;
}

export async function updateTimer(timer: Timer): Promise<Timer | null> {
  const store = await readStore();
  const index = store.timers.findIndex((t) => t.id === timer.id);
  if (index === -1) return null;
  store.timers[index] = timer;
  await writeStore(store);
  return timer;
}

export async function deleteTimer(id: string): Promise<boolean> {
  const store = await readStore();
  const index = store.timers.findIndex((t) => t.id === id);
  if (index === -1) return false;
  store.timers.splice(index, 1);
  await writeStore(store);
  return true;
}

export function clearCache(): void {
  cache = null;
}
