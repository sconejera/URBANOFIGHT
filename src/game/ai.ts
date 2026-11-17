import { ATTACK_DEFINITIONS, framesToSeconds } from './combat';
import { GAME_CONFIG } from './config';
import type { FighterAction, FighterState, InputSnapshot } from './rules';

const AI_EMPTY_INPUT: InputSnapshot = {
  left: false,
  right: false,
  up: false,
  down: false,
  lightPunchPressed: false,
  heavyPunchPressed: false,
  lightKickPressed: false,
  heavyKickPressed: false,
  ultraPressed: false,
  dashPressed: false,
  blockHeld: false,
};

function isOffensiveAction(action: FighterAction): boolean {
  return Boolean(ATTACK_DEFINITIONS[action]);
}

export type AiDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type AiDecisionState =
  | 'APPROACH'
  | 'RETREAT'
  | 'NEUTRAL'
  | 'ATTACK'
  | 'DEFEND'
  | 'PUNISH'
  | 'JUMP'
  | 'SPECIAL'
  | 'RECOVER';

export interface AiDifficultyModifiers {
  id: AiDifficulty;
  label: string;
  reactionDelaySec: number;
  decisionIntervalSec: number;
  blockProbability: number;
  comboChainChance: number;
  punishAccuracy: number;
  specialFrequency: number;
  pressureAggression: number;
}

export const AI_DIFFICULTY_MODIFIERS: Record<AiDifficulty, AiDifficultyModifiers> = {
  easy: {
    id: 'easy',
    label: 'Fácil',
    reactionDelaySec: 0.28,
    decisionIntervalSec: 0.34,
    blockProbability: 0.25,
    comboChainChance: 0.35,
    punishAccuracy: 0.3,
    specialFrequency: 0.4,
    pressureAggression: 0.65,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    reactionDelaySec: 0.17,
    decisionIntervalSec: 0.2,
    blockProbability: 0.55,
    comboChainChance: 0.68,
    punishAccuracy: 0.65,
    specialFrequency: 0.72,
    pressureAggression: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Difícil',
    reactionDelaySec: 0.11,
    decisionIntervalSec: 0.12,
    blockProbability: 0.78,
    comboChainChance: 0.88,
    punishAccuracy: 0.85,
    specialFrequency: 0.9,
    pressureAggression: 1.22,
  },
  expert: {
    id: 'expert',
    label: 'Experto',
    reactionDelaySec: 0.075,
    decisionIntervalSec: 0.08,
    blockProbability: 0.9,
    comboChainChance: 0.96,
    punishAccuracy: 0.96,
    specialFrequency: 1.0,
    pressureAggression: 1.38,
  },
};

export interface ArcadeAiProgression {
  difficulty: AiDifficulty;
  scale: number;
  label: string;
}

const DIFFICULTY_RANK: readonly AiDifficulty[] = ['easy', 'normal', 'hard', 'expert'];

export function getArcadeStageDifficulty(
  baseDifficulty: AiDifficulty,
  stageIndex: number,
  totalStages: number,
  isBoss = false
): ArcadeAiProgression {
  if (isBoss || stageIndex >= totalStages - 1) {
    return {
      difficulty: 'expert',
      scale: 1.48,
      label: `${AI_DIFFICULTY_MODIFIERS.expert.label} · JEFE FINAL`,
    };
  }

  const ratio =
    totalStages > 2
      ? Math.max(0, Math.min(1, stageIndex / Math.max(1, totalStages - 2)))
      : 0;
  const baseRank = Math.max(0, DIFFICULTY_RANK.indexOf(baseDifficulty));
  // Escalate progressively across the 6 pre-boss rivals up to 'hard' (or 'expert' if user chose hard/expert)
  const stageRank = Math.min(
    3,
    Math.max(
      baseRank === 0 ? Math.floor(ratio * 2.4) : baseRank === 1 ? Math.floor(ratio * 2.8) : baseRank,
      Math.floor(ratio * 2.5)
    )
  );
  const resolved = DIFFICULTY_RANK[stageRank] ?? 'normal';
  const baseScale = 0.8 + ratio * 0.48 + baseRank * 0.05;
  return {
    difficulty: resolved,
    scale: Number(baseScale.toFixed(2)),
    label: AI_DIFFICULTY_MODIFIERS[resolved].label,
  };
}

export interface AiObservationState {
  state: AiDecisionState;
  perceivedOppAction: FighterAction;
  perceivedOppActionTimer: number;
  pendingOppAction: FighterAction;
  reactionTimer: number;
  decisionTimer: number;
  deterministicRoll: number;
}

export function createInitialAiObservation(): AiObservationState {
  return {
    state: 'NEUTRAL',
    perceivedOppAction: 'idle',
    perceivedOppActionTimer: 0,
    pendingOppAction: 'idle',
    reactionTimer: 0,
    decisionTimer: 0,
    deterministicRoll: 0.5,
  };
}

function nextPseudoRandom(obs: AiObservationState, cpu: FighterState, opp: FighterState): number {
  const seed =
    Math.abs(Math.sin((cpu.x * 13.7 + opp.x * 7.3 + cpu.actionTimer * 97.1 + opp.hp * 0.37))) %
    1;
  obs.deterministicRoll = seed;
  return seed;
}

function isOpponentInRecovery(opp: FighterState, perceivedAction: FighterAction): boolean {
  const def = ATTACK_DEFINITIONS[perceivedAction];
  if (!def) return false;
  return opp.actionTimer >= framesToSeconds(def.startupFrames + def.activeFrames);
}

export function computeAdvancedCpuInput(
  cpu: FighterState,
  player: FighterState,
  dt: number,
  difficulty: AiDifficulty = 'normal',
  difficultyScale = 1
): InputSnapshot {
  const input: InputSnapshot = { ...AI_EMPTY_INPUT };
  const mods = AI_DIFFICULTY_MODIFIERS[difficulty];

  cpu.aiCooldown = Math.max(0, cpu.aiCooldown - dt);
  cpu.aiBurstTimer = Math.max(0, cpu.aiBurstTimer - dt);

  if (!cpu.aiObs) {
    cpu.aiObs = createInitialAiObservation();
  }
  const obs = cpu.aiObs;

  // Enforce human-like reaction delay: AI cannot react instantaneously on frame 0
  if (player.action !== obs.pendingOppAction) {
    obs.pendingOppAction = player.action;
    obs.reactionTimer = mods.reactionDelaySec / Math.max(0.75, difficultyScale);
  } else if (obs.reactionTimer > 0) {
    obs.reactionTimer = Math.max(0, obs.reactionTimer - dt);
    if (obs.reactionTimer === 0) {
      obs.perceivedOppAction = obs.pendingOppAction;
      obs.perceivedOppActionTimer = player.actionTimer;
    }
  } else {
    obs.perceivedOppAction = player.action;
    obs.perceivedOppActionTimer = player.actionTimer;
  }

  obs.decisionTimer = Math.max(0, obs.decisionTimer - dt);

  const dx = player.x - cpu.x;
  const dist = Math.abs(dx);
  const towardLeft = dx < 0;
  const policy = cpu.profile.aiPolicy;
  const oppIsAttacking = isOffensiveAction(obs.perceivedOppAction);
  const oppRecovering = isOpponentInRecovery(player, obs.perceivedOppAction);
  const cpuLowHp = cpu.hp / cpu.maxHp < 0.32;
  const oppLowHp = player.hp / player.maxHp < 0.28;
  const roll = nextPseudoRandom(obs, cpu, player);

  // State classification
  if (cpu.action === 'hitstun' || cpu.action === 'dizzy' || cpu.action === 'block') {
    obs.state = 'RECOVER';
  } else if (
    oppIsAttacking &&
    !oppRecovering &&
    dist < 190 &&
    policy !== 'rushdown' &&
    roll < mods.blockProbability
  ) {
    obs.state = 'DEFEND';
  } else if (oppRecovering && dist < 210 && roll < mods.punishAccuracy) {
    obs.state = 'PUNISH';
  } else if (
    cpu.superMeter >= GAME_CONFIG.maxSuperMeter &&
    dist < 250 &&
    (oppLowHp || roll < 0.72 * mods.specialFrequency)
  ) {
    obs.state = 'SPECIAL';
  } else {
    const desiredRange =
      policy === 'zoner' ? 280 : policy === 'boss' ? 185 : policy === 'tactical' ? 150 : 120;
    const retreatThreshold = obs.state === 'RETREAT' ? 168 : 140;
    const approachThreshold = desiredRange + (obs.state === 'APPROACH' ? 10 : 38);
    if (policy === 'zoner' && dist < retreatThreshold && !cpuLowHp) {
      obs.state = 'RETREAT';
    } else if (
      (policy === 'boss' || policy === 'tactical') &&
      dist > 280 &&
      roll < 0.28 &&
      cpu.aiCooldown <= 0
    ) {
      obs.state = 'JUMP';
    } else if (dist > approachThreshold) {
      obs.state = 'APPROACH';
    } else if (dist <= 205) {
      obs.state = 'ATTACK';
    } else {
      obs.state = 'NEUTRAL';
    }
  }

  // Execute DEFEND
  if (obs.state === 'DEFEND') {
    input.blockHeld = true;
    return input;
  }

  // Movement & spacing
  const desiredRange =
    policy === 'zoner' ? 280 : policy === 'boss' ? 185 : policy === 'tactical' ? 150 : 120;
  if (obs.state === 'APPROACH') {
    if (towardLeft) input.left = true;
    else input.right = true;
  } else if (obs.state === 'RETREAT') {
    if (towardLeft) input.right = true;
    else input.left = true;
  }

  if (obs.state === 'JUMP' && cpu.y >= GAME_CONFIG.groundY) {
    input.up = true;
    if (towardLeft) input.left = true;
    else input.right = true;
    cpu.aiCooldown = 0.45;
    return input;
  }

  // Boss gap-closer dash
  if (policy === 'boss' && dist > 320 && cpu.aiCooldown <= 0) {
    input.dashPressed = true;
    cpu.aiCooldown = 0.55 / (difficultyScale * mods.pressureAggression);
    return input;
  }

  // Continue burst combo chain if already attacking
  if (cpu.aiCooldown > 0) {
    if (cpu.aiBurstTimer > 0 && roll < mods.comboChainChance) {
      if (cpu.action === 'light_punch' && cpu.hasHitThisAttack) {
        input.lightKickPressed = true;
        return input;
      }
      if (cpu.action === 'light_kick' && cpu.hasHitThisAttack) {
        input.heavyPunchPressed = true;
        return input;
      }
      if (cpu.action === 'heavy_punch' && cpu.hasHitThisAttack) {
        if (cpu.superMeter >= GAME_CONFIG.maxSuperMeter && difficulty !== 'easy') {
          input.ultraPressed = true;
        } else {
          input.heavyKickPressed = true;
        }
        return input;
      }
    }
    return input;
  }

  if (obs.decisionTimer > 0) {
    return input;
  }
  obs.decisionTimer = mods.decisionIntervalSec;

  // Trigger 3-bar Ultra when charged
  if (cpu.superMeter >= GAME_CONFIG.maxSuperMeter && dist < 245) {
    input.ultraPressed = true;
    cpu.aiCooldown = 1.35 / (difficultyScale * mods.pressureAggression);
    return input;
  }

  // Punish window: fast starter or heavy punish
  if (obs.state === 'PUNISH') {
    if (dist <= 155) {
      input.lightPunchPressed = true;
      cpu.aiBurstTimer = 0.48;
      cpu.aiCooldown = 0.72 / (difficultyScale * mods.pressureAggression);
      return input;
    }
    if (dist <= 200) {
      input.heavyKickPressed = true;
      cpu.aiCooldown = 0.85 / (difficultyScale * mods.pressureAggression);
      return input;
    }
  }

  // Boss & Zoner ranged QCF Hadou / Slam mixup
  if (
    dist > 250 &&
    (policy === 'zoner' || policy === 'boss' || policy === 'tactical') &&
    roll < mods.specialFrequency
  ) {
    if (policy === 'boss' && dist > 310 && roll < 0.35) {
      // Boss uses Slam dash mixup sometimes instead of only spamming Hadou
      cpu.dirHistory = [
        { dir: 2, age: 0.08 },
        { dir: 1, age: 0.04 },
        { dir: 4, age: 0.0 },
      ];
      input.heavyKickPressed = true;
      cpu.aiCooldown = 1.05 / (difficultyScale * mods.pressureAggression);
      return input;
    }
    cpu.dirHistory = [
      { dir: 2, age: 0.08 },
      { dir: 3, age: 0.04 },
      { dir: 6, age: 0.0 },
    ];
    input.heavyPunchPressed = true;
    cpu.aiCooldown = (policy === 'boss' ? 1.1 : 1.55) / (difficultyScale * mods.pressureAggression);
    return input;
  }

  if (dist <= 160) {
    if (player.y < GAME_CONFIG.groundY - 60 && policy !== 'rushdown' && roll < mods.specialFrequency) {
      // Anti-air DP
      cpu.dirHistory = [
        { dir: 6, age: 0.08 },
        { dir: 2, age: 0.04 },
        { dir: 3, age: 0.0 },
      ];
      input.heavyPunchPressed = true;
      cpu.aiCooldown = 1.05 / (difficultyScale * mods.pressureAggression);
    } else if (policy === 'boss' && roll < 0.28 * mods.specialFrequency) {
      // Boss Tornado close pressure
      cpu.dirHistory = [
        { dir: 4, age: 0.12 },
        { dir: 2, age: 0.06 },
        { dir: 3, age: 0.03 },
        { dir: 6, age: 0.0 },
      ];
      input.heavyKickPressed = true;
      cpu.aiCooldown = 0.95 / (difficultyScale * mods.pressureAggression);
    } else {
      input.lightPunchPressed = true;
      cpu.aiBurstTimer = 0.45;
      cpu.aiCooldown = (policy === 'boss' ? 0.62 : 0.95) / (difficultyScale * mods.pressureAggression);
    }
  } else if (dist <= 205 && dist >= desiredRange - 80) {
    input.heavyKickPressed = true;
    cpu.aiCooldown = 1.05 / (difficultyScale * mods.pressureAggression);
  }

  return input;
}
