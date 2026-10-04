"""Particle Explorer browser regressions against the real, unchanged dataset."""
import functools
import http.server
import os
from pathlib import Path
import re
import threading
import unittest
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class ParticleExplorerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.worker_override = None
        class Handler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *_args):
                pass

            def do_GET(self):
                # Exercise GitHub Pages' repository prefix and front-matter processing.
                if self.path.startswith('/NSU_FP_Y4_S1/'):
                    self.path = self.path.removeprefix('/NSU_FP_Y4_S1')
                if self.path.split('?')[0] == '/docs/sw.js' and cls.worker_override:
                    body = cls.worker_override.encode()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/javascript')
                    self.send_header('Cache-Control', 'no-store')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                elif self.path.split('?')[0] in ['/docs/', '/docs/index.html']:
                    body = (ROOT / 'docs/index.html').read_text(encoding='utf-8').removeprefix('---\n---\n').encode()
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                else:
                    super().do_GET()
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}/NSU_FP_Y4_S1/'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(channel=os.environ.get('PLAYWRIGHT_CHANNEL') or None, headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        mobile = self._testMethodName.startswith('test_mobile')
        self.context = self.browser.new_context(
            viewport={'width': 390 if mobile else 1600, 'height': 844 if mobile else 1000},
            is_mobile=mobile, has_touch=mobile,
            service_workers='allow' if self._testMethodName == 'test_offline_explorer' else 'block')
        self.page = self.context.new_page()
        self.page.set_default_timeout(10000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(self.base + 'docs/particles/')
        self.page.locator('.node').first.wait_for()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Browser JavaScript errors')

    def mode(self, name):
        self.page.get_by_role('button', name=name, exact=True).click()

    def test_graph_selection_filters_and_zoom(self):
        self.assertEqual(self.page.locator('.node').count(), 49)
        self.assertEqual(self.page.locator('.edge').count(), 104)
        self.assertEqual(self.page.locator('.node.dim').count(), 0)
        self.page.locator('.node[data-id="pip"] .sphere').click()
        expect(self.page.locator('#detailSymbol')).to_have_text('π⁺')
        expect(self.page.locator('.node[data-id="pip"]')).to_have_attribute('aria-pressed', 'true')
        self.assertGreater(self.page.locator('.edge.active').count(), 0)
        self.assertGreater(self.page.locator('.node.dim').count(), 20)
        self.page.locator('[data-edge="weak"]').uncheck()
        self.assertEqual(self.page.locator('.edge[data-kind="weak"]:visible').count(), 0)
        self.page.locator('[data-edge="family"]').uncheck()
        self.assertEqual(self.page.locator('.edge[data-kind="family"]:visible').count(), 0)
        self.page.locator('#showAll').click()
        self.assertEqual(self.page.locator('.node.dim').count(), 0)
        before = self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('#plus').click()
        self.assertNotEqual(before, self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#centerBtn').click()
        self.assertEqual(before, self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('.filter[data-group="baryons"]').click()
        self.assertEqual(self.page.locator('.node:visible').count(), 9)
        self.assertEqual(self.page.locator('.edge[data-from="pip"]:visible').count(), 0)
        self.page.locator('#chargeFilter').select_option('neutral')
        self.assertEqual(self.page.locator('.node:visible').count(), 4)
        self.page.locator('#resetFilters').click()
        self.assertEqual(self.page.locator('.node:visible').count(), 49)
        rect = self.page.locator('#miniViewport').get_attribute('x')
        self.page.locator('#minimap').click(position={'x': 20, 'y': 20})
        self.assertNotEqual(rect, self.page.locator('#miniViewport').get_attribute('x'))

    def test_search_table_and_classification(self):
        self.page.locator('#search').fill('211')
        expect(self.page.locator('#detailSymbol')).to_have_text('π⁺')
        self.page.locator('#search').fill('-211')
        expect(self.page.locator('#detailSymbol')).to_have_text('π⁻')
        self.page.locator('#search').fill('443')
        expect(self.page.locator('#detailSymbol')).to_have_text('J/ψ')
        self.mode('Таблица')
        expect(self.page.locator('#world')).to_be_hidden()
        self.assertEqual(self.page.locator('tbody tr').count(), 1)
        self.page.locator('#search').fill('')
        self.assertEqual(self.page.locator('tbody tr').count(), 49)
        self.page.locator('[data-sort="mass"]').click()
        expect(self.page.locator('tbody tr').first.locator('td').nth(4)).to_have_text('0')
        self.page.locator('[data-sort="mass"]').click()
        expect(self.page.locator('tbody tr').first.locator('td').first).to_have_text('t')
        self.page.locator('tbody [data-particle="p"]').click()
        expect(self.page.locator('#detailSymbol')).to_have_text('p')
        self.mode('Классификация')
        self.assertEqual(self.page.locator('.class-family [data-particle]').count(), 49)
        self.assertIn('Мезоны · бозоны', self.page.locator('#modeContent').inner_text())
        self.page.locator('#modeContent [data-particle="gamma"]').click()
        expect(self.page.locator('#detailSymbol')).to_have_text('γ')
        self.page.locator('#search').fill('no_such_particle')
        expect(self.page.locator('#emptyState')).to_be_visible()
        self.page.locator('#clearSearch').click()
        self.assertEqual(self.page.locator('.class-family [data-particle]').count(), 49)

    def test_composition_and_decay_chain(self):
        self.page.locator('#search').fill('протон')
        self.mode('Кварковый состав')
        expect(self.page.locator('.formula')).to_have_text('uud')
        self.assertEqual(self.page.locator('.component-orb').all_text_contents(), ['u', 'u', 'd'])
        self.page.locator('#search').fill('')
        self.page.locator('#localParticle').select_option('pip')
        self.assertEqual(self.page.locator('.component-orb').all_text_contents(), ['u', 'd̄'])
        self.page.locator('#localParticle').select_option('eta')
        self.assertEqual(self.page.locator('.component-orb').all_text_contents(), ['u', 'ū', 'd', 'd̄', 's', 's̄'])
        self.page.locator('#localParticle').select_option('jpsi')
        self.assertEqual(self.page.locator('.component-orb').all_text_contents(), ['c', 'c̄'])
        self.page.locator('.component-orb').first.click()
        expect(self.page.locator('#detailSymbol')).to_have_text('c')
        self.mode('Распады')
        self.page.locator('#localParticle').select_option('pip')
        expect(self.page.locator('.channel-head')).to_contain_text('≈ 99.99%')
        self.page.locator('.channel-products [data-particle="mup"]').click()
        expect(self.page.locator('.local-parent')).to_have_text('μ⁺')
        expect(self.page.locator('.channel-head')).to_contain_text('e⁺ νe ν̄μ')
        self.assertEqual(self.page.locator('.channel-products [data-particle="numu"]').count(), 0)
        expect(self.page.locator('.external-chip')).to_have_text('ν̄μ')
        self.page.locator('#localParticle').select_option('p')
        expect(self.page.locator('.stable-message')).to_be_visible()
        self.mode('Граф')
        expect(self.page.locator('#world')).to_be_visible()
        self.page.locator('#tab-links').click()
        self.assertGreater(self.page.locator('#related [data-particle]').count(), 0)
        self.page.locator('#tab-decays').click()
        expect(self.page.locator('#decaysPanel')).to_be_visible()
        expect(self.page.locator('#propertiesPanel')).to_be_hidden()

    def test_mobile_drawer_sheet_pan_and_pinch(self):
        expect(self.page.locator('#minimapWrap')).to_be_hidden()
        self.assertTrue(self.page.locator('.modes').evaluate('e=>e.scrollWidth > e.clientWidth'))
        self.page.locator('#filtersBtn').click()
        expect(self.page.locator('#filters')).to_have_class('left open')
        expect(self.page.locator('#filtersBtn')).to_have_attribute('aria-expanded', 'true')
        self.page.locator('.filter[data-group="baryons"]').click()
        expect(self.page.locator('#overlay')).to_be_hidden()
        self.page.locator('#search').fill('протон')
        self.page.locator('#search').press('Enter')
        expect(self.page.locator('#details')).to_have_class('right open')
        expect(self.page.locator('#detailSymbol')).to_have_text('p')
        self.page.wait_for_function("document.querySelector('#details').getBoundingClientRect().bottom <= innerHeight + 1 && document.querySelector('#filters').getBoundingClientRect().right <= 0")
        before_sheet_pan = self.page.locator('#viewport').get_attribute('transform')
        self.page.mouse.move(50, 240)
        self.page.mouse.down()
        self.page.mouse.move(90, 265, steps=5)
        self.page.mouse.up()
        self.assertNotEqual(before_sheet_pan, self.page.locator('#viewport').get_attribute('transform'), 'The map stays interactive above the bottom sheet')
        self.page.locator('#closeDetail').click()
        expect(self.page.locator('#overlay')).to_be_hidden()
        self.page.locator('#filtersBtn').click()
        self.page.locator('#resetFilters').click()
        self.page.locator('#closeFilters').click()
        self.page.wait_for_function("document.querySelector('#filters').getBoundingClientRect().right <= 0")
        before = self.page.locator('#viewport').get_attribute('transform')
        self.page.mouse.move(100, 240)
        self.page.mouse.down()
        self.page.mouse.move(150, 290, steps=5)
        self.page.mouse.up()
        self.assertNotEqual(before, self.page.locator('#viewport').get_attribute('transform'))
        # CDP delivers real two-finger input through the browser's Pointer Events pipeline.
        cdp = self.context.new_cdp_session(self.page)
        def touch(kind, points):
            cdp.send('Input.dispatchTouchEvent', {'type':kind, 'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(points)]})
        before_scale = self.page.locator('#reset').inner_text()
        touch('touchStart', [(140, 400), (240, 400)])
        touch('touchMove', [(100, 400), (280, 400)])
        touch('touchEnd', [])
        self.assertNotEqual(before_scale, self.page.locator('#reset').inner_text())
        self.assertEqual(self.page.locator('.node.selected').count(), 0, 'A pinch must not select a particle')
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))

    def test_routes_and_catalog_without_service_worker(self):
        self.page.goto(self.base + 'particles/?from=short#map')
        self.page.wait_for_url('**/docs/particles/?from=short#map')
        self.assertEqual(self.page.locator('.node').count(), 49)
        self.page.goto(self.base + 'docs/#subject=%D0%91%D0%B0%D0%B7%D0%B0')
        card = self.page.locator('.knowledge-card').filter(has=self.page.locator('h4', has_text='Частицы'))
        expect(card).to_have_attribute('href', 'particles/')
        card.click()
        self.page.wait_for_url('**/docs/particles/')
        self.assertEqual(self.page.locator('.node').count(), 49)

    def test_responsive_layout(self):
        for width,height in [(320,740),(390,844),(768,1024),(1024,768),(1600,1000),(1920,1080)]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width':width,'height':height})
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.mode('Таблица')
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.assertEqual(self.page.locator('tbody tr').count(),49)
                self.mode('Граф')

    def test_offline_explorer(self):
        self.page.wait_for_function('!!navigator.serviceWorker.controller', timeout=20000)
        self.page.wait_for_function("async()=>{const keys=await caches.keys(); const key=keys.find(k=>k.includes('-shell-')); return !!key && !!(await (await caches.open(key)).match(new URL('index.html',location.href).href));}")
        # A shell update must remove only the old shell, preserving saved materials.
        self.page.evaluate("""async()=>{
            const prefix='nsu-app-'+new URL('../',location.href).pathname+'-';
            await (await caches.open(prefix+'pdf-v1')).put(new URL('saved.pdf',location.href).href,new Response('saved-before-update'));
        }""")
        old_shell = self.page.evaluate("async()=>(await caches.keys()).find(k=>k.includes('-shell-'))")
        try:
            type(self).worker_override = re.sub(r"SHELL_VERSION = '[^']+'", "SHELL_VERSION = 'particle-test-update'", (ROOT/'docs/sw.js').read_text(encoding='utf-8'))
            self.page.evaluate('async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();}')
            self.page.wait_for_function("async()=>(await caches.keys()).some(k=>k.endsWith('shell-particle-test-update'))")
            self.page.wait_for_function('async old=>!(await caches.keys()).includes(old)', arg=old_shell)
            saved = self.page.evaluate("""async()=>{
                const prefix='nsu-app-'+new URL('../',location.href).pathname+'-';
                return (await (await caches.open(prefix+'pdf-v1')).match(new URL('saved.pdf',location.href).href)).text();
            }""")
            self.assertEqual(saved, 'saved-before-update')
        finally:
            type(self).worker_override = None
        self.context.set_offline(True)
        self.page.reload()
        self.page.locator('.node').first.wait_for()
        self.assertEqual(self.page.locator('.node').count(),49)
        self.mode('Распады')
        expect(self.page.locator('.channel-head')).to_contain_text('μ⁺ νμ')
        self.context.set_offline(False)


if __name__ == '__main__':
    unittest.main()
