# Agreed requirements (from the whole conversation with the owner) — every item must be DONE and verified

Reviewers: check each item; the final report lists every item with where it lives.

## Product & audience
- R1 Free, non-commercial family game; shareable link so other families can install, play and keep their own progress.
- R2 Runs on any device/browser (Android Chrome/Samsung, iPhone/iPad Safari/Chrome, laptops), installable (PWA), **fully offline** after first load.
- R3 Ages 3–9, one shared path, age-adaptive: 3–4 tap-and-see (little mode), 5–6 picture blocks with code hidden by default, 7+ code visible; **the eldest (9) is the main target** → deepest content incl. real typed Python.
- R4 Kids can't read well → every instruction spoken; icons first; very short lines; Egyptian male voice (ar-EG-ShakirNeural) with diacritics; no long explanations ("أحسنت، اضغط كذا").
- R5 Python keywords stay real English; Arabic explains; English code words are **pronounced in English** when a card is tapped (plus Arabic meaning).
- R6 Boy/girl forms (`_f` lines) for lines addressing the child.
- R7 No background music; sound effects only.

## Hidden family area (owner's 4 kids: 9, 7, 5, 3)
- R8 Invisible to the public; unlocked only by family code (kept only in a local untracked file) in the parents area; kids' names never in published files (encrypted).
- R9 When unlocked: 4 fixed slots on home, greeting by name, each kid's own Siraj colour, a **family corner** (family stars together — no ranking that makes the youngest feel bad), name on certificates.
- R10 Public users never feel the game is "someone else's".

## Learning content
- R11 Programming world with story: Siraj (lamp robot) brings light back to "خوارزمي" city; every solved level lights a lamp on the map.
- R12 Code is the hero: Blockly blocks show real Python; live Python panel; running line highlighted; failing line marked.
- R13 Programs make things: talk, draw (turtle), light show, memory boxes (variables), teach Siraj a new word (functions), bug hunt (debugging), adventure path; plus a Python lab where the eldest types real Python.
- R14 One new idea per level; gentle difficulty; enough levels for weeks (target ≥ 60 programming levels total).
- R15 Help system: hint after 2 failures (visual: show path / ghost block), solution offered after ~4–5 real failures; empty runs don't count as failures.
- R16 PRIMM touches: "predict" moments; use–modify–create.
- R17 Computer World section (عالم الكمبيوتر) with subsections: what is a computer; parts (screen, mouse, keyboard, box…); little hands (mouse/touch games for 3–5); **typing school** with on-screen keyboard + finger colours + next-key glow, steps from letters → numbers → words (Arabic and English); internet safety (separate subsection, scenarios); how computers think (binary, algorithms) for older kids.
- R18 In-app **encyclopedia / dictionary** ("موسوعتي"): every Python word and computer concept learned, with Arabic explanation and voice (English pronunciation for code words); unlocks as learned.

## Motivation
- R19 Stars per level (fewer blocks = more stars; little mode always 3), titles that grow with stars (gendered), celebration on every win, certificates per completed section (saveable image with name), visible progress lamps.
- R20 Rewards that are fun: Siraj colour/look; collectible stickers or similar.

## Parents & data
- R21 Parents area behind math gate + PIN (Arabic digits accepted): per-child progress, time today/total, delete/reset (confirm), voice on/off, **daily play limit** (default 30 min) with a gentle break reminder that never interrupts a level mid-run.
- R22 **Backup & move progress** between devices (export/import file; merge keeps best result); backup reminder; iOS "add to home screen" note.
- R23 Corrupt/old data never crashes; storage persistence requested.

## Quality
- R24 Professional look (logo, fonts, palette, animation) competitive with the benchmark apps in QUALITY.md.
- R25 Smooth, no bugs, no overlapping/random repeated voice, works at all screen sizes.
- R27 **Stress robustness** (owner reported this in earlier tests): rapid/double/multi taps, fast back-and-forth navigation, tapping during animations/voice/modals, rotating, switching apps — must never flicker, glitch, duplicate screens/modals, get stuck, desync state or throw errors. Verified by automated monkey testing (gremlins.js) on every screen + targeted race tests.
- R28 **Smart voice** (owner: "random repeated voice feels cheap"): one central voice policy — taps get short SFX, not speech; the same line is never replayed if it was just said (cooldown); card/key names spoken only the first few times per child until learned; instructions are not cut by lower-priority lines (priority queue: goal/instruction > result feedback > card names > ambient); no voice on every tap in typing/tap games (use SFX + occasional praise); praise varies and is rate-limited; pressing 🔊 always replays on demand.
- R26 Multiple independent review rounds (fun, learning, quality, code, voice, gaps) until every QUALITY.md dimension ≥ 8.
