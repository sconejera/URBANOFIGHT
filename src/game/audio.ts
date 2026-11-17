import { FighterId } from './fighters';

export type SongTrackId =
  | 'portada'
  | 'si_no_es_contigo'
  | 'puente_alto'
  | 'las_vibras_no_mienten'
  | 'seh'
  | 'q_hubo_amor'
  | 'ya_estoy_llegando';

export type BeatTrackId = 'auto' | SongTrackId;

export interface BeatTrackInfo {
  id: SongTrackId;
  label: string;
  artistCredit: string;
  src: string;
}

export const SONG_TRACKS: Record<SongTrackId, BeatTrackInfo> = {
  portada: {
    id: 'portada',
    label: 'Canción Portada · UrbanoFight CL',
    artistCredit: 'Portada Oficial',
    src: '/assets/aistudio/CANCION_PORTADA_JUEGO_1f89a027.mp3',
  },
  si_no_es_contigo: {
    id: 'si_no_es_contigo',
    label: 'Cris MJ - Si No Es Contigo',
    artistCredit: 'Cris MJ',
    src: '/assets/aistudio/Cris_MJ_-_SI_NO_ES_CONTIGO__Video_Oficial__-_Cris_MJ_e93b24bf.mp3',
  },
  puente_alto: {
    id: 'puente_alto',
    label: 'Pablo Chill-E & Fanta Rosario - Puente Alto',
    artistCredit: 'Fanta Rosario, Pablo Chill-E',
    src: '/assets/aistudio/FANTA_ROSARIO__Pablo_Chill-E_-_PUENTE_ALTO__Video_Oficial__-_FANTA_ROSARIO_e47c7088.mp3',
  },
  las_vibras_no_mienten: {
    id: 'las_vibras_no_mienten',
    label: 'Julianno Sosa ft. Bayron Fire - Las Vibras No Mienten',
    artistCredit: 'Julianno Sosa ft. Bayron Fire',
    src: '/assets/aistudio/Julianno_Sosa_Ft_BayronFire.oficial_-_LAS_VIBRAS_NO_MIENTEN_-_Julianno_Sosa_1365ff62.mp3',
  },
  seh: {
    id: 'seh',
    label: 'Loyaltty, Marcianeke & Lewis Somes - SEH',
    artistCredit: 'Loyaltty, Marcianeke, Lewis Somes',
    src: '/assets/aistudio/Loyaltty__Marcianeke_Lewis_Somes_-_SEH__Video_Oficial__-_Loyaltty_2913a2db.mp3',
  },
  q_hubo_amor: {
    id: 'q_hubo_amor',
    label: 'Jere Klein, Ovy On The Drums & Blessd - Q Hubo Amor',
    artistCredit: 'Ovy On The Drums, Jere Klein, Blessd',
    src: '/assets/aistudio/Q_Hubo_Amor__Medell_n__-_Ovy_On_The_Drums__Jere_Klein__Blessd__Official_Video__-_Ovy_On_The_Drums_291727ce.mp3',
  },
  ya_estoy_llegando: {
    id: 'ya_estoy_llegando',
    label: 'Divino ft. Bayron Fire - Ya Estoy Llegando',
    artistCredit: 'Divino ft. Bayron Fire',
    src: '/assets/aistudio/Ya_estoy_Llegando__-_Divino_Ft_Bayron_Fire_prod_by__Boy_wonder_cf_-mati_bomba__-_BAYRON_FIRE_3db553d9.mp3',
  },
};

export const BEAT_TRACKS = SONG_TRACKS;

export const BATTLE_TRACK_IDS: readonly SongTrackId[] = [
  'si_no_es_contigo',
  'puente_alto',
  'las_vibras_no_mienten',
  'seh',
  'q_hubo_amor',
  'ya_estoy_llegando',
];

export const ALL_TRACK_IDS: readonly SongTrackId[] = [
  'portada',
  ...BATTLE_TRACK_IDS,
];

export const TITLE_TRACK_ID: SongTrackId = 'portada';
export const INTRO_VIDEO_SRC = '/assets/aistudio/VIDEO_INTRO_b44ac813.mp4';

export function pickRandomBattleTrack(
  excludeId?: SongTrackId | null,
  rng: () => number = Math.random
): SongTrackId {
  const pool =
    excludeId && BATTLE_TRACK_IDS.length > 1
      ? BATTLE_TRACK_IDS.filter((id) => id !== excludeId)
      : BATTLE_TRACK_IDS;
  const idx = Math.floor(Math.max(0, Math.min(0.999999, rng())) * pool.length);
  return pool[idx] ?? BATTLE_TRACK_IDS[0];
}

export interface AudioVolumeSettings {
  master: number; // 0..1
  music: number;  // 0..1
  sfx: number;    // 0..1
}

class UrbanoAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private tapeDriveCurve: Float32Array<ArrayBuffer> | null = null;
  private muted = false;
  private activeSongId: SongTrackId = pickRandomBattleTrack();
  private lastBattleSongId: SongTrackId | null = null;
  private preferredBeat: BeatTrackId = 'auto';
  private activeMp3: HTMLAudioElement | null = null;
  private activeMp3Track: string | null = null;
  private mp3Playing = false;
  private wantsMusicPlayback = false;
  private musicListeners = new Set<() => void>();
  private duckTimeout: number | null = null;
  private isDuckingForUltra = false;
  private sfxTimestamps = new Map<string, number>();
  private sfxCompressor: DynamicsCompressorNode | null = null;
  private volumes: AudioVolumeSettings = {
    master: 1,
    music: 0.94,
    sfx: 0.68,
  };

  private notifyMusicListeners(): void {
    for (const cb of this.musicListeners) {
      try {
        cb();
      } catch {
        // ignore listener errors
      }
    }
  }

  public subscribeMusic(cb: () => void): () => void {
    this.musicListeners.add(cb);
    return () => {
      this.musicListeners.delete(cb);
    };
  }

  public getMusicGain(): number {
    return Math.max(0, Math.min(1, this.volumes.master * this.volumes.music));
  }

  public getEffectiveMusicGain(): number {
    return this.getMusicGain() * (this.isDuckingForUltra ? 0.36 : 1);
  }

  public getSfxGain(): number {
    const raw = Math.max(0, Math.min(1, this.volumes.master * this.volumes.sfx));
    const effMusic = this.getEffectiveMusicGain();
    // Keep normal SFX (hits, swings, blocks, KO) punchy yet beneath the music
    if (this.wantsMusicPlayback && effMusic > 0.05) {
      return Math.min(raw * 0.92, effMusic * 0.68);
    }
    return raw * 0.92;
  }

  public getUltraGain(): number {
    if (this.muted || this.volumes.master <= 0.001 || this.volumes.sfx <= 0.001) {
      return 0;
    }
    const musicGain = this.getMusicGain();
    const sfxFloor = Math.max(0.65, this.volumes.sfx) * this.volumes.master;
    // ONLY the 3-bar RB Ultra attack rises cleanly above the music
    return Math.min(1.45, Math.max(sfxFloor * 1.25, musicGain * 1.35));
  }

  private applyMusicVolume(): void {
    if (this.activeMp3 && !this.muted) {
      this.activeMp3.volume = Math.max(0, Math.min(1, this.getEffectiveMusicGain()));
    }
  }

  private canPlaySfx(key: string, minIntervalMs = 35): boolean {
    if (this.muted || this.getSfxGain() <= 0.001) return false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = this.sfxTimestamps.get(key) ?? 0;
    if (now - prev < minIntervalMs) return false;
    this.sfxTimestamps.set(key, now);
    return true;
  }

  public getVolumes(): AudioVolumeSettings {
    return { ...this.volumes };
  }

  public setVolumes(partial: Partial<AudioVolumeSettings>): void {
    const clamp = (v: number | undefined, fallback: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
    this.volumes = {
      master: clamp(partial.master, this.volumes.master),
      music: clamp(partial.music, this.volumes.music),
      sfx: clamp(partial.sfx, this.volumes.sfx),
    };
    this.applyMusicVolume();
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    // Warm pink/weighted foley noise for organic leather & cloth strikes
    let b0 = 0;
    let b1 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.72 * b0 + white * 0.28;
      b1 = 0.4 * b1 + b0 * 0.6;
      ch[i] = Math.max(-1, Math.min(1, (white * 0.55 + b1 * 0.65)));
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private getTapeDriveCurve(): Float32Array<ArrayBuffer> {
    if (this.tapeDriveCurve) return this.tapeDriveCurve;
    const samples = 256;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 2.4);
    }
    this.tapeDriveCurve = curve;
    return curve;
  }

  private getSfxDestination(ctx: AudioContext): AudioNode {
    if (!this.sfxCompressor || this.sfxCompressor.context !== ctx) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-14, ctx.currentTime);
      comp.knee.setValueAtTime(8, ctx.currentTime);
      comp.ratio.setValueAtTime(5, ctx.currentTime);
      comp.attack.setValueAtTime(0.003, ctx.currentTime);
      comp.release.setValueAtTime(0.1, ctx.currentTime);
      comp.connect(ctx.destination);
      this.sfxCompressor = comp;
    }
    return this.sfxCompressor;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      if (this.activeMp3) {
        this.activeMp3.pause();
      }
      this.mp3Playing = false;
      this.notifyMusicListeners();
    } else if (this.wantsMusicPlayback) {
      this.playSongById(this.activeSongId);
    } else {
      this.notifyMusicListeners();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicPlaying(): boolean {
    return this.mp3Playing && !this.muted;
  }

  public getActiveSongInfo(): BeatTrackInfo {
    return SONG_TRACKS[this.activeSongId] ?? SONG_TRACKS.portada;
  }

  public getActiveSongId(): SongTrackId {
    return this.activeSongId;
  }

  public setBeatTrack(track: BeatTrackId): void {
    this.preferredBeat = track;
    if (track === 'auto') {
      this.playRandomBattleTrack(true);
      return;
    }
    this.playSongById(track);
  }

  public getBeatTrack(): BeatTrackId {
    return this.preferredBeat;
  }

  public getResolvedBeatInfo(): BeatTrackInfo {
    return this.getActiveSongInfo();
  }

  public cycleBeatTrack(includePortada = false): SongTrackId {
    const list = includePortada ? ALL_TRACK_IDS : BATTLE_TRACK_IDS;
    const idx = list.indexOf(this.activeSongId);
    const next = list[(idx + 1) % list.length] ?? list[0];
    this.preferredBeat = next;
    this.playSongById(next);
    return next;
  }

  public playSongById(trackId: SongTrackId): void {
    this.activeSongId = trackId;
    if (trackId !== TITLE_TRACK_ID) {
      this.lastBattleSongId = trackId;
    }
    this.wantsMusicPlayback = true;
    const info = SONG_TRACKS[trackId] ?? SONG_TRACKS.portada;
    this.notifyMusicListeners();

    if (this.muted || typeof window === 'undefined') return;

    const targetVolume = Math.max(0, Math.min(1, this.getEffectiveMusicGain()));
    if (this.activeMp3Track !== info.src || !this.activeMp3) {
      if (this.activeMp3) {
        this.activeMp3.pause();
        this.activeMp3.src = '';
      }
      try {
        const audio = new Audio(info.src);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = targetVolume;
        this.activeMp3 = audio;
        this.activeMp3Track = info.src;
        this.mp3Playing = false;
        audio
          .play()
          .then(() => {
            if (this.activeMp3 === audio && !this.muted) {
              this.mp3Playing = true;
              this.notifyMusicListeners();
            }
          })
          .catch(() => {
            this.mp3Playing = false;
            this.notifyMusicListeners();
          });
      } catch {
        this.mp3Playing = false;
        this.notifyMusicListeners();
      }
    } else if (this.activeMp3.paused) {
      this.activeMp3.volume = targetVolume;
      this.activeMp3
        .play()
        .then(() => {
          if (!this.muted) {
            this.mp3Playing = true;
            this.notifyMusicListeners();
          }
        })
        .catch(() => {
          this.mp3Playing = false;
          this.notifyMusicListeners();
        });
    } else {
      this.activeMp3.volume = targetVolume;
      this.mp3Playing = true;
      this.notifyMusicListeners();
    }
  }

  public startTitleTrack(): void {
    this.preferredBeat = 'portada';
    this.playSongById(TITLE_TRACK_ID);
  }

  public startStartScreenTrack(forceNew = false): SongTrackId {
    if (
      forceNew ||
      this.activeSongId === TITLE_TRACK_ID ||
      !BATTLE_TRACK_IDS.includes(this.activeSongId)
    ) {
      const next = pickRandomBattleTrack(this.activeSongId);
      this.preferredBeat = 'auto';
      this.playSongById(next);
      return next;
    }
    this.playSongById(this.activeSongId);
    return this.activeSongId;
  }

  public playRandomBattleTrack(avoidRepeat = true): SongTrackId {
    const exclude = avoidRepeat ? (this.lastBattleSongId ?? this.activeSongId) : undefined;
    const next = pickRandomBattleTrack(exclude);
    this.preferredBeat = 'auto';
    this.playSongById(next);
    return next;
  }

  public unlock(): void {
    this.ensureContext();
    if (
      this.wantsMusicPlayback &&
      this.activeMp3 &&
      !this.muted &&
      this.activeMp3.paused
    ) {
      this.activeMp3.volume = Math.max(0, Math.min(1, this.getEffectiveMusicGain()));
      this.activeMp3
        .play()
        .then(() => {
          this.mp3Playing = true;
          this.notifyMusicListeners();
        })
        .catch(() => {});
    }
  }

  public startBeatLoop(_isBoss?: boolean): void {
    if (this.activeSongId === TITLE_TRACK_ID) {
      this.playRandomBattleTrack(true);
      return;
    }
    this.playSongById(this.activeSongId);
  }

  public stopBeatLoop(): void {
    this.wantsMusicPlayback = false;
    this.isDuckingForUltra = false;
    if (this.duckTimeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.duckTimeout);
      this.duckTimeout = null;
    }
    if (this.activeMp3) {
      this.activeMp3.pause();
    }
    this.mp3Playing = false;
    this.notifyMusicListeners();
  }

  private spawnKungFuSmack(
    ctx: AudioContext,
    startTime: number,
    centerFreq: number,
    q: number,
    gainVal: number,
    durationSec: number,
    useDrive = true
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, centerFreq * 0.52), startTime + durationSec);
    filter.Q.setValueAtTime(q, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

    if (useDrive) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.getTapeDriveCurve();
      src.connect(filter).connect(shaper).connect(gain).connect(this.getSfxDestination(ctx));
    } else {
      src.connect(filter).connect(gain).connect(this.getSfxDestination(ctx));
    }
    src.start(startTime);
    src.stop(startTime + durationSec + 0.01);
  }

  private spawnBodyThud(
    ctx: AudioContext,
    startTime: number,
    startFreq: number,
    endFreq: number,
    gainVal: number,
    durationSec: number
  ): void {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + durationSec);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, startTime);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);
    osc.connect(lp).connect(gain).connect(this.getSfxDestination(ctx));
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.015);
  }

  // Classic Shaw Brothers / Bruce Lee Kung Fu Strike Foley ONLY (no synth/laser tones)
  public playHit(heavy: boolean): void {
    if (!this.canPlaySfx(heavy ? 'hit_heavy' : 'hit_light', 32)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sfx = this.getSfxGain();
    const now = ctx.currentTime;
    const jitter = 0.9 + Math.random() * 0.2;

    if (!heavy) {
      // Crisp Kung Fu leather/flesh jab crack ("PAF!") + tight chest punch
      this.spawnKungFuSmack(ctx, now, 1950 * jitter, 1.35, 0.56 * sfx, 0.044, true);
      this.spawnKungFuSmack(ctx, now + 0.005, 860 * jitter, 1.1, 0.44 * sfx, 0.068, true);
      this.spawnBodyThud(ctx, now, 138 * jitter, 44, 0.46 * sfx, 0.08);
      return;
    }

    // Heavy Kung Fu cinema bone-crushing slap + deep chest boom + Hong Kong stage slap-echo
    this.spawnKungFuSmack(ctx, now, 2250 * jitter, 1.45, 0.7 * sfx, 0.05, true);
    this.spawnKungFuSmack(ctx, now + 0.004, 720 * jitter, 0.95, 0.64 * sfx, 0.1, true);
    this.spawnBodyThud(ctx, now, 152 * jitter, 34, 0.64 * sfx, 0.135);

    // Signature Kung Fu double-impact soundstage echo ("THWACK-ACK!")
    this.spawnKungFuSmack(ctx, now + 0.038, 1350 * jitter, 1.6, 0.36 * sfx, 0.058, true);
    this.spawnKungFuSmack(ctx, now + 0.078, 980 * jitter, 1.8, 0.2 * sfx, 0.055, false);
  }

  public playCounterHit(): void {
    if (!this.canPlaySfx('counter_hit', 60)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sfx = this.getSfxGain();
    const now = ctx.currentTime;
    this.playHit(true);
    // Extra whip-snap punch accent (pure foley, zero arcade chimes)
    this.spawnKungFuSmack(ctx, now + 0.016, 2600, 1.9, 0.44 * sfx, 0.048, true);
  }

  public playBlock(): void {
    if (!this.canPlaySfx('block', 40)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sfx = this.getSfxGain();
    const now = ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;

    // Dry Kung Fu forearm / shinbone parry ("TOK!")
    this.spawnKungFuSmack(ctx, now, 1120 * jitter, 2.8, 0.44 * sfx, 0.038, true);
    this.spawnKungFuSmack(ctx, now + 0.004, 540 * jitter, 2.1, 0.36 * sfx, 0.05, false);
    this.spawnBodyThud(ctx, now, 120 * jitter, 58, 0.26 * sfx, 0.048);
  }

  public playSwing(): void {
    if (!this.canPlaySfx('swing', 45)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sfx = this.getSfxGain();
    const now = ctx.currentTime;
    const jitter = 0.9 + Math.random() * 0.2;

    // Classic Kung Fu movie air-whip whoosh ("HWA-SHH!") — pure filtered wind, no oscillators
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650 * jitter, now);
    bp.frequency.exponentialRampToValueAtTime(480, now + 0.085);
    bp.Q.setValueAtTime(2.6, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32 * sfx, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    src.connect(bp).connect(gain).connect(this.getSfxDestination(ctx));
    src.start(now);
    src.stop(now + 0.095);
  }

  public playKO(): void {
    if (!this.canPlaySfx('ko', 250)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const sfx = this.getSfxGain();
    const now = ctx.currentTime;

    // Cinematic Kung Fu knockout body-slam & stage echo (pure foley, zero sawtooth laser sweeps)
    this.spawnKungFuSmack(ctx, now, 1850, 1.2, 0.72 * sfx, 0.068, true);
    this.spawnKungFuSmack(ctx, now + 0.006, 520, 0.85, 0.72 * sfx, 0.165, true);
    this.spawnBodyThud(ctx, now, 125, 28, 0.76 * sfx, 0.24);
    this.spawnKungFuSmack(ctx, now + 0.055, 1100, 1.5, 0.42 * sfx, 0.085, true);
    this.spawnKungFuSmack(ctx, now + 0.12, 740, 1.7, 0.24 * sfx, 0.095, false);
  }

  // Dedicated 3-bar Ultra Special Attack (RB / RT): ONLY SFX allowed above the music
  public playUltraAttack(): void {
    const ultra = this.getUltraGain();
    if (ultra <= 0.001) return;
    if (!this.canPlaySfx('ultra_attack', 180)) return;

    // Briefly duck the music so the 3-bar RB Ultra punches clearly over the track
    this.isDuckingForUltra = true;
    this.applyMusicVolume();
    if (typeof window !== 'undefined') {
      if (this.duckTimeout !== null) {
        window.clearTimeout(this.duckTimeout);
      }
      this.duckTimeout = window.setTimeout(() => {
        this.isDuckingForUltra = false;
        this.duckTimeout = null;
        this.applyMusicVolume();
      }, 720);
    }

    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Master limiter/compressor so the Ultra burst dominates cleanly without harsh clipping
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-10, now);
    comp.knee.setValueAtTime(12, now);
    comp.ratio.setValueAtTime(8, now);
    comp.attack.setValueAtTime(0.002, now);
    comp.release.setValueAtTime(0.18, now);
    comp.connect(ctx.destination);

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(ultra, now);
    bus.connect(comp);

    // 1) Air-pressure surge & explosive Kung Fu wind burst (pure noise sweep, zero synth lasers)
    const surgeSrc = ctx.createBufferSource();
    surgeSrc.buffer = this.getNoiseBuffer(ctx);
    const surgeFilter = ctx.createBiquadFilter();
    surgeFilter.type = 'bandpass';
    surgeFilter.frequency.setValueAtTime(420, now);
    surgeFilter.frequency.exponentialRampToValueAtTime(2500, now + 0.14);
    surgeFilter.frequency.exponentialRampToValueAtTime(520, now + 0.42);
    surgeFilter.Q.setValueAtTime(1.4, now);
    const surgeDrive = ctx.createWaveShaper();
    surgeDrive.curve = this.getTapeDriveCurve();
    const surgeGain = ctx.createGain();
    surgeGain.gain.setValueAtTime(0.001, now);
    surgeGain.gain.linearRampToValueAtTime(0.95, now + 0.03);
    surgeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    surgeSrc.connect(surgeFilter).connect(surgeDrive).connect(surgeGain).connect(bus);
    surgeSrc.start(now);
    surgeSrc.stop(now + 0.48);

    // 2) Deep cinema sub-bass shockwave impact
    const sub = ctx.createOscillator();
    const subLp = ctx.createBiquadFilter();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(118, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.5);
    subLp.type = 'lowpass';
    subLp.frequency.setValueAtTime(190, now);
    subGain.gain.setValueAtTime(1.0, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
    sub.connect(subLp).connect(subGain).connect(bus);
    sub.start(now);
    sub.stop(now + 0.56);

    // 3) Heavy martial-arts cinema gong / taiko resonance (warm damped partials)
    for (const [freq, level, dur] of [
      [146.83, 0.52, 0.62],
      [220.0, 0.34, 0.48],
      [293.66, 0.22, 0.36],
    ] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + dur);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(level, now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g).connect(bus);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }

    // 4) Staggered heavy Kung Fu soundstage crack echoes
    for (const [delay, freq, gainLvl, len] of [
      [0.015, 1950, 0.78, 0.07],
      [0.085, 1180, 0.48, 0.09],
      [0.165, 840, 0.3, 0.11],
    ] as const) {
      const crack = ctx.createBufferSource();
      crack.buffer = this.getNoiseBuffer(ctx);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq, now + delay);
      bp.frequency.exponentialRampToValueAtTime(freq * 0.5, now + delay + len);
      bp.Q.setValueAtTime(1.3, now + delay);
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.getTapeDriveCurve();
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now + delay);
      g.gain.linearRampToValueAtTime(gainLvl, now + delay + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + len);
      crack.connect(bp).connect(shaper).connect(g).connect(bus);
      crack.start(now + delay);
      crack.stop(now + delay + len + 0.02);
    }
  }

  // Eliminated all generated voices & arcade/space-shooter oscillator tones
  public playSongMotif(_fighterId: FighterId, _isSuper = false): void {}
  public speakComboPhrase(_phrase: string, _fighterId: FighterId): void {}
  public playFinishHim(): void {}
  public playJump(): void {}
  public playRoundBell(): void {}
  public playMenuClick(): void {}

  public cleanup(): void {
    this.isDuckingForUltra = false;
    this.stopBeatLoop();
    if (this.duckTimeout !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.duckTimeout);
      this.duckTimeout = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const audioEngine = new UrbanoAudioEngine();
