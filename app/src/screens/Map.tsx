// Map of Sudan with the five worlds (and Siraj's water wheel for the little ones). Tap a world to travel there.
import { useEffect, useState } from 'react';
import { TopBar } from '../ui/TopBar';
import { SHORT_NAME, stationCount, subjectName, WORLDS } from '../lib/content';
import { useNum } from '../lib/num';
import type { WorldId } from '../lib/tokens';
import { masteredIn, useLearning } from '../data/learning';
import { useApp, useProfile } from '../state/store';
import { Stage } from '../three/Stage';
import { SudanMapScene, type MapSpot } from '../three/SudanMap';
import { Bubble, TabBar, say, useGuard } from '../ui/kit';
import { IconChip, IconCode, IconLeaf, IconLens, IconLetters, IconLock, IconPuzzle } from '../ui/Icons';
import { currentWorld } from './Path';

export { SHORT_NAME };

/** each world's subject icon and colour (map cards, passport) */
export const SUBJECT_ICON: Record<WorldId, (p: { size?: number }) => JSX.Element> = { kassala: IconCode, mogran: IconChip, meroe: IconLetters, suakin: IconPuzzle, marra: IconLeaf, saqiya: IconLens };
export const SUBJECT_COLOR: Record<WorldId, string> = { kassala: '#E08A2E', mogran: '#2F7FD8', meroe: '#C2416E', suakin: '#1FA3A3', marra: '#3E9A4A', saqiya: '#8A5AC8' };

export function MapScreen() {
  const p = useProfile();
  const go = useApp(s => s.go), setWorld = useApp(s => s.setWorld), chosen = useApp(s => s.world), learners = useLearning(s => s.learners);
  const num = useNum();
  const [line, setLine] = useState<string | null>(null);
  const [picked, setPicked] = useState<WorldId | null>(null);
  const portrait = usePortrait();
  const guard = useGuard(700);
  if (!p) return null;
  const cur = currentWorld(p.id, p.age, chosen);
  const spots: MapSpot[] = WORLDS.map(w => {
    const total = Math.max(1, stationCount(w.id));
    const ages = w.ages as { min: number; max?: number };
    const locked = p.age < ages.min || (ages.max !== undefined && p.age > ages.max + 1);
    return { id: w.id as WorldId, name: subjectName(w.id), value: masteredIn(learners[p.id], w.id) / total, locked, current: w.id === cur };
  });
  const pick = (id: WorldId) => {
    setPicked(id);
    const s = spots.find(x => x.id === id)!;
    const ages = WORLDS.find(x => x.id === id)!.ages as { min: number; max?: number };
    if (s.locked) {
      setLine(p.age < ages.min ? `عالم ${subjectName(id)} لمّا تكبر شويّة، من ${num(ages.min)} سنين` : say(p, 'إنت كبرت على الساقية!', 'إنتِ كبرتي على الساقية!'));
      setTimeout(() => setLine(null), 2200);
      return;
    }
    setWorld(p.id, id);
    setLine(`يلا على عالم ${subjectName(id)}!`);
    setTimeout(() => go('path'), 700);
  };
  return (
    <div className="screen sand has-rail map">
      <div className="main col grow" style={{ position: 'relative' }}>
        <TopBar title="خريطة السودان" />
        <div className="grow" style={{ position: 'relative' }}>
          <Stage transparent camera={{ position: [0.6, 24, 16], fov: 40 }} label="خريطة السودان بالعوالم الخمسة">
            <SudanMapScene spots={spots} onPick={pick} selected={picked ?? cur} labels={portrait ? [cur, ...(picked && picked !== cur ? [picked] : [])] : 'all'} />
          </Stage>
          {line && <div className="window-line"><Bubble>{line}</Bubble></div>}
        </div>
        <div className="world-cards">
          {spots.map(s => {
            const Icon = SUBJECT_ICON[s.id], col = SUBJECT_COLOR[s.id];
            return (
              <button key={s.id} className={'world-card card' + (s.current ? ' current' : '') + (s.locked ? ' locked' : '') + ((picked ?? cur) === s.id ? ' picked' : '')} onClick={guard(() => pick(s.id))}>
                <span className="subject-icon" style={{ background: col }}>{s.locked ? <IconLock size={24} /> : <Icon size={26} />}</span>
                <span className="world-card-text">
                  <b>{s.name}</b>
                  <span className="world-bar" aria-label={s.locked ? 'مقفول' : `${num(Math.round(s.value * 100))} بالمية`}><i style={{ width: `${Math.round(s.value * 100)}%`, background: col }} /></span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <TabBar current="map" />
    </div>
  );
}

/** Portrait phones: the world cards name every world, so the map only labels the current (and just-tapped) one. */
function usePortrait() {
  const q = '(orientation: portrait)';
  const [v, setV] = useState(() => matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const on = () => setV(m.matches); m.addEventListener?.('change', on); return () => m.removeEventListener?.('change', on); }, []);
  return v;
}
