import { useCallback, useEffect, useRef, useState } from 'react';
import { ArcadeVictoryScreen } from './components/ArcadeVictoryScreen';
import { FightArena } from './components/FightArena';
import { IntroVideoScreen } from './components/IntroVideoScreen';
import { StartSplashScreen } from './components/StartSplashScreen';
import { RunSummary, StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { VersusScreen } from './components/VersusScreen';
import {
  AI_DIFFICULTY_MODIFIERS,
  AiDifficulty,
  getArcadeStageDifficulty,
} from './game/ai';
import {
  AudioVolumeSettings,
  BeatTrackInfo,
  audioEngine,
} from './game/audio';
import {
  ALL_OPPONENT_IDS,
  FIGHTERS,
  FighterId,
  PLAYABLE_FIGHTER_IDS,
} from './game/fighters';
import {
  GamepadStatusSummary,
  getGamepadStatusSummary,
  pollBrowserGamepad,
  triggerPlayerRumble,
} from './game/gamepad';
import { DEFAULT_SYSTEM_BINDINGS } from './game/input';
import { GameMode, GameScreenState, buildArcadeLadder } from './game/rules';
import { spriteSheets } from './game/spriteSheet';
import { STAGES, StageId, getArcadeStageForIndex } from './game/stages';

function getInitialAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

const MODE_ORDER: GameMode[] = ['arcade', 'vs_cpu', 'vs_2p', 'training'];

export default function App() {
  const [screenState, setScreenState] = useState<GameScreenState>(() =>
    getInitialAutostart() ? 'playing' : 'start'
  );
  const [mode, setMode] = useState<GameMode>('arcade');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal');
  const [p1Id, setP1Id] = useState<FighterId>('cris_mj');
  const [p2Id, setP2Id] = useState<FighterId>('jere_klein');
  const [selectedStageId, setSelectedStageId] = useState<StageId>('movistar_arena');
  const [ladder, setLadder] = useState<FighterId[]>(() =>
    buildArcadeLadder('cris_mj')
  );
  const [stageIndex, setStageIndex] = useState(0);
  const [matchKey, setMatchKey] = useState(1);
  const [carryScore, setCarryScore] = useState(0);
  const [carryBestCombo, setCarryBestCombo] = useState(0);
  const [carryRivals, setCarryRivals] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSong, setCurrentSong] = useState<BeatTrackInfo>(() =>
    audioEngine.getActiveSongInfo()
  );
  const [isMusicPlaying, setIsMusicPlaying] = useState(() =>
    audioEngine.isMusicPlaying()
  );
  const [volumes, setVolumes] = useState<AudioVolumeSettings>(() =>
    audioEngine.getVolumes()
  );
  const [showDebugCollisions, setShowDebugCollisions] = useState(false);
  const [showPerfDiag, setShowPerfDiag] = useState(false);
  const [gamepadInfo, setGamepadInfo] = useState<GamepadStatusSummary>(() =>
    getGamepadStatusSummary()
  );
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  const menuPadBtnsRef = useRef<boolean[]>([]);
  const lastPadSigRef = useRef<string>('');
  const vsTimerRef = useRef<number | null>(null);
  const lastBattleMusicKeyRef = useRef<string | null>(null);

  useEffect(() => {
    spriteSheets.preloadFighters([p1Id, p2Id]);
    const timer = window.setTimeout(() => {
      spriteSheets.preloadAll();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [p1Id, p2Id]);

  useEffect(() => {
    const syncMusic = () => {
      setCurrentSong(audioEngine.getActiveSongInfo());
      setIsMusicPlaying(audioEngine.isMusicPlaying());
    };
    syncMusic();
    return audioEngine.subscribeMusic(syncMusic);
  }, []);

  useEffect(() => {
    const syncPadStatus = () => {
      const next = getGamepadStatusSummary();
      const sig = `${next.connected}|${next.label ?? ''}|${next.blocked}|${next.activeLabels.join(',')}|${next.assignments.map((a) => `${a.playerSlot}:${a.gamepadIndex}:${a.connected}`).join(',')}`;
      if (sig !== lastPadSigRef.current) {
        lastPadSigRef.current = sig;
        setGamepadInfo(next);
      }
    };
    syncPadStatus();
    window.addEventListener('gamepadconnected', syncPadStatus);
    window.addEventListener('gamepaddisconnected', syncPadStatus);
    const id = window.setInterval(
      syncPadStatus,
      screenState === 'start' || screenState === 'title' ? 120 : 1200
    );
    return () => {
      window.removeEventListener('gamepadconnected', syncPadStatus);
      window.removeEventListener('gamepaddisconnected', syncPadStatus);
      window.clearInterval(id);
    };
  }, [screenState]);

  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  // Synchronize screen soundtrack and randomize songs on every stage change
  useEffect(() => {
    if (screenState === 'start') {
      lastBattleMusicKeyRef.current = null;
      audioEngine.startStartScreenTrack(false);
    } else if (screenState === 'intro_video') {
      lastBattleMusicKeyRef.current = null;
      audioEngine.stopBeatLoop();
    } else if (screenState === 'title') {
      lastBattleMusicKeyRef.current = null;
      audioEngine.startTitleTrack();
    } else if (screenState === 'vs' || screenState === 'playing') {
      const activeStageId =
        mode === 'arcade'
          ? getArcadeStageForIndex(stageIndex, ladder.length)
          : selectedStageId;
      const stageMusicKey = `${matchKey}:${stageIndex}:${activeStageId}`;
      if (stageMusicKey !== lastBattleMusicKeyRef.current) {
        lastBattleMusicKeyRef.current = stageMusicKey;
        audioEngine.playRandomBattleTrack(true);
      }
    }
  }, [screenState, mode, stageIndex, ladder.length, selectedStageId, matchKey]);

  // Unlock browser autoplay audio on first user gesture on any non-video screen
  useEffect(() => {
    if (screenState === 'intro_video') return;
    const onFirstGesture = () => {
      audioEngine.unlock();
    };
    window.addEventListener('pointerdown', onFirstGesture, { passive: true });
    window.addEventListener('keydown', onFirstGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, [screenState]);

  const beatLabel = currentSong.label;

  const handleCycleBeat = useCallback(() => {
    audioEngine.unlock();
    audioEngine.playMenuClick();
    if (screenState === 'start' || screenState === 'vs' || screenState === 'playing') {
      audioEngine.playRandomBattleTrack(true);
    } else {
      audioEngine.cycleBeatTrack(true);
    }
  }, [screenState]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleChangeVolumes = useCallback((patch: Partial<AudioVolumeSettings>) => {
    audioEngine.setVolumes(patch);
    setVolumes(audioEngine.getVolumes());
  }, []);

  const handleSelectP1 = useCallback(
    (id: FighterId) => {
      audioEngine.unlock();
      audioEngine.playMenuClick();
      setP1Id(id);
      if (p2Id === id) {
        setP2Id(id === 'jere_klein' ? 'pablo_chille' : 'jere_klein');
      }
    },
    [p2Id]
  );

  const handleSelectP2 = useCallback((id: FighterId) => {
    audioEngine.unlock();
    audioEngine.playMenuClick();
    setP2Id(id);
  }, []);

  const handleSelectStage = useCallback((id: StageId) => {
    audioEngine.unlock();
    audioEngine.playMenuClick();
    setSelectedStageId(id);
  }, []);

  const enterPlaying = useCallback(() => {
    if (vsTimerRef.current !== null) {
      window.clearTimeout(vsTimerRef.current);
      vsTimerRef.current = null;
    }
    audioEngine.playRoundBell();
    document.body.dataset.state = 'playing';
    setScreenState('playing');
  }, []);

  const showVsThenPlay = useCallback(() => {
    if (vsTimerRef.current !== null) window.clearTimeout(vsTimerRef.current);
    document.body.dataset.state = 'vs';
    setScreenState('vs');
    vsTimerRef.current = window.setTimeout(() => {
      enterPlaying();
    }, 2800);
  }, [enterPlaying]);

  const handleStartMatch = useCallback(() => {
    audioEngine.unlock();
    audioEngine.playMenuClick();
    triggerPlayerRumble(1, 120, 0.35, 0.45);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const nextLadder = buildArcadeLadder(p1Id);
    setLadder(nextLadder);
    setStageIndex(0);
    setCarryScore(0);
    setCarryBestCombo(0);
    setCarryRivals(0);
    setRunSummary(null);
    setMatchKey((k) => k + 1);
    if (mode === 'training') {
      enterPlaying();
    } else {
      showVsThenPlay();
    }
  }, [p1Id, mode, enterPlaying, showVsThenPlay]);

  const handlePause = useCallback(
    (liveSummary: RunSummary) => {
      if (screenState !== 'playing') return;
      setRunSummary(liveSummary);
      document.body.dataset.state = 'paused';
      setScreenState('paused');
    },
    [screenState]
  );

  const handleResume = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setRunSummary(null);
    document.body.dataset.state = 'playing';
    setScreenState('playing');
  }, []);

  const handleRestartMatch = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audioEngine.unlock();
    const isGameOver = screenState === 'gameover';
    if (isGameOver && mode === 'arcade') {
      setLadder(buildArcadeLadder(p1Id));
      setStageIndex(0);
      setCarryScore(0);
      setCarryBestCombo(0);
      setCarryRivals(0);
    }
    setRunSummary(null);
    setMatchKey((k) => k + 1);
    if (isGameOver && mode !== 'training') {
      showVsThenPlay();
    } else {
      document.body.dataset.state = 'playing';
      setScreenState('playing');
    }
  }, [screenState, mode, p1Id, showVsThenPlay]);

  const handleNextStage = useCallback(() => {
    if (!runSummary) return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    audioEngine.unlock();
    setCarryScore(runSummary.score);
    setCarryBestCombo(runSummary.bestCombo);
    setCarryRivals((r) => r + 1);
    setStageIndex((idx) => Math.min(ladder.length - 1, idx + 1));
    setRunSummary(null);
    setMatchKey((k) => k + 1);
    showVsThenPlay();
  }, [runSummary, ladder.length, showVsThenPlay]);

  const handleBeginIntro = useCallback(() => {
    audioEngine.unlock();
    audioEngine.playMenuClick();
    audioEngine.stopBeatLoop();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.body.dataset.state = 'intro_video';
    setScreenState('intro_video');
  }, []);

  const handleFinishIntro = useCallback(() => {
    audioEngine.unlock();
    document.body.dataset.state = 'title';
    setScreenState('title');
  }, []);

  const handleReturnToTitle = useCallback(() => {
    if (vsTimerRef.current !== null) {
      window.clearTimeout(vsTimerRef.current);
      vsTimerRef.current = null;
    }
    lastBattleMusicKeyRef.current = null;
    setRunSummary(null);
    document.body.dataset.state = 'title';
    setScreenState('title');
  }, []);

  const handleMatchEnd = useCallback((summary: RunSummary) => {
    setRunSummary(summary);
    document.body.dataset.state = 'gameover';
    setScreenState('gameover');
  }, []);

  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (screenState === 'start') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleBeginIntro();
        }
      } else if (screenState === 'intro_video') {
        if (
          e.code === 'Enter' ||
          e.code === 'Space' ||
          e.code === DEFAULT_SYSTEM_BINDINGS.pause
        ) {
          e.preventDefault();
          handleFinishIntro();
        }
      } else if (screenState === 'title') {
        const dialogOpen = document.querySelector('[role="dialog"]') !== null;
        if (!dialogOpen && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          handleStartMatch();
        }
      } else if (screenState === 'vs') {
        if (
          e.code === 'Enter' ||
          e.code === 'Space' ||
          e.code === DEFAULT_SYSTEM_BINDINGS.pause
        ) {
          e.preventDefault();
          enterPlaying();
        }
      } else if (screenState === 'paused') {
        if (e.code === DEFAULT_SYSTEM_BINDINGS.pause) {
          e.preventDefault();
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [
    screenState,
    handleBeginIntro,
    handleFinishIntro,
    handleStartMatch,
    enterPlaying,
    handleResume,
  ]);

  // Xbox Gamepad menu & modal navigation
  useEffect(() => {
    if (screenState === 'playing') {
      menuPadBtnsRef.current = [];
      return;
    }
    let rafId = 0;
    const pollMenus = () => {
      rafId = requestAnimationFrame(pollMenus);
      const pad = pollBrowserGamepad(0, menuPadBtnsRef.current);
      menuPadBtnsRef.current = pad.nextButtons;
      if (!pad.connected) return;

      const { nav } = pad;
      if (screenState === 'start') {
        if (nav.confirmPressed || nav.pausePressed) {
          handleBeginIntro();
        }
        return;
      }
      if (screenState === 'intro_video') {
        if (nav.confirmPressed || nav.pausePressed || nav.cancelPressed) {
          handleFinishIntro();
        }
        return;
      }
      if (screenState === 'vs') {
        if (nav.confirmPressed || nav.xPressed) {
          enterPlaying();
        }
        return;
      }
      if (screenState === 'title') {
        const currIdx = PLAYABLE_FIGHTER_IDS.indexOf(p1Id);
        const len = PLAYABLE_FIGHTER_IDS.length;
        if (nav.leftPressed) {
          handleSelectP1(PLAYABLE_FIGHTER_IDS[(currIdx - 1 + len) % len]);
        } else if (nav.rightPressed) {
          handleSelectP1(PLAYABLE_FIGHTER_IDS[(currIdx + 1) % len]);
        } else if (nav.upPressed) {
          handleSelectP1(PLAYABLE_FIGHTER_IDS[(currIdx - 4 + len) % len]);
        } else if (nav.downPressed) {
          handleSelectP1(PLAYABLE_FIGHTER_IDS[(currIdx + 4) % len]);
        } else if (nav.prevTabPressed) {
          const mIdx = MODE_ORDER.indexOf(mode);
          audioEngine.unlock();
          audioEngine.playMenuClick();
          setMode(MODE_ORDER[(mIdx - 1 + MODE_ORDER.length) % MODE_ORDER.length]);
        } else if (nav.nextTabPressed) {
          const mIdx = MODE_ORDER.indexOf(mode);
          audioEngine.unlock();
          audioEngine.playMenuClick();
          setMode(MODE_ORDER[(mIdx + 1) % MODE_ORDER.length]);
        } else if (nav.yPressed) {
          const others = PLAYABLE_FIGHTER_IDS.filter((id) => id !== p1Id);
          const pick = others[Math.floor(Math.random() * others.length)];
          if (pick) handleSelectP1(pick);
        } else if (nav.xPressed && mode !== 'arcade') {
          const p2Idx = ALL_OPPONENT_IDS.indexOf(p2Id);
          handleSelectP2(ALL_OPPONENT_IDS[(p2Idx + 1) % ALL_OPPONENT_IDS.length]);
        } else if (nav.confirmPressed) {
          handleStartMatch();
        }
      } else if (screenState === 'paused') {
        if (nav.confirmPressed || nav.pausePressed) {
          handleResume();
        } else if (nav.cancelPressed) {
          handleReturnToTitle();
        }
      } else if (screenState === 'gameover' && runSummary) {
        if (nav.confirmPressed) {
          if (runSummary.hasNextArcadeStage) {
            handleNextStage();
          } else {
            handleRestartMatch();
          }
        } else if (nav.cancelPressed) {
          handleReturnToTitle();
        }
      }
    };

    rafId = requestAnimationFrame(pollMenus);
    return () => cancelAnimationFrame(rafId);
  }, [
    screenState,
    p1Id,
    p2Id,
    mode,
    runSummary,
    handleBeginIntro,
    handleFinishIntro,
    handleSelectP1,
    handleSelectP2,
    handleStartMatch,
    enterPlaying,
    handleResume,
    handleNextStage,
    handleRestartMatch,
    handleReturnToTitle,
  ]);

  const vsP1 = FIGHTERS[p1Id];
  const vsP2Id = mode === 'arcade' ? ladder[Math.min(stageIndex, ladder.length - 1)] : p2Id;
  const vsP2 = FIGHTERS[vsP2Id];
  const vsStage = STAGES[mode === 'arcade' ? getArcadeStageForIndex(stageIndex, ladder.length) : selectedStageId];
  const vsAiLabel =
    mode === 'arcade'
      ? getArcadeStageDifficulty(difficulty, stageIndex, ladder.length, vsP2.isBoss).label
      : mode === 'vs_cpu'
        ? AI_DIFFICULTY_MODIFIERS[difficulty].label
        : undefined;

  return (
    <main
      className="w-screen h-screen overflow-hidden bg-[#090a14]"
      onPointerDown={() => {
        if (typeof window !== 'undefined') window.focus();
      }}
    >
      {screenState === 'start' ? (
        <StartSplashScreen
          onBeginIntro={handleBeginIntro}
          currentSong={currentSong}
          isMusicPlaying={isMusicPlaying}
          isMuted={isMuted}
          onUnlockAudio={() => {
            audioEngine.unlock();
            if (!isMuted && !audioEngine.isMusicPlaying()) {
              audioEngine.startStartScreenTrack(false);
            }
          }}
          onShuffleSong={() => {
            audioEngine.unlock();
            audioEngine.playMenuClick();
            audioEngine.playRandomBattleTrack(true);
          }}
          onToggleMute={handleToggleMute}
          gamepadConnected={gamepadInfo.connected}
          gamepadName={gamepadInfo.label}
          gamepadBlocked={gamepadInfo.blocked}
          gamepadActiveButtons={gamepadInfo.activeLabels}
        />
      ) : screenState === 'intro_video' ? (
        <IntroVideoScreen isMuted={isMuted} onFinish={handleFinishIntro} />
      ) : screenState === 'title' ? (
        <TitleScreen
          mode={mode}
          difficulty={difficulty}
          p1Id={p1Id}
          p2Id={p2Id}
          selectedStageId={selectedStageId}
          onSelectMode={(m) => {
            audioEngine.unlock();
            audioEngine.playMenuClick();
            setMode(m);
          }}
          onSelectDifficulty={(d) => {
            audioEngine.unlock();
            audioEngine.playMenuClick();
            setDifficulty(d);
          }}
          onSelectP1={handleSelectP1}
          onSelectP2={handleSelectP2}
          onSelectStage={handleSelectStage}
          onStart={handleStartMatch}
          beatLabel={beatLabel}
          gamepadConnected={gamepadInfo.connected}
          gamepadName={gamepadInfo.label}
          gamepadActiveButtons={gamepadInfo.activeLabels}
          gamepadBlocked={gamepadInfo.blocked}
          gamepadAssignments={gamepadInfo.assignments}
          onTestRumble={(slot = 1) => triggerPlayerRumble(slot, 260, 0.7, 0.85)}
          onCycleBeat={handleCycleBeat}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          volumes={volumes}
          onChangeVolumes={handleChangeVolumes}
          showDebugCollisions={showDebugCollisions}
          onToggleDebugCollisions={() => setShowDebugCollisions((v) => !v)}
          showPerfDiag={showPerfDiag}
          onTogglePerfDiag={() => setShowPerfDiag((v) => !v)}
        />
      ) : screenState === 'vs' ? (
        <VersusScreen
          p1={vsP1}
          p2={vsP2}
          stage={vsStage}
          mode={mode}
          stageIndex={stageIndex}
          totalStages={ladder.length}
          aiLabel={vsAiLabel}
          onStartFight={enterPlaying}
        />
      ) : (
        <>
          <FightArena
            screenState={screenState}
            mode={mode}
            difficulty={difficulty}
            p1Id={p1Id}
            p2Id={p2Id}
            selectedStageId={selectedStageId}
            matchKey={matchKey}
            stageIndex={stageIndex}
            ladder={ladder}
            carryScore={carryScore}
            carryBestCombo={carryBestCombo}
            carryRivals={carryRivals}
            beatLabel={beatLabel}
            gamepadConnected={gamepadInfo.connected}
            isMuted={isMuted}
            showDebugCollisions={showDebugCollisions}
            showPerfDiag={showPerfDiag}
            onCycleBeat={handleCycleBeat}
            onToggleMute={handleToggleMute}
            onPause={handlePause}
            onRestart={handleRestartMatch}
            onMatchEnd={handleMatchEnd}
          />
          {screenState === 'gameover' &&
          runSummary &&
          runSummary.outcome === 'victory' &&
          runSummary.mode === 'arcade' &&
          !runSummary.hasNextArcadeStage ? (
            <ArcadeVictoryScreen
              summary={runSummary}
              gamepadConnected={gamepadInfo.connected}
              onRestart={handleRestartMatch}
              onTitle={handleReturnToTitle}
            />
          ) : (
            (screenState === 'paused' || screenState === 'gameover') &&
            runSummary && (
              <StatusModal
                summary={runSummary}
                gamepadConnected={gamepadInfo.connected}
                difficultyLabel={
                  mode === 'arcade'
                    ? getArcadeStageDifficulty(
                        difficulty,
                        runSummary.stageIndex,
                        runSummary.totalStages,
                        runSummary.p2.isBoss
                      ).label
                    : AI_DIFFICULTY_MODIFIERS[difficulty].label
                }
                volumes={volumes}
                onChangeVolumes={handleChangeVolumes}
                showDebugCollisions={showDebugCollisions}
                onToggleDebugCollisions={() => setShowDebugCollisions((v) => !v)}
                showPerfDiag={showPerfDiag}
                onTogglePerfDiag={() => setShowPerfDiag((v) => !v)}
                onResume={handleResume}
                onNextStage={handleNextStage}
                onRestart={handleRestartMatch}
                onTitle={handleReturnToTitle}
              />
            )
          )}
        </>
      )}
    </main>
  );
}
