// Back navigation that matches the browser / device back button.
// Every screen change adds one history entry; every open modal (menu, its pages, stamp sheet, confirmations) adds one
// too. The device back button closes the top modal first, then walks back through the screens. The on-screen back
// buttons call back(): with history to return to they go back exactly like the device button, otherwise they open the
// given fallback screen. The URL never changes (the installed app always opens on "who's playing?").
import { useEffect, useRef } from 'react';
import { useApp, type Screen } from '../state/store';

type Entry = { k: 'khw'; screen: Screen; d: number; modal?: string };
type Modal = { id: string; close: () => void; closed: boolean };

let depth = 0, fromPop = false, ignorePops = 0;
const modals: Modal[] = [];

export function installNav() {
  history.replaceState({ k: 'khw', screen: useApp.getState().screen, d: 0 } satisfies Entry, '');
  useApp.subscribe((s, p) => {
    if (s.screen === p.screen) return;
    if (fromPop) { fromPop = false; return; }
    depth++;
    history.pushState({ k: 'khw', screen: s.screen, d: depth } satisfies Entry, '');
  });
  addEventListener('popstate', e => {
    const st = e.state as Entry | null;
    depth = st?.k === 'khw' ? st.d : 0;
    if (ignorePops > 0) { ignorePops--; return; }            // our own back() after a modal closed itself
    if (modals.length) { const m = modals.pop()!; m.closed = true; m.close(); }
    const target = st?.k === 'khw' ? st.screen : 'entry';
    if (target !== useApp.getState().screen) { fromPop = true; useApp.getState().go(target); }
  });
}

/** an on-screen back button: the same as the device back button, or the fallback screen when there is no history */
export function back(fallback: Screen) {
  if (depth > 0) history.back();
  else useApp.getState().go(fallback);
}

/** while `open`, the device back button closes this modal (call the returned function from the modal's own buttons) */
export function useModalBack(open: boolean, onClose: () => void) {
  const ref = useRef(onClose); ref.current = onClose;
  useEffect(() => {
    if (!open) return;
    const m: Modal = { id: Math.random().toString(36).slice(2), close: () => ref.current(), closed: false };
    modals.push(m); depth++;
    history.pushState({ k: 'khw', screen: useApp.getState().screen, d: depth, modal: m.id } satisfies Entry, '');
    return () => {
      const i = modals.indexOf(m); if (i >= 0) modals.splice(i, 1);
      // closed from inside (button, scrim, Escape): drop its history entry quietly
      if (!m.closed && (history.state as Entry | null)?.modal === m.id) { ignorePops++; history.back(); }
    };
  }, [open]);
}
