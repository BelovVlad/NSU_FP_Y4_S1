"""Browser regressions against the real static viewer and repository notebooks.

python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python -m unittest discover -s tests -v

Set NOTEBOOK_BROWSER_CHANNEL=msedge to use an installed Microsoft Edge.
CDN access is required, just as for the deployed viewer. No notebook code runs.
"""
import base64
import functools
import http.server
import json
import os
from pathlib import Path
import threading
import unittest
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOKS = sorted(ROOT.rglob('*.ipynb'))
INTEGRALS = next(p for p in NOTEBOOKS if p.stem == 'Интегралы')
UNITS = next(p for p in NOTEBOOKS if p.stem.startswith('Системы единиц'))


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        # GitHub Pages strips Jekyll front matter before serving the homepage.
        if self.path.split('?')[0] == '/docs/index.html':
            body = (ROOT / 'docs/index.html').read_bytes()
            body = body[body.index(b'<!doctype'):]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


class NotebookViewerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            channel=os.environ.get('NOTEBOOK_BROWSER_CHANNEL') or None)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 900})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def url(self, path, **params):
        path = path.relative_to(ROOT).as_posix() if isinstance(path, Path) else path
        return self.base + '/docs/notebook/viewer.html?' + urlencode({'file': path, **params})

    def ready(self, frame=None):
        frame = frame or self.page
        frame.wait_for_function("""() => document.querySelector('.cells') &&
            !document.querySelector('.math-placeholder:not(.math-rendered):not(.math-error)') &&
            (!document.querySelector('.math-placeholder') || document.querySelector('#MJX-CHTML-styles'))""")
        frame.evaluate('document.fonts.ready')
        self.assertEqual(frame.locator('.math-error,mjx-merror').count(), 0)

    def open(self, path, **params):
        self.page.goto(self.url(path, **params))
        self.ready()

    def contained(self, frame=None):
        frame = frame or self.page
        self.assertLessEqual(frame.evaluate('document.documentElement.scrollWidth-innerWidth'), 1)

    def tagged_geometry(self, frame=None):
        frame = frame or self.page
        dimensions = frame.locator('#cell-2 .math-display').evaluate_all("""nodes =>
            nodes.slice(0,3).map(n => {
                // Measure the equation body, not its full-width tagged wrapper.
                const e=n.querySelector('mjx-table'), r=e.getBoundingClientRect();
                return {width:r.width,height:r.height,display:getComputedStyle(e).display};
            })""")
        self.assertEqual(len(dimensions), 3)
        for box in dimensions:
            self.assertGreater(box['width'], 150)
            self.assertGreater(box['width'], box['height'] * 3)
            self.assertEqual(box['display'], 'inline-block')

    def test_all_repository_notebooks_desktop_and_mobile(self):
        for width in (1280, 390):
            self.page.set_viewport_size({'width': width, 'height': 900})
            for path in NOTEBOOKS:
                with self.subTest(width=width, notebook=str(path.relative_to(ROOT))):
                    nb = json.loads(path.read_text(encoding='utf-8'))
                    self.open(path)
                    self.assertEqual(self.page.locator('.cell').count(), len(nb['cells']))
                    self.assertEqual(self.page.locator('.code-box .hljs').count(),
                                     sum(c['cell_type'] == 'code' for c in nb['cells']))
                    self.assertEqual(self.page.locator('.output-row').count(),
                                     sum(len(c.get('outputs', [])) for c in nb['cells']))
                    self.contained()
                    self.assertEqual(self.page.locator('main img').evaluate_all(
                        'images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)'), [])
                    if path == INTEGRALS:
                        self.tagged_geometry()
                        # Gamma/Beta, cases and the long display equations survive.
                        self.assertGreater(self.page.locator('mjx-mtable').count(), 10)
                    if path == UNITS:
                        table = self.page.locator('.table-scroll').first
                        self.assertGreaterEqual(table.locator('table').evaluate(
                            'e=>parseFloat(getComputedStyle(e).fontSize)'), 14)
                        self.assertTrue(table.locator('th').evaluate_all(
                            "nodes=>nodes.every(e=>getComputedStyle(e).position==='static')"))
                        if width == 390:
                            self.assertGreater(table.evaluate('e=>e.scrollWidth'), table.evaluate('e=>e.clientWidth'))
                            table.evaluate('e=>e.scrollLeft=200')
                            self.assertGreater(table.evaluate('e=>e.scrollLeft'), 0)

    def test_zoom_themes_search_and_narrow_preview(self):
        self.page.set_viewport_size({'width': 320, 'height': 800})
        self.open(INTEGRALS, embed=1, theme='na19')
        self.assertIn('theme-na19', self.page.locator('body').get_attribute('class'))
        self.assertEqual(self.page.locator('#back').is_visible(), False)
        self.assertEqual(self.page.locator('#zoomSelect option').evaluate_all('ns=>ns.map(n=>n.value)'),
                         ['80', '90', '100', '110', '125', '150'])
        for zoom in ('80', '90', '100', '110', '125', '150'):
            self.page.select_option('#zoomSelect', zoom)
            self.contained()
            self.assertEqual(self.page.evaluate("localStorage.getItem('nsu-notebook-zoom')"), zoom)
        self.page.reload()
        self.ready()
        self.assertEqual(self.page.input_value('#zoomSelect'), '150')
        for theme in ('na19x', '', 'na19'):
            self.page.evaluate("theme=>postMessage({type:'nsu-pdf-theme',theme},location.origin)", theme)
            self.page.wait_for_function("theme=>document.body.classList.contains('theme-'+theme) || (!theme && document.body.className==='embed')", arg=theme)
        self.page.fill('#findInput', 'Гамма')
        self.page.click('#findNext')
        self.assertEqual(self.page.locator('.cell.find-hit').count(), 1)
        self.assertRegex(self.page.inner_text('#findStatus'), r'^1/[1-9]')

    def test_parent_preview_fullscreen_and_close(self):
        self.page.goto(self.base + '/docs/index.html#subject=' + 'База')
        self.page.wait_for_function('FILES.length>0')
        path = INTEGRALS.relative_to(ROOT).as_posix()
        # Select through the same state/render path as a material click.
        self.page.evaluate("path=>{state.subject='База';state.section='Практика';state.selected=fileByPath(path);renderSubject()}", path)
        preview = self.page.locator('iframe.preview-frame').content_frame
        preview.locator('#cell-2 mjx-table').first.wait_for()
        frame = next(f for f in self.page.frames if 'embed=1' in f.url)
        self.ready(frame)
        self.tagged_geometry(frame)
        self.contained(frame)
        self.page.click('a.preview-open-full')
        self.page.wait_for_function("document.querySelector('#pdfFullscreen').classList.contains('ready')")
        frame = next(f for f in self.page.frames if 'full=1' in f.url)
        self.ready(frame)
        self.tagged_geometry(frame)
        frame.locator('#back').click()
        self.page.wait_for_function("!document.querySelector('#pdfFullscreen').classList.contains('open')")

    def test_delimiters_code_safe_html_attachments_and_output_formats(self):
        source = r'''# Heading $$\operatorname{Res}_{z=0}\frac{1}{z}$$

> $$
> \underset{x}{a_b} + \overset{y}{c} + \mathbf{x} + \boldsymbol{y}
> $$

Inline $a_b * c ~ d$ and \(\sqrt{x}\), then \[\frac{1}{2}\].

\begin{align} a&=b \\ c&=d \end{align}

\begin{gather} a=b \\ c=d \end{gather}

$$\begin{cases}x&x>0\\0&x\le0\end{cases}$$

$$\begin{pmatrix}1&2\\3&4\end{pmatrix}$$

| Math | Text |
| --- | --- |
| $\lvert x\rvert$ | **safe** |

`$literal$`

```python
print('$literal$')
```

    $indented$

<code>$htmlcode$</code>

<a title="$literal$" href="https://example.com">link</a>
<img src="attachment:pixel.png" alt="$alt$" onerror="window.unsafe=true">
<script>window.unsafe=true</script>

NSUMATHPLACEHOLDER0TOKEN
'''
        pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
        jpeg = base64.b64encode(self.page.screenshot(type='jpeg', clip={'x': 0, 'y': 0, 'width': 1, 'height': 1})).decode()
        bundles = [
            {'text/plain': 'plain output'}, {'text/html': '<table><tr><th>Header</th><td>Value</td></tr></table><script>window.unsafe=true</script>'},
            {'text/markdown': '**markdown** $x_1$'}, {'text/latex': r'\[\frac{a}{b}\]'},
            {'image/png': pixel}, {'image/jpeg': jpeg},
            {'image/svg+xml': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle r="5" cx="10" cy="10"/></svg>'},
            {'application/json': {'value': 42}},
        ]
        fixture = {'nbformat': 4, 'metadata': {}, 'cells': [
            {'cell_type': 'markdown', 'source': source, 'attachments': {'pixel.png': {'image/png': pixel}}},
            {'cell_type': 'code', 'source': 'print(42)', 'execution_count': 1, 'outputs':
             [{'output_type': 'display_data', 'data': data} for data in bundles] +
             [{'output_type': 'stream', 'text': 'stream output'},
              {'output_type': 'error', 'ename': 'ValueError', 'evalue': 'example', 'traceback': ['\x1b[31mtrace\x1b[0m']},
              {'output_type': 'execute_result', 'execution_count': 1, 'data': {'text/plain': '42'}}]},
            {'cell_type': 'raw', 'source': '$raw$'},
        ]}
        self.page.route('**/__fixture__.ipynb', lambda route: route.fulfill(json=fixture))
        self.open('__fixture__.ipynb')
        self.assertFalse(self.page.evaluate('Boolean(window.unsafe)'))
        self.assertEqual(self.page.locator('h1 .math-rendered').count(), 1)
        self.assertEqual(self.page.locator('blockquote .math-rendered').count(), 1)
        self.assertEqual(self.page.locator('code .math-placeholder').count(), 0)
        self.assertIn('$indented$', self.page.locator('#cell-1').inner_text())
        self.assertIn('$htmlcode$', self.page.locator('#cell-1').inner_text())
        self.assertIn('NSUMATHPLACEHOLDER0TOKEN', self.page.locator('#cell-1').inner_text())
        self.assertEqual(self.page.locator('#cell-1 a').get_attribute('title'), '$literal$')
        self.assertEqual(self.page.locator('#cell-1 img').get_attribute('alt'), '$alt$')
        self.assertTrue(self.page.locator('#cell-1 img').evaluate('e=>e.naturalWidth>0'))
        self.assertTrue(self.page.locator('.output-body img').evaluate_all('images=>images.every(e=>e.naturalWidth>0)'))
        self.assertEqual(self.page.locator('.output-row').count(), len(bundles) + 3)
        self.assertEqual(self.page.locator('.svg-output svg').count(), 1)
        self.assertEqual(self.page.locator('.output-body .table-scroll').count(), 1)
        self.assertIn('ValueError: example', self.page.locator('.output-error').inner_text())
        self.assertEqual(self.page.locator('.raw-cell pre').inner_text(), '$raw$')


if __name__ == '__main__':
    unittest.main()
