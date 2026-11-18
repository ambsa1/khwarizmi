// Passport (stamps), the parents' corner (family code, numerals, motion, quality) and the performance page.
import { useEffect, useMemo, useState } from 'react';
import { WORLDS, skillCount, worldSkills } from '../lib/content';
import { unlockWithCode } from '../lib/family';
import { fmt, useNum } from '../lib/num';
import { gpuName, guessTier, hasWebGL2, SETTINGS } from '../lib/tier';
import { T, type WorldId } from '../lib/tokens';
import { useApp, useProfile } from '../state/store';
import { KassalaTown, TOWN_FAR, TOWN_FOG } from '../three/town/KassalaTown';
import { Stage, stats, useTier } from '../three/Stage';
import { IconBack, IconClose, IconStar } from '../ui/Icons';
import { TabBar } from '../ui/kit';
import { SHORT_NAME } from './Map';

export function Passport() {
  const p = useProfile();
  const progress = useApp(s => s.progress);
  const num = useNum();
  if (!p) return null;
  return (
    <div className="screen sand has-rail">
      <div className="main col grow scroll">
        <header className="map-head"><h1 className="t-h1" style={{ margin: 0 }}>جوازي</h1></header>
        <div className="stamps">
          {WORLDS.map(w => {
            const total = Math.max(1, skillCount(w.id)), got = progress[p.id]?.[w.id] ?? 0, done = got >= total && skillCount(w.id) > 0;
            const c = T.worlds[w.id as WorldId];
            return (
              <div key={w.id} className={'stamp card' + (done ? ' done' : '')}>
                <span className="stamp-seal" style={{ background: done ? c.primary : 'transparent', borderColor: c.primary === '#F3EDE2' ? c.secondary : c.primary }}>
                  <IconStar size={34} style={{ color: done ? '#FFFFFF' : c.primary === '#F3EDE2' ? c.secondary : c.primary, opacity: done ? 1 : 0.45 }} />
                </span>
                <b className="t-h2">{SHORT_NAME[w.id]}</b>
                <span className="soft num">{skillCount(w.id) ? `${num(Math.min(got, total))} / ${num(total)}` : 'قريبًا'}</span>
              </div>
            );
          })}
        </div>
      </div>
      <TabBar current="passport" />
    </div>
  );
}

export function Parents() {
  const s = useApp();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unlock = async () => {
    setBusy(true); setMsg(null);
    const r = await unlockWithCode(code);
    setBusy(false);
    if (!r) { setMsg('الكود ما اتطابق. جرّب تاني.'); return; }
    s.setFamilyKey(r.keyB64); s.setFamily(r.manifest); setCode('');
    setMsg('اتفتح وضع الأسرة.');
  };
  const lock = () => { s.setFamilyKey(null); s.setFamily(null); if (s.current?.startsWith('m')) s.setCurrent(null); setMsg('اتقفل وضع الأسرة في الجهاز دا.'); };
  const Seg = <V extends string>({ value, options, onChange, label }: { value: V; options: [V, string][]; onChange: (v: V) => void; label: string }) => (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
  return (
    <div className="screen sand parents">
      <header className="guest-top">
        <button className="icon-btn" aria-label="رجوع" onClick={() => s.go('entry')}><IconBack /></button>
        <h1 className="t-h1" style={{ margin: 0 }}>ركن الأهل</h1>
        <span style={{ width: 56 }} />
      </header>
      <div className="scroll grow parents-body">
        <section className="card pc">
          <h2 className="t-h2">وضع الأسرة</h2>
          {s.family ? (
            <><p className="soft">مفتوح في الجهاز دا. الأسماء والصور مشفّرة، وما بتظهر قبل الكود.</p>
              <button className="btn paper" onClick={lock}>اقفل وضع الأسرة</button></>
          ) : (
            <form className="row" style={{ flexWrap: 'wrap' }} onSubmit={e => { e.preventDefault(); if (code.trim()) unlock(); }}>
              <input className="code" type="password" inputMode="text" autoComplete="off" aria-label="كود الأسرة" placeholder="كود الأسرة" value={code} onChange={e => setCode(e.target.value)} />
              <button className="btn nile" disabled={busy || !code.trim()}>{busy ? '...' : 'افتح'}</button>
            </form>
          )}
          {msg && <p role="status" className="t-body">{msg}</p>}
        </section>
        <section className="card pc">
          <h2 className="t-h2">الأرقام</h2>
          <Seg label="الأرقام" value={s.numerals} onChange={s.setNumerals} options={[['hindi', '١٢٣'], ['latin', '123']]} />
        </section>
        <section className="card pc">
          <h2 className="t-h2">الحركة</h2>
          <Seg label="الحركة" value={s.motion} onChange={s.setMotion} options={[['auto', 'حسب الجهاز'], ['reduced', 'حركة مخفّفة']]} />
        </section>
        <section className="card pc">
          <h2 className="t-h2">جودة الرسم</h2>
          <Seg label="جودة الرسم" value={s.tierOverride} onChange={s.setTierOverride} options={[['auto', 'تلقائي'], ['low', 'خفيفة'], ['high', 'عالية']]} />
          <p className="t-small soft">الاختبار التلقائي: {s.measuredTier === 'high' ? 'عالية' : s.measuredTier === 'low' ? 'خفيفة' : 'لسه'}</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn paper" onClick={() => s.go('perf')}>صفحة قياس الأداء</button>
            <button className="btn paper" onClick={() => s.setMeasuredTier(null)}>أعد الاختبار</button>
          </div>
        </section>
        <section className="card pc">
          <h2 className="t-h2">بيانات التجربة</h2>
          <p className="t-small soft">المرحلة الثانية فيها تقدّم تجريبي فقط، عشان كل الشاشات تبان في منتصف الرحلة.</p>
          <button className="btn paper" onClick={() => { s.resetDemo(); setMsg('رجع التقدّم التجريبي لأوّله.'); }}>أعد التقدّم التجريبي</button>
        </section>
      </div>
    </div>
  );
}

/** Live performance page: frames per second, frame time, draw calls, triangles, resolution and device tier,
 *  measured on the real Kassala scene. Low-tier budget: 30 fps, 80 calls, 150k triangles. */
export function Perf() {
  const go = useApp(s => s.go);
  const tier = useTier();
  const zones = useMemo(() => worldSkills('kassala').map(s => s.zone), []);
  const [, tick] = useState(0);
  const [lamps, setLamps] = useState(14);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 500); return () => clearInterval(id); }, []);
  const nav = navigator as Navigator & { deviceMemory?: number };
  const budget = tier === 'low' ? { fps: 30, calls: 80, tris: 150000 } : { fps: 55, calls: 150, tris: 300000 };
  const rows: [string, string, boolean | null][] = [
    ['الإطارات في الثانية', String(stats.fps), stats.fps >= budget.fps - 2],
    ['زمن الإطار', `${stats.ms} ms`, null],
    ['أوامر الرسم', `${stats.calls} / ${budget.calls}`, stats.calls <= budget.calls],
    ['المثلثات', `${stats.tris.toLocaleString('en')} / ${budget.tris.toLocaleString('en')}`, stats.tris <= budget.tris],
    ['دقّة العرض', `${stats.dpr}x`, null],
    ['فئة الجهاز', tier === 'low' ? 'منخفضة (30 إطارًا)' : 'عالية (حتى 60)', null],
    ['التخمين الأوّل', guessTier(), null],
    ['معالج الرسم', stats.gpu || gpuName(), null],
    ['الذاكرة والأنوية', `${nav.deviceMemory ?? '?'} GB · ${navigator.hardwareConcurrency ?? '?'}`, null],
    ['WebGL2', hasWebGL2() ? 'نعم' : 'لا', null],
  ];
  return (
    <div className="screen perf">
      <div style={{ position: 'absolute', inset: 0 }}>
        <Stage fog={TOWN_FOG} camera={{ position: [-300, 60, -60], fov: 50, far: TOWN_FAR }} label="مشهد كسلا لقياس الأداء">
          <KassalaTown mastered={lamps} density={SETTINGS[tier].density} />
        </Stage>
      </div>
      <div className="perf-panel ltr-nums">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b className="t-h2">قياس الأداء</b>
          <button className="icon-btn" aria-label="إغلاق" onClick={() => go('parents')}><IconClose /></button>
        </div>
        <table><tbody>{rows.map(([k, v, ok]) => (
          <tr key={k}><th>{k}</th><td className="ltr">{v}</td><td aria-hidden>{ok === null ? '' : ok ? '✓' : '!'}</td></tr>
        ))}</tbody></table>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn paper" onClick={() => setLamps(n => Math.min(zones.length, n + 1))}>ولّع لمبة</button>
          <button className="btn paper" onClick={() => setLamps(zones.length)}>القمّة</button>
          <button className="btn paper" onClick={() => setLamps(0)}>البداية</button>
        </div>
        <p className="t-small soft">حدود هذه الفئة: <span className="ltr">{budget.fps}</span> إطارًا في الثانية، و<span className="ltr">{budget.calls}</span> أمر رسم. المصابيح: <span className="ltr">{fmt(lamps, 'latin')} / {fmt(zones.length, 'latin')}</span></p>
      </div>
    </div>
  );
}
