/**
 * src/utils/sound.js
 * Web Audio API sound engine for TrayPong.
 * Generates all sounds procedurally — no external files needed.
 * Designed for low latency and no overlapping glitches.
 */

class SoundEngine {
  constructor() {
    this._ctx = null;
    this._volume = 0.6;
    this._rallyCount = 0; // tracks current rally length for pitch scaling
    this._muted = false;
  }

  // ─── Lazy-initialize AudioContext on first user gesture ──────────────────
  _getCtx() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  }

  // ─── Core tone generator ──────────────────────────────────────────────────
  /**
   * @param {number} freq        - Base frequency in Hz
   * @param {number} duration    - Duration in seconds
   * @param {'sine'|'square'|'triangle'|'sawtooth'} type - Oscillator waveform
   * @param {number} gainPeak    - Peak gain (0–1)
   * @param {number} attackTime  - Attack in seconds
   * @param {number} decayTime   - Decay in seconds
   * @param {number} freqEnd     - Optional end frequency for glide
   */
  _playTone(freq, duration, type = 'sine', gainPeak = 0.3, attackTime = 0.002, decayTime = 0.05, freqEnd = null) {
    if (this._muted) return;
    const ctx = this._getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Oscillator
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, now + duration);
    }

    // Gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gainPeak * this._volume, now + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime);

    // Light lowpass to soften harsh harmonics
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4000;

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  // ─── Public sound methods ─────────────────────────────────────────────────

  /** Ball hits a paddle — tick sound with rally-based pitch increase */
  paddleHit(rallyCount = 0) {
    // Pitch rises subtly as rally extends (max +50%)
    const pitchMult = 1 + Math.min(rallyCount * 0.04, 0.5);
    this._playTone(220 * pitchMult, 0.08, 'square', 0.25, 0.001, 0.07);
    // Tiny harmonic layer
    this._playTone(440 * pitchMult, 0.05, 'sine', 0.12, 0.001, 0.04);
  }

  /** Ball bounces off top/bottom wall */
  wallHit() {
    this._playTone(180, 0.06, 'triangle', 0.18, 0.001, 0.05);
  }

  /** Player scores a point */
  playerScore() {
    // Happy ascending arpeggio
    this._playTone(523, 0.12, 'sine', 0.3, 0.002, 0.1);
    setTimeout(() => this._playTone(659, 0.12, 'sine', 0.28, 0.002, 0.1), 80);
    setTimeout(() => this._playTone(784, 0.2, 'sine', 0.3, 0.002, 0.18), 160);
    this._rallyCount = 0;
  }

  /** AI scores a point */
  aiScore() {
    // Descending sad tones
    this._playTone(330, 0.12, 'triangle', 0.25, 0.002, 0.1);
    setTimeout(() => this._playTone(277, 0.12, 'triangle', 0.22, 0.002, 0.1), 80);
    setTimeout(() => this._playTone(220, 0.2, 'triangle', 0.2, 0.002, 0.18), 160);
    this._rallyCount = 0;
  }

  /** Serve / ball reset */
  serve() {
    this._playTone(440, 0.1, 'sine', 0.15, 0.005, 0.09, 880);
  }

  /** Game over */
  gameOver() {
    this._playTone(440, 0.15, 'sawtooth', 0.2, 0.005, 0.1);
    setTimeout(() => this._playTone(349, 0.15, 'sawtooth', 0.18, 0.005, 0.1), 150);
    setTimeout(() => this._playTone(277, 0.4, 'sawtooth', 0.22, 0.005, 0.38), 300);
  }

  /** New high score celebration */
  newHighScore() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.15, 'sine', 0.3, 0.002, 0.13), i * 70);
    });
  }

  // ─── Volume control ───────────────────────────────────────────────────────
  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
  }

  getVolume() {
    return this._volume;
  }

  toggleMute() {
    this._muted = !this._muted;
    return this._muted;
  }

  isMuted() {
    return this._muted;
  }

  /** Call on first user interaction to unlock AudioContext */
  unlock() {
    this._getCtx();
  }
}

// Export a singleton
export const sound = new SoundEngine();
