"""The school page's book list: the names of the textbooks actually present in app/المناهج/school books, per grade (names only).
usage: python tools/school-books.py  ->  src/data/school-books.json"""
import json, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..', 'المناهج', 'school books')   # «منهج قديم» (old curriculum) is not listed
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'school-books.json')
GRADES = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']
# subject key, shown name, keywords (first match wins)
SUBJECTS = [
    ('arabic', 'اللغة العربية', ['العربية']), ('islamic', 'التربية الإسلامية', ['الاسلامية', 'الإسلامية']),
    ('math', 'الرياضيات', ['الرياضيات']), ('english-act', 'الإنجليزي: كتاب النشاط', ['النشاط']),
    ('english', 'اللغة الإنجليزية', ['الانجليزي', 'الانجليزية', 'الإنجليزية']), ('science', 'العلوم', ['العلوم']),
    ('history', 'التاريخ', ['التاريخ']), ('geography', 'الجغرافيا', ['الجغرافيا']), ('earth', 'الأرض بيئة الحياة', ['الارض']),
    ('art', 'التربية الفنية', ['الفنية', 'الفينة']), ('ict', 'تكنولوجيا المعلومات', ['تكنولوجيا']),
    ('resources', 'المورد', ['المورد']), ('clothes', 'ملبسنا', ['ملبسنا']),
]
out = {}
for g, folder in enumerate(GRADES, 1):
    d = os.path.join(ROOT, folder); books = []
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if not f.lower().endswith('.pdf') or os.path.getsize(os.path.join(d, f)) < 10000: continue
        key, name = next(((k, n) for k, n, ws in SUBJECTS if any(w in f for w in ws)), (None, None))
        if not key: print('unknown subject:', f); continue
        if key not in [b['key'] for b in books]: books.append({'key': key, 'name': name})
    order = [s[0] for s in SUBJECTS]; order.remove('english-act'); order.insert(order.index('english') + 1, 'english-act')   # the pupil's book first
    out[str(g)] = sorted(books, key=lambda b: order.index(b['key']))
    print(folder, len(out[str(g)]), [b['name'] for b in out[str(g)]])
json.dump(out, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
