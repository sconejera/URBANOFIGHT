export type StageId =
  | 'movistar_arena'
  | 'lollapalooza'
  | 'discoteca_pantano'
  | 'cancha_pobla'
  | 'santiago_calle'
  | 'torre_disquera';

export interface StageInfo {
  id: StageId;
  name: string;
  subtitle: string;
  imageSrc: string;
  floorScrim: string;
  floorLine: string;
  accentColor: string;
  isBossStage?: boolean;
}

export const STAGES: Record<StageId, StageInfo> = {
  cancha_pobla: {
    id: 'cancha_pobla',
    name: 'Cancha de la Pobla',
    subtitle: 'Baby Fútbol · Barrios de Santiago',
    imageSrc: '/src/assets/images/stage_cancha_pobla_1794862943144.jpg',
    floorScrim: 'rgba(8, 18, 12, 0.36)',
    floorLine: 'rgba(250, 204, 21, 0.35)',
    accentColor: '#facc15',
  },
  discoteca_pantano: {
    id: 'discoteca_pantano',
    name: 'Discoteca en el Pantano',
    subtitle: 'Neón Verde & Dembow Clandestino',
    imageSrc: '/src/assets/images/stage_discoteca_pantano_1794862942599.jpg',
    floorScrim: 'rgba(6, 22, 16, 0.42)',
    floorLine: 'rgba(74, 222, 128, 0.38)',
    accentColor: '#4ade80',
  },
  lollapalooza: {
    id: 'lollapalooza',
    name: 'Lollapalooza Chile',
    subtitle: 'Parque O’Higgins · Main Stage',
    imageSrc: '/src/assets/images/stage_lollapalooza_1794862941742.jpg',
    floorScrim: 'rgba(14, 8, 28, 0.36)',
    floorLine: 'rgba(34, 211, 238, 0.36)',
    accentColor: '#22d3ee',
  },
  movistar_arena: {
    id: 'movistar_arena',
    name: 'Movistar Arena',
    subtitle: 'Sold Out · 16.000 Almas',
    imageSrc: '/src/assets/images/stage_movistar_arena_1794862940628.jpg',
    floorScrim: 'rgba(9, 12, 28, 0.38)',
    floorLine: 'rgba(244, 63, 94, 0.38)',
    accentColor: '#f43f5e',
  },
  santiago_calle: {
    id: 'santiago_calle',
    name: 'Calle de Santiago',
    subtitle: 'Block Nocturno · Boombox',
    imageSrc: '/src/assets/images/stage_santiago_1794854482733.jpg',
    floorScrim: 'rgba(9, 10, 20, 0.35)',
    floorLine: 'rgba(148, 163, 184, 0.25)',
    accentColor: '#38bdf8',
  },
  torre_disquera: {
    id: 'torre_disquera',
    name: 'Torre Disquera Piso 666',
    subtitle: 'Penthouse del Sello 360°',
    imageSrc: '/src/assets/images/stage_disquera_1794854483321.jpg',
    floorScrim: 'rgba(22, 4, 8, 0.45)',
    floorLine: 'rgba(250, 204, 21, 0.32)',
    accentColor: '#ef4444',
    isBossStage: true,
  },
};

export const SELECTABLE_STAGE_IDS: StageId[] = [
  'cancha_pobla',
  'discoteca_pantano',
  'lollapalooza',
  'movistar_arena',
  'santiago_calle',
  'torre_disquera',
];

export function getArcadeStageForIndex(stageIndex: number, totalStages = 7): StageId {
  if (stageIndex >= totalStages - 1) {
    return 'torre_disquera';
  }
  const tourStages: StageId[] = [
    'cancha_pobla',
    'santiago_calle',
    'discoteca_pantano',
    'lollapalooza',
    'movistar_arena',
    'lollapalooza',
  ];
  return tourStages[Math.max(0, stageIndex) % tourStages.length];
}
