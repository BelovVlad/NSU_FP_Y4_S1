from __future__ import annotations

import json
import re
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "База" / "КМ" / "Исходники"
OUT = ROOT / "База" / "КМ" / "Квантовая_механика_полный_курс.pdf"
TEXT_OUT = ROOT / ".github" / "generated" / "qm_lecture_texts.json"


def lecture_key(path: Path):
    name = path.stem.lower()
    part = 1 if name.startswith("qm1_") else 2
    m = re.search(r"lecture(?:s)?(\d+)", name)
    n = int(m.group(1)) if m else 999
    return part, n, name


def label_for(path: Path) -> tuple[str, str]:
    name = path.stem.lower()
    part = "QM1" if name.startswith("qm1_") else "QM2"
    m = re.search(r"lecture(?:s)?(\d+)(?:and(\d+))?", name)
    if not m:
        return part, path.stem
    a = int(m.group(1))
    b = m.group(2)
    num = f"{a:02d}" if not b else f"{a:02d}-{int(b):02d}"
    return part, f"Лекция {num}"


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main():
    files = sorted(
        [p for p in SRC.glob("*.pdf") if p.is_file()],
        key=lecture_key,
    )
    if not files:
        raise SystemExit("No QM PDFs found")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    TEXT_OUT.parent.mkdir(parents=True, exist_ok=True)

    merged = fitz.open()
    toc = []
    extracted = []

    current_part = None
    for path in files:
        part, lecture_label = label_for(path)
        if part != current_part:
            toc.append([1, f"Часть {'I' if part == 'QM1' else 'II'} ({part})", merged.page_count + 1])
            current_part = part

        src = fitz.open(path)
        start_page = merged.page_count + 1
        toc.append([2, lecture_label, start_page])
        merged.insert_pdf(src)

        chunks = []
        for page in src:
            t = page.get_text("text")
            if t:
                chunks.append(t)
            if sum(len(x) for x in chunks) >= 12000:
                break

        extracted.append({
            "file": path.name,
            "part": part,
            "lecture": lecture_label,
            "pages": src.page_count,
            "start_page_in_merged": start_page,
            "metadata": src.metadata,
            "text": clean_text("\n".join(chunks))[:12000],
        })
        src.close()

    merged.set_metadata({
        "title": "Квантовая механика — полный курс",
        "author": "Грибанов С.С.",
        "subject": "Лекции по квантовой механике, QM1 + QM2",
        "keywords": "квантовая механика, НГУ, Грибанов",
    })
    merged.set_toc(toc)
    merged.save(OUT, garbage=4, deflate=True)
    merged.close()

    TEXT_OUT.write_text(
        json.dumps(
            {
                "course": "Квантовая механика",
                "lecturer": "Грибанов С.С.",
                "seminarist": "Грибанов С.С.",
                "source_dir": str(SRC.relative_to(ROOT)),
                "merged_pdf": str(OUT.relative_to(ROOT)),
                "records": extracted,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Merged {len(files)} source files -> {OUT}")
    print(f"Extracted lecture text -> {TEXT_OUT}")


if __name__ == "__main__":
    main()
