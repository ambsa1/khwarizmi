"""يولّد صوت منيب (يحتاج إنترنت مرة واحدة فقط):
    node tools/collect_texts.js
    python tools/make_voice.py
الجمل التي لم تتغير لا يُعاد توليدها."""
import asyncio
import hashlib
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICE_DIR = ROOT / "voice"
VOICES = {
    "ar": dict(voice="ar-SA-HamedNeural", rate="-6%", pitch="+22Hz"),
    "en": dict(voice="en-US-GuyNeural", rate="-12%", pitch="+22Hz"),
}


def sig(item):
    v = VOICES[item["lang"]]
    return hashlib.sha1(json.dumps([item["text"], v], ensure_ascii=False).encode()).hexdigest()[:12]


async def make(item, sem):
    async with sem:
        v = VOICES[item["lang"]]
        out = VOICE_DIR / (item["key"] + ".mp3")
        for attempt in range(3):
            try:
                await edge_tts.Communicate(item["text"], v["voice"], rate=v["rate"], pitch=v["pitch"]).save(str(out))
                return True
            except Exception as e:  # الشبكة أحياناً تتقطع
                if attempt == 2:
                    print("FAILED", item["key"], e)
                    out.unlink(missing_ok=True)  # لا نترك ملفاً ناقصاً يبدو كأنه سليم
                await asyncio.sleep(2)
        return False


async def main():
    items = json.loads((ROOT / "tools" / "voice_texts.json").read_text(encoding="utf-8"))
    VOICE_DIR.mkdir(exist_ok=True)
    manifest_path = VOICE_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    todo = [i for i in items if manifest.get(i["key"]) != sig(i) or not (VOICE_DIR / (i["key"] + ".mp3")).exists()]
    print(f"{len(items)} texts, {len(todo)} to generate")
    sem = asyncio.Semaphore(6)
    results = await asyncio.gather(*(make(i, sem) for i in todo))
    for item, ok in zip(todo, results):
        if ok:
            manifest[item["key"]] = sig(item)
    keys = sorted(i["key"] for i in items if (VOICE_DIR / (i["key"] + ".mp3")).exists())
    manifest_path.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    (VOICE_DIR / "list.js").write_text("self.OMRAN_VOICE_LIST = " + json.dumps(keys) + ";\n", encoding="utf-8")
    print(f"done: {sum(results)} generated, {len(keys)} available")


asyncio.run(main())
