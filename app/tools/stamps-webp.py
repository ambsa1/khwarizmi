"""Passport stamps: PNGs from tools/stamps-render.mjs -> public/art/stamps/<world>.webp (< 60 KB each)."""
import os, sys
from PIL import Image
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'art', 'stamps')
os.makedirs(OUT, exist_ok=True)
for w in ('kassala', 'saqiya', 'mogran', 'suakin', 'meroe', 'marra'):
    im = Image.open(os.path.join(SRC, w + '.png')).convert('RGBA').resize((384, 384), Image.LANCZOS)
    p = os.path.join(OUT, w + '.webp')
    im.save(p, 'WEBP', quality=82, alpha_quality=80, method=6)
    print(w, os.path.getsize(p) // 1024, 'KB')
