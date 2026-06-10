import { useCallback, useEffect, useState } from 'react';
import Layout from './components/Layout';
import LandingScreen from './screens/LandingScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import SessionCompleteScreen from './screens/SessionCompleteScreen';
import SettingsScreen from './screens/SettingsScreen';
import StatsScreen from './screens/StatsScreen';
import ScienceScreen from './screens/ScienceScreen';
import TutorialScreen from './screens/TutorialScreen';
import { usePlayerState } from './state/usePlayerState';
import type { BlockResult, SessionResult } from './engine/types';

type Screen =
  | { name: 'landing' }
  | { name: 'gameIdle' }
  | { name: 'gamePlaying' }
  | { name: 'result'; result: BlockResult; blocksLeft: number; level: number; levelChanged: boolean }
  | { name: 'sessionComplete'; session: SessionResult }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'science' }
  | { name: 'tutorial' };

interface Session {
  blocks: BlockResult[];
  startedAt: number;
  startingLevel: number;
}

const DUAL_N_BACK_PATH = '/dual-n-back';

function pathForScreen(name: Screen['name']): string {
  return name === 'landing' ? '/' : DUAL_N_BACK_PATH;
}

function isDualNBackPath(path: string): boolean {
  return path === DUAL_N_BACK_PATH || path.startsWith(`${DUAL_N_BACK_PATH}/`);
}

export default function App() {
  const player = usePlayerState();
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window !== 'undefined' && isDualNBackPath(window.location.pathname)) {
      const firstTime = !player.state.player.hasSeenTutorial && player.state.history.length === 0;
      return firstTime ? { name: 'tutorial' } : { name: 'gameIdle' };
    }
    return { name: 'landing' };
  });
  const [session, setSession] = useState<Session | null>(null);
  // When a session finishes (naturally or early), we stash its SessionResult here
  // so the SessionComplete screen has access to it after the per-block Result.
  const [pendingSummary, setPendingSummary] = useState<SessionResult | null>(null);

  const startSession = useCallback(() => {
    setSession({
      blocks: [],
      startedAt: Date.now(),
      startingLevel: player.state.settings.nBackLevel,
    });
    setPendingSummary(null);
    setScreen({ name: 'gamePlaying' });
  }, [player.state.settings.nBackLevel]);

  // NB: all side effects (recordSession, setScreen, …) happen here in the event
  // callback, never inside a state updater — React may invoke updaters more
  // than once (StrictMode does so on every update), which would double-record.
  const recordBlock = useCallback(
    (result: BlockResult, newLevel: number, levelChanged: boolean) => {
      if (!session) return;
      const blocks = [...session.blocks, result];
      const blocksLeft = player.state.settings.blocksPerSession - blocks.length;

      if (blocksLeft <= 0) {
        const finished: SessionResult = {
          id: createId(),
          startedAt: session.startedAt,
          finishedAt: Date.now(),
          blocks,
          startingLevel: session.startingLevel,
          endingLevel: newLevel,
          completed: true,
        };
        player.recordSession(finished);
        setPendingSummary(finished);
        setSession(null);
        setScreen({ name: 'result', result, blocksLeft: 0, level: newLevel, levelChanged });
        return;
      }

      setSession({ ...session, blocks });
      setScreen({ name: 'result', result, blocksLeft, level: newLevel, levelChanged });
    },
    [session, player],
  );

  // From ResultScreen's "End session", PlayScreen's "Quit", or the natural end-of-session flow.
  // Shows SessionComplete if any blocks were played; otherwise jumps to menu.
  const finishOrSummarize = useCallback(() => {
    if (pendingSummary) {
      // Session completed naturally; pendingSummary already exists.
      setScreen({ name: 'sessionComplete', session: pendingSummary });
      setSession(null);
      return;
    }
    if (session && session.blocks.length > 0) {
      // Mid-session end — record as incomplete and show summary.
      const partial: SessionResult = {
        id: createId(),
        startedAt: session.startedAt,
        finishedAt: Date.now(),
        blocks: session.blocks,
        startingLevel: session.startingLevel,
        endingLevel: player.state.settings.nBackLevel,
        completed: false,
      };
      player.recordSession(partial);
      setPendingSummary(partial);
      setSession(null);
      setScreen({ name: 'sessionComplete', session: partial });
      return;
    }
    setSession(null);
    setScreen({ name: 'gameIdle' });
  }, [pendingSummary, session, player]);

  const dismissSummary = useCallback(() => {
    setPendingSummary(null);
    setScreen({ name: 'gameIdle' });
  }, []);

  const continueSession = useCallback(() => setScreen({ name: 'gamePlaying' }), []);
  const showStats = useCallback(() => setScreen({ name: 'stats' }), []);
  const showSettings = useCallback(() => setScreen({ name: 'settings' }), []);
  const showScience = useCallback(() => setScreen({ name: 'science' }), []);
  const showTutorial = useCallback(() => {
    player.setTutorialSeen(false);
    setScreen({ name: 'tutorial' });
  }, [player]);

  const finishTutorial = useCallback(() => {
    player.setTutorialSeen(true);
    setScreen({ name: 'gameIdle' });
  }, [player]);

  const backToGameIdle = useCallback(() => {
    setSession(null);
    setPendingSummary(null);
    setScreen({ name: 'gameIdle' });
  }, []);

  const backToLanding = useCallback(() => {
    setSession(null);
    setPendingSummary(null);
    setScreen({ name: 'landing' });
  }, []);

  const enterDualNBack = useCallback(() => {
    const firstTime = !player.state.player.hasSeenTutorial && player.state.history.length === 0;
    setScreen(firstTime ? { name: 'tutorial' } : { name: 'gameIdle' });
  }, [player.state.player.hasSeenTutorial, player.state.history.length]);

  // Sync URL ↔ screen. Only two URL-bearing "pages": / (landing) and
  // /dual-n-back (game, regardless of sub-screen).
  useEffect(() => {
    const target = pathForScreen(screen.name);
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
  }, [screen.name]);

  useEffect(() => {
    const handler = () => {
      if (isDualNBackPath(window.location.pathname)) {
        // Already inside the game flow? leave the current sub-screen alone.
        setScreen((prev) => (prev.name === 'landing' ? { name: 'gameIdle' } : prev));
      } else {
        setSession(null);
        setPendingSummary(null);
        setScreen({ name: 'landing' });
      }
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  return (
    <Layout>
      {screen.name === 'landing' && (
        <LandingScreen onPlayDualNBack={enterDualNBack} />
      )}
      {screen.name === 'tutorial' && (
        <TutorialScreen onFinish={finishTutorial} />
      )}
      {(screen.name === 'gameIdle' || screen.name === 'gamePlaying') && (
        <GameScreen
          player={player}
          mode={screen.name === 'gamePlaying' ? 'playing' : 'idle'}
          blockNumber={session ? session.blocks.length + 1 : 1}
          onStart={startSession}
          onHome={backToLanding}
          onStats={showStats}
          onSettings={showSettings}
          onBlockComplete={recordBlock}
          onQuit={finishOrSummarize}
        />
      )}
      {screen.name === 'result' && (
        <ResultScreen
          result={screen.result}
          blocksLeft={screen.blocksLeft}
          level={screen.level}
          levelChanged={screen.levelChanged}
          onContinue={continueSession}
          onDone={finishOrSummarize}
        />
      )}
      {screen.name === 'sessionComplete' && (
        <SessionCompleteScreen session={screen.session} onDone={dismissSummary} />
      )}
      {screen.name === 'stats' && <StatsScreen player={player} onBack={backToGameIdle} />}
      {screen.name === 'science' && <ScienceScreen onBack={backToGameIdle} />}
      {screen.name === 'settings' && (
        <SettingsScreen
          player={player}
          onBack={backToGameIdle}
          onReplayTutorial={showTutorial}
          onShowScience={showScience}
        />
      )}
    </Layout>
  );
}

function createId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
