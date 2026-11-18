// The daily play-time limit set in the parents' corner. Counts minutes of play on this device per day (only while a
// play screen is open and the page is visible); when the limit is reached Siraj says it is time to rest. A parent can
// add a quarter of an hour with a 2-second press.
import { useEffect, useState } from 'react';
import { useApp } from '../state/store';
import { SirajLive } from '../screens/Entry';
import { Bubble, LongPress } from './kit';

const KEY = 'khawarizmi.play';
const today = () => new Date().toISOString().slice(0, 10);
function read(): { day: string; minutes: number; extra: number } {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (v.day === today()) return v; } catch { /* fresh day */ }
  return { day: today(), minutes: 0, extra: 0 };
}
const write = (v: ReturnType<typeof read>) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } };

export function PlayTime() {
  const limit = useApp(s => s.playLimit), screen = useApp(s => s.screen);
  const [over, setOver] = useState(false);
  const playing = ['path', 'map', 'passport', 'lesson'].includes(screen);
  useEffect(() => {
    if (!limit) { setOver(false); return; }
    const check = () => { const v = read(); setOver(v.minutes >= limit + v.extra); };
    check();
    if (!playing) return;
    const t = setInterval(() => { if (document.visibilityState !== 'visible') return; const v = read(); v.minutes += 0.25; write(v); check(); }, 15000);
    return () => clearInterval(t);
  }, [limit, playing]);
  if (!over || !playing) return null;
  return (
    <div className="screen rest" role="dialog" aria-modal="true" aria-label="وقت الراحة">
      <div className="entry-siraj" style={{ margin: '8vh auto 0' }}><SirajLive action="sleepy" /></div>
      <Bubble>وقت الراحة! نكمّل بكرة إن شاء الله.</Bubble>
      <div style={{ marginTop: 24, display: 'grid', placeItems: 'center', gap: 8 }}>
        <LongPress label="الأهل: ربع ساعة كمان (اضغط مطوّلًا)" onDone={() => { const v = read(); v.extra += 15; write(v); setOver(false); }}>
          <span className="t-body" style={{ padding: '0 12px' }}>ربع ساعة كمان</span>
        </LongPress>
      </div>
    </div>
  );
}
