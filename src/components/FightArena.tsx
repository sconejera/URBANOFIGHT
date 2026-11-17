import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AiDifficulty } from '../game/ai';
import { audioEngine } from '../game/audio';
import { GAME_CONFIG } from '../game/config';
import { FIGHTERS, FighterId } from '../game/fighters';
import {
  mergeInputs,
  pollBrowserGamepad,
  triggerPlayerRumble,
} from '../game/gamepad';
import {
  DEFAULT_P1_BINDINGS,
  DEFAULT_P1_SOLO_SECONDARY_BINDINGS,
  DEFAULT_P2_BINDINGS,
  DEFAULT_SYSTEM_BINDINGS,
  InputHistoryEntry,
  NAVIGATION_PREVENT_DEFAULT_CODES,
  buildKeyboardInputSnapshot,
} from '../game/input';
import {
  ParticlePool,
  drawDebugCollisionOverlay,
  drawFighter,
  drawFighterBubble,
  drawProjectile,
  drawStageReactiveEffects,
} from '../game/pixelSprites';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  DEFAULT_TRAINING_CONFIG,
  EMPTY_INPUT,
  FrameDataReadout,
  GROUND_Y,
  GameMode,
  GameScreenState,
  InputSnapshot,
  MatchEvent,
  MatchState,
  TrainingConfig,
  computeFacingNumpad,
  createMatchState,
  getKillerInstinctLabel,
  resetTrainingState,
  stepMatch,
} from '../game/rules';
import { spriteSheets } from '../game/spriteSheet';
import { STAGES, StageId, getArcadeStageForIndex } from '../game/stages';
import {
  GameHud,
  HudDomRefs,
  PerfDiagSnapshot,
  SuperCutInState,
  TrainingRecordingState,
} from './GameHud';
import { RunSummary } from './StatusModal';

interface FightArenaProps {
  screenState: GameScreenState;
  mode: GameMode;
  difficulty: AiDifficulty;
  p1Id: FighterId;
  p2Id: FighterId;
  selectedStageId: StageId;
  matchKey: number;
  stageIndex: number;
  ladder: FighterId[];
  carryScore: number;
  carryBestCombo: number;
  carryRivals: number;
  beatLabel: string;
  gamepadConnected: boolean;
  isMuted: boolean;
  showDebugCollisions: boolean;
  showPerfDiag: boolean;
  onCycleBeat: () => void;
  onToggleMute: () => void;
  onPause: (summary: RunSummary) => void;
  onRestart: () => void;
  onMatchEnd: (summary: RunSummary) => void;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function stripEdgePresses(input: InputSnapshot): InputSnapshot {
  return {
    left: input.left,
    right: input.right,
    up: input.up,
    down: input.down,
    lightPunchPressed: false,
    heavyPunchPressed: false,
    lightKickPressed: false,
    heavyKickPressed: false,
    ultraPressed: false,
    dashPressed: false,
    blockHeld: input.blockHeld,
  };
}

function collectPressedButtons(input: InputSnapshot): string[] {
  const btns: string[] = [];
  if (input.lightPunchPressed) btns.push('LP');
  if (input.heavyPunchPressed) btns.push('HP');
  if (input.lightKickPressed) btns.push('LK');
  if (input.heavyKickPressed) btns.push('HK');
  if (input.ultraPressed) btns.push('ULTRA');
  if (input.dashPressed) btns.push('DASH');
  if (input.blockHeld) btns.push('BLK');
  return btns;
}

const MAX_RECORDING_FRAMES = 600;

export const FightArena: React.FC<FightArenaProps> = ({
  screenState,
  mode,
  difficulty,
  p1Id,
  p2Id,
  selectedStageId,
  matchKey,
  stageIndex,
  ladder,
  carryScore,
  carryBestCombo,
  carryRivals,
  beatLabel,
  gamepadConnected,
  isMuted,
  showDebugCollisions,
  showPerfDiag,
  onCycleBeat,
  onToggleMute,
  onPause,
  onRestart,
  onMatchEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matchRef = useRef<MatchState>(
    createMatchState(
      mode,
      p1Id,
      p2Id,
      stageIndex,
      ladder,
      carryScore,
      carryBestCombo,
      carryRivals,
      difficulty
    )
  );
  const particlesRef = useRef<ParticlePool>(new ParticlePool(240));
  const shakeTraumaRef = useRef<number>(0);
  const stagePulseRef = useRef<number>(0);

  const activeStageId =
    mode === 'arcade' ? getArcadeStageForIndex(stageIndex, ladder.length) : selectedStageId;
  const stageInfo = STAGES[activeStageId] ?? STAGES.cancha_pobla;
  const stageInfoRef = useRef(stageInfo);
  stageInfoRef.current = stageInfo;

  const screenStateRef = useRef(screenState);
  screenStateRef.current = screenState;
  const showDebugCollisionsRef = useRef(showDebugCollisions);
  showDebugCollisionsRef.current = showDebugCollisions;
  const showPerfDiagRef = useRef(showPerfDiag);
  showPerfDiagRef.current = showPerfDiag;

  const callbacksRef = useRef({ onPause, onRestart, onToggleMute, onMatchEnd });
  callbacksRef.current = { onPause, onRestart, onToggleMute, onMatchEnd };

  const [hudMeta, setHudMeta] = useState<{
    p1: typeof matchRef.current.p1.profile;
    p2: typeof matchRef.current.p2.profile;
    roundNumber: number;
    p1Rounds: number;
    p2Rounds: number;
    bannerText: string | null;
  }>(() => ({
    p1: matchRef.current.p1.profile,
    p2: matchRef.current.p2.profile,
    roundNumber: 1,
    p1Rounds: 0,
    p2Rounds: 0,
    bannerText: mode === 'training' ? null : 'ROUND 1',
  }));
  const [calloutText, setCalloutText] = useState<string | null>(null);
  const [activeHookLabel, setActiveHookLabel] = useState<string | null>(null);
  const [superCutIn, setSuperCutIn] = useState<SuperCutInState | null>(null);

  // Training Mode & Diagnostics State
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>(
    DEFAULT_TRAINING_CONFIG
  );
  const trainingConfigRef = useRef<TrainingConfig>(DEFAULT_TRAINING_CONFIG);
  const [recordingState, setRecordingState] =
    useState<TrainingRecordingState>('idle');
  const recordingStateRef = useRef<TrainingRecordingState>('idle');
  const recordedFramesRef = useRef<InputSnapshot[]>([]);
  const [recordedFramesCount, setRecordedFramesCount] = useState(0);
  const playbackCursorRef = useRef(0);
  const [frameData, setFrameData] = useState<FrameDataReadout | null>(null);
  const [inputHistory, setInputHistory] = useState<InputHistoryEntry[]>([]);
  const [perfDiag, setPerfDiag] = useState<PerfDiagSnapshot | null>(null);

  const hookTimeoutRef = useRef<number | null>(null);
  const calloutTimeoutRef = useRef<number | null>(null);
  const cutInTimeoutRef = useRef<number | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);

  const hudRefs: HudDomRefs = {
    p1HpBar: useRef<HTMLDivElement | null>(null),
    p1GhostBar: useRef<HTMLDivElement | null>(null),
    p2HpBar: useRef<HTMLDivElement | null>(null),
    p2GhostBar: useRef<HTMLDivElement | null>(null),
    p1Bar1: useRef<HTMLDivElement | null>(null),
    p1Bar2: useRef<HTMLDivElement | null>(null),
    p1Bar3: useRef<HTMLDivElement | null>(null),
    p2Bar1: useRef<HTMLDivElement | null>(null),
    p2Bar2: useRef<HTMLDivElement | null>(null),
    p2Bar3: useRef<HTMLDivElement | null>(null),
    p1SuperReady: useRef<HTMLSpanElement | null>(null),
    p2SuperReady: useRef<HTMLSpanElement | null>(null),
    timerText: useRef<HTMLDivElement | null>(null),
    p1ComboBox: useRef<HTMLDivElement | null>(null),
    p1ComboNum: useRef<HTMLSpanElement | null>(null),
    p1ComboTitle: useRef<HTMLSpanElement | null>(null),
    p2ComboBox: useRef<HTMLDivElement | null>(null),
    p2ComboNum: useRef<HTMLSpanElement | null>(null),
    p2ComboTitle: useRef<HTMLSpanElement | null>(null),
    scoreText: useRef<HTMLSpanElement | null>(null),
  };

  const heldKeysRef = useRef<Set<string>>(new Set());
  const justPressedRef = useRef<Set<string>>(new Set());
  const touchHeldRef = useRef<Set<string>>(new Set());
  const touchJustRef = useRef<Set<string>>(new Set());
  const p1PadBtnsRef = useRef<boolean[]>([]);
  const p2PadBtnsRef = useRef<boolean[]>([]);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const needsStaticDrawRef = useRef(true);
  const prevSheetsReadyRef = useRef({ p1: false, p2: false });

  useEffect(() => {
    const resolvedP2 =
      mode === 'arcade'
        ? ladder[Math.min(stageIndex, ladder.length - 1)] ?? p2Id
        : p2Id;
    spriteSheets.preloadFighters([p1Id, resolvedP2]);
    spriteSheets.preloadAll();
  }, [mode, p1Id, p2Id, stageIndex, ladder]);

  useEffect(() => {
    matchRef.current.difficulty = difficulty;
  }, [difficulty]);

  const handleUpdateTrainingConfig = useCallback(
    (patch: Partial<TrainingConfig>) => {
      setTrainingConfig((prev) => {
        const next = { ...prev, ...patch };
        trainingConfigRef.current = next;
        matchRef.current.trainingConfig = next;
        if (next.infiniteMeter) {
          matchRef.current.p1.superMeter = GAME_CONFIG.maxSuperMeter;
          matchRef.current.p2.superMeter = GAME_CONFIG.maxSuperMeter;
        }
        needsStaticDrawRef.current = true;
        return next;
      });
    },
    []
  );

  const handleResetTraining = useCallback(() => {
    resetTrainingState(matchRef.current);
    setFrameData(null);
    setInputHistory([]);
    needsStaticDrawRef.current = true;
  }, []);

  const handleCycleRecording = useCallback(() => {
    setRecordingState((prev) => {
      let next: TrainingRecordingState;
      if (prev === 'idle') {
        if (recordedFramesRef.current.length > 0) {
          playbackCursorRef.current = 0;
          next = 'playing';
        } else {
          recordedFramesRef.current = [];
          setRecordedFramesCount(0);
          next = 'recording';
        }
      } else if (prev === 'recording') {
        playbackCursorRef.current = 0;
        next = recordedFramesRef.current.length > 0 ? 'playing' : 'idle';
      } else {
        recordedFramesRef.current = [];
        setRecordedFramesCount(0);
        next = 'idle';
      }
      recordingStateRef.current = next;
      return next;
    });
  }, []);

  const showTransientCallout = (text: string, durationMs = 1200) => {
    setCalloutText(text);
    if (calloutTimeoutRef.current !== null) {
      window.clearTimeout(calloutTimeoutRef.current);
    }
    calloutTimeoutRef.current = window.setTimeout(() => {
      setCalloutText(null);
    }, durationMs);
  };

  useEffect(() => {
    const fresh = createMatchState(
      mode,
      p1Id,
      p2Id,
      stageIndex,
      ladder,
      carryScore,
      carryBestCombo,
      carryRivals,
      difficulty,
      trainingConfigRef.current
    );
    matchRef.current = fresh;
    shakeTraumaRef.current = 0;
    stagePulseRef.current = 0;
    needsStaticDrawRef.current = true;
    heldKeysRef.current.clear();
    justPressedRef.current.clear();
    recordedFramesRef.current = [];
    playbackCursorRef.current = 0;
    recordingStateRef.current = 'idle';
    setRecordingState('idle');
    setRecordedFramesCount(0);
    setFrameData(null);
    setInputHistory([]);
    setActiveHookLabel(null);
    setCalloutText(null);
    setSuperCutIn(null);
    setHudMeta({
      p1: fresh.p1.profile,
      p2: fresh.p2.profile,
      roundNumber: fresh.roundNumber,
      p1Rounds: fresh.p1Rounds,
      p2Rounds: fresh.p2Rounds,
      bannerText:
        fresh.mode === 'training'
          ? null
          : fresh.p2.profile.isBoss
            ? 'JEFE FINAL · DISQUERA'
            : 'ROUND 1',
    });
  }, [
    matchKey,
    mode,
    p1Id,
    p2Id,
    stageIndex,
    ladder,
    carryScore,
    carryBestCombo,
    carryRivals,
    difficulty,
  ]);

  useEffect(() => {
    needsStaticDrawRef.current = true;
    if (screenState === 'playing' && !isMuted) {
      audioEngine.startBeatLoop(matchRef.current.p2.profile.isBoss);
    }
  }, [screenState, isMuted]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const code = e.code;

      if (
        code === DEFAULT_SYSTEM_BINDINGS.pause &&
        screenStateRef.current === 'playing'
      ) {
        e.preventDefault();
        const m = matchRef.current;
        callbacksRef.current.onPause({
          outcome: 'paused',
          mode: m.mode,
          p1: m.p1.profile,
          p2: m.p2.profile,
          score: m.score,
          bestCombo: m.bestCombo,
          stageIndex: m.arcadeStageIndex,
          totalStages: m.arcadeLadder.length,
          p1Rounds: m.p1Rounds,
          p2Rounds: m.p2Rounds,
          hasNextArcadeStage: false,
          finisherLanded: m.finisherLanded,
        });
        return;
      }

      if (
        code === DEFAULT_SYSTEM_BINDINGS.mute &&
        screenStateRef.current === 'playing'
      ) {
        e.preventDefault();
        callbacksRef.current.onToggleMute();
        return;
      }

      if (
        code === DEFAULT_SYSTEM_BINDINGS.restart &&
        screenStateRef.current === 'playing'
      ) {
        e.preventDefault();
        callbacksRef.current.onRestart();
        return;
      }

      if (
        matchRef.current.mode === 'training' &&
        screenStateRef.current === 'playing'
      ) {
        if (code === 'Backspace') {
          e.preventDefault();
          handleResetTraining();
          return;
        }
        if (code === 'F3') {
          e.preventDefault();
          handleUpdateTrainingConfig({
            showHitboxes: !trainingConfigRef.current.showHitboxes,
          });
          return;
        }
      }

      if (NAVIGATION_PREVENT_DEFAULT_CODES.has(code) || code === 'F2' || code === 'F3') {
        e.preventDefault();
      }

      heldKeysRef.current.add(code);
      justPressedRef.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    const clearInputs = () => {
      heldKeysRef.current.clear();
      justPressedRef.current.clear();
      touchHeldRef.current.clear();
      touchJustRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, [handleResetTraining, handleUpdateTrainingConfig]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let totalTime = 0;
    let prevPhase = matchRef.current.phase;
    let prevRound = matchRef.current.roundNumber;
    let prevP1Rounds = matchRef.current.p1Rounds;
    let prevP2Rounds = matchRef.current.p2Rounds;
    let matchEndDispatched = false;

    let fpsFrames = 0;
    let fpsAccumSec = 0;
    let currentFps = 60;
    let lastDiagReportAt = performance.now();
    let lastInputSig = '';
    let lastFrameDataSig = '';
    let prevP1X = matchRef.current.p1.x;
    let prevP1Y = matchRef.current.p1.y;
    let prevP2X = matchRef.current.p2.x;
    let prevP2Y = matchRef.current.p2.y;

    const buildInputs = (): {
      p1: InputSnapshot;
      p2: InputSnapshot | null;
      padPausePressed: boolean;
    } => {
      const held = heldKeysRef.current;
      const just = justPressedRef.current;
      const tHeld = touchHeldRef.current;
      const tJust = touchJustRef.current;
      const is2P = matchRef.current.mode === 'vs_2p';

      const pad1 = pollBrowserGamepad(0, p1PadBtnsRef.current);
      p1PadBtnsRef.current = pad1.nextButtons;

      if (is2P) {
        const pad2 = pollBrowserGamepad(1, p2PadBtnsRef.current);
        p2PadBtnsRef.current = pad2.nextButtons;

        const p1Kb = buildKeyboardInputSnapshot(
          held,
          just,
          DEFAULT_P1_BINDINGS
        );
        const p2Kb = buildKeyboardInputSnapshot(
          held,
          just,
          DEFAULT_P2_BINDINGS
        );

        return {
          p1: mergeInputs(p1Kb, pad1.input),
          p2: mergeInputs(p2Kb, pad2.input),
          padPausePressed: pad1.nav.pausePressed || pad2.nav.pausePressed,
        };
      }

      const p1Kb = buildKeyboardInputSnapshot(
        held,
        just,
        DEFAULT_P1_BINDINGS,
        DEFAULT_P1_SOLO_SECONDARY_BINDINGS,
        {
          up: ['Space'],
          lightPunch: ['KeyZ'],
          lightKick: ['KeyX'],
          heavyKick: ['KeyV'],
          ultra: ['KeyI'],
        },
        tHeld,
        tJust
      );
      return {
        p1: mergeInputs(p1Kb, pad1.input),
        p2: null,
        padPausePressed: pad1.nav.pausePressed,
      };
    };

    const dispatchMatchEvents = (events: readonly MatchEvent[]) => {
      for (const ev of events) {
        if (ev.shake) {
          shakeTraumaRef.current = Math.min(1, shakeTraumaRef.current + ev.shake / 20);
        }
        if (ev.type === 'hit_light') {
          audioEngine.playHit(false);
          if (ev.slot) triggerPlayerRumble(ev.slot, 70, 0.18, 0.32);
          if (ev.targetSlot) triggerPlayerRumble(ev.targetSlot, 80, 0.24, 0.36);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, ev.color ?? '#facc15', 9, 'spark', 260);
          particlesRef.current.spawnBurst(ev.x ?? 640, (ev.y ?? 450) - 24, '#e0f2fe', 4, 'sweat', 200);
        } else if (ev.type === 'hit_heavy') {
          audioEngine.playHit(true);
          if (ev.slot) triggerPlayerRumble(ev.slot, 145, 0.5, 0.6);
          if (ev.targetSlot) triggerPlayerRumble(ev.targetSlot, 165, 0.6, 0.72);
          stagePulseRef.current = Math.max(stagePulseRef.current, 0.75);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, ev.color ?? '#f97316', 18, 'spark', 380);
          particlesRef.current.spawnBurst(ev.x ?? 640, (ev.y ?? 450) - 28, '#fecaca', 6, 'sweat', 260);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, '#ffffff', 1, 'ring', 0);
        } else if (ev.type === 'block') {
          audioEngine.playBlock();
          if (ev.slot) triggerPlayerRumble(ev.slot, 65, 0.12, 0.25);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, '#38bdf8', 9, 'spark', 210);
        } else if (ev.type === 'swing') {
          audioEngine.playSwing();
        } else if (ev.type === 'jump') {
          particlesRef.current.spawnBurst(ev.x ?? 640, GROUND_Y, '#cbd5e1', 7, 'dust', 150);
        } else if (ev.type === 'land') {
          particlesRef.current.spawnBurst(ev.x ?? 640, GROUND_Y, '#cbd5e1', 9, 'dust', 180);
        } else if (ev.type === 'command_move' && ev.moveName && ev.notation) {
          showTransientCallout(`${ev.notation} · ${ev.moveName.toUpperCase()}`, 1250);
        } else if (ev.type === 'first_strike') {
          showTransientCallout('¡PRIMER GOLPE! +100', 1100);
        } else if (ev.type === 'counter_hit') {
          audioEngine.playCounterHit();
          if (ev.slot) triggerPlayerRumble(ev.slot, 170, 0.65, 0.75);
          if (ev.targetSlot) triggerPlayerRumble(ev.targetSlot, 180, 0.7, 0.8);
          showTransientCallout('¡CONTRAATAQUE! +150', 1200);
        } else if (ev.type === 'dizzy') {
          showTransientCallout('¡ATURDIDO!', 1350);
        } else if (ev.type === 'finish_him') {
          if (ev.slot) triggerPlayerRumble(ev.slot, 240, 0.7, 0.4);
        } else if (ev.type === 'finisher') {
          stagePulseRef.current = 1;
          if (ev.slot) triggerPlayerRumble(ev.slot, 360, 0.95, 0.95);
          if (ev.targetSlot) triggerPlayerRumble(ev.targetSlot, 360, 0.95, 0.95);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, '#facc15', 32, 'flame', 460);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, '#ef4444', 3, 'ring', 0);
        } else if (ev.type === 'perfect') {
          showTransientCallout('¡PERFECT! +500', 1500);
        } else if (ev.type === 'fight_start') {
          setHudMeta((prev) => ({ ...prev, bannerText: '¡PELEA!' }));
          if (bannerTimeoutRef.current !== null) window.clearTimeout(bannerTimeoutRef.current);
          bannerTimeoutRef.current = window.setTimeout(() => {
            setHudMeta((prev) => (prev.bannerText === '¡PELEA!' ? { ...prev, bannerText: null } : prev));
          }, 600);
        } else if (ev.type === 'special' || ev.type === 'super') {
          const isSuper = ev.type === 'super';
          stagePulseRef.current = isSuper ? 1 : 0.7;
          particlesRef.current.spawnBurst(
            ev.x ?? 640,
            ev.y ?? 450,
            ev.color ?? '#facc15',
            isSuper ? 26 : 16,
            isSuper ? 'note' : 'flame',
            340
          );
          particlesRef.current.spawnBurst(
            ev.x ?? 640,
            ev.y ?? 450,
            ev.color ?? '#facc15',
            isSuper ? 2 : 1,
            'ring',
            0
          );
          if (isSuper && ev.fighterId && ev.slot) {
            audioEngine.playUltraAttack();
            const fighter = FIGHTERS[ev.fighterId];
            triggerPlayerRumble(ev.slot, 260, 0.75, 0.85);
            setSuperCutIn({
              fighter,
              moveName: fighter.superName,
              slot: ev.slot,
            });
            if (cutInTimeoutRef.current !== null) window.clearTimeout(cutInTimeoutRef.current);
            cutInTimeoutRef.current = window.setTimeout(() => {
              setSuperCutIn(null);
            }, 560);
          }
        } else if (ev.type === 'combo_phrase' && ev.fighterId && ev.phrase) {
          particlesRef.current.spawnBurst(
            ev.x ?? 640,
            ev.y ?? 360,
            ev.color ?? '#facc15',
            6,
            'note',
            190
          );
          const motifTitle = FIGHTERS[ev.fighterId].songMotif.title;
          setActiveHookLabel(`${FIGHTERS[ev.fighterId].name} · ${motifTitle}`);
          if (hookTimeoutRef.current !== null) {
            window.clearTimeout(hookTimeoutRef.current);
          }
          hookTimeoutRef.current = window.setTimeout(() => {
            setActiveHookLabel(null);
          }, 1700);
        } else if (ev.type === 'ko') {
          audioEngine.playKO();
          if (ev.slot) triggerPlayerRumble(ev.slot, 320, 0.9, 0.9);
          if (ev.targetSlot) triggerPlayerRumble(ev.targetSlot, 320, 0.9, 0.9);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, '#ef4444', 28, 'spark', 480);
          particlesRef.current.spawnBurst(ev.x ?? 640, ev.y ?? 450, '#facc15', 2, 'ring', 0);
        } else if (ev.type === 'round_start') {
          matchEndDispatched = false;
        }
      }
    };

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const frameDt = Math.min(Math.max(rawDt, 0), GAME_CONFIG.maxFrameDelta);
      const match = matchRef.current;

      fpsFrames += 1;
      fpsAccumSec += Math.max(0, rawDt);
      if (fpsAccumSec >= 0.5) {
        currentFps = Math.round(fpsFrames / fpsAccumSec);
        fpsFrames = 0;
        fpsAccumSec = 0;
      }

      let simTimeMs = 0;
      let stepsThisFrame = 0;

      if (screenStateRef.current === 'playing') {
        const { p1, p2, padPausePressed } = buildInputs();
        justPressedRef.current.clear();
        touchJustRef.current.clear();

        if (padPausePressed) {
          accumulator = 0;
          callbacksRef.current.onPause({
            outcome: 'paused',
            mode: match.mode,
            p1: match.p1.profile,
            p2: match.p2.profile,
            score: match.score,
            bestCombo: match.bestCombo,
            stageIndex: match.arcadeStageIndex,
            totalStages: match.arcadeLadder.length,
            p1Rounds: match.p1Rounds,
            p2Rounds: match.p2Rounds,
            hasNextArcadeStage: false,
            finisherLanded: match.finisherLanded,
          });
          return;
        }

        accumulator += frameDt;
        const simStart = performance.now();

        while (
          accumulator >= GAME_CONFIG.fixedDt &&
          stepsThisFrame < GAME_CONFIG.maxStepsPerFrame
        ) {
          const baseP1 = stepsThisFrame === 0 ? p1 : stripEdgePresses(p1);
          const baseP2 = p2
            ? stepsThisFrame === 0
              ? p2
              : stripEdgePresses(p2)
            : null;

          let stepP1 = baseP1;
          let stepP2 = baseP2;

          // Training Mode Recording & Playback
          if (match.mode === 'training') {
            if (recordingStateRef.current === 'recording') {
              if (recordedFramesRef.current.length < MAX_RECORDING_FRAMES) {
                recordedFramesRef.current.push({ ...baseP1 });
                if (stepsThisFrame === 0) {
                  setRecordedFramesCount(recordedFramesRef.current.length);
                }
              } else {
                playbackCursorRef.current = 0;
                recordingStateRef.current = 'playing';
                setRecordingState('playing');
              }
              stepP2 = baseP1;
              stepP1 = EMPTY_INPUT;
            } else if (
              recordingStateRef.current === 'playing' &&
              recordedFramesRef.current.length > 0
            ) {
              stepP2 = recordedFramesRef.current[playbackCursorRef.current];
              playbackCursorRef.current =
                (playbackCursorRef.current + 1) % recordedFramesRef.current.length;
            }
          }

          prevP1X = match.p1.x;
          prevP1Y = match.p1.y;
          prevP2X = match.p2.x;
          prevP2Y = match.p2.y;

          totalTime += GAME_CONFIG.fixedDt;
          stepMatch(match, stepP1, stepP2, GAME_CONFIG.fixedDt);
          particlesRef.current.update(GAME_CONFIG.fixedDt);
          shakeTraumaRef.current = Math.max(
            0,
            shakeTraumaRef.current - GAME_CONFIG.fixedDt * 3.8
          );
          stagePulseRef.current = Math.max(
            0,
            stagePulseRef.current - GAME_CONFIG.fixedDt * 1.9
          );

          dispatchMatchEvents(match.events);

          if (match.mode === 'training') {
            const dir = computeFacingNumpad(stepP1, match.p1.facing);
            const btns = collectPressedButtons(stepP1);
            const sig = `${dir}|${btns.join(',')}`;
            if (sig !== lastInputSig && (dir !== 5 || btns.length > 0)) {
              lastInputSig = sig;
              const entry: InputHistoryEntry = {
                frame: match.tickCount,
                dir,
                buttons: btns,
              };
              setInputHistory((prev) => [entry, ...prev].slice(0, 10));
            } else if (dir === 5 && btns.length === 0) {
              lastInputSig = sig;
            }

            if (match.lastFrameData) {
              const fd = match.lastFrameData;
              const fdSig = `${fd.moveId}|${fd.lastDamage}|${fd.comboTotalDamage}|${fd.lastResolution}`;
              if (fdSig !== lastFrameDataSig) {
                lastFrameDataSig = fdSig;
                setFrameData({ ...fd });
              }
            }
          }

          accumulator -= GAME_CONFIG.fixedDt;
          stepsThisFrame += 1;
        }

        if (
          stepsThisFrame === GAME_CONFIG.maxStepsPerFrame &&
          accumulator >= GAME_CONFIG.fixedDt
        ) {
          accumulator = 0;
        }

        simTimeMs = performance.now() - simStart;

        if (
          match.phase !== prevPhase ||
          match.roundNumber !== prevRound ||
          match.p1Rounds !== prevP1Rounds ||
          match.p2Rounds !== prevP2Rounds
        ) {
          prevPhase = match.phase;
          prevRound = match.roundNumber;
          prevP1Rounds = match.p1Rounds;
          prevP2Rounds = match.p2Rounds;

          let banner: string | null = null;
          if (match.phase === 'intro') {
            banner =
              match.roundNumber === 1 && match.p2.profile.isBoss
                ? 'JEFE FINAL · DISQUERA'
                : `ROUND ${match.roundNumber}`;
          } else if (match.phase === 'finish_him') {
            banner = '¡REMÁTALO!';
          } else if (match.phase === 'ko') {
            banner = match.finisherLanded ? '¡REMATE URBANO!' : '¡K.O.!';
          }

          setHudMeta({
            p1: match.p1.profile,
            p2: match.p2.profile,
            roundNumber: match.roundNumber,
            p1Rounds: match.p1Rounds,
            p2Rounds: match.p2Rounds,
            bannerText: banner,
          });

          if (match.phase === 'match_end' && !matchEndDispatched) {
            matchEndDispatched = true;
            const p1Won = match.matchWinnerSlot === 1;
            const hasNext =
              match.mode === 'arcade' &&
              p1Won &&
              match.arcadeStageIndex < match.arcadeLadder.length - 1;
            callbacksRef.current.onMatchEnd({
              outcome: p1Won ? 'victory' : 'defeat',
              mode: match.mode,
              p1: match.p1.profile,
              p2: match.p2.profile,
              score: match.score,
              bestCombo: match.bestCombo,
              stageIndex: match.arcadeStageIndex,
              totalStages: match.arcadeLadder.length,
              p1Rounds: match.p1Rounds,
              p2Rounds: match.p2Rounds,
              hasNextArcadeStage: hasNext,
              finisherLanded: match.finisherLanded,
            });
          }
        }

        // Fast DOM-ref updates for HP + 3-bar Ultra meters + Killer Instinct combos
        if (hudRefs.p1HpBar.current) {
          hudRefs.p1HpBar.current.style.transform = `scaleX(${Math.max(0, match.p1.hp / match.p1.maxHp)})`;
        }
        if (hudRefs.p1GhostBar.current) {
          hudRefs.p1GhostBar.current.style.transform = `scaleX(${Math.max(0, match.p1.ghostHp / match.p1.maxHp)})`;
        }
        if (hudRefs.p2HpBar.current) {
          hudRefs.p2HpBar.current.style.transform = `scaleX(${Math.max(0, match.p2.hp / match.p2.maxHp)})`;
        }
        if (hudRefs.p2GhostBar.current) {
          hudRefs.p2GhostBar.current.style.transform = `scaleX(${Math.max(0, match.p2.ghostHp / match.p2.maxHp)})`;
        }

        if (hudRefs.p1Bar1.current) hudRefs.p1Bar1.current.style.transform = `scaleX(${clamp01(match.p1.superMeter / 100)})`;
        if (hudRefs.p1Bar2.current) hudRefs.p1Bar2.current.style.transform = `scaleX(${clamp01((match.p1.superMeter - 100) / 100)})`;
        if (hudRefs.p1Bar3.current) hudRefs.p1Bar3.current.style.transform = `scaleX(${clamp01((match.p1.superMeter - 200) / 100)})`;

        if (hudRefs.p2Bar1.current) hudRefs.p2Bar1.current.style.transform = `scaleX(${clamp01(match.p2.superMeter / 100)})`;
        if (hudRefs.p2Bar2.current) hudRefs.p2Bar2.current.style.transform = `scaleX(${clamp01((match.p2.superMeter - 100) / 100)})`;
        if (hudRefs.p2Bar3.current) hudRefs.p2Bar3.current.style.transform = `scaleX(${clamp01((match.p2.superMeter - 200) / 100)})`;

        if (hudRefs.p1SuperReady.current) {
          hudRefs.p1SuperReady.current.style.opacity = match.p1.superMeter >= 300 ? '1' : '0';
        }
        if (hudRefs.p2SuperReady.current) {
          hudRefs.p2SuperReady.current.style.opacity = match.p2.superMeter >= 300 ? '1' : '0';
        }
        if (hudRefs.timerText.current) {
          hudRefs.timerText.current.textContent =
            match.mode === 'training'
              ? '∞'
              : String(Math.ceil(match.timer)).padStart(2, '0');
        }
        if (hudRefs.scoreText.current) {
          hudRefs.scoreText.current.textContent = String(Math.round(match.score));
        }

        if (hudRefs.p1ComboBox.current && hudRefs.p1ComboNum.current && hudRefs.p1ComboTitle.current) {
          if (match.p1.comboCount >= 2) {
            hudRefs.p1ComboBox.current.style.opacity = '1';
            hudRefs.p1ComboNum.current.textContent = `${match.p1.comboCount} HITS!`;
            hudRefs.p1ComboTitle.current.textContent =
              getKillerInstinctLabel(match.p1.comboCount) ?? 'COMBO!';
          } else {
            hudRefs.p1ComboBox.current.style.opacity = '0';
          }
        }
        if (hudRefs.p2ComboBox.current && hudRefs.p2ComboNum.current && hudRefs.p2ComboTitle.current) {
          if (match.p2.comboCount >= 2) {
            hudRefs.p2ComboBox.current.style.opacity = '1';
            hudRefs.p2ComboNum.current.textContent = `${match.p2.comboCount} HITS!`;
            hudRefs.p2ComboTitle.current.textContent =
              getKillerInstinctLabel(match.p2.comboCount) ?? 'COMBO!';
          } else {
            hudRefs.p2ComboBox.current.style.opacity = '0';
          }
        }
      } else {
        accumulator = 0;
        prevP1X = match.p1.x;
        prevP1Y = match.p1.y;
        prevP2X = match.p2.x;
        prevP2Y = match.p2.y;
      }

      const p1Ready = spriteSheets.ensureLoaded(match.p1.profile.id) !== null;
      const p2Ready = spriteSheets.ensureLoaded(match.p2.profile.id) !== null;
      if (p1Ready !== prevSheetsReadyRef.current.p1 || p2Ready !== prevSheetsReadyRef.current.p2) {
        prevSheetsReadyRef.current = { p1: p1Ready, p2: p2Ready };
        needsStaticDrawRef.current = true;
      }

      const isPlaying = screenStateRef.current === 'playing';
      if (!isPlaying && !needsStaticDrawRef.current) {
        return;
      }
      needsStaticDrawRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr =
        typeof window !== 'undefined'
          ? Math.max(1, Math.min(2, window.devicePixelRatio || 1))
          : 1;
      const targetW = Math.round(ARENA_WIDTH * dpr);
      const targetH = Math.round(ARENA_HEIGHT * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderStart = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      const shake = shakeTraumaRef.current * shakeTraumaRef.current * 12;
      if (stageContainerRef.current) {
        if (shake > 0.45) {
          const sx = Math.round((Math.random() - 0.5) * 2 * shake);
          const sy = Math.round((Math.random() - 0.5) * 2 * shake);
          stageContainerRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
        } else {
          stageContainerRef.current.style.transform = 'translate3d(0, 0, 0)';
        }
      }

      const curStage = stageInfoRef.current;
      const isBossStage = Boolean(curStage.isBossStage || match.p2.profile.isBoss);
      ctx.fillStyle = curStage.floorScrim;
      ctx.fillRect(0, GROUND_Y - 12, ARENA_WIDTH, ARENA_HEIGHT - GROUND_Y + 12);
      ctx.fillStyle = curStage.floorLine;
      ctx.fillRect(0, GROUND_Y + 4, ARENA_WIDTH, 3);

      const renderAlpha = isPlaying
        ? Math.max(0, Math.min(1, accumulator / GAME_CONFIG.fixedDt))
        : 1;
      const interp = (prev: number, curr: number) =>
        Math.abs(curr - prev) > 120 ? curr : prev + (curr - prev) * renderAlpha;
      const p1RenderX = interp(prevP1X, match.p1.x);
      const p1RenderY = interp(prevP1Y, match.p1.y);
      const p2RenderX = interp(prevP2X, match.p2.x);
      const p2RenderY = interp(prevP2Y, match.p2.y);

      const winX = match.winnerSlot === 2 ? p2RenderX : p1RenderX;
      const loseX = match.winnerSlot === 2 ? p1RenderX : p2RenderX;
      drawStageReactiveEffects(
        ctx,
        stagePulseRef.current,
        curStage.accentColor,
        isBossStage,
        match.phase === 'finish_him',
        winX,
        loseX,
        GROUND_Y
      );

      drawFighter(ctx, match.p1, totalTime, GROUND_Y, p1RenderX, p1RenderY);
      drawFighter(ctx, match.p2, totalTime, GROUND_Y, p2RenderX, p2RenderY);

      for (const proj of match.projectiles) {
        drawProjectile(ctx, proj, totalTime);
      }

      particlesRef.current.draw(ctx);

      drawFighterBubble(ctx, match.p1, p1RenderX, p1RenderY);
      drawFighterBubble(ctx, match.p2, p2RenderX, p2RenderY);

      const shouldDrawDebug =
        (match.mode === 'training' && match.trainingConfig.showHitboxes) ||
        showDebugCollisionsRef.current;
      if (shouldDrawDebug) {
        drawDebugCollisionOverlay(ctx, match);
      }

      const renderTimeMs = performance.now() - renderStart;

      if (showPerfDiagRef.current && now - lastDiagReportAt >= 250) {
        lastDiagReportAt = now;
        const activeParticles = particlesRef.current.getActiveCount();
        const memInfo = (
          performance as Performance & {
            memory?: { usedJSHeapSize?: number };
          }
        ).memory;
        const jsHeapMB =
          memInfo && typeof memInfo.usedJSHeapSize === 'number'
            ? Math.round(memInfo.usedJSHeapSize / (1024 * 1024))
            : null;
        setPerfDiag({
          fps: currentFps,
          frameTimeMs: rawDt * 1000,
          simTimeMs,
          renderTimeMs,
          updatesPerFrame: stepsThisFrame,
          drawCallsApprox:
            4 + 2 + match.projectiles.length * 4 + activeParticles + (shouldDrawDebug ? 6 : 0),
          activeParticles,
          activeProjectiles: match.projectiles.length,
          loadedSheets: spriteSheets.getLoadedCount(),
          totalSheets: spriteSheets.getTotalCount(),
          jsHeapMB,
        });
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleTouchAction = (action: string, down: boolean) => {
    if (down) {
      touchHeldRef.current.add(action);
      touchJustRef.current.add(action);
    } else {
      touchHeldRef.current.delete(action);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#090a14] flex items-center justify-center overflow-hidden">
      <div
        ref={stageContainerRef}
        className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw] aspect-video overflow-hidden bg-[#0b1126]"
      >
        <img
          src={stageInfo.imageSrc}
          alt={stageInfo.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        <canvas
          ref={canvasRef}
          data-testid="fight-canvas"
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          className="relative z-10 w-full h-full block"
        />
      </div>

      <GameHud
        p1={hudMeta.p1}
        p2={hudMeta.p2}
        mode={mode}
        stageName={stageInfo.name}
        roundNumber={hudMeta.roundNumber}
        p1Rounds={hudMeta.p1Rounds}
        p2Rounds={hudMeta.p2Rounds}
        stageIndex={stageIndex}
        totalStages={ladder.length}
        bannerText={hudMeta.bannerText}
        calloutText={calloutText}
        activeHookLabel={activeHookLabel}
        superCutIn={superCutIn}
        beatLabel={beatLabel}
        gamepadConnected={gamepadConnected}
        isMuted={isMuted}
        onCycleBeat={onCycleBeat}
        onToggleMute={onToggleMute}
        onPause={() => {
          const m = matchRef.current;
          callbacksRef.current.onPause({
            outcome: 'paused',
            mode: m.mode,
            p1: m.p1.profile,
            p2: m.p2.profile,
            score: m.score,
            bestCombo: m.bestCombo,
            stageIndex: m.arcadeStageIndex,
            totalStages: m.arcadeLadder.length,
            p1Rounds: m.p1Rounds,
            p2Rounds: m.p2Rounds,
            hasNextArcadeStage: false,
            finisherLanded: m.finisherLanded,
          });
        }}
        onRestart={onRestart}
        refs={hudRefs}
        onTouchAction={handleTouchAction}
        trainingConfig={trainingConfig}
        onUpdateTrainingConfig={handleUpdateTrainingConfig}
        onResetTraining={handleResetTraining}
        recordingState={recordingState}
        recordedFramesCount={recordedFramesCount}
        onCycleRecording={handleCycleRecording}
        frameData={frameData}
        inputHistory={inputHistory}
        showPerfDiag={showPerfDiag}
        perfDiag={perfDiag}
      />
    </div>
  );
};
