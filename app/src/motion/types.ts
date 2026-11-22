// The data format of the motion engine. Every explainer of every book is ONE light JSON file of this shape
// (public/school-data/<book>/<explain>.motion.json); the engine and its layer library never change per book.
// Positions are % of the stage (x from the left, y from the top); sizes are stage units (1 = 1% of the stage width on a
// 16:9 stage, scaled to fit any aspect). A "cue" is a key of the scene's `cues` map; it becomes a time from the
// word-timing file (the moment that word is spoken).

/** a target for framer-motion (plain JSON: numbers, strings, keyframe arrays) */
export type Target = Record<string, number | string | (number | string)[]>;
export type Anim = 'pop' | 'grow' | 'drop' | 'left' | 'right' | 'fade' | 'rise';
export type Loop = 'float' | 'spin' | 'pulse' | 'flap' | 'bob' | 'wobble';

/** a picture on the stage. art: a drawing name in art/school (no extension), or @cover (the book cover), @logo */
export type Item = {
  art?: string; text?: string;
  x: number; y: number; s: number;
  cue?: string;                     // shown from this cue (always shown when absent)
  hide?: string;                    // hidden again from this cue
  a?: Anim; delay?: number; origin?: string; z?: number; chip?: boolean;
  to?: Target;                      // extra target once shown (e.g. a tilt, a glow, keyframes)
  loop?: Loop;
  at?: { cue: string; x?: number; y?: number; s?: number }[];   // later positions/sizes, each from its cue (in order)
  fly?: { cue: string; x: number[]; y?: number[]; dur: number }; // a flight across the stage (x/y keyframes in %)
};

/** the general layers of the library (each is optional; a scene uses what it needs) */
export type Layer =
  | { kind: 'ground'; river?: boolean; night?: boolean }
  | { kind: 'stars'; points?: [number, number][] }
  | { kind: 'road'; cue: string; points: [number, number][]; lit?: (string | null)[]; labels?: string[]; last?: 'exam' }
  | { kind: 'ring'; cue: string; x: number; y: number; size: number; color?: string }
  | { kind: 'aura'; cue: string; x: number; y: number; size: number; color?: string }
  | { kind: 'term'; cue: string; text: string; y?: number }
  | { kind: 'plank'; cue: string; hide?: string; y?: number }
  | { kind: 'group'; cue: string; x: number; y: number; size: number; tone: 'palm' | 'clay' | 'nile' | 'royal'; label?: string }
  | { kind: 'path'; cue: string; d: string; color?: string }
  | { kind: 'drops'; cue: string; until?: string; xs: number[]; from: number; to: number }
  | { kind: 'sparkles'; cue: string; points: [number, number][]; size?: number }
  | { kind: 'book'; cue: string; open: string; x: number; y: number; s: number; at?: { cue: string; x?: number; y?: number }[] }
  | { kind: 'button'; cue: string; text: string; x?: number; y?: number }
  // the general teaching templates
  | { kind: 'title'; cue: string; text: string; sub?: string; art?: string }
  | { kind: 'card'; cue: string; title?: string; text: string; art?: string; x?: number; y?: number; w?: number }
  | { kind: 'steps'; items: { cue: string; text: string; art?: string }[]; y?: number }
  | { kind: 'compare'; left: Side; right: Side; cue?: string }
  | { kind: 'labels'; items: { cue: string; text: string; x: number; y: number; to?: [number, number] }[] };
export type Side = { title: string; tone?: 'palm' | 'clay' | 'nile' | 'royal'; items: { cue: string; text?: string; art?: string }[] };

export type Scene = {
  part: number;                     // index of the part in the timing file (0-based)
  note?: string;                    // what the scene shows (for people reading the data)
  night?: boolean;
  cues: Record<string, string>;     // key -> the word (as written in the narration text) that starts it
  sfx?: [string, string, number?][];// [cue, effect id from public/sfx/index.json, playback rate]
  layers?: Layer[];
  items?: Item[];
};
export type MotionDoc = { version: 1; book: string; explain: string; scenes: Scene[] };
