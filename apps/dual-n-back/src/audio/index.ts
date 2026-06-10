import type { AudioSource, VoiceId } from '../engine/types';
import type { AudioPlayer } from './AudioPlayer';
import { createMP3AudioPlayer } from './MP3AudioPlayer';
import { createSpeechAudioPlayer } from './SpeechAudioPlayer';

export type { AudioPlayer } from './AudioPlayer';
export { VOICES, DEFAULT_VOICE } from './voices';
export type { Voice } from './voices';

export async function createAudioPlayer(source: AudioSource, voice: VoiceId): Promise<AudioPlayer> {
  if (source === 'speech') return createSpeechAudioPlayer();
  // 'mp3' and 'auto': try mp3, fall back to speech on failure. This function
  // must never reject — callers gate the game start on it, and a rejected
  // player would leave the play screen waiting for audio forever.
  try {
    const p = createMP3AudioPlayer(voice);
    await p.preload();
    return p;
  } catch (err) {
    console.warn('MP3 audio unavailable, falling back to Web Speech:', err);
    return createSpeechAudioPlayer();
  }
}
