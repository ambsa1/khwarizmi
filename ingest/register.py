"""الخطوة ١: تسجيل ملف كتاب موجود على اللابتوب.
يحسب البصمة وعدد الصفحات، ويكتشف هل الكتاب نصّي أم ممسوح، ويحدّث سجل المصادر.

  ingest/.venv/Scripts/python.exe ingest/register.py smile.g1.pupil
  ingest/.venv/Scripts/python.exe ingest/register.py --all          (كل الملفات الموجودة)

الملف نفسه يبقى في مجلد books/ ولا يُرفع أبدًا."""
import sys

from pypdf import PdfReader

from common import ROOT, find_source, load_sources, save_sources, sha256

SAMPLE = 12  # عدد الصفحات التي نفحصها لمعرفة هل في الكتاب نص


def text_layer(reader):
    n = len(reader.pages)
    k = min(SAMPLE, n)
    idx = sorted({round(i * (n - 1) / max(1, k - 1)) for i in range(k)})
    with_text = sum(1 for i in idx if len((reader.pages[i].extract_text() or "").strip()) > 40)
    if with_text == len(idx):
        return "text"
    if with_text == 0:
        return "scanned"
    return "mixed"


def register(src):
    path = ROOT / src["localPath"]
    if not path.exists():
        print(f"MISSING  {src['id']}: put the file at {src['localPath']}")
        return False
    reader = PdfReader(str(path))
    src["sha256"] = sha256(path)
    src["bytes"] = path.stat().st_size
    src["pages"] = len(reader.pages)
    src["textLayer"] = text_layer(reader)
    print(f"OK       {src['id']}: {src['pages']} pages, {src['textLayer']}, {src['bytes']:,} bytes")
    return True


def main(args):
    doc = load_sources()
    targets = doc["sources"] if args == ["--all"] else [find_source(doc, a) for a in args]
    if not targets:
        sys.exit(__doc__)
    ok = sum(register(s) for s in targets)
    save_sources(doc)
    print(f"{ok}/{len(targets)} registered")


if __name__ == "__main__":
    main(sys.argv[1:])
