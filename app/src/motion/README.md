# Motion engine and library (خوارزمي)

One engine, one library, one light data file per explainer. No book has its own animation code.

## Parts
- `types.ts` – the data format (`MotionDoc` → `Scene` → `layers` + `items`). Read this first.
- `cues.ts` – turns cue words into times from the narration's word-timing file; lists the effects and their times.
- `library.tsx` – every reusable piece (`LayerView` + `ItemView`), rendered by `SceneView`.
- `Gallery.tsx` – `?view=motion` shows every template with sample data (review the library after any change).
- The player (`screens/Explainer.tsx`) loads `public/school-data/<book>/<explain>.motion.json`, resolves the cues and
  plays scenes, effects (ducked under the narration) and captions.

## Library (layers)
| kind | what it shows |
|---|---|
| items (`Item`) | a drawing placed by centre and size, entrance (`a`), extra target (`to`), loop, later moves (`at`), a flight (`fly`), a chip background |
| `ground` | sand ground, optional Nile river |
| `stars` | night stars (with `night: true` on the scene) |
| `road` | a winding road with stations lit on their cues, labels, last station as exam |
| `ring` / `aura` | a gathering circle / a soft halo |
| `term` | the lesson term, big, in Nile blue |
| `plank` / `group` | a table / a sorting circle with a label |
| `path` | a drawn dotted path |
| `drops` | falling water drops between two cues |
| `sparkles` | twinkles on given points |
| `book` | the real book cover opening |
| `button` | the «لنبدأ»-style button |
| `title` | title screen (picture, title, line) |
| `card` | concept card (picture, term, short text) |
| `steps` | numbered sequential steps |
| `compare` | two-column comparison |
| `labels` | labels on a diagram (with an item as the picture) |

## Rules (cumulative growth)
1. A new explainer is a new `.motion.json` using the library first.
2. A movement the library lacks is added here as a GENERAL layer or option (with a sample in `Gallery.tsx`), never as
   code for one book; every book can use it at once.
3. A better entrance, transition or scene REPLACES the old one in the library, so all books improve together.
4. Pictures are original identity-style drawings (`tools/school-art.py`); text in scenes comes from the book file.
