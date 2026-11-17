import React, { useEffect, useState } from 'react';
import { FighterId, FighterProfile } from '../game/fighters';

interface FighterPortraitProps {
  fighter: FighterProfile;
  size?: number;
  flipped?: boolean;
}

interface FighterFullArtProps {
  fighter: FighterProfile;
  flipped?: boolean;
  defeated?: boolean;
  className?: string;
}

interface PortraitConfig {
  src: string;
  bgGradient: string;
  cropMode: 'full_body_bust' | 'pablo_left_panel';
  imgStyle: React.CSSProperties;
}

const PORTRAIT_CONFIG: Record<FighterId, PortraitConfig> = {
  marcianeke: {
    src: '/assets/aistudio/MARCIANEKE_f29a32b8.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #164e63 0%, #090a14 95%)',
    cropMode: 'full_body_bust',
    imgStyle: {
      width: '175%',
      height: 'auto',
      maxWidth: 'none',
      left: '50%',
      top: '-1%',
      transform: 'translateX(-50%)',
    },
  },
  pablo_chille: {
    src: '/assets/aistudio/PABLO_CHILL-E_afe19a49.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #7f1d1d 0%, #090a14 95%)',
    cropMode: 'pablo_left_panel',
    imgStyle: {
      width: '475%',
      height: 'auto',
      maxWidth: 'none',
      left: '-1%',
      top: '-1%',
    },
  },
  juliano_sosa: {
    src: '/assets/aistudio/JULIANO_SOSA_59db9197.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #78350f 0%, #090a14 95%)',
    cropMode: 'full_body_bust',
    imgStyle: {
      width: '185%',
      height: 'auto',
      maxWidth: 'none',
      left: '50%',
      top: '-2%',
      transform: 'translateX(-50%)',
    },
  },
  jere_klein: {
    src: '/assets/aistudio/JERE_KLEIN_e1eac28c.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #0e7490 0%, #090a14 95%)',
    cropMode: 'full_body_bust',
    imgStyle: {
      width: '185%',
      height: 'auto',
      maxWidth: 'none',
      left: '50%',
      top: '-2%',
      transform: 'translateX(-50%)',
    },
  },
  bayron_fire: {
    src: '/assets/aistudio/BAYRON_FIRE_ac622317.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #9a3412 0%, #090a14 95%)',
    cropMode: 'full_body_bust',
    imgStyle: {
      width: '180%',
      height: 'auto',
      maxWidth: 'none',
      left: '50%',
      top: '-1%',
      transform: 'translateX(-50%)',
    },
  },
  loyalty: {
    src: '/assets/aistudio/LOYALTY_3597ac7c.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #831843 0%, #090a14 95%)',
    cropMode: 'full_body_bust',
    imgStyle: {
      width: '188%',
      height: 'auto',
      maxWidth: 'none',
      left: '51%',
      top: '-2%',
      transform: 'translateX(-50%)',
    },
  },
  cris_mj: {
    src: '/assets/aistudio/CRIS_MJ_669b7616.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #4c1d95 0%, #090a14 95%)',
    cropMode: 'full_body_bust',
    imgStyle: {
      width: '182%',
      height: 'auto',
      maxWidth: 'none',
      left: '50%',
      top: '-1%',
      transform: 'translateX(-50%)',
    },
  },
  disquera_internacional: {
    src: '/assets/aistudio/DISQUERA_INTERNACIONAL_e38f0313.png',
    bgGradient: 'radial-gradient(circle at 50% 35%, #7f1d1d 0%, #090a14 95%)',
    cropMode: 'full_body_bust',
    imgStyle: {
      width: '186%',
      height: 'auto',
      maxWidth: 'none',
      left: '54%',
      top: '-2%',
      transform: 'translateX(-50%)',
    },
  },
};

let pabloCropPromise: Promise<string> | null = null;
let pabloCropDataUrl: string | null = null;

function loadPabloFullBodyCrop(): Promise<string> {
  if (pabloCropDataUrl) return Promise.resolve(pabloCropDataUrl);
  if (pabloCropPromise) return pabloCropPromise;

  pabloCropPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(PORTRAIT_CONFIG.pablo_chille.src);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        // Pablo's full-body portrait occupies x=[0..388], y=[0..1024] on PABLO_CHILL-E_afe19a49.png
        const cropW = Math.min(388, img.naturalWidth);
        const cropH = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, cropW, cropH, 0, 0, cropW, cropH);
          pabloCropDataUrl = canvas.toDataURL('image/png');
          resolve(pabloCropDataUrl);
          return;
        }
      } catch {
        // fall through to original source
      }
      resolve(PORTRAIT_CONFIG.pablo_chille.src);
    };
    img.onerror = () => resolve(PORTRAIT_CONFIG.pablo_chille.src);
    img.src = PORTRAIT_CONFIG.pablo_chille.src;
  });

  return pabloCropPromise;
}

export const FighterPortrait: React.FC<FighterPortraitProps> = ({
  fighter,
  size = 52,
  flipped = false,
}) => {
  const cfg = PORTRAIT_CONFIG[fighter.id];
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="shrink-0 overflow-hidden border-2 relative select-none"
      style={{
        width: size,
        height: size,
        background: cfg.bgGradient,
        borderColor: fighter.colors.primary,
        transform: flipped ? 'scaleX(-1)' : undefined,
      }}
    >
      {!imgError ? (
        <img
          src={cfg.src}
          alt={fighter.name}
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setImgError(true)}
          className="absolute pointer-events-none block"
          style={{
            imageRendering: 'auto',
            filter: 'contrast(1.05) saturate(1.04)',
            ...cfg.imgStyle,
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-arcade text-xs text-white"
          style={{ transform: flipped ? 'scaleX(-1)' : undefined }}
        >
          {fighter.name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};

export const FighterFullArt: React.FC<FighterFullArtProps> = ({
  fighter,
  flipped = false,
  defeated = false,
  className = '',
}) => {
  const cfg = PORTRAIT_CONFIG[fighter.id];
  const isPablo = fighter.id === 'pablo_chille';
  const [pabloSrc, setPabloSrc] = useState<string | null>(() =>
    isPablo ? pabloCropDataUrl : null
  );
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    if (!isPablo) {
      setPabloSrc(null);
      return;
    }
    if (pabloCropDataUrl) {
      setPabloSrc(pabloCropDataUrl);
      return;
    }
    let cancelled = false;
    loadPabloFullBodyCrop().then((url) => {
      if (!cancelled) setPabloSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [isPablo, fighter.id]);

  const resolvedSrc = isPablo ? pabloSrc : cfg.src;

  if (imgError) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded border border-slate-700/70 bg-slate-900/70 px-4 py-6 text-center select-none ${className}`}
        style={{ background: cfg.bgGradient }}
      >
        <span className="font-arcade text-2xl text-white">{fighter.name}</span>
        <span className="text-xs text-slate-300 mt-1">{fighter.alias}</span>
      </div>
    );
  }

  // While Pablo's left-panel crop prepares (~10ms), render an instant clipped fallback showing only the left portrait slice
  if (isPablo && !resolvedSrc) {
    return (
      <div
        className={`relative overflow-hidden select-none pointer-events-none aspect-[388/1024] ${className}`}
        style={{
          transform: flipped ? 'scaleX(-1)' : undefined,
          filter: defeated
            ? 'grayscale(0.95) brightness(0.45) contrast(1.25)'
            : 'drop-shadow(0 16px 28px rgba(0, 0, 0, 0.85)) contrast(1.04) saturate(1.06)',
        }}
      >
        <img
          src={cfg.src}
          alt={fighter.name}
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setImgError(true)}
          className="h-full max-w-none block"
          style={{ width: '395.8%', objectFit: 'cover', objectPosition: 'left top' }}
        />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc ?? cfg.src}
      alt={fighter.name}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setImgError(true)}
      className={`select-none pointer-events-none object-contain ${className}`}
      style={{
        imageRendering: 'auto',
        transform: flipped ? 'scaleX(-1)' : undefined,
        filter: defeated
          ? 'grayscale(0.95) brightness(0.45) contrast(1.25) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.9))'
          : 'drop-shadow(0 18px 32px rgba(0, 0, 0, 0.88)) contrast(1.04) saturate(1.06)',
      }}
    />
  );
};
