import { STAGES, type StageConfig } from '../engine/stages';
import type { Player } from '../engine/types';

interface Props {
  player: Player;
  onPickStage: (stageId: number) => void;
  onAbout: () => void;
  onSettings: () => void;
}

export default function MenuScreen({ player, onPickStage, onAbout, onSettings }: Props) {
  return (
    <>
      <header style={{ marginTop: 8, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ color: 'var(--fg-dim)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Rebuild Your Focus
          </div>
          <button
            onClick={onSettings}
            style={{ color: 'var(--fg-dim)', fontSize: '0.85rem', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            Settings
          </button>
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: 4, letterSpacing: '-0.02em' }}>
          Double Decision
        </h1>
        <p style={{ color: 'var(--fg-dim)', marginTop: 8, lineHeight: 1.5, fontSize: '0.95rem' }}>
          Identify the central shape while a peripheral target appears somewhere
          else on screen. Each stage shortens the time you have to do both.
        </p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STAGES.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            best={player.bestThresholdByStage[stage.id]?.thresholdMs ?? null}
            onPick={() => onPickStage(stage.id)}
          />
        ))}
      </section>

      <footer style={{ marginTop: 32, color: 'var(--fg-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
        <button onClick={onAbout} style={{ textDecoration: 'underline' }}>
          What does the science actually say?
        </button>
      </footer>
    </>
  );
}

function StageRow({
  stage,
  best,
  onPick,
}: {
  stage: StageConfig;
  best: number | null;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        textAlign: 'left',
        transition: 'transform 80ms ease, background 120ms ease',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--surface-deep)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--fg)',
        }}
      >
        {stage.id}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{stage.label}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--fg-dim)', marginTop: 2 }}>
          {describeStage(stage)}
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 70 }}>
        {best !== null ? (
          <>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-warm)' }}>
              {Math.round(best)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', letterSpacing: '0.04em' }}>MS BEST</div>
          </>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'var(--fg-dim)' }}>Not played</div>
        )}
      </div>
    </button>
  );
}

function describeStage(stage: StageConfig): string {
  const rings = stage.eccentricities.length === 1 ? 'one ring' : `${stage.eccentricities.length} rings`;
  const slots = stage.slotsPerRing === 1 ? 'fixed top slot' : `${stage.slotsPerRing} positions × ${rings}`;
  const distract = stage.distractors === 0 ? 'no clutter' : `${stage.distractors} distractors`;
  return `${slots}, ${distract}`;
}
