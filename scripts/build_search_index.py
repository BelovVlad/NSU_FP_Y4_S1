from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "search-index"
ORDER = ["ОВФ", "СВЧ", "ТДиСФ", "ФКСВ", "ФЭЧ", "ФиХАиМ", "База"]


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def title_for(path: Path) -> str:
    stem = path.stem
    section = path.parts[1] if len(path.parts) > 1 else ""
    if stem.lower() == "final":
        if "лекц" in section.lower():
            return "Конспект лекций"
        if "семинар" in section.lower():
            return "Семинары"
        if "месяч" in section.lower():
            return "Месячные задания"
        return "Итоговый материал"
    if stem.upper() == "INDEX":
        return "Оглавление"
    return stem.replace("_", " ")


def section_for(path: Path) -> str:
    if len(path.parts) < 2:
        return "Материалы"
    raw = re.sub(r"^\d+[_ .-]*", "", path.parts[1]).replace("_", " ").strip()
    low = raw.lower()
    if "лекц" in low:
        return "Лекции"
    if "семинар" in low:
        return "Семинары"
    if "лаборатор" in low:
        return "Лабораторные работы"
    if "месяч" in low:
        return "Месячные задания"
    if "литерат" in low:
        return "Литература"
    if "практик" in low:
        return "Практика"
    if "теори" in low:
        return "Теория"
    return raw or "Материалы"


def is_lfs_pointer(path: Path) -> bool:
    try:
        if path.stat().st_size > 2048:
            return False
        return path.read_text("utf-8", errors="ignore").startswith(
            "version https://git-lfs.github.com/spec/v1"
        )
    except OSError:
        return False


def pdf_record(rel: Path) -> dict:
    full = ROOT / rel
    record = {
        "path": rel.as_posix(),
        "type": "pdf",
        "title": title_for(rel),
        "subject": rel.parts[0],
        "section": section_for(rel),
        "indexed": True,
        "pages": [],
    }

    if is_lfs_pointer(full):
        record["indexed"] = False
        record["reason"] = "lfs"
        return record

    try:
        with fitz.open(full) as doc:
            for number, page in enumerate(doc, 1):
                text = clean_text(page.get_text("text", sort=True))
                if text:
                    record["pages"].append({"n": number, "t": text})
    except Exception as exc:  # keep metadata search even for malformed/scanned PDFs
        record["indexed"] = False
        record["reason"] = type(exc).__name__
    return record


def notebook_record(rel: Path) -> dict:
    full = ROOT / rel
    record = {
        "path": rel.as_posix(),
        "type": "ipynb",
        "title": title_for(rel),
        "subject": rel.parts[0],
        "section": section_for(rel),
        "indexed": True,
        "pages": [],
    }
    try:
        data = json.loads(full.read_text("utf-8"))
        for number, cell in enumerate(data.get("cells", []), 1):
            source = cell.get("source", [])
            if isinstance(source, list):
                source = "".join(source)
            text = clean_text(str(source))
            if text:
                record["pages"].append({"n": number, "t": text})
    except Exception as exc:
        record["indexed"] = False
        record["reason"] = type(exc).__name__
    return record


def iter_materials(subject: str):
    base = ROOT / subject
    if not base.exists():
        return
    for full in sorted(base.rglob("*")):
        if not full.is_file():
            continue
        rel = full.relative_to(ROOT)
        if "LaTeX" in rel.parts:
            continue
        suffix = full.suffix.lower()
        if suffix in {".pdf", ".ipynb"}:
            yield rel


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("part-*.json"):
        old.unlink()

    manifest = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "shards": [],
    }

    for shard_no, subject in enumerate(ORDER):
        records = []
        for rel in iter_materials(subject) or []:
            records.append(pdf_record(rel) if rel.suffix.lower() == ".pdf" else notebook_record(rel))

        if not records:
            continue

        filename = f"part-{shard_no:02d}.json"
        payload = {"subject": subject, "records": records}
        encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        (OUT / filename).write_text(encoded, "utf-8")
        manifest["shards"].append(
            {
                "subject": subject,
                "file": filename,
                "records": len(records),
                "locations": sum(len(r["pages"]) for r in records),
                "bytes": len(encoded.encode("utf-8")),
            }
        )

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), "utf-8"
    )

    total_records = sum(s["records"] for s in manifest["shards"])
    total_locations = sum(s["locations"] for s in manifest["shards"])
    total_bytes = sum(s["bytes"] for s in manifest["shards"])
    print(
        f"Search index: {total_records} files, {total_locations} locations, "
        f"{total_bytes / 1024 / 1024:.2f} MiB"
    )


if __name__ == "__main__":
    main()
