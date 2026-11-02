# خطة العمل الليلية — بيت الخوارزمي (v2)

**Owner's latest instruction:** the requirements are a floor, not a ceiling — improvise and add whatever makes the game better, more fun, clearer or safer for kids, measured against the best benchmark apps; fix gaps even if the owner never mentioned them; list every addition in the final report.

Owner approved (2026-11-03): work autonomously until tomorrow; push updates to GitHub repo ambsa1/omran; replace the old game at the root URL with v2 **only after tests pass**; install Playwright. Owner's only window to test is tomorrow — **stability beats quantity**. Keep a working version live at all times.

Read docs/QUALITY.md (standard + benchmarks) and docs/REQUIREMENTS.md (everything agreed with the owner — all items must be done) before any work. Family kids: ages 9 (main target), 7, 5, 3 — names and the family code exist only in local untracked files (tools/family.local.json, tools/family-code.local.txt); never write them in any published file.

## Architecture (v2/)
- `index.html` loads vendor (Blockly 13, GSAP) then js/*.js. Cache-busting `?v=N` on local files (bump on every change).
- `js/texts.js` all spoken lines (diacritized, short; `_f` = girl). `js/levels.js` tracks/levels. `js/blocks.js` Blockly blocks + tap-to-add cursor + Python generation. `js/activities.js` stages (talk/draw/path) with interface `mount() reset() exec(op)->bool result()->{ok,reason} celebrate() destroy() [layout()]`. `js/app.js` screens. `js/siraj.js` animated robot. `js/store.js` players (family data encrypted with js/crypt.js). `js/sfx.js` sounds + single-audio-element voice player.
- Voice: `node tools/voice.js "<family code from tools/family-code.local.txt>"` then `python tools/make_voice.py` (Egyptian voice). Family code: see tools/family-code.local.txt (local only).
- Computer World lives in `js/cw/` + `css/cw.css` and registers `window.CW` (see contract below).

## Computer World contract
`window.CW = { sections: [{ id, name, icon, color, activities: [{ id, name, icon, minAge, mount(el, ctx) -> { destroy() } }] }] }`
ctx = `{ player, color, say(key, text), play(seq), sfx: Sfx, siraj: Siraj, fx: FX, win(stars), back() }`. Activities write their spoken lines into `js/cw/texts.js` (`window.CW_TEXTS = { key: diacritized text }`, keys prefixed `cw_`); tools/voice.js includes them. Progress key: `cw:<activityId>`.

## Phases & status
| # | Task | Status |
|---|---|---|
| 0 | QUALITY.md, PLAN.md | done |
| 1 | Playwright test harness (content checks, scripted playthrough, multi-viewport screenshots, console errors) | todo |
| 2 | Programming expansion: lights track, memory boxes (variables), teach-a-word (functions), bug hunt presets, Python lab (typed code, age 8+) | todo |
| 3 | Computer World: intro, parts, little hands (mouse/touch), typing school (AR+EN), internet safety, how computers think | todo |
| 4 | PWA: manifest, icons/logo, service worker (offline), storage persist | todo |
| 5 | Review rounds ×3–4 (independent agents, score vs QUALITY.md, fix ≥8) | todo |
| 6 | Replace root with v2 (keep v1 under /v1/), final Arabic report REPORT.md | todo |

## Log
- (append short entries here after each milestone so work can resume after context compaction)
- Lead: REQUIREMENTS.md written (all agreed items R1–R26). Test harness tests/run.js (levels + 8 viewports screenshots), SirajTest hooks in app.js (?test=1). Reference solutions for 16 levels → ALL OK.
- Lead: PWA done — v2/sw.js (cache name from precache.js hash), v2/tools/precache.js (run before every push), manifest.webmanifest, index.html registers SW (not in test mode). tests/offline.test.js passes (home + voice offline).
- Lead: 3 agents launched in parallel: programming expansion (levels/blocks/activities/texts/app level code), Computer World (js/cw/*, exposes window.CW.render — lead wires the 💻 door), platform (store/parents/extras/encyclopedia/certificates/stickers/logo+icons).
- Final step plan for root URL: replace root index.html with redirect to ./v2/ and root sw.js with a kill-switch SW (unregister + clear caches) so phones with the old v1 installed get the new game.
- Platform agent: DONE R8–R10, R18–R23. js/store.js v2 (time today/total + addTime, PIN hash with Arabic/Persian digits, seen flags, certs, `cw:<id>` keys + cwWin/cwSolved, export/import with merge = best result per key, match by id or family fid, backupDue 7 days, persist(), full normalisation; corrupt JSON copied to `khwarizmi.v1.corrupt`). js/parents.js (math gate → PIN, harder gate for forgot-PIN, per-child stats, reset/delete with in-app confirm, voice, daily limit off/15/30/45/60/90 default 30, backup/share/export-one/import, family code, iOS + backup notices). js/extras.js + js/extras-texts.js (`x_` voice keys, `en_` English keys) + css/extras.css: encyclopedia «موسوعتي» (35 entries; unlock by level blocks/track id/typed-Python tokens or CW activity ids; a level/activity can declare `learn: ['for', …]`; entries with no related content unlock by default), gendered titles (8, by stars), stickers (1 per 4 stars, 40), certificates per track and per CW section (canvas 1400×1000, save only), family corner (family stars + lamp city per kid, no ranking), break reminder + reward queue shown ONLY on map screens (`sections|tracks|ency|stickers|certs|family`; the CW screen 'cw' is never interrupted), red dot on 🔒 when a backup is due. Logo: home lockup (Siraj standing on a gold roof + wordmark) and icons/logo.svg → `node tools/make_icons.js` makes icon-192/512, maskable-512, apple-touch-icon, favicon-32. app.js hooks only: Extras.onScreen in screen(), logo/homeExtra in renderHome, titleChip/sectionsRow in renderSections, ACT.parents → Parents.open, `window.App` export. tools/voice.js adds EXTRA_TEXTS + dedupes keys; make_voice.py supports `lang: 'en'` (en-US-GuyNeural). tests/platform.test.js (port 8797) → ALL OK (32 checks); screenshots tests/shots/platform-*.png (family names blurred).
