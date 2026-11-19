// Screen router. Plain state (no URL routing) so the installed app always opens on "who's playing?".
// Query parameters exist only for design review and automated screenshots:
//   ?view=siraj | world&w=kassala&m=14 | perf      isolated views
//   ?demo=guest&screen=path|map|passport           seeds a demo guest and opens that screen
//   &done=<world>                                   (with demo) the demo guest has finished that world (stamp, certificate)
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { unlockWithKey } from './lib/family';
import type { WorldId } from './lib/tokens';
import { useLearning } from './data/learning';
import { loadContent, worldSkills } from './lib/content';
import { logError } from './ui/ErrorBoundary';
import { useApp, type Screen } from './state/store';
import { WorldWindow } from './three/WorldWindow';
import { usePrefersReduced } from './ui/kit';
import { Entry } from './screens/Entry';
import { Guest } from './screens/Guest';
import { MapScreen } from './screens/Map';
import { Parents, Passport, Perf } from './screens/Others';
import { Path } from './screens/Path';
import { Lesson } from './screens/Lesson';
import { SirajPreview, WorldTour } from './screens/Preview';
import { DevPage, FamilyPage } from './screens/Gates';
import { PlayTime } from './ui/PlayTime';
import { Backdrop } from './ui/Backdrop';

const q = new URLSearchParams(location.search);

function bootDemo() {
  const s = useApp.getState();
  if (q.get('demo') === 'guest') {
    const gender = q.get('g') === 'f' ? 'f' : 'm';
    const id = s.addGuest({ gender, age: +(q.get('age') ?? 8), grade: 3, avatar: gender === 'f' ? 'g7' : 'g3' });
    const done = q.get('done');
    if (done) for (const k of worldSkills(done)) useLearning.getState().complete(id, k.id);
  }
  const screen = q.get('screen') as Screen | null;
  if (screen) s.go(screen);
  else if (!['parents', 'perf'].includes(s.screen)) s.go('entry');
}

export function App() {
  const view = q.get('view');
  const screen = useApp(s => s.screen), current = useApp(s => s.current);
  const familyKey = useApp(s => s.familyKey), family = useApp(s => s.family);
  const reduced = usePrefersReduced();
  const [booted, setBooted] = useState(false);

  // start-up: the content core pack, then the children's learning data, then the first screen
  const [bootError, setBootError] = useState<unknown>(null);
  useEffect(() => {
    const boot = () => loadContent().then(() => useLearning.getState().load());
    // a one-off start-up failure (e.g. a race with the service worker) is logged and retried once before the error screen
    boot().catch(e => { void logError(e, 'start-up'); return new Promise(r => setTimeout(r, 500)).then(boot); })
      .then(() => { bootDemo(); setBooted(true); }, setBootError);
  }, []);
  if (bootError) throw bootError;   // -> the calm error screen (ErrorBoundary), and the parents' log
  // old v2 players whose family id matches a child are linked as soon as the family is open
  const learningReady = useLearning(s => s.ready);
  useEffect(() => { if (family && learningReady) useLearning.getState().linkFamily(family.members.map(m => ({ id: m.id, name: m.name }))); }, [family, learningReady]);
  // Re-open the sealed family data with the key saved on this device (the code itself is never stored).
  useEffect(() => {
    if (!familyKey || family) return;
    unlockWithKey(familyKey).then(m => (m ? useApp.getState().setFamily(m) : useApp.getState().setFamilyKey(null)));
  }, [familyKey, family]);
  useEffect(() => { document.documentElement.classList.toggle('reduced', reduced); }, [reduced]);

  if (view === 'siraj') return <SirajPreview />;
  if (view === 'tour') return booted ? <WorldTour /> : null;
  if (view === 'world') {
    return <div className="screen"><WorldWindow world={(q.get('w') || 'kassala') as WorldId} mastered={+(q.get('m') ?? 14)} total={37} /></div>;
  }
  if (view === 'perf') return <Perf />;
  if (!booted) return null;

  const needsPlayer = screen === 'path' || screen === 'map' || screen === 'passport' || screen === 'lesson';
  const shown: Screen = needsPlayer && !current ? 'entry' : screen;
  const body = {
    entry: <Entry />, guest: <Guest />, path: <Path />, map: <MapScreen />, passport: <Passport />, parents: <Parents />, perf: <Perf />, lesson: <Lesson />, family: <FamilyPage />, dev: <DevPage />,
  }[shown];
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <Backdrop />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={shown} style={{ position: 'fixed', inset: 0 }}
          initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}>
          {body}
        </motion.div>
      </AnimatePresence>
      <PlayTime />
    </MotionConfig>
  );
}
