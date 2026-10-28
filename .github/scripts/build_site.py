#!/usr/bin/env python3
"""Regenerate the site's derived files so they can never be forgotten.

1. docs/app.js is rebuilt from docs/app-core.js (build_app_bundle.py).
2. Every local reference written as `file.ext?v=…` (or `?build=…`) in the site's
   HTML, the service worker and the reader's modules gets the content hash of
   that file, so a changed file always reaches browsers past their caches.
3. SHELL_VERSION in docs/sw.js becomes a hash of every file the service worker
   precaches, so any change to the application shell installs a new worker.

    python .github/scripts/build_site.py           # update files in place
    python .github/scripts/build_site.py --check   # exit 1 if anything is stale (CI)
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'docs'
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_app_bundle  # noqa: E402

# Files whose text references other site files with a version query.
REFERRERS = [
    'index.html', 'site.js', 'sw.js', 'search-worker.js',
    'pdfjs/viewer.html', 'pdfjs/viewer.js', 'pdfjs/material-paths.js',
    'notebook/viewer.html', 'particles/index.html',
]
REFERENCE = re.compile(
    r'''(?P<path>[A-Za-z0-9_./-]+\.(?:js|mjs|css|png|webp|webmanifest|json))\?(?P<key>v|build)=(?P<version>[A-Za-z0-9._-]*)''')
SHELL_VERSION = re.compile(r"const SHELL_VERSION = '[^']*';")


def digest(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()[:10]


TEXT_SUFFIXES = {'.html', '.js', '.mjs', '.css', '.json', '.webmanifest'}


def content(path: Path, pending: dict[Path, str]) -> bytes:
    """A file as it will be published: pending output if any, else what is on disk.

    Text is hashed with LF line endings, as git stores it, so a Windows checkout
    with core.autocrlf produces the same versions as CI.
    """
    if path in pending:
        return pending[path].encode('utf-8')
    data = path.read_bytes()
    return data.replace(b'\r\n', b'\n') if path.suffix in TEXT_SUFFIXES else data


def stamp(text: str, referrer: Path, pending: dict[Path, str]) -> str:
    def replace(match: re.Match) -> str:
        target = (referrer.parent / match['path']).resolve()
        if not target.is_file() or not target.is_relative_to(DOCS.resolve()):
            return match[0]
        return f"{match['path']}?{match['key']}={digest(content(target, pending))}"
    return REFERENCE.sub(replace, text)


def shell_version(sw_text: str, pending: dict[Path, str]) -> str:
    core = re.search(r'const CORE = \[(.*?)\];', sw_text, re.S)
    h = hashlib.sha1()
    for entry in re.findall(r"'([^']+)'", core[1]) if core else []:
        path = (DOCS / entry.split('?')[0]).resolve()
        h.update(entry.encode('utf-8'))
        if path.is_file():
            h.update(content(path, pending))
    return h.hexdigest()[:10]


def build() -> dict[Path, str]:
    """Return {path: new text} for every derived file whose content changes."""
    outputs: dict[Path, str] = {}
    app = build_app_bundle.OUTPUT.resolve()
    outputs[app] = build_app_bundle.bundle()
    # A referrer's own hash depends on the versions it contains: iterate to a fixed point.
    for _ in range(10):
        changed = False
        for name in REFERRERS:
            path = (DOCS / name).resolve()
            current = outputs.get(path, path.read_text(encoding='utf-8'))
            stamped = stamp(current, path, outputs)
            if stamped != current:
                outputs[path] = stamped
                changed = True
        if not changed:
            break
    else:
        raise SystemExit('Version stamps did not converge (circular references?)')
    sw = (DOCS / 'sw.js').resolve()
    sw_text = outputs.get(sw, sw.read_text(encoding='utf-8'))
    outputs[sw] = SHELL_VERSION.sub(f"const SHELL_VERSION = '{shell_version(sw_text, outputs)}';", sw_text)
    return {p: t for p, t in outputs.items() if not p.exists() or p.read_text(encoding='utf-8') != t}


def main() -> int:
    check = '--check' in sys.argv[1:]
    stale = build()
    if check:
        if stale:
            print('Derived site files are stale; run: python .github/scripts/build_site.py')
            for path in sorted(stale):
                print('  ' + path.relative_to(ROOT).as_posix())
            return 1
        print('Derived site files are up to date')
        return 0
    for path, text in stale.items():
        path.write_text(text, encoding='utf-8')
        print('updated', path.relative_to(ROOT).as_posix())
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
