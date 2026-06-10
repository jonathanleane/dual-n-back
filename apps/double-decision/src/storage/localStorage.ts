import { STORAGE_KEY } from '../engine/constants';
import { createDefaultState } from '../state/defaultState';
import type { PersistedState } from '../engine/types';
import type { AppStorage } from './Storage';

export function createLocalStorageAdapter(): AppStorage {
  return {
    load(): PersistedState | null {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed?.schemaVersion !== 1) return null;
        // Merge over defaults so settings/player fields added after this save
        // was written come back with sane values instead of undefined.
        const def = createDefaultState();
        return {
          schemaVersion: 1,
          settings: { ...def.settings, ...(parsed.settings ?? {}) },
          player: { ...def.player, ...(parsed.player ?? {}) },
          history: Array.isArray(parsed.history) ? parsed.history : [],
        };
      } catch {
        return null;
      }
    },
    save(state: PersistedState): void {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Quota or unavailable; ignore. State stays in memory.
      }
    },
    clear(): void {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Unavailable; nothing to clear.
      }
    },
  };
}
