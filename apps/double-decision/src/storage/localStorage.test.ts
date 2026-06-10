import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalStorageAdapter } from './localStorage';
import { STORAGE_KEY } from '../engine/constants';
import { createDefaultState } from '../state/defaultState';
import type { PersistedState } from '../engine/types';

const sample: PersistedState = {
  schemaVersion: 1,
  settings: {
    theme: 'indigo',
    useMask: false,
    trialsPerLevel: 25,
  },
  player: {
    totalAttempts: 3,
    lastAttemptDate: '2026-06-01',
    currentStreak: 2,
    longestStreak: 2,
    bestThresholdByStage: { 1: { thresholdMs: 120, attemptId: 'abc', achievedAt: 1 } },
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
    // A save written before `trialsPerLevel` (or any future field) existed.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        settings: { theme: 'mono' },
        player: { totalAttempts: 7 },
      }),
    );
    const s = createLocalStorageAdapter();
    const loaded = s.load();
    const def = createDefaultState();
    expect(loaded).not.toBeNull();
    expect(loaded!.settings.theme).toBe('mono'); // saved value wins
    expect(loaded!.settings.trialsPerLevel).toBe(def.settings.trialsPerLevel); // default fills the gap
    expect(loaded!.settings.useMask).toBe(def.settings.useMask);
    expect(loaded!.player.totalAttempts).toBe(7);
    expect(loaded!.player.bestThresholdByStage).toEqual({});
    expect(loaded!.history).toEqual([]);
  });

  it('clears state', () => {
    const s = createLocalStorageAdapter();
    s.save(sample);
    s.clear();
    expect(s.load()).toBeNull();
  });
});
