// Passport (stamps), the parents' corner (family code, numerals, motion, quality) and the performance page.
import { useEffect, useMemo, useState } from 'react';
import { WORLDS, skillCount, worldSkills } from '../lib/content';
import { unlockWithCode } from '../lib/family';
import { fmt, useNum } from '../lib/num';
import { gpuName, guessTier, hasWebGL2, SETTINGS } from '../lib/tier';
import { T, type WorldId } from '../lib/tokens';
import { masteredIn, useLearning } from '../data/learning';
import { lowSpace, mb, usePacks, worldBytes } from '../data/packs';
import { CONTENT } from '../lib/content';
import { clearErrors, readErrors, type ErrorEntry } from '../ui/ErrorBoundary';
import { useApp, useProfile } from '../state/store';
import { KassalaTown, TOWN_FAR, TOWN_FOG } from '../three/town/KassalaTown';
import { Stage, stats, useTier } from '../three/Stage';
import { IconBack, IconClose, IconStar } from '../ui/Icons';
import { TabBar } from '../ui/kit';
import { SHORT_NAME } from './Map';

export function Passport() {
  const p = useProfile();
  const learners = useLearning(s => s.learners);
  const num = useNum();
  if (!p) return null;
  return (
    <div className="screen sand has-rail">
      <div className="main col grow scroll">
        <header className="map-head"><h1 className="t-h1" style={{ margin: 0 }}>جوازي</h1></header>
        <div className="stamps">
          {WORLDS.map(w => {
            const total = Math.max(1, skillCount(w.id)), got = masteredIn(learners[p.id], w.id), done = got >= total && skillCount(w.id) > 0;
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
        <LearnerData />
        <DeviceSection />
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

/** Parents' corner: where the children's progress is kept, a backup file to save and restore, and old (v2) progress
 *  waiting to be linked to a child. Names of old players are shown here only, to the parent. */
function LearnerData() {
  const L = useLearning();
  const family = useApp(st => st.family), guests = useApp(st => st.profiles);
  const [msg, setMsg] = useState<string | null>(null);
  const kids = [...(family?.members ?? []).map(m => ({ id: m.id, label: m.name })), ...guests.map((g, i) => ({ id: g.id, label: `ضيف ${i + 1}` }))];
  const download = () => {
    const blob = new Blob([JSON.stringify(L.exportBackup())], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `khawarizmi-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    setMsg('اتحفظت النسخة الاحتياطية في ملف.');
  };
  const restore = async (f: File | undefined) => {
    if (!f) return;
    try { const r = L.importBackup(JSON.parse(await f.text())); setMsg(r.ok ? `اترجع تقدّم ${r.count} من الأطفال.` : 'الملف دا ما نسخة احتياطية صالحة.'); }
    catch { setMsg('الملف دا ما نسخة احتياطية صالحة.'); }
  };
  const waiting = L.legacy.filter(x => !x.linkedTo && x.levels > 0);
  return (
    <section className="card pc learner-data">
      <h2 className="t-h2">تقدّم الأطفال</h2>
      <p className="t-small soft">
        {L.durable ? 'محفوظ في هذا الجهاز' : 'التخزين غير متاح في هذا المتصفح، فالتقدّم مؤقت حتى تُغلق الصفحة'}
        {L.durable && (L.persisted ? '، والمتصفح تعهّد بعدم مسحه.' : '. احفظ نسخة احتياطية من وقت لآخر.')}
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn paper" onClick={download}>احفظ نسخة احتياطية</button>
        <label className="btn paper" style={{ cursor: 'pointer' }}>استرجع نسخة<input type="file" accept="application/json,.json" hidden onChange={e => restore(e.target.files?.[0])} /></label>
      </div>
      {waiting.length > 0 && (
        <div className="col" style={{ gap: 8 }}>
          <p className="t-small soft">تقدّم من النسخة السابقة ينتظر ربطه بطفل:</p>
          {waiting.map(w => (
            <div key={w.legacyId} className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="t-small"><b>{w.name || 'لاعب'}</b> · {w.levels} مرحلة برمجة</span>
              <select className="code" style={{ flex: 'none', minWidth: 140 }} defaultValue="" onChange={e => { if (e.target.value) { L.linkLegacy(w.legacyId, e.target.value); setMsg('اتربط التقدّم القديم.'); } }}>
                <option value="" disabled>اربطه بـ…</option>
                {kids.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="t-small" role="status">{msg}</p>}
    </section>
  );
}

/** Parents' corner: the 3D worlds on this device (download / delete), storage, the app version and its update,
 *  and the local error log. */
function DeviceSection() {
  const P = usePacks();
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  useEffect(() => {
    void P.refreshStorage(); void readErrors().then(setErrors);
    Promise.all(WORLDS.map(async w => [w.id, await worldBytes(w.id)] as const)).then(list => {
      const with3d = list.filter(([, b]) => b > 0);
      setSizes(Object.fromEntries(with3d));
      for (const [id] of with3d) void P.check(id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="card pc device">
      <h2 className="t-h2">الجهاز والإصدار</h2>
      {Object.entries(sizes).map(([id, bytes]) => {
        const st = P.worlds[id]?.state;
        return (
          <div key={id} className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
            <span className="t-small"><b>{SHORT_NAME[id]}</b> · <span className="ltr">{mb(bytes)} MB</span> · {st === 'ready' ? 'محفوظ في الجهاز' : st === 'downloading' ? `ينزل… ${Math.round((P.worlds[id]!.got / bytes) * 100)}%` : 'غير منزّل'}</span>
            {st === 'ready'
              ? <button className="btn paper" onClick={() => void P.remove(id)}>احذف من الجهاز</button>
              : <button className="btn paper" disabled={st === 'downloading'} onClick={() => void P.download(id)}>نزّل</button>}
          </div>
        );
      })}
      {P.storage && <p className="t-small soft">المساحة المستخدمة: <span className="ltr">{mb(P.storage.used)} MB</span>{lowSpace(P.storage) && <b> · مساحة الجهاز قربت تخلص، احذف عالمًا مكتملًا.</b>}</p>}
      <p className="t-small soft">الإصدار <span className="ltr">{__APP_VERSION__}</span> ({__BUILD_DATE__}) · المحتوى <span className="ltr">{CONTENT?.version ?? '-'}</span></p>
      {P.update && <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}><span className="t-small">نسخة جديدة جاهزة. تقدّم الأطفال لن يتأثر.</span><button className="btn" onClick={P.update}>حدّث الآن</button></div>}
      <details>
        <summary className="t-small">سجل الأخطاء في هذا الجهاز ({errors.length})</summary>
        {errors.slice(0, 5).map((e, i) => <p key={i} className="t-small soft ltr" style={{ margin: '4px 0' }}>{new Date(e.t).toLocaleString('en-GB')} · {e.where} · {e.msg}</p>)}
        {errors.length > 0 && <button className="btn paper" onClick={() => void clearErrors().then(() => setErrors([]))}>امسح السجل</button>}
      </details>
    </section>
  );
}
