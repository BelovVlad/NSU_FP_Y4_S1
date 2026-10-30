"""Serve the repository in the layout GitHub Pages publishes (deploy-pages.yml).

Sources live in site/, but the published site has site/web as docs/ and
site/root at the top, next to the subject folders.
"""
import http.server
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / 'site' / 'web'
SITE_ROOT = ROOT / 'site' / 'root'


def source(published):
    """Repository file behind a published path such as 'docs/sw.js'."""
    path = Path(published).as_posix().lstrip('/') if published else ''
    if path == 'docs' or path.startswith('docs/'):
        return WEB / path[5:]
    top = path.split('/', 1)[0]
    if not top or (SITE_ROOT / top).exists():
        return SITE_ROOT / path
    return ROOT / path


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        return str(source(unquote(urlsplit(path).path)))
