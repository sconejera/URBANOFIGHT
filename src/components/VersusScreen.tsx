import React from 'react';
import { FighterProfile } from '../game/fighters';
import { GameMode } from '../game/rules';
import { StageInfo } from '../game/stages';
import { FighterFullArt } from './FighterPortrait';

interface VersusScreenProps {
  p1: FighterProfile;
  p2: FighterProfile;
  stage: StageInfo;
  mode: GameMode;
  stageIndex: number;
  totalStages: number;
  aiLabel?: string;
  onStartFight: () => void;
}

export const VersusScreen: React.FC<VersusScreenProps> = ({
  p1,
  p2,
  stage,
  mode,
  stageIndex,
  totalStages,
  aiLabel,
  onStartFight,
}) => {
  const modeSummary =
    mode === 'arcade'
      ? `Combate ${stageIndex + 1} de ${totalStages}${aiLabel ? ` · IA ${aiLabel}` : ''}`
      : mode === 'vs_cpu'
        ? `1P vs CPU${aiLabel ? ` · IA ${aiLabel}` : ''}`
        : '2 Jugadores';

  return (
    <div
      className="fixed inset-0 z-30 w-screen h-screen overflow-hidden bg-[#060710] text-slate-100 select-none cursor-pointer"
      onClick={onStartFight}
      role="button"
      tabIndex={0}
      aria-label={`Combate ${p1.name} contra ${p2.name}. Pulsa Enter o clic para iniciar`}
    >
      {/* Fullscreen atmospheric stage backdrop */}
      <img
        src={stage.imageSrc}
        alt={stage.name}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-25 scale-105 blur-[2px] pointer-events-none"
      />

      {/* Mortal Kombat-inspired 50/50 split aura canvas */}
      <div className="absolute inset-0 grid grid-cols-2 pointer-events-none">
        <div
          className="relative h-full"
          style={{
            background: `radial-gradient(circle at 38% 48%, ${p1.colors.aura}4d 0%, rgba(9, 13, 30, 0.88) 58%, #05060c 100%)`,
          }}
        />
        <div
          className="relative h-full"
          style={{
            background: `radial-gradient(circle at 62% 48%, ${p2.isBoss ? '#dc262666' : `${p2.colors.aura}4d`} 0%, rgba(18, 7, 14, 0.9) 58%, #05060c 100%)`,
          }}
        />
      </div>

      {/* Top & bottom contrast scrims */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(4, 5, 11, 0.92) 0%, rgba(4, 5, 11, 0.52) 55%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(4, 5, 11, 0.96) 0%, rgba(4, 5, 11, 0.78) 52%, transparent 100%)',
        }}
      />

      {/* Top unboxed stage & difficulty header */}
      <header className="relative z-20 flex flex-col items-center justify-center pt-4 md:pt-6 px-6 text-center pointer-events-none">
        <div className="text-xs md:text-sm font-mono-num text-amber-300 tracking-wide">
          {modeSummary}
        </div>
        <h1 className="font-arcade text-base sm:text-xl md:text-2xl text-white arcade-text-shadow mt-1 max-w-2xl text-balance">
          {stage.name}
        </h1>
      </header>

      {/* Fullscreen 2-Half Fighter Showdown */}
      <div className="absolute inset-0 z-10 grid grid-cols-2 items-end pointer-events-none">
        {/* Left Half: P1 */}
        <div className="relative h-full flex items-end justify-center overflow-hidden pr-2 sm:pr-8 md:pr-14 pb-16 sm:pb-12">
          <div className="animate-vs-left h-[74vh] sm:h-[82vh] md:h-[88vh] w-full flex items-end justify-center">
            <FighterFullArt
              fighter={p1}
              className="h-full w-auto max-w-[92%] object-contain object-bottom"
            />
          </div>
        </div>

        {/* Right Half: P2 / Rival / Final Boss */}
        <div className="relative h-full flex items-end justify-center overflow-hidden pl-2 sm:pl-8 md:pl-14 pb-16 sm:pb-12">
          <div className="animate-vs-right h-[74vh] sm:h-[82vh] md:h-[88vh] w-full flex items-end justify-center">
            <FighterFullArt
              fighter={p2}
              flipped
              className="h-full w-auto max-w-[92%] object-contain object-bottom"
            />
          </div>
        </div>
      </div>

      {/* Diagonal MK-style energy clash divider + center VS emblem */}
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
        <div
          className="h-[135vh] w-[3px] rotate-[9deg] opacity-80"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, #facc15 28%, #ef4444 50%, #22d3ee 72%, transparent 100%)',
            boxShadow: '0 0 28px rgba(250, 204, 21, 0.7), 0 0 56px rgba(239, 68, 68, 0.55)',
          }}
        />
        <div className="animate-vs-emblem absolute flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              className="w-28 h-28 sm:w-36 sm:h-36 rotate-45 bg-[#090a14]/92 border-4 border-amber-400"
              style={{
                boxShadow:
                  '0 0 36px rgba(239, 68, 68, 0.72), inset 0 0 24px rgba(250, 204, 21, 0.3)',
              }}
            />
            <span className="absolute font-arcade text-5xl sm:text-7xl text-red-500 arcade-stroke drop-shadow-[0_6px_12px_rgba(0,0,0,0.95)] tracking-tighter">
              VS
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Contender Nameplates + Skip Prompt */}
      <footer className="absolute inset-x-0 bottom-0 z-30 px-5 sm:px-10 md:px-14 pb-5 sm:pb-7 flex flex-col gap-3 pointer-events-none">
        <div className="grid grid-cols-2 gap-6 items-end">
          {/* P1 Nameplate */}
          <div className="text-left min-w-0">
            <div className="text-xs sm:text-sm font-bold text-cyan-300 tracking-wide truncate">
              Jugador 1 · {p1.barrio}
            </div>
            <div className="font-arcade text-xl sm:text-3xl md:text-4xl text-white arcade-text-shadow truncate mt-0.5">
              {p1.name}
            </div>
            <div className="text-xs sm:text-sm text-slate-300 truncate mt-0.5">
              {p1.alias} · Ultra: {p1.superName}
            </div>
          </div>

          {/* P2 Nameplate */}
          <div className="text-right min-w-0">
            <div
              className={`text-xs sm:text-sm font-bold tracking-wide truncate ${
                p2.isBoss ? 'text-red-400' : 'text-amber-300'
              }`}
            >
              {p2.isBoss
                ? `Jefe Final · ${p2.barrio}`
                : `${mode === 'vs_2p' ? 'Jugador 2' : 'Rival CPU'} · ${p2.barrio}`}
            </div>
            <div className="font-arcade text-xl sm:text-3xl md:text-4xl text-white arcade-text-shadow truncate mt-0.5">
              {p2.name}
            </div>
            <div className="text-xs sm:text-sm text-slate-300 truncate mt-0.5">
              {p2.alias} · Ultra: {p2.superName}
            </div>
          </div>
        </div>

        <div className="text-center text-xs font-mono-num text-slate-300">
          Pulsa Enter / A o clic para pelear ahora
        </div>
      </footer>
    </div>
  );
};
