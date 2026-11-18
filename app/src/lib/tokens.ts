// The design tokens live in content/design/tokens.json (validated + contrast-checked by `npm run validate`).
// This module turns them into CSS custom properties so CSS and 3D code read the same values.
import tokens from '../../../content/design/tokens.json';

export const T = tokens;
export type WorldId = keyof typeof tokens.worlds;
export const C = tokens.color;

export function applyTokens(root: HTMLElement = document.documentElement) {
  const s = root.style;
  for (const [k, v] of Object.entries(tokens.color)) s.setProperty(`--c-${k}`, v);
  for (const [k, v] of Object.entries(tokens.radius)) s.setProperty(`--r-${k}`, `${v}px`);
  tokens.space.forEach((v, i) => s.setProperty(`--s-${i}`, `${v}px`));
  s.setProperty('--touch-little', `${tokens.touch.little}px`);
  s.setProperty('--touch-big', `${tokens.touch.big}px`);
  s.setProperty('--depth-button', `${tokens.depth.button}px`);
  s.setProperty('--depth-card', `${tokens.depth.card}px`);
  for (const [k, v] of Object.entries(tokens.motion)) s.setProperty(`--m-${k}`, `${v}ms`);
  for (const t of tokens.type.scale) {
    s.setProperty(`--t-${t.id}-size`, `${t.size}px`);
    s.setProperty(`--t-${t.id}-line`, `${t.line}px`);
  }
}
