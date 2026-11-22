// Cue words -> times, from the word-timing file of the narration. Each scene's cues are searched in its own part, in
// order (so a word that is said twice resolves to the right moment). Diacritics, punctuation and hamza forms are ignored.
import type { MotionDoc } from './types';

export type Timing = { duration: number; segments: { id: string; title: string; start: number; end: number; words: { w: string; start: number; end: number }[] }[] };

export const norm = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/[^ء-ي ]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();

/** per scene: cue key -> seconds. A word that is not found falls back to the start of its part (and is reported). */
export function resolveCues(doc: MotionDoc, t: Timing, report?: (msg: string) => void) {
  return doc.scenes.map(sc => {
    const seg = t.segments[sc.part], words = seg?.words ?? [];
    const out: Record<string, number> = {}; let from = 0;
    for (const [key, word] of Object.entries(sc.cues)) {
      const w = norm(word).split(' ')[0]; let hit = -1;
      for (let j = from; j < words.length; j++) { const x = norm(words[j].w); if (x === w || x.endsWith(w) || x.includes(w)) { hit = j; break; } }
      if (hit < 0) report?.(`cue «${word}» not found in part ${sc.part + 1}`);
      out[key] = hit >= 0 ? words[hit].start : (seg?.start ?? 0);
      if (hit >= 0) from = hit;
    }
    return out;
  });
}

/** every effect with its time (the player fires them; the review video mixes them) */
export const effectTimes = (doc: MotionDoc, cues: Record<string, number>[]) =>
  doc.scenes.flatMap((sc, i) => (sc.sfx ?? []).map(([k, id, rate]) => ({ t: cues[i][k] ?? 0, id, rate: rate ?? 1 })));
export const effectIds = (doc: MotionDoc) => Array.from(new Set(doc.scenes.flatMap(s => (s.sfx ?? []).map(x => x[1]))));
