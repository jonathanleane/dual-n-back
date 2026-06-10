import { DEFAULT_TRIALS_PER_LEVEL } from '../engine/constants';
import type { PersistedState } from '../engine/types';

export function createDefaultState(): PersistedState {
  return {
    schemaVersion: 1,
    settings: {
      theme: 'light',
      useMask: true,
      trialsPerLevel: DEFAULT_TRIALS_PER_LEVEL,
    },
    player: {
      totalAttempts: 0,
      lastAttemptDate: null,
      currentStreak: 0,
      longestStreak: 0,
      bestThresholdByStage: {},
    },
    history: [],
  };
}
