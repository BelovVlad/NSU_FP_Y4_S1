from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "search-index"
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


def lfs_pointer_text(path: Path) -> str | None:
    try:
        if path.stat().st_size > 2048:
            return None
        text = path.read_text("utf-8", errors="ignore")
        return text if text.startswith("version https://git-lfs.github.com/spec/v1") else None
    except OSError:
        return None


def actual_size(path: Path, pointer: str | None = None) -> int:
    if pointer:
        match = re.search(r"(?m)^size\s+(\d+)\s*$", pointer)
        if match:
            return int(match.group(1))
    try:
        return path.stat().st_size
    except OSError:
        return 0


def git_history_dates(rel: Path) -> tuple[str | None, str | None]:
    """Return (updated_at, created_at) using the real per-file git history."""
    try:
        output = subprocess.check_output(
            ["git", "log", "--follow", "--format=%cI", "--", rel.as_posix()],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        dates = [line.strip() for line in output.splitlines() if line.strip()]
        if not dates:
            return None, None
        return dates[0], dates[-1]
    except (OSError, subprocess.CalledProcessError):
        return None, None


def content_version(rel: Path) -> str | None:
    """Stable cache key that changes whenever the tracked file contents change."""
    try:
        value = subprocess.check_output(
            ["git", "rev-parse", f"HEAD:{rel.as_posix()}"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        return value or None
    except (OSError, subprocess.CalledProcessError):
        return None


def base_record(rel: Path, kind: str) -> dict:
    full = ROOT / rel
    pointer = lfs_pointer_text(full)
    updated_at, created_at = git_history_dates(rel)
    return {
        "path": rel.as_posix(),
        "type": kind,
        "title": title_for(rel),
        "subject": rel.parts[0],
        "section": section_for(rel),
        "size": actual_size(full, pointer),
        "updated_at": updated_at,
        "created_at": created_at,
        "version": content_version(rel),
        "indexed": True,
        "pages": [],
        "_pointer": pointer,
    }


def pdf_record(rel: Path) -> dict:
    full = ROOT / rel
    record = base_record(rel, "pdf")
    pointer = record.pop("_pointer", None)
    record["page_count"] = None

    if pointer:
        record["indexed"] = False
        record["reason"] = "lfs"
        return record

    try:
        with fitz.open(full) as doc:
            record["page_count"] = doc.page_count
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
    record = base_record(rel, "ipynb")
    record.pop("_pointer", None)
    record["cell_count"] = None
    try:
        data = json.loads(full.read_text("utf-8"))
        cells = data.get("cells", [])
        record["cell_count"] = len(cells)
        for number, cell in enumerate(cells, 1):
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


def compact_metadata(record: dict) -> dict:
    keys = (
        "path",
        "type",
        "title",
        "subject",
        "section",
        "size",
        "updated_at",
        "created_at",
        "version",
        "page_count",
        "cell_count",
        "indexed",
    )
    return {key: record[key] for key in keys if key in record}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("part-*.json"):
        old.unlink()

    generated_at = datetime.now(timezone.utc).isoformat()
    manifest = {"version": 3, "generated_at": generated_at, "shards": []}
    all_metadata: list[dict] = []

    for shard_no, subject in enumerate(ORDER):
        records = []
        for rel in iter_materials(subject) or []:
            record = pdf_record(rel) if rel.suffix.lower() == ".pdf" else notebook_record(rel)
            records.append(record)
            all_metadata.append(compact_metadata(record))

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
    (OUT / "files.json").write_text(
        json.dumps(
            {"version": 2, "generated_at": generated_at, "files": all_metadata},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        "utf-8",
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
