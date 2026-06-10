/**
 * Identity of the two central targets the player has to discriminate between.
 * For v1 we use abstract glyphs (a chevron vs. a diamond) rather than cars,
 * keeping the cognitive task identical while avoiding BrainHQ's specific theme.
 */
export type CentralTarget = 'A' | 'B';

/**
 * Position of the peripheral target. Indexed slot in the radial layout.
 * Stage difficulty controls how many slots exist (4, 8, 16) and the eccentricity.
 */
export type PeripheralPosition = number;

export interface StimulusSpec {
  central: CentralTarget;
  peripheralPosition: PeripheralPosition;
  /** Slots that contain a distractor (hollow star — same shape as the target, different fill). */
  distractorPositions: PeripheralPosition[];
}

export interface TrialResult {
  durationMs: number;
  stimulus: StimulusSpec;
  centralResponse: CentralTarget;
  centralCorrect: boolean;
  /** Slot the player tapped, or null when the stage has a single slot (locate step skipped). */
  peripheralResponse: PeripheralPosition | null;
  peripheralCorrect: boolean;
  /** Both parts correct — this is what the staircase adapts on. */
  correct: boolean;
  /** Central choice time, measured from when the response cards appear (ms). */
  reactionTimeMs: number;
}

export type StaircaseDirection = 'down' | 'up' | 'none';

export interface StaircaseState {
  /** Current stimulus duration in ms that should be shown for the next trial. */
  durationMs: number;
  /** Consecutive correct since last incorrect (or since start). */
  consecutiveCorrect: number;
  /** Consecutive incorrect since last correct (or since start). */
  consecutiveIncorrect: number;
  /** Reversal durations recorded in chronological order. */
  reversals: number[];
  /** Direction of most recent step ('none' before any step). */
  lastStepDirection: StaircaseDirection;
  /** Current multiplicative step factor (shrinks at reversals). */
  stepFactor: number;
}

export interface SessionAttempt {
  id: string;
  stageId: number;
  startedAt: number;
  finishedAt: number;
  trials: TrialResult[];
  /** Threshold in ms estimated from the staircase (null if too few reversals). */
  thresholdMs: number | null;
  /** All reversal durations across the staircase, oldest first. */
  reversals: number[];
}

export interface StageBest {
  thresholdMs: number;
  attemptId: string;
  achievedAt: number;
}

export interface Player {
  totalAttempts: number;
  lastAttemptDate: string | null;
  currentStreak: number;
  longestStreak: number;
  /** Per-stage best (lowest) threshold ever achieved. */
  bestThresholdByStage: Record<number, StageBest>;
}

export type ThemeId = 'light' | 'mono' | 'indigo' | 'forest' | 'amber';

export interface Settings {
  theme: ThemeId;
  /** Whether the post-stimulus mask is enabled (default true; off matches BrainHQ Double Decision). */
  useMask: boolean;
  /** Trials per level attempt. */
  trialsPerLevel: number;
}

export interface PersistedState {
  schemaVersion: 1;
  settings: Settings;
  player: Player;
  history: SessionAttempt[];
}
