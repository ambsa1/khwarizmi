# خوارزمي (Khwarizmi) — handoff for the next session

Arabic (Sudanese) learning app for children: Vite + React + TypeScript, three.js via react-three-fiber, zustand
(persist key `khawarizmi.v2`), IndexedDB, PWA. App lives in `app/`. Reply to the user in Arabic; follow the
mixed-text rule (no English word or number at the start/end of an Arabic line; commands/paths on their own line).

- Branch: `rebuild/phase1` (pushed). Live: https://ambsa1.github.io/khwarizmi/ (deployed from `main` by `npm run deploy`).
- Last shipped: 2026-11-22, «المدرسة» grade 5 science phase 1 (book page, first explainer, lessons 1-2) + the motion
  engine. Checks 55/55. Waiting on the owner's review before building the rest of the book.

## How to work
- `cd app && npm run release` = validate, packs, build, preview, `tools/check.mjs` (55 checks). Must print `55/55 passed`.
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
- Low-tier phone budget for all 6 worlds: <= 80 draw calls, <= 150,000 triangles, 30 fps. Kassala is at ~148.5k and
  75 calls (tight): any addition to Kassala needs a cut elsewhere.
- On-screen text >= 18px; the validator forbids words like خطأ / غير صحيح in child-facing text.

## State of the app (done)
- Six worlds (kassala, saqiya, mogran, suakin, meroe, marra) from real data; revival shader (`three/town/revive.ts`).
- World scene (`three/town/KassalaTown.tsx`): Siraj at scale 3.3 with a ground glow; trees in the corridor Siraj->camera
  shrink (`clear` revive option, `uClear` uniform); `PathGlow` lights the path gold/green up to Siraj's feet;
  `DroneRig` eases position, look point, pitch and zoom (no swing-round after a lesson, a gentle pull-back instead).
- Civic landmarks (`CIVIC`, `CIVIC_OF_WORLD`, `CIVIC_LIGHTS` in `three/town/kits.ts`; `civicSites` + `Civic` in
  KassalaTown.tsx): Kassala park/mosque/market+school/hospital beside the last station of their district; Suakin port
  market/clinic/arched house/coral mosque at half size. They rise with the revival, lights come on when built; the small
  houses and yard trees under them are left out. Placement is computed at runtime (clear of stations, path, water).
- Siraj (`three/Siraj.tsx`): jointed arms from the shoulders (sleeve colour per outfit, `SLEEVE` in `outfits.tsx`),
  calm breathing idle.
- Family mode: activation word -> parents create a personal code -> asked every later time; only the four children.
  Inside family mode the parents' corner is «بيتنا» (`OurHome` in `screens/Others.tsx`): sealed group picture as a
  banner melting into the sand page + a progress card per child.
- Developer panel (`screens/Gates.tsx`): hold the version line 2.5 s; grouped errors with repeat count, archive tab for
  older versions, live copyable Claude Code prompt. Supabase via REST (`cloud/`), insert-only for visitors.
- Layout watchdog (`cloud/watchdog.ts`): reports horizontal overflow / clipped text with screen, element, viewport.
- Desktop (>= 768px): every page/panel/modal spans the full width with side padding `--side: clamp(20px, 3vw, 48px)`;
  cards spread in auto-fill grids (`styles/theme.css`, end of file). «بيتنا» uses the warm sand palette
  (#F4E8D1/#ECD9B8 page, #FAF2E1 cards, soft gold borders); the purple banner melts into the sand.
- Navigation (`ui/nav.ts`): every screen change and every open modal is a history entry; device/browser back closes the
  top modal, then walks back through screens. On-screen back buttons (`.back-btn`, top right) call `back(fallback)`;
  modals use `useModalBack(open, onClose)`.
- Entry: one tap on the lock opens the parents' corner («بيتنا» in family mode). Secret gates are silent 2.5 s holds
  (Siraj -> family, version line -> developer), no ring. Guests can be removed (× then confirm) on "who's playing?" and
  in the public parents' corner.

- Backgrounds (`ui/Backdrop.tsx`, `styles/backdrop.css`): one fixed layer behind every screen: 3-tone base gradient +
  light pools + embossed Sudanese ink icons (tiles `public/art/heritage/*.webp`) + paper grain. General screens show all
  four regions (`all`); journey/lesson show the world's region (east: kassala/suakin, north: saqiya/meroe, centre:
  mogran, west: marra) with per-world colours (`data-world`). «بيتنا» = sand (`data-home`); rest time = night sheet.
  Icons come from sprite sheets and are laid out per screen size (whole icons, none cut at an edge), opacity ~.3.
  Geometric bands (`--band-thin`, `--band-rich`): crown key cards, frame the certificate, run along the entry foot.
  Rebuild tiles: `node tools/heritage-render.mjs ../identity/_build/masks` then
  `python tools/heritage-tiles.py ../identity/_build/masks` (each tile must stay < 250 KB).
- Design folder `identity/` and the original pictures `all photo/` are local only (excluded via `.git/info/exclude`).
- Guest pictures (`public/art/avatars/g1..g12, new, boy, girl.webp`, imported by `tools/import-avatars.py`): 6 boys + 6
  girls in two bands (young = kindergarten-grade 2, older = grade 3-6), `ui/GuestAvatars.tsx`. New player
  (`screens/Guest.tsx`): boy/girl cards -> grade cards + kindergarten button (age = grade + 6, kindergarten = 5) ->
  all six pictures of that gender in a snap strip starting on the child's band (continuous scale with the finger,
  pop sound, light vibration; arrows on desktop) + optional name. Grade label shows in the top bar, passport,
  certificate (`gradeLabel` in `ui/kit.tsx`). Layout polish: `styles/polish.css` (loaded last).

## School books («المدرسة», grade 5 science first)
- Content source: the book file `app/المناهج/<grade>/<book>/<book>.md` (local only). Rules: `app/المناهج/ملاحظات-صاحب-التطبيق.md`
  (section ٧: decision limits; item ٨: ALWAYS re-read a file from disk and edit only the needed part, several parties edit them),
  `مسار-الطفل-والتنفيذ.md`, `دليل-إنتاج-كتاب.md`, `الصوت/خريطة-المؤثرات.md`.
- `python tools/book-data.py` (ingest venv) builds `public/school-data/<book>/` (book.json, narration copy, timing, real cover)
  from the book file. NOTE: `.gitignore` has `books/`, so app data lives in `school-data/`, never `books/`.
- Code: `src/school/` (book data, progress + the ONE unlock rule, sfx bank player, questions, labs), screens `BookPage`,
  `Explainer`, `BookLesson`; styles `styles/school.css`. Review: `?demo=guest&grade=5&screen=book&dev=1` (dev opens every
  built stage and allows seeking); `&screen=explain|blesson&stage=e1|d1`.
- Motion engine (owner decision 2026-11-22): `src/motion/` (README.md) = one engine + one library of general layers;
  every explainer is only `public/school-data/<book>/explainN.motion.json`. New movement -> a general layer in the
  library (+ sample in `?view=motion`); improvements replace the old version for all books. No per-book animation code.
- Drawings: original identity-style SVGs from `tools/school-art.py` -> `public/art/school/` (never emoji libraries).
- Effects: `tools/sfx/{plan,generate,select}.py` (ElevenLabs text-to-sound; key read from the grow-english generator
  .env, never printed) -> `public/sfx/<kind>/` + `index.json`. Tell the owner the count and cost before generating.
- On-screen text >= 18px also in the school screens; «خطأ» is forbidden in child text (true/false cards: «صحيح» / «ليس كذلك»).

## NEXT TASK
Owner reviews grade 5 science phase 1 (deliverables in `Claude outputs/مراجعة-علوم-الخامس/`). After approval: lessons 3-18
(once converted to Fusha in the book file), the two exams, the second explainer, the title. Never send «بيتنا» material to an outside tool.

## Waiting on the user
- Darfur outfit for Marra (Siraj wears the Nile outfit there until the user sends Darfur reference photos).
