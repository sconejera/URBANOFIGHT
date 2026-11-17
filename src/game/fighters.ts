import type { AttackDefinition } from './combat';

export type FighterId =
  | 'marcianeke'
  | 'pablo_chille'
  | 'juliano_sosa'
  | 'jere_klein'
  | 'bayron_fire'
  | 'loyalty'
  | 'cris_mj'
  | 'disquera_internacional';

export type AiPolicy = 'rushdown' | 'tactical' | 'zoner' | 'boss';

export interface SongMotif {
  title: string;
  bpm: number;
  wave: OscillatorType;
  bassFreq: number;
  notes: number[];
  stepSec: number;
}

export interface PowerMoveNames {
  hadou: string;   // ↓ ↘ → + Puño (X / Y)
  shoryu: string;  // → ↓ ↘ + Puño (X / Y)
  slam: string;    // ↓ ↙ ← + Patada (A / B)
  tornado: string; // ← ↙ ↓ ↘ → + Patada (A / B)
}

export interface FighterProfile {
  id: FighterId;
  name: string;
  alias: string;
  barrio: string;
  isBoss: boolean;
  playable: boolean;
  scale: number;
  maxHp: number;
  speed: number;
  jumpVel: number;
  powerMult: number;
  aiPolicy: AiPolicy;
  colors: {
    primary: string;
    secondary: string;
    skin: string;
    hair: string;
    accent: string;
    glasses?: string;
    aura: string;
  };
  accessories: {
    hat?: 'bucket' | 'cap' | 'horns' | 'none';
    glasses?: 'neon' | 'dark' | 'gold' | 'glow_eyes' | 'none';
    chain?: boolean;
    wings?: boolean;
    hairStyle: 'spiky' | 'fade' | 'braids' | 'slick' | 'ponytail' | 'curls' | 'horns';
  };
  specialName: string;
  superName: string;
  passiveTrait?: string;
  attackOverrides?: Partial<Record<string, Partial<AttackDefinition>>>;
  powerMoves: PowerMoveNames;
  /** Frases que SOLO se dicen al conectar combos (2+ golpes o especiales) */
  comboPhrases: {
    twoHit: string;
    threeHit: string;
    fourPlus: string;
    superHit: string;
  };
  songMotif: SongMotif;
}

export const FIGHTERS: Record<FighterId, FighterProfile> = {
  marcianeke: {
    id: 'marcianeke',
    name: 'Marcianeke',
    alias: 'El Marciano',
    barrio: 'Talca · Santiago',
    isBoss: false,
    playable: true,
    scale: 1,
    maxHp: 1000,
    speed: 355,
    jumpVel: 740,
    powerMult: 1.0,
    aiPolicy: 'rushdown',
    colors: {
      primary: '#84cc16',
      secondary: '#18181b',
      skin: '#e0b899',
      hair: '#bef264',
      accent: '#a855f7',
      glasses: '#4ade80',
      aura: '#84cc16',
    },
    accessories: {
      hat: 'none',
      glasses: 'neon',
      chain: true,
      hairStyle: 'spiky',
    },
    specialName: 'Onda Marciana',
    superName: 'Mambo Espacial',
    passiveTrait: 'Velocidad galáctica: Tornado multihit rápido y dashes de bajo recovery.',
    attackOverrides: {
      power_tornado: { damage: 46, activeFrames: 24, multiHitIntervalFrames: 6 },
    },
    powerMoves: {
      hadou: 'Onda Marciana',
      shoryu: 'Gancho Dimelo Ma',
      slam: 'Pisotón Galáctico',
      tornado: 'Huracán Brrr',
    },
    comboPhrases: {
      twoHit: '¡Qué pasa, ma!',
      threeHit: '¡Llegó el Marcianeke!',
      fourPlus: '¡Dimelo ma, puro corte!',
      superHit: '¡Desde otro planeta, brrr!',
    },
    songMotif: {
      title: 'Hook · Mambo Espacial',
      bpm: 132,
      wave: 'sawtooth',
      bassFreq: 55,
      notes: [329.63, 392.0, 440.0, 392.0, 493.88, 440.0, 329.63],
      stepSec: 0.11,
    },
  },
  pablo_chille: {
    id: 'pablo_chille',
    name: 'Pablo Chill-E',
    alias: 'El Shishi Boss',
    barrio: 'Puente Alto',
    isBoss: false,
    playable: true,
    scale: 1.04,
    maxHp: 1100,
    speed: 315,
    jumpVel: 700,
    powerMult: 1.12,
    aiPolicy: 'tactical',
    colors: {
      primary: '#dc2626',
      secondary: '#111827',
      skin: '#d4a37f',
      hair: '#1f2937',
      accent: '#fbbf24',
      glasses: '#0f172a',
      aura: '#ef4444',
    },
    accessories: {
      hat: 'bucket',
      glasses: 'dark',
      chain: true,
      hairStyle: 'fade',
    },
    specialName: 'Rugido Shishi',
    superName: 'Shishigang Sin Miedo',
    passiveTrait: 'Poder de la calle: Golpes pesados con mayor impacto y daño en el uppercut.',
    attackOverrides: {
      heavy_punch: { damage: 68, hitstopFrames: 6 },
      uppercut: { damage: 84 },
    },
    powerMoves: {
      hadou: 'Rugido Shishi',
      shoryu: 'Uppercut del Puente',
      slam: 'Impacto My Blood',
      tornado: 'Torbellino Shishigang',
    },
    comboPhrases: {
      twoHit: '¡Shishigang!',
      threeHit: '¡Real hasta el fin!',
      fourPlus: '¡Puente Alto en la casa!',
      superHit: '¡No vendemos el alma!',
    },
    songMotif: {
      title: 'Hook · Drill del Puente',
      bpm: 140,
      wave: 'square',
      bassFreq: 49,
      notes: [220.0, 233.08, 220.0, 196.0, 220.0, 261.63, 220.0],
      stepSec: 0.12,
    },
  },
  juliano_sosa: {
    id: 'juliano_sosa',
    name: 'Juliano Sosa',
    alias: 'Sosa Mafia',
    barrio: 'Puente Alto',
    isBoss: false,
    playable: true,
    scale: 1.03,
    maxHp: 1050,
    speed: 325,
    jumpVel: 710,
    powerMult: 1.08,
    aiPolicy: 'tactical',
    colors: {
      primary: '#b91c1c',
      secondary: '#1c1917',
      skin: '#d9ab88',
      hair: '#18181b',
      accent: '#f59e0b',
      glasses: '#f59e0b',
      aura: '#f59e0b',
    },
    accessories: {
      hat: 'none',
      glasses: 'gold',
      chain: true,
      hairStyle: 'slick',
    },
    specialName: 'Mic de Oro',
    superName: 'Cochinae Letal',
    passiveTrait: 'Fuerza bruta mafiosa: Slam overhead demoledor con alto knockback.',
    attackOverrides: {
      power_slam: { damage: 110, knockbackX: 380 },
    },
    powerMoves: {
      hadou: 'Mic de Oro',
      shoryu: 'Gancho Sosa Mafia',
      slam: 'Carga Cochinae',
      tornado: 'Giro del Jefe',
    },
    comboPhrases: {
      twoHit: '¡Sosa Mafia!',
      threeHit: '¡Puro Cochinae, papá!',
      fourPlus: '¡De Puente pa’l mundo!',
      superHit: '¡Respeto pa’ la mafia!',
    },
    songMotif: {
      title: 'Hook · Sosa Mafia',
      bpm: 124,
      wave: 'triangle',
      bassFreq: 58.27,
      notes: [293.66, 349.23, 392.0, 440.0, 392.0, 349.23, 293.66],
      stepSec: 0.12,
    },
  },
  jere_klein: {
    id: 'jere_klein',
    name: 'Jere Klein',
    alias: 'El Menor',
    barrio: 'Colina · Santiago',
    isBoss: false,
    playable: true,
    scale: 0.98,
    maxHp: 960,
    speed: 375,
    jumpVel: 765,
    powerMult: 0.96,
    aiPolicy: 'rushdown',
    colors: {
      primary: '#06b6d4',
      secondary: '#0f172a',
      skin: '#e5bea0',
      hair: '#27272a',
      accent: '#f8fafc',
      aura: '#22d3ee',
    },
    accessories: {
      hat: 'cap',
      glasses: 'none',
      chain: true,
      hairStyle: 'fade',
    },
    specialName: 'Flow Congelado',
    superName: 'Chika Mala Rush',
    passiveTrait: 'El Menor ágil: Jab ultrarrápido (startup de 2 frames) para interruptores instantáneos.',
    attackOverrides: {
      light_punch: { startupFrames: 2, damage: 32 },
    },
    powerMoves: {
      hadou: 'Flow Congelado',
      shoryu: 'Uppercut 6.5',
      slam: 'Barrida del Menor',
      tornado: 'Ráfaga Ando en la Mía',
    },
    comboPhrases: {
      twoHit: '¡X eso, hermano!',
      threeHit: '¡Ando en la mía!',
      fourPlus: '¡El menor que más suena!',
      superHit: '¡Chika mala, toma!',
    },
    songMotif: {
      title: 'Hook · Bell Trap 6.5',
      bpm: 128,
      wave: 'sine',
      bassFreq: 61.74,
      notes: [523.25, 493.88, 440.0, 523.25, 587.33, 523.25, 659.25],
      stepSec: 0.1,
    },
  },
  bayron_fire: {
    id: 'bayron_fire',
    name: 'Bayron Fire',
    alias: 'El Mágico',
    barrio: 'La Pintana',
    isBoss: false,
    playable: true,
    scale: 1.01,
    maxHp: 1020,
    speed: 340,
    jumpVel: 725,
    powerMult: 1.05,
    aiPolicy: 'zoner',
    colors: {
      primary: '#f97316',
      secondary: '#18181b',
      skin: '#d6a47e',
      hair: '#111827',
      accent: '#facc15',
      glasses: '#18181b',
      aura: '#fb923c',
    },
    accessories: {
      hat: 'none',
      glasses: 'dark',
      chain: true,
      hairStyle: 'curls',
    },
    specialName: 'Bola Mágica',
    superName: 'Fuego en la Pista',
    passiveTrait: 'Zoner de fuego: Proyectil con mayor velocidad de casteo y daño concentrado.',
    attackOverrides: {
      power_hadou: { damage: 96, startupFrames: 7 },
    },
    powerMoves: {
      hadou: 'Bola Mágica',
      shoryu: 'Volcán de La Pintana',
      slam: 'Choque Dembow',
      tornado: 'Ciclón en Llamas',
    },
    comboPhrases: {
      twoHit: '¡Modo fuego!',
      threeHit: '¡Prende la pista!',
      fourPlus: '¡El Mágico te quema!',
      superHit: '¡Fuegooo sin freno!',
    },
    songMotif: {
      title: 'Hook · Mágico Dembow',
      bpm: 118,
      wave: 'sawtooth',
      bassFreq: 65.41,
      notes: [349.23, 392.0, 440.0, 349.23, 523.25, 440.0, 392.0],
      stepSec: 0.11,
    },
  },
  loyalty: {
    id: 'loyalty',
    name: 'Loyalty',
    alias: 'La Jefa',
    barrio: 'Santiago Centro',
    isBoss: false,
    playable: true,
    scale: 0.98,
    maxHp: 970,
    speed: 370,
    jumpVel: 760,
    powerMult: 0.98,
    aiPolicy: 'rushdown',
    colors: {
      primary: '#ec4899',
      secondary: '#1e1b2e',
      skin: '#dfb394',
      hair: '#1f1224',
      accent: '#e2e8f0',
      glasses: '#f472b6',
      aura: '#ec4899',
    },
    accessories: {
      hat: 'none',
      glasses: 'neon',
      chain: true,
      hairStyle: 'ponytail',
    },
    specialName: 'Onda Diamante',
    superName: 'La Jefa Manda',
    passiveTrait: 'Presión constante: Patada ligera con ventaja de frames en bloqueo (safe pressure).',
    attackOverrides: {
      light_kick: { recoveryFrames: 7, blockstunFrames: 13 },
    },
    powerMoves: {
      hadou: 'Onda Diamante',
      shoryu: 'Tacón Ascendente',
      slam: 'Quiebre de Tarima',
      tornado: 'Patada Giratoria Jefa',
    },
    comboPhrases: {
      twoHit: '¡Puro corte!',
      threeHit: '¡Loyalty en la casa!',
      fourPlus: '¡Sin miedo a nadie!',
      superHit: '¡La Jefa controla el beat!',
    },
    songMotif: {
      title: 'Hook · Corte de Jefa',
      bpm: 112,
      wave: 'triangle',
      bassFreq: 55,
      notes: [440.0, 523.25, 587.33, 523.25, 659.25, 587.33, 440.0],
      stepSec: 0.11,
    },
  },
  cris_mj: {
    id: 'cris_mj',
    name: 'Cris MJ',
    alias: 'El Más Que Suena',
    barrio: 'La Serena',
    isBoss: false,
    playable: true,
    scale: 1.01,
    maxHp: 1040,
    speed: 345,
    jumpVel: 735,
    powerMult: 1.04,
    aiPolicy: 'zoner',
    colors: {
      primary: '#8b5cf6',
      secondary: '#17152b',
      skin: '#ddb08e',
      hair: '#18181b',
      accent: '#f8fafc',
      glasses: '#a78bfa',
      aura: '#a855f7',
    },
    accessories: {
      hat: 'none',
      glasses: 'dark',
      chain: true,
      hairStyle: 'braids',
    },
    specialName: 'Onda Medellín',
    superName: 'Noche en Medellín',
    passiveTrait: 'El Más Que Suena: Shoryu antiaéreo con mayor ventana de invulnerabilidad.',
    attackOverrides: {
      power_shoryu: { damage: 116, invulnerabilityFrames: 15 },
    },
    powerMoves: {
      hadou: 'Onda Medellín',
      shoryu: 'Gancho Gata Only',
      slam: 'Dash de La Serena',
      tornado: 'Tornado El Más Que Suena',
    },
    comboPhrases: {
      twoHit: '¡El Más Que Suena!',
      threeHit: '¡Una noche en Medellín!',
      fourPlus: '¡Gata Only, ya tú sabes!',
      superHit: '¡De La Serena pa’l mundo!',
    },
    songMotif: {
      title: 'Hook · Medellín Bounce',
      bpm: 104,
      wave: 'triangle',
      bassFreq: 61.74,
      notes: [392.0, 493.88, 587.33, 523.25, 493.88, 440.0, 392.0],
      stepSec: 0.12,
    },
  },
  disquera_internacional: {
    id: 'disquera_internacional',
    name: 'Disquera Internacional',
    alias: 'El Diablo del Contrato',
    barrio: 'Torre Corporativa · Piso 666',
    isBoss: true,
    playable: false,
    scale: 1.22,
    maxHp: 1450,
    speed: 295,
    jumpVel: 680,
    powerMult: 1.22,
    aiPolicy: 'boss',
    colors: {
      primary: '#991b1b',
      secondary: '#09090b',
      skin: '#b91c1c',
      hair: '#fbbf24',
      accent: '#facc15',
      glasses: '#fde047',
      aura: '#dc2626',
    },
    accessories: {
      hat: 'horns',
      glasses: 'glow_eyes',
      chain: true,
      wings: true,
      hairStyle: 'horns',
    },
    specialName: 'Contrato Maldito',
    superName: 'Cláusula 360° Infernal',
    passiveTrait: 'Jefe Corporativo: Proyectiles gigantes y Super con daño masivo de contrato.',
    attackOverrides: {
      power_hadou: { damage: 105, activeFrames: 12 },
      super: { damage: 92 },
    },
    powerMoves: {
      hadou: 'Contrato Maldito',
      shoryu: 'Garra Corporativa',
      slam: 'Embargo Total',
      tornado: 'Tormenta de Regalías',
    },
    comboPhrases: {
      twoHit: '¡Firma el contrato!',
      threeHit: '¡Tus derechos son míos!',
      fourPlus: '¡Nadie escapa del sello!',
      superHit: '¡Te compro el alma al 10%!',
    },
    songMotif: {
      title: 'Hook · Órgano del Sello 360°',
      bpm: 138,
      wave: 'sawtooth',
      bassFreq: 41.2,
      notes: [196.0, 233.08, 293.66, 277.18, 233.08, 196.0, 146.83],
      stepSec: 0.13,
    },
  },
};

export const PLAYABLE_FIGHTER_IDS: FighterId[] = [
  'marcianeke',
  'pablo_chille',
  'juliano_sosa',
  'jere_klein',
  'bayron_fire',
  'loyalty',
  'cris_mj',
];

export const ALL_OPPONENT_IDS: FighterId[] = [
  ...PLAYABLE_FIGHTER_IDS,
  'disquera_internacional',
];
