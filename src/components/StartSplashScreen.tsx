import React from 'react';
import { BeatTrackInfo } from '../game/audio';

interface StartSplashScreenProps {
  onBeginIntro: () => void;
  currentSong: BeatTrackInfo;
  isMusicPlaying: boolean;
  isMuted: boolean;
  onUnlockAudio: () => void;
  onShuffleSong: () => void;
  onToggleMute: () => void;
  gamepadConnected: boolean;
  gamepadName: string | null;
  gamepadBlocked: boolean;
  gamepadActiveButtons: string[];
}

export const StartSplashScreen: React.FC<StartSplashScreenProps> = ({
  onBeginIntro,
  currentSong,
  isMusicPlaying,
  isMuted,
  onUnlockAudio,
  onShuffleSong,
  onToggleMute,
  gamepadConnected,
  gamepadName,
  gamepadBlocked,
  gamepadActiveButtons,
}) => {
  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#090a14] text-slate-100 flex flex-col justify-between"
      onPointerDown={onUnlockAudio}
    >
      {/* Key-Art Backdrop with Scrim */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/src/assets/images/title_bg_1794854481848.jpg"
          alt="Horizonte nocturno de Santiago y la Cordillera de los Andes"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-60"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 54%, rgba(12,16,38,0.62) 0%, rgba(9,10,20,0.92) 72%, rgba(9,10,20,0.98) 100%)',
          }}
        />
      </div>

      {/* Top HUD Bar: Controller Box + Song Box */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Controller Indicator Box */}
          <div
            className={`px-4 py-2.5 border-2 bg-[#0d1124]/92 flex items-center justify-between gap-3 shadow-[0_4px_0_#000] ${
              gamepadConnected ? 'border-emerald-400' : 'border-slate-700'
            }`}
            aria-label="Estado del mando"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 shrink-0 flex items-center justify-center border-2 ${
                  gamepadConnected
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                    : 'bg-[#12162e] border-slate-600 text-amber-300'
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="10" rx="4" />
                  <path d="M6 12h4M8 10v4" strokeLinecap="round" />
                  <circle cx="16.5" cy="11" r="1" fill="currentColor" />
                  <circle cx="18.5" cy="13" r="1" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-arcade text-[11px] tracking-wider text-slate-300">
                  MANDO
                </div>
                <div
                  className={`text-xs md:text-sm font-bold truncate ${
                    gamepadConnected ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {gamepadConnected
                    ? `Conectado · ${gamepadName ?? 'Mando Xbox'}`
                    : gamepadBlocked
                      ? 'Mando bloqueado · Teclado activo'
                      : 'Sin mando conectado · Teclado activo'}
                </div>
              </div>
            </div>

            {gamepadConnected && gamepadActiveButtons.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {gamepadActiveButtons.slice(0, 3).map((btn) => (
                  <span
                    key={btn}
                    className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-mono-num text-[11px] font-bold"
                  >
                    {btn}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Current Random Song Box */}
          <div
            className="px-4 py-2.5 border-2 border-amber-400/80 bg-[#0d1124]/92 flex items-center justify-between gap-3 shadow-[0_4px_0_#000]"
            aria-label="Canción sonando"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 flex items-center justify-center border-2 border-amber-400 bg-[#1a162b] text-amber-300 font-bold text-lg">
                ♪
              </div>
              <div className="min-w-0">
                <div className="font-arcade text-[11px] tracking-wider text-amber-300">
                  {isMuted
                    ? 'CANCIÓN · SILENCIADA'
                    : isMusicPlaying
                      ? 'CANCIÓN SONANDO'
                      : 'CANCIÓN LISTA (TOCA PARA SONAR)'}
                </div>
                <div className="text-xs md:text-sm font-bold text-white truncate">
                  {currentSong.label}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isMuted && !isMusicPlaying && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnlockAudio();
                  }}
                  className="h-8 px-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sonar
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShuffleSong();
                }}
                aria-label="Cambiar canción aleatoria"
                className="h-8 px-2.5 bg-[#161b36] hover:border-amber-400 border border-slate-600 text-amber-300 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Otra
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute();
                }}
                aria-label={isMuted ? 'Activar música' : 'Silenciar música'}
                className="w-8 h-8 flex items-center justify-center bg-[#161b36] hover:border-amber-400 border border-slate-600 text-slate-100 shrink-0 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" strokeLinejoin="round" />
                  {isMuted ? (
                    <path d="M22 9l-6 6M16 9l6 6" stroke="#f87171" strokeLinecap="round" />
                  ) : (
                    <path d="M16 8.5a5 5 0 010 7" stroke="#facc15" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Center Stage: Title & COMENZAR CTA */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="px-3.5 py-1 bg-[#11152c]/90 border border-amber-400/70 font-mono-num text-xs font-bold tracking-widest text-amber-300">
            EDICIÓN CHILE · GÉNERO URBANO
          </div>
          <svg
            viewBox="0 0 540 136"
            className="w-full max-w-[520px] h-auto drop-shadow-[0_8px_0_rgba(0,0,0,0.92)]"
            role="img"
            aria-label="UrbanoFight CL"
          >
            <polygon points="10,16 530,6 520,112 6,124" fill="#090a14" stroke="#facc15" strokeWidth="3.5" />
            <polygon points="18,22 522,14 514,104 14,116" fill="#18122b" />
            <polygon
              points="48,44 53,56 66,56 56,64 60,76 48,68 36,76 40,64 30,56 43,56"
              fill="#facc15"
            />
            <text
              x="82"
              y="70"
              fill="#f8fafc"
              fontFamily="Silkscreen, monospace"
              fontWeight="700"
              fontSize="41"
              letterSpacing="-1"
            >
              URBANOFIGHT
            </text>
            <rect x="82" y="80" width="405" height="4.5" fill="#ef4444" />
            <text
              x="84"
              y="100"
              fill="#facc15"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="14"
              letterSpacing="2.2"
            >
              TORNEO CALLEJERO · CHILE VS LA DISQUERA
            </text>
          </svg>
        </div>

        <button
          type="button"
          data-start-intro="true"
          onClick={onBeginIntro}
          className="px-12 py-4 bg-red-600 hover:bg-red-500 active:translate-y-0.5 text-white font-arcade text-xl md:text-2xl tracking-wider border-4 border-amber-300 shadow-[0_8px_0_#090a14] transition-transform whitespace-nowrap shrink-0 cursor-pointer"
        >
          COMENZAR
        </button>

        <p className="text-xs md:text-sm font-mono-num text-slate-300">
          {gamepadConnected
            ? 'Pulsa COMENZAR, botón A o Start en tu mando Xbox'
            : 'Haz clic en COMENZAR o pulsa Enter para ver la intro'}
        </p>
      </div>

      {/* Footer Quick Controls Reminder */}
      <footer className="relative z-10 px-6 pb-4 text-center">
        <p className="text-[11px] font-mono-num text-slate-400">
          7 Artistas Chilenos · Jefe Final Disquera Internacional · Combos y Poder Ultra
        </p>
      </footer>
    </div>
  );
};
