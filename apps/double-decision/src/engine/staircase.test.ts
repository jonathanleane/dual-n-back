import { describe, expect, it } from 'vitest';
import { applyResponse, createStaircase, estimateThreshold } from './staircase';
import {
  DOWN_AFTER_N_CORRECT,
  FLOOR_DURATION_MS,
  INITIAL_STEP_FACTOR,
  MIN_REVERSALS_FOR_THRESHOLD,
  REVERSAL_WINDOW,
  UP_AFTER_N_INCORRECT,
} from './constants';

function chain(start: ReturnType<typeof createStaircase>, responses: boolean[]) {
  let s = start;
  for (const r of responses) s = applyResponse(s, r);
  return s;
}

describe('staircase', () => {
  it('starts at the given duration with no reversals', () => {
    const s = createStaircase(500);
    expect(s.durationMs).toBe(500);
    expect(s.reversals).toEqual([]);
    expect(s.lastStepDirection).toBe('none');
  });

  it('does not step down until N consecutive correct', () => {
    const s = createStaircase(500);
    const before = chain(s, Array(DOWN_AFTER_N_CORRECT - 1).fill(true));
    expect(before.durationMs).toBe(500);
  });

  it('steps down after N consecutive correct', () => {
    const s = createStaircase(500);
    const after = chain(s, Array(DOWN_AFTER_N_CORRECT).fill(true));
    expect(after.durationMs).toBeLessThan(500);
    expect(after.lastStepDirection).toBe('down');
    expect(after.consecutiveCorrect).toBe(0); // counter resets after step
  });

  it('steps up after N consecutive incorrect', () => {
    const s = createStaircase(500);
    const after = chain(s, Array(UP_AFTER_N_INCORRECT).fill(false));
    expect(after.durationMs).toBeGreaterThan(500);
    expect(after.lastStepDirection).toBe('up');
  });

  it('records a reversal only when direction changes', () => {
    const s = createStaircase(500);
    // First step down: no reversal (previous direction was 'none').
    const downOnce = chain(s, Array(DOWN_AFTER_N_CORRECT).fill(true));
    expect(downOnce.reversals).toEqual([]);

    // Then one incorrect → step up. THIS is the first reversal.
    const upAfterDown = applyResponse(downOnce, false);
    expect(upAfterDown.reversals).toHaveLength(1);
    // The recorded reversal value is the duration BEFORE the reversing step.
    expect(upAfterDown.reversals[0]).toBe(downOnce.durationMs);
  });

  it('shrinks step factor at each reversal', () => {
    const s = createStaircase(500);
    // Force a few reversals.
    const after = chain(s, [
      true, true, true,        // down
      false,                   // reversal up #1 → shrink
      true, true, true,        // reversal down #2 → shrink
      false,                   // reversal up #3 → shrink
    ]);
    expect(after.reversals.length).toBeGreaterThan(0);
    expect(after.stepFactor).toBeLessThan(INITIAL_STEP_FACTOR);
  });

  it('clamps at the floor', () => {
    let s = createStaircase(500);
    // Slam through correct answers until floor reached.
    for (let i = 0; i < 200; i++) s = applyResponse(s, true);
    expect(s.durationMs).toBe(FLOOR_DURATION_MS);
  });

  it('estimateThreshold returns null below minimum reversals', () => {
    const fewer = Array(MIN_REVERSALS_FOR_THRESHOLD - 1).fill(100);
    expect(estimateThreshold(fewer)).toBeNull();
  });

  it('estimateThreshold returns geometric mean of last window of reversals', () => {
    // Eight reversals — only the last REVERSAL_WINDOW should count.
    const reversals = [10, 20, 50, 100, 50, 100, 50, 100];
    const expected = Math.exp(
      reversals.slice(-REVERSAL_WINDOW).reduce((a, v) => a + Math.log(v), 0) / REVERSAL_WINDOW,
    );
    const got = estimateThreshold(reversals);
    expect(got).not.toBeNull();
    expect(got!).toBeCloseTo(expected, 5);
  });
});
