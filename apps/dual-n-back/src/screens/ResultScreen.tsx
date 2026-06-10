import { useEffect, useMemo, useState } from 'react';
import BigButton from '../components/BigButton';
import ThresholdBar from '../components/ThresholdBar';
import type { BlockResult, Trial, UserResponse } from '../engine/types';

interface Props {
  result: BlockResult;
  blocksLeft: number;
  level: number;
  /** Whether the level actually moved (false when auto progression is off). */
  levelChanged: boolean;
  onContinue: () => void;
  onDone: () => void;
}

const COUNT_DURATION_MS = 900;
const SECOND_CARD_DELAY_MS = 300;

interface ModalityBreakdown {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  totalMatches: number;
}

function tally(
  trials: Trial[],
  responses: UserResponse[],
  n: number,
  modality: 'position' | 'letter',
): ModalityBreakdown {
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  let correctRejections = 0;
  for (let i = n; i < trials.length; i++) {
    const trial = trials[i];
    const resp = responses[i] ?? { position: false, letter: false };
    const isMatch = modality === 'position' ? trial.positionMatch : trial.letterMatch;
    const tapped = modality === 'position' ? resp.position : resp.letter;
    if (isMatch && tapped) hits++;
    else if (isMatch && !tapped) misses++;
    else if (!isMatch && tapped) falseAlarms++;
    else correctRejections++;
  }
  return { hits, misses, falseAlarms, correctRejections, totalMatches: hits + misses };
}

export default function ResultScreen({ result, blocksLeft, level, levelChanged, onContinue, onDone }: Props) {
  const headline =
    result.outcome === 'level-up' ? 'Amazing!' : result.outcome === 'level-down' ? 'Push harder.' : 'Nice.';
  const sessionDone = blocksLeft <= 0;

  const posBreakdown = useMemo(
    () => tally(result.trials, result.responses, result.n, 'position'),
    [result],
  );
  const letBreakdown = useMemo(
    () => tally(result.trials, result.responses, result.n, 'letter'),
    [result],
  );

  // Special-case the "didn't engage" pattern: zero hits AND zero false alarms in both modalities.
  const didNothing =
    posBreakdown.hits === 0 &&
    posBreakdown.falseAlarms === 0 &&
    letBreakdown.hits === 0 &&
    letBreakdown.falseAlarms === 0;

  return (
    <>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, textAlign: 'center', margin: '24px 0 4px' }}>{headline}</div>
      <div style={{ color: 'var(--fg-dim)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 24 }}>
        {sessionDone ? 'Session complete' : `${blocksLeft} block${blocksLeft === 1 ? '' : 's'} left`}
      </div>

      <ScoreCard label="Position" value={result.positionAccuracy} breakdown={posBreakdown} delay={0} />
      <ScoreCard label="Sound" value={result.letterAccuracy} breakdown={letBreakdown} delay={SECOND_CARD_DELAY_MS} />

      {didNothing && (
        <div
          role="note"
          style={{
            marginTop: 4,
            marginBottom: 8,
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: '0.75rem',
            color: 'var(--fg-dim)',
            lineHeight: 1.4,
          }}
        >
          <b style={{ color: 'var(--fg)' }}>No taps registered.</b> Most trials aren't matches, so doing
          nothing still scores ~70%. Tap Position or Sound when you spot a match against the trial{' '}
          {result.n} back.
        </div>
      )}

      {(() => {
        // Only claim a change when the level actually moved — with auto
        // progression off, the outcome can be level-up/down while the level
        // stays put.
        const label = levelChanged
          ? result.outcome === 'level-up'
            ? `Level raised to ${level}`
            : `Level dropped to ${level}`
          : result.outcome === 'hold'
          ? `Same level (${level})`
          : `Same level (${level}) — auto progression off`;
        const sharedStyle = {
          width: '100%',
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          border: 'none',
          borderRadius: 14,
          padding: 16,
          textAlign: 'center' as const,
          marginTop: 16,
          fontWeight: 700,
          fontSize: '1rem',
        };
        if (sessionDone) {
          return <div style={sharedStyle}>{label}</div>;
        }
        return (
          <button
            type="button"
            onClick={onContinue}
            aria-label={`${label}. Continue to next block.`}
            style={{ ...sharedStyle, cursor: 'pointer' }}
          >
            {label}
          </button>
        );
      })()}

      <div style={{ marginTop: 'auto', display: 'flex', gap: 12, paddingTop: 24 }}>
        {!sessionDone && <BigButton primary onClick={onContinue}>Continue</BigButton>}
        <BigButton onClick={onDone}>{sessionDone ? 'Done' : 'End session'}</BigButton>
      </div>
    </>
  );
}

function ScoreCard({
  label,
  value,
  breakdown,
  delay,
}: {
  label: string;
  value: number;
  breakdown: ModalityBreakdown;
  delay: number;
}) {
  const animatedPct = useCountUp(Math.round(value * 100), COUNT_DURATION_MS, delay);
  const faColor = breakdown.falseAlarms === 0 ? 'var(--fg-dim)' : 'var(--accent-warm)';
  const hitColor =
    breakdown.totalMatches > 0 && breakdown.hits === breakdown.totalMatches
      ? 'var(--success)'
      : breakdown.hits === 0 && breakdown.totalMatches > 0
      ? 'var(--danger)'
      : 'var(--fg)';

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {animatedPct}%
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', textAlign: 'right', lineHeight: 1.5 }}>
          <div>
            <span style={{ color: hitColor, fontWeight: 600 }}>{breakdown.hits}</span>
            <span> / {breakdown.totalMatches} hit</span>
          </div>
          <div>
            <span style={{ color: faColor, fontWeight: 600 }}>{breakdown.falseAlarms}</span>
            <span> false {breakdown.falseAlarms === 1 ? 'alarm' : 'alarms'}</span>
          </div>
        </div>
      </div>
      <ThresholdBar value={value} animate duration={COUNT_DURATION_MS} delay={delay} />
    </div>
  );
}

function useCountUp(target: number, durationMs: number, delayMs: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    let startTs = 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setN(target);
      return;
    }
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs - delayMs;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, delayMs]);
  return n;
}
