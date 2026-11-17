"""يولّد صوت سراج بالصوت المصري (شاكر) بدون أي تعديل في الطبقة، عشان النطق يطلع نظيف.
    node tools/voice.js
    python tools/make_voice.py
الجمل التي لم تتغيّر لا يُعاد توليدها.
ترحيب أطفال العائلة (hi_*) فيه أسماؤهم: بصمته تُحفظ في tools/voice_hi.local.json (محلي، لا يُرفع)،
ولا يدخل voice/list.js، وفي الآخر يشغّل node tools/family.js الذي يشفّر hi_*.mp3 إلى hi_*.bin ويمسح الـ mp3."""
import asyncio
import hashlib
import json
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "voice"
VOICE = "ar-EG-ShakirNeural"
VOICES = {"en": "en-US-GuyNeural", "en2": "en-US-AnaNeural"}  # "en" = كلمات الكود، "en2" = قسم الإنجليزية (صوت طفلة)
HI_MAN = ROOT / "tools" / "voice_hi.local.json"


def voice_of(item):
    return VOICES.get(item.get("lang"), VOICE)


def sig(item):
    return hashlib.sha1(f"{voice_of(item)}|{item['text']}".encode()).hexdigest()[:12]


def fam(key):
    return key.startswith("hi_")


def exists(key):
    return (OUT / (key + ".mp3")).exists() or (fam(key) and (OUT / (key + ".bin")).exists())


async def make(item, sem):
    async with sem:
        out = OUT / (item["key"] + ".mp3")
        for attempt in range(3):
            try:
                await edge_tts.Communicate(item["text"], voice_of(item)).save(str(out))
                return True
            except Exception as e:  # الشبكة أحياناً تتقطع
                if attempt == 2:
                    print("FAILED", item["key"], e)
                    out.unlink(missing_ok=True)
                await asyncio.sleep(2)
        return False


def load(p):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


async def main():
    items = json.loads((ROOT / "tools" / "voice_texts.json").read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    mp = OUT / "manifest.json"
    manifest, hi = load(mp), load(HI_MAN)
    for k in [k for k in manifest if fam(k)]:  # بصمات الأسماء ما تتنشر
        hi.setdefault(k, manifest.pop(k))
    man = lambda k: hi if fam(k) else manifest
    todo = [i for i in items if man(i["key"]).get(i["key"]) != sig(i) or not exists(i["key"])]
    print(f"{len(items)} texts, {len(todo)} to generate")
    sem = asyncio.Semaphore(6)
    results = await asyncio.gather(*(make(i, sem) for i in todo))
    for item, ok in zip(todo, results):
        if ok:
            man(item["key"])[item["key"]] = sig(item)
    keys = sorted(i["key"] for i in items if not fam(i["key"]) and (OUT / (i["key"] + ".mp3")).exists())
    mp.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    HI_MAN.write_text(json.dumps(hi, indent=1), encoding="utf-8")
    (OUT / "list.js").write_text("self.SIRAJ_VOICE = " + json.dumps(keys) + ";\n", encoding="utf-8")
    print(f"done: {sum(results)} generated, {len(keys)} available")
    if list(OUT.glob("hi_*.mp3")):  # تشفير ترحيب العائلة فوراً
        subprocess.run(["node", str(ROOT / "tools" / "family.js")], check=True)


asyncio.run(main())
