import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_DIFFICULTY_MODIFIERS,
  computeAdvancedCpuInput,
  getArcadeStageDifficulty,
} from './ai';
import {
  evaluateRosterBalance,
  runHeadlessMirrorMatch,
} from './balance';
import {
  getAttackFrameAdvantage,
  isInfiniteComboLoop,
  secondsToFrames,
} from './combat';
import { GAME_CONFIG } from './config';
import {
  ALL_OPPONENT_IDS,
  FIGHTERS,
  PLAYABLE_FIGHTER_IDS,
} from './fighters';
import {
  GamepadButtonLike,
  assignGamepadsToPlayers,
  findGamepadByIndex,
  mapGamepadToInput,
  mergeInputs,
  readGamepadLiveLabels,
  scoreGamepadPriority,
  triggerGamepadRumble,
  triggerPlayerRumble,
} from './gamepad';
import {
  DEFAULT_P1_BINDINGS,
  DEFAULT_P1_SOLO_SECONDARY_BINDINGS,
  DEFAULT_P2_BINDINGS,
  DEFAULT_SYSTEM_BINDINGS,
  buildKeyboardInputSnapshot,
  hasBindingConflict,
  hasCrossPlayerConflict,
  hasInternalBindingDuplicates,
  sanitizeInputSnapshot,
} from './input';
import {
  ALL_TRACK_IDS,
  BATTLE_TRACK_IDS,
  INTRO_VIDEO_SRC,
  SONG_TRACKS,
  TITLE_TRACK_ID,
  audioEngine,
  pickRandomBattleTrack,
} from './audio';
import {
  ATTACK_DEFINITIONS,
  EMPTY_INPUT,
  MAX_SUPER_METER,
  applyHit,
  buildArcadeLadder,
  calculateFinalDamage,
  canCancelCurrentAttack,
  canTransitionFighterState,
  computeFacingNumpad,
  computeTrainingDummyInput,
  createFighterState,
  createMatchState,
  detectSpecialMotion,
  framesToSeconds,
  getComboPhraseForHit,
  getComboScaling,
  getFighterAttackSpec,
  getKillerInstinctLabel,
  intersectsAABB,
  isBlockingAgainst,
  recordDirectionSample,
  resetTrainingState,
  stepMatch,
  validateAttack,
} from './rules';
import {
  FIGHTER_SHEET_CONFIG,
  getExpectedTotalFrames,
  selectSheetFrame,
} from './spriteSheet';
import { STAGES, getArcadeStageForIndex } from './stages';

test('roster contains all 7 requested Chilean urban singers and final boss Disquera Internacional', () => {
  assert.equal(PLAYABLE_FIGHTER_IDS.length, 7);
  const expected = [
    'marcianeke',
    'pablo_chille',
    'juliano_sosa',
    'jere_klein',
    'bayron_fire',
    'loyalty',
    'cris_mj',
  ];
  for (const id of expected) {
    assert.ok(PLAYABLE_FIGHTER_IDS.includes(id as typeof PLAYABLE_FIGHTER_IDS[number]));
    assert.ok(FIGHTERS[id as keyof typeof FIGHTERS].powerMoves.hadou.length > 0);
    assert.ok(FIGHTERS[id as keyof typeof FIGHTERS].powerMoves.shoryu.length > 0);
    assert.ok(FIGHTERS[id as keyof typeof FIGHTERS].powerMoves.slam.length > 0);
    assert.ok(FIGHTERS[id as keyof typeof FIGHTERS].powerMoves.tornado.length > 0);
  }
  assert.ok(ALL_OPPONENT_IDS.includes('disquera_internacional'));
  assert.equal(FIGHTERS.disquera_internacional.isBoss, true);
  assert.equal(FIGHTERS.disquera_internacional.name, 'Disquera Internacional');
});

test('stages include Movistar Arena, Lollapalooza, Discoteca en el Pantano, Cancha de la Pobla, Santiago, and Torre Disquera', () => {
  const stageIds = Object.keys(STAGES);
  for (const req of [
    'movistar_arena',
    'lollapalooza',
    'discoteca_pantano',
    'cancha_pobla',
    'santiago_calle',
    'torre_disquera',
  ]) {
    assert.ok(stageIds.includes(req));
  }
  assert.equal(getArcadeStageForIndex(6, 7), 'torre_disquera');
});

test('arcade ladder fights ALL 6 non-selected rivals in random order and finishes with Disquera Internacional as final boss', () => {
  for (const id of PLAYABLE_FIGHTER_IDS) {
    const ladder = buildArcadeLadder(id);
    assert.equal(ladder.length, PLAYABLE_FIGHTER_IDS.length);
    assert.equal(ladder[ladder.length - 1], 'disquera_internacional');
    const preBoss = ladder.slice(0, -1);
    assert.equal(preBoss.length, PLAYABLE_FIGHTER_IDS.length - 1);
    assert.ok(!preBoss.includes(id));
    for (const rival of PLAYABLE_FIGHTER_IDS) {
      if (rival !== id) {
        assert.ok(preBoss.includes(rival), `Expected ${rival} in arcade ladder for ${id}`);
      }
    }
  }

  // Different RNG seeds produce shuffled rival sequences
  const seqA = buildArcadeLadder('cris_mj', () => 0.12).join(',');
  const seqB = buildArcadeLadder('cris_mj', () => 0.87).join(',');
  assert.notEqual(seqA, seqB);
});

test('arcade AI difficulty scales progressively across stages and peaks at expert on Disquera Internacional', () => {
  const stage0 = getArcadeStageDifficulty('normal', 0, 7, false);
  const stage3 = getArcadeStageDifficulty('normal', 3, 7, false);
  const stage5 = getArcadeStageDifficulty('normal', 5, 7, false);
  const boss = getArcadeStageDifficulty('easy', 6, 7, true);

  assert.ok(stage0.scale < stage3.scale && stage3.scale < stage5.scale);
  assert.ok(stage5.scale < boss.scale);
  assert.equal(boss.difficulty, 'expert');
  assert.ok(boss.label.includes('JEFE FINAL'));
});

test('phrases ONLY trigger on combos (2+ hits) or special/power/ultra moves, never on single normal hits', () => {
  const marcianeke = FIGHTERS.marcianeke;
  assert.equal(getComboPhraseForHit(marcianeke, 1, 'light_punch'), null);
  assert.equal(getComboPhraseForHit(marcianeke, 1, 'heavy_punch'), null);
  assert.equal(getComboPhraseForHit(marcianeke, 1, 'light_kick'), null);
  assert.equal(getComboPhraseForHit(marcianeke, 1, 'heavy_kick'), null);
  assert.equal(
    getComboPhraseForHit(marcianeke, 2, 'light_kick'),
    marcianeke.comboPhrases.twoHit
  );
  assert.equal(
    getComboPhraseForHit(marcianeke, 3, 'heavy_punch'),
    marcianeke.comboPhrases.threeHit
  );
  assert.equal(
    getComboPhraseForHit(marcianeke, 4, 'heavy_kick'),
    marcianeke.comboPhrases.fourPlus
  );
  assert.equal(
    getComboPhraseForHit(marcianeke, 1, 'power_hadou'),
    marcianeke.comboPhrases.twoHit
  );
  assert.equal(
    getComboPhraseForHit(marcianeke, 1, 'super'),
    marcianeke.comboPhrases.superHit
  );
});

test('Killer Instinct combo callouts escalate from DOUBLE COMBO! up to ¡ULTRA COMBOOOOO!', () => {
  assert.equal(getKillerInstinctLabel(0), null);
  assert.equal(getKillerInstinctLabel(1), null);
  assert.equal(getKillerInstinctLabel(2), 'DOUBLE COMBO!');
  assert.equal(getKillerInstinctLabel(3), 'TRIPLE COMBO!');
  assert.equal(getKillerInstinctLabel(4), 'SUPER COMBO!');
  assert.equal(getKillerInstinctLabel(5), 'HYPER COMBO!');
  assert.equal(getKillerInstinctLabel(6), 'BRUTAL COMBO!');
  assert.equal(getKillerInstinctLabel(8), 'MASTER COMBO!');
  assert.equal(getKillerInstinctLabel(11), 'AWESOME COMBO!');
  assert.equal(getKillerInstinctLabel(13), '¡ULTRA COMBOOOOO!');
});

test('Street Fighter directional motions detect QCF Hadou, DP Shoryu, QCB Slam, and HCF Tornado for both facings', () => {
  // Facing right (+1)
  const pRight = createFighterState(1, 'cris_mj');
  pRight.facing = 1;

  // 1) ↓ ↘ → + Puño => power_hadou
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true, right: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, right: true }, 0.016);
  assert.equal(detectSpecialMotion(pRight.dirHistory, 'punch'), 'power_hadou');

  // 2) → ↓ ↘ + Puño => power_shoryu
  pRight.dirHistory = [];
  recordDirectionSample(pRight, { ...EMPTY_INPUT, right: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true, right: true }, 0.016);
  assert.equal(detectSpecialMotion(pRight.dirHistory, 'punch'), 'power_shoryu');

  // 3) ↓ ↙ ← + Patada => power_slam
  pRight.dirHistory = [];
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true, left: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, left: true }, 0.016);
  assert.equal(detectSpecialMotion(pRight.dirHistory, 'kick'), 'power_slam');

  // 4) ← ↙ ↓ ↘ → + Patada => power_tornado
  pRight.dirHistory = [];
  recordDirectionSample(pRight, { ...EMPTY_INPUT, left: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true, left: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, down: true, right: true }, 0.016);
  recordDirectionSample(pRight, { ...EMPTY_INPUT, right: true }, 0.016);
  assert.equal(detectSpecialMotion(pRight.dirHistory, 'kick'), 'power_tornado');

  // Facing left (-1): mirrored directional inputs (down -> down-left -> left = 2 -> 3 -> 6)
  const pLeft = createFighterState(2, 'jere_klein');
  pLeft.facing = -1;
  assert.equal(computeFacingNumpad({ ...EMPTY_INPUT, down: true, left: true }, -1), 3);
  recordDirectionSample(pLeft, { ...EMPTY_INPUT, down: true }, 0.016);
  recordDirectionSample(pLeft, { ...EMPTY_INPUT, down: true, left: true }, 0.016);
  recordDirectionSample(pLeft, { ...EMPTY_INPUT, left: true }, 0.016);
  assert.equal(detectSpecialMotion(pLeft.dirHistory, 'punch'), 'power_hadou');
});

test('Target combo X (light_punch) -> A (light_kick) -> Y (heavy_punch) chains cleanly and emits Killer Instinct callout + phrase', () => {
  const match = createMatchState('vs_2p', 'cris_mj', 'pablo_chille');
  match.phase = 'fight';
  match.p1.x = 500;
  match.p2.x = 575;

  // Hit 1: X (light_punch)
  stepMatch(
    match,
    { ...EMPTY_INPUT, lightPunchPressed: true },
    EMPTY_INPUT,
    0.016
  );
  assert.equal(match.p1.action, 'light_punch');

  let hit1 = false;
  for (let i = 0; i < 8; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
    if (match.p1.hasHitThisAttack) {
      hit1 = true;
      break;
    }
  }
  assert.equal(hit1, true);
  assert.equal(match.p1.comboCount, 1);
  assert.equal(match.p1.phraseText, null); // Single hit must NEVER show phrase

  // Hit 2: Chain into A (light_kick)
  stepMatch(
    match,
    { ...EMPTY_INPUT, lightKickPressed: true },
    EMPTY_INPUT,
    0.016
  );
  for (let i = 0; i < 5 && match.p1.action === 'light_punch'; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
  }
  assert.equal(match.p1.action, 'light_kick');

  let killer2: string | null | undefined;
  let emittedPhrase = false;
  for (let i = 0; i < 12; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
    const hitEvt = match.events.find(
      (e) => (e.type === 'hit_light' || e.type === 'hit_heavy') && e.slot === 1
    );
    if (hitEvt) killer2 = hitEvt.killerLabel;
    if (match.events.some((e) => e.type === 'combo_phrase' && e.slot === 1)) {
      emittedPhrase = true;
      break;
    }
  }
  assert.equal(emittedPhrase, true);
  assert.equal(match.p1.comboCount, 2);
  assert.equal(killer2, 'DOUBLE COMBO!');
  assert.equal(match.p1.phraseText, FIGHTERS.cris_mj.comboPhrases.twoHit);

  // Hit 3: Chain into Y (heavy_punch) -> TRIPLE COMBO!
  stepMatch(
    match,
    { ...EMPTY_INPUT, heavyPunchPressed: true },
    EMPTY_INPUT,
    0.016
  );
  for (let i = 0; i < 6 && match.p1.action === 'light_kick'; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
  }
  assert.equal(match.p1.action, 'heavy_punch');
  let killer3: string | null | undefined;
  for (let i = 0; i < 14; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
    const hitEvt = match.events.find(
      (e) => (e.type === 'hit_light' || e.type === 'hit_heavy') && e.slot === 1
    );
    if (hitEvt) killer3 = hitEvt.killerLabel;
    if (match.p1.comboCount >= 3) break;
  }
  assert.equal(match.p1.comboCount, 3);
  assert.equal(killer3, 'TRIPLE COMBO!');
});

test('Poder Ultra (RB/RT) is strictly locked until all 3 energy bars reach MAX_SUPER_METER (300)', () => {
  assert.equal(MAX_SUPER_METER, 300);
  const match = createMatchState('vs_2p', 'cris_mj', 'jere_klein');
  match.phase = 'fight';
  match.p1.x = 500;
  match.p2.x = 610;
  match.p1.superMeter = 299;

  stepMatch(match, { ...EMPTY_INPUT, ultraPressed: true }, EMPTY_INPUT, 0.016);
  assert.notEqual(match.p1.action, 'super');
  assert.equal(match.p1.superMeter, 299);

  // Charge to full 300 (3/3 bars)
  match.p1.superMeter = 300;
  stepMatch(match, { ...EMPTY_INPUT, ultraPressed: true }, EMPTY_INPUT, 0.016);
  assert.equal(match.p1.action, 'super');
  assert.equal(match.p1.superMeter, 0);
  assert.ok(match.events.some((e) => e.type === 'super' && e.slot === 1));
});

test('blocking mitigates damage and does not start an attacker combo', () => {
  const match = createMatchState('vs_2p', 'bayron_fire', 'juliano_sosa');
  match.phase = 'fight';
  match.p1.x = 500;
  match.p2.x = 590;

  const initialHp = match.p2.hp;
  stepMatch(
    match,
    { ...EMPTY_INPUT, heavyPunchPressed: true },
    { ...EMPTY_INPUT, blockHeld: true },
    0.016
  );
  let blocked = false;
  for (let i = 0; i < 15; i++) {
    stepMatch(
      match,
      EMPTY_INPUT,
      { ...EMPTY_INPUT, blockHeld: true },
      0.016
    );
    if (match.events.some((e) => e.type === 'block')) {
      blocked = true;
      break;
    }
  }
  assert.equal(blocked, true);
  assert.equal(match.p1.comboCount, 0);
  assert.ok(initialHp - match.p2.hp < 40);
});

test('match point triggers finish_him (¡REMÁTALO!) then resolves via finisher strike to KO (winner victory) and match_end', () => {
  const match = createMatchState('vs_2p', 'loyalty', 'jere_klein');
  match.phase = 'fight';
  match.p1.x = 500;
  match.p2.x = 580;
  match.p2.hp = 10;
  match.p1Rounds = 1; // Match Point

  let sawFinishHim = false;
  stepMatch(match, { ...EMPTY_INPUT, lightPunchPressed: true }, EMPTY_INPUT, 0.016);
  for (let i = 0; i < 15; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
    if (match.events.some((e) => e.type === 'finish_him')) {
      sawFinishHim = true;
    }
    if ((match.phase as string) === 'finish_him') break;
  }
  assert.equal(sawFinishHim, true);
  assert.equal(match.phase, 'finish_him');
  assert.equal(match.p2.action, 'dizzy');

  for (let i = 0; i < 10; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.02);
  }
  let sawFinisher = false;
  let sawKo = false;
  stepMatch(match, { ...EMPTY_INPUT, heavyKickPressed: true }, EMPTY_INPUT, 0.016);
  for (let i = 0; i < 20; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
    if (match.events.some((e) => e.type === 'finisher')) sawFinisher = true;
    if (match.events.some((e) => e.type === 'ko')) sawKo = true;
    if ((match.phase as string) === 'ko') break;
  }
  assert.equal(sawFinisher, true);
  assert.equal(sawKo, true);
  assert.equal(match.finisherLanded, true);
  assert.equal(match.phase, 'ko');
  assert.equal(match.p1.action, 'victory');
  assert.equal(match.p1Rounds, 2);

  for (let i = 0; i < 150; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.03);
    if ((match.phase as string) === 'match_end') break;
  }
  assert.equal(match.phase, 'match_end');
  assert.equal(match.matchWinnerSlot, 1);
});

test('first_strike, counter_hit bonus, and dizzy stun trigger on combat interruptions and stun build-up', () => {
  const match = createMatchState('vs_2p', 'marcianeke', 'pablo_chille');
  match.phase = 'fight';
  match.p1.x = 500;
  match.p2.x = 580;
  match.p2.dizzyMeter = 90;

  stepMatch(
    match,
    { ...EMPTY_INPUT, lightPunchPressed: true },
    { ...EMPTY_INPUT, heavyKickPressed: true },
    0.016
  );

  let sawFirstStrike = false;
  let sawCounterHit = false;
  let sawDizzy = false;

  for (let i = 0; i < 12; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, 0.016);
    if (match.events.some((e) => e.type === 'first_strike')) sawFirstStrike = true;
    if (match.events.some((e) => e.type === 'counter_hit')) sawCounterHit = true;
    if (match.events.some((e) => e.type === 'dizzy')) sawDizzy = true;
  }

  assert.equal(sawFirstStrike, true);
  assert.equal(sawCounterHit, true);
  assert.equal(sawDizzy, true);
  assert.equal(match.p2.action, 'dizzy');
  assert.ok(match.score >= 250);
});

test('Xbox mapper maps X=lightPunch, Y=heavyPunch, A=lightKick (never jump!), B=heavyKick, RB/RT=ultra, LB=block, LT=dash', () => {
  const makeButtons = (overrides: Record<number, GamepadButtonLike> = {}) => {
    const arr: GamepadButtonLike[] = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    for (const [k, v] of Object.entries(overrides)) {
      arr[Number(k)] = v;
    }
    return arr;
  };

  // Frame 1: A (0 -> lightKick, NOT jump), X (2 -> lightPunch), Y (3 -> heavyPunch), B (1 -> heavyKick), LB (4 -> blockHeld), LT (6 -> dash), RT (7 -> ultra), D-pad Right (15)
  const first = mapGamepadToInput({
    id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
    connected: true,
    mapping: 'standard',
    axes: [0.15, -0.2, 0, 0], // within deadzone
    buttons: makeButtons({
      0: { pressed: true },
      2: { pressed: true },
      4: { pressed: true },
      6: { pressed: false, value: 0.72 },
      7: { pressed: false, value: 0.75 },
      15: { pressed: true },
    }),
  });

  assert.equal(first.connected, true);
  assert.equal(first.input.left, false);
  assert.equal(first.input.right, true);
  assert.equal(first.input.up, false); // Crucial: pressing A must NOT jump!
  assert.equal(first.input.lightKickPressed, true);
  assert.equal(first.input.lightPunchPressed, true);
  assert.equal(first.input.dashPressed, true);
  assert.equal(first.input.ultraPressed, true);
  assert.equal(first.input.blockHeld, true);
  assert.equal(first.nav.confirmPressed, true);

  // Frame 2: Holding X/RT does NOT re-trigger edge buttons; Stick Left (-0.8) + Stick Up (-0.8) moves + jumps; Y & B & RB newly pressed
  const second = mapGamepadToInput(
    {
      id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
      connected: true,
      mapping: 'standard',
      axes: [-0.8, -0.8, 0, 0],
      buttons: makeButtons({
        1: { pressed: true }, // B newly pressed
        2: { pressed: true }, // X held
        3: { pressed: true }, // Y newly pressed
        4: { pressed: true }, // LB held
        7: { pressed: false, value: 0.8 }, // RT held
        9: { pressed: true }, // Start newly pressed
      }),
    },
    first.nextButtons
  );

  assert.equal(second.input.left, true);
  assert.equal(second.input.up, true);
  assert.equal(second.input.lightPunchPressed, false);
  assert.equal(second.input.heavyPunchPressed, true);
  assert.equal(second.input.heavyKickPressed, true);
  assert.equal(second.input.ultraPressed, false);
  assert.equal(second.input.blockHeld, true);
  assert.equal(second.nav.pausePressed, true);

  const merged = mergeInputs(
    { ...EMPTY_INPUT, ultraPressed: true },
    second.input
  );
  assert.equal(merged.left, true);
  assert.equal(merged.ultraPressed, true);
  assert.equal(merged.heavyPunchPressed, true);
  assert.equal(merged.blockHeld, true);
});

test('Xbox prioritization, non-standard D-pad axes/hat-switch, and live diagnostic labels work cleanly', () => {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  buttons[2] = { pressed: true, value: 1 }; // X
  buttons[5] = { pressed: true, value: 1 }; // RB

  const xboxPad = {
    id: 'Microsoft X-Box One S pad',
    connected: true,
    mapping: '',
    axes: [0, 0, 0, 0, 0, 0, 1, 0],
    buttons,
  };
  const virtualHid = {
    id: 'Virtual Consumer Control',
    connected: true,
    mapping: '',
    axes: [],
    buttons: [{ pressed: false }],
  };

  assert.ok(scoreGamepadPriority(xboxPad) > scoreGamepadPriority(virtualHid));
  const res = mapGamepadToInput(xboxPad);
  assert.equal(res.input.right, true);
  assert.equal(res.input.lightPunchPressed, true);
  assert.equal(res.input.ultraPressed, true);
  const labels = readGamepadLiveLabels(xboxPad);
  assert.ok(labels.some((l) => l.includes('X')));
  assert.ok(labels.some((l) => l.includes('RB')));
  assert.ok(labels.includes('Der'));
});

test('All 8 fighter sprite sheets map valid multi-frame poses for all actions, SF powers, KO, and victory', () => {
  for (const id of ALL_OPPONENT_IDS) {
    const totalFrames = getExpectedTotalFrames(id);
    assert.ok(totalFrames >= 80, `${id} should have rich multi-row frames (got ${totalFrames})`);
    assert.equal(FIGHTER_SHEET_CONFIG[id].rowBands.length, FIGHTER_SHEET_CONFIG[id].rowCounts.length);
    const maxFrame = totalFrames - 1;
    const checks = [
      selectSheetFrame(id, 'idle', 0, 0, 0, 0),
      selectSheetFrame(id, 'idle', 0, 0, 0, 0.5),
      selectSheetFrame(id, 'walk', 0, 0, 0, 0),
      selectSheetFrame(id, 'walk', 0, 45, 0, 0),
      selectSheetFrame(id, 'dash', 0.05, 0, 0, 0),
      selectSheetFrame(id, 'jump', 0.05, 0, -400, 0),
      selectSheetFrame(id, 'jump', 0.25, 0, 0, 0),
      selectSheetFrame(id, 'jump', 0.45, 0, 350, 0),
      selectSheetFrame(id, 'hitstun', 0.1, 0, 0, 0.1),
      selectSheetFrame(id, 'dizzy', 0.2, 0, 0, 0),
      selectSheetFrame(id, 'block', 0.1, 0, 0, 0),
      selectSheetFrame(id, 'crouch', 0.1, 0, 0, 0),
      selectSheetFrame(id, 'light_punch', 0.02, 0, 0, 0),
      selectSheetFrame(id, 'light_punch', 0.18, 0, 0, 0),
      selectSheetFrame(id, 'heavy_punch', 0.12, 0, 0, 0),
      selectSheetFrame(id, 'light_kick', 0.1, 0, 0, 0),
      selectSheetFrame(id, 'heavy_kick', 0.14, 0, 0, 0),
      selectSheetFrame(id, 'uppercut', 0.14, 0, 0, 0),
      selectSheetFrame(id, 'power_hadou', 0.18, 0, 0, 0),
      selectSheetFrame(id, 'power_shoryu', 0.14, 0, -300, 0),
      selectSheetFrame(id, 'power_slam', 0.14, 0, 0, 0),
      selectSheetFrame(id, 'power_tornado', 0.14, 0, 0, 0),
      selectSheetFrame(id, 'super', 0.24, 0, 0, 0),
      selectSheetFrame(id, 'ko', 0.08, 0, 0, 0),
      selectSheetFrame(id, 'ko', 0.5, 0, 0, 0),
      selectSheetFrame(id, 'victory', 0.5, 0, 0, 0),
    ];

    for (const sel of checks) {
      assert.ok(sel.frameIdx >= 0 && sel.frameIdx <= maxFrame, `${id} frameIdx ${sel.frameIdx} out of bounds (max ${maxFrame})`);
    }

    assert.equal(checks[checks.length - 3].isLyingKo, false);
    assert.equal(checks[checks.length - 2].isLyingKo, true);
  }
});

test('H-01: Default P1, P2, solo secondary, and System key bindings have zero conflicts or internal duplicates', () => {
  assert.deepEqual(
    hasBindingConflict(DEFAULT_P1_BINDINGS, DEFAULT_SYSTEM_BINDINGS),
    []
  );
  assert.deepEqual(
    hasBindingConflict(DEFAULT_P1_SOLO_SECONDARY_BINDINGS, DEFAULT_SYSTEM_BINDINGS),
    []
  );
  assert.deepEqual(
    hasBindingConflict(DEFAULT_P2_BINDINGS, DEFAULT_SYSTEM_BINDINGS),
    []
  );
  assert.deepEqual(
    hasCrossPlayerConflict(DEFAULT_P1_BINDINGS, DEFAULT_P2_BINDINGS),
    []
  );
  assert.deepEqual(hasInternalBindingDuplicates(DEFAULT_P1_BINDINGS), []);
  assert.deepEqual(
    hasInternalBindingDuplicates(DEFAULT_P1_SOLO_SECONDARY_BINDINGS),
    []
  );
  assert.deepEqual(hasInternalBindingDuplicates(DEFAULT_P2_BINDINGS), []);

  // Verify detector flags real conflicts (like legacy KeyR/KeyP overlap)
  assert.deepEqual(
    hasBindingConflict(DEFAULT_P1_BINDINGS, {
      pause: 'KeyP',
      mute: 'KeyM',
      restart: 'KeyR',
    }),
    ['KeyR']
  );

  // Pressing KeyR triggers P1 heavyPunch without colliding with system restart (F2)
  const held = new Set<string>(['KeyR']);
  const just = new Set<string>(['KeyR']);
  const snap = buildKeyboardInputSnapshot(held, just, DEFAULT_P1_BINDINGS);
  assert.equal(snap.heavyPunchPressed, true);
  assert.notEqual(DEFAULT_SYSTEM_BINDINGS.restart, 'KeyR');
  assert.notEqual(DEFAULT_SYSTEM_BINDINGS.pause, 'KeyP');
});

test('H-02: Projectile damage uses single powerMult calculation without double scaling', () => {
  const match = createMatchState('vs_2p', 'disquera_internacional', 'cris_mj');
  match.phase = 'fight';
  match.p1.x = 300;
  match.p2.x = 760;

  // Trigger power_hadou manually on Boss (powerMult 1.18)
  match.p1.dirHistory = [
    { dir: 2, age: 0.08 },
    { dir: 3, age: 0.04 },
    { dir: 6, age: 0.0 },
  ];
  stepMatch(match, { ...EMPTY_INPUT, heavyPunchPressed: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.equal(match.p1.action, 'power_hadou');

  for (let i = 0; i < 12; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
    if (match.projectiles.length > 0) break;
  }
  assert.equal(match.projectiles.length, 1);
  assert.equal(match.projectiles[0].baseDamage, 92);

  const initialHp = match.p2.hp;
  for (let i = 0; i < 60; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
    if (match.p2.hp < initialHp) break;
  }

  const dealt = initialHp - match.p2.hp;
  const expected = Math.round(92 * FIGHTERS.disquera_internacional.powerMult);
  assert.equal(dealt, expected);

  assert.throws(() =>
    calculateFinalDamage({
      baseDamage: -10,
      powerMultiplier: 1,
      comboMultiplier: 1,
      counterMultiplier: 1,
      defenseMultiplier: 1,
    })
  );
});

test('H-03: Contact resolution sets hasHitThisAttack AFTER applyHit and CancelPolicy prevents cancel on blocked heavy_punch or whiff', () => {
  // 1) Blocked heavy_punch must resolve as block, keep hasHitThisAttack=false, and disallow cancel
  const blockedMatch = createMatchState('vs_2p', 'cris_mj', 'jere_klein');
  blockedMatch.phase = 'fight';
  blockedMatch.p1.x = 500;
  blockedMatch.p2.x = 590;

  stepMatch(
    blockedMatch,
    { ...EMPTY_INPUT, heavyPunchPressed: true },
    { ...EMPTY_INPUT, blockHeld: true },
    GAME_CONFIG.fixedDt
  );
  for (let i = 0; i < 12; i++) {
    stepMatch(
      blockedMatch,
      EMPTY_INPUT,
      { ...EMPTY_INPUT, blockHeld: true },
      GAME_CONFIG.fixedDt
    );
    if (blockedMatch.p1.hasResolvedContactThisAttack) break;
  }

  assert.equal(blockedMatch.p1.hasResolvedContactThisAttack, true);
  assert.equal(blockedMatch.p1.lastHitResolution, 'block');
  assert.equal(blockedMatch.p1.hasHitThisAttack, false);
  assert.equal(
    canCancelCurrentAttack(
      'heavy_punch',
      blockedMatch.p1.hasHitThisAttack,
      'heavy_kick',
      blockedMatch.p1.lastHitResolution
    ),
    false
  );

  // 2) Clean hit heavy_punch sets hasHitThisAttack=true and allows cancel into heavy_kick
  const hitMatch = createMatchState('vs_2p', 'cris_mj', 'jere_klein');
  hitMatch.phase = 'fight';
  hitMatch.p1.x = 500;
  hitMatch.p2.x = 590;
  stepMatch(
    hitMatch,
    { ...EMPTY_INPUT, heavyPunchPressed: true },
    EMPTY_INPUT,
    GAME_CONFIG.fixedDt
  );
  for (let i = 0; i < 12; i++) {
    stepMatch(hitMatch, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
    if (hitMatch.p1.hasResolvedContactThisAttack) break;
  }
  assert.equal(hitMatch.p1.lastHitResolution, 'hit');
  assert.equal(hitMatch.p1.hasHitThisAttack, true);
  assert.equal(
    canCancelCurrentAttack(
      'heavy_punch',
      hitMatch.p1.hasHitThisAttack,
      'heavy_kick',
      hitMatch.p1.lastHitResolution
    ),
    true
  );

  // 3) Whiff never cancels
  assert.equal(canCancelCurrentAttack('light_punch', false, 'light_kick', null), false);

  // 4) Invulnerable defender resolves as 'invulnerable' without mutating HP
  hitMatch.p2.invulnTimer = 0.5;
  const hpBeforeInvuln = hitMatch.p2.hp;
  const resInv = applyHit(
    hitMatch,
    hitMatch.p1,
    hitMatch.p2,
    EMPTY_INPUT,
    50,
    0.3,
    100,
    0,
    0.05,
    10,
    'light_punch'
  );
  assert.equal(resInv, 'invulnerable');
  assert.equal(hitMatch.p2.hp, hpBeforeInvuln);
});

test('H-04: Player device ownership preserves hardware Gamepad.index across disconnects and rumble degrades safely', () => {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
  const padA = {
    index: 0,
    id: 'Xbox Controller P1',
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons,
  };
  const padB = {
    index: 3,
    id: 'Xbox Controller P2',
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons,
  };

  const initial = assignGamepadsToPlayers([padA, padB]);
  assert.equal(initial[0].gamepadIndex, 0);
  assert.equal(initial[1].gamepadIndex, 3);

  // Disconnect P1 (index 0): P2 keeps index 3 without shifting slots!
  const afterDisconnect = assignGamepadsToPlayers([padB], initial);
  assert.equal(afterDisconnect[0].connected, false);
  assert.equal(afterDisconnect[0].gamepadIndex, null);
  assert.equal(afterDisconnect[1].connected, true);
  assert.equal(afterDisconnect[1].gamepadIndex, 3);

  assert.equal(findGamepadByIndex(99), null);
  assert.doesNotThrow(() => triggerGamepadRumble(99, 100, 0.5, 0.5));
  assert.doesNotThrow(() => triggerPlayerRumble(2, 100, 0.5, 0.5));
});

test('Declarative 60Hz AttackDefinitions, AABB collision, combo scaling, loop prevention, and state transitions are valid', () => {
  for (const [id, def] of Object.entries(ATTACK_DEFINITIONS)) {
    const errors = validateAttack(def);
    assert.deepEqual(errors, [], `Attack ${id} failed validation`);
    const adv = getAttackFrameAdvantage(def);
    assert.ok(Number.isFinite(adv.onHit));
    assert.ok(Number.isFinite(adv.onBlock));
    assert.ok(adv.whiffTotal > 0);
  }

  assert.equal(secondsToFrames(framesToSeconds(15)), 15);
  assert.equal(intersectsAABB({ x: 0, y: 0, width: 50, height: 50 }, { x: 40, y: 40, width: 50, height: 50 }), true);
  assert.equal(intersectsAABB({ x: 0, y: 0, width: 50, height: 50 }, { x: 60, y: 0, width: 50, height: 50 }), false);

  assert.equal(getComboScaling(1), 1);
  assert.ok(getComboScaling(2) < 1);
  assert.equal(getComboScaling(50), 0.25);

  assert.equal(
    isInfiniteComboLoop(['light_punch', 'light_punch', 'light_punch', 'light_punch'], 'light_punch'),
    true
  );

  // Explicit state machine rules: KO cannot transition into offensive moves
  assert.equal(canTransitionFighterState('KO', 'LIGHT_PUNCH'), false);
  assert.equal(canTransitionFighterState('KO', 'SUPER'), false);
  assert.equal(canTransitionFighterState('IDLE', 'LIGHT_PUNCH'), true);
});

test('AI enforces human-like reaction delay before switching into defense on opponent attack', () => {
  const cpu = createFighterState(2, 'pablo_chille');
  const player = createFighterState(1, 'cris_mj');
  cpu.x = 560;
  player.x = 460;

  // Frame 0: Player begins heavy_kick; CPU must NOT instantaneously block on frame 0
  player.action = 'heavy_kick';
  player.actionTimer = 0;

  const frame0Input = computeAdvancedCpuInput(cpu, player, GAME_CONFIG.fixedDt, 'normal', 1);
  assert.equal(frame0Input.blockHeld, false);
  assert.equal(cpu.aiObs?.perceivedOppAction, 'idle');

  // Advance past normal reaction delay
  const stepsNeeded =
    Math.ceil(AI_DIFFICULTY_MODIFIERS.normal.reactionDelaySec / GAME_CONFIG.fixedDt) + 2;
  for (let i = 0; i < stepsNeeded; i++) {
    computeAdvancedCpuInput(cpu, player, GAME_CONFIG.fixedDt, 'normal', 1);
  }
  assert.equal(cpu.aiObs?.perceivedOppAction, 'heavy_kick');
});

test('Training Mode supports infinite health/meter, dummy modes, and deterministic state reset', () => {
  const match = createMatchState('training', 'cris_mj', 'pablo_chille', 0, undefined, 0, 0, 0, 'normal', {
    dummyMode: 'blocking',
    infiniteHealth: true,
    infiniteMeter: true,
    showHitboxes: true,
  });

  assert.equal(match.phase, 'fight');
  assert.equal(match.p1.superMeter, MAX_SUPER_METER);
  assert.equal(match.p2.superMeter, MAX_SUPER_METER);

  match.p2.hp = 5;
  stepMatch(
    match,
    { ...EMPTY_INPUT, heavyPunchPressed: true },
    null,
    GAME_CONFIG.fixedDt
  );
  for (let i = 0; i < 14; i++) {
    stepMatch(match, EMPTY_INPUT, null, GAME_CONFIG.fixedDt);
  }
  assert.ok(match.p2.hp >= 1);
  assert.equal(match.phase, 'fight');

  match.p1.x = 900;
  resetTrainingState(match);
  assert.equal(match.p1.x, 350);
  assert.equal(match.p2.x, GAME_CONFIG.logicalWidth - 350);
  assert.equal(match.p2.hp, match.p2.maxHp);
});

test('Headless simulation and roster balance evaluator run safely without violating HP/meter invariants', () => {
  const mirror = runHeadlessMirrorMatch('cris_mj', 'jere_klein', 'normal', 45);
  assert.ok(mirror.durationSeconds > 0);
  assert.ok(mirror.winnerSlot === 1 || mirror.winnerSlot === 2);

  const report = evaluateRosterBalance('normal', false);
  assert.equal(report.length, PLAYABLE_FIGHTER_IDS.length);
  for (const row of report) {
    assert.ok(row.matchesPlayed >= 1);
    assert.ok(row.winRate >= 0 && row.winRate <= 1);
    assert.ok(row.avgMatchDurationSec > 0);
  }
});

test('Improved strike reach & movement: close/crouching hits connect, cross-up attacks auto-face, and dash cancels into attack', () => {
  // 1) Crouching opponent at close-mid range (150px) gets hit cleanly by step-in light_punch
  const crouchMatch = createMatchState('vs_2p', 'marcianeke', 'pablo_chille');
  crouchMatch.phase = 'fight';
  crouchMatch.p1.x = 500;
  crouchMatch.p2.x = 650;
  stepMatch(
    crouchMatch,
    { ...EMPTY_INPUT, lightPunchPressed: true },
    { ...EMPTY_INPUT, down: true },
    GAME_CONFIG.fixedDt
  );
  for (let i = 0; i < 10; i++) {
    stepMatch(crouchMatch, EMPTY_INPUT, { ...EMPTY_INPUT, down: true }, GAME_CONFIG.fixedDt);
    if (crouchMatch.p1.hasHitThisAttack) break;
  }
  assert.equal(crouchMatch.p1.hasHitThisAttack, true);

  // 2) Cross-up: P1 facing +1 with P2 behind at 560 -> P1 snaps facing to -1 on attack startup & connects
  const crossMatch = createMatchState('vs_2p', 'jere_klein', 'bayron_fire');
  crossMatch.phase = 'fight';
  crossMatch.p1.x = 640;
  crossMatch.p1.facing = 1;
  crossMatch.p2.x = 560;
  stepMatch(crossMatch, { ...EMPTY_INPUT, heavyPunchPressed: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.equal(crossMatch.p1.facing, -1);
  for (let i = 0; i < 12; i++) {
    stepMatch(crossMatch, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
    if (crossMatch.p1.hasHitThisAttack) break;
  }
  assert.equal(crossMatch.p1.hasHitThisAttack, true);

  // 3) Dash cancels cleanly into heavy_kick after 0.10s and closes distance to land
  const dashMatch = createMatchState('vs_2p', 'cris_mj', 'juliano_sosa');
  dashMatch.phase = 'fight';
  dashMatch.p1.x = 400;
  dashMatch.p2.x = 610;
  stepMatch(dashMatch, { ...EMPTY_INPUT, dashPressed: true, right: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.equal(dashMatch.p1.action, 'dash');
  for (let i = 0; i < 6; i++) {
    stepMatch(dashMatch, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  }
  stepMatch(dashMatch, { ...EMPTY_INPUT, heavyKickPressed: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.equal(dashMatch.p1.action, 'heavy_kick');
  for (let i = 0; i < 15; i++) {
    stepMatch(dashMatch, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
    if (dashMatch.p1.hasHitThisAttack) break;
  }
  assert.equal(dashMatch.p1.hasHitThisAttack, true);
});

test('Generated voices and retro oscillator tones are removed while music dominates all normal SFX and ONLY 3-bar RB Ultra rises above music', () => {
  const vols = audioEngine.getVolumes();
  assert.deepEqual(Object.keys(vols).sort(), ['master', 'music', 'sfx']);
  assert.ok(vols.music >= 0.9, 'Music volume must be prominent');
  assert.ok(vols.sfx >= 0.6 && vols.sfx <= 0.75 && vols.music > vols.sfx, 'Hit SFX are boosted yet music remains louder');
  assert.ok(audioEngine.getSfxGain() < audioEngine.getMusicGain(), 'Normal SFX gain must stay beneath music');
  assert.ok(audioEngine.getUltraGain() > audioEngine.getMusicGain(), 'ONLY 3-bar RB Ultra attack sound rises above music');
  assert.doesNotThrow(() => audioEngine.playUltraAttack());
  assert.doesNotThrow(() => audioEngine.speakComboPhrase('test', 'cris_mj'));
  assert.doesNotThrow(() => audioEngine.playSongMotif('cris_mj', true));
  assert.doesNotThrow(() => audioEngine.playMenuClick());
});

test('New attached 7-song soundtrack and intro video replace all legacy audio tracks and rotate randomly per stage', () => {
  assert.equal(ALL_TRACK_IDS.length, 7);
  assert.equal(BATTLE_TRACK_IDS.length, 6);
  assert.ok(INTRO_VIDEO_SRC.endsWith('VIDEO_INTRO_b44ac813.mp4'));
  assert.ok(SONG_TRACKS[TITLE_TRACK_ID].src.includes('CANCION_PORTADA_JUEGO_1f89a027.mp3'));

  for (const id of ALL_TRACK_IDS) {
    const info = SONG_TRACKS[id];
    assert.ok(info.src.startsWith('/assets/aistudio/'));
    assert.ok(!info.src.includes('reggaeton_'));
    assert.ok(info.label.length > 0);
  }

  for (const prev of BATTLE_TRACK_IDS) {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const picked = pickRandomBattleTrack(prev, () => r);
      assert.ok(BATTLE_TRACK_IDS.includes(picked));
      assert.notEqual(picked, prev);
    }
  }
});

test('Movement physics deliver smooth ground acceleration, fast-fall jump arcs, directional dash decay, and pose tilt dynamics', () => {
  const match = createMatchState('vs_2p', 'cris_mj', 'pablo_chille');
  match.phase = 'fight';
  match.p1.x = 300;
  match.p2.x = 900;

  // 1) Ground acceleration ramps smoothly instead of 1-frame snap, and stops cleanly
  stepMatch(match, { ...EMPTY_INPUT, right: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  const firstStepVx = match.p1.vx;
  assert.ok(firstStepVx > 0 && firstStepVx < match.p1.profile.speed);
  for (let i = 0; i < 8; i++) {
    stepMatch(match, { ...EMPTY_INPUT, right: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  }
  assert.ok(Math.abs(match.p1.vx - match.p1.profile.speed) < 1);

  for (let i = 0; i < 8; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  }
  assert.equal(match.p1.vx, 0);
  assert.equal(match.p1.action, 'idle');

  // 2) Jump carries forward momentum, responds to mid-air steering, and falls faster than it rises
  stepMatch(match, { ...EMPTY_INPUT, right: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  stepMatch(match, { ...EMPTY_INPUT, right: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  stepMatch(match, { ...EMPTY_INPUT, up: true, right: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.equal(match.p1.action, 'jump');
  assert.ok(match.p1.vx > 0);
  const riseVy0 = match.p1.vy;
  stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  const riseDeltaVy = match.p1.vy - riseVy0;

  // Step until descending
  for (let i = 0; i < 45 && match.p1.vy <= 0; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  }
  assert.ok(match.p1.vy > 0);
  const fallVy0 = match.p1.vy;
  stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  const fallDeltaVy = match.p1.vy - fallVy0;
  assert.ok(fallDeltaVy > riseDeltaVy);

  // Land cleanly
  for (let i = 0; i < 40 && match.p1.y < GAME_CONFIG.groundY; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  }
  assert.equal(match.p1.y, GAME_CONFIG.groundY);

  // 3) Forward dash bursts faster than backdash and decays smoothly without brick-wall zeroing
  stepMatch(match, { ...EMPTY_INPUT, dashPressed: true, right: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  const forwardDashV0 = Math.abs(match.p1.vx);
  for (let i = 0; i < 4; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  }
  assert.ok(Math.abs(match.p1.vx) < forwardDashV0 && Math.abs(match.p1.vx) > 400);
  for (let i = 0; i < 10; i++) {
    stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  }
  assert.equal(match.p1.action, 'idle');

  stepMatch(match, { ...EMPTY_INPUT, dashPressed: true, left: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  const backDashV0 = Math.abs(match.p1.vx);
  assert.ok(forwardDashV0 > backDashV0);

  // 4) Sprite pose selection reflects advancing vs retreating lean and dynamic jump tilt
  const walkFwd = selectSheetFrame('cris_mj', 'walk', 0.1, 40, 0, 1, 250);
  const walkBack = selectSheetFrame('cris_mj', 'walk', 0.1, 40, 0, 1, -250);
  assert.ok(walkFwd.tiltRad > 0 && walkBack.tiltRad < 0);

  const jumpUpPose = selectSheetFrame('cris_mj', 'jump', 0.05, 0, -600, 1, 100);
  const jumpFallPose = selectSheetFrame('cris_mj', 'jump', 0.3, 0, 600, 1, 100);
  assert.ok(jumpUpPose.tiltRad < 0 && jumpFallPose.tiltRad > 0);
});

test('anti-jitter physics: smooth aerial separation taper, stable walk/idle poses, and AI hysteresis', () => {
  // 1) Aerial overlap near opponent does not cause a sudden single-tick horizontal snap
  const match = createMatchState('vs_2p', 'cris_mj', 'bayron_fire');
  match.phase = 'fight';
  match.p1.x = 640;
  match.p1.y = GAME_CONFIG.groundY - 110;
  match.p2.x = 642;
  match.p2.y = GAME_CONFIG.groundY;
  const startP1X = match.p1.x;
  const startP2X = match.p2.x;
  stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.ok(Math.abs(match.p1.x - startP1X) <= 8);
  assert.ok(Math.abs(match.p2.x - startP2X) <= 8);

  // Grounded fighters still separate cleanly when overlapping
  match.p1.x = 640;
  match.p1.y = GAME_CONFIG.groundY;
  match.p2.x = 645;
  match.p2.y = GAME_CONFIG.groundY;
  stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.ok(Math.abs(match.p2.x - match.p1.x) > 35);

  // 2) Walk and idle pose selections have zero vertical bounce jitter or horizontal squish
  for (let t = 0; t < 2; t += 0.1) {
    const idlePose = selectSheetFrame('pablo_chille', 'idle', t, 0, 0, t, 0);
    assert.equal(idlePose.offsetY, 0);
    assert.equal(idlePose.scaleX, 1);
    const walkPose = selectSheetFrame('pablo_chille', 'walk', t, t * 260, 0, t, 260);
    assert.equal(walkPose.offsetY, 0);
    assert.equal(walkPose.scaleX, 1);
  }

  // 3) AI movement hysteresis prevents 1-tick APPROACH <-> NEUTRAL oscillation near threshold
  const cpuMatch = createMatchState('arcade', 'cris_mj', 'pablo_chille');
  cpuMatch.phase = 'fight';
  // pablo_chille is tactical (desiredRange = 150 -> enters APPROACH at > 188, stays in APPROACH while > 160)
  cpuMatch.p1.x = 400;
  cpuMatch.p2.x = 600; // dist = 200 (> 188 -> enters APPROACH)
  computeAdvancedCpuInput(cpuMatch.p2, cpuMatch.p1, GAME_CONFIG.fixedDt, 'normal');
  assert.equal(cpuMatch.p2.aiObs?.state, 'APPROACH');

  cpuMatch.p2.x = 575; // dist = 175 (between 160 and 188: remains steadily in APPROACH instead of flickering)
  computeAdvancedCpuInput(cpuMatch.p2, cpuMatch.p1, GAME_CONFIG.fixedDt, 'normal');
  assert.equal(cpuMatch.p2.aiObs?.state, 'APPROACH');
});

test('SOCD Cleaner: Left + Right resolves to Neutral; Up + Down resolves to Up Priority per tournament rules', () => {
  const simultaneousHorizontal = sanitizeInputSnapshot({
    ...EMPTY_INPUT,
    left: true,
    right: true,
  });
  assert.equal(simultaneousHorizontal.left, false);
  assert.equal(simultaneousHorizontal.right, false);

  const simultaneousVerticalUpPriority = sanitizeInputSnapshot(
    {
      ...EMPTY_INPUT,
      up: true,
      down: true,
    },
    'up_priority'
  );
  assert.equal(simultaneousVerticalUpPriority.up, true);
  assert.equal(simultaneousVerticalUpPriority.down, false);

  const simultaneousVerticalNeutral = sanitizeInputSnapshot(
    {
      ...EMPTY_INPUT,
      up: true,
      down: true,
    },
    'neutral'
  );
  assert.equal(simultaneousVerticalNeutral.up, false);
  assert.equal(simultaneousVerticalNeutral.down, false);
});

test('High / Low / Overhead / Unblockable Guard System', () => {
  const match = createMatchState('vs_2p', 'pablo_chille', 'cris_mj');
  const defender = match.p2;
  const attackerX = match.p1.x; // p1 is on the left (x = 420), defender is on the right (x = 860)

  // Defender standing and holding back (input.right = true since attacker is to their left)
  const standingGuardInput = { ...EMPTY_INPUT, right: true, down: false };
  // Defender crouching and holding back
  const crouchingGuardInput = { ...EMPTY_INPUT, right: true, down: true };

  // Mid attack: can be blocked standing or crouching
  assert.equal(isBlockingAgainst(defender, attackerX, standingGuardInput, 'mid'), true);
  assert.equal(isBlockingAgainst(defender, attackerX, crouchingGuardInput, 'mid'), true);

  // Low attack: crouching block works, standing block FAILS
  assert.equal(isBlockingAgainst(defender, attackerX, crouchingGuardInput, 'low'), true);
  assert.equal(isBlockingAgainst(defender, attackerX, standingGuardInput, 'low'), false);

  // Overhead attack: standing block works, crouching block FAILS
  assert.equal(isBlockingAgainst(defender, attackerX, standingGuardInput, 'overhead'), true);
  assert.equal(isBlockingAgainst(defender, attackerX, crouchingGuardInput, 'overhead'), false);

  // Unblockable attack (e.g. throws): FAILS against both standing and crouching block
  assert.equal(isBlockingAgainst(defender, attackerX, standingGuardInput, 'unblockable'), false);
  assert.equal(isBlockingAgainst(defender, attackerX, crouchingGuardInput, 'unblockable'), false);
});

test('Throws & Throw Tech (Escape de agarre): close range forward+HP executes throw; defender tech results in 0 damage and mutual pushback', () => {
  // 1) Throw connects when opponent does not tech
  const match = createMatchState('vs_2p', 'marcianeke', 'juliano_sosa');
  match.phase = 'fight';
  match.p1.x = 600;
  match.p2.x = 640; // close range: dist = 40 <= 78
  const initialP2Hp = match.p2.hp;

  // P1 inputs heavy punch at close range
  stepMatch(match, { ...EMPTY_INPUT, heavyPunchPressed: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.ok(match.p2.hp < initialP2Hp, 'Throw dealt damage to opponent');
  assert.equal(match.p2.action, 'hitstun');
  assert.equal(match.p1.phraseText, '¡LLÉVATELO!');

  // 2) Throw Tech (Escape de agarre): both input punch simultaneously at close range
  const matchTech = createMatchState('vs_2p', 'marcianeke', 'juliano_sosa');
  matchTech.phase = 'fight';
  matchTech.p1.x = 600;
  matchTech.p2.x = 640;
  const techP1Hp = matchTech.p1.hp;
  const techP2Hp = matchTech.p2.hp;

  // Buffer P2 throw before P1 throw executes
  matchTech.p2.bufferedAction = 'heavy_punch';
  matchTech.p2.bufferTimer = 0.12;

  stepMatch(matchTech, { ...EMPTY_INPUT, heavyPunchPressed: true }, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.equal(matchTech.p1.hp, techP1Hp, 'P1 took 0 damage on throw tech');
  assert.equal(matchTech.p2.hp, techP2Hp, 'P2 took 0 damage on throw tech');
  assert.equal(matchTech.p1.phraseText, '¡ESCAPE DE AGARRE!');
  assert.equal(matchTech.p2.phraseText, '¡ESCAPE DE AGARRE!');
  assert.ok(matchTech.p1.vx < 0 && matchTech.p2.vx > 0, 'Both fighters pushed apart');
});

test('Projectile Clash: opposing projectiles colliding cancel each other out', () => {
  const match = createMatchState('vs_2p', 'bayron_fire', 'cris_mj');
  match.phase = 'fight';
  match.projectiles = [
    {
      id: 1,
      ownerSlot: 1,
      x: 600,
      y: GAME_CONFIG.groundY - 120,
      vx: 600,
      radius: 26,
      baseDamage: 90,
      color: '#f97316',
      accent: '#facc15',
      life: 2.0,
      isBossContract: false,
    },
    {
      id: 2,
      ownerSlot: 2,
      x: 630,
      y: GAME_CONFIG.groundY - 120,
      vx: -600,
      radius: 26,
      baseDamage: 90,
      color: '#8b5cf6',
      accent: '#f8fafc',
      life: 2.0,
      isBossContract: false,
    },
  ];

  stepMatch(match, EMPTY_INPUT, EMPTY_INPUT, GAME_CONFIG.fixedDt);
  assert.equal(match.projectiles.length, 0, 'Opposing projectiles clashed and vanished');
  assert.ok(match.events.some((e) => e.type === 'block'), 'Spawned clash spark event');
});

test('Multi-hit Super and Tornado combo resolution: intermediate hits pull/vacuum target, final hit launches', () => {
  const match = createMatchState('vs_2p', 'marcianeke', 'pablo_chille');
  match.phase = 'fight';
  match.p1.superMeter = MAX_SUPER_METER;

  // Intermediate super hit (hit 1, multiHitCount < 3)
  match.p1.multiHitCount = 1;
  applyHit(
    match,
    match.p1,
    match.p2,
    EMPTY_INPUT,
    ATTACK_DEFINITIONS.super.damage,
    ATTACK_DEFINITIONS.super.hitstunFrames / 60,
    ATTACK_DEFINITIONS.super.knockbackX,
    ATTACK_DEFINITIONS.super.knockbackY,
    ATTACK_DEFINITIONS.super.hitstopFrames / 60,
    0,
    'super'
  );
  const intermediateVx = Math.abs(match.p2.vx);
  assert.ok(intermediateVx <= 80, 'Intermediate super hit keeps opponent trapped in vacuum');

  // Final super hit (hit 4, multiHitCount >= 3)
  match.p1.multiHitCount = 3;
  applyHit(
    match,
    match.p1,
    match.p2,
    EMPTY_INPUT,
    ATTACK_DEFINITIONS.super.damage,
    ATTACK_DEFINITIONS.super.hitstunFrames / 60,
    ATTACK_DEFINITIONS.super.knockbackX,
    ATTACK_DEFINITIONS.super.knockbackY,
    ATTACK_DEFINITIONS.super.hitstopFrames / 60,
    0,
    'super'
  );
  const finalVx = Math.abs(match.p2.vx);
  assert.ok(finalVx >= 300, 'Final super hit launches opponent across the arena');
});

test('Fighter-specific attack overrides via getFighterAttackSpec', () => {
  const jere = createFighterState(1, FIGHTERS.jere_klein, 400, 1);
  const jereJab = getFighterAttackSpec(jere, 'light_punch');
  // Jere Klein override: startupFrames: 2, damage: 32
  assert.equal(jereJab.damage, 32);
  assert.equal(jereJab.windup, framesToSeconds(2));

  const pablo = createFighterState(2, FIGHTERS.pablo_chille, 800, -1);
  const pabloHeavy = getFighterAttackSpec(pablo, 'heavy_punch');
  // Pablo Chill-E override: damage: 68, hitstopFrames: 6
  assert.equal(pabloHeavy.damage, 68);
  assert.equal(pabloHeavy.hitstop, framesToSeconds(6));
});

test('Training Dummy mode guard_after_hit: blocks following hits once hitstun begins', () => {
  const match = createMatchState('training', 'marcianeke', 'juliano_sosa');
  match.trainingConfig.dummyMode = 'guard_after_hit';
  match.phase = 'fight';
  match.p2.x = match.p1.x + 60;

  // When dummy is idle, it does not hold block
  const idleInput = computeTrainingDummyInput(match.p2, match.p1, match.trainingConfig, GAME_CONFIG.fixedDt);
  assert.equal(idleInput.blockHeld, false);

  // When dummy enters hitstun, it immediately holds block to test true combo strings vs gaps
  match.p2.action = 'hitstun';
  match.p2.hitstunTimer = 0.2;
  const stunInput = computeTrainingDummyInput(match.p2, match.p1, match.trainingConfig, GAME_CONFIG.fixedDt);
  assert.equal(stunInput.blockHeld, true);
});


