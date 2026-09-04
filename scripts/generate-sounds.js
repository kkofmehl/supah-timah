#!/usr/bin/env node
/**
 * Generates notification sound WAV files for the workout timer.
 * Sounds are synthesized (not downloaded). Run: node scripts/generate-sounds.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../client/public/sounds');
const SAMPLE_RATE = 22050;

function writeWavHeader(buffer, numSamples) {
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
}

function clampSample(value) {
  return Math.max(-32767, Math.min(32767, Math.round(value)));
}

/** Simple sine beep with short fade-out. */
export function createWav(frequency, durationMs, volume = 0.75) {
  const numSamples = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  const buffer = Buffer.alloc(44 + numSamples * 2);
  writeWavHeader(buffer, numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.min(1, (numSamples - i) / (SAMPLE_RATE * 0.05));
    const sample =
      Math.sin(2 * Math.PI * frequency * t) * volume * envelope * 32767;
    buffer.writeInt16LE(clampSample(sample), 44 + i * 2);
  }

  return buffer;
}

/**
 * Ringside-style boxing bell: bright metallic strike + decaying ring.
 * Used for work / interval start cues.
 */
export function createBoxingBellWav(durationMs = 450, volume = 0.55) {
  const numSamples = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  const buffer = Buffer.alloc(44 + numSamples * 2);
  writeWavHeader(buffer, numSamples);

  // Inharmonic partials give a metallic "clang" rather than a pure tone.
  // Faster decays so three sequential dings stay distinct.
  const partials = [
    { freq: 880, amp: 1.0, decay: 6.5 },
    { freq: 1760, amp: 0.55, decay: 8.0 },
    { freq: 2340, amp: 0.4, decay: 9.5 },
    { freq: 3520, amp: 0.28, decay: 12.0 },
    { freq: 4400, amp: 0.15, decay: 14.0 },
    { freq: 1320, amp: 0.35, decay: 7.5 },
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Fast attack (~4ms) then long exponential ring.
    const attack = Math.min(1, t / 0.004);
    let mixed = 0;
    for (const { freq, amp, decay } of partials) {
      mixed +=
        Math.sin(2 * Math.PI * freq * t) * amp * Math.exp(-decay * t);
    }
    // Soft saturate so the strike stays punchy without hard clipping.
    const driven = Math.tanh(mixed * 1.4) * attack * volume * 32767;
    buffer.writeInt16LE(clampSample(driven), 44 + i * 2);
  }

  return buffer;
}

const beepSounds = {
  'interval-end': { freq: 440, duration: 200 },
  halfway: { freq: 660, duration: 100 },
  switch: { freq: 550, duration: 250 },
  rest: { freq: 330, duration: 300 },
  'get-ready': { freq: 523, duration: 200 },
  tick: { freq: 1000, duration: 50 },
  complete: { freq: 784, duration: 500 },
};

export function generateAllSounds() {
  fs.mkdirSync(outDir, { recursive: true });

  const bell = createBoxingBellWav();
  fs.writeFileSync(path.join(outDir, 'interval-start.wav'), bell);
  console.log('Generated interval-start.wav (boxing bell)');

  for (const [name, { freq, duration }] of Object.entries(beepSounds)) {
    const wav = createWav(freq, duration);
    fs.writeFileSync(path.join(outDir, `${name}.wav`), wav);
    console.log(`Generated ${name}.wav`);
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  generateAllSounds();
}
