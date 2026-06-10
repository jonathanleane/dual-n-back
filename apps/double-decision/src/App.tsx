import { useCallback, useState } from 'react';
import Layout from './components/Layout';
import MenuScreen from './screens/MenuScreen';
import PlayScreen from './screens/PlayScreen';
import ResultsScreen from './screens/ResultsScreen';
import AboutScreen from './screens/AboutScreen';
import SettingsScreen from './screens/SettingsScreen';
import { usePlayerState } from './state/usePlayerState';
import type { SessionAttempt } from './engine/types';

type Screen =
  | { name: 'menu' }
  | { name: 'play'; stageId: number }
  | { name: 'results'; attempt: SessionAttempt; previousBestThresholdMs: number | null }
  | { name: 'about' }
  | { name: 'settings' };

export default function App() {
  const player = usePlayerState();
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });

  const playStage = useCallback((stageId: number) => {
    setScreen({ name: 'play', stageId });
  }, []);

  const finishAttempt = useCallback(
    (attempt: SessionAttempt) => {
      // Capture the previous best BEFORE recording, so the results screen can
      // tell whether this attempt beat it.
      const prev = player.state.player.bestThresholdByStage[attempt.stageId]?.thresholdMs ?? null;
      player.recordAttempt(attempt);
      setScreen({ name: 'results', attempt, previousBestThresholdMs: prev });
    },
    [player],
  );

  const backToMenu = useCallback(() => setScreen({ name: 'menu' }), []);
  const showAbout = useCallback(() => setScreen({ name: 'about' }), []);
  const showSettings = useCallback(() => setScreen({ name: 'settings' }), []);

  const isPlaying = screen.name === 'play';
  const isResults = screen.name === 'results';

  return (
    <Layout fullBleed={isPlaying || isResults}>
      {screen.name === 'menu' && (
        <MenuScreen
          player={player.state.player}
          onPickStage={playStage}
          onAbout={showAbout}
          onSettings={showSettings}
        />
      )}
      {screen.name === 'play' && (
        <PlayScreen
          stageId={screen.stageId}
          settings={player.state.settings}
          onComplete={finishAttempt}
          onQuit={backToMenu}
        />
      )}
      {screen.name === 'results' && (
        <ResultsScreen
          attempt={screen.attempt}
          previousBestMs={screen.previousBestThresholdMs}
          onPlayAgain={() => setScreen({ name: 'play', stageId: screen.attempt.stageId })}
          onMenu={backToMenu}
        />
      )}
      {screen.name === 'about' && <AboutScreen onBack={backToMenu} />}
      {screen.name === 'settings' && <SettingsScreen player={player} onBack={backToMenu} />}
    </Layout>
  );
}
