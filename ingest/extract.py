"""الخطوة ٢: استخراج نص كل صفحة من كتاب مسجّل.
يكتب ingest/work/<source>/pages.jsonl: سطر لكل صفحة فيه رقمها ونصّها وعدد الحروف.
الصفحات الفارغة من النص تُعلَّم بأنها تحتاج قراءة ضوئية (الخطوة ٣).

  ingest/.venv/Scripts/python.exe ingest/extract.py smile.g1.pupil"""
import json
import sys

from pypdf import PdfReader

from common import ROOT, find_source, load_sources, sha256, work_dir


def main(source_id):
    src = find_source(load_sources(), source_id)
    path = ROOT / src["localPath"]
    if not path.exists():
        sys.exit(f"file missing: {src['localPath']}")
    if src.get("sha256") and src["sha256"] != sha256(path):
        sys.exit("file changed since registration: run register.py again")
    reader = PdfReader(str(path))
    out = work_dir(source_id) / "pages.jsonl"
    need_ocr = 0
    with out.open("w", encoding="utf-8") as f:
        for i, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or "").strip()
            ocr = len(text) < 40
            need_ocr += ocr
            f.write(json.dumps({"page": i, "chars": len(text), "needsOcr": ocr, "text": text}, ensure_ascii=False) + "\n")
    print(f"{source_id}: {len(reader.pages)} pages -> {out.relative_to(ROOT)}  ({need_ocr} need OCR)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
