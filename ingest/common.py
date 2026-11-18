"""أدوات مشتركة لخط إدخال الكتب. كل خطوة برنامج مستقل يقرأ ملفًا ويكتب ملفًا."""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "content" / "sources" / "sources.json"
WORK = ROOT / "ingest" / "work"


def load_sources():
    return json.loads(SOURCES.read_text(encoding="utf-8"))


def save_sources(doc):
    SOURCES.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_source(doc, source_id):
    for s in doc["sources"]:
        if s["id"] == source_id:
            return s
    sys.exit(f"source not registered: {source_id}")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def work_dir(source_id):
    d = WORK / source_id
    d.mkdir(parents=True, exist_ok=True)
    return d
