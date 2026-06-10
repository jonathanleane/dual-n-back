import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ITI_MS, MASK_MS, RESPONSE_PAUSE_MS } from '../engine/constants';
import { createRng } from '../engine/rng';
import { applyResponse, createStaircase, estimateThreshold } from '../engine/staircase';
import { getStage, totalSlots } from '../engine/stages';
import { generateStimulus } from '../engine/trialGenerator';
import type {
  CentralTarget,
  SessionAttempt,
  StaircaseState,
  StimulusSpec,
  TrialResult,
} from '../engine/types';

export type Phase =
  | { name: 'iti'; trialIndex: number }
  | { name: 'stimulus'; trialIndex: number; spec: StimulusSpec }
  | { name: 'mask'; trialIndex: number; spec: StimulusSpec }
  | { name: 'responsePause'; trialIndex: number; spec: StimulusSpec }
  | { name: 'response'; trialIndex: number; spec: StimulusSpec; responseShownAt: number }
  | {
      name: 'locate';
      trialIndex: number;
      spec: StimulusSpec;
      centralChoice: CentralTarget;
      centralCorrect: boolean;
      reactionTimeMs: number;
    }
  | {
      name: 'feedback';
      trialIndex: number;
      spec: StimulusSpec;
      centralChoice: CentralTarget;
      centralCorrect: boolean;
      /** Slot the player picked, or null when the stage has a single slot (locate skipped). */
      chosenSlot: number | null;
      peripheralCorrect: boolean;
      correct: boolean;
    }
  | { name: 'complete' };

interface Options {
  stageId: number;
  trialsPerLevel: number;
  useMask: boolean;
  onComplete: (attempt: SessionAttempt) => void;
  feedbackMs?: number;
  /** Optional seed for reproducible stimuli (tests). */
  rngSeed?: number;
}

interface PublicState {
  phase: Phase;
  staircase: StaircaseState;
  trialsCompleted: number;
  currentDurationMs: number;
}

/**
 * Drives the trial loop for a single level attempt:
 *   ITI → stimulus → (mask?) → response pause → central response →
 *   peripheral locate (skipped on single-slot stages) → feedback → next.
 *
 * A trial is correct only when BOTH the central identification and the
 * peripheral localization are right — that joint correctness is what the
 * staircase adapts on (classic UFOV scoring). Owns the staircase and the
 * recorded trial list. Calls `onComplete` once the configured number of
 * trials have been answered.
 */
export function useTrialRunner({
  stageId,
  trialsPerLevel,
  useMask,
  onComplete,
  feedbackMs = 350,
  rngSeed,
}: Options): PublicState & {
  respond: (choice: CentralTarget) => void;
  locate: (slot: number) => void;
} {
  const stage = useMemo(() => getStage(stageId), [stageId]);
  const rng = useMemo(
    () => createRng(rngSeed ?? Math.floor(Math.random() * 2 ** 31)),
    [rngSeed],
  );

  const [staircase, setStaircase] = useState<StaircaseState>(() =>
    createStaircase(stage.startingDurationMs),
  );
  const staircaseRef = useRef(staircase);
  staircaseRef.current = staircase;

  const stageRef = useRef(stage);
  stageRef.current = stage;

  const trialsRef = useRef<TrialResult[]>([]);
  const [trialsCompleted, setTrialsCompleted] = useState(0);
  const startedAtRef = useRef<number>(Date.now());

  const [phase, setPhase] = useState<Phase>({ name: 'iti', trialIndex: 0 });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // Phase-driven scheduling. Effect runs every phase change and schedules the
  // next transition. Pure state-machine transitions happen here; user input
  // (respond/locate) lives in the callbacks below.
  useEffect(() => {
    clearTimer();
    const p = phase;

    if (p.name === 'iti') {
      timer.current = setTimeout(() => {
        const spec = generateStimulus(stage, rng);
        setPhase({ name: 'stimulus', trialIndex: p.trialIndex, spec });
      }, ITI_MS);
    } else if (p.name === 'stimulus') {
      // Use the *current* staircase duration for this trial.
      const duration = staircaseRef.current.durationMs;
      timer.current = setTimeout(() => {
        if (useMask) {
          setPhase({ name: 'mask', trialIndex: p.trialIndex, spec: p.spec });
        } else {
          setPhase({ name: 'responsePause', trialIndex: p.trialIndex, spec: p.spec });
        }
      }, duration);
    } else if (p.name === 'mask') {
      timer.current = setTimeout(() => {
        setPhase({ name: 'responsePause', trialIndex: p.trialIndex, spec: p.spec });
      }, MASK_MS);
    } else if (p.name === 'responsePause') {
      timer.current = setTimeout(() => {
        setPhase({
          name: 'response',
          trialIndex: p.trialIndex,
          spec: p.spec,
          responseShownAt: performance.now(),
        });
      }, RESPONSE_PAUSE_MS);
    } else if (p.name === 'feedback') {
      timer.current = setTimeout(() => {
        const completedSoFar = trialsRef.current.length;
        if (completedSoFar >= trialsPerLevel) {
          setPhase({ name: 'complete' });
        } else {
          setPhase({ name: 'iti', trialIndex: completedSoFar });
        }
      }, feedbackMs);
    } else if (p.name === 'complete') {
      // Build the final attempt and notify caller. Defer to next tick to keep
      // React happy about state updates during render.
      timer.current = setTimeout(() => {
        const trials = trialsRef.current;
        const reversals = staircaseRef.current.reversals;
        const threshold = estimateThreshold(reversals);
        onComplete({
          id: createId(),
          stageId,
          startedAt: startedAtRef.current,
          finishedAt: Date.now(),
          trials,
          thresholdMs: threshold,
          reversals,
        });
      }, 0);
    }

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Record a finished trial (both parts answered), advance the staircase and
  // enter feedback. Stable: reads only refs and stable setters.
  const finishTrial = useCallback(
    (
      trialIndex: number,
      spec: StimulusSpec,
      centralChoice: CentralTarget,
      centralCorrect: boolean,
      chosenSlot: number | null,
      peripheralCorrect: boolean,
      reactionTimeMs: number,
    ) => {
      const correct = centralCorrect && peripheralCorrect;
      const trialResult: TrialResult = {
        durationMs: staircaseRef.current.durationMs,
        stimulus: spec,
        centralResponse: centralChoice,
        centralCorrect,
        peripheralResponse: chosenSlot,
        peripheralCorrect,
        correct,
        reactionTimeMs,
      };
      trialsRef.current = [...trialsRef.current, trialResult];
      setTrialsCompleted(trialsRef.current.length);
      setStaircase((s) => applyResponse(s, correct));
      setPhase({
        name: 'feedback',
        trialIndex,
        spec,
        centralChoice,
        centralCorrect,
        chosenSlot,
        peripheralCorrect,
        correct,
      });
    },
    [],
  );

  const respond = useCallback(
    (choice: CentralTarget) => {
      const p = phaseRef.current;
      if (p.name !== 'response') return;
      const centralCorrect = choice === p.spec.central;
      const reactionTimeMs = performance.now() - p.responseShownAt;
      if (totalSlots(stageRef.current) > 1) {
        setPhase({
          name: 'locate',
          trialIndex: p.trialIndex,
          spec: p.spec,
          centralChoice: choice,
          centralCorrect,
          reactionTimeMs,
        });
      } else {
        // Single-slot stages have nothing to locate; the trial is decided by
        // the central response alone.
        finishTrial(p.trialIndex, p.spec, choice, centralCorrect, null, true, reactionTimeMs);
      }
    },
    [finishTrial],
  );

  const locate = useCallback(
    (slot: number) => {
      const p = phaseRef.current;
      if (p.name !== 'locate') return;
      const peripheralCorrect = slot === p.spec.peripheralPosition;
      finishTrial(
        p.trialIndex,
        p.spec,
        p.centralChoice,
        p.centralCorrect,
        slot,
        peripheralCorrect,
        p.reactionTimeMs,
      );
    },
    [finishTrial],
  );

  // Cleanup any pending timer on unmount.
  useEffect(() => () => clearTimer(), []);

  return {
    phase,
    staircase,
    trialsCompleted,
    currentDurationMs: staircase.durationMs,
    respond,
    locate,
  };
}

function createId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
