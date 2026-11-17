import React, { useEffect, useRef, useState } from 'react';
import { INTRO_VIDEO_SRC } from '../game/audio';

interface IntroVideoScreenProps {
  isMuted: boolean;
  onFinish: () => void;
}

export const IntroVideoScreen: React.FC<IntroVideoScreenProps> = ({
  isMuted,
  onFinish,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const [forcedMuted, setForcedMuted] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.muted = isMuted;
    el.currentTime = 0;

    const startPlayback = async () => {
      try {
        await el.play();
      } catch {
        // Fallback: retry muted if browser autoplay policy blocked unmuted playback
        try {
          el.muted = true;
          setForcedMuted(true);
          await el.play();
        } catch {
          setNeedsTapToPlay(true);
        }
      }
    };

    void startPlayback();
  }, [isMuted]);

  const handleEnableSound = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    setForcedMuted(false);
    setNeedsTapToPlay(false);
    void el.play().catch(() => {});
  };

  return (
    <div className="relative w-full h-full bg-[#05060c] flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={INTRO_VIDEO_SRC}
        autoPlay
        playsInline
        preload="auto"
        onEnded={onFinish}
        onError={onFinish}
        className="w-full h-full object-contain bg-black"
      />

      {needsTapToPlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
          <button
            type="button"
            onClick={handleEnableSound}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-arcade text-lg border-4 border-amber-300 shadow-[0_6px_0_#000] whitespace-nowrap shrink-0 cursor-pointer"
          >
            REPRODUCIR INTRO
          </button>
        </div>
      )}

      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2.5">
        {forcedMuted && !isMuted && (
          <button
            type="button"
            onClick={handleEnableSound}
            className="px-4 py-2 bg-[#11152c]/95 hover:border-amber-400 border-2 border-amber-300 text-amber-300 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            Activar sonido
          </button>
        )}
        <button
          type="button"
          onClick={onFinish}
          className="px-5 py-2.5 bg-[#090a14]/90 hover:bg-amber-400 hover:text-slate-950 border-2 border-slate-500 hover:border-amber-300 text-slate-100 font-arcade text-xs md:text-sm shadow-[0_4px_0_#000] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          SALTAR INTRO
        </button>
      </div>
    </div>
  );
};
