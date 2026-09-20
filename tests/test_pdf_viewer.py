"""Browser regressions for the custom PDF viewer."""
import functools
import http.server
import os
from pathlib import Path
import threading
import unittest
from urllib.parse import parse_qs, urlencode, urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HIDDEN_PDF = "ФЭЧ/04_Литератру/PhysRevD.pdf"
SUBJECTS = {"ОВФ", "СВЧ", "ТДиСФ", "ФКСВ", "ФЭЧ", "ФиХАиМ"}


def pick_pdf():
    candidates = []
    for path in ROOT.rglob("*.pdf"):
        rel = path.relative_to(ROOT)
        if not rel.parts or rel.parts[0] not in SUBJECTS:
            continue
        if "LaTeX" in rel.parts or rel.as_posix() == HIDDEN_PDF:
            continue
        if path.stat().st_size > 2048:
            candidates.append((path.stat().st_size, path))
    return min(candidates)[1]


PDF = pick_pdf()
PDF_REL = PDF.relative_to(ROOT).as_posix()
SUBJECT = PDF.relative_to(ROOT).parts[0]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path.split("?")[0] == "/docs/index.html":
            body = (ROOT / "docs/index.html").read_bytes()
            body = body[body.index(b"<!doctype"):]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


class PdfViewerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            channel=os.environ.get("NOTEBOOK_BROWSER_CHANNEL") or None)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 390, "height": 844})
        self.page = self.context.new_page()
        self.errors = []
        self.requests = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("request", lambda request: self.requests.append(request.url))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def viewer_url(self):
        return self.base + "/docs/pdfjs/viewer.html?" + urlencode({
            "file": PDF_REL, "subject": SUBJECT, "title": "PDF regression fixture"
        })

    def open_viewer(self):
        self.page.goto(self.viewer_url(), wait_until="domcontentloaded")
        self.page.wait_for_function(
            "() => document.querySelector('#total').textContent.trim() !== '/ —' "
            "&& !document.querySelector('#loading').classList.contains('show')",
            timeout=30000,
        )

    def test_search_index_loads_only_after_search_button_and_is_versioned(self):
        self.open_viewer()
        self.page.wait_for_timeout(300)
        self.assertFalse(any("/search-index/part-" in url for url in self.requests))
        with self.page.expect_request(lambda req: "/search-index/part-" in req.url, timeout=15000) as info:
            self.page.click("#searchToggle")
        query = parse_qs(urlparse(info.value.url).query)
        self.assertTrue(query.get("v"))

    def test_mobile_page_picker(self):
        self.open_viewer()
        self.page.click("#mPageInfo")
        self.assertIn("open", self.page.locator("#pageJump").get_attribute("class"))
        total = int(self.page.locator("#mPageInfo").inner_text().split("/")[-1].strip())
        target = 2 if total >= 2 else 1
        self.page.fill("#pageJumpInput", str(target))
        self.page.click(".page-jump-go")
        self.page.wait_for_function(
            "(target) => document.querySelector('#mPageInfo').textContent.trim().startsWith(target + ' /')",
            arg=str(target),
            timeout=30000,
        )

    def test_hidden_lfs_pdf_is_not_in_site_files(self):
        self.page.goto(self.base + "/docs/index.html", wait_until="domcontentloaded")
        self.page.wait_for_function("() => typeof FILES !== 'undefined' && FILES.length > 0")
        self.assertFalse(self.page.evaluate(
            "(path) => FILES.some(file => file.path === path)", HIDDEN_PDF))


if __name__ == "__main__":
    unittest.main()
