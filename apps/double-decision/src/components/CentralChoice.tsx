import type { CentralTarget } from '../engine/types';

interface Props {
  onChoose: (choice: CentralTarget) => void;
}

/**
 * Two-card response: triangle vs square. Used after each stimulus flash.
 * Same glyphs as the central stimulus so the mapping is unambiguous.
 */
export default function CentralChoice({ onChoose }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        width: '100%',
        height: '100%',
      }}
    >
      <ChoiceCard target="A" onChoose={onChoose} />
      <ChoiceCard target="B" onChoose={onChoose} />
    </div>
  );
}

function ChoiceCard({
  target,
  onChoose,
}: {
  target: CentralTarget;
  onChoose: (choice: CentralTarget) => void;
}) {
  return (
    <button
      onClick={() => onChoose(target)}
      aria-label={target === 'A' ? 'Triangle' : 'Square'}
      style={{
        flex: 1,
        height: '100%',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent)',
        transition: 'transform 80ms ease, opacity 80ms ease',
      }}
    >
      <div style={{ height: '60%', aspectRatio: '1 / 1' }}>
        {target === 'A' ? (
          <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
            <polygon points="50,10 90,85 10,85" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
            <rect x="12" y="12" width="76" height="76" fill="currentColor" />
          </svg>
        )}
      </div>
    </button>
  );
}
