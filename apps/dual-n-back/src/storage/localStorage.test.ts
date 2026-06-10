import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalStorageAdapter } from './localStorage';
import { STORAGE_KEY } from '../engine/constants';
import { createDefaultState } from '../state/defaultState';
import type { PersistedState } from '../engine/types';

const sample: PersistedState = {
  schemaVersion: 1,
  settings: {
    nBackLevel: 2,
    blocksPerSession: 10,
    speedMultiplier: 1,
    instantFeedback: true,
    autoLevelProgression: true,
    audioSource: 'auto',
    voice: 'alice',
    theme: 'mono',
  },
  player: {
    totalSessionsCompleted: 0,
    lastSessionDate: null,
    currentStreak: 0,
    longestStreak: 0,
    bestLevel: 1,
    hasSeenTutorial: false,
  },
  history: [],
};

describe('localStorage adapter', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing is stored', () => {
    const s = createLocalStorageAdapter();
    expect(s.load()).toBeNull();
  });

  it('roundtrips a state', () => {
    const s = createLocalStorageAdapter();
    s.save(sample);
    expect(s.load()).toEqual(sample);
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const s = createLocalStorageAdapter();
    expect(s.load()).toBeNull();
  });

  it('returns null on wrong schemaVersion', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99 }));
    const s = createLocalStorageAdapter();
    expect(s.load()).toBeNull();
  });

  it('fills fields missing from an older save with defaults', () => {
    // A save written before newer settings fields existed.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        settings: { nBackLevel: 4, theme: 'forest' },
        player: { totalSessionsCompleted: 12, bestLevel: 5 },
      }),
    );
    const s = createLocalStorageAdapter();
    const loaded = s.load();
    const def = createDefaultState();
    expect(loaded).not.toBeNull();
    expect(loaded!.settings.nBackLevel).toBe(4); // saved value wins
    expect(loaded!.settings.theme).toBe('forest');
    expect(loaded!.settings.speedMultiplier).toBe(def.settings.speedMultiplier); // default fills gap
    expect(loaded!.settings.voice).toBe(def.settings.voice);
    expect(loaded!.player.totalSessionsCompleted).toBe(12);
    expect(loaded!.player.currentStreak).toBe(0);
    expect(loaded!.history).toEqual([]);
  });

  it('clears state', () => {
    const s = createLocalStorageAdapter();
    s.save(sample);
    s.clear();
    expect(s.load()).toBeNull();
  });
});
