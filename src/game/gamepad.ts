import { EMPTY_INPUT, InputSnapshot } from './rules';
import { sanitizeInputSnapshot } from './input';

export interface GamepadButtonLike {
  pressed: boolean;
  value?: number;
}

export interface GamepadLike {
  id: string;
  connected: boolean;
  mapping?: string;
  axes: readonly number[];
  buttons: readonly GamepadButtonLike[];
}

export interface GamepadMenuNav {
  leftPressed: boolean;
  rightPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  confirmPressed: boolean;
  cancelPressed: boolean;
  pausePressed: boolean;
  prevTabPressed: boolean;
  nextTabPressed: boolean;
  xPressed: boolean;
  yPressed: boolean;
}

export interface GamepadPollResult {
  connected: boolean;
  input: InputSnapshot;
  nav: GamepadMenuNav;
  nextButtons: boolean[];
  activeLabels: string[];
}

export interface PlayerDeviceAssignment {
  playerSlot: 1 | 2;
  gamepadIndex: number | null;
  gamepadId: string | null;
  connected: boolean;
}

export interface GamepadStatusSummary {
  connected: boolean;
  label: string | null;
  count: number;
  blocked: boolean;
  activeLabels: string[];
  assignments: [PlayerDeviceAssignment, PlayerDeviceAssignment];
}

const STICK_X_DEADZONE = 0.34;
const STICK_Y_DEADZONE = 0.42;
const TRIGGER_THRESHOLD = 0.45;
const RUMBLE_COOLDOWN_MS = 45;
const lastRumbleAtByIndex = new Map<number, number>();

export function readButton(
  buttons: readonly GamepadButtonLike[],
  index: number,
  threshold = 0.5
): boolean {
  const b = buttons[index];
  if (!b) return false;
  if (typeof b.value === 'number' && b.value > 0) {
    return b.pressed || b.value >= threshold;
  }
  return Boolean(b.pressed);
}

function readHatSwitchDpad(axes: readonly number[], mapping?: string): {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
} {
  let up = false;
  let down = false;
  let left = false;
  let right = false;

  if (mapping !== 'standard') {
    const ax6 = axes[6] ?? 0;
    const ax7 = axes[7] ?? 0;
    if (ax6 < -0.5) left = true;
    if (ax6 > 0.5) right = true;
    if (ax7 < -0.5) up = true;
    if (ax7 > 0.5) down = true;

    const hat = axes[9];
    if (typeof hat === 'number' && Math.abs(hat) <= 1.05) {
      if (hat < -0.85) up = true;
      else if (hat >= -0.85 && hat < -0.25) {
        up = true;
        right = true;
      } else if (hat >= -0.25 && hat < 0.05) {
        right = true;
      } else if (hat >= 0.05 && hat < 0.35) {
        right = true;
        down = true;
      } else if (hat >= 0.35 && hat < 0.65) {
        down = true;
      } else if (hat >= 0.65 && hat < 0.95) {
        down = true;
        left = true;
      } else if (hat >= 0.95) {
        left = true;
      }
    }
  }

  return { up, down, left, right };
}

export function readGamepadLiveLabels(pad: GamepadLike | null | undefined): string[] {
  if (!pad || !pad.connected) return [];
  const btns = pad.buttons;
  const axX = pad.axes[0] ?? 0;
  const axY = pad.axes[1] ?? 0;
  const hat = readHatSwitchDpad(pad.axes, pad.mapping);

  const labels: string[] = [];
  if (readButton(btns, 2)) labels.push('X (Puño Débil)');
  if (readButton(btns, 3)) labels.push('Y (Puño Fuerte)');
  if (readButton(btns, 0)) labels.push('A (Patada Débil)');
  if (readButton(btns, 1)) labels.push('B (Patada Fuerte)');
  if (readButton(btns, 4)) labels.push('LB (Bloquear)');
  if (readButton(btns, 5)) labels.push('RB (Ultra)');
  if (readButton(btns, 6, TRIGGER_THRESHOLD)) labels.push('LT (Dash)');
  if (readButton(btns, 7, TRIGGER_THRESHOLD)) labels.push('RT (Ultra)');
  if (readButton(btns, 8)) labels.push('View');
  if (readButton(btns, 9)) labels.push('Start');
  if (readButton(btns, 12) || hat.up || axY < -STICK_Y_DEADZONE) labels.push('Arriba');
  if (readButton(btns, 13) || hat.down || axY > STICK_Y_DEADZONE) labels.push('Abajo');
  if (readButton(btns, 14) || hat.left || axX < -STICK_X_DEADZONE) labels.push('Izq');
  if (readButton(btns, 15) || hat.right || axX > STICK_X_DEADZONE) labels.push('Der');
  return labels;
}

/**
 * Pure Xbox Controller mapper requested by user:
 * - Move / Jump / Crouch / SF Motions: D-Pad or Left Analog Stick X/Y
 * - X (2): Combo Débil / Puño Débil
 * - Y (3): Combo Fuerte / Puño Fuerte
 * - A (0): Patada Débil (Confirm in menus)
 * - B (1): Patada Fuerte (Back/Cancel in menus)
 * - LB (4): Bloquear (held)
 * - RB (5) / RT (7): Poder Ultra (requires 3 full bars = 300)
 * - LT (6): Esquivar / Dash
 * - Start (9): Pausa / Reanudar
 */
export function mapGamepadToInput(
  pad: GamepadLike | null | undefined,
  prevButtons: readonly boolean[] = []
): GamepadPollResult {
  if (!pad || !pad.connected) {
    return {
      connected: false,
      input: { ...EMPTY_INPUT },
      nav: {
        leftPressed: false,
        rightPressed: false,
        upPressed: false,
        downPressed: false,
        confirmPressed: false,
        cancelPressed: false,
        pausePressed: false,
        prevTabPressed: false,
        nextTabPressed: false,
        xPressed: false,
        yPressed: false,
      },
      nextButtons: [],
      activeLabels: [],
    };
  }

  const btns = pad.buttons;
  const axX = pad.axes[0] ?? 0;
  const axY = pad.axes[1] ?? 0;
  const hat = readHatSwitchDpad(pad.axes, pad.mapping);

  const curr: boolean[] = new Array(20).fill(false);
  for (let i = 0; i < 16; i++) {
    const thresh = i === 6 || i === 7 ? TRIGGER_THRESHOLD : 0.5;
    curr[i] = readButton(btns, i, thresh);
  }
  curr[16] = axX < -STICK_X_DEADZONE || hat.left;
  curr[17] = axX > STICK_X_DEADZONE || hat.right;
  curr[18] = axY < -STICK_Y_DEADZONE || hat.up;
  curr[19] = axY > STICK_Y_DEADZONE || hat.down;

  const justPressed = (idx: number) => curr[idx] && !prevButtons[idx];

  const left = curr[14] || curr[16];
  const right = curr[15] || curr[17];
  const up = curr[12] || curr[18]; // D-Pad Up or Stick Up ONLY (A = Patada Débil!)
  const down = curr[13] || curr[19];

  const input: InputSnapshot = {
    left,
    right,
    up,
    down,
    lightPunchPressed: justPressed(2), // X
    heavyPunchPressed: justPressed(3), // Y
    lightKickPressed: justPressed(0),  // A
    heavyKickPressed: justPressed(1),  // B
    ultraPressed: justPressed(5) || justPressed(7), // RB or RT
    dashPressed: justPressed(6), // LT
    blockHeld: curr[4], // LB
  };

  const nav: GamepadMenuNav = {
    leftPressed: justPressed(14) || justPressed(16),
    rightPressed: justPressed(15) || justPressed(17),
    upPressed: justPressed(12) || justPressed(18),
    downPressed: justPressed(13) || justPressed(19),
    confirmPressed: justPressed(0) || justPressed(9), // A or Start
    cancelPressed: justPressed(1) || justPressed(8), // B or View
    pausePressed: justPressed(9), // Start
    prevTabPressed: justPressed(4), // LB
    nextTabPressed: justPressed(5), // RB
    xPressed: justPressed(2),
    yPressed: justPressed(3),
  };

  return {
    connected: true,
    input: sanitizeInputSnapshot(input),
    nav,
    nextButtons: curr,
    activeLabels: readGamepadLiveLabels(pad),
  };
}

export function mergeInputs(a: InputSnapshot, b: InputSnapshot): InputSnapshot {
  return sanitizeInputSnapshot({
    left: a.left || b.left,
    right: a.right || b.right,
    up: a.up || b.up,
    down: a.down || b.down,
    lightPunchPressed: a.lightPunchPressed || b.lightPunchPressed,
    heavyPunchPressed: a.heavyPunchPressed || b.heavyPunchPressed,
    lightKickPressed: a.lightKickPressed || b.lightKickPressed,
    heavyKickPressed: a.heavyKickPressed || b.heavyKickPressed,
    ultraPressed: a.ultraPressed || b.ultraPressed,
    dashPressed: a.dashPressed || b.dashPressed,
    blockHeld: a.blockHeld || b.blockHeld,
  });
}

export function scoreGamepadPriority(pad: GamepadLike): number {
  let score = 0;
  const id = (pad.id || '').toLowerCase();
  if (pad.mapping === 'standard') score += 40;
  if (/xbox|xinput|x-box|microsoft|045e/.test(id)) score += 100;
  if (pad.buttons.length >= 12) score += 20;
  if (pad.buttons.length < 4) score -= 200;
  return score;
}

export interface IndexedGamepadLike extends GamepadLike {
  index: number;
}

export function assignGamepadsToPlayers(
  pads: readonly IndexedGamepadLike[],
  previous?: readonly [PlayerDeviceAssignment, PlayerDeviceAssignment]
): [PlayerDeviceAssignment, PlayerDeviceAssignment] {
  const connectedValid = pads
    .filter((p) => p && p.connected && p.buttons.length >= 4)
    .slice()
    .sort((a, b) => scoreGamepadPriority(b) - scoreGamepadPriority(a));

  const byIndex = new Map<number, IndexedGamepadLike>();
  for (const p of connectedValid) {
    byIndex.set(p.index, p);
  }

  const usedIndices = new Set<number>();

  const resolveExisting = (slot: 1 | 2): PlayerDeviceAssignment => {
    const prev = previous?.[slot - 1];
    if (prev && prev.gamepadIndex !== null) {
      const match = byIndex.get(prev.gamepadIndex);
      if (match && !usedIndices.has(match.index)) {
        usedIndices.add(match.index);
        return {
          playerSlot: slot,
          gamepadIndex: match.index,
          gamepadId: match.id || prev.gamepadId,
          connected: true,
        };
      }
    }
    return {
      playerSlot: slot,
      gamepadIndex: null,
      gamepadId: null,
      connected: false,
    };
  };

  const p1 = resolveExisting(1);
  const p2 = resolveExisting(2);

  for (const pad of connectedValid) {
    if (usedIndices.has(pad.index)) continue;
    if (!p1.connected) {
      usedIndices.add(pad.index);
      p1.gamepadIndex = pad.index;
      p1.gamepadId = pad.id || 'Mando 1';
      p1.connected = true;
    } else if (!p2.connected) {
      usedIndices.add(pad.index);
      p2.gamepadIndex = pad.index;
      p2.gamepadId = pad.id || 'Mando 2';
      p2.connected = true;
    }
  }

  return [p1, p2];
}

let cachedAssignments: [PlayerDeviceAssignment, PlayerDeviceAssignment] = [
  { playerSlot: 1, gamepadIndex: null, gamepadId: null, connected: false },
  { playerSlot: 2, gamepadIndex: null, gamepadId: null, connected: false },
];

export function getSortedConnectedGamepads(): {
  pads: Gamepad[];
  blocked: boolean;
} {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
    return { pads: [], blocked: false };
  }
  try {
    const raw = navigator.getGamepads();
    const valid: Gamepad[] = [];
    for (let i = 0; i < raw.length; i++) {
      const p = raw[i];
      if (p && p.connected && p.buttons.length >= 4) {
        valid.push(p);
      }
    }
    valid.sort((a, b) => scoreGamepadPriority(b) - scoreGamepadPriority(a));
    cachedAssignments = assignGamepadsToPlayers(valid, cachedAssignments);
    return { pads: valid, blocked: false };
  } catch {
    return { pads: [], blocked: true };
  }
}

export function getPlayerDeviceAssignments(): [PlayerDeviceAssignment, PlayerDeviceAssignment] {
  getSortedConnectedGamepads();
  return cachedAssignments;
}

export function findGamepadByIndex(gamepadIndex: number): Gamepad | null {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.getGamepads !== 'function'
  ) {
    return null;
  }

  try {
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (pad && pad.connected && pad.index === gamepadIndex) {
        return pad;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function triggerGamepadRumble(
  gamepadIndex: number,
  durationMs: number,
  strongMagnitude: number,
  weakMagnitude: number
): void {
  const pad = findGamepadByIndex(gamepadIndex);
  if (!pad) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const prevAt = lastRumbleAtByIndex.get(gamepadIndex) ?? 0;
  if (now - prevAt < RUMBLE_COOLDOWN_MS) return;
  lastRumbleAtByIndex.set(gamepadIndex, now);

  const actuator = (
    pad as Gamepad & {
      vibrationActuator?: {
        playEffect?: (
          type: string,
          params: {
            startDelay: number;
            duration: number;
            weakMagnitude: number;
            strongMagnitude: number;
          }
        ) => Promise<string>;
      };
    }
  ).vibrationActuator;

  if (!actuator?.playEffect) return;

  try {
    void actuator
      .playEffect('dual-rumble', {
        startDelay: 0,
        duration: Math.max(0, durationMs),
        strongMagnitude: Math.max(0, Math.min(1, strongMagnitude)),
        weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
      })
      .catch(() => undefined);
  } catch {
    // Ignore unsupported browser/driver rumble
  }
}

export function getConnectedGamepadLabel(): string | null {
  const { pads } = getSortedConnectedGamepads();
  return pads[0]?.id || null;
}

export function getGamepadStatusSummary(): GamepadStatusSummary {
  const { pads, blocked } = getSortedConnectedGamepads();
  const p1Idx = cachedAssignments[0].gamepadIndex;
  const primary =
    (p1Idx !== null ? pads.find((p) => p.index === p1Idx) : undefined) ?? pads[0] ?? null;
  return {
    connected: primary !== null,
    label: primary ? primary.id || 'Mando Xbox / Estándar' : null,
    count: pads.length,
    blocked,
    activeLabels: primary ? readGamepadLiveLabels(primary) : [],
    assignments: cachedAssignments,
  };
}

export function triggerPlayerRumble(
  playerSlot: 1 | 2,
  durationMs = 140,
  strongMagnitude = 0.5,
  weakMagnitude = 0.6
): void {
  const assignments = getPlayerDeviceAssignments();
  const assignment = assignments[playerSlot - 1];
  if (!assignment || !assignment.connected || assignment.gamepadIndex === null) {
    return;
  }
  triggerGamepadRumble(
    assignment.gamepadIndex,
    durationMs,
    strongMagnitude,
    weakMagnitude
  );
}

export function triggerXboxRumble(
  slotIndex = 0,
  durationMs = 140,
  strongMagnitude = 0.5,
  weakMagnitude = 0.6
): void {
  const assignments = getPlayerDeviceAssignments();
  const slot: 1 | 2 = slotIndex === 1 ? 2 : 1;
  const targetIdx = assignments[slot - 1]?.gamepadIndex;
  if (targetIdx === null || targetIdx === undefined) return;
  triggerGamepadRumble(targetIdx, durationMs, strongMagnitude, weakMagnitude);
}

export function pollBrowserGamepad(
  slotIndex: number,
  prevButtons: readonly boolean[]
): GamepadPollResult {
  const assignments = getPlayerDeviceAssignments();
  const playerSlot: 1 | 2 = slotIndex === 1 ? 2 : 1;
  const assignedIndex = assignments[playerSlot - 1]?.gamepadIndex;
  if (assignedIndex === null || assignedIndex === undefined) {
    return mapGamepadToInput(null, prevButtons);
  }
  const target = findGamepadByIndex(assignedIndex);
  return mapGamepadToInput(target, prevButtons);
}
