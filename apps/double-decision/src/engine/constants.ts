// Trial timing — durations a real UFOV protocol uses.
export const ITI_MS = 600;          // blank between trials
export const MASK_MS = 150;          // post-stimulus mask (BrainHQ omits this; we include it)
export const RESPONSE_PAUSE_MS = 200; // blank between mask and response choices appearing

// Staircase
export const DEFAULT_TRIALS_PER_LEVEL = 30;
export const MIN_TRIALS_PER_LEVEL = 20;
export const MAX_TRIALS_PER_LEVEL = 50;
export const STARTING_DURATION_MS = 500;
// ~3 frames at 60 Hz. Presentation is setTimeout + React render, which is
// quantised to the display refresh and jittered by the browser — durations
// below ~3 frames can't be delivered reliably, so thresholds under this
// floor would be measurement noise, not perception.
export const FLOOR_DURATION_MS = 50;
export const CEILING_DURATION_MS = 2000;

// 3-down-1-up converges on ~79% correct (Levitt 1971).
export const DOWN_AFTER_N_CORRECT = 3;
export const UP_AFTER_N_INCORRECT = 1;
// Step size starts large and halves on each reversal until reaching minimum.
export const INITIAL_STEP_FACTOR = Math.SQRT2; // multiply/divide by sqrt(2) per step
export const MIN_STEP_FACTOR = 1.07; // ~7% per step floor

// Threshold estimate uses geometric mean of last K reversals.
export const REVERSAL_WINDOW = 6;
// Need at least this many reversals before threshold estimate is trusted.
export const MIN_REVERSALS_FOR_THRESHOLD = 4;

// Storage
export const STORAGE_KEY = 'double-decision.state.v1';
export const HISTORY_CAP = 200;
