"""Assemble the GitHub Pages site from the repository (deploy-pages.yml).

The published layout is the one the site has always had:
    site/root/*   -> /            (redirect to docs/, particles/ short link)
    site/web/*    -> /docs/       (the site itself)
    <subject>/*   -> /<subject>/  (course materials the viewers open)

Only tracked files are published. Like Jekyll before, names starting with
'.', '_' or '#' are skipped, and HIDDEN stays in git but off the site.

    python site/scripts/assemble_pages.py _site
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# Same list as HIDDEN_SITE_PATHS in build_search_index.py.
HIDDEN = {'ФЭЧ/04_Литератру/PhysRevD.pdf'}
# Repository service files outside site/ that are not part of the site.
SERVICE = {'giscus.json'}


def published_path(path):
    if path.startswith('site/web/'):
        return 'docs/' + path.removeprefix('site/web/')
    if path.startswith('site/root/'):
        return path.removeprefix('site/root/')
    if path.startswith('site/') or path in SERVICE or path in HIDDEN:
        return None
    return path


def main(out):
    out = Path(out).resolve()
    if out.exists():
        shutil.rmtree(out)
    files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0')
    count = 0
    for path in filter(None, files):
        target = published_path(path)
        if target is None or any(part[0] in '._#' for part in target.split('/')):
            continue
        source = ROOT / path
        if not source.is_file():
            continue  # Deleted in the working tree but not yet committed.
        destination = out / target
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        count += 1
    print(f'Pages site: {count} files in {out}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / '_site')
