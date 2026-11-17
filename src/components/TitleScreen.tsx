import React, { useEffect, useState } from 'react';
import { AI_DIFFICULTY_MODIFIERS, AiDifficulty } from '../game/ai';
import { AudioVolumeSettings } from '../game/audio';
import {
  ALL_OPPONENT_IDS,
  FIGHTERS,
  FighterId,
  PLAYABLE_FIGHTER_IDS,
} from '../game/fighters';
import { PlayerDeviceAssignment } from '../game/gamepad';
import { GameMode } from '../game/rules';
import { SELECTABLE_STAGE_IDS, STAGES, StageId } from '../game/stages';
import { FighterPortrait } from './FighterPortrait';

interface TitleScreenProps {
  mode: GameMode;
  difficulty: AiDifficulty;
  p1Id: FighterId;
  p2Id: FighterId;
  selectedStageId: StageId;
  onSelectMode: (mode: GameMode) => void;
  onSelectDifficulty: (difficulty: AiDifficulty) => void;
  onSelectP1: (id: FighterId) => void;
  onSelectP2: (id: FighterId) => void;
  onSelectStage: (id: StageId) => void;
  onStart: () => void;
  beatLabel: string;
  gamepadConnected: boolean;
  gamepadName: string | null;
  gamepadActiveButtons: string[];
  gamepadBlocked: boolean;
  gamepadAssignments: [PlayerDeviceAssignment, PlayerDeviceAssignment];
  onTestRumble: (slot?: 1 | 2) => void;
  onCycleBeat: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volumes: AudioVolumeSettings;
  onChangeVolumes: (patch: Partial<AudioVolumeSettings>) => void;
  showDebugCollisions: boolean;
  onToggleDebugCollisions: () => void;
  showPerfDiag: boolean;
  onTogglePerfDiag: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  mode,
  difficulty,
  p1Id,
  p2Id,
  selectedStageId,
  onSelectMode,
  onSelectDifficulty,
  onSelectP1,
  onSelectP2,
  onSelectStage,
  onStart,
  beatLabel,
  gamepadConnected,
  gamepadName,
  gamepadActiveButtons,
  gamepadBlocked,
  gamepadAssignments,
  onTestRumble,
  onCycleBeat,
  isMuted,
  onToggleMute,
  volumes,
  onChangeVolumes,
  showDebugCollisions,
  onToggleDebugCollisions,
  showPerfDiag,
  onTogglePerfDiag,
}) => {
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!showGuide && !showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setShowGuide(false);
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGuide, showSettings]);

  const selectedP1 = FIGHTERS[p1Id];
  const selectedP2 = FIGHTERS[p2Id];
  const currentStage = STAGES[selectedStageId];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b1026] text-slate-100 flex flex-col justify-between">
      {/* Illustrated Key-Art Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/src/assets/images/title_bg_1794854481848.jpg"
          alt="Horizonte nocturno de Santiago y la Cordillera de los Andes"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-right"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, #090d22 0%, rgba(9,13,34,0.96) 38%, rgba(9,13,34,0.74) 56%, rgba(9,13,34,0.28) 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-28"
          style={{
            background: 'linear-gradient(to top, rgba(9,10,20,0.94), transparent)',
          }}
        />
      </div>

      {/* Top-right utility bar */}
      <div className="relative z-10 flex items-center justify-end gap-2 px-6 pt-3">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setShowGuide(true);
          }}
          aria-label={gamepadConnected ? 'Mando Xbox conectado, abrir prueba y guía' : 'Mando Xbox: conectar o probar'}
          className={`h-9 px-3 flex items-center gap-1.5 border-2 text-xs font-mono-num font-bold transition-colors cursor-pointer ${
            gamepadConnected
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 hover:bg-emerald-900'
              : 'bg-[#12162e] border-slate-700 hover:border-emerald-400 text-slate-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              gamepadConnected ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
          />
          <span>{gamepadConnected ? 'XBOX CONECTADO' : 'MANDO XBOX'}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onCycleBeat();
          }}
          aria-label={`Cambiar canción: ${beatLabel}`}
          title={`Canción: ${beatLabel}`}
          className="h-9 px-3 flex items-center gap-1.5 bg-[#12162e] border-2 border-slate-700 hover:border-amber-400 text-amber-300 text-xs font-mono-num font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>♪</span>
          <span className="max-w-[220px] truncate">{beatLabel}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setShowGuide(true);
          }}
          className="h-9 px-3 flex items-center gap-1.5 bg-[#12162e] border-2 border-slate-700 hover:border-cyan-400 text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
        >
          Guía Combos / Xbox
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            setShowSettings(true);
          }}
          aria-label="Abrir ajustes de audio y diagnóstico"
          className="h-9 px-3 flex items-center gap-1.5 bg-[#12162e] border-2 border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
        >
          Ajustes
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          className="w-9 h-9 flex items-center justify-center bg-[#12162e] border-2 border-slate-700 hover:border-amber-400 text-slate-100 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" strokeLinejoin="round" />
            {isMuted ? (
              <path d="M22 9l-6 6M16 9l6 6" stroke="#f87171" strokeLinecap="round" />
            ) : (
              <path d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" stroke="#facc15" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Main Content Split */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 md:px-10 py-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center overflow-y-auto lg:overflow-visible">
        {/* Left Column */}
        <div className="lg:col-span-5 flex flex-col items-start gap-4">
          <svg
            viewBox="0 0 480 128"
            className="w-full max-w-[440px] h-auto drop-shadow-[0_6px_0_rgba(0,0,0,0.9)]"
            role="img"
            aria-label="UrbanoFight CL"
          >
            <polygon points="8,14 470,6 462,102 4,112" fill="#090a14" stroke="#facc15" strokeWidth="3" />
            <polygon points="14,20 464,12 457,94 10,104" fill="#18122b" />
            <polygon
              points="44,40 49,52 62,52 52,60 56,72 44,64 32,72 36,60 26,52 39,52"
              fill="#facc15"
            />
            <text
              x="74"
              y="64"
              fill="#f8fafc"
              fontFamily="Silkscreen, monospace"
              fontWeight="700"
              fontSize="36"
              letterSpacing="-1"
            >
              URBANOFIGHT
            </text>
            <rect x="74" y="74" width="356" height="4" fill="#ef4444" />
            <text
              x="76"
              y="93"
              fill="#facc15"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="12.5"
              letterSpacing="1.8"
            >
              GÉNERO URBANO · CHILE VS LA DISQUERA
            </text>
          </svg>

          <p className="text-sm text-slate-300 max-w-md leading-snug">
            Combate arcade 1v1 con poderes estilo Street Fighter, combos Killer Instinct y Poder Ultra de 3 barras hasta derrotar al diablo <strong className="text-red-400">Disquera Internacional</strong>.
          </p>

          {/* Mode Selector Tabs */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Modo de juego">
            {(
              [
                { id: 'arcade', label: 'Modo Historia' },
                { id: 'vs_cpu', label: '1P vs CPU' },
                { id: 'vs_2p', label: '2 Jugadores' },
                { id: 'training', label: 'Entrenamiento' },
              ] as const
            ).map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMode(item.id)}
                  className={`px-3 py-2 text-xs md:text-sm font-bold border-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-[#11152c] text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Difficulty Selector (Arcade & 1P vs CPU) */}
          {(mode === 'arcade' || mode === 'vs_cpu') && (
            <div className="w-full max-w-md flex items-center justify-between gap-2 bg-[#0e1227]/90 border border-slate-800 px-3 py-1.5">
              <span className="text-[11px] font-arcade text-cyan-300">
                DIFICULTAD CPU
              </span>
              <div className="flex items-center gap-1" role="group" aria-label="Dificultad CPU">
                {(['easy', 'normal', 'hard', 'expert'] as const).map((diff) => {
                  const active = difficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => onSelectDifficulty(diff)}
                      className={`px-2 py-0.5 text-[11px] font-bold border cursor-pointer ${
                        active
                          ? 'bg-cyan-400 text-slate-950 border-cyan-200'
                          : 'bg-[#12162e] text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {AI_DIFFICULTY_MODIFIERS[diff].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Fighter Brief + Start CTA */}
          <div className="w-full max-w-md bg-[#10142a]/95 border-2 border-slate-700 p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <FighterPortrait fighter={selectedP1} size={54} />
              <div className="min-w-0">
                <div className="text-xs text-amber-400 font-bold tracking-wider truncate">
                  P1 · {selectedP1.barrio}
                </div>
                <div className="font-arcade text-lg text-white truncate">
                  {selectedP1.name}
                </div>
                <div className="text-[11px] text-cyan-300 truncate">
                  Ultra: {selectedP1.superName}
                </div>
              </div>
            </div>

            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 active:translate-y-0.5 text-white font-arcade text-sm md:text-base border-2 border-amber-300 shadow-[0_4px_0_#090a14] transition-transform whitespace-nowrap shrink-0 cursor-pointer"
            >
              {mode === 'training' ? 'Practicar' : 'Pelear'}
            </button>
          </div>

          {/* Stage Selector Panel (shown in 1P vs CPU, 2P & Training; Arcade automatically tours all stages) */}
          <div className="w-full max-w-md bg-[#0e1227]/92 border-2 border-slate-800 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-arcade text-[11px] text-cyan-300">
                {mode === 'arcade' ? 'GIRA MODO HISTORIA' : 'SELECCIONAR ESCENARIO'}
              </span>
              <span className="text-[11px] text-amber-300 font-bold truncate">
                {mode === 'arcade' ? '6 Escenarios → Torre Piso 666' : currentStage.name}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Escenarios disponibles">
              {SELECTABLE_STAGE_IDS.map((sid) => {
                const st = STAGES[sid];
                const active = selectedStageId === sid;
                return (
                  <button
                    key={sid}
                    type="button"
                    disabled={mode === 'arcade'}
                    onClick={() => onSelectStage(sid)}
                    className={`relative h-12 overflow-hidden border-2 text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-default ${
                      active && mode !== 'arcade'
                        ? 'border-amber-400 scale-[1.02]'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <img
                      src={st.imageSrc}
                      alt={st.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex items-end p-1">
                      <span className="text-[9.5px] font-bold text-white leading-tight truncate">
                        {st.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Roster */}
        <div className="lg:col-span-7 flex flex-col gap-3.5 bg-[#0d1124]/92 border-2 border-slate-800 p-4 md:p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="font-arcade text-sm md:text-base text-amber-400">
              ELIGE TU ARTISTA ({PLAYABLE_FIGHTER_IDS.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono-num">
              {mode === 'arcade'
                ? '7 Combates · Todos los rivales + Jefe: Disquera Internacional'
                : mode === 'training'
                  ? `Dummy: ${selectedP2.name}`
                  : `Rival: ${selectedP2.name}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PLAYABLE_FIGHTER_IDS.map((id) => {
              const f = FIGHTERS[id];
              const isSelected = p1Id === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectP1(id)}
                  className={`p-2 flex items-center gap-2 text-left border-2 transition-transform cursor-pointer ${
                    isSelected
                      ? 'bg-[#1c2345] border-amber-400 -translate-y-0.5'
                      : 'bg-[#11152b] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <FighterPortrait fighter={f} size={40} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {f.name}
                    </div>
                    <div className="text-[10.5px] text-slate-400 leading-tight truncate">
                      {f.alias}
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const others = PLAYABLE_FIGHTER_IDS.filter((id) => id !== p1Id);
                const pick = others[Math.floor(Math.random() * others.length)];
                if (pick) onSelectP1(pick);
              }}
              className="p-2 flex items-center gap-2 text-left border-2 border-dashed border-slate-700 bg-[#11152b]/70 hover:border-amber-400 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 shrink-0 bg-[#090a14] border border-slate-700 flex items-center justify-center font-arcade text-amber-400 text-base">
                ?
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-300 truncate">
                  Aleatorio
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  Al azar
                </div>
              </div>
            </button>
          </div>

          {mode !== 'arcade' ? (
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">
                  {mode === 'vs_2p'
                    ? 'ELIGE LUCHADOR P2'
                    : mode === 'training'
                      ? 'ELIGE DUMMY DE PRÁCTICA'
                      : 'ELIGE RIVAL CPU'}
                </span>
                <span className="text-xs text-red-400 font-bold">
                  {selectedP2.isBoss ? 'JEFE FINAL' : selectedP2.alias}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_OPPONENT_IDS.map((id) => {
                  const f = FIGHTERS[id];
                  const isSelected = p2Id === id;
                  return (
                    <button
                      key={`p2-${id}`}
                      type="button"
                      onClick={() => onSelectP2(id)}
                      className={`px-2 py-1.5 flex items-center gap-2 text-left border-2 transition-colors cursor-pointer ${
                        isSelected
                          ? f.isBoss
                            ? 'bg-red-950 border-red-400'
                            : 'bg-[#2a1736] border-fuchsia-400'
                          : f.isBoss
                            ? 'bg-[#1d0b10] border-red-900/70 hover:border-red-600'
                            : 'bg-[#11152b] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <FighterPortrait fighter={f} size={32} flipped />
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {f.isBoss ? 'Disquera Boss' : f.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FighterPortrait fighter={FIGHTERS.disquera_internacional} size={44} flipped />
                <div>
                  <div className="text-xs font-bold text-red-400">
                    JEFE FINAL · PISO 666
                  </div>
                  <div className="text-sm font-bold text-white">
                    Disquera Internacional
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-400 text-right max-w-[270px]">
                Pelea contra todos los rivales al azar con dificultad creciente hasta el Jefe Final en Piso 666.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Hint Bar */}
      <footer className="relative z-10 px-6 pb-2.5 pt-1 flex items-center justify-center">
        <p className="text-xs text-slate-300/90 font-mono-num text-center truncate max-w-full">
          {gamepadConnected
            ? 'Mando Xbox: Cruceta/Stick Mover y Poderes · X Puño Débil · Y Puño Fuerte · A Patada Débil · B Patada Fuerte · LB Bloq · LT Dash · RB/RT Ultra (3 Barras)'
            : mode === 'vs_2p'
              ? 'P1: WASD · F/R Puños · G/H Patadas · T Ultra · C Bloq | P2: Flechas · J/U Puños · K/L Patadas · O Ultra · P Bloq | Esc Pausa · F2 Reiniciar'
              : 'WASD: F/R Puños · G/H Patadas · T Ultra · C Bloq | Flechas: J/U/K/L · O Ultra · E Bloq | Esc Pausa · M Mute · F2 Reiniciar'}
        </p>
      </footer>

      {/* Combos, Street Fighter Motions & Xbox Guide Modal */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090a14]/88 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Guía de Combos y Mando Xbox"
        >
          <div className="w-full max-w-2xl bg-[#11152c] border-2 border-amber-400 shadow-[0_8px_0_#000] p-5 flex flex-col gap-3.5 text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <div className="font-arcade text-base md:text-lg text-amber-400">
                  COMANDOS STREET FIGHTER, XBOX Y COMBOS
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Luchador activo: <strong className="text-white">{selectedP1.name}</strong> · Poder Ultra: {selectedP1.superName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Cerrar guía"
                className="px-3 py-1.5 bg-[#0a0d1c] border border-slate-700 hover:border-amber-400 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono-num">
              <div className="bg-[#0a0d1c] border border-slate-800 p-3 space-y-1">
                <div className="font-arcade text-[11px] text-emerald-300 mb-1">
                  BOTONES XBOX (NUEVO MAPEO)
                </div>
                <div><strong className="text-sky-300">X:</strong> Combo Débil / Puño Débil</div>
                <div><strong className="text-amber-300">Y:</strong> Combo Fuerte / Puño Fuerte</div>
                <div><strong className="text-emerald-300">A:</strong> Patada Débil</div>
                <div><strong className="text-red-400">B:</strong> Patada Fuerte</div>
                <div><strong className="text-fuchsia-300">RB o RT:</strong> Poder Ultra (3 Barras llenas)</div>
                <div><strong className="text-white">Cruceta / Stick:</strong> Saltar (Arriba), Agacharse, Comandos</div>
                <div><strong className="text-cyan-300">LB / LT:</strong> Bloquear (mantener) · Esquivar Dash</div>
              </div>

              <div className="bg-[#0a0d1c] border border-slate-800 p-3 space-y-1">
                <div className="font-arcade text-[11px] text-cyan-300 mb-1">
                  PODERES DE {selectedP1.name.toUpperCase()}
                </div>
                <div><strong className="text-amber-300">↓ ↘ → + X/Y:</strong> {selectedP1.powerMoves.hadou} (Onda)</div>
                <div><strong className="text-amber-300">→ ↓ ↘ + X/Y:</strong> {selectedP1.powerMoves.shoryu} (Antiaéreo)</div>
                <div><strong className="text-cyan-300">↓ ↙ ← + A/B:</strong> {selectedP1.powerMoves.slam} (Embestida)</div>
                <div><strong className="text-cyan-300">← ↙ ↓ ↘ → + A/B:</strong> {selectedP1.powerMoves.tornado} (Giro Multi-Hit)</div>
                <div><strong className="text-fuchsia-300">RB / RT (3 Barras):</strong> {selectedP1.superName}</div>
                <div className="text-[10.5px] text-slate-400 pt-1">
                  P1 Teclado: F/R Puños · G/H Patadas · T Ultra · C Bloq | Solo alt: J/U/K/L/O
                </div>
              </div>
            </div>

            <div className="bg-[#0a0d1c] border border-slate-700 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-mono-num">
                  <span className="text-slate-400">ESTADO XBOX: </span>
                  {gamepadConnected ? (
                    <span className="text-emerald-300 font-bold">
                      Conectado ({gamepadName})
                    </span>
                  ) : gamepadBlocked ? (
                    <span className="text-amber-300">
                      Bloqueado por permisos del navegador
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      Conecta tu mando y pulsa cualquier botón tras hacer clic en el juego
                    </span>
                  )}
                </div>
                {gamepadConnected && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onTestRumble(1)}
                      className="px-2.5 py-1 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-400 text-[11px] font-bold text-emerald-200 cursor-pointer"
                    >
                      Vibrar P1
                    </button>
                    {gamepadAssignments[1]?.connected && (
                      <button
                        type="button"
                        onClick={() => onTestRumble(2)}
                        className="px-2.5 py-1 bg-fuchsia-900/80 hover:bg-fuchsia-800 border border-fuchsia-400 text-[11px] font-bold text-fuchsia-200 cursor-pointer"
                      >
                        Vibrar P2
                      </button>
                    )}
                  </div>
                )}
              </div>
              {gamepadConnected && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-num">
                  <span className="text-slate-400">Botones en vivo:</span>
                  {gamepadActiveButtons.length > 0 ? (
                    gamepadActiveButtons.map((btn) => (
                      <span
                        key={btn}
                        className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-bold"
                      >
                        {btn}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">Pulsa X, Y, A, B, RB o mueve la cruceta...</span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#090c18] border border-slate-800 p-3 text-xs text-slate-300 space-y-1">
              <div><strong className="text-amber-300">ENCADENAR COMBOS (KILLER INSTINCT):</strong> Conecta <strong>X → A → Y → B → Poder (↓↘→+Puño) → Ultra (RB/RT)</strong> para subir de <em>Double</em>, <em>Triple</em>, <em>Super</em>, <em>Hyper</em>, <em>Brutal</em>, <em>Master</em> hasta <strong>¡ULTRA COMBOOOOO!</strong></div>
              <div><strong className="text-red-400">¡REMÁTALO!:</strong> En Match Point, remata al rival aturdido con cualquier golpe o Poder Ultra.</div>
            </div>
          </div>
        </div>
      )}

      {/* Audio, Gamepad Assignment & Diagnostics Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090a14]/88 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ajustes de Audio y Diagnóstico"
        >
          <div className="w-full max-w-md bg-[#11152c] border-2 border-amber-400 shadow-[0_8px_0_#000] p-5 flex flex-col gap-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="font-arcade text-base text-amber-400">
                AJUSTES · AUDIO Y MOTOR
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Cerrar ajustes"
                className="px-3 py-1 bg-[#0a0d1c] border border-slate-700 hover:border-amber-400 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono-num">
              {(
                [
                  { key: 'master', label: 'Volumen General' },
                  { key: 'music', label: 'Música' },
                  { key: 'sfx', label: 'Golpes Kung Fu' },
                ] as const
              ).map((item) => (
                <label key={item.key} className="flex items-center justify-between gap-3">
                  <span className="text-slate-300 w-36">{item.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(volumes[item.key] * 100)}
                    onChange={(e) =>
                      onChangeVolumes({ [item.key]: Number(e.target.value) / 100 })
                    }
                    className="flex-1 accent-amber-400 cursor-pointer"
                  />
                  <span className="w-10 text-right text-amber-300">
                    {Math.round(volumes[item.key] * 100)}%
                  </span>
                </label>
              ))}
            </div>

            <div className="bg-[#0a0d1c] border border-slate-800 p-3 space-y-2 text-xs font-mono-num">
              <div className="font-bold text-cyan-300">ASIGNACIÓN DE MANDOS</div>
              {gamepadAssignments.map((a) => (
                <div key={a.playerSlot} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">Jugador {a.playerSlot}:</span>
                  <span className={a.connected ? 'text-emerald-300 truncate' : 'text-slate-500'}>
                    {a.connected
                      ? `#${a.gamepadIndex} · ${a.gamepadId ?? 'Gamepad'}`
                      : 'Sin mando asignado'}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-[#0a0d1c] border border-slate-800 p-3 space-y-2 text-xs font-mono-num">
              <div className="font-bold text-amber-300">OPCIONES DE DESARROLLO</div>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Mostrar Hitboxes / Hurtboxes</span>
                <input
                  type="checkbox"
                  checked={showDebugCollisions}
                  onChange={onToggleDebugCollisions}
                  className="accent-red-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span>Diagnóstico FPS / Rendimiento</span>
                <input
                  type="checkbox"
                  checked={showPerfDiag}
                  onChange={onTogglePerfDiag}
                  className="accent-emerald-400 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
