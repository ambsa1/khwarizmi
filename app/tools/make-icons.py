"""App icons from the logo picture (C:/Users/ambsa/عمران/all photo/Logo.png):
icon-192/512 (the rounded artwork as drawn, transparent corners), a maskable 512 (the art fills a full square with its
own night-blue edge, so a phone's circle or squircle mask never cuts the robot), apple-touch 180 (no transparency),
and favicon 48 / 32.  usage: python tools/make-icons.py "<Logo.png>" """
import os, sys
from PIL import Image, ImageDraw
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
im = Image.open(SRC).convert('RGBA')
W = im.width
# the artwork sits in a rounded square with a thin margin: cut it out with a rounded mask
inset = round(W * 0.012); box = (inset, inset, W - inset, W - inset)
art = im.crop(box)
r = round(art.width * 0.16)
mask = Image.new('L', art.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, art.width - 1, art.height - 1), r, fill=255)
rounded = Image.new('RGBA', art.size, (0, 0, 0, 0)); rounded.paste(art, (0, 0), mask)
for s in (192, 512):
    rounded.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, f'icon-{s}.png'), optimize=True)
# maskable: the full square artwork scaled into the 80% safe zone over the logo's night-blue
NIGHT = (24, 31, 70, 255)
m = Image.new('RGBA', (512, 512), NIGHT)
inner = art.resize((430, 430), Image.LANCZOS)
m.paste(inner, (41, 41), inner)
m.save(os.path.join(OUT, 'icon-maskable-512.png'), optimize=True)
# apple touch: no transparency (iOS rounds the corners itself)
a = Image.new('RGBA', (180, 180), NIGHT); a.paste(art.resize((180, 180), Image.LANCZOS), (0, 0))
a.convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)
for s in (48, 32):
    rounded.resize((s, s), Image.LANCZOS).save(os.path.join(OUT, f'favicon-{s}.png'), optimize=True)
for f in sorted(os.listdir(OUT)): print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'KB')
