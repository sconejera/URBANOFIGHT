import React from 'react';
import {
  FIGHTERS,
  PLAYABLE_FIGHTER_IDS,
} from '../game/fighters';
import { FighterFullArt, FighterPortrait } from './FighterPortrait';
import { RunSummary } from './StatusModal';

interface ArcadeVictoryScreenProps {
  summary: RunSummary;
  gamepadConnected?: boolean;
  onRestart: () => void;
  onTitle: () => void;
}

export const ArcadeVictoryScreen: React.FC<ArcadeVictoryScreenProps> = ({
  summary,
  gamepadConnected = false,
  onRestart,
  onTitle,
}) => {
  const boss = FIGHTERS.disquera_internacional;

  return (
    <div
      className="fixed inset-0 z-40 w-screen h-screen overflow-y-auto bg-[#070913] text-slate-100 flex flex-col justify-between px-5 sm:px-10 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Juego terminado: Disquera Internacional derrotada"
    >
      {/* Golden championship glow & subtle stage horizon */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 28% 45%, rgba(250, 204, 21, 0.16) 0%, rgba(16, 20, 44, 0.92) 55%, #070913 100%)',
        }}
      />

      {/* Top Championship Headline */}
      <header className="relative z-10 max-w-6xl w-full mx-auto text-center">
        <div className="text-xs sm:text-sm font-mono-num text-amber-300 tracking-wide">
          Modo Historia Completado · {summary.totalStages}/{summary.totalStages} Combates Ganados
        </div>
        <h1 className="font-arcade text-2xl sm:text-4xl text-amber-400 arcade-text-shadow mt-1.5 text-balance">
          ¡JUEGO TERMINADO · CAMPEÓN URBANO!
        </h1>
        <p className="text-sm sm:text-base text-slate-200 mt-2 max-w-2xl mx-auto">
          {summary.p1.name} derrotó a todos los rivales y venció a{' '}
          <strong className="text-red-400">Disquera Internacional</strong>. El género urbano chileno es libre.
        </p>

        {/* Clean unboxed metrics */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm font-mono-num text-slate-300">
          <span>
            Puntaje: <strong className="text-amber-300">{Math.round(summary.score)}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Mejor Combo: <strong className="text-white">{summary.bestCombo} hits</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Campeón: <strong className="text-emerald-300">{summary.p1.name}</strong>
          </span>
          {summary.finisherLanded && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-bold">¡Remate Urbano!</span>
            </>
          )}
        </div>
      </header>

      {/* Main Showcase: Champion + All 7 Roster Heroes + Defeated Final Boss */}
      <section className="relative z-10 max-w-6xl w-full mx-auto my-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Champion Full Art */}
        <div className="lg:col-span-4 flex flex-col items-center justify-end bg-[#0d1124]/90 border border-amber-400/50 p-4 h-[340px] sm:h-[420px]">
          <div className="flex-1 w-full flex items-end justify-center overflow-hidden">
            <FighterFullArt
              fighter={summary.p1}
              className="h-full w-auto max-w-full object-contain object-bottom"
            />
          </div>
          <div className="w-full pt-3 mt-2 border-t border-slate-800 text-center">
            <div className="text-xs font-bold text-amber-300">Campeón Invicto</div>
            <div className="font-arcade text-lg text-white truncate">{summary.p1.name}</div>
          </div>
        </div>

        {/* Center/Right: All 7 Roster Characters Victorious + Disquera Internacional Defeated */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="bg-[#0d1124]/90 border border-slate-800 p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <h2 className="font-arcade text-sm sm:text-base text-emerald-400">
                ESCENA CHILENA VICTORIOSA ({PLAYABLE_FIGHTER_IDS.length} ARTISTAS)
              </h2>
              <span className="text-xs font-mono-num text-slate-400">
                Todos Unidos
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PLAYABLE_FIGHTER_IDS.map((id) => {
                const fighter = FIGHTERS[id];
                const isChamp = fighter.id === summary.p1.id;
                return (
                  <div
                    key={id}
                    className={`p-2 flex items-center gap-2.5 border ${
                      isChamp
                        ? 'bg-[#1a2142] border-amber-400'
                        : 'bg-[#090c1a] border-slate-800'
                    }`}
                  >
                    <FighterPortrait fighter={fighter} size={44} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {fighter.name}
                      </div>
                      <div
                        className={`text-[11px] font-mono-num truncate ${
                          isChamp ? 'text-amber-300 font-bold' : 'text-emerald-400'
                        }`}
                      >
                        {isChamp ? 'Campeón' : 'Vencedor'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Defeated Boss Showcase */}
          <div className="bg-[#16090e]/92 border border-red-800/70 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-28 w-24 shrink-0 flex items-center justify-center bg-[#0a0609] border border-red-900/70 p-1 overflow-hidden">
                <FighterFullArt
                  fighter={boss}
                  defeated
                  flipped
                  className="h-full w-auto object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono-num font-bold text-red-400">
                  Jefe Final · Derrotado
                </div>
                <div className="font-arcade text-lg sm:text-xl text-slate-200 line-through decoration-red-500 decoration-2 truncate mt-0.5">
                  {boss.name}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Contrato 360° roto en la Torre Disquera Piso 666
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="px-3 py-1.5 border border-red-500/70 bg-red-950/80 font-arcade text-xs text-red-300 whitespace-nowrap">
                K.O. DEFINITIVO
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Controls */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto flex flex-col items-center gap-2.5 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="min-h-[44px] px-7 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-arcade text-sm border-2 border-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Jugar de Nuevo
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="min-h-[44px] px-7 py-2.5 bg-[#12162e] hover:bg-[#1b2245] text-slate-100 font-bold text-sm border-2 border-slate-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Menú Principal
          </button>
        </div>
        {gamepadConnected && (
          <div className="text-xs font-mono-num text-emerald-300">
            Xbox: [A / Start] Jugar de Nuevo · [B] Menú Principal
          </div>
        )}
      </footer>
    </div>
  );
};
