// If anything breaks, a child never sees a white page: Siraj calmly offers to start again. Every error (render errors,
// uncaught exceptions, failed promises) is written to a small local log that parents can read in their corner.
// Nothing is ever sent anywhere.
import { Component, type ReactNode } from 'react';
import * as db from '../data/idb';

export type ErrorEntry = { t: number; msg: string; where: string };
const MAX = 20;

export async function logError(msg: unknown, where: string) {
  try {
    const text = (msg instanceof Error ? `${msg.name}: ${msg.message}` : String(msg)).slice(0, 240);
    const list = (await db.get<ErrorEntry[]>('meta', 'errors')) ?? [];
    await db.put('meta', 'errors', [{ t: Date.now(), msg: text, where }, ...list].slice(0, MAX));
  } catch { /* logging must never throw */ }
}
export const readErrors = async () => (await db.get<ErrorEntry[]>('meta', 'errors')) ?? [];
export const clearErrors = () => db.put('meta', 'errors', []);

let installed = false;
export function installErrorLog() {
  if (installed) return; installed = true;
  addEventListener('error', e => void logError(e.error ?? e.message, 'page'));
  addEventListener('unhandledrejection', e => void logError(e.reason, 'promise'));
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { void logError(error, 'screen'); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen sand oops" role="alert">
        <svg viewBox="0 0 200 200" width="180" height="180" aria-hidden>
          <circle cx="100" cy="58" r="44" fill="#FFE08A" opacity=".55" />
          <rect x="88" y="20" width="24" height="10" rx="5" fill="#C7861A" />
          <circle cx="100" cy="56" r="20" fill="#FFF3C4" stroke="#E2A43C" strokeWidth="6" />
          <rect x="70" y="78" width="60" height="14" rx="7" fill="#E2A43C" />
          <ellipse cx="100" cy="140" rx="70" ry="52" fill="#FFF4DE" />
          <ellipse cx="100" cy="144" rx="50" ry="36" fill="#1E2A50" stroke="#E2A43C" strokeWidth="6" />
          <path d="M80 140q8-10 16 0M104 140q8-10 16 0" fill="none" stroke="#FFE08A" strokeWidth="6" strokeLinecap="round" />
          <path d="M88 160q12 8 24 0" fill="none" stroke="#FFE08A" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <p className="t-h2" style={{ margin: 0 }}>حصلت لخبطة صغيرة!</p>
        <p className="t-lead soft" style={{ margin: 0 }}>تقدّمك محفوظ. يلا نبدأ من جديد.</p>
        <button className="btn big" onClick={() => location.reload()}>ابدأ من جديد</button>
      </div>
    );
  }
}
