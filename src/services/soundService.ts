/**
 * DyslexiMate Sound Lab Interface Audio Service
 * Reference: React Bits Sound Lab (https://reactbits.dev/tools/sound-lab)
 *
 * Provides high-fidelity, organic, and gentle micro-sound effects designed specifically
 * for children with dyslexia and neurodivergent learners:
 * - Pebble / Plush: Soft, rounded button presses
 * - Pluck / Petal: Melodic card clicks
 * - Unfold: Warm modal opening swell
 * - Fold: Soft modal closing settle
 * - Glide / Swish: Silky page transition sweeps
 * - Bloom: Uplifting, encouraging correct answer chime
 * - Confetti: Festive sparkling activity completion fanfare
 * - Treasure: Warm discovery milestone chime
 * - Pulse: Subtle bubble progress updates
 * - Spring: Bouncy elastic toggle interactions
 *
 * Technical design:
 * - Procedurally synthesized via Web Audio API using exact Sound Lab physical parameters
 * - AudioBuffers pre-rendered at startup for sub-millisecond, zero-latency playback
 * - Master ON/OFF and volume controls persisted in localStorage
 * - Concurrency control & rate-limiting to prevent overlapping or auditory fatigue
 * - Strict guard against interfering with active SpeechSynthesis/TTS narration
 * - Auto-unlock on first user interaction (pointerdown / keydown)
 * - Zero external hotlinks or network dependencies
 */

import { speechService } from './speechService';

export type SoundEffectName =
  | 'pebble'
  | 'plush'
  | 'pluck'
  | 'petal'
  | 'unfold'
  | 'fold'
  | 'glide'
  | 'swish'
  | 'bloom'
  | 'confetti'
  | 'treasure'
  | 'pulse'
  | 'spring';

export class SoundService {
  private static instance: SoundService;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isUnlocked: boolean = false;
  private enabled: boolean = true;
  private volume: number = 0.55; // Comfortable, gentle default volume
  private soundBuffers: Map<SoundEffectName, AudioBuffer> = new Map();
  private lastPlayedTime: Map<SoundEffectName, number> = new Map();
  private activeVoicesCount: number = 0;
  private readonly MAX_CONCURRENT_VOICES = 3;

  private constructor() {
    this.loadSettings();
    this.setupUnlockListeners();
  }

  public static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  private loadSettings(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const storedEnabled = localStorage.getItem('dysleximate_sound_enabled');
      if (storedEnabled !== null) {
        this.enabled = storedEnabled === 'true';
      }
      const storedVol = localStorage.getItem('dysleximate_sound_volume');
      if (storedVol !== null) {
        const parsed = parseFloat(storedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('dysleximate_sound_enabled', String(this.enabled));
      localStorage.setItem('dysleximate_sound_volume', String(this.volume));
    } catch {
      // Ignore
    }
  }

  /**
   * Automatically unlocks the AudioContext on first user gesture.
   */
  private setupUnlockListeners(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  public unlockAudio(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (this.isUnlocked && this.audioCtx && this.audioCtx.state === 'running') return;

    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
        this.precomputeAllBuffers();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.isUnlocked = true;
    } catch (e) {
      console.warn('[SoundService] AudioContext unlock error:', e);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveSettings();
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    this.saveSettings();
    if (this.enabled) {
      this.play('spring');
    }
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
    this.saveSettings();
  }

  /**
   * Precomputes offline AudioBuffers for all Sound Lab sound profiles.
   */
  private precomputeAllBuffers(): void {
    if (!this.audioCtx) return;

    const names: SoundEffectName[] = [
      'pebble',
      'plush',
      'pluck',
      'petal',
      'unfold',
      'fold',
      'glide',
      'swish',
      'bloom',
      'confetti',
      'treasure',
      'pulse',
      'spring',
    ];

    for (const name of names) {
      try {
        const buffer = this.synthesizeBuffer(name, this.audioCtx);
        if (buffer) {
          this.soundBuffers.set(name, buffer);
        }
      } catch (err) {
        console.warn(`[SoundService] Failed to precompute buffer for ${name}:`, err);
      }
    }
  }

  /**
   * Synthesizes mathematical waveform buffers matching React Bits Sound Lab parameters.
   */
  private synthesizeBuffer(name: SoundEffectName, ctx: BaseAudioContext): AudioBuffer | null {
    const sampleRate = ctx.sampleRate || 44100;

    switch (name) {
      case 'pebble':
      case 'plush': {
        // Soft organic tap/pop: 420 Hz -> 180 Hz with steep exponential decay (50ms)
        const duration = 0.06;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const freq = 420 * Math.exp(-t * 30) + 160;
          const envelope = Math.exp(-t * 60) * (1 - Math.exp(-t * 500));
          data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.7;
        }
        return buffer;
      }

      case 'pluck':
      case 'petal': {
        // Delicate harmonic card pluck: D5 (587 Hz) with soft 2nd harmonic (1174 Hz)
        const duration = 0.11;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 26);
          const f1 = Math.sin(2 * Math.PI * 587.33 * t);
          const f2 = Math.sin(2 * Math.PI * 1174.66 * t) * 0.22;
          data[i] = (f1 + f2) * env * 0.65;
        }
        return buffer;
      }

      case 'unfold': {
        // Warm upward modal opening swell: 240 Hz -> 560 Hz (150ms)
        const duration = 0.16;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const freq = 240 + 320 * Math.sin((progress * Math.PI) / 2);
          const attack = Math.min(1, t / 0.025);
          const release = Math.cos((progress * Math.PI) / 2);
          const env = attack * release;
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
        }
        return buffer;
      }

      case 'fold': {
        // Soft downward modal closing settle: 480 Hz -> 220 Hz (110ms)
        const duration = 0.12;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const freq = 480 - 260 * progress;
          const env = Math.exp(-t * 22) * Math.min(1, t / 0.01);
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.55;
        }
        return buffer;
      }

      case 'glide':
      case 'swish': {
        // Smooth airy breeze page transition: filtered noise sweep + soft warm tone (140ms)
        const duration = 0.14;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const env = Math.sin(progress * Math.PI);
          const tone = Math.sin(2 * Math.PI * (340 + 120 * progress) * t) * 0.45;
          const noise = (Math.random() * 2 - 1) * 0.18;
          data[i] = (tone + noise) * env * 0.5;
        }
        return buffer;
      }

      case 'bloom': {
        // Uplifting cheerful arpeggio chime: C5 (523 Hz) -> E5 (659 Hz) -> G5 (784 Hz)
        const duration = 0.32;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        const notes = [
          { freq: 523.25, start: 0.0, end: 0.22 },
          { freq: 659.25, start: 0.06, end: 0.28 },
          { freq: 783.99, start: 0.12, end: 0.32 },
        ];
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let sample = 0;
          for (const note of notes) {
            if (t >= note.start && t < note.end) {
              const noteT = t - note.start;
              const env = Math.exp(-noteT * 14) * Math.min(1, noteT / 0.008);
              sample += Math.sin(2 * Math.PI * note.freq * noteT) * env * 0.38;
            }
          }
          data[i] = sample;
        }
        return buffer;
      }

      case 'confetti': {
        // Festive sparkling activity completion cascade: 4-note ascending sparkle (F5, A5, C6, E6)
        const duration = 0.48;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        const notes = [
          { freq: 698.46, start: 0.0 },   // F5
          { freq: 880.0, start: 0.08 },   // A5
          { freq: 1046.5, start: 0.16 },  // C6
          { freq: 1318.5, start: 0.24 },  // E6
        ];
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          let sample = 0;
          for (const note of notes) {
            if (t >= note.start) {
              const noteT = t - note.start;
              const env = Math.exp(-noteT * 12) * Math.min(1, noteT / 0.005);
              sample += Math.sin(2 * Math.PI * note.freq * noteT) * env * 0.28;
            }
          }
          data[i] = sample;
        }
        return buffer;
      }

      case 'treasure': {
        // Rich discovery fanfare chime: G4 (392 Hz), D5 (587 Hz), G5 (784 Hz), C6 (1046 Hz)
        const duration = 0.55;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const env = Math.exp(-t * 7) * Math.min(1, t / 0.015);
          const f1 = Math.sin(2 * Math.PI * 392.0 * t) * 0.3;
          const f2 = Math.sin(2 * Math.PI * 587.33 * t) * 0.25;
          const f3 = Math.sin(2 * Math.PI * 783.99 * t) * 0.35;
          const f4 = Math.sin(2 * Math.PI * 1046.5 * t) * 0.15;
          data[i] = (f1 + f2 + f3 + f4) * env * 0.6;
        }
        return buffer;
      }

      case 'pulse': {
        // Soft bubble drop / progress update: 360 Hz -> 540 Hz (90ms)
        const duration = 0.09;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const freq = 360 + 180 * (t / duration);
          const env = Math.exp(-t * 35) * Math.min(1, t / 0.005);
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.65;
        }
        return buffer;
      }

      case 'spring': {
        // Bouncy elastic toggle interaction: 300 Hz -> 450 Hz -> 360 Hz (85ms)
        const duration = 0.09;
        const length = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const freq = 300 + 150 * Math.sin(progress * Math.PI * 1.5);
          const env = Math.exp(-t * 28) * Math.min(1, t / 0.005);
          data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.6;
        }
        return buffer;
      }
    }
  }

  /**
   * Primary interface sound player.
   * Checks master sound switch, user mute preferences, and ensures speech narration is never interrupted.
   */
  public play(name: SoundEffectName, childSoundPref: boolean = true): void {
    if (!this.enabled || !childSoundPref) return;

    // Strict requirement: Never let sound effects interfere with active TTS narration
    if (speechService.isSpeaking()) return;

    // Rate limiting: avoid stuttering or duplicate triggers within 40ms
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const lastTime = this.lastPlayedTime.get(name) || 0;
    if (now - lastTime < 45) return;
    this.lastPlayedTime.set(name, now);

    // Concurrency limit to prevent auditory clutter
    if (this.activeVoicesCount >= this.MAX_CONCURRENT_VOICES) return;

    if (!this.isUnlocked || !this.audioCtx) {
      this.unlockAudio();
    }

    if (!this.audioCtx || !this.masterGain) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    let buffer = this.soundBuffers.get(name);
    if (!buffer) {
      buffer = this.synthesizeBuffer(name, this.audioCtx) || undefined;
      if (buffer) this.soundBuffers.set(name, buffer);
    }

    if (!buffer) return;

    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);

      this.activeVoicesCount++;
      source.onended = () => {
        this.activeVoicesCount = Math.max(0, this.activeVoicesCount - 1);
      };

      source.start();
    } catch (e) {
      console.warn(`[SoundService] Playback error for ${name}:`, e);
      this.activeVoicesCount = Math.max(0, this.activeVoicesCount - 1);
    }
  }

  // Convenient semantic aliases matching React Bits Sound Lab mapping:
  public buttonClick(childPref: boolean = true): void {
    this.play('pebble', childPref);
  }

  public cardSelect(childPref: boolean = true): void {
    this.play('pluck', childPref);
  }

  public modalOpen(childPref: boolean = true): void {
    this.play('unfold', childPref);
  }

  public modalClose(childPref: boolean = true): void {
    this.play('fold', childPref);
  }

  public pageTransition(childPref: boolean = true): void {
    this.play('glide', childPref);
  }

  public correctAnswer(childPref: boolean = true): void {
    this.play('bloom', childPref);
  }

  public activityComplete(childPref: boolean = true): void {
    this.play('confetti', childPref);
  }

  public achievement(childPref: boolean = true): void {
    this.play('treasure', childPref);
  }

  public progressUpdate(childPref: boolean = true): void {
    this.play('pulse', childPref);
  }

  public toggleSwitch(childPref: boolean = true): void {
    this.play('spring', childPref);
  }
}

export const soundService = SoundService.getInstance();
