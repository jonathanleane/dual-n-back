import { useCallback, useEffect, useRef, useState } from 'react';
import { createLocalStorageAdapter } from '../storage/localStorage';
import type { AppStorage } from '../storage/Storage';
import { HISTORY_CAP } from '../engine/constants';
import type {
  PersistedState,
  Player,
  SessionAttempt,
  Settings,
} from '../engine/types';
import { createDefaultState } from './defaultState';

const SAVE_DEBOUNCE_MS = 500;

// One adapter for the whole app. Creating it as a default parameter would
// mint a new object identity every render and churn the save effect's deps.
const defaultStorage = createLocalStorageAdapter();

export interface UsePlayerState {
  state: PersistedState;
  updateSettings: (patch: Partial<Settings>) => void;
  recordAttempt: (attempt: SessionAttempt) => void;
  resetAll: () => void;
}

export function usePlayerState(storage: AppStorage = defaultStorage): UsePlayerState {
  const [state, setState] = useState<PersistedState>(
    () => storage.load() ?? createDefaultState(),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => storage.save(state), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, storage]);

  // The debounce above would lose the final write if the tab closes within
  // 500ms of the last change — flush synchronously when the page is hidden.
  useEffect(() => {
    const flush = () => storage.save(stateRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [storage]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const recordAttempt = useCallback((attempt: SessionAttempt) => {
    setState((prev) => {
      const history = [attempt, ...prev.history].slice(0, HISTORY_CAP);
      const player = updatePlayerWithAttempt(prev.player, attempt);
      return { ...prev, history, player };
    });
  }, []);

  const resetAll = useCallback(() => {
    setState(createDefaultState());
    storage.clear();
  }, [storage]);

  return { state, updateSettings, recordAttempt, resetAll };
}

function updatePlayerWithAttempt(prev: Player, attempt: SessionAttempt): Player {
  const today = localDateKey(attempt.finishedAt);
  let currentStreak = prev.currentStreak;
  if (prev.lastAttemptDate === today) {
    /* same day, no streak change */
  } else if (prev.lastAttemptDate && isYesterday(prev.lastAttemptDate, today)) {
    currentStreak = prev.currentStreak + 1;
  } else {
    currentStreak = 1;
  }

  const bestThresholdByStage = { ...prev.bestThresholdByStage };
  if (attempt.thresholdMs !== null) {
    const existing = bestThresholdByStage[attempt.stageId];
    if (!existing || attempt.thresholdMs < existing.thresholdMs) {
      bestThresholdByStage[attempt.stageId] = {
        thresholdMs: attempt.thresholdMs,
        attemptId: attempt.id,
        achievedAt: attempt.finishedAt,
      };
    }
  }

  return {
    ...prev,
    totalAttempts: prev.totalAttempts + 1,
    lastAttemptDate: today,
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    bestThresholdByStage,
  };
}

function localDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isYesterday(prev: string, today: string): boolean {
  const t = new Date(today + 'T00:00:00Z').getTime();
  const p = new Date(prev + 'T00:00:00Z').getTime();
  return t - p === 24 * 60 * 60 * 1000;
}
