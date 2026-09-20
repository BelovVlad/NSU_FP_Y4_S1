from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "search-index"
ORDER = ["ОВФ", "СВЧ", "ТДиСФ", "ФКСВ", "ФЭЧ", "ФиХАиМ", "КМ", "База"]\nHIDDEN_SITE_PATHS = {"ФЭЧ/04_Литератру/PhysRevD.pdf"}


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def is_qm_path(path: Path) -> bool:
    return len(path.parts) >= 2 and path.parts[0] == "База" and path.parts[1] == "КМ"


def subject_for(path: Path) -> str:
    return "КМ" if is_qm_path(path) else path.parts[0]


def title_for(path: Path) -> str:
    stem = path.stem
    if is_qm_path(path) and stem == "Квантовая_механика_полный_курс":
        return "Полный курс"
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
    if is_qm_path(path):
        return "Лекции"
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
        "subject": subject_for(rel),
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

    if is_qm_path(rel) and rel.name == "Квантовая_механика_полный_курс.pdf":
        record["indexed"] = False
        record["reason"] = "combined-course"
        try:
            with fitz.open(full) as doc:
                record["page_count"] = doc.page_count
        except Exception:
            pass
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

    # Compiled lecture/seminar PDFs can occasionally expose incomplete text
    # through a PDF extractor. Merge the author's LaTeX source into the
    # corresponding start page so global search remains reliable.
    try:
        enrich_pdf_record_from_sources(record, rel)
    except Exception:
        pass
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
    if subject == "КМ":
        base = ROOT / "База" / "КМ"
    else:
        base = ROOT / subject
    if not base.exists():
        return
    for full in sorted(base.rglob("*")):
        if not full.is_file():
            continue
        rel = full.relative_to(ROOT)
        if rel.as_posix() in HIDDEN_SITE_PATHS:
            continue
        if subject == "База" and is_qm_path(rel):
            continue
        if "LaTeX" in rel.parts or ".ipynb_checkpoints" in rel.parts:
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


def tex_arguments(text: str, command: str, count: int = 1) -> list[tuple[str, ...]]:
    """Read heading arguments, including nested braces and optional numbers."""
    text = re.sub(r"(?m)(?<!\\)%[^\n]*", "", text)
    pattern = re.compile(r"\\" + re.escape(command) + r"\*?(?:\[[^\]]*\])?\s*(?=\{)")
    results = []
    for match in pattern.finditer(text):
        pos = match.end()
        args = []
        for _ in range(count):
            while pos < len(text) and text[pos].isspace():
                pos += 1
            if pos >= len(text) or text[pos] != "{":
                break
            start = pos + 1
            depth = 1
            pos += 1
            while pos < len(text) and depth:
                if text[pos] == "\\" and pos + 1 < len(text) and text[pos + 1] in "{}%":
                    pos += 2
                    continue
                if text[pos] == "{":
                    depth += 1
                elif text[pos] == "}":
                    depth -= 1
                pos += 1
            if depth:
                break
            args.append(text[start:pos - 1])
        if len(args) == count:
            results.append(tuple(args))
    return results


def heading_title(text: str) -> str:
    # Prefer the author's plain PDF title for headings containing mathematics.
    for math_title, pdf_title in tex_arguments(text, "texorpdfstring", 2):
        text = text.replace(r"\texorpdfstring{" + math_title + "}{" + pdf_title + "}", pdf_title)
    return clean_text(text)


def section_titles_from_tex(text: str) -> list[str]:
    titles = []
    # New notes use \task[number]{title}; retain older \section headings too.
    headings = tex_arguments(text, "task") or tex_arguments(text, "section")
    for (heading,) in headings:
        title = heading_title(heading)
        title = re.sub(r"^Задача\s+\d+[.:]?\s*", "", title, flags=re.I)
        if title and title not in titles:
            titles.append(title)
    return titles


def first_page_for_title(doc: fitz.Document, title: str, toc: list[list]) -> int | None:
    wanted = normalize_title(title)
    if not wanted:
        return None

    # Numbers distinguish seminars with identical or closely related topics.
    practice = re.fullmatch(r"практическое занятие (\d+)", wanted)
    if practice:
        prefix = re.compile(r"^практическое занятие " + practice.group(1) + r"(?:\s|$)")
        for row in toc:
            if len(row) >= 3 and prefix.match(normalize_title(str(row[1]))):
                return int(row[2])
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
    pdf_path = base / f"{subject}_{label}.pdf"
    if not pdf_path.exists():
        pdf_path = base / "final.pdf"  # Older, not yet renamed projects.
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
            # A part can continue the previous chapter with a section.
            headings = tex_arguments(text, "chapter") or tex_arguments(text, "section")
            if not headings:
                continue
            title = heading_title(headings[0][0])
            subtitles = tex_arguments(text, "rsubtitle")
            subtitle = heading_title(subtitles[0][0]) if subtitles else ""
            number = ordinal
            date = iso_date(created_at or updated_at)
        else:
            practice = tex_arguments(text, "practice", 3)
            if not practice:
                continue
            raw_number, raw_date, raw_title = practice[0]
            try:
                number = int(raw_number.strip())
            except ValueError:
                number = ordinal
            title = heading_title(raw_title)
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



def latex_search_text(text: str) -> str:
    """Plain searchable prose from a lecture/seminar LaTeX source."""
    text = re.sub(r"(?m)(?<!\\)%[^\n]*", " ", text)
    text = re.sub(r"\\begin\{[^{}]*\}|\\end\{[^{}]*\}", " ", text)
    text = re.sub(r"\\[A-Za-zА-Яа-я@]+\*?(?:\[[^\]]*\])?", " ", text)
    text = text.replace("{", " ").replace("}", " ")
    text = text.replace("$", " ").replace("&", " ")
    text = re.sub(r"\\.", " ", text)
    return clean_text(text)


def enrich_pdf_record_from_sources(record: dict, rel: Path) -> None:
    if len(rel.parts) < 3 or rel.suffix.lower() != ".pdf":
        return

    subject = rel.parts[0]
    folder = rel.parts[1]
    folder_labels = {
        "01_Лекции": "Лекции",
        "02_Семинары": "Семинары",
    }
    label = folder_labels.get(folder)
    if not label:
        return

    group = structured_group(subject, folder, label)
    if not group or group.get("pdf_path") != rel.as_posix():
        return

    by_page = {int(p["n"]): p for p in record.get("pages", []) if p.get("n")}
    changed = False

    for item in group.get("items", []):
        page_no = item.get("page")
        source = item.get("source")
        if not isinstance(page_no, int) or not source:
            continue

        source_path = ROOT / source
        if not source_path.exists():
            continue

        try:
            source_text = latex_search_text(source_path.read_text("utf-8", errors="ignore"))
        except OSError:
            continue

        if len(source_text) < 24:
            continue

        page_rec = by_page.get(page_no)
        if page_rec is None:
            page_rec = {"n": page_no, "t": source_text}
            record.setdefault("pages", []).append(page_rec)
            by_page[page_no] = page_rec
        else:
            page_rec["t"] = clean_text((page_rec.get("t") or "") + " " + source_text)
        changed = True

    if changed:
        record["pages"].sort(key=lambda p: int(p.get("n") or 0))


QM_LECTURE_META = {
    "qm1_lecture01.pdf": ("2025-09-01", "Введение и предпосылки квантовой механики", "Абсолютно чёрное тело · фотоэффект · эффект Комптона · модель Бора", "QM1"),
    "qm1_lecture02.pdf": ("2025-09-08", "Соотношения неопределённостей", "Дифракция и интерференция электронов · координатное и импульсное представления", "QM1"),
    "qm1_lecture03.pdf": ("2025-09-15", "Свободный волновой пакет", "Вероятностная интерпретация · уравнение непрерывности · средние значения", "QM1"),
    "qm1_lecture04.pdf": ("2025-09-22", "Одномерное движение", "Финитное и инфинитное движение · условия сшивки · потенциальные ямы", "QM1"),
    "qm1_lecture05.pdf": ("2025-09-29", "Одномерная задача рассеяния", "Ток вероятности · отражение и прохождение · туннелирование", "QM1"),
    "qm1_lecture06.pdf": ("2025-10-06", "Состояния и операторы", "Дираковские обозначения · линейные операторы · матричные элементы", "QM1"),
    "qm1_lecture07.pdf": ("2025-10-13", "Коммутаторы операторов", "Теорема о вириале · соотношения неопределённостей · совместимые наблюдаемые", "QM1"),
    "qm1_lecture08.pdf": ("2025-10-20", "Линейный гармонический осциллятор", "Операторный метод · эволюция состояний · оператор эволюции", "QM1"),
    "qm1_lecture09.pdf": ("2025-10-27", "Представления Шрёдингера и Гейзенберга", "Уравнение Гейзенберга · теорема Эренфеста · квазистационарные состояния", "QM1"),
    "qm1_lecture10.pdf": ("2025-11-03", "Движение в периодическом поле", "Оператор сдвига · периодический потенциал · трёхмерное движение", "QM1"),
    "qm1_lecture11.pdf": ("2025-11-10", "Момент импульса", "Оператор поворота · собственные значения l² и lz · центральное поле", "QM1"),
    "qm1_lecture12.pdf": ("2025-11-17", "Движение в центральном поле", "Сферические координаты · разделение переменных · угловая и радиальная части", "QM1"),
    "qm1_lecture13.pdf": ("2025-11-24", "Чётность и правила отбора", "Правила отбора по чётности и проекции момента импульса", "QM1"),
    "qm1_lecture14.pdf": ("2025-12-01", "Вариационный принцип и теория возмущений", "Дифференцирование энергии по параметру · стационарная теория возмущений", "QM1"),
    "qm1_lecture15.pdf": ("2025-12-08", "Стационарная теория возмущений: примеры", "Поляризуемость · эффект Штарка · силы Ван-дер-Ваальса", "QM1"),
    "qm1_lectures16and17.pdf": ("2025-12-15", "Квазиклассическое приближение", "Лекции 16–17 · ВКБ · правила сшивки · квантование Бора–Зоммерфельда", "QM1"),
    "qm2_lecture01.pdf": ("2026-02-02", "Спин", "Опыт Штерна–Герлаха · спиноры · матрицы Паули · оператор поворота", "QM2"),
    "qm2_lecture02.pdf": ("2026-02-05", "Частица в электромагнитном поле", "Калибровочная инвариантность · уравнение Паули · прецессия спина", "QM2"),
    "qm2_lecture03.pdf": ("2026-02-09", "Электромагнитное поле: продолжение", "Плотность тока · уровни Ландау · эффект Ааронова–Бома · квантование потока", "QM2"),
    "qm2_lecture04.pdf": ("2026-02-16", "Сложение моментов", "Два спина 1/2 · коэффициенты Клебша–Гордана · симметрия состояний", "QM2"),
    "qm2_lecture05.pdf": ("2026-02-19", "Сложение угловых моментов: продолжение", "Одинаковые моменты · орбитальный момент и спин 1/2 · повороты", "QM2"),
    "qm2_lecture06.pdf": ("2026-02-21", "Тензорные операторы и правила отбора", "Скалярные и векторные операторы · теорема Вигнера–Эккарта", "QM2"),
    "qm2_lecture07.pdf": ("2026-03-02", "Атом гелия", "Теория возмущений · вариационный метод · обменное взаимодействие · самосогласованное поле", "QM2"),
}


def qm_structured_group() -> dict | None:
    meta_path = ROOT / ".github" / "generated" / "qm_lecture_texts.json"
    pdf_path = ROOT / "База" / "КМ" / "Квантовая_механика_полный_курс.pdf"
    if not meta_path.exists() or not pdf_path.exists():
        return None
    try:
        data = json.loads(meta_path.read_text("utf-8"))
    except Exception:
        return None

    items = []
    for idx, rec in enumerate(data.get("records") or [], 1):
        name = rec.get("file", "")
        meta = QM_LECTURE_META.get(name)
        if not meta:
            continue
        date, title, subtitle, part = meta
        start_page = int(rec.get("start_page_in_merged") or 1)
        pages = int(rec.get("pages") or 1)

        if name == "qm1_lectures16and17.pdf":
            number = 16
            number_label = "16–17"
        elif name.startswith("qm2_"):
            m = re.search(r"lecture(\d+)", name)
            local_no = int(m.group(1)) if m else idx
            number = 17 + local_no
            number_label = str(local_no)
        else:
            m = re.search(r"lecture(\d+)", name)
            number = int(m.group(1)) if m else idx
            number_label = str(number)

        items.append({
            "id": f"КМ:Лекции:{name}",
            "number": number,
            "number_label": number_label,
            "part": part,
            "title": title,
            "subtitle": subtitle,
            "date": date,
            "source": f"База/КМ/Исходники/{name}",
            "page": start_page,
            "end_page": start_page + pages - 1,
        })

    if not items:
        return None
    try:
        with fitz.open(pdf_path) as doc:
            page_count = doc.page_count
    except Exception:
        page_count = None

    return {
        "subject": "КМ",
        "section": "Лекции",
        "pdf_path": pdf_path.relative_to(ROOT).as_posix(),
        "page_count": page_count,
        "items": items,
    }


def build_structure(generated_at: str) -> None:
    groups = []
    qm_group = qm_structured_group()
    if qm_group:
        groups.append(qm_group)

    for subject in ORDER:
        if subject == "КМ":
            continue
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
