import { useEffect, useState } from 'react';
import Playfield from '../components/Playfield';
import CentralChoice from '../components/CentralChoice';
import { getStage, totalSlots } from '../engine/stages';
import type { SessionAttempt, Settings } from '../engine/types';
import { useTrialRunner } from '../state/useTrialRunner';

interface Props {
  stageId: number;
  settings: Settings;
  onComplete: (attempt: SessionAttempt) => void;
  onQuit: () => void;
}

/**
 * Wraps the trial runner with a "Get ready" preview screen and quit affordance.
 * Play begins on first click so the user is committed before the timer starts.
 */
export default function PlayScreen({ stageId, settings, onComplete, onQuit }: Props) {
  const stage = getStage(stageId);
  const [started, setStarted] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '12px 12px env(safe-area-inset-bottom)',
        gap: 12,
        // Stimuli flash fast; accidental drags shouldn't start text selection.
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {started ? (
        <RunnerView stageId={stageId} settings={settings} onComplete={onComplete} onQuit={onQuit} />
      ) : (
        <ReadyView stageId={stageId} stageLabel={stage.label} onStart={() => setStarted(true)} onQuit={onQuit} />
      )}
    </div>
  );
}

function ReadyView({
  stageId,
  stageLabel,
  onStart,
  onQuit,
}: {
  stageId: number;
  stageLabel: string;
  onStart: () => void;
  onQuit: () => void;
}) {
  const stage = getStage(stageId);
  const hasLocate = totalSlots(stage) > 1;
  return (
    <>
      <TopBar
        leftLabel="‹ Menu"
        onLeft={onQuit}
        center={`Stage ${stageId} · ${stageLabel}`}
        right={null}
      />
      <Playfield stage={stage} display={{ kind: 'preview' }} />
      <div
        style={{
          textAlign: 'center',
          color: 'var(--fg-dim)',
          maxWidth: 520,
          margin: '0 auto',
          padding: '0 16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <p style={{ lineHeight: 1.45, fontSize: '0.95rem' }}>
          Stare at the centre dot. A <strong style={{ color: 'var(--fg)' }}>triangle or square</strong> flashes
          there while a <strong style={{ color: 'var(--accent-warm)' }}>filled star</strong> appears
          {stage.distractors > 0 ? ' among hollow stars' : ''} on the rim. Tap the shape you saw
          {hasLocate ? ', then tap where the star was' : ''} — all without moving your eyes.
        </p>
        <button
          onClick={onStart}
          style={{
            alignSelf: 'center',
            padding: '16px 56px',
            fontSize: '1.05rem',
            fontWeight: 700,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            borderRadius: 999,
          }}
        >
          Start
        </button>
      </div>
    </>
  );
}

function RunnerView({
  stageId,
  settings,
  onComplete,
  onQuit,
}: {
  stageId: number;
  settings: Settings;
  onComplete: (attempt: SessionAttempt) => void;
  onQuit: () => void;
}) {
  const stage = getStage(stageId);
  const hasLocate = totalSlots(stage) > 1;
  const runner = useTrialRunner({
    stageId,
    trialsPerLevel: settings.trialsPerLevel,
    useMask: settings.useMask,
    onComplete,
  });

  // Allow keyboard central responses: A = triangle, L = square. The locate
  // step is pointer-only — there's no sensible key mapping for 8–24 slots.
  const phaseName = runner.phase.name;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (phaseName !== 'response') return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        e.preventDefault();
        runner.respond('A');
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') {
        e.preventDefault();
        runner.respond('B');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phaseName, runner.respond]);

  const display = (() => {
    switch (runner.phase.name) {
      case 'iti':
      case 'responsePause':
      case 'response':
      case 'complete':
        return { kind: 'blank' as const };
      case 'stimulus':
        return { kind: 'stimulus' as const, spec: runner.phase.spec };
      case 'mask':
        return { kind: 'mask' as const };
      case 'locate':
        return { kind: 'locate' as const };
      case 'feedback':
        return {
          kind: 'feedback' as const,
          spec: runner.phase.spec,
          chosenSlot: runner.phase.chosenSlot,
        };
    }
  })();

  // Trial number: trialsCompleted is incremented once both parts are answered,
  // so during all in-trial phases we're still on (trialsCompleted + 1). After
  // feedback fires, trialsCompleted already reflects this trial.
  const inFlightTrial =
    runner.phase.name === 'feedback' || runner.phase.name === 'complete';
  const currentTrialNumber = Math.min(
    runner.trialsCompleted + (inFlightTrial ? 0 : 1),
    settings.trialsPerLevel,
  );

  return (
    <>
      <TopBar
        leftLabel="Quit"
        onLeft={onQuit}
        center={`Trial ${currentTrialNumber} / ${settings.trialsPerLevel}`}
        right={`${Math.round(runner.currentDurationMs)} ms`}
      />
      <Playfield stage={stage} display={display} onPickSlot={runner.locate} />
      {/* Fixed-height bottom slot so the playfield never jumps between phases. */}
      <div
        style={{
          height: 'min(150px, 18vh)',
          flexShrink: 0,
          width: 'min(86vw, 640px)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
        }}
      >
        {runner.phase.name === 'response' && <CentralChoice onChoose={runner.respond} />}
        {runner.phase.name === 'locate' && (
          <PromptBar>Where was the star? Tap the spot.</PromptBar>
        )}
        {runner.phase.name === 'feedback' && (
          <FeedbackBar
            centralCorrect={runner.phase.centralCorrect}
            peripheralCorrect={hasLocate ? runner.phase.peripheralCorrect : null}
          />
        )}
      </div>
    </>
  );
}

function PromptBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        color: 'var(--fg)',
        fontSize: '1rem',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function FeedbackBar({
  centralCorrect,
  peripheralCorrect,
}: {
  centralCorrect: boolean;
  /** null hides the chip (single-slot stages have no locate step). */
  peripheralCorrect: boolean | null;
}) {
  return (
    <div
      role="status"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
      }}
    >
      <FeedbackChip label="Shape" correct={centralCorrect} />
      {peripheralCorrect !== null && <FeedbackChip label="Star" correct={peripheralCorrect} />}
    </div>
  );
}

function FeedbackChip({ label, correct }: { label: string; correct: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 999,
        background: correct ? 'var(--success)' : 'var(--danger)',
        color: 'var(--accent-fg)',
        fontSize: '0.95rem',
        fontWeight: 700,
      }}
    >
      {label} {correct ? '✓' : '✗'}
    </span>
  );
}

function TopBar({
  leftLabel,
  onLeft,
  center,
  right,
}: {
  leftLabel: string;
  onLeft: () => void;
  center: string;
  right: string | null;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 4px 0',
        color: 'var(--fg-dim)',
        fontSize: '0.85rem',
      }}
    >
      <button onClick={onLeft} style={{ color: 'var(--fg-dim)' }}>
        {leftLabel}
      </button>
      <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{center}</div>
      <div style={{ fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right' }}>
        {right ?? ''}
      </div>
    </div>
  );
}
