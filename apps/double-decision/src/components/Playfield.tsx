import { useMemo, type CSSProperties } from 'react';
import { slotToPolar, totalSlots, type StageConfig } from '../engine/stages';
import type { CentralTarget, StimulusSpec } from '../engine/types';

interface Props {
  stage: StageConfig;
  /** What to render in the playfield right now. */
  display:
    | { kind: 'preview' }            // shows all possible peripheral slots faintly
    | { kind: 'blank' }              // dark background only (ITI)
    | { kind: 'stimulus'; spec: StimulusSpec }
    | { kind: 'mask' }
    | { kind: 'locate' }             // tappable slot markers — "where was the star?"
    | { kind: 'feedback'; spec: StimulusSpec; chosenSlot: number | null };
  /** Called with the tapped slot index while display.kind === 'locate'. */
  onPickSlot?: (slot: number) => void;
}

/**
 * The visual playfield where stimuli are presented. A square area whose size
 * adapts to the viewport. All positions are computed once based on stage and
 * re-projected to the playfield in CSS via absolute positioning.
 */
export default function Playfield({ stage, display, onPickSlot }: Props) {
  const slots = totalSlots(stage);
  // Pre-compute slot polar positions once per stage.
  const slotPositions = useMemo(
    () =>
      Array.from({ length: slots }, (_, i) => {
        const { angleRad, eccentricity } = slotToPolar(stage, i);
        return polarToOffset(angleRad, eccentricity);
      }),
    [stage, slots],
  );

  return (
    <div
      style={{
        position: 'relative',
        // Sized to leave room for the top bar (~30) and the response cards
        // (~160) when present, while staying square. Uses vmin so it adapts to
        // both portrait phones and wide desktop windows.
        width: 'min(86vw, calc(100dvh - 220px), 640px)',
        aspectRatio: '1 / 1',
        background: 'var(--surface)',
        borderRadius: 24,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        margin: '0 auto',
        flexShrink: 0,
      }}
    >
      {/* Faint centre dot — fixation cue. Always visible to anchor the eye. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: 'var(--fg-dim)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* Preview: faintly mark every possible peripheral slot so the player knows
          where to expect things. */}
      {display.kind === 'preview' &&
        slotPositions.map((pos, i) => (
          <Glyph key={`slot-${i}`} kind="slot" offset={pos} />
        ))}

      {/* Stimulus: central target + peripheral target + distractors. */}
      {display.kind === 'stimulus' && (
        <StimulusGlyphs spec={display.spec} slotPositions={slotPositions} />
      )}

      {/* Locate: every slot becomes a tap target — the player reports where the
          star was. */}
      {display.kind === 'locate' &&
        slotPositions.map((pos, i) => (
          <SlotButton key={`pick-${i}`} index={i} offset={pos} onPick={onPickSlot} />
        ))}

      {/* Feedback: re-show the stimulus, ring the true location, and mark a
          wrong pick in the danger colour. */}
      {display.kind === 'feedback' && (
        <>
          <StimulusGlyphs spec={display.spec} slotPositions={slotPositions} />
          <Ring
            color="var(--success)"
            offset={slotPositions[display.spec.peripheralPosition]}
          />
          {display.chosenSlot !== null &&
            display.chosenSlot !== display.spec.peripheralPosition && (
              <Ring color="var(--danger)" offset={slotPositions[display.chosenSlot]} />
            )}
        </>
      )}

      {/* Mask: noisy overlay covering the entire field, used to interrupt
          continued perceptual processing of the just-flashed stimulus. */}
      {display.kind === 'mask' && <Mask />}
    </div>
  );
}

interface Offset {
  xPct: number; // 0..100 from left of playfield
  yPct: number; // 0..100 from top of playfield
}

function StimulusGlyphs({
  spec,
  slotPositions,
}: {
  spec: StimulusSpec;
  slotPositions: Offset[];
}) {
  return (
    <>
      <CentralGlyph target={spec.central} />
      <Glyph kind="target" offset={slotPositions[spec.peripheralPosition]} />
      {spec.distractorPositions.map((idx) => (
        <Glyph key={`d-${idx}`} kind="distractor" offset={slotPositions[idx]} />
      ))}
    </>
  );
}

/**
 * Convert (angle from 12 o'clock, eccentricity 0..1) into (xPct, yPct) inside
 * the playfield. Eccentricity is fraction of distance from centre to edge.
 */
function polarToOffset(angleRad: number, eccentricity: number): Offset {
  const x = Math.sin(angleRad) * eccentricity;
  const y = -Math.cos(angleRad) * eccentricity;
  return {
    xPct: 50 + x * 50,
    yPct: 50 + y * 50,
  };
}

const GLYPH_SIZE = 'clamp(28px, 6.5vmin, 56px)';

function CentralGlyph({ target }: { target: CentralTarget }) {
  const common: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: `calc(${GLYPH_SIZE} * 1.6)`,
    height: `calc(${GLYPH_SIZE} * 1.6)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
    pointerEvents: 'none',
  };
  return (
    <div style={common} aria-hidden>
      {target === 'A' ? <TriangleIcon /> : <SquareIcon />}
    </div>
  );
}

function Glyph({ kind, offset }: { kind: 'slot' | 'target' | 'distractor'; offset: Offset }) {
  const style: CSSProperties = {
    position: 'absolute',
    left: `${offset.xPct}%`,
    top: `${offset.yPct}%`,
    transform: 'translate(-50%, -50%)',
    width: GLYPH_SIZE,
    height: GLYPH_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
    pointerEvents: 'none',
  };
  if (kind === 'slot') {
    return (
      <div style={{ ...style, opacity: 0.25 }} aria-hidden>
        <CircleOutline />
      </div>
    );
  }
  if (kind === 'distractor') {
    // Same shape and colour as the target, hollow fill — the player has to
    // resolve fill, not just pop-out colour/shape, to find the real star.
    return (
      <div style={{ ...style, color: 'var(--accent-warm)' }} aria-hidden>
        <StarOutline />
      </div>
    );
  }
  // target
  return (
    <div style={{ ...style, color: 'var(--accent-warm)' }} aria-hidden>
      <StarIcon />
    </div>
  );
}

/** Tappable slot marker shown during the locate phase. */
function SlotButton({
  index,
  offset,
  onPick,
}: {
  index: number;
  offset: Offset;
  onPick?: (slot: number) => void;
}) {
  return (
    <button
      onClick={() => onPick?.(index)}
      aria-label={`Slot ${index + 1}`}
      style={{
        position: 'absolute',
        left: `${offset.xPct}%`,
        top: `${offset.yPct}%`,
        transform: 'translate(-50%, -50%)',
        // Bigger than the glyph so it's a comfortable touch target.
        width: `calc(${GLYPH_SIZE} * 1.5)`,
        height: `calc(${GLYPH_SIZE} * 1.5)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--fg-dim)',
        borderRadius: '50%',
      }}
    >
      <span aria-hidden style={{ width: '66%', height: '66%', display: 'block', opacity: 0.6 }}>
        <CircleOutline />
      </span>
    </button>
  );
}

/** Feedback marker ringing a slot. */
function Ring({ color, offset }: { color: string; offset: Offset }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: `${offset.xPct}%`,
        top: `${offset.yPct}%`,
        transform: 'translate(-50%, -50%)',
        width: `calc(${GLYPH_SIZE} * 1.5)`,
        height: `calc(${GLYPH_SIZE} * 1.5)`,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        pointerEvents: 'none',
      }}
    />
  );
}

function TriangleIcon() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <polygon points="50,10 90,85 10,85" fill="currentColor" />
    </svg>
  );
}
function SquareIcon() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <rect x="12" y="12" width="76" height="76" fill="currentColor" />
    </svg>
  );
}
function CircleOutline() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="10" />
    </svg>
  );
}
const STAR_POINTS = '50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38';
function StarIcon() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <polygon points={STAR_POINTS} fill="currentColor" />
    </svg>
  );
}
function StarOutline() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <polygon
        points={STAR_POINTS}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Mask() {
  // SVG noise mask — small jittered squares filling the field. Deterministic so
  // it looks the same every trial (visual consistency > randomness for a mask).
  const cells = useMemo(() => {
    const out: { x: number; y: number; size: number; rot: number; opacity: number }[] = [];
    const rng = mulberry(424242);
    for (let i = 0; i < 220; i++) {
      out.push({
        x: rng() * 100,
        y: rng() * 100,
        size: 3 + rng() * 6,
        rot: rng() * 90,
        opacity: 0.35 + rng() * 0.5,
      });
    }
    return out;
  }, []);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden
    >
      <rect width="100" height="100" fill="var(--surface-deep)" />
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={c.size}
          height={c.size}
          fill="var(--fg)"
          opacity={c.opacity}
          transform={`rotate(${c.rot} ${c.x + c.size / 2} ${c.y + c.size / 2})`}
        />
      ))}
    </svg>
  );
}

function mulberry(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
