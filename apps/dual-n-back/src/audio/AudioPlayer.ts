import type { Letter } from '../engine/types';

export interface AudioPlayer {
  /** Preload assets. Resolves when ready. May throw on failure. */
  preload(): Promise<void>;
  /** Play a letter as soon as possible. Returns when scheduled (not when finished). */
  playLetter(letter: Letter): Promise<void>;
}
