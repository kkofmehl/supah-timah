import { describe, it, expect } from 'vitest';
import { createBoxingBellWav, createWav } from '../../../scripts/generate-sounds.js';

function readPcmPeak(wav) {
  let peak = 0;
  for (let i = 44; i < wav.length; i += 2) {
    peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
  }
  return peak;
}

describe('generate-sounds', () => {
  it('creates a valid WAV header for beeps', () => {
    const wav = createWav(440, 100);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.length).toBeGreaterThan(44);
    expect(readPcmPeak(wav)).toBeGreaterThan(1000);
  });

  it('creates a ringing boxing bell ding for interval start', () => {
    const bell = createBoxingBellWav(450);
    const beep = createWav(880, 150);

    expect(bell.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bell.length).toBeGreaterThan(beep.length);
    expect(readPcmPeak(bell)).toBeGreaterThan(1000);
  });
});
