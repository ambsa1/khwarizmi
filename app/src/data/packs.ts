// 3D worlds on the device. Each world's files are listed in public/worlds/index.json (built by tools/content-packs.mjs).
// A world is downloaded once, with progress, into the 'worlds' cache; the service worker then serves it from there, so it
// works with no internet. Parents can delete a finished world to free space and download it again later.
// Also: the app's own update (a new version waits until the app is next opened; parents can apply it now) and storage use.
import { create } from 'zustand';

const BASE = import.meta.env.BASE_URL;
const CACHE = 'worlds';
type Index = Record<string, { files: { path: string; bytes: number }[]; bytes: number }>;
export type WorldState = { state: 'unknown' | 'missing' | 'downloading' | 'ready' | 'error'; got: number; bytes: number };

let indexP: Promise<Index> | null = null;
const index = (): Promise<Index> => (indexP ??= fetch(`${BASE}worlds/index.json`).then(r => r.json() as Promise<Index>).catch((): Index => { indexP = null; return {}; }));
const url = (path: string) => new URL(`${BASE}${path}`, location.href).href;
const hasCaches = () => typeof caches !== 'undefined';

type PacksState = {
  worlds: Record<string, WorldState>;
  update: (() => void) | null;                         // set when a new version is waiting
  storage: { used: number; quota: number } | null;
  check: (id: string) => Promise<WorldState['state']>;
  download: (id: string) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  refreshStorage: () => Promise<void>;
};

export const usePacks = create<PacksState>()((set, get) => ({
  worlds: {}, update: null, storage: null,
  check: async id => {
    const w = (await index())[id];
    if (!w) return 'ready';                               // worlds without 3D files (dioramas) need nothing
    if (!hasCaches()) return 'ready';                     // no cache API: the browser's own cache must do
    const cache = await caches.open(CACHE);
    const have = await Promise.all(w.files.map(f => cache.match(url(f.path))));
    const state = have.every(Boolean) ? 'ready' : 'missing';
    set({ worlds: { ...get().worlds, [id]: { state, got: state === 'ready' ? w.bytes : 0, bytes: w.bytes } } });
    return state;
  },
  download: async id => {
    const w = (await index())[id];
    if (!w || !hasCaches()) return true;
    const cur = get().worlds[id];
    if (cur?.state === 'downloading') return false;
    const put = (s: Partial<WorldState>) => set({ worlds: { ...get().worlds, [id]: { ...(get().worlds[id] ?? { state: 'downloading', got: 0, bytes: w.bytes }), ...s } } });
    put({ state: 'downloading', got: 0, bytes: w.bytes });
    try {
      const cache = await caches.open(CACHE);
      let got = 0;
      for (const f of w.files) {
        const u = url(f.path);
        if (await cache.match(u)) { got += f.bytes; put({ got }); continue; }
        const res = await fetch(u, { cache: 'no-store' });
        if (!res.ok || !res.body) throw new Error(`${f.path}: ${res.status}`);
        const reader = res.body.getReader(); const chunks: Uint8Array[] = [];
        for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; put({ got }); }
        await cache.put(u, new Response(new Blob(chunks), { headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream' } }));
      }
      put({ state: 'ready', got: w.bytes });
      void get().refreshStorage();
      return true;
    } catch {
      put({ state: 'error' });
      void get().refreshStorage();
      return false;
    }
  },
  remove: async id => {
    const w = (await index())[id]; if (!w || !hasCaches()) return;
    const cache = await caches.open(CACHE);
    await Promise.all(w.files.map(f => cache.delete(url(f.path))));
    set({ worlds: { ...get().worlds, [id]: { state: 'missing', got: 0, bytes: w.bytes } } });
    void get().refreshStorage();
  },
  refreshStorage: async () => {
    try { const e = await navigator.storage?.estimate?.(); if (e?.quota) set({ storage: { used: e.usage ?? 0, quota: e.quota } }); } catch { /* not supported */ }
  },
}));

export const worldBytes = async (id: string) => (await index())[id]?.bytes ?? 0;
/** Little free space left (under 60 MB or 92% used): parents are told before a download fails. */
export const lowSpace = (s: PacksState['storage']) => !!s && (s.quota - s.used < 60 * 1048576 || s.used / s.quota > 0.92);
export const mb = (b: number) => (b / 1048576).toFixed(b < 10 * 1048576 ? 1 : 0);

/** Registers the service worker. A new version never interrupts a child: it waits, and the parents' corner offers it. */
export async function registerApp() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const { registerSW } = await import('virtual:pwa-register');
  const updateSW = registerSW({ onNeedRefresh: () => usePacks.setState({ update: () => void updateSW(true) }) });
}
