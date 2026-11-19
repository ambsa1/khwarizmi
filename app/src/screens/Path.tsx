// Today's journey, laid out in three fixed bands that never overlap (design rules: docs/phase2/PHASE2_REDESIGN_PLAN.md §5):
//   top bar     - the child (tap to switch player) and the world name with its progress, one element
//   world view  - the live drone view of the child's world; nothing sits on it except Siraj's speech bubble
//   action band - one golden button (with the next skill inside it) and today's three steps as one progress bar
// Navigation is the bottom bar on phones, a side rail on wide screens. The passport lives only in the navigation.
import { useWorldBackdrop } from '../ui/Backdrop';
import { AnimatePresence, motion } from 'framer-motion';
import { Sound } from '../audio/SoundManager';
import { TopBar } from '../ui/TopBar';
import { useEffect, useState } from 'react';
import { lessonFor, placeName, stationCount, subjectName, worldById, worldSkills, worldStations } from '../lib/content';
// (Phase 3: the golden button completes the next real skill in the learner database; lessons arrive in phase 6.)
import { useNum } from '../lib/num';
import type { WorldId } from '../lib/tokens';
import { isMastered, litToday, masteredIn, nextSkillIn, useLearning } from '../data/learning';
import { useApp, useProfile } from '../state/store';
import type { SirajAction } from '../three/Siraj';
import { WorldWindow } from '../three/WorldWindow';
import { IconCheck, IconGift, IconLamp, IconPlay, IconRefresh } from '../ui/Icons';
import { Bubble, Confetti, TabBar, say, useGuard } from '../ui/kit';

const GREETED = new Set<string>();

export const currentWorld = (pid: string, age: number, chosen: Record<string, string>): WorldId =>
  (chosen[pid] as WorldId) ?? (age <= 6 ? 'saqiya' : 'kassala');

export function Path() {
  const p = useProfile();
  const go = useApp(s => s.go), chosen = useApp(s => s.world);
  const learners = useLearning(s => s.learners), complete = useLearning(s => s.complete);
  const openLesson = useApp(s => s.openLesson), celebrate = useApp(s => s.celebrate), celebrated = useApp(s => s.celebrated);
  // back from a finished lesson: show the street one house short, then build it in front of the child
  const [holdBack, setHoldBack] = useState(celebrate ? 1 : 0);
  const num = useNum();
  const guard = useGuard(900);
  const [action, setAction] = useState<SirajAction>('wave');
  const [party, setParty] = useState(0);
  const [line, setLine] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // the celebration never covers the scene: a glass banner slides down at the top for three seconds
  const cheer = () => {
    setToast(say(p!, 'عفارم عليك! عمّرت محطة جديدة!', 'عفارم عليكِ! عمّرتي محطة جديدة!'));
    Sound.onSirajCelebrate('station'); setTimeout(() => Sound.play('star'), 900);
    setTimeout(() => setToast(null), 3000);
  };
  useWorldBackdrop(p ? currentWorld(p.id, p.age, chosen) : null);
  if (!p) return null;
  const world = currentWorld(p.id, p.age, chosen);
  const name = subjectName(world);
  const total = Math.max(1, stationCount(world));
  const me = learners[p.id];
  const mastered = Math.min(total, masteredIn(me, world));
  const lit = litToday(me);
  const next = nextSkillIn(me, world);
  const curStation = worldStations(world)[mastered];
  const partial = curStation && curStation.skills.length > 1 ? curStation.skills.filter(k => isMastered(me?.skills[k.id])).length / curStation.skills.length : 0;
  const done = mastered >= total;
  // Siraj greets the place once per visit (the map and the top bar only name the subject)
  useEffect(() => {
    if (celebrate || GREETED.has(world)) return;
    GREETED.add(world);
    // the welcome slides in at the top of the scene (like the celebration banner), never over the buildings
    setToast(`أهلًا بيك في ${placeName(world)}!`); setAction('wave');
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [world]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!celebrate) return;
    const t1 = setTimeout(() => {
      setHoldBack(0); setAction('celebrate'); setParty(n => n + 1);
      cheer(); celebrated();
    }, 900);
    const t2 = setTimeout(() => setAction('idle'), 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2 has no lessons yet: the button plays the "house built, lamp lit" moment so the feel can be judged.
  const play = async () => {
    if (done) { go('map'); return; }
    if (next && (await lessonFor(world, next.id))) { openLesson(world, next.id); return; }
    setAction('hop');
    setTimeout(() => {
      if (next) complete(p.id, next.id);
      setAction('celebrate'); setParty(n => n + 1); cheer();
      setTimeout(() => setAction('idle'), 2400);
    }, 650);
  };
  const steps = [
    { id: 'new', label: 'جديد', icon: <IconLamp size={22} />, done: lit >= 1 },
    { id: 'review', label: 'مراجعة', icon: <IconRefresh size={22} />, done: lit >= 2 },
    { id: 'surprise', label: 'مفاجأة', icon: <IconGift size={22} />, done: lit >= 3 },
  ];

  return (
    <div className="screen sand has-rail path">
      <div className="main col grow">
        <TopBar title={
          <div className="world-pill" role="img" aria-label={`عالم ${name}: ${num(mastered)} من ${num(total)}`}>
            <span className="world-pill-name">{name}</span>
            <span className="world-pill-bar" aria-hidden><i style={{ width: `${Math.round(mastered / total * 100)}%` }} /></span>
          </div>} />
        <div className="path-body">
          <section className="path-window" aria-label={`عالم ${name}`}>
            <WorldWindow world={world} mastered={Math.max(0, mastered - holdBack)} total={total} partial={partial} action={action} label={name}
              onSirajTap={() => { setAction('wave'); setLine(say(p, 'يلا يا بطل!', 'يلا يا بطلة!')); setTimeout(() => setLine(null), 1600); }} />
            {line && <div className="window-line"><Bubble>{line}</Bubble></div>}
            <AnimatePresence>{toast && (
              <motion.div key="toast" className="toast" role="status" initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -70, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}>{toast}</motion.div>)}</AnimatePresence>
            <Confetti run={party} />
          </section>
          <section className="path-panel">
            <motion.button className="btn big wide go" whileTap={{ scale: 0.97 }} onClick={guard(play)}>
              <IconPlay size={30} />
              <span className="go-text">
                <b>{done ? 'اختار عالم جديد' : 'يلا نكمّل الرحلة'}</b>
                {next && !done && <small>{next.title.ar}</small>}
              </span>
            </motion.button>
            <div className="today" role="group" aria-label="رحلة اليوم">
              <span className="sr" aria-live="polite">{num(lit)} {lit === 1 ? 'لمبة اليوم' : 'لمبات اليوم'}</span>
              <ol className="today-bar">
                {steps.map(s => (
                  <li key={s.id} className={(s.done ? 'done' : '') + (s.id === 'surprise' && !s.done && lit >= 2 ? ' ready' : '')}>
                    <span className="today-seg" aria-hidden />
                    <span className="today-label">{s.done ? <IconCheck size={22} /> : s.icon}{s.label}</span>
                  </li>
                ))}
              </ol>
            </div>
            <ZoneLadder world={world} mastered={mastered} />
          </section>
        </div>
      </div>
      <TabBar current="path" />
    </div>
  );
}

/** Wide screens only: the street in its zones, from the start to the summit. Built houses are lit, the current
 *  zone is highlighted, so the child sees how far along the street they are and what is left. */
function ZoneLadder({ world, mastered }: { world: WorldId; mastered: number }) {
  const skills = worldSkills(world);
  const titles = new Map((worldById(world).zones ?? []).map((z: { id: string; title: { ar: string } }) => [z.id, z.title.ar]));
  const zones: { id: string; from: number; n: number }[] = [];
  skills.forEach((s, i) => { const last = zones[zones.length - 1]; if (last && last.id === s.zone) last.n++; else zones.push({ id: s.zone, from: i, n: 1 }); });
  return (
    <ol className="zones card" aria-label="مناطق الشارع">
      {zones.map(z => {
        const built = Math.max(0, Math.min(z.n, mastered - z.from)), here = mastered >= z.from && mastered < z.from + z.n;
        return (
          <li key={z.id} className={(here ? 'here' : '') + (built === z.n ? ' full' : '')}>
            <span className="zone-name">{titles.get(z.id) ?? z.id}</span>
            <span className="zone-houses" aria-label={`${built} من ${z.n}`}>
              {Array.from({ length: z.n }, (_, k) => <i key={k} className={k < built ? 'on' : k === built && here ? 'next' : undefined} />)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
