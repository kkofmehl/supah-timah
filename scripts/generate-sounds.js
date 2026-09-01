#!/usr/bin/env node
/**
 * Generates simple notification sound WAV files for the workout timer.
 * Run: node scripts/generate-sounds.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../client/public/sounds');

function createWav(frequency, durationMs, volume = 0.3) {
  const sampleRate = 22050;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, (numSamples - i) / (sampleRate * 0.05));
    const sample =
      Math.sin(2 * Math.PI * frequency * t) * volume * envelope * 32767;
    buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
  }

  return buffer;
}

const sounds = {
  'interval-start': { freq: 880, duration: 150 },
  'interval-end': { freq: 440, duration: 200 },
  halfway: { freq: 660, duration: 100 },
  switch: { freq: 550, duration: 250 },
  rest: { freq: 330, duration: 300 },
  'get-ready': { freq: 523, duration: 200 },
  tick: { freq: 1000, duration: 50 },
  complete: { freq: 784, duration: 500 },
};

fs.mkdirSync(outDir, { recursive: true });

for (const [name, { freq, duration }] of Object.entries(sounds)) {
  const wav = createWav(freq, duration);
  // Sound manager expects .mp3 but WAV works in browsers via AudioContext
  fs.writeFileSync(path.join(outDir, `${name}.wav`), wav);
  console.log(`Generated ${name}.wav`);
}
