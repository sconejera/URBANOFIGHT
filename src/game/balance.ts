import { AiDifficulty, computeAdvancedCpuInput } from './ai';
import { GAME_CONFIG } from './config';
import { ALL_OPPONENT_IDS, FighterId, PLAYABLE_FIGHTER_IDS } from './fighters';
import { createMatchState, stepMatch } from './rules';

export interface SimulatedMatchMetrics {
  p1Id: FighterId;
  p2Id: FighterId;
  winnerSlot: 1 | 2;
  winnerId: FighterId;
  durationSeconds: number;
  p1Rounds: number;
  p2Rounds: number;
  p1TotalDamage: number;
  p2TotalDamage: number;
  p1MaxCombo: number;
  p2MaxCombo: number;
  p1ProjectilesFired: number;
  p2ProjectilesFired: number;
  p1Blocks: number;
  p2Blocks: number;
}

export interface FighterBalanceReport {
  fighterId: FighterId;
  matchesPlayed: number;
  wins: number;
  winRate: number;
  avgDamageDealt: number;
  avgMaxCombo: number;
  avgMatchDurationSec: number;
  avgProjectilesFired: number;
  avgBlocksLanded: number;
}

export function runHeadlessMatch(
  p1Id: FighterId,
  p2Id: FighterId,
  difficulty: AiDifficulty = 'normal',
  maxSeconds = 180
): SimulatedMatchMetrics {
  const match = createMatchState('vs_cpu', p1Id, p2Id, 0, undefined, 0, 0, 0, difficulty);
  const dt = GAME_CONFIG.fixedDt;
  const maxSteps = Math.ceil(maxSeconds / dt);

  let p1ProjectilesFired = 0;
  let p2ProjectilesFired = 0;
  let p1Blocks = 0;
  let p2Blocks = 0;
  let prevProjIds = new Set<number>();

  for (let step = 0; step < maxSteps; step++) {
    if (match.phase === 'match_end') break;
    const p1Input = computeAdvancedCpuInput(match.p1, match.p2, dt, difficulty, 1);
    const p2Input = computeAdvancedCpuInput(match.p2, match.p1, dt, difficulty, 1);

    // Manually advance P1 & P2 in a mirror CPU vs CPU simulation
    stepMatch(match, p1Input, p2Input, dt);

    // Note: in vs_cpu mode stepMatch computes CPU for P2 if p2InputRaw is ignored unless mode is vs_2p;
    // so let's evaluate using vs_2p mode with two AI controllers!
    for (const proj of match.projectiles) {
      if (!prevProjIds.has(proj.id)) {
        prevProjIds.add(proj.id);
        if (proj.ownerSlot === 1) p1ProjectilesFired++;
        else p2ProjectilesFired++;
      }
    }
    for (const ev of match.events) {
      if (ev.type === 'block') {
        if (ev.slot === 1) p1Blocks++;
        else if (ev.slot === 2) p2Blocks++;
      }
    }
  }

  const winnerSlot: 1 | 2 =
    match.matchWinnerSlot ?? (match.p1.hp / match.p1.maxHp >= match.p2.hp / match.p2.maxHp ? 1 : 2);

  return {
    p1Id,
    p2Id,
    winnerSlot,
    winnerId: winnerSlot === 1 ? p1Id : p2Id,
    durationSeconds: Number((match.tickCount * dt).toFixed(2)),
    p1Rounds: match.p1Rounds,
    p2Rounds: match.p2Rounds,
    p1TotalDamage: match.p1.totalDamageDealt,
    p2TotalDamage: match.p2.totalDamageDealt,
    p1MaxCombo: match.p1.maxCombo,
    p2MaxCombo: match.p2.maxCombo,
    p1ProjectilesFired,
    p2ProjectilesFired,
    p1Blocks,
    p2Blocks,
  };
}

export function runHeadlessMirrorMatch(
  p1Id: FighterId,
  p2Id: FighterId,
  difficulty: AiDifficulty = 'normal',
  maxSeconds = 180
): SimulatedMatchMetrics {
  const match = createMatchState('vs_2p', p1Id, p2Id, 0, undefined, 0, 0, 0, difficulty);
  const dt = GAME_CONFIG.fixedDt;
  const maxSteps = Math.ceil(maxSeconds / dt);

  let p1ProjectilesFired = 0;
  let p2ProjectilesFired = 0;
  let p1Blocks = 0;
  let p2Blocks = 0;
  const prevProjIds = new Set<number>();

  for (let step = 0; step < maxSteps; step++) {
    if (match.phase === 'match_end') break;
    const p1Input = computeAdvancedCpuInput(match.p1, match.p2, dt, difficulty, 1);
    const p2Input = computeAdvancedCpuInput(match.p2, match.p1, dt, difficulty, 1);
    stepMatch(match, p1Input, p2Input, dt);

    for (const proj of match.projectiles) {
      if (!prevProjIds.has(proj.id)) {
        prevProjIds.add(proj.id);
        if (proj.ownerSlot === 1) p1ProjectilesFired++;
        else p2ProjectilesFired++;
      }
    }
    for (const ev of match.events) {
      if (ev.type === 'block') {
        if (ev.slot === 1) p1Blocks++;
        else if (ev.slot === 2) p2Blocks++;
      }
    }
  }

  const winnerSlot: 1 | 2 =
    match.matchWinnerSlot ?? (match.p1.hp / match.p1.maxHp >= match.p2.hp / match.p2.maxHp ? 1 : 2);

  return {
    p1Id,
    p2Id,
    winnerSlot,
    winnerId: winnerSlot === 1 ? p1Id : p2Id,
    durationSeconds: Number((match.tickCount * dt).toFixed(2)),
    p1Rounds: match.p1Rounds,
    p2Rounds: match.p2Rounds,
    p1TotalDamage: match.p1.totalDamageDealt,
    p2TotalDamage: match.p2.totalDamageDealt,
    p1MaxCombo: match.p1.maxCombo,
    p2MaxCombo: match.p2.maxCombo,
    p1ProjectilesFired,
    p2ProjectilesFired,
    p1Blocks,
    p2Blocks,
  };
}

export function evaluateRosterBalance(
  difficulty: AiDifficulty = 'normal',
  includeBoss = false
): FighterBalanceReport[] {
  const pool: FighterId[] = includeBoss ? ALL_OPPONENT_IDS : PLAYABLE_FIGHTER_IDS;
  const stats = new Map<
    FighterId,
    {
      matches: number;
      wins: number;
      dmg: number;
      maxCombo: number;
      dur: number;
      proj: number;
      blocks: number;
    }
  >();

  for (const id of pool) {
    stats.set(id, {
      matches: 0,
      wins: 0,
      dmg: 0,
      maxCombo: 0,
      dur: 0,
      proj: 0,
      blocks: 0,
    });
  }

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      const m = runHeadlessMirrorMatch(a, b, difficulty, 120);

      const sA = stats.get(a)!;
      sA.matches += 1;
      if (m.winnerSlot === 1) sA.wins += 1;
      sA.dmg += m.p1TotalDamage;
      sA.maxCombo += m.p1MaxCombo;
      sA.dur += m.durationSeconds;
      sA.proj += m.p1ProjectilesFired;
      sA.blocks += m.p1Blocks;

      const sB = stats.get(b)!;
      sB.matches += 1;
      if (m.winnerSlot === 2) sB.wins += 1;
      sB.dmg += m.p2TotalDamage;
      sB.maxCombo += m.p2MaxCombo;
      sB.dur += m.durationSeconds;
      sB.proj += m.p2ProjectilesFired;
      sB.blocks += m.p2Blocks;
    }
  }

  return pool.map((id) => {
    const s = stats.get(id)!;
    const n = Math.max(1, s.matches);
    return {
      fighterId: id,
      matchesPlayed: s.matches,
      wins: s.wins,
      winRate: Number((s.wins / n).toFixed(2)),
      avgDamageDealt: Math.round(s.dmg / n),
      avgMaxCombo: Number((s.maxCombo / n).toFixed(1)),
      avgMatchDurationSec: Number((s.dur / n).toFixed(1)),
      avgProjectilesFired: Number((s.proj / n).toFixed(1)),
      avgBlocksLanded: Number((s.blocks / n).toFixed(1)),
    };
  });
}
