import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTrialRunner } from './useTrialRunner';
import { ITI_MS, MASK_MS, RESPONSE_PAUSE_MS } from '../engine/constants';
import type { CentralTarget, SessionAttempt, StimulusSpec } from '../engine/types';

const FEEDBACK_MS = 350;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

type Runner = ReturnType<typeof useTrialRunner>;

/** Walk the current trial from ITI through to the response phase. */
function toResponse(result: { current: Runner }): StimulusSpec {
  advance(ITI_MS);
  expect(result.current.phase.name).toBe('stimulus');
  const spec = (result.current.phase as { spec: StimulusSpec }).spec;
  advance(result.current.staircase.durationMs);
  expect(result.current.phase.name).toBe('mask');
  advance(MASK_MS);
  expect(result.current.phase.name).toBe('responsePause');
  advance(RESPONSE_PAUSE_MS);
  expect(result.current.phase.name).toBe('response');
  return spec;
}

const wrongCentral = (c: CentralTarget): CentralTarget => (c === 'A' ? 'B' : 'A');

describe('useTrialRunner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('multi-slot stage: central response leads to locate, then feedback', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTrialRunner({ stageId: 3, trialsPerLevel: 2, useMask: true, onComplete, rngSeed: 7 }),
    );
    const spec = toResponse(result);

    act(() => result.current.respond(spec.central));
    expect(result.current.phase.name).toBe('locate');

    act(() => result.current.locate(spec.peripheralPosition));
    expect(result.current.phase.name).toBe('feedback');
    const fb = result.current.phase as Extract<Runner['phase'], { name: 'feedback' }>;
    expect(fb.centralCorrect).toBe(true);
    expect(fb.peripheralCorrect).toBe(true);
    expect(fb.correct).toBe(true);
    expect(result.current.trialsCompleted).toBe(1);
  });

  it('wrong location makes the trial incorrect and steps the staircase up', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTrialRunner({ stageId: 3, trialsPerLevel: 2, useMask: true, onComplete, rngSeed: 7 }),
    );
    const startingDuration = result.current.staircase.durationMs;
    const spec = toResponse(result);

    act(() => result.current.respond(spec.central));
    const wrongSlot = spec.peripheralPosition === 0 ? 1 : 0;
    act(() => result.current.locate(wrongSlot));

    const fb = result.current.phase as Extract<Runner['phase'], { name: 'feedback' }>;
    expect(fb.centralCorrect).toBe(true);
    expect(fb.peripheralCorrect).toBe(false);
    expect(fb.correct).toBe(false);
    // 1-up: a single miss raises the duration.
    expect(result.current.staircase.durationMs).toBeGreaterThan(startingDuration);
  });

  it('single-slot stage skips the locate phase', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTrialRunner({ stageId: 1, trialsPerLevel: 2, useMask: true, onComplete, rngSeed: 3 }),
    );
    const spec = toResponse(result);

    act(() => result.current.respond(wrongCentral(spec.central)));
    expect(result.current.phase.name).toBe('feedback');
    const fb = result.current.phase as Extract<Runner['phase'], { name: 'feedback' }>;
    expect(fb.centralCorrect).toBe(false);
    expect(fb.chosenSlot).toBeNull();
    expect(fb.peripheralCorrect).toBe(true); // auto-granted, nothing to locate
    expect(fb.correct).toBe(false);
  });

  it('skips the mask phase when useMask is false', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTrialRunner({ stageId: 2, trialsPerLevel: 1, useMask: false, onComplete, rngSeed: 5 }),
    );
    advance(ITI_MS);
    expect(result.current.phase.name).toBe('stimulus');
    advance(result.current.staircase.durationMs);
    expect(result.current.phase.name).toBe('responsePause');
  });

  it('ignores locate taps outside the locate phase and responses outside response', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTrialRunner({ stageId: 3, trialsPerLevel: 2, useMask: true, onComplete, rngSeed: 7 }),
    );
    act(() => result.current.respond('A')); // during ITI — no-op
    act(() => result.current.locate(0)); // during ITI — no-op
    expect(result.current.phase.name).toBe('iti');
    expect(result.current.trialsCompleted).toBe(0);
  });

  it('completes the attempt and reports per-part correctness', () => {
    const onComplete = vi.fn<(a: SessionAttempt) => void>();
    const { result } = renderHook(() =>
      useTrialRunner({ stageId: 3, trialsPerLevel: 2, useMask: true, onComplete, rngSeed: 11 }),
    );

    // Trial 1: fully correct.
    let spec = toResponse(result);
    act(() => result.current.respond(spec.central));
    act(() => result.current.locate(spec.peripheralPosition));
    advance(FEEDBACK_MS);

    // Trial 2: wrong central, correct location.
    spec = toResponse(result);
    act(() => result.current.respond(wrongCentral(spec.central)));
    act(() => result.current.locate(spec.peripheralPosition));
    advance(FEEDBACK_MS);

    expect(result.current.phase.name).toBe('complete');
    advance(1); // fire the deferred onComplete
    expect(onComplete).toHaveBeenCalledTimes(1);

    const attempt = onComplete.mock.calls[0][0];
    expect(attempt.trials).toHaveLength(2);
    expect(attempt.trials[0].correct).toBe(true);
    expect(attempt.trials[1].centralCorrect).toBe(false);
    expect(attempt.trials[1].peripheralCorrect).toBe(true);
    expect(attempt.trials[1].correct).toBe(false);
    expect(attempt.trials.every((t) => t.reactionTimeMs >= 0)).toBe(true);
  });
});
