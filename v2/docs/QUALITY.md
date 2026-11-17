# معيار الجودة — خوارزمي

Every reviewer scores each dimension 1–10. A part ships only when **every dimension ≥ 8**.

## Benchmarks (what "professional" means here)
| Area | Benchmark app | What we match |
|---|---|---|
| Pre-readers (3–5) | ScratchJr, codeSpark Academy | icon-only, tap = instant effect, zero reading needed, no fail states that block |
| Readers (6–9) programming | Blockly Games, Code.org CS Fundamentals, Kodable | one new idea per level, real code visible, smooth difficulty, hints that unblock |
| Polish / fun | codeSpark, Kodable, Lightbot | living character, juicy feedback on every tap, celebration, consistent art |
| Typing | TypingClub, BBC Dance Mat Typing | on-screen keyboard, finger colours, next-key glow, tiny steps, mastery gates |
| Internet safety | Google Interland / Be Internet Awesome | short scenarios, choose the safe action, positive tone |

## Dimensions
1. **Clarity without reading** — every screen understandable from icons + one short spoken line.
2. **Learning** — exactly one new idea per level; real Python visible (ages 7+); concepts never contradict (e.g. `right()` always means turn).
3. **Fun / juice** — every tap gives sound + motion; wins celebrate; failures are gentle and point at the exact problem.
4. **Voice** — Egyptian male voice (ar-EG-ShakirNeural), diacritized Fusha, ≤ 8 words per line, never two clips overlapping, never the same line twice in a row by accident, gendered variants (_f) where the line addresses the child.
5. **Visual polish** — one palette (night blue → warm lamp gold), Baloo Bhaijaan headings + Tajawal body, consistent radii/shadows, no text overflow, no clipped controls at 320–1366 px wide, portrait & landscape.
6. **Robustness** — no console errors; navigating away mid-animation never breaks state; double taps safe; corrupt storage never white-screens; works offline after first load.
7. **Performance** — smooth on cheap Android (no heavy filters in loops, DPR capped at 2), total size < 30 MB.
8. **Privacy & safety** — no child names in published files (family data encrypted), no external links for kids, no data leaves the device.

## Hard checklist (automated where possible — see tests/)
- [ ] every level solvable by its reference solution; stars correct
- [ ] every voice key used in code exists in voice/list.js; no Arabic voice line contains Latin letters
- [ ] screenshots at 320×568, 360×640, 375×812, 414×896, 640×360 (landscape), 768×1024, 1024×768, 1366×768 — Run button and toolbox visible, nothing clipped
- [ ] zero console errors through a full scripted playthrough
- [ ] offline: service worker caches app shell, vendor, fonts, voice
