import { useMemo } from 'react';
import { getStage } from '../engine/stages';
import type { SessionAttempt, TrialResult } from '../engine/types';

interface Props {
  attempt: SessionAttempt;
  previousBestMs: number | null;
  onPlayAgain: () => void;
  onMenu: () => void;
}

const rate = (trials: TrialResult[], pick: (t: TrialResult) => boolean): number =>
  trials.length === 0 ? 0 : trials.filter(pick).length / trials.length;

export default function ResultsScreen({ attempt, previousBestMs, onPlayAgain, onMenu }: Props) {
  const stage = getStage(attempt.stageId);
  const { accuracy, centralAccuracy, peripheralAccuracy, hasLocate } = useMemo(() => {
    const trials = attempt.trials;
    return {
      accuracy: rate(trials, (t) => t.correct),
      centralAccuracy: rate(trials, (t) => t.centralCorrect),
      peripheralAccuracy: rate(trials, (t) => t.peripheralCorrect),
      // Single-slot stages skip the locate step; no point showing 100% for it.
      hasLocate: trials.some((t) => t.peripheralResponse !== null),
    };
  }, [attempt.trials]);

  const isNewBest =
    attempt.thresholdMs !== null &&
    (previousBestMs === null || attempt.thresholdMs < previousBestMs);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ color: 'var(--fg-dim)', fontSize: '0.85rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Stage {stage.id} · {stage.label}
        </div>
        <h2 style={{ fontSize: '2rem', marginTop: 4, fontWeight: 700 }}>Threshold</h2>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 24,
          textAlign: 'center',
        }}
      >
        {attempt.thresholdMs !== null ? (
          <>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--accent-warm)' }}>
              {Math.round(attempt.thresholdMs)}
              <span style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--fg-dim)', marginLeft: 6 }}>ms</span>
            </div>
            <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--fg-dim)' }}>
              Geometric mean of your last reversals. Lower is better.
            </div>
            {previousBestMs !== null && (
              <div
                style={{
                  marginTop: 14,
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: isNewBest ? 'var(--success)' : 'var(--surface-deep)',
                  color: isNewBest ? 'var(--accent-fg)' : 'var(--fg-dim)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {isNewBest
                  ? `New best — beat ${Math.round(previousBestMs)} ms`
                  : `Previous best ${Math.round(previousBestMs)} ms`}
              </div>
            )}
            {previousBestMs === null && isNewBest && (
              <div
                style={{
                  marginTop: 14,
                  display: 'inline-block',
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'var(--success)',
                  color: 'var(--accent-fg)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                First completion
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>Not enough reversals</div>
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--fg-dim)' }}>
              The staircase needs to flip direction a few times to estimate your threshold.
              Try the level again.
            </div>
          </>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <StatBox label={hasLocate ? 'Both correct' : 'Accuracy'} value={`${Math.round(accuracy * 100)}%`} />
        <StatBox label="Trials" value={String(attempt.trials.length)} />
        {hasLocate && (
          <>
            <StatBox label="Shape" value={`${Math.round(centralAccuracy * 100)}%`} />
            <StatBox label="Star location" value={`${Math.round(peripheralAccuracy * 100)}%`} />
          </>
        )}
      </div>

      <ReversalChart reversals={attempt.reversals} />

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={onMenu}
          style={{
            flex: 1,
            padding: '16px 0',
            border: '1px solid var(--border)',
            borderRadius: 999,
            background: 'var(--surface)',
            color: 'var(--fg)',
            fontWeight: 600,
          }}
        >
          Menu
        </button>
        <button
          onClick={onPlayAgain}
          style={{
            flex: 1,
            padding: '16px 0',
            border: 'none',
            borderRadius: 999,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            fontWeight: 700,
          }}
        >
          Play again
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 16,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--fg)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--fg-dim)', letterSpacing: '0.04em', marginTop: 2 }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

function ReversalChart({ reversals }: { reversals: number[] }) {
  if (reversals.length < 2) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 16,
          color: 'var(--fg-dim)',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}
      >
        No reversal pattern to show yet.
      </div>
    );
  }
  const max = Math.max(...reversals);
  const min = Math.min(...reversals);
  // Log scale, since the staircase is multiplicative. Y is computed directly
  // in viewBox units (0..60); a flat series sits mid-chart rather than on an edge.
  const logMax = Math.log(max);
  const logMin = Math.log(min);
  const range = logMax - logMin;
  const points = reversals.map((r, i) => {
    const x = (i / (reversals.length - 1)) * 100;
    const norm = range === 0 ? 0.5 : (Math.log(r) - logMin) / range;
    const y = (1 - norm) * 56 + 2; // 2px padding top/bottom inside the 60-high viewBox
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ fontSize: '0.78rem', color: 'var(--fg-dim)', letterSpacing: '0.04em', marginBottom: 8 }}>
        REVERSAL PATTERN
      </div>
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: '100%', height: 100 }} aria-hidden>
        <polyline
          fill="none"
          stroke="var(--accent-warm)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
        {reversals.map((_, i) => {
          const [x, y] = points[i].split(',').map(Number);
          return <circle key={i} cx={x} cy={y} r="1.2" fill="var(--accent-warm)" />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--fg-dim)', marginTop: 4 }}>
        <span>{Math.round(reversals[0])} ms</span>
        <span>→</span>
        <span>{Math.round(reversals[reversals.length - 1])} ms</span>
      </div>
    </div>
  );
}
