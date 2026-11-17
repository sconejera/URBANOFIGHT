import {
  AiDifficulty,
  AiObservationState,
  computeAdvancedCpuInput,
  createInitialAiObservation,
  getArcadeStageDifficulty,
} from './ai';
import {
  ATTACK_DEFINITIONS,
  AttackDefinition,
  CollisionBox,
  ComboState,
  FighterMachineState,
  HitLevel,
  HitResolution,
  calculateFinalDamage,
  canCancelWithPolicy,
  canTransitionFighterState,
  framesToSeconds,
  getComboScaling,
  intersectsAABB,
  validateAttack,
} from './combat';
import { GAME_CONFIG } from './config';
import { FIGHTERS, FighterId, FighterProfile, PLAYABLE_FIGHTER_IDS } from './fighters';

export {
  ATTACK_DEFINITIONS,
  calculateFinalDamage,
  canCancelWithPolicy,
  canTransitionFighterState,
  framesToSeconds,
  getComboScaling,
  intersectsAABB,
  validateAttack,
};
export type {
  AttackDefinition,
  CollisionBox,
  ComboState,
  FighterMachineState,
  HitLevel,
  HitResolution,
};
export type { AiDifficulty };

export const ARENA_WIDTH = GAME_CONFIG.logicalWidth;
export const ARENA_HEIGHT = GAME_CONFIG.logicalHeight;
export const GROUND_Y = GAME_CONFIG.groundY;
export const GRAVITY = GAME_CONFIG.gravity;
export const STAGE_LEFT = GAME_CONFIG.stageLeft;
export const STAGE_RIGHT = GAME_CONFIG.stageRight;
export const ROUND_TIME_SEC = GAME_CONFIG.defaultRoundTime;
export const MAX_SUPER_METER = GAME_CONFIG.maxSuperMeter;

export type GameMode = 'arcade' | 'vs_cpu' | 'vs_2p' | 'training';
export type GameScreenState =
  | 'start'
  | 'intro_video'
  | 'title'
  | 'vs'
  | 'playing'
  | 'paused'
  | 'gameover';
export type RoundPhase = 'intro' | 'fight' | 'finish_him' | 'ko' | 'match_end';

export type TrainingDummyMode = 'stationary' | 'blocking' | 'attacking' | 'guard_after_hit';

export interface TrainingConfig {
  dummyMode: TrainingDummyMode;
  infiniteHealth: boolean;
  infiniteMeter: boolean;
  showHitboxes: boolean;
  showFrameData: boolean;
  showInputHistory: boolean;
}

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  dummyMode: 'stationary',
  infiniteHealth: true,
  infiniteMeter: false,
  showHitboxes: true,
  showFrameData: true,
  showInputHistory: true,
};

export interface FrameDataReadout {
  moveId: string;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  onHitAdvantage: number;
  onBlockAdvantage: number;
  lastDamage: number;
  comboTotalDamage: number;
  lastResolution: HitResolution | null;
}

export type PowerMoveAction =
  | 'power_hadou'
  | 'power_shoryu'
  | 'power_slam'
  | 'power_tornado';

export type FighterAction =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'jump'
  | 'dash'
  | 'block'
  | 'light_punch'
  | 'heavy_punch'
  | 'light_kick'
  | 'heavy_kick'
  | 'uppercut'
  | PowerMoveAction
  | 'super'
  | 'dizzy'
  | 'hitstun'
  | 'ko'
  | 'victory';

export type BufferedAttackKind =
  | 'light_punch'
  | 'heavy_punch'
  | 'light_kick'
  | 'heavy_kick'
  | 'ultra';

export interface DirectionSample {
  dir: number; // Numpad facing-relative: 1..9
  age: number;
}

export interface AttackSpec {
  action: FighterAction;
  windup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  knockbackX: number;
  knockbackY: number;
  rangeX: number;
  heightY: number;
  offsetY: number;
  hitstop: number;
  meterGain: number;
  chainRank: number;
  isProjectile?: boolean;
  isMultiHit?: boolean;
  isLauncher?: boolean;
  isHeavy?: boolean;
  hitLevel?: HitLevel;
}

function buildAttackSpecFromDef(action: FighterAction, def: AttackDefinition): AttackSpec {
  return {
    action,
    windup: framesToSeconds(def.startupFrames),
    active: framesToSeconds(def.activeFrames),
    recovery: framesToSeconds(def.recoveryFrames),
    damage: def.damage,
    hitstun: framesToSeconds(def.hitstunFrames),
    blockstun: framesToSeconds(def.blockstunFrames),
    knockbackX: def.knockbackX,
    knockbackY: def.knockbackY,
    rangeX: def.localHitbox.width,
    heightY: def.localHitbox.height,
    offsetY: def.localHitbox.y,
    hitstop: framesToSeconds(def.hitstopFrames),
    meterGain: def.meterGain,
    chainRank: def.chainRank,
    isProjectile: def.isProjectile,
    isMultiHit: def.isMultiHit,
    isLauncher: def.isLauncher,
    isHeavy: def.isHeavy,
    hitLevel: def.hitLevel ?? 'mid',
  };
}

export const ATTACK_SPECS: Record<string, AttackSpec> = Object.fromEntries(
  Object.entries(ATTACK_DEFINITIONS).map(([id, def]) => [
    id,
    buildAttackSpecFromDef(id as FighterAction, def),
  ])
);

export function getFighterAttackSpec(f: FighterState, action: FighterAction): AttackSpec {
  const baseDef = ATTACK_DEFINITIONS[action];
  if (!baseDef) {
    return ATTACK_SPECS[action] ?? ATTACK_SPECS.light_punch;
  }
  const overrides = f.profile.attackOverrides?.[action];
  if (!overrides) {
    return ATTACK_SPECS[action] ?? buildAttackSpecFromDef(action, baseDef);
  }
  const merged: AttackDefinition = { ...baseDef, ...overrides };
  return buildAttackSpecFromDef(action, merged);
}

export function actionToMachineState(action: FighterAction): FighterMachineState {
  switch (action) {
    case 'idle':
      return 'IDLE';
    case 'walk':
      return 'WALK';
    case 'crouch':
      return 'CROUCH';
    case 'jump':
      return 'JUMP';
    case 'dash':
      return 'DASH';
    case 'block':
      return 'BLOCKSTUN';
    case 'light_punch':
      return 'LIGHT_PUNCH';
    case 'heavy_punch':
      return 'HEAVY_PUNCH';
    case 'light_kick':
      return 'LIGHT_KICK';
    case 'heavy_kick':
      return 'HEAVY_KICK';
    case 'uppercut':
    case 'power_hadou':
    case 'power_shoryu':
    case 'power_slam':
    case 'power_tornado':
      return 'SPECIAL';
    case 'super':
      return 'SUPER';
    case 'dizzy':
      return 'DIZZY';
    case 'hitstun':
      return 'HITSTUN';
    case 'ko':
      return 'KO';
    case 'victory':
      return 'VICTORY';
  }
}

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  lightPunchPressed: boolean;
  heavyPunchPressed: boolean;
  lightKickPressed: boolean;
  heavyKickPressed: boolean;
  ultraPressed: boolean;
  dashPressed: boolean;
  blockHeld: boolean;
}

export interface FighterState {
  slot: 1 | 2;
  profile: FighterProfile;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  ghostHp: number;
  maxHp: number;
  superMeter: number; // 0..300
  action: FighterAction;
  machineState: FighterMachineState;
  actionTimer: number;
  hitstunTimer: number;
  blockstunTimer: number;
  invulnTimer: number;
  hitFlashTimer: number;
  hasHitThisAttack: boolean;
  hasResolvedContactThisAttack: boolean;
  lastHitResolution: HitResolution | null;
  multiHitTicks: number;
  multiHitCount: number;
  comboCount: number;
  maxCombo: number;
  comboState: ComboState;
  punchAlternate: boolean;
  bufferedAction: BufferedAttackKind | null;
  bufferTimer: number;
  dirHistory: DirectionSample[];
  phraseText: string | null;
  phraseTimer: number;
  squashX: number;
  squashY: number;
  walkDist: number;
  totalDamageDealt: number;
  dizzyMeter: number;
  aiCooldown: number;
  aiBurstTimer: number;
  aiObs?: AiObservationState;
}

export interface Projectile {
  id: number;
  ownerSlot: 1 | 2;
  x: number;
  y: number;
  vx: number;
  radius: number;
  baseDamage: number;
  color: string;
  accent: string;
  life: number;
  isBossContract: boolean;
}

export interface MatchEvent {
  type:
    | 'hit_light'
    | 'hit_heavy'
    | 'block'
    | 'swing'
    | 'jump'
    | 'land'
    | 'dash'
    | 'special'
    | 'command_move'
    | 'super'
    | 'combo_phrase'
    | 'fight_start'
    | 'first_strike'
    | 'counter_hit'
    | 'dizzy'
    | 'finish_him'
    | 'finisher'
    | 'perfect'
    | 'ko'
    | 'round_start';
  slot?: 1 | 2;
  targetSlot?: 1 | 2;
  fighterId?: FighterId;
  x?: number;
  y?: number;
  color?: string;
  phrase?: string;
  moveName?: string;
  notation?: string;
  comboCount?: number;
  killerLabel?: string | null;
  hitstop?: number;
  shake?: number;
}

export interface MatchState {
  mode: GameMode;
  difficulty: AiDifficulty;
  trainingConfig: TrainingConfig;
  arcadeLadder: FighterId[];
  arcadeStageIndex: number; // 0..3
  p1: FighterState;
  p2: FighterState;
  projectiles: Projectile[];
  nextProjId: number;
  p1Rounds: number;
  p2Rounds: number;
  roundNumber: number;
  timer: number;
  phase: RoundPhase;
  phaseTimer: number;
  hitstopTimer: number;
  winnerSlot: 1 | 2 | null;
  matchWinnerSlot: 1 | 2 | null;
  firstHitAwarded: boolean;
  finisherLanded: boolean;
  score: number;
  bestCombo: number;
  rivalsDefeated: number;
  tickCount: number;
  lastFrameData: FrameDataReadout | null;
  debugContacts: Array<CollisionBox & { ttl: number }>;
  events: MatchEvent[];
}

export function buildArcadeLadder(
  playerId: FighterId,
  rng: () => number = Math.random
): FighterId[] {
  const pool = PLAYABLE_FIGHTER_IDS.filter((id) => id !== playerId);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.max(0, Math.min(0.999999, rng())) * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return [...pool, 'disquera_internacional'];
}

export function getKillerInstinctLabel(comboCount: number): string | null {
  if (comboCount < 2) return null;
  if (comboCount === 2) return 'DOUBLE COMBO!';
  if (comboCount === 3) return 'TRIPLE COMBO!';
  if (comboCount === 4) return 'SUPER COMBO!';
  if (comboCount === 5) return 'HYPER COMBO!';
  if (comboCount <= 7) return 'BRUTAL COMBO!';
  if (comboCount <= 9) return 'MASTER COMBO!';
  if (comboCount <= 12) return 'AWESOME COMBO!';
  return '¡ULTRA COMBOOOOO!';
}

function createEmptyComboState(): ComboState {
  return {
    hitCount: 0,
    totalDamage: 0,
    scaling: 1,
    lastHitTime: 0,
    active: false,
    moveSequence: [],
  };
}

export function createFighterState(
  slot: 1 | 2,
  fighterId: FighterId
): FighterState {
  const profile = FIGHTERS[fighterId];
  return {
    slot,
    profile,
    x: slot === 1 ? 350 : ARENA_WIDTH - 350,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: slot === 1 ? 1 : -1,
    hp: profile.maxHp,
    ghostHp: profile.maxHp,
    maxHp: profile.maxHp,
    superMeter: 0,
    action: 'idle',
    machineState: 'IDLE',
    actionTimer: 0,
    hitstunTimer: 0,
    blockstunTimer: 0,
    invulnTimer: 0,
    hitFlashTimer: 0,
    hasHitThisAttack: false,
    hasResolvedContactThisAttack: false,
    lastHitResolution: null,
    multiHitTicks: 0,
    multiHitCount: 0,
    comboCount: 0,
    maxCombo: 0,
    comboState: createEmptyComboState(),
    punchAlternate: false,
    bufferedAction: null,
    bufferTimer: 0,
    dirHistory: [],
    phraseText: null,
    phraseTimer: 0,
    squashX: 1,
    squashY: 1,
    walkDist: 0,
    totalDamageDealt: 0,
    dizzyMeter: 0,
    aiCooldown: 0.35,
    aiBurstTimer: 0,
    aiObs: createInitialAiObservation(),
  };
}

export function createMatchState(
  mode: GameMode,
  p1Id: FighterId,
  p2Id?: FighterId,
  arcadeStageIndex = 0,
  existingLadder?: FighterId[],
  carryScore = 0,
  carryBestCombo = 0,
  carryRivals = 0,
  difficulty: AiDifficulty = 'normal',
  trainingConfig?: Partial<TrainingConfig>
): MatchState {
  const ladder = existingLadder ?? buildArcadeLadder(p1Id);
  const resolvedP2 =
    mode === 'arcade'
      ? ladder[Math.min(arcadeStageIndex, ladder.length - 1)]
      : (p2Id ?? 'pablo_chille');

  const isTraining = mode === 'training';
  const resolvedTrainingConfig: TrainingConfig = {
    ...DEFAULT_TRAINING_CONFIG,
    ...trainingConfig,
  };

  const p1 = createFighterState(1, p1Id);
  const p2 = createFighterState(2, resolvedP2);
  if (isTraining && resolvedTrainingConfig.infiniteMeter) {
    p1.superMeter = MAX_SUPER_METER;
    p2.superMeter = MAX_SUPER_METER;
  }

  return {
    mode,
    difficulty,
    trainingConfig: resolvedTrainingConfig,
    arcadeLadder: ladder,
    arcadeStageIndex,
    p1,
    p2,
    projectiles: [],
    nextProjId: 1,
    p1Rounds: 0,
    p2Rounds: 0,
    roundNumber: 1,
    timer: ROUND_TIME_SEC,
    phase: isTraining ? 'fight' : 'intro',
    phaseTimer: isTraining ? 0 : 1.35,
    hitstopTimer: 0,
    winnerSlot: null,
    matchWinnerSlot: null,
    firstHitAwarded: false,
    finisherLanded: false,
    score: carryScore,
    bestCombo: carryBestCombo,
    rivalsDefeated: carryRivals,
    tickCount: 0,
    lastFrameData: null,
    debugContacts: [],
    events: [{ type: 'round_start', slot: 1 }],
  };
}

export function resetTrainingState(match: MatchState): void {
  const p1Id = match.p1.profile.id;
  const p2Id = match.p2.profile.id;
  match.p1 = createFighterState(1, p1Id);
  match.p2 = createFighterState(2, p2Id);
  if (match.trainingConfig.infiniteMeter) {
    match.p1.superMeter = MAX_SUPER_METER;
    match.p2.superMeter = MAX_SUPER_METER;
  }
  match.projectiles = [];
  match.debugContacts = [];
  match.timer = ROUND_TIME_SEC;
  match.phase = 'fight';
  match.phaseTimer = 0;
  match.hitstopTimer = 0;
  match.winnerSlot = null;
  match.matchWinnerSlot = null;
  match.lastFrameData = null;
}

export function resetRound(match: MatchState): void {
  const p1Id = match.p1.profile.id;
  const p2Id = match.p2.profile.id;
  const p1Total = match.p1.totalDamageDealt;
  const p2Total = match.p2.totalDamageDealt;
  const p1Max = match.p1.maxCombo;
  const p2Max = match.p2.maxCombo;
  const p1CarryMeter = match.p1.superMeter;
  const p2CarryMeter = match.p2.superMeter;

  match.p1 = createFighterState(1, p1Id);
  match.p2 = createFighterState(2, p2Id);
  match.p1.totalDamageDealt = p1Total;
  match.p2.totalDamageDealt = p2Total;
  match.p1.maxCombo = p1Max;
  match.p2.maxCombo = p2Max;
  match.p1.superMeter = p1CarryMeter;
  match.p2.superMeter = p2CarryMeter;
  match.projectiles = [];
  match.debugContacts = [];
  match.timer = ROUND_TIME_SEC;
  match.phase = 'intro';
  match.phaseTimer = 1.25;
  match.winnerSlot = null;
  match.firstHitAwarded = false;
  match.events.push({ type: 'round_start', slot: 1 });
}

export function getComboPhraseForHit(
  profile: FighterProfile,
  comboCount: number,
  action: FighterAction
): string | null {
  if (action === 'super') {
    return profile.comboPhrases.superHit;
  }
  if (isPowerAction(action) && comboCount >= 1) {
    return comboCount >= 3
      ? profile.comboPhrases.threeHit
      : profile.comboPhrases.twoHit;
  }
  if (comboCount === 2) {
    return profile.comboPhrases.twoHit;
  }
  if (comboCount === 3) {
    return profile.comboPhrases.threeHit;
  }
  if (comboCount >= 4) {
    return profile.comboPhrases.fourPlus;
  }
  return null;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function getOverlapBox(a: CollisionBox, b: CollisionBox): CollisionBox | null {
  if (!intersectsAABB(a, b)) return null;
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

export function getHurtboxBoxes(f: FighterState): CollisionBox[] {
  if (f.action === 'ko' || f.action === 'victory') return [];
  const s = f.profile.scale;
  const h = f.action === 'crouch' ? 136 * s : 204 * s;
  const w = 98 * s;
  return [
    {
      x: f.x - w / 2,
      y: f.y - h,
      width: w,
      height: h,
    },
  ];
}

export function getHurtbox(f: FighterState): Rect {
  const s = f.profile.scale;
  const h = f.action === 'crouch' ? 136 * s : 204 * s;
  const w = 98 * s;
  return {
    x: f.x - w / 2,
    y: f.y - h,
    w,
    h,
  };
}

export function getActiveHitboxBoxes(f: FighterState): CollisionBox[] {
  const def = ATTACK_DEFINITIONS[f.action];
  if (!def) return [];
  const startup = framesToSeconds(def.startupFrames);
  const active = framesToSeconds(def.activeFrames);
  if (f.actionTimer < startup || f.actionTimer > startup + active) {
    return [];
  }
  const s = f.profile.scale;
  const rw = def.localHitbox.width * s;
  const rh = def.localHitbox.height * s;
  const x =
    f.facing === 1
      ? f.x + def.localHitbox.x * s
      : f.x - def.localHitbox.x * s - rw;
  const y = f.y + def.localHitbox.y * s;
  return [{ x, y, width: rw, height: rh }];
}

export function getActiveHitbox(f: FighterState): Rect | null {
  const boxes = getActiveHitboxBoxes(f);
  if (boxes.length === 0) return null;
  const b = boxes[0];
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

export function isPowerAction(action: FighterAction): action is PowerMoveAction {
  return (
    action === 'power_hadou' ||
    action === 'power_shoryu' ||
    action === 'power_slam' ||
    action === 'power_tornado'
  );
}

export function isAttackingAction(action: FighterAction): boolean {
  return (
    action === 'light_punch' ||
    action === 'heavy_punch' ||
    action === 'light_kick' ||
    action === 'heavy_kick' ||
    action === 'uppercut' ||
    isPowerAction(action) ||
    action === 'super'
  );
}

function setFighterAction(f: FighterState, nextAction: FighterAction): boolean {
  const nextState = actionToMachineState(nextAction);
  if (!canTransitionFighterState(f.machineState, nextState)) {
    return false;
  }
  f.action = nextAction;
  f.machineState = nextState;
  return true;
}

export function computeFacingNumpad(input: InputSnapshot, facing: 1 | -1): number {
  const rawX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const relX = rawX * facing;
  const relY = input.up ? 1 : input.down ? -1 : 0;

  if (relY === -1) {
    if (relX === -1) return 1;
    if (relX === 1) return 3;
    return 2;
  }
  if (relY === 1) {
    if (relX === -1) return 7;
    if (relX === 1) return 9;
    return 8;
  }
  if (relX === -1) return 4;
  if (relX === 1) return 6;
  return 5;
}

export function recordDirectionSample(
  f: FighterState,
  input: InputSnapshot,
  dt: number
): void {
  for (let i = f.dirHistory.length - 1; i >= 0; i--) {
    f.dirHistory[i].age += dt;
    if (f.dirHistory[i].age > 0.44) {
      f.dirHistory.splice(i, 1);
    }
  }
  const dir = computeFacingNumpad(input, f.facing);
  const last = f.dirHistory[f.dirHistory.length - 1];
  if (!last || last.dir !== dir) {
    f.dirHistory.push({ dir, age: 0 });
    if (f.dirHistory.length > 16) {
      f.dirHistory.shift();
    }
  }
}

function hasOrderedSubsequence(
  dirs: readonly number[],
  seq: readonly number[]
): boolean {
  let si = 0;
  for (let i = 0; i < dirs.length && si < seq.length; i++) {
    if (dirs[i] === seq[si]) {
      si++;
    }
  }
  return si === seq.length;
}

export function detectSpecialMotion(
  dirHistory: readonly DirectionSample[],
  buttonKind: 'punch' | 'kick'
): PowerMoveAction | null {
  const recent = dirHistory.filter((s) => s.age <= 0.42).map((s) => s.dir);
  if (recent.length < 2) return null;

  let end = recent.length;
  while (end > 0 && recent[end - 1] === 5) end--;
  const dirs = recent.slice(0, end);
  if (dirs.length < 2) return null;
  const last = dirs[dirs.length - 1];

  if (buttonKind === 'kick') {
    if (
      (last === 6 || last === 3) &&
      (hasOrderedSubsequence(dirs, [4, 1, 2, 3, 6]) ||
        hasOrderedSubsequence(dirs, [4, 2, 3, 6]) ||
        hasOrderedSubsequence(dirs, [4, 2, 6]))
    ) {
      return 'power_tornado';
    }
    if (
      (last === 4 || last === 1) &&
      (hasOrderedSubsequence(dirs, [2, 1, 4]) || hasOrderedSubsequence(dirs, [2, 4]))
    ) {
      return 'power_slam';
    }
    return null;
  }

  const hasDp =
    (last === 3 &&
      (hasOrderedSubsequence(dirs, [6, 2, 3]) ||
        hasOrderedSubsequence(dirs, [6, 1, 2, 3]))) ||
    hasOrderedSubsequence(dirs, [6, 2, 3, 6]);
  if (hasDp) {
    return 'power_shoryu';
  }

  if (
    (last === 6 &&
      (hasOrderedSubsequence(dirs, [2, 3, 6]) ||
        hasOrderedSubsequence(dirs, [2, 6]))) ||
    (last === 3 && hasOrderedSubsequence(dirs, [2, 3]))
  ) {
    return 'power_hadou';
  }

  return null;
}

const POWER_META: Record<
  PowerMoveAction,
  { notation: string; key: keyof FighterProfile['powerMoves'] }
> = {
  power_hadou: { notation: '↓ ↘ → + PUÑO', key: 'hadou' },
  power_shoryu: { notation: '→ ↓ ↘ + PUÑO', key: 'shoryu' },
  power_slam: { notation: '↓ ↙ ← + PATADA', key: 'slam' },
  power_tornado: { notation: '← ↙ ↓ ↘ → + PATADA', key: 'tornado' },
};

export function canCancelCurrentAttack(
  current: FighterAction,
  hasHit: boolean,
  nextTarget: FighterAction,
  resolution: HitResolution | null = hasHit ? 'hit' : null,
  comboSequence: readonly string[] = []
): boolean {
  const def = ATTACK_DEFINITIONS[current];
  if (!def) return false;
  // Require resolved hit/block matching policy (never cancel on whiff unless policy allows)
  const effectiveResolution: HitResolution | null =
    resolution ?? (hasHit ? 'hit' : null);
  return canCancelWithPolicy(def, effectiveResolution, nextTarget, comboSequence);
}

function resolveRequestedAction(
  f: FighterState,
  kind: BufferedAttackKind,
  upHeld: boolean
): FighterAction {
  if (kind === 'ultra') return 'super';

  const isPunch = kind === 'light_punch' || kind === 'heavy_punch';
  const motionPower = detectSpecialMotion(
    f.dirHistory,
    isPunch ? 'punch' : 'kick'
  );
  if (motionPower) return motionPower;

  if (kind === 'heavy_punch' && upHeld) {
    return 'uppercut';
  }
  return kind;
}

function startAttack(
  match: MatchState,
  f: FighterState,
  opp: FighterState,
  kind: BufferedAttackKind,
  upHeld: boolean
): boolean {
  if (f.action === 'ko' || f.action === 'victory' || f.machineState === 'KO' || f.machineState === 'VICTORY') {
    return false;
  }

  // Snap facing toward opponent at attack startup so buffered attacks never whiff behind
  if (opp.x !== f.x) {
    f.facing = opp.x >= f.x ? 1 : -1;
  }

  const avgScale = (f.profile.scale + opp.profile.scale) / 2;
  const dist = Math.abs(opp.x - f.x);
  const isThrowAttempt =
    kind === 'heavy_punch' &&
    !upHeld &&
    dist <= 78 * avgScale &&
    f.y >= GROUND_Y - 6 &&
    opp.y >= GROUND_Y - 6 &&
    opp.action !== 'hitstun' &&
    opp.action !== 'block' &&
    opp.action !== 'ko' &&
    opp.action !== 'victory' &&
    opp.invulnTimer <= 0;

  if (isThrowAttempt) {
    const oppTeched =
      opp.bufferedAction === 'heavy_punch' ||
      opp.bufferedAction === 'light_punch' ||
      (opp.bufferTimer > 0 && (opp.bufferedAction === 'heavy_kick' || opp.bufferedAction === 'light_kick'));

    if (oppTeched) {
      f.action = 'idle';
      f.machineState = 'IDLE';
      f.actionTimer = 0;
      f.vx = -f.facing * 340;
      f.phraseText = '¡ESCAPE DE AGARRE!';
      f.phraseTimer = 1.2;

      opp.bufferedAction = null;
      opp.bufferTimer = 0;
      opp.action = 'idle';
      opp.machineState = 'IDLE';
      opp.actionTimer = 0;
      opp.vx = f.facing * 340;
      opp.phraseText = '¡ESCAPE DE AGARRE!';
      opp.phraseTimer = 1.2;

      match.hitstopTimer = 0.12;
      match.events.push({
        type: 'block',
        slot: opp.slot,
        targetSlot: f.slot,
        x: (f.x + opp.x) / 2,
        y: f.y - 120,
        color: '#38bdf8',
        shake: 6,
      });
      return true;
    }

    if (!setFighterAction(f, 'heavy_punch')) return false;
    f.actionTimer = 0;
    f.hasHitThisAttack = true;
    f.hasResolvedContactThisAttack = true;
    f.lastHitResolution = 'hit';
    f.vx = f.facing * 80;
    f.phraseText = '¡LLÉVATELO!';
    f.phraseTimer = 1.4;

    const throwDamage = Math.max(
      20,
      calculateFinalDamage({
        baseDamage: 95,
        powerMultiplier: f.profile.powerMult,
        comboMultiplier: 1,
        counterMultiplier: 1,
        defenseMultiplier: 1,
      })
    );

    opp.hp = Math.max(0, opp.hp - throwDamage);
    opp.action = 'hitstun';
    opp.machineState = 'HITSTUN';
    opp.actionTimer = 0;
    opp.hitstunTimer = 0.52;
    opp.hitFlashTimer = 0.12;
    opp.vx = f.facing * 380;
    opp.vy = -280;
    opp.squashX = 0.82;
    opp.squashY = 1.2;

    f.superMeter = Math.min(MAX_SUPER_METER, f.superMeter + 28);
    opp.superMeter = Math.min(MAX_SUPER_METER, opp.superMeter + 16);
    match.hitstopTimer = 0.12;

    match.events.push({
      type: 'hit_heavy',
      slot: f.slot,
      targetSlot: opp.slot,
      fighterId: f.profile.id,
      x: opp.x,
      y: opp.y - 130,
      color: '#f97316',
      comboCount: 1,
      killerLabel: 'AGARRE',
      shake: 12,
    });

    if (opp.hp <= 0) {
      if (match.mode === 'training') {
        opp.hp = match.trainingConfig.infiniteHealth ? opp.maxHp : 1;
      } else {
        triggerKO(match, f, opp, false);
      }
    }
    return true;
  }

  const chosen = resolveRequestedAction(f, kind, upHeld);
  const chosenDef = ATTACK_DEFINITIONS[chosen];
  if (!chosenDef) return false;

  if (chosen === 'super') {
    if (f.superMeter < MAX_SUPER_METER) return false;
    if (!setFighterAction(f, 'super')) return false;
    f.superMeter = match.mode === 'training' && match.trainingConfig.infiniteMeter ? MAX_SUPER_METER : 0;
    f.actionTimer = 0;
    f.hasHitThisAttack = false;
    f.hasResolvedContactThisAttack = false;
    f.lastHitResolution = null;
    f.multiHitTicks = 0;
    f.multiHitCount = 0;
    f.invulnTimer = framesToSeconds(chosenDef.invulnerabilityFrames);
    f.vx = f.facing * 290;
    f.squashX = 1.18;
    f.squashY = 0.86;
    match.events.push({
      type: 'super',
      slot: f.slot,
      fighterId: f.profile.id,
      x: f.x,
      y: f.y - 120,
      color: f.profile.colors.aura,
      moveName: f.profile.superName,
      notation: 'RB / RT · 3 BARRAS',
    });
    return true;
  }

  if (isPowerAction(chosen)) {
    if (!setFighterAction(f, chosen)) return false;
    f.actionTimer = 0;
    f.hasHitThisAttack = false;
    f.hasResolvedContactThisAttack = false;
    f.lastHitResolution = null;
    f.multiHitTicks = 0;
    f.multiHitCount = 0;
    f.dirHistory = [];

    if (chosen === 'power_shoryu') {
      f.invulnTimer = framesToSeconds(chosenDef.invulnerabilityFrames);
      f.vx = f.facing * 230;
      f.vy = -590;
    } else if (chosen === 'power_slam') {
      f.vx = f.facing * 520;
    } else if (chosen === 'power_tornado') {
      f.vx = f.facing * 360;
      f.vy = -190;
    } else {
      f.vx = f.facing * (f.profile.isBoss ? 190 : 120);
    }

    f.squashX = 1.15;
    f.squashY = 0.88;
    const meta = POWER_META[chosen];
    const moveName = f.profile.powerMoves[meta.key];
    match.events.push({
      type: 'special',
      slot: f.slot,
      fighterId: f.profile.id,
      x: f.x,
      y: f.y - 120,
      color: f.profile.colors.primary,
      moveName,
      notation: meta.notation,
    });
    match.events.push({
      type: 'command_move',
      slot: f.slot,
      fighterId: f.profile.id,
      moveName,
      notation: meta.notation,
      color: f.profile.colors.primary,
    });
    return true;
  }

  if (!setFighterAction(f, chosen)) return false;
  f.actionTimer = 0;
  f.hasHitThisAttack = false;
  f.hasResolvedContactThisAttack = false;
  f.lastHitResolution = null;
  f.multiHitTicks = 0;
  f.multiHitCount = 0;
  if (chosen === 'light_punch') {
    f.punchAlternate = !f.punchAlternate;
  }
  const baseStep =
    chosen === 'heavy_kick' || chosen === 'heavy_punch'
      ? 250
      : chosen === 'uppercut'
        ? 195
        : 175;
  if (f.y < GROUND_Y - 4) {
    // Preserve airborne jump arc momentum during jump-in attacks
    f.vx = f.vx * 0.92 + f.facing * 45;
  } else {
    const dashCarry =
      Math.abs(f.vx) > 260
        ? Math.sign(f.vx) * Math.min(180, Math.abs(f.vx) * 0.35)
        : 0;
    f.vx = f.facing * baseStep + dashCarry;
  }
  f.squashX = chosen === 'heavy_kick' || chosen === 'heavy_punch' ? 1.12 : 1.07;
  f.squashY = chosen === 'heavy_kick' || chosen === 'heavy_punch' ? 0.9 : 0.94;
  match.events.push({ type: 'swing', slot: f.slot, x: f.x, y: f.y - 125 });
  return true;
}

export function isBlockingAgainst(
  defender: FighterState,
  attackerX: number,
  input: InputSnapshot,
  hitLevel: HitLevel = 'mid'
): boolean {
  if (hitLevel === 'unblockable') {
    return false;
  }
  if (
    defender.action === 'hitstun' ||
    defender.action === 'dizzy' ||
    defender.action === 'ko' ||
    defender.action === 'victory'
  ) {
    return false;
  }
  if (isAttackingAction(defender.action)) return false;
  if (defender.y < GROUND_Y - 8) return false;

  const holdingBack =
    (attackerX > defender.x && input.left) ||
    (attackerX < defender.x && input.right);
  const isGuarding = input.blockHeld || holdingBack;
  if (!isGuarding) return false;

  const isCrouching = input.down || defender.action === 'crouch';

  if (hitLevel === 'low') {
    // Low attacks must be blocked crouching
    return isCrouching;
  }
  if (hitLevel === 'overhead') {
    // Overhead attacks must be blocked standing
    return !isCrouching;
  }

  // Mid attacks can be blocked either standing or crouching
  return true;
}

export function applyHit(
  match: MatchState,
  attacker: FighterState,
  defender: FighterState,
  defenderInput: InputSnapshot,
  baseDamage: number,
  hitstun: number,
  knockbackX: number,
  knockbackY: number,
  hitstop: number,
  meterGain: number,
  actionSource: FighterAction
): HitResolution {
  if (
    defender.invulnTimer > 0 ||
    defender.action === 'ko' ||
    defender.action === 'victory'
  ) {
    return 'invulnerable';
  }

  const defSpec = ATTACK_DEFINITIONS[actionSource];
  const isJumpingNormal = attacker.y < GROUND_Y - 12 && actionSource !== 'super';
  const effectiveHitLevel: HitLevel = isJumpingNormal
    ? 'overhead'
    : (defSpec?.hitLevel ?? 'mid');

  const blocked = isBlockingAgainst(defender, attacker.x, defenderInput, effectiveHitLevel);

  if (blocked) {
    const chipDamage = Math.max(
      4,
      calculateFinalDamage({
        baseDamage,
        powerMultiplier: attacker.profile.powerMult,
        comboMultiplier: 1,
        counterMultiplier: 1,
        defenseMultiplier: 0.16,
      })
    );
    defender.hp = Math.max(0, defender.hp - chipDamage);
    defender.action = 'block';
    defender.machineState = 'BLOCKSTUN';
    defender.actionTimer = 0;
    const blockstunSec = defSpec ? framesToSeconds(defSpec.blockstunFrames) : 0.16;
    defender.hitstunTimer = blockstunSec;
    defender.blockstunTimer = blockstunSec;
    defender.vx = (attacker.x < defender.x ? 1 : -1) * knockbackX * 0.45;
    attacker.superMeter = Math.min(
      MAX_SUPER_METER,
      attacker.superMeter + meterGain * 0.45
    );
    match.hitstopTimer = Math.max(match.hitstopTimer, 0.03);
    match.events.push({
      type: 'block',
      slot: defender.slot,
      targetSlot: attacker.slot,
      x: (attacker.x + defender.x) / 2,
      y: defender.y - 130,
      color: '#38bdf8',
      shake: 4,
    });

    if (defSpec) {
      const adv = (defSpec.blockstunFrames) - (Math.max(0, defSpec.activeFrames - 1) + defSpec.recoveryFrames);
      match.lastFrameData = {
        moveId: actionSource,
        startupFrames: defSpec.startupFrames,
        activeFrames: defSpec.activeFrames,
        recoveryFrames: defSpec.recoveryFrames,
        onHitAdvantage: defSpec.hitstunFrames - (Math.max(0, defSpec.activeFrames - 1) + defSpec.recoveryFrames),
        onBlockAdvantage: adv,
        lastDamage: chipDamage,
        comboTotalDamage: attacker.comboState.totalDamage,
        lastResolution: 'block',
      };
    }

    if (defender.hp <= 0) {
      if (match.mode === 'training') {
        defender.hp = match.trainingConfig.infiniteHealth ? defender.maxHp : 1;
      } else {
        triggerKO(match, attacker, defender);
      }
    }
    return 'block';
  }

  // Finish Him cinematic window
  if (match.phase === 'finish_him' && attacker.slot === match.winnerSlot) {
    defender.hitFlashTimer = 0.14;
    triggerKO(match, attacker, defender, true);
    return 'hit';
  }

  const wasCounterHit = isAttackingAction(defender.action);
  if (!match.firstHitAwarded) {
    match.firstHitAwarded = true;
    if (attacker.slot === 1) match.score += 100;
    match.events.push({
      type: 'first_strike',
      slot: attacker.slot,
      targetSlot: defender.slot,
      fighterId: attacker.profile.id,
      x: defender.x,
      y: defender.y - 150,
      color: '#facc15',
    });
  }
  if (wasCounterHit) {
    if (attacker.slot === 1) match.score += 150;
    match.events.push({
      type: 'counter_hit',
      slot: attacker.slot,
      targetSlot: defender.slot,
      fighterId: attacker.profile.id,
      x: defender.x,
      y: defender.y - 165,
      color: '#38bdf8',
      shake: 7,
    });
  }

  const nextComboCount = attacker.comboCount + 1;
  const comboScaling = getComboScaling(nextComboCount, 0.25);
  const counterMult = wasCounterHit ? 1.15 : 1.0;

  const finalDmg = calculateFinalDamage({
    baseDamage,
    powerMultiplier: attacker.profile.powerMult,
    comboMultiplier: comboScaling,
    counterMultiplier: counterMult,
    defenseMultiplier: 1,
  });

  defender.hp = Math.max(0, defender.hp - finalDmg);
  defender.action = 'hitstun';
  defender.machineState = 'HITSTUN';
  defender.actionTimer = 0;

  // Hitstun deterioration on long combos (prevents unintended infinite hitstun)
  const hitstunDeterioration = Math.max(0.65, 1 - Math.max(0, nextComboCount - 2) * 0.04);
  defender.hitstunTimer = hitstun * hitstunDeterioration + (wasCounterHit ? 0.12 : 0);
  defender.hitFlashTimer = 0.08;
  defender.squashX = 0.84;
  defender.squashY = 1.16;
  defender.comboCount = 0;
  defender.comboState = createEmptyComboState();

  const isHeavy =
    hitstop >= 0.065 || isPowerAction(actionSource) || actionSource === 'super';
  defender.dizzyMeter = Math.min(100, defender.dizzyMeter + (isHeavy ? 26 : 14));

  let effKnockbackX = knockbackX;
  let effKnockbackY = knockbackY;
  if (actionSource === 'super') {
    if (attacker.multiHitCount < 3) {
      effKnockbackX = 65;
      effKnockbackY = -80;
    } else {
      effKnockbackX = 320;
      effKnockbackY = -340;
    }
  } else if (actionSource === 'power_tornado') {
    if (attacker.multiHitCount < 2) {
      effKnockbackX = 55;
      effKnockbackY = -90;
    } else {
      effKnockbackX = 220;
      effKnockbackY = -260;
    }
  }

  const dir = attacker.x <= defender.x ? 1 : -1;
  defender.vx = dir * effKnockbackX;
  if (effKnockbackY < 0) {
    // Juggle gravity scaling on airborne follow-up hits
    const juggleScale = defender.y < GROUND_Y - 12 ? Math.max(0.55, 1 - nextComboCount * 0.05) : 1;
    defender.vy = effKnockbackY * juggleScale;
  }

  attacker.comboCount = nextComboCount;
  attacker.maxCombo = Math.max(attacker.maxCombo, attacker.comboCount);
  attacker.comboState = {
    hitCount: nextComboCount,
    totalDamage: (nextComboCount === 1 ? 0 : attacker.comboState.totalDamage) + finalDmg,
    scaling: comboScaling,
    lastHitTime: match.tickCount / GAME_CONFIG.simulationHz,
    active: true,
    moveSequence:
      nextComboCount === 1
        ? [actionSource]
        : [...attacker.comboState.moveSequence, actionSource],
  };

  attacker.totalDamageDealt += finalDmg;
  attacker.superMeter = Math.min(MAX_SUPER_METER, attacker.superMeter + meterGain);
  defender.superMeter = Math.min(MAX_SUPER_METER, defender.superMeter + 12);

  if (attacker.slot === 1) {
    match.score += finalDmg * (1 + Math.min(6, attacker.comboCount - 1) * 0.25);
    match.bestCombo = Math.max(match.bestCombo, attacker.comboCount);
  }

  match.hitstopTimer = Math.max(
    match.hitstopTimer,
    hitstop + (wasCounterHit ? 0.025 : 0)
  );

  const killerLabel = getKillerInstinctLabel(attacker.comboCount);

  match.events.push({
    type: isHeavy ? 'hit_heavy' : 'hit_light',
    slot: attacker.slot,
    targetSlot: defender.slot,
    fighterId: attacker.profile.id,
    x: defender.x,
    y: defender.y - 125,
    color: attacker.profile.colors.primary,
    comboCount: attacker.comboCount,
    killerLabel,
    shake: isHeavy ? 11 : 5,
  });

  if (defSpec) {
    const remaining = Math.max(0, defSpec.activeFrames - 1) + defSpec.recoveryFrames;
    match.lastFrameData = {
      moveId: actionSource,
      startupFrames: defSpec.startupFrames,
      activeFrames: defSpec.activeFrames,
      recoveryFrames: defSpec.recoveryFrames,
      onHitAdvantage: defSpec.hitstunFrames - remaining,
      onBlockAdvantage: defSpec.blockstunFrames - remaining,
      lastDamage: finalDmg,
      comboTotalDamage: attacker.comboState.totalDamage,
      lastResolution: wasCounterHit ? 'counter_hit' : 'hit',
    };
  }

  const phrase = getComboPhraseForHit(
    attacker.profile,
    attacker.comboCount,
    actionSource
  );
  if (phrase) {
    attacker.phraseText = phrase;
    attacker.phraseTimer = 1.55;
    match.events.push({
      type: 'combo_phrase',
      slot: attacker.slot,
      fighterId: attacker.profile.id,
      phrase,
      comboCount: attacker.comboCount,
      killerLabel,
      x: attacker.x,
      y: attacker.y - 235,
      color: attacker.profile.colors.primary,
    });
  }

  if (defender.hp > 0 && defender.dizzyMeter >= 100 && match.mode !== 'training') {
    defender.dizzyMeter = 0;
    defender.action = 'dizzy';
    defender.machineState = 'DIZZY';
    defender.actionTimer = 0;
    defender.hitstunTimer = 1.65;
    defender.vx = dir * 80;
    defender.vy = 0;
    match.events.push({
      type: 'dizzy',
      slot: defender.slot,
      fighterId: defender.profile.id,
      x: defender.x,
      y: defender.y - 185,
      color: '#facc15',
    });
  }

  if (defender.hp <= 0) {
    if (match.mode === 'training') {
      defender.hp = match.trainingConfig.infiniteHealth ? defender.maxHp : 1;
    } else {
      const winnerAlreadyMatchPoint =
        (attacker.slot === 1 ? match.p1Rounds : match.p2Rounds) >= 1;
      if (
        winnerAlreadyMatchPoint &&
        attacker.slot === 1 &&
        actionSource !== 'super'
      ) {
        defender.hp = 1;
        defender.action = 'dizzy';
        defender.machineState = 'DIZZY';
        defender.actionTimer = 0;
        defender.hitstunTimer = 3.4;
        defender.vx = 0;
        defender.vy = 0;
        defender.y = GROUND_Y;
        match.phase = 'finish_him';
        match.phaseTimer = 3.1;
        match.winnerSlot = attacker.slot;
        match.hitstopTimer = 0.14;
        match.events.push({
          type: 'finish_him',
          slot: attacker.slot,
          targetSlot: defender.slot,
          fighterId: attacker.profile.id,
          x: defender.x,
          y: defender.y - 155,
          color: '#ef4444',
          shake: 12,
        });
      } else {
        triggerKO(match, attacker, defender, actionSource === 'super');
      }
    }
  }

  return wasCounterHit ? 'counter_hit' : 'hit';
}

function triggerKO(
  match: MatchState,
  winner: FighterState,
  loser: FighterState,
  isFinisher = false
): void {
  loser.hp = 0;
  loser.action = 'ko';
  loser.machineState = 'KO';
  loser.actionTimer = 0;
  loser.vy = isFinisher ? -560 : -420;
  loser.vx = (winner.x <= loser.x ? 1 : -1) * (isFinisher ? 440 : 320);

  winner.action = 'victory';
  winner.machineState = 'VICTORY';
  winner.actionTimer = 0;
  winner.vx = 0;
  winner.vy = 0;

  match.phase = 'ko';
  match.phaseTimer = isFinisher ? 2.4 : 2.0;
  match.winnerSlot = winner.slot;
  match.hitstopTimer = isFinisher ? 0.2 : 0.14;
  if (isFinisher) {
    match.finisherLanded = true;
    if (winner.slot === 1) match.score += 1000;
    match.events.push({
      type: 'finisher',
      slot: winner.slot,
      targetSlot: loser.slot,
      fighterId: winner.profile.id,
      x: loser.x,
      y: loser.y - 135,
      color: winner.profile.colors.primary,
      shake: 24,
    });
  }

  if (winner.slot === 1) {
    match.p1Rounds += 1;
    match.score += 500;
  } else {
    match.p2Rounds += 1;
  }

  if (winner.hp >= winner.maxHp) {
    if (winner.slot === 1) match.score += 500;
    match.events.push({
      type: 'perfect',
      slot: winner.slot,
      fighterId: winner.profile.id,
      x: winner.x,
      y: winner.y - 190,
      color: '#facc15',
    });
  }

  match.events.push({
    type: 'ko',
    slot: winner.slot,
    targetSlot: loser.slot,
    fighterId: winner.profile.id,
    x: loser.x,
    y: loser.y - 110,
    color: winner.profile.colors.primary,
    shake: isFinisher ? 24 : 18,
  });
}

export function computeCpuInput(
  cpu: FighterState,
  player: FighterState,
  dt: number,
  difficultyScale = 1,
  difficulty: AiDifficulty = 'normal'
): InputSnapshot {
  return computeAdvancedCpuInput(cpu, player, dt, difficulty, difficultyScale);
}

export function computeTrainingDummyInput(
  dummy: FighterState,
  player: FighterState,
  config: TrainingConfig,
  dt: number
): InputSnapshot {
  if (config.dummyMode === 'stationary') {
    return EMPTY_INPUT;
  }
  if (config.dummyMode === 'blocking') {
    return { ...EMPTY_INPUT, blockHeld: true };
  }
  if (config.dummyMode === 'guard_after_hit') {
    if (
      dummy.action === 'hitstun' ||
      dummy.action === 'block' ||
      dummy.hitstunTimer > 0 ||
      dummy.blockstunTimer > 0
    ) {
      return { ...EMPTY_INPUT, blockHeld: true };
    }
    return EMPTY_INPUT;
  }
  // Attacking dummy: periodically throws jab/kick at close range
  dummy.aiCooldown = Math.max(0, dummy.aiCooldown - dt);
  const dist = Math.abs(player.x - dummy.x);
  if (dist > 170) {
    return player.x < dummy.x ? { ...EMPTY_INPUT, left: true } : { ...EMPTY_INPUT, right: true };
  }
  if (dummy.aiCooldown <= 0) {
    dummy.aiCooldown = 1.05;
    return { ...EMPTY_INPUT, lightPunchPressed: true };
  }
  return EMPTY_INPUT;
}

function captureAttackBuffer(f: FighterState, input: InputSnapshot): void {
  if (input.ultraPressed) {
    f.bufferedAction = 'ultra';
    f.bufferTimer = 0.16;
  } else if (input.heavyKickPressed) {
    f.bufferedAction = 'heavy_kick';
    f.bufferTimer = 0.14;
  } else if (input.heavyPunchPressed) {
    f.bufferedAction = 'heavy_punch';
    f.bufferTimer = 0.14;
  } else if (input.lightKickPressed) {
    f.bufferedAction = 'light_kick';
    f.bufferTimer = 0.14;
  } else if (input.lightPunchPressed) {
    f.bufferedAction = 'light_punch';
    f.bufferTimer = 0.14;
  }
}

function approachVelocity(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return target;
}

function updateFighter(
  match: MatchState,
  f: FighterState,
  opp: FighterState,
  input: InputSnapshot,
  dt: number
): void {
  if (f.ghostHp > f.hp) {
    f.ghostHp = Math.max(f.hp, f.ghostHp - 380 * dt);
  } else {
    f.ghostHp = f.hp;
  }

  f.invulnTimer = Math.max(0, f.invulnTimer - dt);
  f.hitFlashTimer = Math.max(0, f.hitFlashTimer - dt);
  if (f.phraseTimer > 0) {
    f.phraseTimer = Math.max(0, f.phraseTimer - dt);
    if (f.phraseTimer === 0) f.phraseText = null;
  }

  const damp = 1 - Math.exp(-16 * dt);
  f.squashX += (1 - f.squashX) * damp;
  f.squashY += (1 - f.squashY) * damp;

  recordDirectionSample(f, input, dt);

  if (
    input.ultraPressed ||
    input.heavyKickPressed ||
    input.heavyPunchPressed ||
    input.lightKickPressed ||
    input.lightPunchPressed
  ) {
    captureAttackBuffer(f, input);
  } else if (f.bufferTimer > 0) {
    f.bufferTimer = Math.max(0, f.bufferTimer - dt);
    if (f.bufferTimer === 0) f.bufferedAction = null;
  }

  if (
    !isAttackingAction(f.action) &&
    f.action !== 'hitstun' &&
    f.action !== 'dizzy' &&
    f.action !== 'ko' &&
    f.action !== 'victory' &&
    f.action !== 'dash'
  ) {
    f.facing = opp.x >= f.x ? 1 : -1;
    f.dizzyMeter = Math.max(0, f.dizzyMeter - 10 * dt);
  }

  if (f.action === 'victory') {
    f.actionTimer += dt;
    if (f.y < GROUND_Y) {
      f.vy += GRAVITY * GAME_CONFIG.fallGravityMult * dt;
      f.y = Math.min(GROUND_Y, f.y + f.vy * dt);
      if (f.y === GROUND_Y) f.vy = 0;
    }
    return;
  }

  if (f.action === 'ko') {
    f.actionTimer += dt;
    f.vy += (f.vy >= 0 ? GRAVITY * GAME_CONFIG.fallGravityMult : GRAVITY) * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.vy = 0;
      f.vx *= Math.exp(-8 * dt);
    }
    f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x));
    return;
  }

  if (f.action === 'hitstun' || f.action === 'block' || f.action === 'dizzy') {
    f.actionTimer += dt;
    f.hitstunTimer -= dt;
    f.blockstunTimer = Math.max(0, f.blockstunTimer - dt);
    const stunFriction = f.y < GROUND_Y ? 2.2 : 7.5;
    f.vx *= Math.exp(-stunFriction * dt);
    if (f.y < GROUND_Y || f.vy < 0) {
      f.vy += (f.vy >= 0 ? GRAVITY * GAME_CONFIG.fallGravityMult : GRAVITY) * dt;
      f.y += f.vy * dt;
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y;
        f.vy = 0;
        f.squashX = 1.14;
        f.squashY = 0.86;
      }
    }
    f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x + f.vx * dt));
    if (f.hitstunTimer <= 0 && f.y >= GROUND_Y && match.phase !== 'finish_him') {
      f.action = 'idle';
      f.machineState = 'IDLE';
      f.actionTimer = 0;
      opp.comboCount = 0;
      opp.comboState.active = false;
      opp.comboState.moveSequence = [];
      if (match.mode === 'training' && match.trainingConfig.infiniteHealth) {
        f.hp = f.maxHp;
      }
    }
    return;
  }

  if (f.action === 'dash') {
    f.actionTimer += dt;
    f.vx *= Math.exp(-GAME_CONFIG.dashFriction * dt);
    f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x + f.vx * dt));
    if (f.actionTimer >= 0.10 && f.bufferedAction && (match.phase === 'fight' || match.phase === 'finish_him')) {
      const chosen = f.bufferedAction;
      if (startAttack(match, f, opp, chosen, input.up)) {
        f.bufferedAction = null;
        f.bufferTimer = 0;
        return;
      }
    }
    if (f.actionTimer >= GAME_CONFIG.dashDuration) {
      f.action = 'idle';
      f.machineState = 'IDLE';
      f.vx *= 0.35;
      f.actionTimer = 0;
    }
    return;
  }

  if (isAttackingAction(f.action)) {
    const spec = getFighterAttackSpec(f, f.action);
    const def = ATTACK_DEFINITIONS[f.action];
    const prevTimer = f.actionTimer;
    f.actionTimer += dt;
    const damping = f.y < GROUND_Y ? 2.4 : 5.6;
    f.vx *= Math.exp(-damping * dt);

    // Forward drift during super active frames to stay glued to target
    if (f.action === 'super' && f.actionTimer >= spec.windup && f.actionTimer <= spec.windup + spec.active) {
      f.vx = f.facing * 185;
    }

    // Multi-hit reset cadence (H-03): reset hasResolvedContactThisAttack per window
    if (spec.isMultiHit && f.actionTimer >= spec.windup && f.actionTimer <= spec.windup + spec.active) {
      const interval = def?.multiHitIntervalFrames
        ? framesToSeconds(def.multiHitIntervalFrames)
        : 0.11;
      const tickIdx = Math.floor((f.actionTimer - spec.windup) / interval);
      if (tickIdx > f.multiHitTicks) {
        f.multiHitTicks = tickIdx;
        f.hasResolvedContactThisAttack = false;
        f.hasHitThisAttack = false;
      }
    }

    // Spawn projectile with baseDamage (H-02: never pre-multiply by powerMult)
    if (
      f.action === 'power_hadou' &&
      prevTimer < spec.windup &&
      f.actionTimer >= spec.windup
    ) {
      match.projectiles.push({
        id: match.nextProjId++,
        ownerSlot: f.slot,
        x: f.x + f.facing * 78 * f.profile.scale,
        y: f.y - 122 * f.profile.scale,
        vx: f.facing * (f.profile.isBoss ? 580 : 660),
        radius: f.profile.isBoss ? 32 : 26,
        baseDamage: 92,
        color: f.profile.colors.primary,
        accent: f.profile.colors.accent,
        life: 1.8,
        isBossContract: f.profile.isBoss,
      });
    }

    // Cancel check using explicit CancelPolicy & lastHitResolution (H-03)
    if (f.bufferedAction) {
      const candidateAction = resolveRequestedAction(f, f.bufferedAction, input.up);
      if (
        canCancelCurrentAttack(
          f.action,
          f.hasHitThisAttack,
          candidateAction,
          f.lastHitResolution,
          f.comboState.moveSequence
        )
      ) {
        const chosen = f.bufferedAction;
        f.bufferedAction = null;
        f.bufferTimer = 0;
        if (startAttack(match, f, opp, chosen, input.up)) {
          return;
        }
      }
    }

    if (f.y < GROUND_Y || f.vy < 0) {
      f.vy += (f.vy >= 0 ? GRAVITY * GAME_CONFIG.fallGravityMult : GRAVITY) * dt;
      f.y += f.vy * dt;
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y;
        f.vy = 0;
        f.squashX = 1.14;
        f.squashY = 0.86;
      }
    }
    f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x + f.vx * dt));

    const totalDur = spec.windup + spec.active + spec.recovery;
    if (f.actionTimer >= totalDur) {
      const nextAct: FighterAction = f.y < GROUND_Y ? 'jump' : 'idle';
      f.action = nextAct;
      f.machineState = actionToMachineState(nextAct);
      f.actionTimer = 0;
    }
    return;
  }

  // Neutral Ground / Air Movement & Input Execution
  if (match.phase === 'fight' || match.phase === 'finish_him') {
    if (input.dashPressed && f.y >= GROUND_Y) {
      f.action = 'dash';
      f.machineState = 'DASH';
      f.actionTimer = 0;
      const moveDir = input.left ? -1 : input.right ? 1 : f.facing;
      const isForwardDash = moveDir === f.facing;
      f.vx = moveDir * (isForwardDash ? GAME_CONFIG.dashForwardSpeed : GAME_CONFIG.dashBackSpeed);
      f.invulnTimer = isForwardDash ? 0.14 : 0.17;
      f.squashX = 1.22;
      f.squashY = 0.82;
      match.events.push({ type: 'dash', slot: f.slot, x: f.x, y: f.y - 55 });
      return;
    }

    if (f.bufferedAction) {
      const act = f.bufferedAction;
      if (startAttack(match, f, opp, act, input.up)) {
        f.bufferedAction = null;
        f.bufferTimer = 0;
        return;
      }
    }
  }

  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const wasAirborne = f.y < GROUND_Y;

  if (match.phase === 'fight' || match.phase === 'finish_him') {
    if (!wasAirborne) {
      if (input.down) {
        f.vx = approachVelocity(f.vx, 0, GAME_CONFIG.groundFriction * 1.45 * dt);
        f.action = 'crouch';
        f.machineState = 'CROUCH';
      } else {
        const targetVx = moveX * f.profile.speed;
        if (moveX !== 0) {
          const reversing = f.vx * moveX < -20;
          const accel = reversing
            ? GAME_CONFIG.groundAccel * GAME_CONFIG.groundTurnaroundMult
            : GAME_CONFIG.groundAccel;
          f.vx = approachVelocity(f.vx, targetVx, accel * dt);
        } else {
          f.vx = approachVelocity(f.vx, 0, GAME_CONFIG.groundFriction * dt);
        }
        const moving = moveX !== 0 || Math.abs(f.vx) > 22;
        const nextAct: FighterAction = moving ? 'walk' : 'idle';
        f.action = nextAct;
        f.machineState = actionToMachineState(nextAct);
        if (Math.abs(f.vx) > 1) {
          f.walkDist += Math.abs(f.vx * dt);
        }
      }

      if (input.up) {
        f.vy = -f.profile.jumpVel;
        // Carry walk/dash horizontal momentum into jump takeoff
        if (moveX !== 0) {
          f.vx =
            Math.abs(f.vx) > f.profile.speed * 0.9
              ? f.vx
              : moveX * f.profile.speed * 1.05;
        } else {
          f.vx *= 0.72;
        }
        f.action = 'jump';
        f.machineState = 'JUMP';
        f.squashX = 0.84;
        f.squashY = 1.18;
        match.events.push({ type: 'jump', slot: f.slot, x: f.x, y: f.y });
      }
    } else {
      // Airborne drift steering + drag while preserving launch arc momentum
      if (moveX !== 0) {
        const airTarget = moveX * f.profile.speed * 0.92;
        const maxAirVx = Math.max(Math.abs(f.vx), f.profile.speed * 1.08);
        f.vx = approachVelocity(f.vx, airTarget, GAME_CONFIG.airAccel * dt);
        f.vx = Math.max(-maxAirVx, Math.min(maxAirVx, f.vx));
      } else {
        f.vx *= Math.exp(-GAME_CONFIG.airDrag * dt);
      }
    }
  } else {
    f.vx = approachVelocity(f.vx, 0, GAME_CONFIG.groundFriction * dt);
    if (!wasAirborne) {
      f.action = 'idle';
      f.machineState = 'IDLE';
    }
  }

  if (wasAirborne || f.vy < 0) {
    const grav = f.vy >= 0 ? GRAVITY * GAME_CONFIG.fallGravityMult : GRAVITY;
    f.vy += grav * dt;
    f.y += f.vy * dt;
    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.vy = 0;
      f.vx *= 0.55;
      f.squashX = 1.22;
      f.squashY = 0.78;
      f.action = 'idle';
      f.machineState = 'IDLE';
      match.events.push({ type: 'land', slot: f.slot, x: f.x, y: GROUND_Y });
    }
  }

  f.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, f.x + f.vx * dt));
  f.actionTimer += dt;
}

function separateFighters(p1: FighterState, p2: FighterState): void {
  if (p1.action === 'ko' || p2.action === 'ko') return;
  const dy = Math.abs(p1.y - p2.y);
  if (dy >= 145) return;
  const verticalFactor = dy <= 90 ? 1 : (145 - dy) / 55;

  const avgScale = (p1.profile.scale + p2.profile.scale) / 2;
  const eitherAttacking = isAttackingAction(p1.action) || isAttackingAction(p2.action);
  const minGap = (eitherAttacking ? 58 : 64) * avgScale;
  const dx = p2.x - p1.x;
  const absDx = Math.abs(dx);
  if (absDx < minGap) {
    const rawOverlap = (minGap - absDx) * verticalFactor;
    const maxPush = dy <= 10 ? 36 : 14;
    const push = Math.min(rawOverlap, maxPush);
    if (push <= 0.01) return;
    const dir = dx >= 0 ? 1 : -1;
    const half = push / 2;
    p1.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, p1.x - dir * half));
    p2.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, p2.x + dir * half));

    // Corner-aware pushback transfer so cornered fighters never collapse inside each other
    const applied = Math.abs(p2.x - p1.x) - absDx;
    const remPush = push - Math.max(0, applied);
    if (remPush > 0.25) {
      if (p1.x <= STAGE_LEFT + 0.5 || p1.x >= STAGE_RIGHT - 0.5) {
        p2.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, p2.x + dir * remPush));
      } else if (p2.x <= STAGE_LEFT + 0.5 || p2.x >= STAGE_RIGHT - 0.5) {
        p1.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, p1.x - dir * remPush));
      }
    }
  }
}

export function stepMatch(
  match: MatchState,
  p1Input: InputSnapshot,
  p2InputRaw: InputSnapshot | null,
  rawDt: number
): void {
  const dt = Math.min(Math.max(rawDt, 0), GAME_CONFIG.maxFrameDelta);
  match.events = [];
  match.tickCount += 1;

  for (let i = match.debugContacts.length - 1; i >= 0; i--) {
    match.debugContacts[i].ttl -= dt;
    if (match.debugContacts[i].ttl <= 0) {
      match.debugContacts.splice(i, 1);
    }
  }

  if (match.mode === 'training' && match.trainingConfig.infiniteMeter) {
    match.p1.superMeter = MAX_SUPER_METER;
    match.p2.superMeter = MAX_SUPER_METER;
  }

  if (match.hitstopTimer > 0) {
    captureAttackBuffer(match.p1, p1Input);
    if (p2InputRaw) captureAttackBuffer(match.p2, p2InputRaw);
    match.hitstopTimer = Math.max(0, match.hitstopTimer - dt);
    return;
  }

  if (match.phase === 'intro') {
    match.phaseTimer -= dt;
    if (match.phaseTimer <= 0) {
      match.phase = 'fight';
      match.phaseTimer = 0;
      match.events.push({ type: 'fight_start', slot: 1 });
    }
    return;
  }

  if (match.phase === 'finish_him') {
    const winSlot = match.winnerSlot ?? 1;
    const p1Eff = winSlot === 1 ? p1Input : EMPTY_INPUT;
    const p2Eff = winSlot === 2 && p2InputRaw ? p2InputRaw : EMPTY_INPUT;
    updateFighter(match, match.p1, match.p2, p1Eff, dt);
    updateFighter(match, match.p2, match.p1, p2Eff, dt);
    separateFighters(match.p1, match.p2);

    const attacker = winSlot === 1 ? match.p1 : match.p2;
    const defender = winSlot === 1 ? match.p2 : match.p1;
    const hitBoxes = getActiveHitboxBoxes(attacker);
    const hurtBoxes = getHurtboxBoxes(defender);
    const contact =
      hitBoxes.length > 0 && hurtBoxes.length > 0
        ? getOverlapBox(hitBoxes[0], hurtBoxes[0])
        : null;
    if (contact && !attacker.hasResolvedContactThisAttack) {
      attacker.hasResolvedContactThisAttack = true;
      attacker.hasHitThisAttack = true;
      match.debugContacts.push({ ...contact, ttl: 0.2 });
      triggerKO(match, attacker, defender, true);
      return;
    }

    for (let i = match.projectiles.length - 1; i >= 0; i--) {
      const p = match.projectiles[i];
      p.x += p.vx * dt;
      p.life -= dt;
      if (p.life <= 0 || p.x < -60 || p.x > ARENA_WIDTH + 60) {
        match.projectiles.splice(i, 1);
        continue;
      }
      if (p.ownerSlot === winSlot) {
        const projBox: CollisionBox = {
          x: p.x - p.radius,
          y: p.y - p.radius,
          width: p.radius * 2,
          height: p.radius * 2,
        };
        const defBoxes = getHurtboxBoxes(defender);
        if (defBoxes.length > 0 && intersectsAABB(projBox, defBoxes[0])) {
          match.projectiles.splice(i, 1);
          triggerKO(match, attacker, defender, true);
          return;
        }
      }
    }

    match.phaseTimer -= dt;
    if (match.phaseTimer <= 0) {
      triggerKO(match, attacker, defender, false);
    }
    return;
  }

  if (match.phase === 'ko') {
    updateFighter(match, match.p1, match.p2, EMPTY_INPUT, dt);
    updateFighter(match, match.p2, match.p1, EMPTY_INPUT, dt);
    match.phaseTimer -= dt;
    if (match.phaseTimer <= 0) {
      if (match.p1Rounds >= 2 || match.p2Rounds >= 2) {
        match.matchWinnerSlot = match.p1Rounds >= 2 ? 1 : 2;
        if (match.matchWinnerSlot === 1) {
          match.rivalsDefeated += 1;
        }
        match.phase = 'match_end';
      } else {
        match.roundNumber += 1;
        resetRound(match);
      }
    }
    return;
  }

  if (match.phase === 'match_end') {
    return;
  }

  if (match.mode !== 'training') {
    match.timer = Math.max(0, match.timer - dt);
    if (match.timer === 0) {
      const p1Pct = match.p1.hp / match.p1.maxHp;
      const p2Pct = match.p2.hp / match.p2.maxHp;
      if (p1Pct >= p2Pct) {
        triggerKO(match, match.p1, match.p2);
      } else {
        triggerKO(match, match.p2, match.p1);
      }
      return;
    }
  }

  const arcadeAi =
    match.mode === 'arcade'
      ? getArcadeStageDifficulty(
          match.difficulty,
          match.arcadeStageIndex,
          match.arcadeLadder.length,
          match.p2.profile.isBoss
        )
      : null;
  const diffScale = arcadeAi ? arcadeAi.scale : 1.0;
  const effectiveDiff = arcadeAi ? arcadeAi.difficulty : match.difficulty;

  let p2Input: InputSnapshot;
  if (match.mode === 'training') {
    p2Input =
      p2InputRaw ??
      computeTrainingDummyInput(match.p2, match.p1, match.trainingConfig, dt);
  } else if (match.mode === 'vs_2p' && p2InputRaw) {
    p2Input = p2InputRaw;
  } else {
    p2Input = computeCpuInput(match.p2, match.p1, dt, diffScale, effectiveDiff);
  }

  updateFighter(match, match.p1, match.p2, p1Input, dt);
  updateFighter(match, match.p2, match.p1, p2Input, dt);
  separateFighters(match.p1, match.p2);

  // H-03: Check !hasResolvedContactThisAttack BEFORE resolving contact, then set hasHitThisAttack AFTER applyHit
  const p1HitBoxes = getActiveHitboxBoxes(match.p1);
  const p2HurtBoxes = getHurtboxBoxes(match.p2);
  if (
    p1HitBoxes.length > 0 &&
    p2HurtBoxes.length > 0 &&
    !match.p1.hasResolvedContactThisAttack
  ) {
    const overlap = getOverlapBox(p1HitBoxes[0], p2HurtBoxes[0]);
    if (overlap) {
      const spec = getFighterAttackSpec(match.p1, match.p1.action);
      const resolution = applyHit(
        match,
        match.p1,
        match.p2,
        p2Input,
        spec.damage,
        spec.hitstun,
        spec.knockbackX,
        spec.knockbackY,
        spec.hitstop,
        spec.meterGain,
        match.p1.action
      );
      match.p1.hasResolvedContactThisAttack = true;
      match.p1.lastHitResolution = resolution;
      match.p1.hasHitThisAttack =
        resolution === 'hit' || resolution === 'counter_hit';
      if (match.p1.hasHitThisAttack && spec.isMultiHit) {
        match.p1.multiHitCount += 1;
      }
      match.debugContacts.push({ ...overlap, ttl: 0.2 });
    }
  }

  const p2HitBoxes = getActiveHitboxBoxes(match.p2);
  const p1HurtBoxes = getHurtboxBoxes(match.p1);
  if (
    p2HitBoxes.length > 0 &&
    p1HurtBoxes.length > 0 &&
    !match.p2.hasResolvedContactThisAttack
  ) {
    const overlap = getOverlapBox(p2HitBoxes[0], p1HurtBoxes[0]);
    if (overlap) {
      const spec = getFighterAttackSpec(match.p2, match.p2.action);
      const resolution = applyHit(
        match,
        match.p2,
        match.p1,
        p1Input,
        spec.damage,
        spec.hitstun,
        spec.knockbackX,
        spec.knockbackY,
        spec.hitstop,
        spec.meterGain,
        match.p2.action
      );
      match.p2.hasResolvedContactThisAttack = true;
      match.p2.lastHitResolution = resolution;
      match.p2.hasHitThisAttack =
        resolution === 'hit' || resolution === 'counter_hit';
      if (match.p2.hasHitThisAttack && spec.isMultiHit) {
        match.p2.multiHitCount += 1;
      }
      match.debugContacts.push({ ...overlap, ttl: 0.2 });
    }
  }

  // Projectile Clash (opposing projectiles cancel each other out)
  for (let i = 0; i < match.projectiles.length; i++) {
    const projA = match.projectiles[i];
    for (let j = i + 1; j < match.projectiles.length; j++) {
      const projB = match.projectiles[j];
      if (projA.ownerSlot !== projB.ownerSlot) {
        const dist = Math.hypot(projA.x - projB.x, projA.y - projB.y);
        if (dist < projA.radius + projB.radius) {
          match.events.push({
            type: 'block',
            slot: projA.ownerSlot,
            targetSlot: projB.ownerSlot,
            x: (projA.x + projB.x) / 2,
            y: (projA.y + projB.y) / 2,
            color: '#facc15',
            shake: 4,
          });
          match.debugContacts.push({
            x: (projA.x + projB.x) / 2 - 16,
            y: (projA.y + projB.y) / 2 - 16,
            width: 32,
            height: 32,
            ttl: 0.2,
          });
          match.projectiles.splice(j, 1);
          match.projectiles.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }

  // Projectiles: H-02 uses projectile.baseDamage (no double multiplication)
  for (let i = match.projectiles.length - 1; i >= 0; i--) {
    const p = match.projectiles[i];
    p.x += p.vx * dt;
    p.life -= dt;
    if (p.life <= 0 || p.x < -60 || p.x > ARENA_WIDTH + 60) {
      match.projectiles.splice(i, 1);
      continue;
    }

    const target = p.ownerSlot === 1 ? match.p2 : match.p1;
    const attacker = p.ownerSlot === 1 ? match.p1 : match.p2;
    const targetInput = p.ownerSlot === 1 ? p2Input : p1Input;

    const projBox: CollisionBox = {
      x: p.x - p.radius,
      y: p.y - p.radius,
      width: p.radius * 2,
      height: p.radius * 2,
    };

    const targetHurtBoxes = getHurtboxBoxes(target);
    if (targetHurtBoxes.length > 0) {
      const overlap = getOverlapBox(projBox, targetHurtBoxes[0]);
      if (overlap) {
        const hadouDef = ATTACK_DEFINITIONS.power_hadou;
        applyHit(
          match,
          attacker,
          target,
          targetInput,
          p.baseDamage,
          framesToSeconds(hadouDef.hitstunFrames),
          hadouDef.knockbackX,
          hadouDef.knockbackY,
          framesToSeconds(hadouDef.hitstopFrames),
          hadouDef.meterGain,
          'power_hadou'
        );
        match.debugContacts.push({ ...overlap, ttl: 0.2 });
        match.projectiles.splice(i, 1);
      }
    }
  }
}

export const EMPTY_INPUT: InputSnapshot = {
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
