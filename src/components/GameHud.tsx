import React from 'react';
import { FighterProfile } from '../game/fighters';
import { InputHistoryEntry } from '../game/input';
import {
  FrameDataReadout,
  GameMode,
  TrainingConfig,
  TrainingDummyMode,
} from '../game/rules';
import { FighterPortrait } from './FighterPortrait';

export interface HudDomRefs {
  p1HpBar: React.RefObject<HTMLDivElement | null>;
  p1GhostBar: React.RefObject<HTMLDivElement | null>;
  p2HpBar: React.RefObject<HTMLDivElement | null>;
  p2GhostBar: React.RefObject<HTMLDivElement | null>;
  p1Bar1: React.RefObject<HTMLDivElement | null>;
  p1Bar2: React.RefObject<HTMLDivElement | null>;
  p1Bar3: React.RefObject<HTMLDivElement | null>;
  p2Bar1: React.RefObject<HTMLDivElement | null>;
  p2Bar2: React.RefObject<HTMLDivElement | null>;
  p2Bar3: React.RefObject<HTMLDivElement | null>;
  p1SuperReady: React.RefObject<HTMLSpanElement | null>;
  p2SuperReady: React.RefObject<HTMLSpanElement | null>;
  timerText: React.RefObject<HTMLDivElement | null>;
  p1ComboBox: React.RefObject<HTMLDivElement | null>;
  p1ComboNum: React.RefObject<HTMLSpanElement | null>;
  p1ComboTitle: React.RefObject<HTMLSpanElement | null>;
  p2ComboBox: React.RefObject<HTMLDivElement | null>;
  p2ComboNum: React.RefObject<HTMLSpanElement | null>;
  p2ComboTitle: React.RefObject<HTMLSpanElement | null>;
  scoreText: React.RefObject<HTMLSpanElement | null>;
}

export interface SuperCutInState {
  fighter: FighterProfile;
  moveName: string;
  slot: 1 | 2;
}

export interface PerfDiagSnapshot {
  fps: number;
  frameTimeMs: number;
  simTimeMs: number;
  renderTimeMs: number;
  updatesPerFrame: number;
  drawCallsApprox: number;
  activeParticles: number;
  activeProjectiles: number;
  loadedSheets: number;
  totalSheets: number;
  jsHeapMB: number | null;
}

export type TrainingRecordingState = 'idle' | 'recording' | 'playing';

interface GameHudProps {
  p1: FighterProfile;
  p2: FighterProfile;
  mode: GameMode;
  stageName: string;
  roundNumber: number;
  p1Rounds: number;
  p2Rounds: number;
  stageIndex: number;
  totalStages: number;
  bannerText: string | null;
  calloutText: string | null;
  activeHookLabel: string | null;
  superCutIn: SuperCutInState | null;
  beatLabel: string;
  gamepadConnected: boolean;
  isMuted: boolean;
  onCycleBeat: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  refs: HudDomRefs;
  onTouchAction?: (action: string, down: boolean) => void;
  // Training mode props
  trainingConfig?: TrainingConfig;
  onUpdateTrainingConfig?: (patch: Partial<TrainingConfig>) => void;
  onResetTraining?: () => void;
  recordingState?: TrainingRecordingState;
  recordedFramesCount?: number;
  onCycleRecording?: () => void;
  frameData?: FrameDataReadout | null;
  inputHistory?: InputHistoryEntry[];
  // Optional diagnostics HUD
  showPerfDiag?: boolean;
  perfDiag?: PerfDiagSnapshot | null;
}

const NUMPAD_ARROWS: Record<number, string> = {
  1: '↙',
  2: '↓',
  3: '↘',
  4: '←',
  5: '•',
  6: '→',
  7: '↖',
  8: '↑',
  9: '↗',
};

export const GameHud: React.FC<GameHudProps> = ({
  p1,
  p2,
  mode,
  stageName,
  roundNumber,
  p1Rounds,
  p2Rounds,
  stageIndex,
  totalStages,
  bannerText,
  calloutText,
  activeHookLabel,
  superCutIn,
  beatLabel,
  gamepadConnected,
  isMuted,
  onCycleBeat,
  onToggleMute,
  onPause,
  onRestart,
  refs,
  onTouchAction,
  trainingConfig,
  onUpdateTrainingConfig,
  onResetTraining,
  recordingState = 'idle',
  recordedFramesCount = 0,
  onCycleRecording,
  frameData,
  inputHistory = [],
  showPerfDiag = false,
  perfDiag = null,
}) => {
  const p1Bars = [refs.p1Bar1, refs.p1Bar2, refs.p1Bar3];
  const p2Bars = [refs.p2Bar1, refs.p2Bar2, refs.p2Bar3];
  const isTraining = mode === 'training';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-4">
      {/* TOP FIGHTING HUD */}
      <div className="w-full max-w-[1280px] mx-auto flex flex-col gap-1.5">
        {/* Top Row: P1 Bar - Timer - P2 Bar - Utility Icons */}
        <div className="flex items-start gap-2 md:gap-3">
          {/* P1 Status Cluster */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <FighterPortrait fighter={p1} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-arcade text-xs md:text-sm text-white arcade-text-shadow truncate">
                  {p1.name}
                </span>
                {!isTraining && (
                  <div className="flex items-center gap-1" aria-label={`Rounds ganados P1: ${p1Rounds}`}>
                    {[0, 1].map((idx) => (
                      <span
                        key={idx}
                        className={`inline-block w-3 h-3 border border-slate-950 ${
                          idx < p1Rounds ? 'bg-amber-400' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Health Bar + Trailing Ghost Bar */}
              <div className="relative h-5 bg-[#090a14] border-2 border-slate-700 overflow-hidden">
                <div
                  ref={refs.p1GhostBar}
                  className="absolute inset-0 bg-amber-300/80 origin-right will-change-transform"
                  style={{ transform: 'scaleX(1)' }}
                />
                <div
                  ref={refs.p1HpBar}
                  className="absolute inset-0 bg-emerald-500 origin-right will-change-transform"
                  style={{ transform: 'scaleX(1)' }}
                />
              </div>
            </div>
          </div>

          {/* Center Round Timer */}
          <div className="shrink-0 flex flex-col items-center px-2">
            <div
              ref={refs.timerText}
              className="font-mono-num text-2xl md:text-3xl font-bold text-amber-300 bg-[#090a14] border-2 border-amber-400 px-3 py-0.5 leading-none arcade-text-shadow"
            >
              {isTraining ? '∞' : '99'}
            </div>
            <div className="text-[10px] font-arcade text-slate-200 mt-1 arcade-text-shadow whitespace-nowrap">
              {isTraining ? 'PRÁCTICA' : `R${roundNumber}`}
              {mode === 'arcade' ? ` · ${stageIndex + 1}/${totalStages}` : ''}
              {' · '}
              <span className="text-amber-300">{stageName}</span>
            </div>
          </div>

          {/* P2 / Boss Status Cluster */}
          <div className="flex-1 flex items-center gap-2 min-w-0 flex-row-reverse">
            <FighterPortrait fighter={p2} size={48} flipped />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1 flex-row-reverse">
                <span
                  className={`font-arcade text-xs md:text-sm arcade-text-shadow truncate ${
                    p2.isBoss ? 'text-red-400' : 'text-white'
                  }`}
                >
                  {p2.name}
                </span>
                {!isTraining && (
                  <div className="flex items-center gap-1" aria-label={`Rounds ganados P2: ${p2Rounds}`}>
                    {[0, 1].map((idx) => (
                      <span
                        key={idx}
                        className={`inline-block w-3 h-3 border border-slate-950 ${
                          idx < p2Rounds ? 'bg-red-500' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="relative h-5 bg-[#090a14] border-2 border-slate-700 overflow-hidden">
                <div
                  ref={refs.p2GhostBar}
                  className="absolute inset-0 bg-amber-300/80 origin-left will-change-transform"
                  style={{ transform: 'scaleX(1)' }}
                />
                <div
                  ref={refs.p2HpBar}
                  className={`absolute inset-0 origin-left will-change-transform ${
                    p2.isBoss ? 'bg-red-600' : 'bg-rose-500'
                  }`}
                  style={{ transform: 'scaleX(1)' }}
                />
              </div>
            </div>
          </div>

          {/* Top-right compact utility controls */}
          <div className="shrink-0 flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleBeat();
              }}
              aria-label={`Cambiar canción: ${beatLabel}`}
              title={`Canción: ${beatLabel}`}
              className="h-9 px-2.5 bg-[#0d1124] border-2 border-slate-700 hover:border-amber-400 text-amber-300 font-mono-num text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>♪</span>
              <span className="hidden xl:inline max-w-[165px] truncate">{beatLabel}</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={isMuted ? 'Activar audio (M)' : 'Silenciar audio (M)'}
              title="Audio [M]"
              className="w-9 h-9 bg-[#0d1124] border-2 border-slate-700 hover:border-amber-400 text-slate-100 flex items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                {isMuted ? (
                  <path d="M22 9l-6 6M16 9l6 6" stroke="#f87171" />
                ) : (
                  <path d="M16 8.5a5 5 0 010 7" stroke="#facc15" />
                )}
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pausar combate (Esc)"
              title="Pausa [Esc / Start]"
              className="w-9 h-9 bg-[#0d1124] border-2 border-slate-700 hover:border-amber-400 text-slate-100 flex items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Reiniciar combate (F2)"
              title="Reiniciar [F2]"
              className="w-9 h-9 bg-[#0d1124] border-2 border-slate-700 hover:border-amber-400 text-slate-100 flex items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Training Mode Compact Control Toolbar */}
        {isTraining && trainingConfig && onUpdateTrainingConfig && (
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 bg-[#090a14]/90 border border-cyan-500/70 px-2.5 py-1.5 text-[11px] font-mono-num">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-cyan-300 font-bold mr-1">DUMMY:</span>
              {(
                [
                  { id: 'stationary', label: 'Quieto' },
                  { id: 'blocking', label: 'Bloqueo' },
                  { id: 'attacking', label: 'Ataca' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onUpdateTrainingConfig({ dummyMode: opt.id as TrainingDummyMode });
                  }}
                  className={`px-2 py-0.5 border cursor-pointer ${
                    trainingConfig.dummyMode === opt.id
                      ? 'bg-cyan-400 text-slate-950 border-cyan-200 font-bold'
                      : 'bg-[#11152c] text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              {onCycleRecording && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onCycleRecording();
                  }}
                  className={`px-2 py-0.5 border cursor-pointer font-bold ${
                    recordingState === 'recording'
                      ? 'bg-red-600 text-white border-red-300'
                      : recordingState === 'playing'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-200'
                        : 'bg-[#11152c] text-amber-300 border-slate-700 hover:border-amber-400'
                  }`}
                >
                  {recordingState === 'recording'
                    ? `● Grabando P2 (${recordedFramesCount})`
                    : recordingState === 'playing'
                      ? `▶ Reproduciendo (${recordedFramesCount}f)`
                      : recordedFramesCount > 0
                        ? `Grabar / Replay (${recordedFramesCount}f)`
                        : '● Grabar Dummy'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onUpdateTrainingConfig({ infiniteHealth: !trainingConfig.infiniteHealth });
                }}
                className={`px-2 py-0.5 border cursor-pointer ${
                  trainingConfig.infiniteHealth
                    ? 'bg-emerald-900/80 border-emerald-400 text-emerald-200'
                    : 'bg-[#11152c] border-slate-700 text-slate-400'
                }`}
              >
                HP ∞
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onUpdateTrainingConfig({ infiniteMeter: !trainingConfig.infiniteMeter });
                }}
                className={`px-2 py-0.5 border cursor-pointer ${
                  trainingConfig.infiniteMeter
                    ? 'bg-amber-900/80 border-amber-400 text-amber-200'
                    : 'bg-[#11152c] border-slate-700 text-slate-400'
                }`}
              >
                Ultra ∞
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onUpdateTrainingConfig({ showHitboxes: !trainingConfig.showHitboxes });
                }}
                className={`px-2 py-0.5 border cursor-pointer ${
                  trainingConfig.showHitboxes
                    ? 'bg-red-950/90 border-red-400 text-red-200'
                    : 'bg-[#11152c] border-slate-700 text-slate-400'
                }`}
              >
                Hitboxes [F3]
              </button>
              {onResetTraining && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onResetTraining();
                  }}
                  className="px-2 py-0.5 border bg-[#192042] border-amber-400/70 text-amber-200 hover:bg-amber-400 hover:text-slate-950 font-bold cursor-pointer"
                >
                  Reset [Backspace]
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sub-row: Score + Killer Instinct Style Combo Counters + SF Special Callout */}
        <div className="flex items-start justify-between px-1">
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-2 text-xs font-mono-num font-bold text-slate-200 arcade-text-shadow">
              <span>
                PTS <span ref={refs.scoreText}>0</span>
              </span>
              {gamepadConnected && (
                <span className="px-1.5 py-0.5 bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[10px]">
                  XBOX
                </span>
              )}
            </div>
            {/* Killer Instinct P1 Combo Counter */}
            <div
              ref={refs.p1ComboBox}
              className="opacity-0 transition-opacity duration-150 bg-[#090a14]/92 border-2 border-amber-400 px-3 py-1.5 shadow-[0_4px_0_#000] flex flex-col"
            >
              <span
                ref={refs.p1ComboNum}
                className="font-arcade text-xl md:text-2xl text-amber-300 leading-none arcade-text-shadow"
              >
                2 HITS!
              </span>
              <span
                ref={refs.p1ComboTitle}
                className="font-arcade text-xs text-cyan-300 tracking-wider mt-0.5 arcade-text-shadow"
              >
                DOUBLE COMBO!
              </span>
            </div>

            {/* Training Input History Strip */}
            {isTraining && trainingConfig?.showInputHistory && inputHistory.length > 0 && (
              <div className="bg-[#090a14]/85 border border-slate-700 px-2 py-1.5 flex flex-col gap-0.5 font-mono-num text-[11px] min-w-[98px]">
                <div className="text-[9px] text-cyan-300 font-bold tracking-wider mb-0.5">
                  INPUTS P1
                </div>
                {inputHistory.slice(0, 8).map((entry, idx) => (
                  <div
                    key={`${entry.frame}-${idx}`}
                    className="flex items-center gap-1.5 leading-tight"
                  >
                    <span className="w-4 text-center text-amber-300 font-bold">
                      {NUMPAD_ARROWS[entry.dir] ?? '•'}
                    </span>
                    <span className="text-slate-200">
                      {entry.buttons.length > 0 ? entry.buttons.join('+') : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            {calloutText && !bannerText && (
              <div className="px-3.5 py-1.5 bg-[#090a14]/95 border-2 border-cyan-400 font-arcade text-xs md:text-sm text-cyan-300 arcade-text-shadow shadow-[0_4px_0_#000]">
                {calloutText}
              </div>
            )}

            {/* Training Frame Data Pill */}
            {isTraining && trainingConfig?.showFrameData && frameData && (
              <div className="bg-[#090a14]/90 border border-amber-400/70 px-3 py-1 text-[11px] font-mono-num text-slate-200 flex flex-wrap items-center gap-2.5">
                <span className="text-amber-300 font-bold uppercase">
                  {frameData.moveId.replace('_', ' ')}
                </span>
                <span>
                  S/A/R:{' '}
                  <strong className="text-white">
                    {frameData.startupFrames}/{frameData.activeFrames}/{frameData.recoveryFrames}f
                  </strong>
                </span>
                <span>
                  Hit:{' '}
                  <strong
                    className={
                      frameData.onHitAdvantage >= 0 ? 'text-emerald-300' : 'text-red-300'
                    }
                  >
                    {frameData.onHitAdvantage >= 0
                      ? `+${frameData.onHitAdvantage}`
                      : frameData.onHitAdvantage}
                    f
                  </strong>
                </span>
                <span>
                  Blk:{' '}
                  <strong
                    className={
                      frameData.onBlockAdvantage >= 0 ? 'text-emerald-300' : 'text-amber-300'
                    }
                  >
                    {frameData.onBlockAdvantage >= 0
                      ? `+${frameData.onBlockAdvantage}`
                      : frameData.onBlockAdvantage}
                    f
                  </strong>
                </span>
                <span>
                  Dmg: <strong className="text-cyan-300">{frameData.lastDamage}</strong>
                </span>
                {frameData.comboTotalDamage > 0 && (
                  <span>
                    Combo: <strong className="text-amber-300">{frameData.comboTotalDamage}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Killer Instinct P2 Combo Counter */}
            <div
              ref={refs.p2ComboBox}
              className="opacity-0 transition-opacity duration-150 bg-[#090a14]/92 border-2 border-red-400 px-3 py-1.5 shadow-[0_4px_0_#000] flex flex-col items-end"
            >
              <span
                ref={refs.p2ComboNum}
                className="font-arcade text-xl md:text-2xl text-red-400 leading-none arcade-text-shadow"
              >
                2 HITS!
              </span>
              <span
                ref={refs.p2ComboTitle}
                className="font-arcade text-xs text-amber-300 tracking-wider mt-0.5 arcade-text-shadow"
              >
                DOUBLE COMBO!
              </span>
            </div>

            {/* Optional Performance Diagnostics HUD */}
            {showPerfDiag && perfDiag && (
              <div className="bg-[#090a14]/90 border border-emerald-400/70 px-2.5 py-1.5 font-mono-num text-[10px] text-emerald-200 leading-snug text-right">
                <div className="font-bold text-emerald-300">
                  {perfDiag.fps} FPS · {perfDiag.frameTimeMs.toFixed(1)}ms
                </div>
                <div>
                  Sim: {perfDiag.simTimeMs.toFixed(2)}ms · Draw: {perfDiag.renderTimeMs.toFixed(2)}ms · Steps/f: {perfDiag.updatesPerFrame}
                </div>
                <div>
                  Draws≈{perfDiag.drawCallsApprox} · Part:{perfDiag.activeParticles} · Proj:{perfDiag.activeProjectiles} · Sheets:{perfDiag.loadedSheets}/{perfDiag.totalSheets}
                  {perfDiag.jsHeapMB !== null ? ` · Mem:${perfDiag.jsHeapMB}MB` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Super / Poder Ultra Cut-In Banner */}
      {superCutIn && (
        <div className="self-center my-auto w-full max-w-2xl bg-[#090a14]/95 border-y-4 border-amber-400 px-6 py-3 flex items-center justify-center gap-5 shadow-[0_8px_0_#000]">
          <FighterPortrait fighter={superCutIn.fighter} size={80} flipped={superCutIn.slot === 2} />
          <div>
            <div className="text-xs font-bold tracking-widest text-amber-300">
              {superCutIn.fighter.name} · PODER ULTRA (3 BARRAS)
            </div>
            <div className="font-arcade text-2xl md:text-4xl text-white arcade-text-shadow">
              ¡{superCutIn.moveName.toUpperCase()}!
            </div>
          </div>
        </div>
      )}

      {/* Transient Round / Fight / Remátalo / KO Callout Banner */}
      {!superCutIn && bannerText && (
        <div
          className={`self-center my-auto text-center px-6 py-3 bg-[#090a14]/92 border-2 shadow-[0_6px_0_#000] ${
            bannerText.includes('REMÁTALO') || bannerText.includes('REMATE')
              ? 'border-red-500'
              : 'border-amber-400'
          }`}
        >
          <div
            className={`font-arcade text-3xl md:text-5xl arcade-text-shadow tracking-wider ${
              bannerText.includes('REMÁTALO') || bannerText.includes('REMATE')
                ? 'text-red-400'
                : 'text-amber-300'
            }`}
          >
            {bannerText}
          </div>
        </div>
      )}

      {/* BOTTOM CORNERS: 3-BAR ULTRA METERS + ACTIVE SONG HOOK */}
      <div className="w-full max-w-[1280px] mx-auto flex flex-col gap-2">
        {/* Touch Controls on mobile viewports */}
        {onTouchAction && (
          <div className="flex md:hidden items-center justify-between gap-2 pointer-events-auto pb-1">
            <div className="flex gap-1.5">
              {[
                { k: 'left', label: '◀' },
                { k: 'down', label: '▼' },
                { k: 'up', label: '▲' },
                { k: 'right', label: '▶' },
              ].map((btn) => (
                <button
                  key={btn.k}
                  type="button"
                  onPointerDown={() => onTouchAction(btn.k, true)}
                  onPointerUp={() => onTouchAction(btn.k, false)}
                  onPointerLeave={() => onTouchAction(btn.k, false)}
                  className="w-10 h-10 bg-[#0d1124]/90 border-2 border-slate-600 text-white font-bold active:bg-amber-400 active:text-black"
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {[
                { k: 'lightPunch', label: 'X' },
                { k: 'heavyPunch', label: 'Y' },
                { k: 'lightKick', label: 'A' },
                { k: 'heavyKick', label: 'B' },
                { k: 'ultra', label: 'RB' },
              ].map((btn) => (
                <button
                  key={btn.k}
                  type="button"
                  onPointerDown={() => onTouchAction(btn.k, true)}
                  onPointerUp={() => onTouchAction(btn.k, false)}
                  onPointerLeave={() => onTouchAction(btn.k, false)}
                  className="w-10 h-10 bg-red-900/90 border-2 border-amber-400 text-amber-200 font-arcade text-[10px] active:bg-amber-400 active:text-black"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end justify-between gap-4">
          {/* P1 3-Bar Energy Meter */}
          <div className="w-56 md:w-80">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1 arcade-text-shadow">
              <span className="text-cyan-300 truncate">ULTRA · {p1.superName}</span>
              <span ref={refs.p1SuperReady} className="text-amber-300 font-arcade text-[10px] opacity-0">
                ¡LISTO [RB/RT]!
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5" aria-label="Medidor de 3 barras de energía P1">
              {p1Bars.map((barRef, idx) => (
                <div
                  key={idx}
                  className="relative h-3.5 bg-[#090a14] border-2 border-slate-700 overflow-hidden"
                >
                  <div
                    ref={barRef}
                    className="h-full bg-gradient-to-r from-cyan-400 to-amber-300 origin-left will-change-transform"
                    style={{ transform: 'scaleX(0)' }}
                  />
                  <span className="absolute right-1 top-0 bottom-0 flex items-center text-[8px] font-mono-num text-white/60">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Brief Song Hook Indicator on Combo or Xbox Quick Reference */}
          {activeHookLabel ? (
            <div className="hidden sm:block px-3 py-1 bg-[#090a14]/90 border border-amber-400 text-xs font-bold text-amber-300 whitespace-nowrap">
              ♪ {activeHookLabel}
            </div>
          ) : (
            <div className="hidden lg:block text-[11px] text-slate-300/80 font-mono-num arcade-text-shadow whitespace-nowrap">
              {gamepadConnected
                ? 'Xbox: X Puño Débil · Y Puño Fuerte · A Patada Débil · B Patada Fuerte · ↓↘→+Puño Poder · RB/RT Ultra (3 Barras)'
                : mode === 'vs_2p'
                  ? 'P1: WASD · F/R Puños · G/H Patadas · T Ultra · C Bloq | P2: Flechas · J/U/K/L · O Ultra · P Bloq | Esc Pausa · F2 Reiniciar'
                  : 'WASD: F/R Puños · G/H Patadas · T Ultra · C Bloq | Flechas: J/U/K/L · O Ultra · E Bloq | Esc Pausa · F2 Reiniciar'}
            </div>
          )}

          {/* P2 3-Bar Energy Meter */}
          <div className="w-56 md:w-80">
            <div className="flex items-center justify-between text-[11px] font-bold mb-1 arcade-text-shadow flex-row-reverse">
              <span className={`${p2.isBoss ? 'text-red-400' : 'text-fuchsia-300'} truncate`}>
                {p2.superName}
              </span>
              <span ref={refs.p2SuperReady} className="text-amber-300 font-arcade text-[10px] opacity-0">
                ¡ULTRA LISTO!
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5" aria-label="Medidor de 3 barras de energía P2">
              {p2Bars.map((barRef, idx) => (
                <div
                  key={idx}
                  className="relative h-3.5 bg-[#090a14] border-2 border-slate-700 overflow-hidden"
                >
                  <div
                    ref={barRef}
                    className={`h-full origin-right will-change-transform ${
                      p2.isBoss
                        ? 'bg-gradient-to-l from-red-500 to-amber-400'
                        : 'bg-gradient-to-l from-fuchsia-500 to-amber-300'
                    }`}
                    style={{ transform: 'scaleX(0)' }}
                  />
                  <span className="absolute left-1 top-0 bottom-0 flex items-center text-[8px] font-mono-num text-white/60">
                    {idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
