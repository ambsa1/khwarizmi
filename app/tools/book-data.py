"""Book data for the «المدرسة» section, read from the book file (the only source of the stage order and the content):
  app/المناهج/الصف الخامس/علوم/علوم.md  ->  app/public/school-data/g5-science/{book.json, explain1.mp3, explain1.json, cover.webp}
Also converts the lesson / stage icons (Fluent Emoji 3D, MIT) and the scene pictures used by the explainer.
Only the stages listed in BUILT are playable; every other stage is shown locked and never opens (no placeholder content).
Usage: python tools/book-data.py"""
import json, os, re, shutil, sys
LF = chr(10)   # write text files with LF line endings (deploy compares bytes)
from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOK_DIR = os.path.join(APP, 'المناهج', 'الصف الخامس', 'علوم')
SRC = os.path.join(BOOK_DIR, 'علوم.md')
PDF = os.path.join(APP, 'المناهج', 'school books', 'الصف الخامس', 'كتاب العلوم الطبيعية الخامس اساسي السودان 2027.pdf')
OUT = os.path.join(APP, 'public', 'school-data', 'g5-science')
ART_SRC = r'C:\Users\ambsa\sfx-work\art'           # Fluent Emoji 3D PNGs (MIT, Microsoft)
ART_OUT = os.path.join(APP, 'public', 'art', 'school')
BUILT = {'e1', 'd1', 'd2'}                          # this phase: the first explainer and lessons 1-2

AR = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
def num(s): return int(s.translate(AR))
md = open(SRC, encoding='utf8').read()

def section(title_re, text=md):
    m = re.search(title_re, text, re.M)
    if not m: raise SystemExit(f'section not found: {title_re}')
    nxt = re.search(r'^#{1,3} ', text[m.end():], re.M)
    return text[m.end(): m.end() + (nxt.start() if nxt else len(text))]

def table(block):
    rows = [r for r in block.splitlines() if r.strip().startswith('|')]
    out = []
    for r in rows[2:]:
        cells = [c.strip() for c in r.strip().strip('|').split('|')]
        if cells and not set(cells[0]) <= set('-: '): out.append(cells)
    return out

def items(s): return [x.strip() for x in re.split(r'\s*·\s*', s) if x.strip()]
def ok(s): return s.endswith('✓')
def clean(s): return s.replace('✓', '').strip()
def bold(s): return re.sub(r'\*\*(.+?)\*\*', r'\1', s).strip()

# 1. lessons: number and name (section 1); icons from the «الأيقونة:» line of each lesson in section 5
lessons = [(num(r[0]), bold(r[1])) for r in table(section(r'^## ١\. '))]
s5 = md[md.index('## ٥.'): md.index('## ٦.')]
icons = {}
for m in re.finditer(r'^### د(\S+) · .*?$(.*?)(?=^### |\Z)', s5, re.M | re.S):
    ic = re.search(r'^\*\*الأيقونة:\*\*\s*(.+?)\s*·\s*`([^`]+)`', m.group(2), re.M)
    if ic: icons[num(m.group(1))] = {'ar': ic.group(1).strip(), 'file': ic.group(2).strip()}

# 2. the two journeys and the title (section 2)
s2 = section(r'^## ٢\. ')
journeys = []
for r in table(s2):
    a, b = re.findall(r'د([٠-٩]+)', r[1])[:2]
    journeys.append({'name': 'الرحلة ' + r[0], 'from': num(a), 'to': num(b)})
title = re.search(r'\*\*اللقب:\*\*\s*«([^»]+)»', s2).group(1)

# 3. the ordered stages
stages = [{'id': 'e1', 'type': 'explain', 'name': 'الشرح الأول', 'journey': 0}]
for j, jr in enumerate(journeys):
    if j == 1: stages.append({'id': 'e2', 'type': 'explain', 'name': 'الشرح الثاني', 'journey': 1})
    for n in range(jr['from'], jr['to'] + 1):
        name = dict(lessons)[n]
        stages.append({'id': f'd{n}', 'type': 'lesson', 'n': n, 'name': name, 'journey': j, 'icon': icons.get(n, {}).get('file')})
    stages.append({'id': f'x{j + 1}', 'type': 'exam', 'name': 'الامتحان الأول' if j == 0 else 'الامتحان الأخير', 'journey': j})
stages.append({'id': 'title', 'type': 'title', 'name': title, 'journey': 1})
for s in stages: s['built'] = s['id'] in BUILT

# 4. lesson content (section 5) for the built lessons
def lesson(n):
    b = re.search(rf'^### د{str(n).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))} · .*?$(.*?)(?=^---|\Z)', s5, re.M | re.S).group(1)
    play = re.search(r'^\*\*لعب:\*\*\s*(.+?)\s+—\s+(.+)$', b, re.M)
    opts = items(play.group(2))
    cards = re.findall(r'^\d+\.\s+(.+)$', re.search(r'\*\*بطاقات الشرح:\*\*(.*?)\*\*المختبر:\*\*', b, re.S).group(1), re.M)
    lab_txt = re.search(r'\*\*المختبر:\*\*(.*?)\*\*التحدي:\*\*', b, re.S).group(1)
    lab = {'text': lab_txt.strip().split('\n')[0].strip()}
    ins = re.search(r'\*\*تعليمة المختبر على الشاشة[^*]*\*\*\s*«(.+)»', lab_txt)
    if ins: lab['instruction'] = ins.group(1)
    res =re.search(r'سطر النتيجة:\s*«([^»]+)»', lab_txt)
    if res:
        lab['result'] = res.group(1)
        alt = re.search(r'\(بنسختين:\s*\{([^|}]+)\|([^}]+)\}\)', lab_txt)   # e.g. (بنسختين: {سحبتَ|سحبتِ})
        if alt: lab['result'] = lab['result'].replace(alt.group(1), '{' + alt.group(1) + '|' + alt.group(2) + '}')
    st = table(lab_txt)
    if st: lab['stations'] = [{'name': r[1], 'card': r[2], 'result': r[3]} for r in st]
    end = re.search(r'سطر ختام:\s*«([^»]+)»', lab_txt)
    if end: lab['closing'] = end.group(1)
    ch_block = re.search(r'\*\*التحدي:\*\*(.*?)(?=\*\*التلميح|\*\*الخلاصة:\*\*)', b, re.S).group(1)
    challenge = []
    for r in table(ch_block):
        kind, q, cells, ans = r[1], r[2], r[3], r[4]
        c = {'type': kind, 'q': q}
        if kind == 'رتّب': c['order'] = items(cells)
        elif kind == 'وصّل':
            left, right = cells.split('↔'); c['pairs'] = list(zip(items(left), items(right)))
        elif kind == 'صنّف':
            c['items'] = items(cells); groups = []
            for g in re.split(r'\.\s*', ans):
                if ':' in g:
                    k, v = g.split(':', 1); groups.append({'name': k.strip(), 'items': [x.strip() for x in v.split('،') if x.strip()]})
            c['groups'] = groups
        elif kind == 'الشاذة':
            c['words'] = items(q); c['q'] = ''; c['odd'] = ans.strip()
            rs = items(cells.replace('السبب:', '')); c['reasons'] = [clean(x) for x in rs]; c['reason'] = next(clean(x) for x in rs if ok(x))
        else:
            cs = items(cells); c['options'] = [clean(x) for x in cs]; c['answer'] = next(clean(x) for x in cs if ok(x))
        challenge.append(c)
    hints = {}
    hb = re.search(r'\*\*التلميح[^\n]*?\*\*(.*?)(?=\*\*الخلاصة:\*\*|\Z)', b, re.S)
    if hb:   # keys: 'play', 'lab', '1'..'6'
        for r in table(hb.group(1)):
            k = r[0].strip()
            k = 'play' if k == 'لعب' else 'lab' if k.startswith('المختبر') else k.translate(AR)
            hints[k] = {'hint': r[1], 'explain': r[2]}
    summary = items(re.search(r'^\*\*الخلاصة:\*\*\s*(.+)$', b, re.M).group(1))
    return {'play': {'q': play.group(1).strip(), 'options': [clean(o) for o in opts], 'answer': next(clean(o) for o in opts if ok(o))},
            'cards': [c.strip() for c in cards], 'lab': lab, 'challenge': challenge, 'hints': hints, 'summary': summary}

# short on-screen texts of section 5 (written by Claude Code, marked for review in the book file)
UI_KEYS = {'مراحل الدرس (التصميم الجديد، ٢٢ نوفمبر)': 'stages', 'تعليمة «توقّع»': 'predict', 'تعليمة التتبّع في «اكتشف»': 'trace', 'تعليمة اللمس في «اكتشف»': 'tap',
           'تعليمة الضغط في «اكتشف»': 'hold', 'جولة الإتقان في «تحدَّ»': 'retry', 'تعليمة «تذكّر»': 'recall', 'شاشة الإتقان': 'mastery',
           'شاشة إنجاز الدرس': 'done', 'تعليمة «وصّل»': 'match', 'تعليمة «صنّف»': 'classify', 'الخطوة الأولى في «الشاذة»': 'odd1', 'الخطوة الثانية في «الشاذة»': 'odd2'}
ui = {}
for m in re.finditer(r'^>\s*-\s*(.+?):\s*«(.+)»\s*$', s5, re.M):
    if m.group(1).strip() in UI_KEYS: ui[UI_KEYS[m.group(1).strip()]] = m.group(2)

book = {'id': 'g5-science', 'ui': ui, 'grade': 5, 'subject': 'science', 'name': 'العلوم', 'title': title, 'cover': 'cover.webp',
        'journeys': [j['name'] for j in journeys], 'stages': stages,
        'explain': {'e1': {'audio': 'explain1.mp3', 'timing': 'explain1.json', 'motion': 'explain1.motion.json'}},   # motion: written by hand, played by src/motion
        'lessons': {f'd{n}': lesson(n) for n in (1, 2)}}
os.makedirs(OUT, exist_ok=True)
json.dump(book, open(os.path.join(OUT, 'book.json'), 'w', encoding='utf8', newline='\n'), ensure_ascii=False, indent=1)   # LF: deploy compares bytes

# 5. audio + timing (copied unchanged: the narration is never re-encoded or edited)
shutil.copyfile(os.path.join(BOOK_DIR, 'الصوت', 'شرح1.mp3'), os.path.join(OUT, 'explain1.mp3'))
open(os.path.join(OUT, 'explain1.json'), 'w', encoding='utf8', newline=LF).write(   # same data, LF line endings
    open(os.path.join(BOOK_DIR, 'الصوت', 'شرح1-توقيت.json'), encoding='utf8').read())

# 6. the real cover (first page of the book)
cover = os.path.join(OUT, 'cover.webp')
if not os.path.exists(cover):
    import fitz
    pg = fitz.open(PDF)[0]; pix = pg.get_pixmap(dpi=110)
    im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples); im.thumbnail((520, 740)); im.save(cover, 'WEBP', quality=82)

# icons and scene pictures are original drawings in the identity style: tools/school-art.py -> public/art/school/*.svg
missing = [s['icon'] for s in stages if s.get('icon') and not os.path.exists(os.path.join(APP, 'public', s['icon']))]
if missing: print('icons not drawn yet:', missing)
print('stages', len(stages), '| built', sorted(BUILT), '| icons', len(icons), '| hints', {k: len(v['hints']) for k, v in book['lessons'].items()})
