import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  BASE_RESPONSE_WINDOW_MS,
  STIMULUS_MS,
} from '../engine/constants';
import type {
  BlockResult,
  Settings,
  Trial,
  UserResponse,
} from '../engine/types';
import { generateBlock, type BlockGenOptions } from '../engine/blockGenerator';
import { computeOutcome, scoreBlock } from '../engine/scoring';
import type { AudioPlayer } from '../audio/AudioPlayer';

type Mode = 'idle' | 'stimulus' | 'response' | 'paused' | 'blockDone';

interface EngineState {
  mode: Mode;
  n: number;
  trials: Trial[];
  responses: UserResponse[];
  trialIndex: number;
  lastResult: BlockResult | null;
  /** Bumped by resume() to force the trial-scheduling effect to re-run for the same trialIndex. */
  restartToken: number;
}

type Action =
  | { type: 'start'; n: number; trials: Trial[] }
  | { type: 'advanceTrial' }
  | { type: 'enterResponse' }
  | { type: 'tapPosition' }
  | { type: 'tapSound' }
  | { type: 'finishBlock'; result: BlockResult }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' };

const initial: EngineState = {
  mode: 'idle',
  n: 0,
  trials: [],
  responses: [],
  trialIndex: -1,
  lastResult: null,
  restartToken: 0,
};

function reducer(s: EngineState, a: Action): EngineState {
  switch (a.type) {
    case 'start':
      return {
        mode: 'stimulus',
        n: a.n,
        trials: a.trials,
        responses: a.trials.map(() => ({ position: false, letter: false })),
        trialIndex: 0,
        lastResult: null,
        restartToken: s.restartToken + 1,
      };
    case 'enterResponse':
      return { ...s, mode: 'response' };
    case 'advanceTrial': {
      const next = s.trialIndex + 1;
      if (next >= s.trials.length) return s;
      return { ...s, mode: 'stimulus', trialIndex: next };
    }
    case 'tapPosition': {
      if (s.mode !== 'response' && s.mode !== 'stimulus') return s;
      const responses = s.responses.slice();
      responses[s.trialIndex] = { ...responses[s.trialIndex], position: true };
      return { ...s, responses };
    }
    case 'tapSound': {
      if (s.mode !== 'response' && s.mode !== 'stimulus') return s;
      const responses = s.responses.slice();
      responses[s.trialIndex] = { ...responses[s.trialIndex], letter: true };
      return { ...s, responses };
    }
    case 'finishBlock':
      return { ...s, mode: 'blockDone', lastResult: a.result };
    case 'pause': {
      if (s.mode !== 'stimulus' && s.mode !== 'response') return s;
      // Discard the current trial's response — we're going to re-show this trial on resume.
      // Otherwise a partial response captured before pause would carry into the replayed trial.
      const responses = s.responses.slice();
      responses[s.trialIndex] = { position: false, letter: false };
      return { ...s, mode: 'paused', responses };
    }
    case 'resume':
      if (s.mode !== 'paused') return s;
      return { ...s, mode: 'stimulus', restartToken: s.restartToken + 1 };
    case 'reset':
      return initial;
  }
}

export interface UseGameEngine {
  mode: Mode;
  trialIndex: number;
  totalTrials: number;
  currentTrial: Trial | null;
  currentResponse: UserResponse | null;
  showStimulus: boolean;
  lastResult: BlockResult | null;
  startBlock: (n: number, seed?: number, options?: BlockGenOptions) => void;
  trials: Trial[];
  tapPosition: () => void;
  tapSound: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export interface GameEngineOptions {
  audio: AudioPlayer | null;
  settings: Pick<Settings, 'speedMultiplier' | 'nBackLevel'>;
}

export function useGameEngine(opts: GameEngineOptions): UseGameEngine {
  const [state, dispatch] = useReducer(reducer, initial);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const blockStartedAtRef = useRef<number>(0);
  const audio = opts.audio;
  const speed = Math.max(0.5, Math.min(5, opts.settings.speedMultiplier));
  const responseMs = BASE_RESPONSE_WINDOW_MS / speed;
  // Stable reference to current responses so the finish effect can read the latest.
  const responsesRef = useRef(state.responses);
  responsesRef.current = state.responses;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // Schedule audio + visual + transitions whenever a new trial begins.
  useEffect(() => {
    if (state.mode !== 'stimulus' || state.trialIndex < 0) return;
    const trial = state.trials[state.trialIndex];
    if (!trial) return;

    audio?.playLetter(trial.letter);

    const enterResponse = setTimeout(() => dispatch({ type: 'enterResponse' }), STIMULUS_MS);

    const isLast = state.trialIndex === state.trials.length - 1;
    const advance = setTimeout(() => {
      if (isLast) {
        const responses = responsesRef.current;
        const { positionAccuracy, letterAccuracy } = scoreBlock(state.n, state.trials, responses);
        const outcome = computeOutcome(positionAccuracy, letterAccuracy, opts.settings.nBackLevel);
        const result: BlockResult = {
          n: state.n,
          startedAt: blockStartedAtRef.current,
          finishedAt: Date.now(),
          trials: state.trials,
          responses,
          positionAccuracy,
          letterAccuracy,
          outcome,
        };
        dispatch({ type: 'finishBlock', result });
      } else {
        dispatch({ type: 'advanceTrial' });
      }
    }, STIMULUS_MS + responseMs);

    timers.current.push(enterResponse, advance);
    return clearTimers;
    // restartToken is bumped by start() and resume() to force this to re-fire for the same trialIndex
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.trialIndex, state.restartToken]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const startBlock = useCallback(
    (n: number, seed: number = Date.now(), options?: BlockGenOptions) => {
      clearTimers();
      blockStartedAtRef.current = Date.now();
      const trials = generateBlock(n, seed, options);
      dispatch({ type: 'start', n, trials });
    },
    [clearTimers],
  );

  const tapPosition = useCallback(() => dispatch({ type: 'tapPosition' }), []);
  const tapSound = useCallback(() => dispatch({ type: 'tapSound' }), []);
  const pause = useCallback(() => {
    clearTimers();
    dispatch({ type: 'pause' });
  }, [clearTimers]);
  const resume = useCallback(() => {
    dispatch({ type: 'resume' });
  }, []);
  const reset = useCallback(() => {
    clearTimers();
    dispatch({ type: 'reset' });
  }, [clearTimers]);

  return useMemo(
    () => ({
      mode: state.mode,
      trialIndex: state.trialIndex,
      totalTrials: state.trials.length,
      currentTrial:
        state.trialIndex >= 0 ? state.trials[state.trialIndex] ?? null : null,
      currentResponse:
        state.trialIndex >= 0 ? state.responses[state.trialIndex] ?? null : null,
      showStimulus: state.mode === 'stimulus',
      lastResult: state.lastResult,
      trials: state.trials,
      startBlock,
      tapPosition,
      tapSound,
      pause,
      resume,
      reset,
    }),
    [state, startBlock, tapPosition, tapSound, pause, resume, reset],
  );
}
