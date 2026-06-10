import { useState } from 'react';
import BigButton from '../components/BigButton';
import Toggle from '../components/Toggle';
import Slider from '../components/Slider';
import { MAX_TRIALS_PER_LEVEL, MIN_TRIALS_PER_LEVEL } from '../engine/constants';
import type { UsePlayerState } from '../state/usePlayerState';
import type { ThemeId } from '../engine/types';

interface Props {
  player: UsePlayerState;
  onBack: () => void;
}

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'light', label: 'Light Paper' },
  { id: 'mono', label: 'Mono' },
  { id: 'indigo', label: 'Indigo Night' },
  { id: 'forest', label: 'Forest' },
  { id: 'amber', label: 'Amber' },
];

export default function SettingsScreen({ player, onBack }: Props) {
  const s = player.state.settings;
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <>
      <button
        onClick={onBack}
        style={{ color: 'var(--fg-dim)', fontSize: '0.85rem', alignSelf: 'flex-start', marginBottom: 12 }}
      >
        ‹ Back
      </button>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>Settings</div>

      <Row label={`Trials per level · ${s.trialsPerLevel}`} sub="More trials = steadier threshold, longer levels">
        <Slider
          min={MIN_TRIALS_PER_LEVEL}
          max={MAX_TRIALS_PER_LEVEL}
          step={5}
          value={s.trialsPerLevel}
          ariaLabel="Trials per level"
          onChange={(v) => player.updateSettings({ trialsPerLevel: v })}
        />
      </Row>

      <Row label="Post-stimulus mask" sub="Classic UFOV uses one; BrainHQ doesn't. Off makes it easier.">
        <Toggle
          label="Post-stimulus mask"
          checked={s.useMask}
          onChange={(v) => player.updateSettings({ useMask: v })}
        />
      </Row>

      <Row label="Theme">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {THEMES.map((t) => (
            <Pill key={t.id} active={t.id === s.theme} onClick={() => player.updateSettings({ theme: t.id })}>
              {t.label}
            </Pill>
          ))}
        </div>
      </Row>

      <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', textAlign: 'center', marginTop: 8, lineHeight: 1.6 }}>
        Keyboard: <b>A</b> or <b>←</b> for triangle · <b>L</b> or <b>→</b> for square. Locating the star is tap/click only.
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        {!confirmingReset ? (
          <button
            onClick={() => setConfirmingReset(true)}
            style={{ color: 'var(--danger)', fontSize: '0.85rem' }}
          >
            Reset all progress
          </button>
        ) : (
          <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 12 }}>
            <div style={{ fontSize: '0.85rem', marginBottom: 8 }}>Erase all attempts and reset settings?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <BigButton onClick={() => setConfirmingReset(false)}>Cancel</BigButton>
              <BigButton
                primary
                onClick={() => {
                  player.resetAll();
                  setConfirmingReset(false);
                }}
              >
                Reset
              </BigButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, maxWidth: '55%' }}>{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--accent)' : 'var(--surface-deep)',
        color: active ? 'var(--accent-fg)' : 'var(--fg)',
        borderRadius: 6,
        padding: '4px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}
