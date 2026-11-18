// App state (screens, players, settings). Persisted per device in localStorage, wrapped so private mode / blocked storage
// never crashes. What each child has LEARNED lives separately in the learner database (data/learning.ts).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tier } from '../lib/tier';
import type { FamilyManifest } from '../lib/family';

export type Profile = {
  id: string;            // 'm1'..'m4' for family members, 'g-<time>' for guests
  kind: 'family' | 'guest';
  name?: string;         // family only (decrypted at runtime, never written to public files)
  gender: 'm' | 'f';
  age: number;           // 3..11 (11 = "10+")
  grade: number | null;  // 1..6, null = not at school yet
  avatar: string;        // guest avatar id, or family member id
};

export type Screen = 'entry' | 'guest' | 'path' | 'map' | 'passport' | 'parents' | 'perf' | 'lesson';

type State = {
  screen: Screen;
  profiles: Profile[];
  current: string | null;
  familyKey: string | null;         // derived AES key (base64), never the code
  family: FamilyManifest | null;    // decrypted at runtime only, never persisted
  numerals: 'hindi' | 'latin';
  motion: 'auto' | 'reduced';
  tierOverride: 'auto' | Tier;
  /** daily play time on this device, minutes (0 = no limit); set in the parents' corner */
  playLimit: number;
  measuredTier: Tier | null;          // result of the 2-second test on first run
  world: Record<string, string>;      // profileId -> world chosen on the map
  lesson: { world: string; skill: string } | null;   // the lesson being played (not persisted)
  celebrate: boolean;                 // a lesson just finished: the street shows its new house being built
  openLesson: (world: string, skill: string) => void;
  finishLesson: () => void;
  celebrated: () => void;
  go: (s: Screen) => void;
  setCurrent: (id: string | null) => void;
  addGuest: (p: Omit<Profile, 'id' | 'kind'>) => string;
  setFamilyKey: (k: string | null) => void;
  setFamily: (f: FamilyManifest | null) => void;
  setNumerals: (n: 'hindi' | 'latin') => void;
  setPlayLimit: (m: number) => void;
  setMotion: (m: 'auto' | 'reduced') => void;
  setTierOverride: (t: 'auto' | Tier) => void;
  setMeasuredTier: (t: Tier | null) => void;
  setWorld: (profileId: string, worldId: string) => void;
  removeGuest: (id: string) => void;
};

const safeStorage = createJSONStorage(() => {
  try { localStorage.setItem('__k', '1'); localStorage.removeItem('__k'); return localStorage; } catch {
    const mem = new Map<string, string>();
    return { getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: k => void mem.delete(k) };
  }
});


export const useApp = create<State>()(persist((set, get) => ({
  screen: 'entry',
  profiles: [],
  current: null,
  familyKey: null,
  family: null,
  numerals: 'hindi',
  motion: 'auto',
  tierOverride: 'auto',
  playLimit: 0,
  measuredTier: null,
  world: {},
  lesson: null,
  celebrate: false,
  openLesson: (world, skill) => set({ lesson: { world, skill }, screen: 'lesson' }),
  finishLesson: () => set({ lesson: null, celebrate: true, screen: 'path' }),
  celebrated: () => set({ celebrate: false }),
  go: screen => set({ screen }),
  setCurrent: current => set({ current }),
  addGuest: p => {
    const id = 'g-' + Date.now().toString(36);
    set({ profiles: [...get().profiles.filter(x => x.kind === 'guest').slice(-5), { ...p, id, kind: 'guest' }], current: id });
    return id;
  },
  setFamilyKey: familyKey => set({ familyKey }),
  setFamily: family => set({ family }),
  setNumerals: numerals => set({ numerals }),
  setPlayLimit: playLimit => set({ playLimit }),
  setMotion: motion => set({ motion }),
  setTierOverride: tierOverride => set({ tierOverride }),
  setMeasuredTier: measuredTier => set({ measuredTier }),
  setWorld: (pid, wid) => set({ world: { ...get().world, [pid]: wid } }),
  removeGuest: id => set({ profiles: get().profiles.filter(p => p.id !== id), current: get().current === id ? null : get().current }),
}), {
  name: 'khawarizmi.v2',
  storage: safeStorage,
  partialize: s => ({ profiles: s.profiles, current: s.current, familyKey: s.familyKey, numerals: s.numerals, motion: s.motion, tierOverride: s.tierOverride, playLimit: s.playLimit, measuredTier: s.measuredTier, world: s.world }),
}));

/** Current player: a family member (from the decrypted manifest) or a saved guest. */
export const useProfile = (): Profile | null => {
  const profiles = useApp(s => s.profiles), current = useApp(s => s.current), family = useApp(s => s.family);
  if (!current) return null;
  const m = family?.members.find(x => x.id === current);
  if (m) return { id: m.id, kind: 'family', name: m.name, gender: m.gender, age: m.age, grade: null, avatar: m.id };
  return profiles.find(p => p.id === current) ?? null;
};
