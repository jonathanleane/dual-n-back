import {
  CEILING_DURATION_MS,
  DOWN_AFTER_N_CORRECT,
  FLOOR_DURATION_MS,
  INITIAL_STEP_FACTOR,
  MIN_REVERSALS_FOR_THRESHOLD,
  MIN_STEP_FACTOR,
  REVERSAL_WINDOW,
  STARTING_DURATION_MS,
  UP_AFTER_N_INCORRECT,
} from './constants';
import type { StaircaseState } from './types';

export function createStaircase(startDurationMs = STARTING_DURATION_MS): StaircaseState {
  return {
    durationMs: clamp(startDurationMs),
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    reversals: [],
    lastStepDirection: 'none',
    stepFactor: INITIAL_STEP_FACTOR,
  };
}

/**
 * Apply a single trial response (correct/incorrect) to the staircase and return
 * the next state. Pure function — no mutation.
 *
 * 3-down-1-up: reduce duration after 3 correct in a row, increase after 1 incorrect.
 * Step factor halves on each reversal until reaching MIN_STEP_FACTOR.
 */
export function applyResponse(state: StaircaseState, correct: boolean): StaircaseState {
  const consecutiveCorrect = correct ? state.consecutiveCorrect + 1 : 0;
  const consecutiveIncorrect = correct ? 0 : state.consecutiveIncorrect + 1;

  let next: StaircaseState = {
    ...state,
    consecutiveCorrect,
    consecutiveIncorrect,
  };

  if (consecutiveCorrect >= DOWN_AFTER_N_CORRECT) {
    next = stepDown(next);
  } else if (consecutiveIncorrect >= UP_AFTER_N_INCORRECT) {
    next = stepUp(next);
  }

  return next;
}

function stepDown(state: StaircaseState): StaircaseState {
  const reversed = state.lastStepDirection === 'up';
  const newDuration = clamp(state.durationMs / state.stepFactor);
  return {
    ...state,
    durationMs: newDuration,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    lastStepDirection: 'down',
    reversals: reversed ? [...state.reversals, state.durationMs] : state.reversals,
    stepFactor: reversed ? shrinkStep(state.stepFactor) : state.stepFactor,
  };
}

function stepUp(state: StaircaseState): StaircaseState {
  const reversed = state.lastStepDirection === 'down';
  const newDuration = clamp(state.durationMs * state.stepFactor);
  return {
    ...state,
    durationMs: newDuration,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    lastStepDirection: 'up',
    reversals: reversed ? [...state.reversals, state.durationMs] : state.reversals,
    stepFactor: reversed ? shrinkStep(state.stepFactor) : state.stepFactor,
  };
}

function shrinkStep(stepFactor: number): number {
  // Halve the step (in log space) each reversal until floor.
  const shrunk = Math.exp(Math.log(stepFactor) / 2);
  return Math.max(shrunk, MIN_STEP_FACTOR);
}

function clamp(ms: number): number {
  return Math.min(CEILING_DURATION_MS, Math.max(FLOOR_DURATION_MS, ms));
}

/**
 * Estimate the threshold from the staircase: geometric mean of the last K
 * reversal durations. Returns null if we don't have enough reversals to trust
 * the estimate.
 */
export function estimateThreshold(reversals: readonly number[]): number | null {
  if (reversals.length < MIN_REVERSALS_FOR_THRESHOLD) return null;
  const recent = reversals.slice(-REVERSAL_WINDOW);
  const logSum = recent.reduce((acc, ms) => acc + Math.log(ms), 0);
  return Math.exp(logSum / recent.length);
}
