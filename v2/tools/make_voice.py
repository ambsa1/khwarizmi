"""يولّد صوت سراج بالصوت المصري (شاكر) بدون أي تعديل في الطبقة، عشان النطق يطلع نظيف.
    node tools/voice.js
    python tools/make_voice.py
الجمل التي لم تتغيّر لا يُعاد توليدها."""
import asyncio
import hashlib
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "voice"
VOICE = "ar-EG-ShakirNeural"
VOICES = {"en": "en-US-GuyNeural"}  # "lang": "en" في voice_texts.json = نطق إنجليزي لكلمات الكود


def voice_of(item):
    return VOICES.get(item.get("lang"), VOICE)


def sig(item):
    return hashlib.sha1(f"{voice_of(item)}|{item['text']}".encode()).hexdigest()[:12]


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


async def main():
    items = json.loads((ROOT / "tools" / "voice_texts.json").read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    mp = OUT / "manifest.json"
    manifest = json.loads(mp.read_text(encoding="utf-8")) if mp.exists() else {}
    todo = [i for i in items if manifest.get(i["key"]) != sig(i) or not (OUT / (i["key"] + ".mp3")).exists()]
    print(f"{len(items)} texts, {len(todo)} to generate")
    sem = asyncio.Semaphore(6)
    results = await asyncio.gather(*(make(i, sem) for i in todo))
    for item, ok in zip(todo, results):
        if ok:
            manifest[item["key"]] = sig(item)
    keys = sorted(i["key"] for i in items if (OUT / (i["key"] + ".mp3")).exists())
    mp.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    (OUT / "list.js").write_text("self.SIRAJ_VOICE = " + json.dumps(keys) + ";\n", encoding="utf-8")
    print(f"done: {sum(results)} generated, {len(keys)} available")


asyncio.run(main())
