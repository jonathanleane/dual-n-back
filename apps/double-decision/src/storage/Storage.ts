import type { PersistedState } from '../engine/types';

export interface AppStorage {
  load(): PersistedState | null;
  save(state: PersistedState): void;
  clear(): void;
}
