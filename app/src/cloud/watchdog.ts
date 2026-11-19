// Layout watchdog: a light background check (a few times a minute, and shortly after the screen or window size
// changes) for two layout faults on any screen size:
//   - the page is wider than the window (horizontal scroll),
//   - text clipped inside a box that hides overflow.
// Each fault is reported once per session as a structured layout issue (screen, element, sizes, viewport). Only tag and
// class names are sent, never on-screen text (which may hold the children's names).
import { useApp } from '../state/store';
import { reportError } from './cloud';

const seen = new Set<string>();
const describe = (el: Element) => {
  const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '';
  return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
};

function report(kind: string, el: string, detail: string) {
  const screen = useApp.getState().screen, vp = `${innerWidth}x${innerHeight}`;
  const key = `${kind}|${screen}|${el}|${vp}`;
  if (seen.has(key)) return;
  seen.add(key);
  reportError(`Layout: ${kind} on screen "${screen}" at ${el} (${detail}) viewport ${vp}`, 'layout');
}

export function checkLayout() {
  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth + 1) {
    // find the widest culprit so the report points at something fixable
    let worst: Element | null = null, max = root.clientWidth;
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > max + 1 || r.left < -1) { const w = Math.max(r.right, root.clientWidth - r.left); if (w > max) { max = w; worst = el; } }
    }
    report('horizontal overflow', worst ? describe(worst) : 'html', `scrollWidth ${root.scrollWidth} > clientWidth ${root.clientWidth}`);
  }
  const els = document.body.querySelectorAll('h1, h2, h3, p, b, span, label, button, .chip, .topbar-title');
  for (let i = 0; i < els.length && i < 600; i++) {
    const el = els[i] as HTMLElement;
    if (!el.offsetParent || !el.textContent?.trim()) continue;
    if (el.scrollWidth <= el.clientWidth + 2 && el.scrollHeight <= el.clientHeight + 2) continue;
    const cs = getComputedStyle(el);
    const hidesX = cs.overflowX === 'hidden' || cs.overflowX === 'clip', hidesY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    if ((hidesX && el.scrollWidth > el.clientWidth + 2) || (hidesY && el.scrollHeight > el.clientHeight + 2)) {
      report('clipped text', describe(el), `scroll ${el.scrollWidth}x${el.scrollHeight} > box ${el.clientWidth}x${el.clientHeight}`);
    }
  }
}

export function installLayoutWatchdog() {
  let t = 0;
  const soon = () => { clearTimeout(t); t = window.setTimeout(() => { try { checkLayout(); } catch { /* never disturb the child */ } }, 1500); };
  addEventListener('resize', soon);
  useApp.subscribe((s, p) => { if (s.screen !== p.screen) soon(); });
  setInterval(soon, 20000);
  soon();
}
