import { useCallback, useEffect, useMemo, useState } from 'react';
import BigButton from '../components/BigButton';
import Grid from '../components/Grid';
import { useGameEngine } from '../state/useGameEngine';
import { createAudioPlayer, type AudioPlayer } from '../audio';
import { narrate } from '../audio/narrations';
import { applyOutcome } from '../engine/scoring';
import { CHALLENGE_TARGET } from '../engine/constants';
import type { UsePlayerState } from '../state/usePlayerState';
import type { BlockResult } from '../engine/types';

type Countdown = 'ready' | 'set' | 'go' | null;

interface Props {
  player: UsePlayerState;
  mode: 'idle' | 'playing';
  blockNumber: number;
  onStart: () => void;
  onHome: () => void;
  onStats: () => void;
  onSettings: () => void;
  onBlockComplete: (result: BlockResult, newLevel: number, levelChanged: boolean) => void;
  onQuit: () => void;
}

export default function GameScreen({
  player,
  mode,
  blockNumber,
  onStart,
  onHome,
  onStats,
  onSettings,
  onBlockComplete,
  onQuit,
}: Props) {
  const { player: p, settings } = player.state;
  const [audio, setAudio] = useState<AudioPlayer | null>(null);
  const [countdown, setCountdown] = useState<Countdown>(null);

  useEffect(() => {
    if (mode !== 'playing') return;
    let cancelled = false;
    createAudioPlayer(settings.audioSource, settings.voice).then((p) => {
      if (!cancelled) setAudio(p);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, settings.audioSource, settings.voice]);

  const engine = useGameEngine({
    audio,
    settings: { speedMultiplier: settings.speedMultiplier, nBackLevel: settings.nBackLevel },
  });

  // If the screen leaves play mode mid-block (quit), stop the engine. This
  // component stays mounted on the idle menu, so without the reset its timers
  // keep firing invisibly — audio keeps playing and the finished ghost block
  // would silently change the level.
  const engineReset = engine.reset;
  useEffect(() => {
    if (mode !== 'playing') engineReset();
  }, [mode, engineReset]);

  useEffect(() => {
    if (engine.mode === 'blockDone' && engine.lastResult) {
      const result = engine.lastResult;
      const newLevel = settings.autoLevelProgression
        ? applyOutcome(settings.nBackLevel, result.outcome)
        : settings.nBackLevel;
      const levelChanged = newLevel !== settings.nBackLevel;
      if (levelChanged) player.updateSettings({ nBackLevel: newLevel });
      onBlockComplete(result, newLevel, levelChanged);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.mode]);

  useEffect(() => {
    if (mode !== 'playing' || !audio) return;
    setCountdown('ready');
    const handles = [narrate('ready', settings.voice)];
    const timers = [
      setTimeout(() => {
        setCountdown('set');
        handles.push(narrate('set', settings.voice));
      }, 700),
      setTimeout(() => {
        setCountdown('go');
        handles.push(narrate('go', settings.voice));
      }, 1400),
      setTimeout(() => {
        setCountdown(null);
        engine.startBlock(settings.nBackLevel);
      }, 2900),
    ];
    return () => {
      timers.forEach(clearTimeout);
      handles.forEach((h) => h.cancel());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, audio]);

  const posLocked = engine.currentResponse?.position === true;
  const sndLocked = engine.currentResponse?.letter === true;

  const showFeedback = settings.instantFeedback && engine.currentTrial !== null;
  const posFeedback = showFeedback && posLocked
    ? (engine.currentTrial!.positionMatch ? 'correct' : 'wrong')
    : undefined;
  const sndFeedback = showFeedback && sndLocked
    ? (engine.currentTrial!.letterMatch ? 'correct' : 'wrong')
    : undefined;

  const tapPos = useCallback(() => {
    if (posLocked) return;
    engine.tapPosition();
  }, [engine.tapPosition, posLocked]);

  const tapSnd = useCallback(() => {
    if (sndLocked) return;
    engine.tapSound();
  }, [engine.tapSound, sndLocked]);

  const isPaused = engine.mode === 'paused';
  // Pause is only meaningful while the engine is actually scheduling trials.
  // During the Ready/Set/Go countdown the engine is still 'idle', so engine.pause()
  // is a no-op and the countdown's setTimeout would start the block anyway.
  const canPause = engine.mode !== 'idle' && engine.mode !== 'blockDone';
  const togglePause = useCallback(() => {
    if (!canPause) return;
    if (isPaused) engine.resume();
    else engine.pause();
  }, [engine.pause, engine.resume, isPaused, canPause]);

  useEffect(() => {
    if (mode !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
      }
      if (isPaused) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        e.preventDefault();
        tapPos();
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') {
        e.preventDefault();
        tapSnd();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, tapPos, tapSnd, togglePause, isPaused]);

  const litIndex = useMemo(
    () => (engine.showStimulus && engine.currentTrial ? engine.currentTrial.position : null),
    [engine.showStimulus, engine.currentTrial],
  );

  return (
    <>
      {mode === 'idle' ? (
        <>
          <button
            onClick={onHome}
            style={{ color: 'var(--fg-dim)', fontSize: '0.85rem', alignSelf: 'flex-start', marginBottom: 4 }}
          >
            ‹ All games
          </button>
          <header style={{ marginTop: 4 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>N-Back</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--fg-dim)', marginBottom: 16 }}>Challenge</div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--fg-dim)',
              }}
            >
              <Badge>🔥 {p.currentStreak}d streak</Badge>
              <Badge>{p.totalSessionsCompleted}/{CHALLENGE_TARGET} sessions</Badge>
              <Badge accent onClick={onSettings} ariaLabel="Edit level and session length in Settings">
                {settings.nBackLevel}-back · {settings.blocksPerSession} blocks
              </Badge>
            </div>
          </header>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={onQuit} aria-label="Quit session" style={{ color: 'var(--fg-dim)', fontSize: '0.85rem' }}>
            ‹ Quit
          </button>
          <div style={{ textAlign: 'center', lineHeight: 1 }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{settings.nBackLevel}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--fg-dim)', marginLeft: 4 }}>-back</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
              Block {blockNumber}/{settings.blocksPerSession} · Trial {engine.trialIndex >= 0 ? engine.trialIndex + 1 : 0}/{engine.totalTrials}
            </div>
          </div>
          {canPause ? (
            <button
              onClick={togglePause}
              aria-label={isPaused ? 'Resume' : 'Pause'}
              title={isPaused ? 'Resume (Esc)' : 'Pause (Esc)'}
              style={{ color: 'var(--fg-dim)', fontSize: '0.85rem', width: 48, textAlign: 'right' }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          ) : (
            <div style={{ width: 48 }} aria-hidden="true" />
          )}
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '16px 0',
          minHeight: 0,
        }}
      >
        <Grid litIndex={litIndex} />
        {mode === 'playing' && countdown && (
          <div
            aria-live="polite"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg)',
              fontSize: '3.5rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: countdown === 'go' ? 'var(--accent)' : 'var(--fg)',
              transition: 'color 120ms ease',
            }}
          >
            {countdown === 'ready' ? 'Ready' : countdown === 'set' ? 'Set' : 'Go'}
          </div>
        )}
        {mode === 'playing' && isPaused && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg)',
              gap: 16,
            }}
          >
            <div style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Paused</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--fg-dim)', textAlign: 'center', maxWidth: '28ch', lineHeight: 1.4 }}>
              The current trial will replay when you resume. Press <b>Esc</b> or the button above.
            </div>
            <button
              onClick={togglePause}
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
                borderRadius: 999,
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              Resume
            </button>
          </div>
        )}
      </div>

      {mode === 'idle' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BigButton primary onClick={onStart}>Start Session</BigButton>
            <div style={{ display: 'flex', gap: 12 }}>
              <BigButton onClick={onStats}>Stats</BigButton>
              <BigButton onClick={onSettings}>Settings</BigButton>
            </div>
          </div>
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.72rem', color: 'var(--fg-dim)' }}>
            Free &amp; open source ·{' '}
            <a
              href="https://github.com/jonathanleane/rebuildyourfocus/tree/main/apps/dual-n-back"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              source on GitHub
            </a>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <BigButton onClick={tapPos} pressed={posLocked} feedback={posFeedback} ariaLabel="Position match" hotkey="A">Position</BigButton>
          <BigButton primary onClick={tapSnd} pressed={sndLocked} feedback={sndFeedback} ariaLabel="Sound match" hotkey="L">Sound</BigButton>
        </div>
      )}
    </>
  );
}

function Badge({
  children,
  accent,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  accent?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const style = {
    background: accent ? 'var(--fg)' : 'var(--surface)',
    color: accent ? 'var(--bg)' : 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    padding: '5px 10px',
    whiteSpace: 'nowrap' as const,
    fontSize: 'inherit',
    fontWeight: 'inherit',
    fontFamily: 'inherit',
  };
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} style={{ ...style, cursor: 'pointer' }}>
        {children}
      </button>
    );
  }
  return <span style={style}>{children}</span>;
}
