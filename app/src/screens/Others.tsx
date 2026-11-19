// Passport (stamps), the parents' corner (family code, numerals, motion, quality) and the performance page.
import { useEffect, useMemo, useState } from 'react';
import { placeName, stationCount, subjectName, WORLDS, worldSkills } from '../lib/content';
import { fmt, useNum } from '../lib/num';
import { gpuName, guessTier, hasWebGL2, SETTINGS } from '../lib/tier';
import type { WorldId } from '../lib/tokens';
import { dayKey, isMastered, masteredIn, useLearning } from '../data/learning';
import { imageUrl } from '../lib/family';
import { lowSpace, mb, usePacks, worldBytes } from '../data/packs';
import { CONTENT } from '../lib/content';
import { useApp, useProfile, type Profile } from '../state/store';
import { KassalaTown, TOWN_FAR, TOWN_FOG } from '../three/town/KassalaTown';
import { Stage, stats, useTier } from '../three/Stage';
import { IconBack, IconStar } from '../ui/Icons';
import { back, useModalBack } from '../ui/nav';
import { Avatar, gradeLabel, playerName, TabBar } from '../ui/kit';
import { TopBar } from '../ui/TopBar';
import { SHORT_NAME, SUBJECT_COLOR } from './Map';

/** line drawings of each world's landmark: engraved watermark while in progress, inked stamp when complete */
const LANDMARK_ART: Record<WorldId, JSX.Element> = {
  kassala: <path d="M8 46c4-10 7-22 12-24s5 10 9 6 5-18 11-18 7 16 10 18 6 2 8 18M4 46h56" />,
  saqiya: <g><circle cx="26" cy="26" r="14" /><path d="M26 12v28M12 26h28M16 16l20 20M36 16 16 36M40 26h16v20M4 46h56" /></g>,
  mogran: <g><path d="M6 10c10 8 16 14 26 18M58 10c-10 8-16 14-26 18M32 28v20" /><path d="M14 40l8-12 2 12zM4 48h56" /></g>,
  suakin: <g><path d="M34 46V12l2-4 2 4v34M30 20h10" /><path d="M8 46V26h18v20M12 30h10v8H12zM4 48h56" /></g>,
  meroe: <g><path d="M6 46l10-28 10 28M22 46l12-34 12 34M40 46l8-22 8 22M4 46h56" /><path d="M13 30h6M29 26h10" /></g>,
  marra: <g><path d="M4 44c8-4 12-16 20-22 6 4 10 4 16 0 8 6 12 18 20 22" /><ellipse cx="32" cy="26" rx="6" ry="2.5" /><path d="M10 50h44M14 46h36" /></g>,
};
const RANKS: [number, string][] = [[0, 'مستكشف صغير'], [5, 'رحّال'], [20, 'مستكشف ماهر'], [50, 'حارس الخريطة'], [100, 'خوارزمي']];

export function Passport() {
  const p = useProfile();
  const learners = useLearning(s => s.learners);
  const num = useNum();
  const [open, setOpen] = useState<WorldId | null>(null);
  if (!p) return null;
  const me = learners[p.id];
  const stations = WORLDS.reduce((a, w) => a + masteredIn(me, w.id), 0);
  const stars = WORLDS.reduce((a, w) => a + worldSkills(w.id).filter(k => isMastered(me?.skills[k.id])).length, 0);
  const rank = [...RANKS].reverse().find(([n]) => stations >= n)![1];
  const name = playerName(p), grade = gradeLabel(p, num);
  const allStations = WORLDS.reduce((a, w) => a + stationCount(w.id as WorldId), 0);
  const sealed = WORLDS.filter(w => { const t = stationCount(w.id as WorldId); return t > 0 && masteredIn(me, w.id) >= t; }).length;
  return (
    <div className="screen sand has-rail">
      <div className="main col grow scroll">
        <TopBar title="جوازي" />
        <section className="explorer-id glass" aria-label="بطاقة المستكشف">
          <Avatar profile={p} size={84} />
          <div className="explorer-text">
            <b className="t-h2">{name}</b>
            <span className="explorer-rank">{rank}{grade && <span className="explorer-grade"> · {grade}</span>}</span>
            <span className="explorer-stats">
              <span><IconStar size={22} style={{ color: 'var(--c-gold)' }} /> {num(stars)} {stars === 1 ? 'نجمة' : 'نجوم'}</span>
              <span>{num(stations)} {stations === 1 ? 'محطة' : 'محطات'} معمورة</span>
            </span>
          </div>
          <div className="explorer-progress" aria-label={`أختامك ${num(sealed)} من ${num(WORLDS.length)}`}>
            <span className="explorer-seals"><b>{num(sealed)}</b> من {num(WORLDS.length)} أختام</span>
            <span className="explorer-bar" aria-hidden><i style={{ width: `${Math.round(stations / Math.max(1, allStations) * 100)}%` }} /></span>
            <span className="soft">{num(stations)} من {num(allStations)} محطة في كل السودان</span>
          </div>
        </section>
        <div className="stamps">
          {WORLDS.map(w => {
            const id = w.id as WorldId, total = stationCount(id), got = Math.min(masteredIn(me, id), total), done = total > 0 && got >= total;
            const col = SUBJECT_COLOR[id];
            return (
              <button key={id} className={'stamp card' + (done ? ' done' : '')} onClick={() => setOpen(id)} aria-label={`${subjectName(id)} في ${placeName(id)}`}>
                <span className="stamp-art" style={{ ['--ink' as string]: col }}>
                  <svg viewBox="0 0 64 56" width="96" height="84" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{LANDMARK_ART[id]}</svg>
                </span>
                <b className="stamp-title">{subjectName(id)}<span className="stamp-place">{placeName(id)}</span></b>
                <span className="soft">{total ? `${num(got)} من أصل ${num(total)} ${total > 10 ? 'محطة' : 'محطات'}` : 'قريبًا'}</span>
              </button>
            );
          })}
        </div>
      </div>
      <TabBar current="passport" />
      {open && <StampSheet world={open} name={name} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** a stamp opened: the skills mastered in that world, and a small certificate when the world is complete */
function StampSheet({ world, name, onClose }: { world: WorldId; name: string; onClose: () => void }) {
  const p = useProfile(); const learners = useLearning(s => s.learners); const num = useNum();
  const me = p ? learners[p.id] : undefined;
  const skills = worldSkills(world).filter(k => isMastered(me?.skills[k.id]));
  const total = stationCount(world), done = total > 0 && masteredIn(me, world) >= total;
  useModalBack(true, onClose);
  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet page" role="dialog" aria-modal="true" aria-label={subjectName(world)}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <button className="icon-btn back-btn" aria-label="رجوع" onClick={onClose}><IconBack /></button>
          <h2 className="t-h2">{subjectName(world)} • {placeName(world)}</h2>
        </div>
        {done && p && (
          <div className="certificate">
            <Avatar profile={p} size={72} />
            <b>شهادة إتمام</b>
            <b className="cert-name">{name}</b>
            <span>{p.gender === 'f' ? 'عمّرت' : 'عمّر'} كل محطات عالم {placeName(world)}{gradeLabel(p, num) && ` · ${gradeLabel(p, num)}`}</span>
            <span className="soft">{new Date().toLocaleDateString('ar-SD')}</span>
          </div>
        )}
        {skills.length ? (
          <ul className="mastered">{skills.map(k => <li key={k.id}><IconStar size={20} style={{ color: 'var(--c-gold)' }} /> {k.title.ar}</li>)}</ul>
        ) : <p>لسه ما في مهارات هنا. يلا نبدأ الرحلة!</p>}
        <p className="soft">{num(skills.length)} {skills.length === 1 ? 'مهارة' : 'مهارات'}</p>
      </div>
    </>
  );
}

export function Parents() {
  const s = useApp();
  const Seg = <V extends string>({ value, options, onChange, label }: { value: V; options: [V, string][]; onChange: (v: V) => void; label: string }) => (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button key={v} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
  return (
    <div className="screen sand parents">
      <header className="guest-top">
        <button className="icon-btn back-btn" aria-label="رجوع" onClick={() => back('entry')}><IconBack /></button>
        <h1 className="t-h1" style={{ margin: 0 }}>{s.family ? 'بيتنا' : 'ركن الأهل'}</h1>
        <span style={{ width: 56 }} />
      </header>
      <div className="scroll grow parents-body">
        {s.family && <OurHome />}
        <section className="card pc">
          <h2 className="t-h2">وقت اللعب في اليوم</h2>
          <Seg label="وقت اللعب في اليوم" value={String(s.playLimit) as '0'} onChange={v => s.setPlayLimit(+v)} options={[['0', 'بلا حد'], ['20', '٢٠ دقيقة'], ['30', '٣٠ دقيقة'], ['45', '٤٥ دقيقة'], ['60', 'ساعة']] as ['0', string][]} />
          <p className="t-small soft">لما الوقت يخلص، سراج يقول «وقت الراحة». الأهل يقدروا يزيدوا ربع ساعة بضغطة مطوّلة.</p>
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
          <button className="icon-btn back-btn" aria-label="رجوع" onClick={() => back('parents')}><IconBack /></button>
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

/** «بيتنا»: the private family corner (only when family mode is unlocked). The family photo (sealed, decrypted on this
 *  device for this session only) melts into the page as a banner, and each of the four children has a progress card. */
function OurHome() {
  const family = useApp(st => st.family), key = useApp(st => st.familyKey);
  const learners = useLearning(st => st.learners);
  const num = useNum();
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (family?.group && key) imageUrl(key, family.group).then(u => live && setPhoto(u)).catch(() => {});
    return () => { live = false; };
  }, [family, key]);
  if (!family) return null;
  const totalStations = WORLDS.reduce((a, w) => a + stationCount(w.id), 0);
  return (
    <section className="our-home" aria-label="بيتنا">
      <div className="our-banner" aria-hidden>{photo && <img src={photo} alt="" />}</div>
      <div className="our-kids">
        {family.members.map(m => {
          const me = learners[m.id];
          const stations = WORLDS.reduce((a, w) => a + Math.min(masteredIn(me, w.id), stationCount(w.id)), 0);
          const stars = WORLDS.reduce((a, w) => a + worldSkills(w.id).filter(k => isMastered(me?.skills[k.id])).length, 0);
          const today = me?.days[dayKey()]?.lit ?? 0;
          const pct = totalStations ? Math.round(stations / totalStations * 100) : 0;
          return (
            <article key={m.id} className="our-kid card" style={{ ['--ring' as string]: m.ring }}>
              <Avatar profile={{ id: m.id, kind: 'family', gender: m.gender, name: m.name, avatar: '' } as Profile} size={76} />
              <b className="t-h2">{m.name}</b>
              <span className="our-bar" role="progressbar" aria-label={`تقدّم ${m.name}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(pct, 2)}%` }} /></span>
              <span className="t-small">{num(stations)} من {num(totalStations)} محطة</span>
              <span className="t-small soft"><IconStar size={18} style={{ color: 'var(--c-gold)', verticalAlign: '-3px' }} /> {num(stars)} · دروس اليوم {num(today)}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Parents' corner: where the children's progress is kept, a backup file to save and restore, and old (v2) progress
 *  waiting to be linked to a child. Names of old players are shown here only, to the parent. */
function LearnerData() {
  const L = useLearning();
  const guests = useApp(st => st.profiles), removeGuest = useApp(st => st.removeGuest);
  const [msg, setMsg] = useState<string | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  useModalBack(ask != null, () => setAsk(null));
  // the public parents' corner shows only this device's guests; family children and the v2 archive live behind the family code
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
  return (
    <section className="card pc learner-data">
      <h2 className="t-h2">تقدّم الضيوف</h2>
      <p className="t-small soft">
        {L.durable ? 'محفوظ في هذا الجهاز' : 'التخزين غير متاح في هذا المتصفح، فالتقدّم مؤقت حتى تُغلق الصفحة'}
        {L.durable && (L.persisted ? '، والمتصفح تعهّد بعدم مسحه.' : '. احفظ نسخة احتياطية من وقت لآخر.')}
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn paper" onClick={download}>احفظ نسخة احتياطية</button>
        <label className="btn paper" style={{ cursor: 'pointer' }}>استرجع نسخة<input type="file" accept="application/json,.json" hidden onChange={e => restore(e.target.files?.[0])} /></label>
      </div>
      {guests.length > 0 && (
        <ul className="guest-progress">
          {guests.map(g => (
            <li key={g.id} className="guest-row">
              <span><b>{playerName(g)}</b> · {WORLDS.reduce((a, w) => a + masteredIn(L.learners[g.id], w.id), 0)} محطة معمورة</span>
              {ask === g.id ? (
                <span className="row" style={{ gap: 8 }}>
                  <span className="t-small">نمسحه؟</span>
                  <button className="btn danger" onClick={() => { removeGuest(g.id); L.forget(g.id); setAsk(null); setMsg('اتمسح الضيف وتقدّمه.'); }}>امسح</button>
                  <button className="btn paper" onClick={() => setAsk(null)}>لا</button>
                </span>
              ) : <button className="btn paper" aria-label={`امسح ${playerName(g)}`} onClick={() => setAsk(g.id)}>امسح</button>}
            </li>
          ))}
        </ul>
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
  useEffect(() => {
    void P.refreshStorage();
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
            {st !== 'ready' && <button className="btn paper" disabled={st === 'downloading'} onClick={() => void P.download(id)}>نزّل</button>}
          </div>
        );
      })}
      {P.storage && <p className="t-small soft">المساحة المستخدمة: <span className="ltr">{mb(P.storage.used)} MB</span>{lowSpace(P.storage) && <b> · مساحة الجهاز قربت تخلص.</b>}</p>}
      <p className="t-small soft">الإصدار <span className="ltr">{__APP_VERSION__}</span> ({__BUILD_DATE__}) · المحتوى <span className="ltr">{CONTENT?.version ?? '-'}</span></p>
      {P.update && <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}><span className="t-small">نسخة جديدة جاهزة. تقدّم الأطفال لن يتأثر.</span><button className="btn" onClick={P.update}>حدّث الآن</button></div>}
    </section>
  );
}
