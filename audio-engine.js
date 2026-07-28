/*
 * DOT BLOCKS Procedural Audio Engine
 * SPDX-License-Identifier: CC0-1.0
 *
 * Original procedural music and earcon code created for DOT BLOCKS.
 * No sampled or third-party music files are included. You may copy, modify,
 * distribute, and use this file commercially without attribution.
 */
(function (global) {
  'use strict';

  const NOTE = 440;
  const semitone = n => NOTE * Math.pow(2, n / 12);

  /*
   * Retro preset melody source: "Korobeiniki" (Коробейники), a Russian folk song
   * first published in 1861 and long in the public domain worldwide.
   *
   * The note sequence below is the traditional folk melody. The arrangement around
   * it — voicing, bass line, percussion, panning, tempo/danger response — was
   * written from scratch for DOT BLOCKS and is released under CC0 with the rest of
   * this file. It is NOT transcribed from, and does not reproduce, any commercial
   * game soundtrack or copyrighted arrangement of this melody.
   *
   * Values are semitone offsets from A4 (semitone(0) === 440 Hz), paired with a
   * duration in sixteenth-note steps. Eight bars of 4/4 = 128 steps total.
   */
  const RETRO_MELODY = [
    [7, 4], [2, 2], [3, 2], [5, 4], [3, 2], [2, 2],
    [0, 4], [0, 2], [3, 2], [7, 4], [5, 2], [3, 2],
    [2, 6], [3, 2], [5, 4], [7, 4],
    [3, 4], [0, 4], [0, 8],
    [5, 6], [8, 2], [12, 4], [10, 2], [8, 2],
    [7, 6], [3, 2], [7, 4], [5, 2], [3, 2],
    [2, 4], [2, 2], [3, 2], [5, 4], [7, 4],
    [3, 4], [0, 4], [0, 8]
  ];
  const RETRO_LOOP_STEPS = 128;
  // One bass root per bar (E minor): Em Em Bm Em Dm Am B Em
  const RETRO_BASS = [7, 7, 2, 7, 5, 0, 2, 7];
  // Flattened step -> note-onset lookup, built once at load.
  const RETRO_STEPS = (() => {
    const map = new Array(RETRO_LOOP_STEPS).fill(null);
    let cursor = 0;
    for (const [note, dur] of RETRO_MELODY) {
      if (cursor < RETRO_LOOP_STEPS) map[cursor] = { note, dur };
      cursor += dur;
    }
    return map;
  })();

  class DotBlocksAudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.musicEnabled = true;
      this.musicStyle = 'procedural';
      this.sfxEnabled = true;
      this.musicVolume = 0.16;
      this.sfxVolume = 0.46;
      this.mode = 'drop';
      this.level = 1;
      this.danger = 0;
      this.paused = true;
      this.timer = 0;
      this.step = 0;
      this.nextStepAt = 0;
      // Two independent duck levels so a spawn/rotate/lock tick and a voice
      // announcement never fight over the same timestamp: voice ducks deep
      // (0.18x) because speech needs to read clearly over the music, while a
      // micro-duck only eases off (0.55x) for the ~0.2-0.3s of an operation
      // sound so the cue stays crisp without silencing the music underneath.
      this.voiceDuckUntil = 0;
      this.microDuckUntil = 0;
    }

    ensure() {
      if (!this.ctx) {
        const AudioContext = global.AudioContext || global.webkitAudioContext;
        if (!AudioContext) return false;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.musicBus.gain.value = this.musicVolume;
        this.sfxBus.gain.value = this.sfxVolume;
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }

    setMusicEnabled(value) {
      this.musicEnabled = !!value;
      if (!this.musicEnabled && this.musicBus && this.ctx) {
        this.musicBus.gain.cancelScheduledValues(this.ctx.currentTime);
        this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
      } else {
        this.ensure();
        this.updateMusicGain();
      }
    }

    setSfxEnabled(value) {
      this.sfxEnabled = !!value;
      if (this.sfxBus && this.ctx) {
        this.sfxBus.gain.setTargetAtTime(this.sfxEnabled ? this.sfxVolume : 0.0001, this.ctx.currentTime, 0.02);
      }
    }

    setMusicVolume(value) {
      this.musicVolume = Math.max(0, Math.min(0.4, Number(value) || 0));
      this.updateMusicGain();
    }

    setMode(mode) {
      this.mode = mode === 'puzzle' ? 'puzzle' : 'drop';
      this.step = 0;
    }

    setMusicStyle(style) {
      const next = style === 'retro' ? 'retro' : 'procedural';
      if (next === this.musicStyle) return;
      this.musicStyle = next;
      this.step = 0;
    }

    loopLength() {
      return this.musicStyle === 'retro' ? RETRO_LOOP_STEPS : 32;
    }

    setLevel(level) {
      this.level = Math.max(1, Number(level) || 1);
    }

    setDanger(level) {
      this.danger = Math.max(0, Math.min(2, Number(level) || 0));
    }

    start() {
      if (!this.ensure()) return;
      this.paused = false;
      this.nextStepAt = this.ctx.currentTime + 0.05;
      if (!this.timer) this.timer = global.setInterval(() => this.scheduler(), 55);
      this.updateMusicGain();
    }

    pause() {
      this.paused = true;
      this.updateMusicGain();
    }

    stop() {
      this.paused = true;
      this.step = 0;
      if (this.timer) global.clearInterval(this.timer);
      this.timer = 0;
      this.updateMusicGain();
    }

    duck(milliseconds = 1600) {
      if (!this.ctx || !this.musicBus) return;
      this.voiceDuckUntil = Math.max(this.voiceDuckUntil, this.ctx.currentTime + milliseconds / 1000);
      this.updateMusicGain();
      global.setTimeout(() => this.updateMusicGain(), milliseconds + 30);
    }

    // Brief, shallow duck for spawn/rotate/lock ticks: the operation sound
    // should read clearly against the music without going all the way quiet
    // the way a multi-second voice announcement does.
    microDuck(milliseconds = 260) {
      if (!this.ctx || !this.musicBus) return;
      this.microDuckUntil = Math.max(this.microDuckUntil, this.ctx.currentTime + milliseconds / 1000);
      this.updateMusicGain();
      global.setTimeout(() => this.updateMusicGain(), milliseconds + 30);
    }

    updateMusicGain() {
      if (!this.ctx || !this.musicBus) return;
      const now = this.ctx.currentTime;
      // Voice ducking wins if both are active at once: a spawn tick that lands
      // mid-announcement should not un-duck the voice early.
      const duckMul = now < this.voiceDuckUntil ? 0.18 : (now < this.microDuckUntil ? 0.55 : 1);
      const target = this.musicEnabled && !this.paused ? this.musicVolume * duckMul : 0.0001;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(Math.max(0.0001, target), now, 0.08);
    }

    tempo() {
      if (this.mode === 'puzzle') return 74;
      return Math.min(146, 86 + (this.level - 1) * 4 + this.danger * 8);
    }

    scheduler() {
      if (!this.ctx || this.paused || !this.musicEnabled) return;
      const ahead = 0.18;
      while (this.nextStepAt < this.ctx.currentTime + ahead) {
        this.scheduleMusicStep(this.step, this.nextStepAt);
        this.step = (this.step + 1) % this.loopLength();
        this.nextStepAt += 60 / this.tempo() / 4;
      }
      this.updateMusicGain();
    }

    scheduleMusicStep(step, at) {
      if (this.musicStyle === 'retro') return this.scheduleRetroStep(step, at);
      if (this.mode === 'puzzle') {
        const degrees = [0, 4, 7, 11, 7, 4, 2, 7];
        if (step % 2 === 0) this.tone(semitone(-17 + degrees[(step / 2) % degrees.length]), 0.42, at, 'sine', 0.11, this.musicBus, -0.2);
        if (step % 8 === 0) this.tone(semitone(-29 + [0, 5, 3, 7][(step / 8) % 4]), 1.0, at, 'triangle', 0.075, this.musicBus, 0.1);
      } else {
        const melody = [0, 3, 7, 10, 7, 3, 12, 10, 7, 3, 5, 8, 12, 8, 5, 3];
        if (step % 2 === 0) {
          const degree = melody[(step / 2) % melody.length];
          this.tone(semitone(-12 + degree), 0.17, at, 'square', 0.075, this.musicBus, step % 4 ? 0.28 : -0.28);
        }
        if (step % 4 === 0) {
          const bass = [0, 0, 5, 3][(step / 4) % 4];
          this.tone(semitone(-29 + bass), 0.34, at, 'triangle', 0.09, this.musicBus, 0);
        }
        if (this.danger > 0 && step % 8 === 4) {
          this.noise(0.035, at, 0.025 * this.danger, this.musicBus, 0);
        }
      }
    }

    scheduleRetroStep(step, at) {
      const stepSeconds = 60 / this.tempo() / 4;
      const calm = this.mode === 'puzzle';
      const hit = RETRO_STEPS[step];
      if (hit) {
        // Slight gap before the next note so repeated pitches stay articulated.
        const dur = Math.max(0.08, hit.dur * stepSeconds * 0.9);
        this.tone(
          semitone(hit.note), dur, at,
          calm ? 'triangle' : 'square',
          calm ? 0.055 : 0.062,
          this.musicBus,
          step % 32 < 16 ? -0.14 : 0.14
        );
      }
      if (step % 4 === 0) {
        const bar = Math.floor(step / 16) % RETRO_BASS.length;
        const beat = (step / 4) % 4;
        const root = RETRO_BASS[bar];
        // Alternate root and fifth for a walking chiptune bass.
        const degree = beat % 2 === 0 ? root : root + 7;
        this.tone(semitone(-24 + degree), stepSeconds * 3.1, at, 'triangle', calm ? 0.06 : 0.08, this.musicBus, 0);
      }
      if (!calm && step % 4 === 2) {
        this.noise(0.026, at, 0.014, this.musicBus, 0);
      }
      if (this.danger > 0 && step % 16 === 12) {
        this.noise(0.04, at, 0.02 * this.danger, this.musicBus, 0);
      }
    }

    tone(freq, duration, at, type, gain, bus, pan = 0) {
      if (!this.ctx || !bus) return;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(Math.max(40, freq), at);
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      osc.connect(amp);
      if (panner) {
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), at);
        amp.connect(panner);
        panner.connect(bus);
      } else amp.connect(bus);
      osc.start(at);
      osc.stop(at + duration + 0.03);
    }

    noise(duration, at, gain, bus, pan = 0) {
      if (!this.ctx || !bus) return;
      const frames = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      const amp = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      src.buffer = buffer;
      amp.gain.setValueAtTime(gain, at);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
      src.connect(amp);
      if (panner) {
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), at);
        amp.connect(panner);
        panner.connect(bus);
      } else amp.connect(bus);
      src.start(at);
    }

    earcon(name, options = {}) {
      if (!this.sfxEnabled || !this.ensure()) return;
      const now = this.ctx.currentTime + 0.005;
      const x = Math.max(-1, Math.min(1, Number(options.pan) || 0));
      const row = Math.max(0, Math.min(20, Number(options.row) || 0));
      const heightPitch = 720 - row * 18;
      switch (name) {
        case 'move':
          this.tone(heightPitch, 0.035, now, 'square', 0.075, this.sfxBus, x);
          break;
        case 'soft':
          this.tone(250 - row * 3, 0.035, now, 'triangle', 0.055, this.sfxBus, x);
          break;
        case 'rotate':
          this.tone(470, 0.055, now, 'triangle', 0.09, this.sfxBus, x);
          this.tone(610, 0.065, now + 0.045, 'triangle', 0.07, this.sfxBus, x);
          break;
        case 'blocked':
          this.tone(125, 0.11, now, 'square', 0.105, this.sfxBus, x);
          break;
        case 'ground':
          this.tone(180, 0.075, now, 'sine', 0.08, this.sfxBus, x);
          break;
        case 'lock':
          this.tone(132, 0.08, now, 'triangle', 0.13, this.sfxBus, x);
          this.noise(0.045, now, 0.04, this.sfxBus, x);
          break;
        case 'hard':
          this.tone(250, 0.05, now, 'square', 0.11, this.sfxBus, x);
          this.tone(105, 0.13, now + 0.045, 'triangle', 0.15, this.sfxBus, x);
          break;
        case 'hold':
          this.tone(620, 0.08, now, 'sine', 0.09, this.sfxBus, -0.35);
          this.tone(420, 0.1, now + 0.06, 'sine', 0.085, this.sfxBus, 0.35);
          break;
        case 'place':
          this.tone(360, 0.065, now, 'square', 0.09, this.sfxBus, x);
          this.tone(470, 0.08, now + 0.05, 'triangle', 0.08, this.sfxBus, x);
          break;
        case 'clear': {
          const count = Math.max(1, Math.min(4, Number(options.count) || 1));
          for (let i = 0; i < count + 2; i++) this.tone(440 * Math.pow(2, i / 7), 0.105, now + i * 0.075, 'triangle', 0.105, this.sfxBus, -0.75 + i * 0.3);
          break;
        }
        /* Per-piece audio icons. Sine only, 480–900Hz: `move`/`hard`/`blocked`
           are square, `rotate`/`soft`/`lock`/`clear` are triangle, and the only
           other sine cues sit far below (ground 180, danger 92), so these read
           as their own family. Kept to 0.25–0.33s so they finish well before
           the next input even at challenge speed. */
        case 'piece': {
          const p = String(options.piece || 'I').toUpperCase();
          const g = 0.085, w = 'sine', B = this.sfxBus;
          if (p === 'I') this.tone(660, 0.3, now, w, g, B, x);
          else if (p === 'O') { this.tone(740, 0.08, now, w, g, B, x); this.tone(740, 0.08, now + 0.13, w, g, B, x) }
          else if (p === 'T') { this.tone(600, 0.075, now, w, g, B, x); this.tone(840, 0.085, now + 0.095, w, g, B, x); this.tone(600, 0.075, now + 0.2, w, g, B, x) }
          else if (p === 'L') { this.tone(540, 0.1, now, w, g, B, x); this.tone(830, 0.14, now + 0.11, w, g, B, x) }
          else if (p === 'J') { this.tone(830, 0.1, now, w, g, B, x); this.tone(540, 0.14, now + 0.11, w, g, B, x) }
          else if (p === 'S') { this.tone(700, 0.1, now, w, g, B, -0.6); this.tone(620, 0.13, now + 0.12, w, g, B, 0.6) }
          else if (p === 'Z') { this.tone(700, 0.1, now, w, g, B, 0.6); this.tone(620, 0.13, now + 0.12, w, g, B, -0.6) }
          break;
        }
        case 'danger':
          this.tone(92, 0.12, now, 'sine', 0.15, this.sfxBus, 0);
          this.tone(92, 0.12, now + 0.2, 'sine', 0.12, this.sfxBus, 0);
          break;
        case 'start':
          [0, 4, 7, 12].forEach((n, i) => this.tone(semitone(-5 + n), 0.15, now + i * 0.08, 'triangle', 0.09, this.sfxBus, -0.5 + i / 3));
          break;
        case 'gameover':
          [0, -3, -7, -12].forEach((n, i) => this.tone(semitone(-8 + n), 0.22, now + i * 0.14, 'sawtooth', 0.07, this.sfxBus, 0));
          break;
        default:
          this.tone(440, 0.06, now, 'sine', 0.08, this.sfxBus, x);
      }
    }
  }

  global.DotBlocksAudioEngine = DotBlocksAudioEngine;
})(window);
