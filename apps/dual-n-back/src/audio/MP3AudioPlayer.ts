import { LETTERS } from '../engine/constants';
import type { Letter, VoiceId } from '../engine/types';
import type { AudioPlayer } from './AudioPlayer';

// One AudioContext for the whole app. Browsers cap how many contexts can run
// at once (iOS Safari is strictest), so a context per player instance — which
// is created per block and per settings preview — leaks until audio dies.
let sharedCtx: AudioContext | null = null;

async function ensureContext(): Promise<AudioContext> {
  if (!sharedCtx) {
    sharedCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (sharedCtx.state === 'suspended') await sharedCtx.resume();
  return sharedCtx;
}

// Decoded buffers outlive player instances so re-entering a block (or
// previewing voices) doesn't re-fetch and re-decode every mp3.
const bufferCache = new Map<string, AudioBuffer>();

export function createMP3AudioPlayer(voice: VoiceId): AudioPlayer {
  async function loadOne(letter: Letter): Promise<AudioBuffer> {
    const key = `${voice}/${letter}`;
    const cached = bufferCache.get(key);
    if (cached) return cached;
    const url = `/audio/letters/${voice}/${letter}.mp3`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
    const arr = await res.arrayBuffer();
    const c = await ensureContext();
    const buf = await c.decodeAudioData(arr);
    bufferCache.set(key, buf);
    return buf;
  }

  return {
    async preload(): Promise<void> {
      await ensureContext();
      await Promise.all(LETTERS.map((l) => loadOne(l)));
    },

    async playLetter(letter: Letter): Promise<void> {
      const c = await ensureContext();
      const buf = bufferCache.get(`${voice}/${letter}`);
      if (!buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(c.currentTime);
    },
  };
}
