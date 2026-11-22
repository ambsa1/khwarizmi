"""Pick the best candidates, clean them and write the app's sound bank + index (خريطة-المؤثرات.md, section 4).
Per effect: measure every candidate (sound length, silence at the start/end, peak, loudness, brightness), keep the
cleanest; for effects with several close variants drop the candidate farthest from the others. Then trim the silence,
add tiny fades (no clicks), match loudness per kind, encode small MP3s into app/public/sfx/<kind>/ and write index.json."""
import glob, json, os, subprocess, sys
import numpy as np, soundfile as sf, pyloudnorm as pyln
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan import ALL

CAND = r'C:\Users\ambsa\sfx-work\cand'; TMP = r'C:\Users\ambsa\sfx-work\tmp'; os.makedirs(TMP, exist_ok=True)
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'sfx')
TARGET = {'ui': -24.0, 'lesson': -22.0, 'celebrate': -17.0, 'motion': -21.0}   # LUFS; motion is ducked under the narrator
BITRATE = {'ui': '64k', 'lesson': '64k', 'celebrate': '112k', 'motion': '80k'}
SR = 44100
# where each motion effect is used (explainer 1, science grade 5): part number and the word that starts the scene
USED = {
    'welcome-chime': '1 «أهلًا»', 'book-open': '1 «كتاب العلوم»', 'path-extend': '1 «رحلة»', 'sparkles': '1 «أسرار»، 7 «استمتعوا»',
    'tree-grow': '2 «شجرة نيم»', 'bird-land': '2 «عصفور»', 'fish-splash': '2 «سمكة»', 'soft-pop': '2 «أنتم»',
    'gather-swirl': '2 «كائنات حيّة»', 'kalimba-pluck': '2 «نأكل، ونتنفّس، ونكبر، ونحتاج»',
    'glow-shimmer': '3 «نعتني بأجسامنا»', 'plate-clink': '3 «طعامًا مفيدًا»', 'water-pour': '3 «نسقي الأشجار»', 'tap-drop': '3 «قطرة ماء»',
    'map-unroll': '4 «أربع محطّات»', 'station-ding': '4 «الأولى، الثانية، الثالثة، الأخيرة»، 7 «يضيء محطّةً»', 'breath-in': '4 «الهواء إلى الرئتين»',
    'swallow-slide': '4 «اللقمة»', 'sprout-pop': '4 «النباتات»', 'bee-buzz': '4 «الحشرات»', 'wing-flap': '4 «الطيور»', 'drop-shine': '4 «الماء… سرّ الحياة»',
    'term-thock': '5 «التصنيف»', 'table-clatter': '5 «تتشابه»', 'basket-drop': '5 «الفواكه هنا، الخضروات هناك»', 'sort-swish': '5 «النباتات والحيوانات»',
    'bat-flight': '6 «الخفّاش»', 'x-swipe': '6 «ليس طائرًا»', 'question-twirl': '6 «فماذا يكون»',
    'exam-reveal': '7 «امتحانٌ صغير»', 'twinkle-cascade': '7 «استمتعوا»', 'start-pop': '8 «هيّا»',
}

def load(p):
    out = os.path.join(TMP, 'x.wav')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', p, '-ar', str(SR), out], check=True)
    a, _ = sf.read(out, dtype='float32', always_2d=True); return a

def edges(a, thr_db=-48):
    env = np.abs(a).max(axis=1); hop = int(SR * 0.005); n = len(env) // hop
    db = 20 * np.log10(env[:n * hop].reshape(n, hop).max(axis=1) + 1e-9); on = np.where(db > thr_db)[0]
    if not len(on): return 0, len(a)
    return on[0] * hop, min(len(a), (on[-1] + 1) * hop)

def measure(p, want):
    a = load(p); s, e = edges(a); x = a[s:e].mean(axis=1)
    if len(x) < SR * 0.05: return None
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))); f = np.fft.rfftfreq(len(x), 1 / SR)
    centroid = float((spec * f).sum() / (spec.sum() + 1e-9))
    peak = float(np.abs(a).max())
    score = abs((e - s) / SR - want) * 0.6 + (s / SR) * 2 + (0.5 if peak >= 0.999 else 0)   # length fit, late start, clipping
    return {'p': p, 'a': a, 's': s, 'e': e, 'centroid': centroid, 'peak': peak, 'score': score, 'len': (e - s) / SR}

def finish(m, kind, dst):
    a = m['a'][m['s']:m['e']].copy(); n = len(a)
    fi, fo = int(SR * 0.003), int(SR * (0.012 if m['len'] < 1 else 0.08))
    a[:fi] *= np.linspace(0, 1, fi)[:, None]; a[n - fo:] *= np.linspace(1, 0, fo)[:, None]
    if kind != 'celebrate': a = a.mean(axis=1, keepdims=True)
    meter = pyln.Meter(SR, block_size=min(0.4, max(0.1, n / SR * 0.9)))
    try: lufs = meter.integrated_loudness(a)
    except Exception: lufs = -30.0
    if np.isfinite(lufs): a = a * 10 ** ((TARGET[kind] - lufs) / 20)
    pk = np.abs(a).max(); a = a * (0.89 / pk) if pk > 0.89 else a            # peak at most -1 dBFS
    tmp = os.path.join(TMP, 'y.wav'); sf.write(tmp, a, SR)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', BITRATE[kind], dst], check=True)
    return round(n / SR, 2)

index, report = [], []
for sid, kind, ar, prompt, sec, variants, _ in ALL:
    ms = [m for m in (measure(p, sec) for p in sorted(glob.glob(os.path.join(CAND, sid, '*.mp3')))) if m]
    if not ms: report.append(f'MISSING {sid}'); continue
    if variants == 1:
        chosen = [min(ms, key=lambda m: m['score'])]
    else:   # close variants: drop the farthest from the median brightness, then the worst score, until `variants` remain
        ms.sort(key=lambda m: m['score']); med = np.median([m['centroid'] for m in ms])
        while len(ms) > variants: ms.remove(max(ms, key=lambda m: abs(np.log(m['centroid'] / med)) + m['score'] * 0.3))
        chosen = ms
    d = os.path.join(APP, kind); os.makedirs(d, exist_ok=True); files, lens = [], []
    for i, m in enumerate(chosen):
        name = f'{sid}.mp3' if variants == 1 else f'{sid}-{i + 1}.mp3'
        lens.append(finish(m, kind, os.path.join(d, name))); files.append(f'{kind}/{name}')
    index.append({'id': sid, 'kind': kind, 'ar': ar, 'prompt': prompt, 'seconds': max(lens), 'files': files,
                  'used': f'شرح علوم الخامس الأول · الجزء {USED[sid]}' if kind == 'motion' else 'ثابت (كل التطبيق)'})
    report.append(f'{sid:16s} {kind:9s} {len(files)} file(s)  {", ".join(f"{x:.2f}s" for x in lens)}')
json.dump({'model': 'eleven_text_to_sound_v3', 'effects': index}, open(os.path.join(APP, 'index.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('\n'.join(report)); print(len(index), 'effects,', sum(len(e['files']) for e in index), 'files')
