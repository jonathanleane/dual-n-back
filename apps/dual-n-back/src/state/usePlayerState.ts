import { useCallback, useEffect, useRef, useState } from 'react';
import { createLocalStorageAdapter } from '../storage/localStorage';
import type { AppStorage } from '../storage/Storage';
import type {
  PersistedState,
  SessionResult,
  Settings,
} from '../engine/types';
import { createDefaultState } from './defaultState';
import { HISTORY_CAP } from '../engine/constants';
import { localDateKey } from '../engine/dates';

const SAVE_DEBOUNCE_MS = 500;

// One adapter for the whole app. Creating it as a default parameter would
// mint a new object identity every render and churn the save effect's deps.
const defaultStorage = createLocalStorageAdapter();

export interface UsePlayerState {
  state: PersistedState;
  updateSettings: (patch: Partial<Settings>) => void;
  recordSession: (session: SessionResult) => void;
  setTutorialSeen: (seen: boolean) => void;
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

  const recordSession = useCallback((session: SessionResult) => {
    setState((prev) => {
      const history = [session, ...prev.history].slice(0, HISTORY_CAP);
      const player = computePlayerUpdate(prev.player, session);
      return { ...prev, history, player };
    });
  }, []);

  const setTutorialSeen = useCallback((seen: boolean) => {
    setState((prev) => ({
      ...prev,
      player: { ...prev.player, hasSeenTutorial: seen },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState(createDefaultState());
    storage.clear();
  }, [storage]);

  return { state, updateSettings, recordSession, setTutorialSeen, resetAll };
}

function computePlayerUpdate(prev: PersistedState['player'], session: SessionResult) {
  const today = localDateKey(session.finishedAt);
  const lastDate = prev.lastSessionDate;
  let currentStreak = prev.currentStreak;

  if (session.completed) {
    if (lastDate === today) {
      /* no-op */
    } else if (lastDate && isYesterday(lastDate, today)) {
      currentStreak = prev.currentStreak + 1;
    } else {
      currentStreak = 1;
    }
  }

  const totalSessionsCompleted = session.completed
    ? prev.totalSessionsCompleted + 1
    : prev.totalSessionsCompleted;
  const bestLevel = Math.max(prev.bestLevel, session.endingLevel);
  const longestStreak = Math.max(prev.longestStreak, currentStreak);

  return {
    ...prev,
    totalSessionsCompleted,
    lastSessionDate: session.completed ? today : prev.lastSessionDate,
    currentStreak,
    longestStreak,
    bestLevel,
  };
}

function isYesterday(prev: string, today: string): boolean {
  const t = new Date(today + 'T00:00:00Z').getTime();
  const p = new Date(prev + 'T00:00:00Z').getTime();
  return t - p === 24 * 60 * 60 * 1000;
}
