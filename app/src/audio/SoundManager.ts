// One sound system for the whole app (guest and family mode, all worlds). Everything is synthesized with Web Audio:
// no sound files to download, so it works offline and weighs nothing. Settings live on this device only.
//   Sound.play('tap' | 'fog' | 'build' | 'star' | 'celebrate' | 'open' | 'close')
//   Sound.onSirajCelebrate(kind)   - the celebration hook; recorded voice lines (e.g. ElevenLabs) plug in with registerVoice
//   Sound.ambient(world | null)     - a quiet soundscape for the world on screen (wind, water, birds)
import { useSyncExternalStore } from 'react';

export type SoundEvent = 'tap' | 'pop' | 'fog' | 'build' | 'star' | 'celebrate' | 'open' | 'close';
export type VoiceEvent = 'station' | 'world' | 'welcome' | 'star';
export type SoundSettings = { effects: boolean; ambient: boolean; voice: boolean; volume: number };
const KEY = 'khawarizmi.sound';
const DEFAULTS: SoundSettings = { effects: true, ambient: true, voice: true, volume: 0.7 };

/** what each world sounds like (open-sky worlds have birds) */
const AMBIENT: Record<string, { wind: number; water: number; birds: boolean }> = {
  kassala: { wind: 0.5, water: 0.15, birds: true }, saqiya: { wind: 0.35, water: 0.5, birds: false }, mogran: { wind: 0.3, water: 0.7, birds: false },
  suakin: { wind: 0.6, water: 0.8, birds: true }, meroe: { wind: 0.8, water: 0, birds: false }, marra: { wind: 0.55, water: 0.35, birds: true },
};

function load(): SoundSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}

class SoundManager {
  settings = load();
  private ctx: AudioContext | null = null;
  private fx: GainNode | null = null;
  private amb: GainNode | null = null;
  private ambNodes: AudioNode[] = [];
  private ambWorld: string | null = null;
  private birdTimer = 0;
  private listeners = new Set<() => void>();
  private voices: Partial<Record<VoiceEvent, string[]>> = {};
  private noise: AudioBuffer | null = null;

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  get = () => this.settings;
  set(p: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...p };
    try { localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch { /* private mode: keep in memory */ }
    this.applyGains();
    if (p.ambient !== undefined) this.ambient(p.ambient ? this.ambWorld : null, true);
    this.listeners.forEach(f => f());
  }
  /** Browsers start audio only after a user gesture. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.fx = this.ctx.createGain(); this.fx.connect(this.ctx.destination);
    this.amb = this.ctx.createGain(); this.amb.connect(this.ctx.destination);
    this.applyGains();
    if (this.ambWorld) this.ambient(this.ambWorld, true);
  }
  private applyGains() {
    if (!this.fx || !this.amb || !this.ctx) return;
    const t = this.ctx.currentTime, v = this.settings.volume;
    this.fx.gain.setTargetAtTime(this.settings.effects ? v * 0.5 : 0, t, 0.05);
    this.amb.gain.setTargetAtTime(this.settings.ambient ? v * 0.07 : 0, t, 0.3);
  }
  private tone(f0: number, f1: number, dur: number, type: OscillatorType = 'sine', at = 0, gain = 0.6) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.fx!); o.start(t); o.stop(t + dur + 0.02);
  }
  private noiseBuf() {
    if (this.noise) return this.noise;
    const c = this.ctx!, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this.noise = b);
  }
  private whoosh(dur: number, from: number, to: number, gain = 0.5, dest?: AudioNode) {
    const c = this.ctx!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
    s.buffer = this.noiseBuf(); f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest ?? this.fx!); s.start(t); s.stop(t + dur);
  }
  play(e: SoundEvent) {
    if (!this.ctx || !this.settings.effects) return;
    switch (e) {
      case 'tap': this.tone(720, 560, 0.06, 'sine', 0, 0.25); break;
      case 'pop': this.tone(520, 250, 0.08, 'sine', 0, 0.2); this.tone(1050, 760, 0.035, 'triangle', 0, 0.06); break;   // a soft bubble pop
      case 'open': this.tone(440, 660, 0.12, 'sine', 0, 0.25); break;
      case 'close': this.tone(620, 420, 0.1, 'sine', 0, 0.2); break;
      case 'fog': this.whoosh(1.1, 300, 2400, 0.35); break;
      case 'build': this.tone(260, 880, 0.18, 'triangle', 0, 0.5); this.tone(1320, 1320, 0.08, 'sine', 0.16, 0.25); break;
      case 'star': [880, 1175, 1568].forEach((f, i) => this.tone(f, f, 0.22, 'triangle', i * 0.09, 0.32)); break;
      case 'celebrate': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f * 1.01, 0.28, 'triangle', i * 0.1, 0.34)); break;
    }
  }
  /** Siraj celebrates: a jingle now; a recorded voice line when one is registered for this moment. */
  onSirajCelebrate(kind: VoiceEvent = 'station') {
    this.play('celebrate');
    const urls = this.voices[kind];
    if (urls?.length && this.settings.voice) {
      const a = new Audio(urls[Math.floor(Math.random() * urls.length)]); a.volume = this.settings.volume; void a.play().catch(() => {});
    }
  }
  registerVoice(kind: VoiceEvent, urls: string[]) { this.voices[kind] = urls; }

  /** a quiet soundscape for the world on screen; null stops it */
  ambient(world: string | null, force = false) {
    if (!force && world === this.ambWorld) return;
    this.ambWorld = world;
    this.ambNodes.forEach(n => { try { (n as AudioScheduledSourceNode).stop?.(); } catch { /* already stopped */ } n.disconnect(); });
    this.ambNodes = []; clearInterval(this.birdTimer);
    if (!this.ctx || !world || !this.settings.ambient) return;
    const a = AMBIENT[world] ?? AMBIENT.kassala, c = this.ctx;
    const layer = (freq: number, q: number, level: number, wobble: number) => {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      s.buffer = this.noiseBuf(); s.loop = true; f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = level;
      lfo.frequency.value = wobble; lg.gain.value = level * 0.6; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(this.amb!); s.start(); lfo.start();
      this.ambNodes.push(s, f, g, lfo, lg);
    };
    if (a.wind) layer(420, 0.7, a.wind, 0.11);
    if (a.water) layer(1200, 0.4, a.water * 0.7, 0.35);
    if (a.birds) this.birdTimer = window.setInterval(() => {
      if (!this.ctx || Math.random() < 0.5) return;
      const f = 2400 + Math.random() * 1600;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.13;
        o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.3, t + 0.08);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        o.connect(g); g.connect(this.amb!); o.start(t); o.stop(t + 0.12);
      }
    }, 2600);
  }
}

export const Sound = new SoundManager();
export const useSoundSettings = () => useSyncExternalStore(Sound.subscribe, Sound.get);

/** Audio starts on the first touch; every button gives a soft tap. */
export function installSound() {
  const first = () => Sound.unlock();
  addEventListener('pointerdown', first, { capture: true });
  addEventListener('keydown', first, { capture: true });
  addEventListener('click', e => { if ((e.target as HTMLElement)?.closest?.('button, [role=button], a')) Sound.play('tap'); }, { capture: true });
}
