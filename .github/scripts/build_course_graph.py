from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "search-index" / "course-graph.json"
SUBJECTS = ["ОВФ", "СВЧ", "ТДиСФ", "ФКСВ", "ФЭЧ", "ФиХАиМ"]
MAX_TOTAL_NODES = 320
MAX_TOC_PER_PDF = 80
MAX_DEPTH = 4


def clean_label(value: str) -> str:
    value = re.sub(r"\s+", " ", str(value or "")).strip()
    value = re.sub(r"^[\d.]+\s+", "", value)
    return value[:110]


def section_for(rel: Path) -> str:
    if len(rel.parts) < 2:
        return "Материалы"
    raw = re.sub(r"^\d+[_ .-]*", "", rel.parts[1]).replace("_", " ").strip()
    low = raw.lower()
    if "лекц" in low:
        return "Лекции"
    if "семинар" in low:
        return "Семинары"
    if "лаборатор" in low:
        return "Лабораторные работы"
    if "месяч" in low:
        return "Месячные задания"
    if "практик" in low:
        return "Практика"
    if "теори" in low:
        return "Теория"
    if "литерат" in low:
        return "Литература"
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


def node_id(*parts: str) -> str:
    raw = "|".join(parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:14]


def add_link(links: list[dict], seen: set[tuple[str, str]], source: str, target: str) -> None:
    if not source or not target or source == target:
        return
    key = (source, target)
    if key in seen:
        return
    seen.add(key)
    links.append({"source": source, "target": target})


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    nodes: list[dict] = []
    links: list[dict] = []
    seen_links: set[tuple[str, str]] = set()
    node_by_id: dict[str, dict] = {}
    hierarchy_cache: dict[tuple[str, str, str], str] = {}

    def add_node(node: dict) -> str:
        nid = node["id"]
        if nid not in node_by_id:
            node_by_id[nid] = node
            nodes.append(node)
        return nid

    root = add_node({
        "id": "course-root",
        "label": "4 курс",
        "kind": "root",
        "subject": "",
        "depth": 0,
        "weight": 8,
    })

    for subject in SUBJECTS:
        subject_id = add_node({
            "id": f"subject:{subject}",
            "label": subject,
            "kind": "subject",
            "subject": subject,
            "depth": 0,
            "weight": 6,
        })
        add_link(links, seen_links, root, subject_id)

        base = ROOT / subject
        if not base.exists():
            continue

        pdfs = []
        for full in sorted(base.rglob("*.pdf")):
            rel = full.relative_to(ROOT)
            if "LaTeX" in rel.parts or is_lfs_pointer(full):
                continue
            section = section_for(rel)
            if section == "Литература":
                continue
            pdfs.append((full, rel, section))

        section_ids: dict[str, str] = {}
        for _, _, section in pdfs:
            if section in section_ids:
                continue
            sid = add_node({
                "id": node_id("section", subject, section),
                "label": section,
                "kind": "section",
                "subject": subject,
                "depth": 1,
                "weight": 4,
            })
            section_ids[section] = sid
            add_link(links, seen_links, subject_id, sid)

        for full, rel, section in pdfs:
            if len(nodes) >= MAX_TOTAL_NODES:
                break
            try:
                with fitz.open(full) as doc:
                    toc = doc.get_toc(simple=True) or []
            except Exception:
                continue
            if not toc:
                continue

            stack: dict[int, str] = {0: section_ids[section]}
            count = 0
            for entry in toc:
                if len(nodes) >= MAX_TOTAL_NODES or count >= MAX_TOC_PER_PDF:
                    break
                if len(entry) < 2:
                    continue
                level = max(1, min(int(entry[0] or 1), MAX_DEPTH))
                label = clean_label(entry[1])
                if len(label) < 3:
                    continue
                page = int(entry[2] or 0) if len(entry) > 2 else 0
                parent = stack.get(level - 1) or stack.get(max(stack)) or section_ids[section]
                cache_key = (parent, subject, label.casefold())
                nid = hierarchy_cache.get(cache_key)
                if not nid:
                    nid = node_id("topic", parent, subject, label.casefold())
                    hierarchy_cache[cache_key] = nid
                    add_node({
                        "id": nid,
                        "label": label,
                        "kind": "topic",
                        "subject": subject,
                        "depth": min(level + 1, 5),
                        "weight": max(1, 4 - level),
                        "page": page,
                    })
                add_link(links, seen_links, parent, nid)
                stack[level] = nid
                for stale in [k for k in stack if k > level]:
                    stack.pop(stale, None)
                count += 1

    degree = {n["id"]: 0 for n in nodes}
    for link in links:
        degree[link["source"]] = degree.get(link["source"], 0) + 1
        degree[link["target"]] = degree.get(link["target"], 0) + 1
    for node in nodes:
        node["degree"] = degree.get(node["id"], 0)

    payload = {
        "version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "nodes": nodes,
        "links": links,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), "utf-8")
    print(f"Course graph: {len(nodes)} nodes, {len(links)} links -> {OUT}")


if __name__ == "__main__":
    main()
