import { GAME_CONFIG } from './config';
import {
  FighterState,
  MAX_SUPER_METER,
  MatchState,
  Projectile,
  getActiveHitboxBoxes,
  getHurtboxBoxes,
  isPowerAction,
} from './rules';
import { selectSheetFrame, spriteSheets } from './spriteSheet';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'spark' | 'note' | 'flame' | 'ring' | 'dust' | 'sweat';
}

export class ParticlePool {
  private pool: Particle[];
  private cursor = 0;

  constructor(capacity = 240) {
    const safeCapacity = Math.max(1, Math.min(GAME_CONFIG.maxParticles, capacity));
    this.pool = Array.from({ length: safeCapacity }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.4,
      size: 6,
      color: '#ffffff',
      kind: 'spark',
    }));
  }

  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) count++;
    }
    return count;
  }

  public spawnBurst(
    x: number,
    y: number,
    color: string,
    count: number,
    kind: Particle['kind'] = 'spark',
    speed = 260
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      const angle =
        kind === 'dust'
          ? -Math.PI * (0.1 + Math.random() * 0.8)
          : (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const mag = speed * (0.45 + Math.random() * 0.75);
      p.active = true;
      p.x = x + (Math.random() - 0.5) * 14;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = Math.cos(angle) * mag;
      p.vy = Math.sin(angle) * mag - (kind === 'note' || kind === 'flame' ? 95 : 0);
      p.maxLife = kind === 'note' ? 0.65 : kind === 'dust' ? 0.28 : 0.35 + Math.random() * 0.18;
      p.life = p.maxLife;
      p.size = kind === 'ring' ? 36 : kind === 'dust' ? 8 : 6 + Math.floor(Math.random() * 6);
      p.color = color;
      p.kind = kind;
    }
  }

  public update(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark' || p.kind === 'sweat') {
        p.vy += 520 * dt;
      } else if (p.kind === 'flame') {
        p.vy -= 140 * dt;
      }
      p.vx *= 0.94;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.kind === 'note') {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#090a14';
        ctx.lineWidth = 3;
        ctx.font = 'bold 22px Silkscreen, monospace';
        const glyph = i % 2 === 0 ? '♪' : '♫';
        ctx.strokeText(glyph, Math.round(p.x), Math.round(p.y));
        ctx.fillText(glyph, Math.round(p.x), Math.round(p.y));
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        const r = p.size * (1.8 - alpha);
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const s = Math.max(3, Math.round(p.size * alpha));
        ctx.fillStyle = '#090a14';
        ctx.fillRect(Math.round(p.x - s / 2 - 2), Math.round(p.y - s / 2 - 2), s + 4, s + 4);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
      }
      ctx.restore();
    }
  }
}

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile, time: number): void {
  const travelDir = proj.vx >= 0 ? 1 : -1;
  const trailDir = -travelDir;
  const cx = proj.x;
  const cy = proj.y;
  const pulse = 1 + Math.sin(time * 26) * 0.08;

  // 1) Tapered 6-segment energy comet flame tail + floating embers
  for (let t = 6; t >= 1; t--) {
    const ratio = 1 - t / 7;
    const waveY = Math.sin(time * 24 + t * 1.35) * (2.5 + t * 0.7);
    const tx = cx + trailDir * t * (proj.radius * 0.56);
    const ty = cy + waveY;
    const r = Math.max(4, proj.radius * (0.28 + ratio * 0.68));

    ctx.save();
    ctx.globalAlpha = 0.14 + ratio * 0.34;
    ctx.fillStyle = t % 2 === 0 ? proj.accent : proj.color;
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.fill();

    // Fluttering plasma embers
    const emberY = ty + (t % 2 === 0 ? -1 : 1) * (proj.radius * 0.48);
    ctx.globalAlpha = 0.25 + ratio * 0.45;
    ctx.fillStyle = proj.isBossContract ? '#facc15' : '#ffffff';
    ctx.fillRect(tx - 2, Math.round(emberY) - 2, 4, 4);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(cx, cy);

  // 2) Forward supersonic crescent shockwave arc
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = proj.isBossContract ? '#facc15' : '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  if (travelDir > 0) {
    ctx.arc(6, 0, proj.radius * 1.24 * pulse, -Math.PI * 0.42, Math.PI * 0.42);
  } else {
    ctx.arc(-6, 0, proj.radius * 1.24 * pulse, Math.PI * 0.58, Math.PI * 1.42);
  }
  ctx.stroke();
  ctx.restore();

  if (proj.isBossContract) {
    const spin = time * 11;
    // Outer demonic aura
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius * 1.48 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(spin);

    // Jagged crimson spikes + black rim
    ctx.fillStyle = '#090a14';
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(-7, -proj.radius * 0.7);
      ctx.lineTo(0, -proj.radius * 1.42);
      ctx.lineTo(7, -proj.radius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
    ctx.fill();

    // Spinning golden contract seal bars & orbiting hellfire sparks
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-proj.radius * 0.8, -4, proj.radius * 1.6, 8);
    ctx.fillRect(-4, -proj.radius * 0.8, 8, proj.radius * 1.6);
    for (let i = 0; i < 6; i++) {
      const a = -spin * 1.7 + (i * Math.PI * 2) / 6;
      const sx = Math.cos(a) * (proj.radius + 9);
      const sy = Math.sin(a) * (proj.radius + 9);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 3, 6, 6);
    }

    ctx.fillStyle = '#090a14';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const spin = time * 16;

    // Outer radiant plasma halo
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius * 1.48 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Spinning outer energy blades (4-blade vortex)
    ctx.save();
    ctx.rotate(spin);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#090a14';
      ctx.beginPath();
      ctx.ellipse(proj.radius * 0.42, 0, proj.radius * 0.72, proj.radius * 0.28, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i % 2 === 0 ? proj.color : proj.accent;
      ctx.beginPath();
      ctx.ellipse(proj.radius * 0.4, 0, proj.radius * 0.64, proj.radius * 0.22, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Crisp black outline + glowing sphere + plasma star core
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#090a14';
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius * 0.84 + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius * 0.84, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = proj.accent;
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius * 0.56, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright plasma 4-point star flare
    ctx.save();
    ctx.rotate(-spin * 0.75);
    ctx.fillStyle = '#ffffff';
    const starR = proj.radius * 0.48;
    ctx.beginPath();
    ctx.moveTo(0, -starR);
    ctx.lineTo(starR * 0.28, -starR * 0.28);
    ctx.lineTo(starR, 0);
    ctx.lineTo(starR * 0.28, starR * 0.28);
    ctx.lineTo(0, starR);
    ctx.lineTo(-starR * 0.28, starR * 0.28);
    ctx.lineTo(-starR, 0);
    ctx.lineTo(-starR * 0.28, -starR * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  groundY: number,
  rx = f.x,
  ry = f.y
): void {
  const s = f.profile.scale;
  const airRatio = Math.max(0.32, 1 - (groundY - ry) / 300);
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
  ctx.beginPath();
  ctx.ellipse(
    rx,
    groundY + 7,
    54 * s * airRatio,
    14 * s * airRatio,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function drawActionMotionEffects(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  time: number,
  rx = f.x,
  ry = f.y
): void {
  const s = f.profile.scale;

  if (f.action === 'jump') {
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
    ctx.lineWidth = 2.5;
    const dir = f.vy < 0 ? 1 : -1;
    for (let i = -1; i <= 1; i++) {
      const lx = rx + i * 32 * s;
      const ly = ry - 90 * s + ((time * 180) % 28) * dir;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly + 28 * dir);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (f.action === 'power_shoryu') {
    ctx.save();
    ctx.strokeStyle = f.profile.colors.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(rx + f.facing * 24 * s, ry - 165 * s, 48 * s, Math.PI * 0.9, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();
  }

  if (f.action === 'power_tornado') {
    ctx.save();
    ctx.strokeStyle = f.profile.colors.primary;
    ctx.lineWidth = 4;
    for (let ring = 0; ring < 3; ring++) {
      const rxRing = 56 * s + ring * 14 * s;
      const ryRing = 16 * s;
      const cy = ry - (70 + ring * 48) * s;
      ctx.beginPath();
      ctx.ellipse(rx, cy, rxRing, ryRing, (time * 12 + ring) % (Math.PI * 2), 0, Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (f.action === 'power_slam') {
    ctx.save();
    ctx.strokeStyle = f.profile.colors.accent;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const sx = rx - f.facing * (35 + i * 24) * s;
      const sy = ry - (65 + i * 42) * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - f.facing * 42 * s, sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (f.action === 'hitstun') {
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(rx - 34 * s, ry - 178 * s);
    ctx.lineTo(rx - 50 * s, ry - 190 * s);
    ctx.moveTo(rx + 34 * s, ry - 178 * s);
    ctx.lineTo(rx + 50 * s, ry - 190 * s);
    ctx.stroke();
    ctx.restore();
  }

  if (f.action === 'dizzy') {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const a = time * 6.5 + (i * Math.PI * 2) / 3;
      const sx = rx + Math.cos(a) * 38 * s;
      const sy = ry - 242 * s + Math.sin(a) * 10;
      ctx.fillStyle = '#090a14';
      ctx.fillRect(sx - 6, sy - 6, 12, 12);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(sx - 4, sy - 4, 8, 8);
    }
    ctx.restore();
  }

  if (f.action === 'block') {
    ctx.save();
    const bx = rx + f.facing * 40 * s;
    const by = ry - 195 * s;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.fillRect(bx - 12, by, 24, 168 * s);
    ctx.strokeRect(bx - 12, by, 24, 168 * s);
    ctx.restore();
  }
}

function drawSpawnBeam(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  time: number,
  rx = f.x,
  ry = f.y
): void {
  const s = f.profile.scale;
  const w = 68 * s;
  const h = 220 * s;
  const pulse = 0.26 + Math.sin(time * 14) * 0.08;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = f.profile.colors.primary;
  ctx.fillRect(rx - w / 2, ry - h, w, h);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(rx - w * 0.22, ry - h, w * 0.44, h);
  ctx.restore();
}

function drawSheetFighter(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  time: number,
  rx = f.x,
  ry = f.y
): boolean {
  const sheet = spriteSheets.ensureLoaded(f.profile.id);
  if (!sheet || sheet.frames.length === 0) return false;

  // Enlarged fighters (~236px base height scaled by profile) for dramatic ConchetuFight stage presence
  const targetHeight = 236 * f.profile.scale;
  const pose = selectSheetFrame(
    f.profile.id,
    f.action,
    f.actionTimer,
    f.walkDist,
    f.vy,
    time,
    f.vx * f.facing
  );
  const frame = sheet.frames[pose.frameIdx] ?? sheet.frames[8];
  const scale = targetHeight / sheet.referenceBodyHeight;
  const drawW = frame.width * scale;
  const drawH = frame.height * scale;
  const anchorX = frame.footOffsetX * scale;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Afterimages during Dash, Powers & Poder Ultra
  if (f.action === 'dash' || f.action === 'super' || isPowerAction(f.action)) {
    for (let g = 2; g >= 1; g--) {
      ctx.save();
      ctx.globalAlpha = g === 2 ? 0.16 : 0.32;
      ctx.translate(
        rx - f.facing * g * 28,
        ry + pose.offsetY
      );
      ctx.scale(f.facing * f.squashX * pose.scaleX, f.squashY * pose.scaleY);
      ctx.rotate(pose.tiltRad);
      ctx.drawImage(frame.canvas, -anchorX, -drawH, drawW, drawH);
      ctx.restore();
    }
  }

  // Aura on 3-Bar Ultra Ready, active Poder Ultra, SF Power, or Boss
  const ultraReady = f.superMeter >= MAX_SUPER_METER;
  if (f.action === 'super' || isPowerAction(f.action) || ultraReady || f.profile.isBoss) {
    ctx.save();
    ctx.globalAlpha =
      (f.action === 'super'
        ? 0.38
        : isPowerAction(f.action)
          ? 0.28
          : ultraReady
            ? 0.22
            : 0.18) +
      Math.sin(time * 12) * 0.05;
    ctx.fillStyle = ultraReady ? '#facc15' : f.profile.colors.aura;
    ctx.beginPath();
    ctx.ellipse(
      rx,
      ry - drawH * 0.5,
      64 * f.profile.scale,
      drawH * 0.54,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  // Brief gentle impact flinch only during hit flash; no continuous trembling in hitstun
  const shudderX = f.hitFlashTimer > 0 ? Math.sin(time * 36) * 2.2 : 0;
  ctx.translate(rx + shudderX, ry + pose.offsetY);

  if (f.action === 'ko') {
    if (pose.isLyingKo) {
      ctx.scale(f.facing, 1);
      ctx.drawImage(frame.canvas, -drawW / 2, -drawH + 12, drawW, drawH);
    } else {
      const fallAngle = Math.min(Math.PI / 2, f.actionTimer * 4.2);
      ctx.translate(0, -24);
      ctx.scale(f.facing, 1);
      ctx.rotate(-fallAngle);
      ctx.drawImage(frame.canvas, -anchorX, -drawH + 24, drawW, drawH);
    }
    ctx.restore();
    ctx.restore();
    return true;
  }

  ctx.scale(f.facing * f.squashX * pose.scaleX, f.squashY * pose.scaleY);
  ctx.rotate(pose.tiltRad);

  const imgToDraw = f.hitFlashTimer > 0 ? frame.flashCanvas : frame.canvas;
  ctx.drawImage(imgToDraw, -anchorX, -drawH, drawW, drawH);

  if (f.action === 'hitstun' && f.hitFlashTimer <= 0) {
    ctx.globalAlpha = 0.34;
    ctx.drawImage(frame.hurtCanvas, -anchorX, -drawH, drawW, drawH);
  }

  ctx.restore();
  ctx.restore();
  drawActionMotionEffects(ctx, f, time, rx, ry);
  return true;
}

export function drawStageReactiveEffects(
  ctx: CanvasRenderingContext2D,
  pulse: number,
  accentColor: string,
  isBossStage: boolean,
  isFinishHim: boolean,
  winnerX: number,
  loserX: number,
  groundY: number
): void {
  if (isFinishHim) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 4, 16, 0.58)';
    ctx.fillRect(0, 0, 1280, 720);
    [winnerX, loserX].forEach((sx, idx) => {
      ctx.fillStyle = idx === 1 ? 'rgba(239, 68, 68, 0.24)' : 'rgba(250, 204, 21, 0.18)';
      ctx.beginPath();
      ctx.moveTo(sx - 28, 0);
      ctx.lineTo(sx + 28, 0);
      ctx.lineTo(sx + 135, groundY + 14);
      ctx.lineTo(sx - 135, groundY + 14);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  if (pulse > 0.02) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.45, pulse * 0.45);
    ctx.strokeStyle = isBossStage ? '#facc15' : accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(640, 340, 80 + (1 - pulse) * 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  time: number,
  groundY: number,
  overrideX?: number,
  overrideY?: number
): void {
  const rx = overrideX ?? f.x;
  const ry = overrideY ?? f.y;
  drawGroundShadow(ctx, f, groundY, rx, ry);
  if (!drawSheetFighter(ctx, f, time, rx, ry)) {
    drawSpawnBeam(ctx, f, time, rx, ry);
  }
}

export function drawFighterBubble(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  overrideX?: number,
  overrideY?: number
): void {
  if (f.phraseText && f.phraseTimer > 0) {
    const rx = overrideX ?? f.x;
    const ry = overrideY ?? f.y;
    drawComboPhraseBubble(
      ctx,
      rx,
      ry - 246 * f.profile.scale,
      f.phraseText,
      f.profile.colors.primary
    );
  }
}

function drawComboPhraseBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  accent: string
): void {
  ctx.save();
  ctx.font = 'bold 17px "Chakra Petch", sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 14;
  const w = Math.max(120, Math.ceil(metrics.width) + padX * 2);
  const h = 38;
  const bx = Math.max(20, Math.min(1280 - w - 20, Math.round(x - w / 2)));
  const by = Math.max(88, Math.round(y - h));

  ctx.fillStyle = '#090a14';
  ctx.fillRect(bx - 3, by - 3, w + 6, h + 6);
  ctx.fillStyle = '#fefce8';
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(bx, by, w, 5);

  const tipX = Math.max(bx + 14, Math.min(bx + w - 14, Math.round(x)));
  ctx.fillStyle = '#090a14';
  ctx.beginPath();
  ctx.moveTo(tipX - 8, by + h);
  ctx.lineTo(tipX + 8, by + h);
  ctx.lineTo(tipX, by + h + 11);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fefce8';
  ctx.beginPath();
  ctx.moveTo(tipX - 5, by + h);
  ctx.lineTo(tipX + 5, by + h);
  ctx.lineTo(tipX, by + h + 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#090a14';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, by + h / 2 + 2);
  ctx.restore();
}

export function drawDebugCollisionOverlay(
  ctx: CanvasRenderingContext2D,
  match: MatchState
): void {
  ctx.save();
  ctx.lineWidth = 2;

  const fighters = [match.p1, match.p2];
  for (const f of fighters) {
    // Green: Hurtbox
    for (const hb of getHurtboxBoxes(f)) {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
      ctx.strokeStyle = '#22c55e';
      ctx.fillRect(Math.round(hb.x), Math.round(hb.y), Math.round(hb.width), Math.round(hb.height));
      ctx.strokeRect(Math.round(hb.x), Math.round(hb.y), Math.round(hb.width), Math.round(hb.height));
    }

    // Red: Active Hitbox
    for (const atk of getActiveHitboxBoxes(f)) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.strokeStyle = '#ef4444';
      ctx.fillRect(Math.round(atk.x), Math.round(atk.y), Math.round(atk.width), Math.round(atk.height));
      ctx.strokeRect(Math.round(atk.x), Math.round(atk.y), Math.round(atk.width), Math.round(atk.height));
    }

    // White: Coordinate origin crosshair
    const ox = Math.round(f.x);
    const oy = Math.round(f.y);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(ox - 8, oy);
    ctx.lineTo(ox + 8, oy);
    ctx.moveTo(ox, oy - 8);
    ctx.lineTo(ox, oy + 8);
    ctx.stroke();
  }

  // Blue: Projectiles
  for (const p of match.projectiles) {
    const px = Math.round(p.x - p.radius);
    const py = Math.round(p.y - p.radius);
    const pw = Math.round(p.radius * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
    ctx.strokeStyle = '#3b82f6';
    ctx.fillRect(px, py, pw, pw);
    ctx.strokeRect(px, py, pw, pw);
  }

  // Yellow: Contact overlap zones
  for (const c of match.debugContacts) {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
    ctx.strokeStyle = '#facc15';
    ctx.fillRect(Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height));
    ctx.strokeRect(Math.round(c.x), Math.round(c.y), Math.round(c.width), Math.round(c.height));
  }

  ctx.restore();
}
