import { FighterId } from './fighters';
import { FighterAction } from './rules';

export interface SlicedSpriteFrame {
  canvas: HTMLCanvasElement;
  flashCanvas: HTMLCanvasElement;
  hurtCanvas: HTMLCanvasElement;
  width: number;
  height: number;
  footOffsetX: number;
}

export interface LoadedSpriteSheet {
  frames: SlicedSpriteFrame[];
  rows: SlicedSpriteFrame[][];
  referenceBodyHeight: number;
  gridSize: number;
}

export interface FighterSheetConfig {
  url: string;
  /** Number of logical rows (kept alongside gridSize for tooling/tests) */
  gridSize: number;
  rowBands: ReadonlyArray<readonly [number, number]>;
  rowCounts: readonly number[];
  minX: number;
  perRowMinX?: Readonly<Record<number, number>>;
  maxSingleW: number;
  minPartW: number;
  maxValleyInk: number;
  /** Strip small detached label dots in the top px of a cell (Marcianeke text banners) */
  stripTopTinyNoise?: boolean;
}

export const FIGHTER_SHEET_CONFIG: Record<FighterId, FighterSheetConfig> = {
  marcianeke: {
    url: '/assets/aistudio/SPRITES_MARCIANEKE_61946b71.png',
    gridSize: 7,
    rowBands: [
      [49, 140],
      [165, 253],
      [280, 392],
      [441, 533],
      [562, 670],
      [728, 824],
      [856, 970],
    ],
    rowCounts: [27, 25, 26, 25, 18, 24, 19],
    minX: 0,
    maxSingleW: 78,
    minPartW: 30,
    maxValleyInk: 14,
    stripTopTinyNoise: true,
  },
  pablo_chille: {
    url: '/assets/aistudio/PABLO_CHILL-E_afe19a49.png',
    gridSize: 7,
    rowBands: [
      [9, 140],
      [160, 288],
      [305, 433],
      [453, 574],
      [586, 726],
      [738, 855],
      [868, 1003],
    ],
    rowCounts: [13, 14, 13, 14, 10, 13, 12],
    minX: 394,
    perRowMinX: { 4: 408, 5: 408 },
    maxSingleW: 115,
    minPartW: 48,
    maxValleyInk: 16,
  },
  juliano_sosa: {
    url: '/assets/aistudio/SPRITES_JULIANO_SOSA_7f425b6f.png',
    gridSize: 7,
    rowBands: [
      [6, 161],
      [172, 310],
      [322, 448],
      [460, 596],
      [600, 729],
      [740, 864],
      [877, 1015],
    ],
    rowCounts: [14, 16, 16, 11, 14, 14, 15],
    minX: 0,
    maxSingleW: 125,
    minPartW: 52,
    maxValleyInk: 19,
  },
  jere_klein: {
    url: '/assets/aistudio/SPRITES_JERE_KLEIN_a2f5336b.png',
    gridSize: 7,
    rowBands: [
      [5, 160],
      [172, 313],
      [324, 448],
      [464, 597],
      [606, 733],
      [749, 870],
      [880, 1015],
    ],
    rowCounts: [14, 18, 16, 12, 14, 14, 15],
    minX: 0,
    maxSingleW: 120,
    minPartW: 52,
    maxValleyInk: 19,
  },
  bayron_fire: {
    url: '/assets/aistudio/SPRITES_BAYRON_FIRE_d013578b.png',
    gridSize: 9,
    rowBands: [
      [6, 118],
      [127, 233],
      [247, 344],
      [357, 453],
      [460, 557],
      [575, 668],
      [680, 776],
      [785, 895],
      [908, 1011],
    ],
    rowCounts: [16, 18, 18, 17, 17, 16, 16, 17, 18],
    minX: 0,
    maxSingleW: 125,
    minPartW: 50,
    maxValleyInk: 16,
  },
  loyalty: {
    url: '/assets/aistudio/sprites_loyalty_92d9c81a.png',
    gridSize: 7,
    rowBands: [
      [4, 141],
      [165, 298],
      [305, 444],
      [464, 608],
      [623, 755],
      [775, 897],
      [901, 1018],
    ],
    rowCounts: [21, 20, 15, 17, 15, 17, 21],
    minX: 0,
    maxSingleW: 115,
    minPartW: 44,
    maxValleyInk: 19,
  },
  cris_mj: {
    url: '/assets/aistudio/SPRITES_CRIS_MJ_e8eca586.png',
    gridSize: 8,
    rowBands: [
      [6, 127],
      [134, 251],
      [260, 378],
      [387, 506],
      [519, 626],
      [633, 751],
      [755, 854],
      [862, 977],
    ],
    rowCounts: [19, 19, 17, 17, 16, 18, 18, 23],
    minX: 0,
    maxSingleW: 120,
    minPartW: 52,
    maxValleyInk: 16,
  },
  disquera_internacional: {
    url: '/assets/aistudio/SPRITES_DISQUERA_INTERNACIONAL_f81170b3.png',
    gridSize: 8,
    rowBands: [
      [6, 130],
      [142, 256],
      [265, 388],
      [398, 517],
      [528, 642],
      [649, 763],
      [777, 882],
      [892, 1015],
    ],
    rowCounts: [12, 14, 15, 14, 15, 14, 16, 19],
    minX: 0,
    maxSingleW: 130,
    minPartW: 58,
    maxValleyInk: 16,
  },
};

export const FIGHTER_SHEET_URLS: Record<FighterId, string> = {
  marcianeke: FIGHTER_SHEET_CONFIG.marcianeke.url,
  pablo_chille: FIGHTER_SHEET_CONFIG.pablo_chille.url,
  juliano_sosa: FIGHTER_SHEET_CONFIG.juliano_sosa.url,
  jere_klein: FIGHTER_SHEET_CONFIG.jere_klein.url,
  bayron_fire: FIGHTER_SHEET_CONFIG.bayron_fire.url,
  loyalty: FIGHTER_SHEET_CONFIG.loyalty.url,
  cris_mj: FIGHTER_SHEET_CONFIG.cris_mj.url,
  disquera_internacional: FIGHTER_SHEET_CONFIG.disquera_internacional.url,
};

export function getExpectedTotalFrames(fighterId: FighterId): number {
  return FIGHTER_SHEET_CONFIG[fighterId].rowCounts.reduce((acc, n) => acc + n, 0);
}

function splitValley(
  seg: [number, number],
  colCounts: Int32Array,
  maxSingleW: number,
  minPartW: number,
  maxValleyInk: number
): Array<[number, number]> {
  const [a, b] = seg;
  if (b - a + 1 <= maxSingleW) return [seg];
  let bestX = -1;
  let bestVal = 99999;
  for (let x = a + minPartW; x <= b - minPartW; x++) {
    if (colCounts[x] < bestVal) {
      bestVal = colCounts[x];
      bestX = x;
    }
  }
  if (bestX !== -1 && bestVal <= maxValleyInk) {
    return [
      ...splitValley([a, bestX - 1], colCounts, maxSingleW, minPartW, maxValleyInk),
      ...splitValley([bestX + 1, b], colCounts, maxSingleW, minPartW, maxValleyInk),
    ];
  }
  return [seg];
}

export type SheetLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

class SpriteSheetRegistry {
  private sheets = new Map<FighterId, LoadedSpriteSheet>();
  private loading = new Set<FighterId>();
  private failed = new Map<FighterId, string>();

  public getSheetStatus(fighterId: FighterId): SheetLoadStatus {
    if (this.sheets.has(fighterId)) return 'loaded';
    if (this.loading.has(fighterId)) return 'loading';
    if (this.failed.has(fighterId)) return 'error';
    return 'idle';
  }

  public getLoadedCount(): number {
    return this.sheets.size;
  }

  public getTotalCount(): number {
    return Object.keys(FIGHTER_SHEET_CONFIG).length;
  }

  public getLoadErrors(): Record<string, string> {
    return Object.fromEntries(this.failed.entries());
  }

  public ensureLoaded(fighterId: FighterId): LoadedSpriteSheet | null {
    const existing = this.sheets.get(fighterId);
    if (existing) return existing;
    if (
      this.loading.has(fighterId) ||
      this.failed.has(fighterId) ||
      typeof window === 'undefined'
    ) {
      return null;
    }

    const cfg = FIGHTER_SHEET_CONFIG[fighterId];
    if (!cfg) return null;

    this.loading.add(fighterId);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const { rows, frames, referenceBodyHeight } = this.sliceMultiRowAlpha(
          img,
          cfg,
          fighterId
        );
        if (frames.length > 0 && rows.length > 0) {
          this.sheets.set(fighterId, {
            frames,
            rows,
            referenceBodyHeight,
            gridSize: cfg.gridSize,
          });
        } else {
          this.failed.set(fighterId, `No frames extracted from ${cfg.url}`);
        }
      } catch (err) {
        this.failed.set(
          fighterId,
          err instanceof Error ? err.message : 'Slice failure'
        );
      } finally {
        this.loading.delete(fighterId);
      }
    };
    img.onerror = () => {
      this.loading.delete(fighterId);
      this.failed.set(fighterId, `Failed to load ${cfg.url}`);
    };
    img.src = cfg.url;
    return null;
  }

  public preloadFighters(ids: readonly FighterId[]): void {
    ids.forEach((id) => {
      this.ensureLoaded(id);
    });
  }

  public preloadAll(): void {
    this.preloadFighters(Object.keys(FIGHTER_SHEET_CONFIG) as FighterId[]);
  }

  private alignCellHorizontally(
    refCanvas: HTMLCanvasElement,
    refAnchorX: number,
    targetCanvas: HTMLCanvasElement,
    fallbackAnchorX: number,
    maxShift = 14
  ): number {
    const rw = refCanvas.width;
    const rh = refCanvas.height;
    const tw = targetCanvas.width;
    const th = targetCanvas.height;
    if (rw < 8 || rh < 8 || tw < 8 || th < 8) return fallbackAnchorX;

    const refData = refCanvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, rw, rh).data;
    const tgtData = targetCanvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, tw, th).data;

    // Compare upper-to-mid body core (0%..80% height, bottom-aligned) so feet/stance shifts never wobble the head/torso
    const compareH = Math.min(rh, th, Math.round(Math.min(rh, th) * 0.8));
    const refTopOffset = rh - compareH - Math.round(rh * 0.08);
    const tgtTopOffset = th - compareH - Math.round(th * 0.08);

    const baseDx = Math.round(fallbackAnchorX - refAnchorX);
    let bestAnchor = fallbackAnchorX;
    let bestErr = Number.POSITIVE_INFINITY;

    for (let shift = -maxShift; shift <= maxShift; shift++) {
      const candAnchor = refAnchorX + shift;
      const offsetDiff = Math.round(candAnchor - refAnchorX);
      let err = 0;
      let samples = 0;

      for (let y = 0; y < compareH; y += 2) {
        const ry = refTopOffset + y;
        const ty = tgtTopOffset + y;
        if (ry < 0 || ry >= rh || ty < 0 || ty >= th) continue;

        for (let rx = 0; rx < rw; rx += 2) {
          const tx = rx + offsetDiff;
          const rIdx = (ry * rw + rx) * 4;
          const rAlpha = refData[rIdx + 3];

          let tAlpha = 0;
          let colorDiff = 0;
          if (tx >= 0 && tx < tw) {
            const tIdx = (ty * tw + tx) * 4;
            tAlpha = tgtData[tIdx + 3];
            if (rAlpha > 40 && tAlpha > 40) {
              colorDiff =
                (Math.abs(refData[rIdx] - tgtData[tIdx]) +
                  Math.abs(refData[rIdx + 1] - tgtData[tIdx + 1]) +
                  Math.abs(refData[rIdx + 2] - tgtData[tIdx + 2])) *
                0.2;
            }
          }

          err += Math.abs(rAlpha - tAlpha) + colorDiff;
          samples++;
        }
      }

      // Slight tie-breaker preferring proximity to torso centroid
      const penalty = Math.abs(shift - baseDx) * 1.2;
      const score = samples > 0 ? err / samples + penalty : Number.POSITIVE_INFINITY;
      if (score < bestErr) {
        bestErr = score;
        bestAnchor = candAnchor;
      }
    }

    return Math.max(tw * 0.2, Math.min(tw * 0.8, bestAnchor));
  }

  private sliceMultiRowAlpha(
    img: HTMLImageElement,
    cfg: FighterSheetConfig,
    fighterId: FighterId
  ): { rows: SlicedSpriteFrame[][]; frames: SlicedSpriteFrame[]; referenceBodyHeight: number } {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = w;
    srcCanvas.height = h;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return { rows: [], frames: [], referenceBodyHeight: 110 };

    srcCtx.drawImage(img, 0, 0);
    const fullData = srcCtx.getImageData(0, 0, w, h);
    const data = fullData.data;

    interface RawCell {
      canvas: HTMLCanvasElement;
      tw: number;
      th: number;
      footOffsetX: number;
    }

    const rawRows: RawCell[][] = [];

    cfg.rowBands.forEach(([y0Raw, y1Raw], rIdx) => {
      const y0 = Math.max(0, y0Raw);
      const y1 = Math.min(h - 1, y1Raw);
      const rowMinX = cfg.perRowMinX?.[rIdx] ?? cfg.minX;
      const colCounts = new Int32Array(w);

      for (let x = rowMinX; x < w; x++) {
        let c = 0;
        for (let y = y0; y <= y1; y++) {
          if (data[(y * w + x) * 4 + 3] > 28) c++;
        }
        colCounts[x] = c;
      }

      const rawSegs: Array<[number, number]> = [];
      let inCol = false;
      let startX = 0;
      for (let x = rowMinX; x < w; x++) {
        if (colCounts[x] > 2) {
          if (!inCol) {
            inCol = true;
            startX = x;
          }
        } else if (inCol) {
          if (x - startX > 12) rawSegs.push([startX, x - 1]);
          inCol = false;
        }
      }
      if (inCol && w - startX > 12) {
        rawSegs.push([startX, w - 1]);
      }

      const finalSegs = rawSegs.flatMap((seg) =>
        splitValley(seg, colCounts, cfg.maxSingleW, cfg.minPartW, cfg.maxValleyInk)
      );

      const rowCells: RawCell[] = [];
      for (const [x0, x1] of finalSegs) {
        rowCells.push(
          this.extractRawCell(
            data,
            w,
            x0,
            y0,
            x1 - x0 + 1,
            y1 - y0 + 1,
            Boolean(cfg.stripTopTinyNoise)
          )
        );
      }
      rawRows.push(rowCells);
    });

    // Register stationary/cycle poses horizontally so head & torso lock rock-steady across frames
    const poseMap = FIGHTER_POSE_MAPS[fighterId];
    const getCell = (rc: RC): RawCell | undefined => {
      const r = Math.max(0, Math.min(rawRows.length - 1, rc[0]));
      const row = rawRows[r];
      if (!row || row.length === 0) return undefined;
      return row[Math.max(0, Math.min(row.length - 1, rc[1]))];
    };
    const stabilizeGroup = (coords: readonly RC[], maxShift = 14) => {
      const base = coords.length > 0 ? getCell(coords[0]) : undefined;
      if (!base) return;
      for (let i = 1; i < coords.length; i++) {
        const cell = getCell(coords[i]);
        if (cell && cell !== base) {
          cell.footOffsetX = this.alignCellHorizontally(
            base.canvas,
            base.footOffsetX,
            cell.canvas,
            cell.footOffsetX,
            maxShift
          );
        }
      }
    };
    if (poseMap) {
      stabilizeGroup(poseMap.idle, 14);
      stabilizeGroup(poseMap.walk, 10);
      stabilizeGroup(poseMap.crouch, 10);
      stabilizeGroup(poseMap.block, 10);
      stabilizeGroup(poseMap.victory, 12);
    }

    // Measure reference standing height before upscaling so ALL 8 fighters normalize to identical target resolution
    const idleSample = (rawRows[0] ?? []).slice(0, Math.min(8, (rawRows[0] ?? []).length));
    const fullBodyHeights = idleSample.map((c) => c.th).sort((a, b) => a - b);
    const referenceBodyHeight =
      fullBodyHeights[Math.floor(fullBodyHeights.length / 2)] ||
      rawRows[0]?.[0]?.th ||
      110;

    // Normalize every character's body texture resolution to uniform 360px high-definition detail
    const NORMALIZED_BODY_HEIGHT = 360;
    const normScale = Math.max(
      2.0,
      Math.min(4.8, NORMALIZED_BODY_HEIGHT / Math.max(40, referenceBodyHeight))
    );

    const rows: SlicedSpriteFrame[][] = [];
    const frames: SlicedSpriteFrame[] = [];

    rawRows.forEach((rowCells, rIdx) => {
      const rowFrames: SlicedSpriteFrame[] = rowCells.map((cell) =>
        this.buildNormalizedFrame(cell.canvas, cell.tw, cell.th, cell.footOffsetX, normScale)
      );

      // Guarantee row length matches configured rowCounts[rIdx] while reusing frame instances
      const expected = cfg.rowCounts[rIdx] ?? rowFrames.length;
      while (rowFrames.length < expected && rowFrames.length > 0) {
        rowFrames.push(rowFrames[rowFrames.length - 1]);
      }
      if (rowFrames.length > expected) {
        rowFrames.length = expected;
      }

      rows.push(rowFrames);
      frames.push(...rowFrames);
    });

    return { rows, frames, referenceBodyHeight };
  }

  private extractRawCell(
    srcData: Uint8ClampedArray,
    srcW: number,
    ox: number,
    oy: number,
    cw: number,
    ch: number,
    stripTopTinyNoise: boolean
  ): { canvas: HTMLCanvasElement; tw: number; th: number; footOffsetX: number } {
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = cw;
    cellCanvas.height = ch;
    const ctx = cellCanvas.getContext('2d', { willReadFrequently: true })!;
    const imgData = ctx.createImageData(cw, ch);
    const dst = imgData.data;

    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const sIdx = ((oy + y) * srcW + (ox + x)) * 4;
        const dIdx = (y * cw + x) * 4;
        const r = srcData[sIdx];
        const g = srcData[sIdx + 1];
        const b = srcData[sIdx + 2];
        let a = srcData[sIdx + 3];

        // Remove bright white-matte edge fringe halos from transparent PNG cutouts
        if (a > 0 && a < 218) {
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          if (minC > 175 && maxC - minC < 44) {
            if (a < 95) {
              a = 0;
            } else {
              a = Math.max(0, Math.round((a - 65) * 1.15));
              dst[dIdx] = Math.round(r * 0.42);
              dst[dIdx + 1] = Math.round(g * 0.42);
              dst[dIdx + 2] = Math.round(b * 0.42);
              dst[dIdx + 3] = a;
              continue;
            }
          }
        }

        dst[dIdx] = r;
        dst[dIdx + 1] = g;
        dst[dIdx + 2] = b;
        dst[dIdx + 3] = a;
      }
    }

    // For sheets with overhead label text (Marcianeke), strip tiny isolated islands in top 12px
    if (stripTopTinyNoise) {
      const topLimit = Math.min(12, Math.floor(ch * 0.14));
      for (let y = 0; y < topLimit; y++) {
        let rowInk = 0;
        for (let x = 0; x < cw; x++) {
          if (dst[(y * cw + x) * 4 + 3] > 28) rowInk++;
        }
        if (rowInk > 0 && rowInk < cw * 0.22) {
          let hasConnectedBelow = false;
          for (let x = 0; x < cw; x++) {
            if (
              dst[(y * cw + x) * 4 + 3] > 28 &&
              dst[(Math.min(ch - 1, topLimit + 2) * cw + x) * 4 + 3] > 28
            ) {
              hasConnectedBelow = true;
              break;
            }
          }
          if (!hasConnectedBelow) {
            for (let x = 0; x < cw; x++) {
              dst[(y * cw + x) * 4 + 3] = 0;
            }
          }
        }
      }
    }

    let minX = cw;
    let maxX = 0;
    let minY = ch;
    let maxY = 0;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (dst[(y * cw + x) * 4 + 3] > 24) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const tw = Math.max(1, maxX - minX + 1);
    const th = Math.max(1, maxY - minY + 1);
    const tightCanvas = document.createElement('canvas');
    tightCanvas.width = tw;
    tightCanvas.height = th;
    const tCtx = tightCanvas.getContext('2d', { willReadFrequently: true })!;
    tCtx.imageSmoothingEnabled = false;
    if (maxX >= minX && maxY >= minY) {
      tCtx.drawImage(cellCanvas, minX, minY, tw, th, 0, 0, tw, th);
    }

    // Use torso-core centroid (22%..78% height) rather than bottom 15% toes so leg steps/kicks don't throw the upper body sideways
    let torsoSumX = 0;
    let torsoCount = 0;
    const yStart = Math.max(0, Math.floor(th * 0.22));
    const yEnd = Math.min(th, Math.max(yStart + 1, Math.floor(th * 0.78)));
    const tData = tCtx.getImageData(0, yStart, tw, yEnd - yStart).data;
    for (let y = 0; y < yEnd - yStart; y++) {
      for (let x = 0; x < tw; x++) {
        if (tData[(y * tw + x) * 4 + 3] > 36) {
          torsoSumX += x;
          torsoCount++;
        }
      }
    }
    const footOffsetX = torsoCount > 0 ? torsoSumX / torsoCount : tw / 2;

    return { canvas: tightCanvas, tw, th, footOffsetX };
  }

  /**
   * Directional Edge-Preserving 2x Super-Resolution (soft Scale2x/EPX hybrid):
   * preserves 1px facial features, eyes, chains, and crisp dark outlines without bilinear mush.
   */
  private edgePreserving2x(srcCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const sw = srcCanvas.width;
    const sh = srcCanvas.height;
    const sCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
    const src = sCtx.getImageData(0, 0, sw, sh).data;

    const dw = sw * 2;
    const dh = sh * 2;
    const dstCanvas = document.createElement('canvas');
    dstCanvas.width = dw;
    dstCanvas.height = dh;
    const dCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;
    const outImg = dCtx.createImageData(dw, dh);
    const dst = outImg.data;

    const isSimilar = (i1: number, i2: number): boolean => {
      const a1 = src[i1 + 3];
      const a2 = src[i2 + 3];
      if (a1 < 28 && a2 < 28) return true;
      if (Math.abs(a1 - a2) > 48) return false;
      return (
        Math.abs(src[i1] - src[i2]) +
          Math.abs(src[i1 + 1] - src[i2 + 1]) +
          Math.abs(src[i1 + 2] - src[i2 + 2]) <
        44
      );
    };

    const writeSub = (
      outIdx: number,
      pIdx: number,
      n1Idx: number,
      n2Idx: number,
      isDiagonalCorner: boolean,
      isDarkOutline: boolean
    ) => {
      if (isDiagonalCorner && !isDarkOutline) {
        dst[outIdx] = Math.round(src[pIdx] * 0.25 + (src[n1Idx] + src[n2Idx]) * 0.375);
        dst[outIdx + 1] = Math.round(src[pIdx + 1] * 0.25 + (src[n1Idx + 1] + src[n2Idx + 1]) * 0.375);
        dst[outIdx + 2] = Math.round(src[pIdx + 2] * 0.25 + (src[n1Idx + 2] + src[n2Idx + 2]) * 0.375);
        dst[outIdx + 3] = Math.round(src[pIdx + 3] * 0.25 + (src[n1Idx + 3] + src[n2Idx + 3]) * 0.375);
      } else {
        dst[outIdx] = src[pIdx];
        dst[outIdx + 1] = src[pIdx + 1];
        dst[outIdx + 2] = src[pIdx + 2];
        dst[outIdx + 3] = src[pIdx + 3];
      }
    };

    for (let y = 0; y < sh; y++) {
      const ym = Math.max(0, y - 1);
      const yp = Math.min(sh - 1, y + 1);
      for (let x = 0; x < sw; x++) {
        const xm = Math.max(0, x - 1);
        const xp = Math.min(sw - 1, x + 1);

        const p = (y * sw + x) * 4;
        const u = (ym * sw + x) * 4;
        const d = (yp * sw + x) * 4;
        const l = (y * sw + xm) * 4;
        const r = (y * sw + xp) * 4;

        const pA = src[p + 3];
        const luma = (src[p] + src[p + 1] + src[p + 2]) / 3;
        const isDarkOutline = pA > 140 && luma < 62;

        const simLU = isSimilar(l, u);
        const simUR = isSimilar(u, r);
        const simRD = isSimilar(r, d);
        const simDL = isSimilar(d, l);
        const simUD = isSimilar(u, d);
        const simLR = isSimilar(l, r);

        const dy2 = y * 2;
        const dx2 = x * 2;
        const tl = (dy2 * dw + dx2) * 4;
        const tr = tl + 4;
        const bl = ((dy2 + 1) * dw + dx2) * 4;
        const br = bl + 4;

        writeSub(tl, p, l, u, simLU && !simDL && !simUR && (!simUD || !simLR), isDarkOutline);
        writeSub(tr, p, u, r, simUR && !simLU && !simRD && (!simUD || !simLR), isDarkOutline);
        writeSub(bl, p, d, l, simDL && !simRD && !simLU && (!simUD || !simLR), isDarkOutline);
        writeSub(br, p, r, d, simRD && !simUR && !simDL && (!simUD || !simLR), isDarkOutline);
      }
    }

    dCtx.putImageData(outImg, 0, 0);
    return dstCanvas;
  }

  private applyCrispSharpen(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (w < 3 || h < 3) return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const src = new Uint8ClampedArray(imgData.data);
    const dst = imgData.data;
    const amount = 0.62;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const a = src[idx + 3];
        if (a < 28) {
          dst[idx + 3] = 0;
          continue;
        }

        const up = idx - w * 4;
        const dn = idx + w * 4;
        const lf = idx - 4;
        const rt = idx + 4;

        if (
          src[up + 3] > 90 &&
          src[dn + 3] > 90 &&
          src[lf + 3] > 90 &&
          src[rt + 3] > 90
        ) {
          const luma = (src[idx] + src[idx + 1] + src[idx + 2]) / 3;
          for (let c = 0; c < 3; c++) {
            const center = src[idx + c];
            const blur =
              (src[up + c] + src[dn + c] + src[lf + c] + src[rt + c] + center * 2) / 6;
            const diff = center - blur;
            if (Math.abs(diff) > 2.5) {
              const factor = luma < 65 ? amount * 1.15 : amount;
              dst[idx + c] = Math.max(0, Math.min(255, Math.round(center + diff * factor)));
            }
          }
        }

        if (a > 220) {
          dst[idx + 3] = 255;
        } else {
          dst[idx + 3] = Math.max(0, Math.min(255, Math.round((a - 24) * 1.2)));
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  private buildNormalizedFrame(
    tightCanvas: HTMLCanvasElement,
    tw: number,
    th: number,
    footOffsetX: number,
    normScale: number
  ): SlicedSpriteFrame {
    // 1x -> 2x edge-preserving pass (or 2x -> 4x for smaller source sheets like Marcianeke/Bayron)
    let superSrc = this.edgePreserving2x(tightCanvas);
    if (normScale > 2.75) {
      superSrc = this.edgePreserving2x(superSrc);
    }

    const nw = Math.max(1, Math.round(tw * normScale));
    const nh = Math.max(1, Math.round(th * normScale));
    const crispCanvas = document.createElement('canvas');
    crispCanvas.width = nw;
    crispCanvas.height = nh;
    const cCtx = crispCanvas.getContext('2d', { willReadFrequently: true })!;
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';
    cCtx.drawImage(superSrc, 0, 0, superSrc.width, superSrc.height, 0, 0, nw, nh);
    this.applyCrispSharpen(cCtx, nw, nh);

    let cachedFlash: HTMLCanvasElement | null = null;
    let cachedHurt: HTMLCanvasElement | null = null;

    const makeTinted = (color: string): HTMLCanvasElement => {
      const c = document.createElement('canvas');
      c.width = nw;
      c.height = nh;
      const g = c.getContext('2d')!;
      g.drawImage(crispCanvas, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, nw, nh);
      return c;
    };

    const frame: SlicedSpriteFrame = {
      canvas: crispCanvas,
      get flashCanvas() {
        if (!cachedFlash) cachedFlash = makeTinted('#ffffff');
        return cachedFlash;
      },
      get hurtCanvas() {
        if (!cachedHurt) cachedHurt = makeTinted('#ef4444');
        return cachedHurt;
      },
      width: tw,
      height: th,
      footOffsetX,
    };

    return frame;
  }
}

export const spriteSheets = new SpriteSheetRegistry();

export interface SheetPoseSelection {
  frameIdx: number;
  tiltRad: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  isLyingKo?: boolean;
}

type RC = readonly [number, number];

interface FighterPoseMap {
  idle: readonly RC[];
  walk: readonly RC[];
  dash: readonly RC[];
  crouch: readonly RC[];
  block: readonly RC[];
  jumpUp: readonly RC[];
  jumpApex: readonly RC[];
  jumpFall: readonly RC[];
  lightPunch: readonly RC[];
  heavyPunch: readonly RC[];
  lightKick: readonly RC[];
  heavyKick: readonly RC[];
  uppercut: readonly RC[];
  hadou: readonly RC[];
  shoryu: readonly RC[];
  slam: readonly RC[];
  tornado: readonly RC[];
  super: readonly RC[];
  hitstun: readonly RC[];
  dizzy: readonly RC[];
  koFall: readonly RC[];
  koLying: RC;
  victory: readonly RC[];
}

const FIGHTER_POSE_MAPS: Record<FighterId, FighterPoseMap> = {
  marcianeke: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9]],
    walk: [[0,10],[0,11],[0,12],[0,13],[0,14],[0,15]],
    dash: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6]],
    crouch: [[1,10],[1,11]],
    block: [[3,15],[3,16],[3,17],[3,18]],
    jumpUp: [[2,0],[2,1],[2,2],[2,3]],
    jumpApex: [[2,4],[2,5],[2,6]],
    jumpFall: [[2,11],[2,12],[2,13],[2,14]],
    lightPunch: [[0,18],[0,19],[0,20],[0,21]],
    heavyPunch: [[0,22],[0,23],[0,24],[0,25],[0,26]],
    lightKick: [[1,18],[1,19],[1,20]],
    heavyKick: [[2,19],[2,20],[2,21],[2,22],[2,23]],
    uppercut: [[1,14],[1,15],[1,16],[1,17]],
    hadou: [[3,7],[3,8],[3,9],[3,10],[3,11]],
    shoryu: [[4,4],[4,5],[4,6]],
    slam: [[3,0],[3,1],[3,2],[3,3]],
    tornado: [[4,0],[4,1],[4,2],[4,3]],
    super: [[3,12],[3,13],[4,7],[4,7]],
    hitstun: [[5,0],[5,1],[5,2],[5,3]],
    dizzy: [[6,7],[6,8],[6,9]],
    koFall: [[5,8],[5,9],[5,10]],
    koLying: [6, 3],
    victory: [[6,10],[6,11],[6,12]],
  },
  pablo_chille: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7]],
    walk: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]],
    dash: [[1,6],[1,7],[1,8],[1,9]],
    crouch: [[2,2],[2,3],[2,4]],
    block: [[5,0],[5,1],[5,2],[5,3]],
    jumpUp: [[2,5],[2,6],[2,7]],
    jumpApex: [[2,8],[2,9]],
    jumpFall: [[2,10],[2,11],[2,12]],
    lightPunch: [[3,0],[3,1],[3,2],[3,3],[3,4]],
    heavyPunch: [[3,5],[3,6],[3,7],[3,8]],
    lightKick: [[3,9],[3,10],[3,11]],
    heavyKick: [[3,10],[3,11],[4,0],[4,1]],
    uppercut: [[4,2],[4,3],[4,4]],
    hadou: [[4,4],[4,5],[4,6],[3,12]],
    shoryu: [[4,6],[4,7],[4,8]],
    slam: [[4,1],[4,2],[4,3]],
    tornado: [[4,8],[4,9]],
    super: [[4,5],[4,6],[4,8],[4,9]],
    hitstun: [[5,4],[5,5],[5,6],[5,7]],
    dizzy: [[5,8],[5,9],[5,10]],
    koFall: [[5,9],[5,10],[5,11]],
    koLying: [6, 11],
    victory: [[6,0],[6,1],[6,2],[6,3],[6,4]],
  },
  juliano_sosa: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,3],[0,2],[0,1]],
    walk: [[0,6],[0,7],[0,8],[0,9],[0,10]],
    dash: [[0,11],[0,12],[0,13]],
    crouch: [[1,4],[1,5],[1,6]],
    block: [[4,0],[4,1],[4,2],[4,3]],
    jumpUp: [[1,8],[1,9],[1,10]],
    jumpApex: [[1,11],[1,12]],
    jumpFall: [[1,13],[1,14],[1,15]],
    lightPunch: [[2,0],[2,1],[2,2],[2,3],[2,4]],
    heavyPunch: [[2,5],[2,6],[2,7],[2,8],[2,9]],
    lightKick: [[2,11],[2,12],[2,13]],
    heavyKick: [[2,13],[2,14],[2,15]],
    uppercut: [[3,3],[3,4],[3,5]],
    hadou: [[3,6],[3,7],[3,8],[3,9],[3,10]],
    shoryu: [[3,3],[3,4],[3,5]],
    slam: [[4,9],[4,10],[4,11],[4,12]],
    tornado: [[4,12],[4,13]],
    super: [[3,8],[3,9],[3,10],[4,13]],
    hitstun: [[5,0],[5,1],[5,2],[5,3],[5,4]],
    dizzy: [[5,6],[5,7],[5,8],[5,9]],
    koFall: [[5,10],[5,11]],
    koLying: [6, 14],
    victory: [[6,0],[6,1],[6,2],[6,3],[6,4],[6,5]],
  },
  jere_klein: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,3],[0,2],[0,1]],
    walk: [[0,6],[0,7],[0,8],[0,9],[0,10]],
    dash: [[0,11],[0,12],[0,13]],
    crouch: [[1,5],[1,6],[1,7]],
    block: [[4,0],[4,1],[4,2],[4,3]],
    jumpUp: [[1,9],[1,10],[1,11]],
    jumpApex: [[1,12],[1,13]],
    jumpFall: [[1,14],[1,15],[1,16]],
    lightPunch: [[2,0],[2,1],[2,2],[2,3],[2,4]],
    heavyPunch: [[2,5],[2,6],[2,7],[2,8],[2,9]],
    lightKick: [[2,11],[2,12],[2,13]],
    heavyKick: [[2,13],[2,14],[2,15]],
    uppercut: [[3,3],[3,4],[3,5]],
    hadou: [[3,6],[3,7],[3,8],[3,9],[3,10],[3,11]],
    shoryu: [[3,4],[3,5],[3,6]],
    slam: [[4,9],[4,10],[4,11],[4,12]],
    tornado: [[4,12],[4,13]],
    super: [[3,9],[3,10],[3,11],[4,13]],
    hitstun: [[5,0],[5,1],[5,2],[5,3],[5,4]],
    dizzy: [[5,6],[5,7],[5,8],[5,9]],
    koFall: [[5,10],[5,11]],
    koLying: [6, 14],
    victory: [[6,0],[6,1],[6,2],[6,3],[6,4],[6,5]],
  },
  bayron_fire: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,4],[0,3],[0,2],[0,1]],
    walk: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6]],
    dash: [[1,9],[1,10],[1,11],[1,12],[1,13]],
    crouch: [[2,0],[2,1],[2,2]],
    block: [[5,0],[5,1],[5,2],[5,3]],
    jumpUp: [[2,5],[2,6],[2,7]],
    jumpApex: [[2,8],[2,9]],
    jumpFall: [[2,10],[2,11],[2,12]],
    lightPunch: [[3,5],[3,6],[3,7],[3,8]],
    heavyPunch: [[3,9],[3,10],[3,11],[3,12],[3,13]],
    lightKick: [[4,5],[4,6]],
    heavyKick: [[6,7],[6,8],[6,9],[6,10]],
    uppercut: [[4,7],[4,8],[4,9],[4,10]],
    hadou: [[4,14],[4,15],[4,16]],
    shoryu: [[4,10],[4,11],[4,12]],
    slam: [[5,10],[5,11],[5,12],[5,13]],
    tornado: [[6,5],[6,6],[6,7],[6,8],[6,9],[6,10]],
    super: [[4,14],[4,15],[4,16],[5,11],[5,12]],
    hitstun: [[7,0],[7,1],[7,2],[7,3]],
    dizzy: [[7,4],[7,5],[7,6],[7,7]],
    koFall: [[7,9],[7,10]],
    koLying: [7, 11],
    victory: [[8,0],[8,1],[8,2],[8,3],[8,4]],
  },
  loyalty: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8]],
    walk: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]],
    dash: [[1,6],[1,7],[1,8],[1,9],[1,10]],
    crouch: [[0,13],[0,14]],
    block: [[4,0],[4,1],[4,2],[4,3]],
    jumpUp: [[1,11],[1,12],[1,13]],
    jumpApex: [[1,14],[1,15]],
    jumpFall: [[1,16],[1,17],[1,18]],
    lightPunch: [[2,0],[2,1],[2,2],[2,3],[2,4]],
    heavyPunch: [[2,7],[2,8],[2,9],[2,10]],
    lightKick: [[2,5],[2,6],[2,11],[2,12]],
    heavyKick: [[2,13],[2,14],[3,14],[3,15]],
    uppercut: [[3,3],[3,4],[3,5]],
    hadou: [[4,11],[4,12],[4,13],[4,14]],
    shoryu: [[3,12],[3,13],[3,14]],
    slam: [[4,8],[4,9],[4,10]],
    tornado: [[3,11],[3,12],[3,13],[3,14],[3,15]],
    super: [[3,4],[3,13],[3,14],[4,14]],
    hitstun: [[5,0],[5,1],[5,2],[5,3],[5,4]],
    dizzy: [[5,8],[5,9],[5,10]],
    koFall: [[5,13],[5,14]],
    koLying: [6, 19],
    victory: [[6,3],[6,4],[6,5],[6,6]],
  },
  cris_mj: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,5],[0,4],[0,3]],
    walk: [[0,9],[0,10],[0,11],[0,12],[0,13],[0,14],[0,15]],
    dash: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]],
    crouch: [[1,16],[1,17]],
    block: [[5,0],[5,1],[5,2],[5,3]],
    jumpUp: [[1,9],[1,10],[1,11]],
    jumpApex: [[1,12]],
    jumpFall: [[1,13],[1,14]],
    lightPunch: [[2,0],[2,1],[2,2],[2,3]],
    heavyPunch: [[2,4],[2,5],[2,6],[2,7],[2,8]],
    lightKick: [[3,9],[3,10],[3,11],[3,12]],
    heavyKick: [[3,12],[3,13],[3,14],[3,15],[3,16]],
    uppercut: [[2,9],[2,10],[2,11]],
    hadou: [[4,11],[4,12],[4,13],[4,14],[4,15]],
    shoryu: [[4,5],[4,6],[4,7]],
    slam: [[4,8],[4,9],[4,10]],
    tornado: [[3,12],[3,13],[3,14],[3,15],[3,16]],
    super: [[5,14],[5,15],[5,16],[5,17],[4,15]],
    hitstun: [[6,0],[6,1],[6,2],[6,3]],
    dizzy: [[6,5],[6,6],[6,7],[6,8]],
    koFall: [[6,10],[6,12]],
    koLying: [6, 15],
    victory: [[7,0],[7,1],[7,2],[7,3],[7,4]],
  },
  disquera_internacional: {
    idle: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,5],[0,4],[0,3]],
    walk: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7]],
    dash: [[1,8],[1,9],[1,10],[1,11],[1,12],[1,13]],
    crouch: [[2,4],[2,5]],
    block: [[6,0],[6,1],[6,2],[6,3]],
    jumpUp: [[2,6],[2,7]],
    jumpApex: [[2,8],[2,9]],
    jumpFall: [[2,10],[2,11]],
    lightPunch: [[3,0],[3,1],[3,2],[3,3],[3,4]],
    heavyPunch: [[3,3],[3,4],[3,5],[4,0],[4,1]],
    lightKick: [[3,6],[3,7],[3,8],[3,9]],
    heavyKick: [[3,10],[3,11],[3,12],[3,13]],
    uppercut: [[4,4],[4,5],[4,6]],
    hadou: [[5,9],[5,10],[5,11],[5,12],[5,13]],
    shoryu: [[4,5],[4,6],[4,7]],
    slam: [[6,7],[6,8],[6,9]],
    tornado: [[5,3],[5,4],[5,5],[5,6],[5,7]],
    super: [[4,9],[4,10],[4,11],[5,12],[5,13]],
    hitstun: [[6,11],[6,12],[6,13],[6,14]],
    dizzy: [[7,2],[7,3],[7,4]],
    koFall: [[7,15],[7,16]],
    koLying: [7, 18],
    victory: [[7,8],[7,9],[7,10],[7,11],[7,13],[7,14]],
  },
};

function resolveFlatIndex(fighterId: FighterId, rc: RC): number {
  const counts = FIGHTER_SHEET_CONFIG[fighterId].rowCounts;
  const row = Math.max(0, Math.min(counts.length - 1, rc[0]));
  let offset = 0;
  for (let r = 0; r < row; r++) {
    offset += counts[r];
  }
  const col = Math.max(0, Math.min(counts[row] - 1, rc[1]));
  return offset + col;
}

function pickActionSequence(
  seq: readonly RC[],
  actionTimer: number,
  durationSec: number
): RC {
  if (seq.length === 1) return seq[0];
  const progress = Math.max(0, Math.min(0.999, actionTimer / Math.max(0.08, durationSec)));
  return seq[Math.floor(progress * seq.length)];
}

export function selectSheetFrame(
  fighterId: FighterId,
  action: FighterAction,
  actionTimer: number,
  walkDist: number,
  vy: number,
  time: number,
  vxFacing = 0
): SheetPoseSelection {
  const map = FIGHTER_POSE_MAPS[fighterId];
  const idxOf = (rc: RC) => resolveFlatIndex(fighterId, rc);

  switch (action) {
    case 'idle': {
      // Smooth ping-pong over core idle frames at 5 FPS so stance stays steady without jump/shimmer
      const coreCount = Math.min(5, map.idle.length);
      const cycleLen = coreCount > 1 ? coreCount * 2 - 2 : 1;
      const rawStep = Math.floor(time * 5) % cycleLen;
      const pingIdx = rawStep < coreCount ? rawStep : cycleLen - rawStep;
      const rc = map.idle[pingIdx] ?? map.idle[0];
      const breathe = Math.sin(time * 3.6);
      return {
        frameIdx: idxOf(rc),
        tiltRad: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1 + breathe * 0.005,
      };
    }
    case 'walk': {
      const stepIdx = Math.floor(walkDist / 34) % map.walk.length;
      const orderedIdx =
        vxFacing < -15 ? (map.walk.length - 1 - stepIdx) % map.walk.length : stepIdx;
      const rc = map.walk[orderedIdx];
      const tilt = vxFacing < -15 ? -0.024 : 0.036;
      return {
        frameIdx: idxOf(rc),
        tiltRad: tilt,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
      };
    }
    case 'dash': {
      const rc = pickActionSequence(map.dash, actionTimer, 0.17);
      const isBackdash = vxFacing < -15;
      return {
        frameIdx: idxOf(rc),
        tiltRad: isBackdash ? -0.1 : 0.13,
        offsetY: -2,
        scaleX: 1.05,
        scaleY: 0.96,
      };
    }
    case 'crouch': {
      const rc = map.crouch[Math.min(map.crouch.length - 1, Math.floor(actionTimer * 10))];
      return { frameIdx: idxOf(rc), tiltRad: 0.02, offsetY: 0, scaleX: 1.01, scaleY: 0.99 };
    }
    case 'block': {
      const rc = map.block[Math.min(map.block.length - 1, Math.floor(actionTimer * 10))];
      return { frameIdx: idxOf(rc), tiltRad: -0.04, offsetY: 0, scaleX: 0.99, scaleY: 0.99 };
    }
    case 'jump': {
      const dynTilt = Math.max(-0.08, Math.min(0.08, vy / 1500));
      if (vy < -140) {
        const rc = map.jumpUp[Math.min(map.jumpUp.length - 1, Math.floor(actionTimer * 12))];
        return { frameIdx: idxOf(rc), tiltRad: dynTilt, offsetY: -3, scaleX: 0.97, scaleY: 1.03 };
      }
      if (vy > 160) {
        const rc = map.jumpFall[Math.min(map.jumpFall.length - 1, Math.floor(actionTimer * 10))];
        return { frameIdx: idxOf(rc), tiltRad: dynTilt, offsetY: 0, scaleX: 1.01, scaleY: 0.97 };
      }
      const rc = map.jumpApex[Math.floor(time * 7) % map.jumpApex.length];
      return { frameIdx: idxOf(rc), tiltRad: dynTilt * 0.5, offsetY: -1, scaleX: 1, scaleY: 1 };
    }
    case 'light_punch': {
      const rc = pickActionSequence(map.lightPunch, actionTimer, 0.27);
      return { frameIdx: idxOf(rc), tiltRad: 0.04, offsetY: 0, scaleX: 1.02, scaleY: 1 };
    }
    case 'heavy_punch': {
      const rc = pickActionSequence(map.heavyPunch, actionTimer, 0.42);
      return { frameIdx: idxOf(rc), tiltRad: 0.06, offsetY: 0, scaleX: 1.04, scaleY: 1 };
    }
    case 'light_kick': {
      const rc = pickActionSequence(map.lightKick, actionTimer, 0.32);
      return { frameIdx: idxOf(rc), tiltRad: -0.03, offsetY: 0, scaleX: 1.02, scaleY: 1 };
    }
    case 'heavy_kick': {
      const rc = pickActionSequence(map.heavyKick, actionTimer, 0.47);
      return { frameIdx: idxOf(rc), tiltRad: -0.05, offsetY: 0, scaleX: 1.04, scaleY: 1 };
    }
    case 'uppercut': {
      const rc = pickActionSequence(map.uppercut, actionTimer, 0.48);
      return { frameIdx: idxOf(rc), tiltRad: -0.09, offsetY: -8, scaleX: 1, scaleY: 1.05 };
    }
    case 'power_hadou': {
      const rc = pickActionSequence(map.hadou, actionTimer, 0.5);
      return { frameIdx: idxOf(rc), tiltRad: 0.05, offsetY: 0, scaleX: 1.04, scaleY: 1.01 };
    }
    case 'power_shoryu': {
      const rc = pickActionSequence(map.shoryu, actionTimer, 0.55);
      return { frameIdx: idxOf(rc), tiltRad: -0.09, offsetY: -10, scaleX: 1.02, scaleY: 1.06 };
    }
    case 'power_slam': {
      const rc = pickActionSequence(map.slam, actionTimer, 0.52);
      return { frameIdx: idxOf(rc), tiltRad: 0.1, offsetY: -2, scaleX: 1.05, scaleY: 0.97 };
    }
    case 'power_tornado': {
      const rc = map.tornado[Math.floor(actionTimer * 14) % map.tornado.length];
      const flipSwing = Math.sin(actionTimer * 18) * 0.1;
      return { frameIdx: idxOf(rc), tiltRad: flipSwing, offsetY: -4, scaleX: 1.04, scaleY: 1 };
    }
    case 'super': {
      const rc = pickActionSequence(map.super, actionTimer, 0.9);
      return { frameIdx: idxOf(rc), tiltRad: 0.05, offsetY: 0, scaleX: 1.06, scaleY: 1.03 };
    }
    case 'dizzy': {
      const rc = map.dizzy[Math.floor(time * 5) % map.dizzy.length];
      const sway = Math.sin(time * 4.5) * 0.05;
      return { frameIdx: idxOf(rc), tiltRad: -0.03 + sway, offsetY: 0, scaleX: 0.98, scaleY: 0.99 };
    }
    case 'hitstun': {
      const rc = map.hitstun[Math.min(map.hitstun.length - 1, Math.floor(actionTimer * 12))];
      return { frameIdx: idxOf(rc), tiltRad: -0.12, offsetY: -1, scaleX: 0.97, scaleY: 1.02 };
    }
    case 'ko': {
      if (actionTimer < 0.24 && map.koFall.length > 0) {
        const rc = pickActionSequence(map.koFall, actionTimer, 0.24);
        return { frameIdx: idxOf(rc), tiltRad: -0.16, offsetY: -3, scaleX: 1, scaleY: 1, isLyingKo: false };
      }
      return {
        frameIdx: idxOf(map.koLying),
        tiltRad: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        isLyingKo: true,
      };
    }
    case 'victory': {
      const rc = map.victory[Math.min(map.victory.length - 1, Math.floor(actionTimer * 6))];
      const bounce = Math.abs(Math.sin(time * 3.5)) * -3;
      return { frameIdx: idxOf(rc), tiltRad: 0, offsetY: bounce, scaleX: 1.02, scaleY: 1.02 };
    }
    default:
      return { frameIdx: idxOf(map.idle[0]), tiltRad: 0, offsetY: 0, scaleX: 1, scaleY: 1 };
  }
}
