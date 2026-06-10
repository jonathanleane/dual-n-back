import { useEffect, useState } from 'react';
import BigButton from '../components/BigButton';
import type { SessionResult } from '../engine/types';

interface Props {
  session: SessionResult;
  onDone: () => void;
}

const COUNT_DURATION_MS = 1100;

export default function SessionCompleteScreen({ session, onDone }: Props) {
  const peakN = Math.max(session.startingLevel, ...session.blocks.map((b) => b.n));
  const completedBlocks = session.blocks.length;

  const avgPosAcc =
    completedBlocks === 0
      ? 0
      : session.blocks.reduce((a, b) => a + b.positionAccuracy, 0) / completedBlocks;
  const avgLetAcc =
    completedBlocks === 0
      ? 0
      : session.blocks.reduce((a, b) => a + b.letterAccuracy, 0) / completedBlocks;
  const avgAccuracy = (avgPosAcc + avgLetAcc) / 2;

  const durationSec = Math.max(0, Math.round((session.finishedAt - session.startedAt) / 1000));
  const durationStr = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;
  // Per-block average uses actual in-block time, not session wall-clock —
  // wall-clock includes time spent reading the result screens between blocks.
  const activeBlockSec =
    session.blocks.reduce((a, b) => a + Math.max(0, b.finishedAt - b.startedAt), 0) / 1000;

  const totalTrials = session.blocks.reduce((a, b) => a + b.trials.length, 0);
  const levelDelta = session.endingLevel - session.startingLevel;

  const animatedAcc = useCountUp(Math.round(avgAccuracy * 100), COUNT_DURATION_MS, 200);

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Session complete
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {session.completed ? 'Nice work.' : `${completedBlocks} block${completedBlocks === 1 ? '' : 's'} done.`}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '20px 16px', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Average accuracy
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {animatedAcc}%
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Tile
            big={String(peakN)}
            label="Peak N"
            footer={
              levelDelta === 0
                ? `Same level (${session.endingLevel})`
                : levelDelta > 0
                ? `+${levelDelta} since start`
                : `${levelDelta} since start`
            }
          />
          <Tile big={`${completedBlocks}`} label="Blocks" footer={`${totalTrials} trials`} />
          <Tile big={durationStr} label="Duration" footer={`avg ${(activeBlockSec / Math.max(1, completedBlocks)).toFixed(0)}s per block`} />
          <Tile
            big={`${Math.round(avgPosAcc * 100)}/${Math.round(avgLetAcc * 100)}`}
            label="Position / Sound"
            footer="average per modality"
          />
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        <BigButton primary onClick={onDone}>Done</BigButton>
      </div>
    </>
  );
}

function Tile({ big, label, footer }: { big: string; label: string; footer?: string }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 12 }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{big}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
        {label}
      </div>
      {footer && (
        <div style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', marginTop: 6 }}>{footer}</div>
      )}
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
