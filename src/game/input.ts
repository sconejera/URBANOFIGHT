import type { InputSnapshot } from './rules';

export interface PlayerKeyBindings {
  left: string;
  right: string;
  up: string;
  down: string;
  lightPunch: string;
  heavyPunch: string;
  lightKick: string;
  heavyKick: string;
  ultra: string;
  dash: string;
  block: string;
}

export interface SystemKeyBindings {
  pause: string;
  mute: string;
  restart: string;
}

export interface InputHistoryEntry {
  frame: number;
  dir: number;
  buttons: string[];
}

export const DEFAULT_P1_BINDINGS: PlayerKeyBindings = {
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyW',
  down: 'KeyS',
  lightPunch: 'KeyF',
  heavyPunch: 'KeyR',
  lightKick: 'KeyG',
  heavyKick: 'KeyH',
  ultra: 'KeyT',
  dash: 'ShiftLeft',
  block: 'KeyC',
};

// Convenience secondary keys for 1P-only modes (Arcade / 1P vs CPU / Training)
// Never conflicts with SystemKeyBindings (Escape, KeyM, F2)
export const DEFAULT_P1_SOLO_SECONDARY_BINDINGS: PlayerKeyBindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  lightPunch: 'KeyJ',
  heavyPunch: 'KeyU',
  lightKick: 'KeyK',
  heavyKick: 'KeyL',
  ultra: 'KeyO',
  dash: 'ShiftRight',
  block: 'KeyE',
};

export const DEFAULT_P2_BINDINGS: PlayerKeyBindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  lightPunch: 'KeyJ',
  heavyPunch: 'KeyU',
  lightKick: 'KeyK',
  heavyKick: 'KeyL',
  ultra: 'KeyO',
  dash: 'KeyI',
  block: 'KeyP',
};

export const DEFAULT_SYSTEM_BINDINGS: SystemKeyBindings = {
  pause: 'Escape',
  mute: 'KeyM',
  restart: 'F2',
};

export const NAVIGATION_PREVENT_DEFAULT_CODES = new Set<string>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export function hasBindingConflict(
  playerBindings: PlayerKeyBindings,
  systemBindings: SystemKeyBindings
): string[] {
  const playerKeys = Object.values(playerBindings);
  const systemKeys = Object.values(systemBindings);

  return playerKeys.filter((key) => systemKeys.includes(key));
}

export function hasCrossPlayerConflict(
  p1Bindings: PlayerKeyBindings,
  p2Bindings: PlayerKeyBindings
): string[] {
  const p1Keys = Object.values(p1Bindings);
  const p2Keys = Object.values(p2Bindings);
  return p1Keys.filter((key) => p2Keys.includes(key));
}

export function hasInternalBindingDuplicates(bindings: PlayerKeyBindings): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const key of Object.values(bindings)) {
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.add(key);
    }
  }
  return duplicates;
}

export type SocdMode = 'neutral' | 'up_priority';

export function sanitizeInputSnapshot(raw: InputSnapshot, mode: SocdMode = 'up_priority'): InputSnapshot {
  let left = raw.left;
  let right = raw.right;
  let up = raw.up;
  let down = raw.down;

  // Horizontal SOCD: Left + Right -> Neutral (CPT tournament rule)
  if (left && right) {
    left = false;
    right = false;
  }

  // Vertical SOCD: Up + Down -> Up Priority (or Neutral)
  if (up && down) {
    if (mode === 'up_priority') {
      up = true;
      down = false;
    } else {
      up = false;
      down = false;
    }
  }

  return {
    ...raw,
    left,
    right,
    up,
    down,
  };
}

export function buildKeyboardInputSnapshot(
  held: ReadonlySet<string>,
  justPressed: ReadonlySet<string>,
  primary: PlayerKeyBindings,
  secondary?: PlayerKeyBindings,
  extraAttackKeys?: {
    ultra?: readonly string[];
    lightPunch?: readonly string[];
    heavyPunch?: readonly string[];
    lightKick?: readonly string[];
    heavyKick?: readonly string[];
    up?: readonly string[];
  },
  touchHeld?: ReadonlySet<string>,
  touchJust?: ReadonlySet<string>
): InputSnapshot {
  const isHeld = (code: string) => held.has(code);
  const isJust = (code: string) => justPressed.has(code);

  const raw: InputSnapshot = {
    left:
      isHeld(primary.left) ||
      (secondary ? isHeld(secondary.left) : false) ||
      Boolean(touchHeld?.has('left')),
    right:
      isHeld(primary.right) ||
      (secondary ? isHeld(secondary.right) : false) ||
      Boolean(touchHeld?.has('right')),
    up:
      isHeld(primary.up) ||
      (secondary ? isHeld(secondary.up) : false) ||
      Boolean(extraAttackKeys?.up?.some(isHeld)) ||
      Boolean(touchHeld?.has('up')),
    down:
      isHeld(primary.down) ||
      (secondary ? isHeld(secondary.down) : false) ||
      Boolean(touchHeld?.has('down')),
    lightPunchPressed:
      isJust(primary.lightPunch) ||
      (secondary ? isJust(secondary.lightPunch) : false) ||
      Boolean(extraAttackKeys?.lightPunch?.some(isJust)) ||
      Boolean(touchJust?.has('lightPunch')),
    heavyPunchPressed:
      isJust(primary.heavyPunch) ||
      (secondary ? isJust(secondary.heavyPunch) : false) ||
      Boolean(extraAttackKeys?.heavyPunch?.some(isJust)) ||
      Boolean(touchJust?.has('heavyPunch')),
    lightKickPressed:
      isJust(primary.lightKick) ||
      (secondary ? isJust(secondary.lightKick) : false) ||
      Boolean(extraAttackKeys?.lightKick?.some(isJust)) ||
      Boolean(touchJust?.has('lightKick')),
    heavyKickPressed:
      isJust(primary.heavyKick) ||
      (secondary ? isJust(secondary.heavyKick) : false) ||
      Boolean(extraAttackKeys?.heavyKick?.some(isJust)) ||
      Boolean(touchJust?.has('heavyKick')),
    ultraPressed:
      isJust(primary.ultra) ||
      (secondary ? isJust(secondary.ultra) : false) ||
      Boolean(extraAttackKeys?.ultra?.some(isJust)) ||
      Boolean(touchJust?.has('ultra')),
    dashPressed:
      isJust(primary.dash) ||
      (secondary ? isJust(secondary.dash) : false),
    blockHeld:
      isHeld(primary.block) ||
      (secondary ? isHeld(secondary.block) : false),
  };

  return sanitizeInputSnapshot(raw);
}

export function formatKeyCodeLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Arrow')) return code.slice(5);
  if (code === 'ShiftLeft') return 'L-Shift';
  if (code === 'ShiftRight') return 'R-Shift';
  return code;
}
