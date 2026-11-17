import React, { useState } from 'react';
import { AudioVolumeSettings } from '../game/audio';
import { FighterProfile } from '../game/fighters';
import { GameMode } from '../game/rules';

export interface RunSummary {
  outcome: 'paused' | 'victory' | 'defeat';
  mode: GameMode;
  p1: FighterProfile;
  p2: FighterProfile;
  score: number;
  bestCombo: number;
  stageIndex: number;
  totalStages: number;
  p1Rounds: number;
  p2Rounds: number;
  hasNextArcadeStage: boolean;
  finisherLanded?: boolean;
}

interface StatusModalProps {
  summary: RunSummary;
  gamepadConnected?: boolean;
  difficultyLabel?: string;
  volumes?: AudioVolumeSettings;
  onChangeVolumes?: (patch: Partial<AudioVolumeSettings>) => void;
  showDebugCollisions?: boolean;
  onToggleDebugCollisions?: () => void;
  showPerfDiag?: boolean;
  onTogglePerfDiag?: () => void;
  onResume: () => void;
  onNextStage: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  summary,
  gamepadConnected = false,
  difficultyLabel,
  volumes,
  onChangeVolumes,
  showDebugCollisions = false,
  onToggleDebugCollisions,
  showPerfDiag = false,
  onTogglePerfDiag,
  onResume,
  onNextStage,
  onRestart,
  onTitle,
}) => {
  const [showMovelist, setShowMovelist] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const {
    outcome,
    p1,
    p2,
    score,
    bestCombo,
    stageIndex,
    totalStages,
    hasNextArcadeStage,
    finisherLanded,
  } = summary;

  const titleText =
    outcome === 'paused'
      ? 'PAUSA'
      : outcome === 'victory'
        ? hasNextArcadeStage
          ? '¡COMBATE GANADO!'
          : summary.mode === 'arcade'
            ? '¡DISQUERA DERROTADA!'
            : '¡VICTORIA!'
        : 'DERROTA';

  const titleColor =
    outcome === 'paused'
      ? 'text-amber-400'
      : outcome === 'victory'
        ? 'text-emerald-400'
        : 'text-red-400';

  const subtitle =
    outcome === 'paused'
      ? `${p1.name} vs ${p2.name}${difficultyLabel && (summary.mode === 'arcade' || summary.mode === 'vs_cpu') ? ` · CPU ${difficultyLabel}` : ''}`
      : outcome === 'victory'
        ? hasNextArcadeStage
          ? `${p1.name} venció a ${p2.name}. Prepárate para el siguiente round.`
          : summary.mode === 'arcade'
            ? `${p1.name} venció al diablo Disquera Internacional y liberó el género urbano.`
            : `${p1.name} se impuso en la tarima.`
        : `${p2.name} se quedó con el combate. Inténtalo de nuevo.`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090a14]/82 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
    >
      <div className="w-full max-w-md bg-[#11152c] border-2 border-amber-400 shadow-[0_8px_0_#090a14] p-6 flex flex-col gap-4 text-slate-100 max-h-[92vh] overflow-y-auto">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className={`font-arcade text-2xl ${titleColor} arcade-text-shadow`}>
              {titleText}
            </div>
            {finisherLanded && outcome === 'victory' && (
              <span className="px-2 py-0.5 bg-red-950 border border-red-400 text-[10px] font-arcade text-red-300">
                ¡REMATE!
              </span>
            )}
          </div>
          <p className="text-sm text-slate-300 mt-1.5">{subtitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 bg-[#0a0d1c] border border-slate-800 p-3">
          <div>
            <div className="text-[11px] text-slate-400 font-bold">PUNTAJE</div>
            <div className="font-mono-num text-lg font-bold text-amber-300">
              {Math.round(score)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">COMBO MÁX</div>
            <div className="font-mono-num text-lg font-bold text-white">
              {bestCombo} hits
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">
              {summary.mode === 'arcade' ? 'ETAPA' : 'ROUNDS'}
            </div>
            <div className="font-mono-num text-lg font-bold text-white">
              {summary.mode === 'arcade'
                ? `${stageIndex + 1}/${totalStages}`
                : `${summary.p1Rounds}-${summary.p2Rounds}`}
            </div>
          </div>
        </div>

        {outcome === 'paused' && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowMovelist((v) => !v)}
              className="w-full py-2 px-3 bg-[#0c1022] hover:bg-[#151b38] border border-slate-700 text-xs font-bold text-cyan-300 flex items-center justify-between cursor-pointer"
            >
              <span>Poderes Street Fighter y Mando Xbox</span>
              <span>{showMovelist ? '▲' : '▼'}</span>
            </button>
            {showMovelist && (
              <div className="bg-[#090c18] border border-slate-800 p-3 text-[11px] font-mono-num space-y-1 text-slate-300">
                <div><strong className="text-amber-300">Botones Xbox:</strong> X Puño Débil · Y Puño Fuerte · A Patada Débil · B Patada Fuerte</div>
                <div><strong className="text-white">Cadena Combo:</strong> X → A → Y → B → Poder → Ultra</div>
                <div><strong className="text-cyan-300">↓ ↘ → + Puño:</strong> {p1.powerMoves.hadou}</div>
                <div><strong className="text-cyan-300">→ ↓ ↘ + Puño:</strong> {p1.powerMoves.shoryu}</div>
                <div><strong className="text-emerald-300">↓ ↙ ← + Patada:</strong> {p1.powerMoves.slam}</div>
                <div><strong className="text-emerald-300">← ↙ ↓ ↘ → + Patada:</strong> {p1.powerMoves.tornado}</div>
                <div><strong className="text-fuchsia-300">Poder Ultra ({p1.superName}):</strong> RB o RT (3 Barras llenas)</div>
                <div><strong className="text-slate-200">Defensa / Dash:</strong> LB (Bloquear) · LT (Dash)</div>
              </div>
            )}

            {volumes && onChangeVolumes && (
              <>
                <button
                  type="button"
                  onClick={() => setShowOptions((v) => !v)}
                  className="w-full py-2 px-3 bg-[#0c1022] hover:bg-[#151b38] border border-slate-700 text-xs font-bold text-amber-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Ajustes de Audio y Diagnóstico</span>
                  <span>{showOptions ? '▲' : '▼'}</span>
                </button>
                {showOptions && (
                  <div className="bg-[#090c18] border border-slate-800 p-3 text-[11px] font-mono-num space-y-2 text-slate-300">
                    {(
                      [
                        { key: 'master', label: 'General' },
                        { key: 'music', label: 'Música' },
                        { key: 'sfx', label: 'Golpes' },
                      ] as const
                    ).map((item) => (
                      <label key={item.key} className="flex items-center justify-between gap-2">
                        <span className="w-20">{item.label}</span>
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
                        <span className="w-8 text-right text-amber-300">
                          {Math.round(volumes[item.key] * 100)}%
                        </span>
                      </label>
                    ))}
                    {onToggleDebugCollisions && (
                      <label className="flex items-center justify-between pt-1 cursor-pointer">
                        <span>Hitboxes / Hurtboxes</span>
                        <input
                          type="checkbox"
                          checked={showDebugCollisions}
                          onChange={onToggleDebugCollisions}
                          className="accent-red-500 w-4 h-4 cursor-pointer"
                        />
                      </label>
                    )}
                    {onTogglePerfDiag && (
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Diagnóstico FPS</span>
                        <input
                          type="checkbox"
                          checked={showPerfDiag}
                          onChange={onTogglePerfDiag}
                          className="accent-emerald-400 w-4 h-4 cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {outcome === 'paused' && (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-arcade text-sm border-2 border-amber-200 cursor-pointer"
            >
              Reanudar
            </button>
          )}

          {outcome === 'victory' && hasNextArcadeStage && (
            <button
              type="button"
              data-start="true"
              onClick={onNextStage}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-arcade text-sm border-2 border-emerald-200 cursor-pointer"
            >
              Siguiente Rival
            </button>
          )}

          <button
            type="button"
            data-start={outcome !== 'paused' && !hasNextArcadeStage ? 'true' : undefined}
            onClick={onRestart}
            className={`w-full py-3 font-arcade text-sm border-2 cursor-pointer ${
              outcome === 'defeat' || (outcome === 'victory' && !hasNextArcadeStage)
                ? 'bg-red-600 hover:bg-red-500 text-white border-amber-300'
                : 'bg-[#192042] hover:bg-[#232c59] text-slate-100 border-slate-600'
            }`}
          >
            {outcome === 'paused' ? 'Reiniciar Combate' : 'Jugar de Nuevo'}
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="w-full py-2.5 bg-[#0c1021] hover:bg-[#151b36] text-slate-300 font-bold text-sm border border-slate-700 cursor-pointer"
          >
            Menú Principal
          </button>
        </div>

        {gamepadConnected && (
          <div className="text-[10.5px] font-mono-num text-center text-emerald-300">
            Xbox: [A / Start] Aceptar · [B] Menú Principal
          </div>
        )}
      </div>
    </div>
  );
};
