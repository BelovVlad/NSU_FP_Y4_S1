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



def natural_key(path: Path) -> tuple:
    parts = re.split(r"(\d+)", path.name)
    return tuple(int(p) if p.isdigit() else p.lower() for p in parts)


def normalize_title(text: str) -> str:
    text = re.sub(r"\\texorpdfstring\{([^{}]*)\}\{([^{}]*)\}", r"\2", text)
    text = re.sub(r"\\[A-Za-z@]+\*?(?:\[[^\]]*\])?", " ", text)
    text = text.replace("{", " ").replace("}", " ")
    text = re.sub(r"[^0-9A-Za-zА-Яа-яЁё]+", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def iso_date(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    try:
        return datetime.strptime(value, "%d.%m.%Y").date().isoformat()
    except ValueError:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            return value


def section_titles_from_tex(text: str) -> list[str]:
    titles = []
    for match in re.finditer(r"\\section\{([^{}]+)\}", text, re.S):
        title = clean_text(match.group(1))
        title = re.sub(r"^Задача\s+\d+[.:]?\s*", "", title, flags=re.I)
        if title and title not in titles:
            titles.append(title)
    return titles


def first_page_for_title(doc: fitz.Document, title: str, toc: list[list]) -> int | None:
    wanted = normalize_title(title)
    if not wanted:
        return None

    best_page = None
    best_score = 0
    wanted_words = [w for w in wanted.split() if len(w) >= 4]

    for row in toc:
        if len(row) < 3:
            continue
        toc_title, page = str(row[1]), int(row[2])
        norm = normalize_title(toc_title)
        if not norm:
            continue
        if norm == wanted:
            return page
        score = 0
        if wanted in norm or norm in wanted:
            score += 8
        score += sum(1 for w in wanted_words if w in norm)
        if score > best_score:
            best_score, best_page = score, page

    if best_score >= max(3, min(6, len(wanted_words))):
        return best_page

    # Fallback: search the rendered PDF text. This handles custom macros
    # whose visible heading is not exposed as a PDF bookmark.
    probe = wanted_words[:6]
    if probe:
        for page_no in range(doc.page_count):
            try:
                page_text = normalize_title(doc.load_page(page_no).get_text("text", sort=True))
            except Exception:
                continue
            hits = sum(1 for w in probe if w in page_text)
            if hits >= max(2, min(len(probe), 4)):
                return page_no + 1
    return None


def structured_group(subject: str, folder: str, label: str) -> dict | None:
    base = ROOT / subject / folder
    parts_dir = base / "LaTeX" / "parts"
    pdf_path = base / "final.pdf"
    if not parts_dir.exists() or not pdf_path.exists():
        return None

    part_files = sorted(parts_dir.glob("part*.tex"), key=natural_key)
    if not part_files:
        return None

    items: list[dict] = []
    is_lecture = label == "Лекции"

    for ordinal, part in enumerate(part_files, 1):
        try:
            text = part.read_text("utf-8", errors="ignore")
        except OSError:
            continue

        rel = part.relative_to(ROOT)
        updated_at, created_at = git_history_dates(rel)

        if is_lecture:
            chapter = re.search(r"\\chapter\{([^{}]+)\}", text, re.S)
            if not chapter:
                continue
            title = clean_text(chapter.group(1))
            subtitle_match = re.search(r"\\rsubtitle\{([^{}]+)\}", text, re.S)
            subtitle = clean_text(subtitle_match.group(1)) if subtitle_match else ""
            number = ordinal
            date = iso_date(created_at or updated_at)
        else:
            practice = re.search(
                r"\\practice\{([^{}]+)\}\{([^{}]+)\}\{([^{}]+)\}",
                text,
                re.S,
            )
            if not practice:
                continue
            raw_number, raw_date, raw_title = practice.groups()
            try:
                number = int(raw_number.strip())
            except ValueError:
                number = ordinal
            title = clean_text(raw_title)
            date = iso_date(raw_date)
            sections = section_titles_from_tex(text)
            subtitle = " · ".join(sections[:2])

        items.append(
            {
                "id": f"{subject}:{label}:{number}",
                "number": number,
                "title": title,
                "subtitle": subtitle,
                "date": date,
                "source": rel.as_posix(),
                "page": None,
                "end_page": None,
            }
        )

    if not items:
        return None

    page_count = None
    pointer = lfs_pointer_text(pdf_path)
    if not pointer:
        try:
            with fitz.open(pdf_path) as doc:
                page_count = doc.page_count
                toc = doc.get_toc(simple=True) or []
                for item in items:
                    if label == "Семинары":
                        practice_title = f"Практическое занятие {item['number']}"
                        item["page"] = first_page_for_title(doc, practice_title, toc)
                    if not item["page"]:
                        item["page"] = first_page_for_title(doc, item["title"], toc)
        except Exception:
            pass

    # Fill page ranges from the next known item.
    known = [i for i in items if isinstance(i.get("page"), int)]
    for idx, item in enumerate(known):
        nxt = known[idx + 1]["page"] if idx + 1 < len(known) else None
        if nxt:
            item["end_page"] = max(item["page"], nxt - 1)
        elif page_count:
            item["end_page"] = page_count

    return {
        "subject": subject,
        "section": label,
        "pdf_path": pdf_path.relative_to(ROOT).as_posix(),
        "page_count": page_count,
        "items": items,
    }


def build_structure(generated_at: str) -> None:
    groups = []
    for subject in ORDER:
        for folder, label in (("01_Лекции", "Лекции"), ("02_Семинары", "Семинары")):
            group = structured_group(subject, folder, label)
            if group:
                groups.append(group)

    payload = {
        "version": 1,
        "generated_at": generated_at,
        "groups": groups,
    }
    (OUT / "structure.json").write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        "utf-8",
    )

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

    build_structure(generated_at)

    total_records = sum(s["records"] for s in manifest["shards"])
    total_locations = sum(s["locations"] for s in manifest["shards"])
    total_bytes = sum(s["bytes"] for s in manifest["shards"])
    print(
        f"Search index: {total_records} files, {total_locations} locations, "
        f"{total_bytes / 1024 / 1024:.2f} MiB"
    )


if __name__ == "__main__":
    main()
