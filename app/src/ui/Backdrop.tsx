// One background behind every screen (instead of a flat colour per screen), built in layers:
//   1. a three-tone base gradient   2. two or three soft light pools   3. the Sudanese heritage ink icons in relief
//   4. paper grain. Screens and cards sit on top of it (cards are frosted glass).
// Screens that stand for Sudan as a whole (who's playing, the map, the passport, parents, gates) show the icons of all
// four regions together; inside a world (journey, lesson) only that world's region shows: east for Kassala and Suakin,
// north for the Saqiya and Meroe, centre for the Mogran, west for Jebel Marra. Tiles: tools/heritage-tiles.py.
import { useEffect } from 'react';
import { create } from 'zustand';
import { useApp } from '../state/store';

export type Region = 'all' | 'east' | 'north' | 'center' | 'west';
export const REGION_OF_WORLD: Record<string, Region> = { kassala: 'east', suakin: 'east', saqiya: 'north', meroe: 'north', mogran: 'center', marra: 'west' };
// absolute: a url() inside a CSS variable resolves against the stylesheet (assets/), not the page
const ART = new URL(import.meta.env.BASE_URL + 'art/heritage/', document.baseURI).href;

const useWorldBg = create<{ world: string | null }>(() => ({ world: null }));
/** a screen inside a world (journey, lesson) tells the background which world it is in */
export function useWorldBackdrop(world: string | null | undefined) {
  useEffect(() => {
    useWorldBg.setState({ world: world ?? null });
    return () => useWorldBg.setState({ world: null });
  }, [world]);
}

export function BackdropLayer({ region, world, tone = 'day', home = false, fixed = true }: { region: Region; world?: string | null; tone?: 'day' | 'night'; home?: boolean; fixed?: boolean }) {
  const tile = tone === 'night' ? 'all-night' : region;
  return (
    <div className={'backdrop' + (fixed ? '' : ' inside')} aria-hidden data-region={region} data-world={world ?? undefined} data-tone={tone} data-home={home || undefined}
      style={{ '--tile': `url(${ART}${tile}.webp)`, '--grain': `url(${ART}grain.webp)` } as React.CSSProperties} />
  );
}

export function Backdrop() {
  const screen = useApp(s => s.screen), family = useApp(s => s.family);
  const world = useWorldBg(s => s.world);
  const inWorld = (screen === 'path' || screen === 'lesson') && world != null;
  const region: Region = inWorld ? REGION_OF_WORLD[world] ?? 'all' : 'all';
  return <BackdropLayer region={region} world={inWorld ? world : null} home={screen === 'parents' && !!family} />;
}
