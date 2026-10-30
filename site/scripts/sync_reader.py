#!/usr/bin/env python3
"""Copy the shared PDF reader from this site to the other PweB sites.

The reader lives here, in site/web/pdfjs (with site/web/vendor, site/web/fonts and
site/web/annotations-store.js).
Diploma and Department keep a copy in site/viewer/ with the same layout; this script refreshes it.
Each copy keeps its own:
  pdfjs/reader-config.js    repository, page title, where «Назад» leads
  pdfjs/material-paths.js   links to renamed files (NSU only renames materials)
  <head> of pdfjs/viewer.html (icons, extra stylesheets); the <body> is shared
and Diploma also keeps its shared, encrypted notes (pdfjs/notes.js, annotations-store.js).
Version stamps (?v=) in the copies are recomputed from the copied files.

    python site/scripts/sync_reader.py           # update the copies next to this repository
    python site/scripts/sync_reader.py --check   # exit 1 if a copy is out of date
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'site' / 'web'
PWEB = ROOT.parent
TARGETS = {
    'Diploma': {'root': PWEB / 'Diploma' / 'site' / 'viewer', 'own_notes': True},
    'Department': {'root': PWEB / 'Department' / 'site' / 'viewer', 'own_notes': False},
}
SHARED = ['pdfjs/viewer.js', 'pdfjs/viewer.css', 'pdfjs/controls.css', 'pdfjs/icons.js',
          'pdfjs/pdf-tone.js', 'pdfjs/search-text.js', 'pdfjs/notes.css',
          'search-worker.js']  # full-text search over a site's search-index/ (Department builds one)
NOTES = ['pdfjs/notes.js', 'annotations-store.js']
VENDOR = 'vendor/pdfjs-4.10.38'
FONTS = 'fonts'  # the reader's stylesheet imports ../fonts/fonts.css; the site's pages use it too
STAMPED = ['search-worker.js', 'pdfjs/viewer.js', 'pdfjs/viewer.html']  # stamp viewer.js first: the page refers to it
REFERENCE = re.compile(r'''(?P<path>[A-Za-z0-9_./-]+\.(?:js|mjs|css))\?v=(?P<version>[A-Za-z0-9._-]*)''')
BODY = re.compile(r'<body>.*</body>', re.S)


BINARY = {'.bcmap', '.pfb', '.ttf', '.woff', '.woff2', '.png', '.webp'}


def text(data: bytes) -> bytes:
    return data.replace(b'\r\n', b'\n')


def load(path: Path) -> bytes:
    """A file as git stores it: text with LF line endings, binaries as they are."""
    data = path.read_bytes()
    return data if path.suffix in BINARY else text(data)


def planned(target: dict) -> dict[Path, bytes]:
    """Every file of one copy as it should be: {path: content}."""
    root = target['root']
    files = {root / name: load(SOURCE / name) for name in SHARED}
    if not target['own_notes']:
        files.update({root / name: load(SOURCE / name) for name in NOTES})
    for folder in (VENDOR, FONTS):
        for path in sorted((SOURCE / folder).rglob('*')):
            if path.is_file():
                files[root / path.relative_to(SOURCE)] = load(path)
    page = root / 'pdfjs' / 'viewer.html'
    own = load(page).decode('utf-8')
    body = BODY.search(load(SOURCE / 'pdfjs' / 'viewer.html').decode('utf-8'))[0]
    files[page] = BODY.sub(lambda _: body, own, count=1).encode('utf-8')

    def current(path: Path) -> bytes:
        return files[path] if path in files else load(path)

    for name in STAMPED:
        path = root / name

        def restamp(match: re.Match) -> str:
            target_file = (path.parent / match['path']).resolve()
            if not target_file.is_file() and target_file not in files:
                return match[0]
            return f"{match['path']}?v={hashlib.sha1(current(target_file)).hexdigest()[:10]}"
        files[path] = REFERENCE.sub(restamp, current(path).decode('utf-8')).encode('utf-8')
    return files


def main() -> int:
    check = '--check' in sys.argv[1:]
    stale = []
    for name, target in TARGETS.items():
        if not target['root'].is_dir():
            print(f'{name}: no copy at {target["root"]}, skipped')
            continue
        missing = [n for n in ('pdfjs/reader-config.js', 'pdfjs/material-paths.js') if not (target['root'] / n).is_file()]
        if missing:
            raise SystemExit(f'{name}: create its own {", ".join(missing)} first')
        files = planned(target)
        changed = [path for path, data in files.items()
                   if not path.is_file() or load(path) != data]
        for path in changed:
            stale.append(path)
            if not check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(files[path])
        print(f'{name}: {len(changed)} file(s) {"out of date" if check else "updated"}')
    return 1 if check and stale else 0


if __name__ == '__main__':
    sys.exit(main())
