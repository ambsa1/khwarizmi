// The one player for the sound-effect bank (public/sfx/index.json, built by tools/sfx/select.py).
//   Sfx.play('correct')          random close variant, never the same one twice in a row
//   Sfx.play('station-ding', { rate: 1.12, at: 0 })
//   Sfx.duck(true)               the narrator is talking: effects drop to ~30%
// A missing file or a blocked audio context is silent and never stops the app. Effects have their own mute switch
// (separate from the narration), kept on this device.
import { useSyncExternalStore } from 'react';

type Entry = { id: string; kind: string; files: string[] };
const KEY = 'khawarizmi.sfx';
let muted = (() => { try { return localStorage.getItem(KEY) === 'off'; } catch { return false; } })();
const listeners = new Set<() => void>();

class Bank {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private index = new Map<string, Entry>();
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private last = new Map<string, number>();
  private loading: Promise<void> | null = null;

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.out = this.ctx.createGain(); this.duckGain = this.ctx.createGain();
      this.duckGain.connect(this.out); this.out.connect(this.ctx.destination);
      this.out.gain.value = muted ? 0 : 0.9;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }
  load() {
    if (!this.loading) this.loading = fetch(new URL('sfx/index.json', document.baseURI).href).then(r => r.json())
      .then((d: { effects: Entry[] }) => { d.effects.forEach(e => this.index.set(e.id, e)); }).catch(() => {});
    return this.loading;
  }
  private buffer(file: string) {
    if (!this.buffers.has(file)) {
      const ctx = this.ensure();
      this.buffers.set(file, !ctx ? Promise.resolve(null) : fetch(new URL('sfx/' + file, document.baseURI).href)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then(b => new Promise<AudioBuffer>((res, rej) => ctx.decodeAudioData(b, res, rej))).catch(() => null));
    }
    return this.buffers.get(file)!;
  }
  /** fetch and decode a set of effects ahead of time (a screen calls this when it opens) */
  async preload(ids: string[]) {
    await this.load();
    ids.forEach(id => this.index.get(id)?.files.forEach(f => void this.buffer(f)));
  }
  async play(id: string, o: { rate?: number; gain?: number } = {}) {
    if (muted) return;
    const ctx = this.ensure(); if (!ctx) return;
    await this.load();
    const e = this.index.get(id); if (!e?.files.length) return;
    let k = Math.floor(Math.random() * e.files.length);
    if (e.files.length > 1 && k === this.last.get(id)) k = (k + 1) % e.files.length;
    this.last.set(id, k);
    const buf = await this.buffer(e.files[k]); if (!buf || !this.duckGain) return;
    const src = ctx.createBufferSource(), gn = ctx.createGain();
    src.buffer = buf; src.playbackRate.value = o.rate ?? 1; gn.gain.value = o.gain ?? 1;
    src.connect(gn); gn.connect(this.duckGain); src.start();
  }
  duck(on: boolean) {
    if (!this.duckGain || !this.ctx) { this.ensure(); }
    if (this.duckGain && this.ctx) this.duckGain.gain.setTargetAtTime(on ? 0.3 : 1, this.ctx.currentTime, 0.08);
  }
  setMuted(v: boolean) {
    muted = v; try { localStorage.setItem(KEY, v ? 'off' : 'on'); } catch { /* private mode */ }
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(v ? 0 : 0.9, this.ctx.currentTime, 0.03);
    listeners.forEach(f => f());
  }
  private loaded = false;
  ready() { return this.loaded; }
  unlock() { this.ensure(); void this.load().then(() => { this.loaded = this.index.size > 0; }); }
}

export const Sfx = new Bank();
export const useSfxMuted = () => useSyncExternalStore(f => { listeners.add(f); return () => listeners.delete(f); }, () => muted);
