import { GAME_CONFIG } from './config';

export const SIMULATION_HZ = GAME_CONFIG.simulationHz;
export const FIXED_DT = GAME_CONFIG.fixedDt;

export function framesToSeconds(frames: number): number {
  return frames / SIMULATION_HZ;
}

export function secondsToFrames(seconds: number): number {
  return Math.round(seconds * SIMULATION_HZ);
}

export type HitResolution =
  | 'hit'
  | 'block'
  | 'miss'
  | 'counter_hit'
  | 'armor_hit'
  | 'invulnerable';

export interface CancelPolicy {
  onHit: boolean;
  onBlock: boolean;
  onCounterHit: boolean;
  onWhiff: boolean;
  allowedTargets: string[];
}

export interface CollisionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttackCollisionData {
  hitboxes: CollisionBox[];
  hurtboxes: CollisionBox[];
}

export type HitLevel = 'mid' | 'low' | 'overhead' | 'unblockable';

export interface AttackDefinition {
  id: string;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  damage: number;
  hitstunFrames: number;
  blockstunFrames: number;
  hitstopFrames: number;
  knockbackX: number;
  knockbackY: number;
  meterGain: number;
  chainRank: number;
  cancelPolicy: CancelPolicy;
  isMultiHit: boolean;
  multiHitIntervalFrames?: number;
  invulnerabilityFrames: number;
  hitLevel?: HitLevel;
  isProjectile?: boolean;
  isLauncher?: boolean;
  isHeavy?: boolean;
  localHitbox: CollisionBox; // x relative to center facing right, y relative to feet (negative = up)
}

export interface DamageContext {
  baseDamage: number;
  powerMultiplier: number;
  comboMultiplier: number;
  counterMultiplier: number;
  defenseMultiplier: number;
}

export interface ComboState {
  hitCount: number;
  totalDamage: number;
  scaling: number;
  lastHitTime: number;
  active: boolean;
  moveSequence: string[];
}

export type FighterMachineState =
  | 'IDLE'
  | 'WALK'
  | 'DASH'
  | 'JUMP'
  | 'CROUCH'
  | 'BLOCK'
  | 'LIGHT_PUNCH'
  | 'HEAVY_PUNCH'
  | 'LIGHT_KICK'
  | 'HEAVY_KICK'
  | 'SPECIAL'
  | 'SUPER'
  | 'HITSTUN'
  | 'BLOCKSTUN'
  | 'DIZZY'
  | 'KNOCKDOWN'
  | 'WAKEUP'
  | 'KO'
  | 'VICTORY';

export interface FighterStateRule {
  state: FighterMachineState;
  interruptible: boolean;
  priority: number;
  canBlock: boolean;
  canBeHit: boolean;
  allowedTransitions: readonly FighterMachineState[];
}

export const FIGHTER_STATE_RULES: Record<FighterMachineState, FighterStateRule> = {
  IDLE: {
    state: 'IDLE',
    interruptible: true,
    priority: 0,
    canBlock: true,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'WALK', 'DASH', 'JUMP', 'CROUCH', 'BLOCK',
      'LIGHT_PUNCH', 'HEAVY_PUNCH', 'LIGHT_KICK', 'HEAVY_KICK',
      'SPECIAL', 'SUPER', 'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  WALK: {
    state: 'WALK',
    interruptible: true,
    priority: 1,
    canBlock: true,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'WALK', 'DASH', 'JUMP', 'CROUCH', 'BLOCK',
      'LIGHT_PUNCH', 'HEAVY_PUNCH', 'LIGHT_KICK', 'HEAVY_KICK',
      'SPECIAL', 'SUPER', 'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  CROUCH: {
    state: 'CROUCH',
    interruptible: true,
    priority: 1,
    canBlock: true,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'WALK', 'DASH', 'JUMP', 'CROUCH', 'BLOCK',
      'LIGHT_PUNCH', 'HEAVY_PUNCH', 'LIGHT_KICK', 'HEAVY_KICK',
      'SPECIAL', 'SUPER', 'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  JUMP: {
    state: 'JUMP',
    interruptible: true,
    priority: 2,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'JUMP', 'LIGHT_PUNCH', 'HEAVY_PUNCH', 'LIGHT_KICK', 'HEAVY_KICK',
      'SPECIAL', 'SUPER', 'HITSTUN', 'KO', 'VICTORY',
    ],
  },
  DASH: {
    state: 'DASH',
    interruptible: false,
    priority: 3,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'CROUCH', 'JUMP',
      'LIGHT_PUNCH', 'HEAVY_PUNCH', 'LIGHT_KICK', 'HEAVY_KICK',
      'SPECIAL', 'SUPER', 'HITSTUN', 'KO', 'VICTORY',
    ],
  },
  BLOCK: {
    state: 'BLOCK',
    interruptible: false,
    priority: 4,
    canBlock: true,
    canBeHit: true,
    allowedTransitions: ['IDLE', 'BLOCK', 'BLOCKSTUN', 'HITSTUN', 'KO', 'VICTORY'],
  },
  LIGHT_PUNCH: {
    state: 'LIGHT_PUNCH',
    interruptible: false,
    priority: 5,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'JUMP', 'LIGHT_PUNCH', 'LIGHT_KICK', 'HEAVY_PUNCH', 'HEAVY_KICK',
      'SPECIAL', 'SUPER', 'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  LIGHT_KICK: {
    state: 'LIGHT_KICK',
    interruptible: false,
    priority: 5,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'JUMP', 'HEAVY_PUNCH', 'HEAVY_KICK',
      'SPECIAL', 'SUPER', 'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  HEAVY_PUNCH: {
    state: 'HEAVY_PUNCH',
    interruptible: false,
    priority: 6,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'JUMP', 'HEAVY_KICK', 'SPECIAL', 'SUPER',
      'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  HEAVY_KICK: {
    state: 'HEAVY_KICK',
    interruptible: false,
    priority: 6,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'JUMP', 'SPECIAL', 'SUPER',
      'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  SPECIAL: {
    state: 'SPECIAL',
    interruptible: false,
    priority: 7,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: [
      'IDLE', 'JUMP', 'SUPER', 'HITSTUN', 'BLOCKSTUN', 'DIZZY', 'KO', 'VICTORY',
    ],
  },
  SUPER: {
    state: 'SUPER',
    interruptible: false,
    priority: 8,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: ['IDLE', 'JUMP', 'HITSTUN', 'KO', 'VICTORY'],
  },
  HITSTUN: {
    state: 'HITSTUN',
    interruptible: false,
    priority: 9,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: ['IDLE', 'HITSTUN', 'DIZZY', 'KNOCKDOWN', 'KO', 'VICTORY'],
  },
  BLOCKSTUN: {
    state: 'BLOCKSTUN',
    interruptible: false,
    priority: 9,
    canBlock: true,
    canBeHit: true,
    allowedTransitions: ['IDLE', 'BLOCK', 'BLOCKSTUN', 'HITSTUN', 'KO', 'VICTORY'],
  },
  DIZZY: {
    state: 'DIZZY',
    interruptible: false,
    priority: 9,
    canBlock: false,
    canBeHit: true,
    allowedTransitions: ['IDLE', 'HITSTUN', 'KO', 'VICTORY'],
  },
  KNOCKDOWN: {
    state: 'KNOCKDOWN',
    interruptible: false,
    priority: 9,
    canBlock: false,
    canBeHit: false,
    allowedTransitions: ['WAKEUP', 'KO', 'VICTORY'],
  },
  WAKEUP: {
    state: 'WAKEUP',
    interruptible: false,
    priority: 8,
    canBlock: true,
    canBeHit: true,
    allowedTransitions: ['IDLE', 'BLOCK', 'KO', 'VICTORY'],
  },
  KO: {
    state: 'KO',
    interruptible: false,
    priority: 10,
    canBlock: false,
    canBeHit: false,
    allowedTransitions: ['KO'],
  },
  VICTORY: {
    state: 'VICTORY',
    interruptible: false,
    priority: 10,
    canBlock: false,
    canBeHit: false,
    allowedTransitions: ['VICTORY'],
  },
};

export function canTransitionFighterState(
  from: FighterMachineState,
  to: FighterMachineState
): boolean {
  return FIGHTER_STATE_RULES[from].allowedTransitions.includes(to);
}

const POWER_TARGETS = [
  'power_hadou',
  'power_shoryu',
  'power_slam',
  'power_tornado',
];

export const ATTACK_DEFINITIONS: Record<string, AttackDefinition> = {
  light_punch: {
    id: 'light_punch',
    startupFrames: 3,
    activeFrames: 5,
    recoveryFrames: 8,
    damage: 28,
    hitstunFrames: 23,
    blockstunFrames: 10,
    hitstopFrames: 2,
    knockbackX: 85,
    knockbackY: 0,
    meterGain: 18,
    chainRank: 1,
    cancelPolicy: {
      onHit: true,
      onBlock: true,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: ['light_punch', 'light_kick', 'heavy_punch', 'heavy_kick', 'uppercut', ...POWER_TARGETS, 'super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 0,
    hitLevel: 'mid',
    localHitbox: { x: 0, y: -158, width: 164, height: 80 },
  },
  light_kick: {
    id: 'light_kick',
    startupFrames: 4,
    activeFrames: 6,
    recoveryFrames: 9,
    damage: 36,
    hitstunFrames: 25,
    blockstunFrames: 11,
    hitstopFrames: 3,
    knockbackX: 110,
    knockbackY: 0,
    meterGain: 22,
    chainRank: 2,
    cancelPolicy: {
      onHit: true,
      onBlock: true,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: ['heavy_punch', 'heavy_kick', 'uppercut', ...POWER_TARGETS, 'super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 0,
    hitLevel: 'low',
    localHitbox: { x: 0, y: -130, width: 180, height: 86 },
  },
  heavy_punch: {
    id: 'heavy_punch',
    startupFrames: 5,
    activeFrames: 7,
    recoveryFrames: 13,
    damage: 58,
    hitstunFrames: 29,
    blockstunFrames: 14,
    hitstopFrames: 4,
    knockbackX: 175,
    knockbackY: -120,
    meterGain: 28,
    chainRank: 3,
    cancelPolicy: {
      onHit: true,
      onBlock: false,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: ['heavy_kick', 'uppercut', ...POWER_TARGETS, 'super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 0,
    isHeavy: true,
    hitLevel: 'mid',
    localHitbox: { x: 0, y: -162, width: 196, height: 94 },
  },
  heavy_kick: {
    id: 'heavy_kick',
    startupFrames: 7,
    activeFrames: 7,
    recoveryFrames: 14,
    damage: 74,
    hitstunFrames: 32,
    blockstunFrames: 16,
    hitstopFrames: 5,
    knockbackX: 285,
    knockbackY: -195,
    meterGain: 34,
    chainRank: 4,
    cancelPolicy: {
      onHit: true,
      onBlock: false,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: [...POWER_TARGETS, 'super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 0,
    isHeavy: true,
    hitLevel: 'low',
    localHitbox: { x: 0, y: -148, width: 212, height: 98 },
  },
  uppercut: {
    id: 'uppercut',
    startupFrames: 5,
    activeFrames: 8,
    recoveryFrames: 16,
    damage: 72,
    hitstunFrames: 35,
    blockstunFrames: 15,
    hitstopFrames: 5,
    knockbackX: 160,
    knockbackY: -510,
    meterGain: 32,
    chainRank: 4,
    cancelPolicy: {
      onHit: true,
      onBlock: false,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: [...POWER_TARGETS, 'super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 0,
    isLauncher: true,
    isHeavy: true,
    hitLevel: 'mid',
    localHitbox: { x: 0, y: -200, width: 178, height: 172 },
  },
  power_hadou: {
    id: 'power_hadou',
    startupFrames: 8,
    activeFrames: 8,
    recoveryFrames: 14,
    damage: 86,
    hitstunFrames: 31,
    blockstunFrames: 14,
    hitstopFrames: 5,
    knockbackX: 250,
    knockbackY: -140,
    meterGain: 36,
    chainRank: 5,
    cancelPolicy: {
      onHit: true,
      onBlock: false,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: ['super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 0,
    isProjectile: true,
    isHeavy: true,
    hitLevel: 'mid',
    localHitbox: { x: 0, y: -155, width: 205, height: 112 },
  },
  power_shoryu: {
    id: 'power_shoryu',
    startupFrames: 4,
    activeFrames: 12,
    recoveryFrames: 17,
    damage: 108,
    hitstunFrames: 37,
    blockstunFrames: 16,
    hitstopFrames: 5,
    knockbackX: 220,
    knockbackY: -540,
    meterGain: 40,
    chainRank: 5,
    cancelPolicy: {
      onHit: true,
      onBlock: false,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: ['super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 11,
    isLauncher: true,
    isHeavy: true,
    hitLevel: 'mid',
    localHitbox: { x: 0, y: -212, width: 186, height: 188 },
  },
  power_slam: {
    id: 'power_slam',
    startupFrames: 6,
    activeFrames: 11,
    recoveryFrames: 14,
    damage: 98,
    hitstunFrames: 34,
    blockstunFrames: 15,
    hitstopFrames: 5,
    knockbackX: 340,
    knockbackY: -230,
    meterGain: 38,
    chainRank: 5,
    cancelPolicy: {
      onHit: true,
      onBlock: false,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: ['super'],
    },
    isMultiHit: false,
    invulnerabilityFrames: 0,
    isHeavy: true,
    hitLevel: 'overhead',
    localHitbox: { x: 0, y: -150, width: 218, height: 124 },
  },
  power_tornado: {
    id: 'power_tornado',
    startupFrames: 5,
    activeFrames: 20,
    recoveryFrames: 13,
    damage: 42,
    hitstunFrames: 32,
    blockstunFrames: 14,
    hitstopFrames: 3,
    knockbackX: 140,
    knockbackY: -150,
    meterGain: 18,
    chainRank: 5,
    cancelPolicy: {
      onHit: true,
      onBlock: false,
      onCounterHit: true,
      onWhiff: false,
      allowedTargets: ['super'],
    },
    isMultiHit: true,
    multiHitIntervalFrames: 7,
    invulnerabilityFrames: 0,
    isHeavy: true,
    hitLevel: 'mid',
    localHitbox: { x: -24, y: -164, width: 238, height: 138 },
  },
  super: {
    id: 'super',
    startupFrames: 12,
    activeFrames: 25,
    recoveryFrames: 19,
    damage: 78,
    hitstunFrames: 47,
    blockstunFrames: 18,
    hitstopFrames: 5,
    knockbackX: 190,
    knockbackY: -240,
    meterGain: 0,
    chainRank: 6,
    cancelPolicy: {
      onHit: false,
      onBlock: false,
      onCounterHit: false,
      onWhiff: false,
      allowedTargets: [],
    },
    isMultiHit: true,
    multiHitIntervalFrames: 7,
    invulnerabilityFrames: 27,
    isHeavy: true,
    hitLevel: 'mid',
    localHitbox: { x: -16, y: -188, width: 300, height: 188 },
  },
};

export function validateAttack(attack: AttackDefinition): string[] {
  const errors: string[] = [];

  if (attack.startupFrames < 0) errors.push('Invalid startup');
  if (attack.activeFrames <= 0) errors.push('Invalid active frames');
  if (attack.recoveryFrames < 0) errors.push('Invalid recovery');
  if (attack.damage < 0) errors.push('Invalid damage');
  if (attack.hitstunFrames < 0) errors.push('Invalid hitstun');
  if (attack.blockstunFrames < 0) errors.push('Invalid blockstun');
  if (attack.hitstopFrames < 0) errors.push('Invalid hitstop');

  return errors;
}

export function getAttackTotalFrames(attack: AttackDefinition): number {
  return attack.startupFrames + attack.activeFrames + attack.recoveryFrames;
}

export function getAttackFrameAdvantage(attack: AttackDefinition): {
  onHit: number;
  onBlock: number;
  whiffTotal: number;
} {
  const remainingAfterFirstActive = Math.max(0, attack.activeFrames - 1) + attack.recoveryFrames;
  return {
    onHit: attack.hitstunFrames - remainingAfterFirstActive,
    onBlock: attack.blockstunFrames - remainingAfterFirstActive,
    whiffTotal: getAttackTotalFrames(attack),
  };
}

export function calculateFinalDamage(context: DamageContext): number {
  const values = [
    context.baseDamage,
    context.powerMultiplier,
    context.comboMultiplier,
    context.counterMultiplier,
    context.defenseMultiplier,
  ];

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Invalid damage calculation input');
  }

  return Math.max(
    0,
    Math.round(
      context.baseDamage *
        context.powerMultiplier *
        context.comboMultiplier *
        context.counterMultiplier *
        context.defenseMultiplier
    )
  );
}

export function getComboScaling(hitCount: number, minimumScaling = 0.25): number {
  const scaling = 1 - Math.max(0, hitCount - 1) * 0.08;
  return Math.max(minimumScaling, Math.min(1, scaling));
}

export function isInfiniteComboLoop(
  moveSequence: readonly string[],
  nextMove: string
): boolean {
  if (moveSequence.length < 4) return false;
  // Detect repeating the exact same light/special loop 3+ consecutive times
  const recent = moveSequence.slice(-4);
  if (recent.every((m) => m === nextMove)) return true;
  if (
    recent.length === 4 &&
    recent[0] === recent[2] &&
    recent[1] === recent[3] &&
    nextMove === recent[0] &&
    moveSequence.length >= 6
  ) {
    return true;
  }
  return false;
}

export function intersectsAABB(a: CollisionBox, b: CollisionBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function canCancelWithPolicy(
  attack: AttackDefinition,
  resolution: HitResolution | null,
  nextTarget: string,
  comboSequence: readonly string[] = []
): boolean {
  if (!attack.cancelPolicy.allowedTargets.includes(nextTarget)) {
    return false;
  }
  if (isInfiniteComboLoop(comboSequence, nextTarget)) {
    return false;
  }
  if (resolution === 'counter_hit') {
    return attack.cancelPolicy.onCounterHit || attack.cancelPolicy.onHit;
  }
  if (resolution === 'hit') {
    return attack.cancelPolicy.onHit;
  }
  if (resolution === 'block') {
    return attack.cancelPolicy.onBlock;
  }
  if (resolution === 'miss' || resolution === null) {
    return attack.cancelPolicy.onWhiff;
  }
  return false;
}
