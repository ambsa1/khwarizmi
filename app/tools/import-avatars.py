"""Import the generated guest pictures (C:/Users/ambsa/عمران/all photo) into the app as WebP.
usage: python tools/import-avatars.py "<photoDir>" [previewPng]
  portraits: 512x512, the face inside the central 70% circle (the app crops them round in a gold ring), < 40 KB
  new guest: 512x512 (the open courtyard door)
  boy / girl cards: 640x800 (4:5), clean bottom third for the label
Crop boxes are chosen per picture (left, top, size) on the source image."""
import os, sys
from PIL import Image, ImageDraw

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art', 'avatars')
os.makedirs(OUT, exist_ok=True)
# id -> (file, (left, top, size)). Bands: young = kindergarten to grade 2, older = grade 3 to 6.
PORTRAITS = {
    # boys, young
    'g1': ('Boy_holding_wooden_toy_rocket_f323417a.jpg', (338, 0, 700)),
    'g4': ('Boy_holding_architectural_ruler_0a1dc052.jpg', (338, 0, 700)),
    'g2': ('Designer (3).png', (112, 0, 820)),
    # boys, older
    'g9': ('Designer (1).png', (112, 0, 820)),
    'g3': ('Designer (5).png', (112, 0, 820)),
    'g10': ('Designer.png', (112, 0, 820)),
    # girls, young
    'g5': ('Girl_holding_paintbrush_72e00db8.jpg', (338, 0, 700)),
    'g7': ('Girl_holding_plant_sprout_de24d409.jpg', (338, 0, 700)),
    'g6': ('Girl_holding_open_storybook_28fba829.jpg', (338, 0, 700)),
    # girls, older
    'g12': ('Designer (2).png', (112, 0, 820)),
    'g8': ('Designer (4).png', (112, 0, 820)),
    'g11': ('Designer (6).png', (112, 0, 820)),
}
OTHER = {
    'new': ('Designer (7).png', (0, 0, 1024), (512, 512)),
    'boy': ('Designer (8).png', (102, 0, 820), (640, 800)),    # 4:5 box: width 820 x height 1024
    'girl': ('Designer (9).png', (102, 0, 820), (640, 800)),
}

def save(im, path, limit_kb):
    for q in (86, 80, 74, 68, 62, 56, 50):
        im.save(path, 'WEBP', quality=q, method=6)
        if os.path.getsize(path) <= limit_kb * 1024: return q
    return q

previews = []
for gid, (f, (l, t, s)) in PORTRAITS.items():
    im = Image.open(os.path.join(SRC, f)).convert('RGB').crop((l, t, l + s, t + s)).resize((512, 512), Image.LANCZOS)
    q = save(im, os.path.join(OUT, gid + '.webp'), 38)
    print(gid, f, 'q', q, os.path.getsize(os.path.join(OUT, gid + '.webp')) // 1024, 'KB')
    previews.append((gid, im))
for gid, (f, (l, t, w), size) in OTHER.items():
    src = Image.open(os.path.join(SRC, f)).convert('RGB')
    h = src.height if size[1] > size[0] else w
    im = src.crop((l, t, l + w, t + h)).resize(size, Image.LANCZOS)
    q = save(im, os.path.join(OUT, gid + '.webp'), 40 if gid == 'new' else 70)
    print(gid, f, 'q', q, os.path.getsize(os.path.join(OUT, gid + '.webp')) // 1024, 'KB')
    if gid == 'new': previews.append((gid, im))

if len(sys.argv) > 2:   # contact sheet: each portrait as the app shows it (round, 70% safe circle marked)
    S = 220; sheet = Image.new('RGB', (S * 7, S * 2), '#F1EBE3')
    for i, (gid, im) in enumerate(previews):
        a = im.resize((S - 20, S - 20)); m = Image.new('L', a.size, 0); ImageDraw.Draw(m).ellipse((0, 0, a.width - 1, a.height - 1), fill=255)
        x, y = (i % 7) * S + 10, (i // 7) * S + 10
        sheet.paste(a, (x, y), m); d = ImageDraw.Draw(sheet)
        r = (S - 20) * 0.35; c = (x + (S - 20) / 2, y + (S - 20) / 2)
        d.ellipse((c[0] - r, c[1] - r, c[0] + r, c[1] + r), outline='#D9643A'); d.text((x, y), gid, fill='black')
    sheet.save(sys.argv[2])
