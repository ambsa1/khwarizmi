# خوارزمي (Khwarizmi) — handoff for the next session

Arabic (Sudanese) learning app for children: Vite + React + TypeScript, three.js via react-three-fiber, zustand
(persist key `khawarizmi.v2`), IndexedDB, PWA. App lives in `app/`. Reply to the user in Arabic; follow the
mixed-text rule (no English word or number at the start/end of an Arabic line; commands/paths on their own line).

- Branch: `rebuild/phase1` (pushed). Live: https://ambsa1.github.io/khwarizmi/ (deployed from `main` by `npm run deploy`).
- Last shipped commit: `a06ff8a` (2026-11-19). Checks 42/42 locally and on the live site.

## How to work
- `cd app && npm run release` = validate, packs, build, preview, `tools/check.mjs` (42 checks). Must print `42/42 passed`.
- Commit and deploy ONLY when every check passes: `grep -q "N/N passed" log && git commit ...`, then `npm run deploy`
  (refuses a dirty tree), then `node tools/check.mjs https://ambsa1.github.io/khwarizmi/` on the live site.
- Dev server: `npx vite --host 127.0.0.1 --port 5186 --strictPort` (in `app/`). Stop background servers at session end.
- Screenshots: `W=<world> STOPS=3,8 node tools/town-shots.mjs http://127.0.0.1:5186/ <outDir>`; `?view=world&w=<id>&m=<n>`.
- Bash heredocs with quotes often break: write Python/Node helper scripts to the scratchpad and run them.
- Python: `ingest/.venv/Scripts/python.exe`. Playwright: `v2/tests/node_modules/playwright`.

## Standing rules (never break)
- `private/` (children's photos, family data, family/dev codes, dev email, review shots) stays out of git. Never copy a
  child/family photo into `app/public` or `app/src` unencrypted; family images ship only sealed (`public/family/*.bin`,
  AES-GCM via `tools/seal-family.mjs`) and are decrypted on the device after the family code.
- Codes are never written in the repo or stored on the device in clear: family activation word + parents' personal PIN
  (wraps the key), developer code (only a PBKDF2 hash ships). The values are in `private/*.txt`.
- Reference images (Google/Esri/Wikimedia) stay in `private/references`; no satellite pixels in the app.
- Public screenshots/videos use guest mode only; family shots go to `private/shots`.
- Never send the user's email to external services from scripts.
- Low-tier phone budget for all 6 worlds: <= 80 draw calls, <= 150,000 triangles, 30 fps. Kassala is at ~149.5k
  (tight): any addition to Kassala needs a cut elsewhere.
- On-screen text >= 18px; the validator forbids words like خطأ / غير صحيح in child-facing text.

## State of the app (done)
- Six worlds (kassala, saqiya, mogran, suakin, meroe, marra) from real data; revival shader (`three/town/revive.ts`).
- World scene (`three/town/KassalaTown.tsx`): Siraj at scale 2.6 with a ground glow; trees in the corridor Siraj->camera
  shrink (`clear` revive option, `uClear` uniform); `PathGlow` lights the path gold/green up to Siraj's feet;
  `DroneRig` eases position, look point, pitch and zoom (no swing-round after a lesson, a gentle pull-back instead).
- Siraj (`three/Siraj.tsx`): jointed arms from the shoulders (sleeve colour per outfit, `SLEEVE` in `outfits.tsx`),
  calm breathing idle.
- Family mode: activation word -> parents create a personal code -> asked every later time; only the four children.
  Inside family mode the parents' corner is «بيتنا» (`OurHome` in `screens/Others.tsx`): sealed group picture as a
  masked lavender banner + a progress card per child.
- Developer panel (`screens/Gates.tsx`): hold the version line 4 s; grouped errors with repeat count, archive tab for
  older versions, live copyable Claude Code prompt. Supabase via REST (`cloud/`), insert-only for visitors.
- Layout watchdog (`cloud/watchdog.ts`): reports horizontal overflow / clipped text with screen, element, viewport.
- Desktop (>= 768px): centred menu modals; columns/modals widened to 900px (`styles/theme.css`, end of file).

## NEXT TASK (pending, not started)
**Full-width desktop layout + warm-sand colour harmony.**
- Full-width desktop layout: desktop screens should use the full width instead of narrow centred
  columns (the current state is 900px max-width columns for parents/«بيتنا»/dev panel/modals).
- Warm-sand colour harmony: bring colours into one warm-sand palette (e.g. «بيتنا» currently uses a lavender
  page gradient and banner tint, `.parents:has(.our-home)` and `.our-banner::after` in theme.css).
- Exact specs were not given yet: confirm the details with the user before building, then run all checks, deploy,
  and check the live site.

## Waiting on the user
- Darfur outfit for Marra (Siraj wears the Nile outfit there until the user sends Darfur reference photos).
