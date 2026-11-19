// One background behind every screen (instead of a flat colour per screen), built in layers:
//   1. a three-tone base gradient   2. two or three soft light pools   3. the Sudanese heritage ink icons in relief
//   4. paper grain. Screens and cards sit on top of it (cards are frosted glass, headers sit in their own capsules).
// Screens that stand for Sudan as a whole (who's playing, the map, the passport, parents, gates) show the icons of all
// four regions together; inside a world (journey, lesson) only that world's region shows: east for Kassala and Suakin,
// north for the Saqiya and Meroe, centre for the Mogran, west for Jebel Marra.
// The icons come from one sprite sheet per set (tools/heritage-tiles.py) and are placed on a grid fitted to the screen:
// every icon is whole (none cut at an edge), rows are offset by half a step, and neighbours are always different
// (in the all-Sudan set, different regions).
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { useApp } from '../state/store';

export type Region = 'all' | 'east' | 'north' | 'center' | 'west';
export const REGION_OF_WORLD: Record<string, Region> = { kassala: 'east', suakin: 'east', saqiya: 'north', meroe: 'north', mogran: 'center', marra: 'west' };
const ART = new URL(import.meta.env.BASE_URL + 'art/heritage/', document.baseURI).href;
// all = east, west, north, centre interleaved (20 icons, 5 x 4 sheet); a region = its 5 icons (5 x 1 sheet)
const SHEET: Record<Region, { n: number; cols: number; rows: number; step: number }> = {
  all: { n: 20, cols: 5, rows: 4, step: 7 },
  east: { n: 5, cols: 5, rows: 1, step: 2 }, north: { n: 5, cols: 5, rows: 1, step: 2 },
  center: { n: 5, cols: 5, rows: 1, step: 2 }, west: { n: 5, cols: 5, rows: 1, step: 2 },
};

const useWorldBg = create<{ world: string | null }>(() => ({ world: null }));
/** a screen inside a world (journey, lesson) tells the background which world it is in */
export function useWorldBackdrop(world: string | null | undefined) {
  useEffect(() => {
    useWorldBg.setState({ world: world ?? null });
    return () => useWorldBg.setState({ world: null });
  }, [world]);
}

function useViewport() {
  const [v, setV] = useState({ w: innerWidth, h: innerHeight });
  useEffect(() => {
    let t = 0;
    const on = () => { clearTimeout(t); t = window.setTimeout(() => setV({ w: innerWidth, h: innerHeight }), 120); };
    addEventListener('resize', on);
    return () => { removeEventListener('resize', on); clearTimeout(t); };
  }, []);
  return v;
}

/** icon positions for a w x h box: whole icons only, an even margin all round */
function layout(w: number, h: number, set: Region) {
  const s = w < 768 ? 60 : w >= 1800 ? 104 : 92;          // icon size (px)
  const m = Math.round(s * 0.45), gx = s * 1.85, gy = s * 1.55;
  const cols = Math.max(2, Math.floor((w - 2 * m - s) / gx) + 1), rows = Math.max(2, Math.floor((h - 2 * m - s) / gy) + 1);
  const sx = (w - 2 * m - s) / (cols - 1), sy = (h - 2 * m - s) / (rows - 1);
  const sh = SHEET[set], out: { x: number; y: number; i: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const odd = r % 2 === 1, n = odd ? cols - 1 : cols;
    for (let c = 0; c < n; c++) out.push({ x: m + c * sx + (odd ? sx / 2 : 0), y: m + r * sy, i: (r * sh.step + c) % sh.n });
  }
  return { s, items: out };
}

export function BackdropLayer({ region, world, tone = 'day', home = false, fixed = true }: { region: Region; world?: string | null; tone?: 'day' | 'night'; home?: boolean; fixed?: boolean }) {
  const { w, h } = useViewport();
  const set: Region = tone === 'night' ? 'all' : region;
  const sheet = tone === 'night' ? 'all-night' : region, sh = SHEET[set];
  const { s, items } = useMemo(() => layout(w, h, set), [w, h, set]);
  return (
    <div className={'backdrop' + (fixed ? '' : ' inside')} aria-hidden data-region={region} data-world={world ?? undefined} data-tone={tone} data-home={home || undefined}
      style={{ '--grain': `url(${ART}grain.webp)` } as React.CSSProperties}>
      <div className="heritage" style={{ '--sheet': `url(${ART}${sheet}.webp)`, '--s': `${s}px` } as React.CSSProperties}>
        {items.map((it, k) => (
          <i key={k} style={{ left: it.x, top: it.y, backgroundPosition: `${(it.i % sh.cols) / Math.max(1, sh.cols - 1) * 100}% ${sh.rows > 1 ? Math.floor(it.i / sh.cols) / (sh.rows - 1) * 100 : 0}%`,
            backgroundSize: `${sh.cols * 100}% ${sh.rows * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

export function Backdrop() {
  const screen = useApp(s => s.screen), family = useApp(s => s.family);
  const world = useWorldBg(s => s.world);
  const inWorld = (screen === 'path' || screen === 'lesson') && world != null;
  const region: Region = inWorld ? REGION_OF_WORLD[world] ?? 'all' : 'all';
  return <BackdropLayer region={region} world={inWorld ? world : null} home={screen === 'parents' && !!family} />;
}
