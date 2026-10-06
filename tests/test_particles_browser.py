"""Particle Explorer browser regressions against the real, unchanged dataset."""
import functools
import http.server
import json
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
        class Server(http.server.ThreadingHTTPServer):
            # Cold page loads and shell updates fetch several assets concurrently.
            request_queue_size = 64
        cls.server = Server(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
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
        self.page.set_default_navigation_timeout(30000)
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
        self.assertEqual(self.page.locator('.node').count(), 200)
        self.assertEqual(self.page.locator('.edge').count(), 746)
        self.assertEqual(self.page.locator('.node.dim').count(), 0)
        self.page.locator('.node[data-id="pip"] .sphere').click()
        expect(self.page.locator('#detailSymbol')).to_have_text('π⁺')
        expect(self.page.locator('.node[data-id="pip"]')).to_have_attribute('aria-pressed', 'true')
        self.assertGreater(self.page.locator('.edge.active').count(), 0)
        self.assertGreater(self.page.locator('.node.dim').count(), 21)
        self.page.locator('[data-edge="weak"]').uncheck()
        self.assertEqual(self.page.locator('.edge[data-kind="weak"]:visible').count(), 0)
        self.page.locator('[data-edge="family"]').uncheck()
        self.assertEqual(self.page.locator('.edge[data-kind="family"]:visible').count(), 0)
        self.page.locator('#showAll').click()
        self.assertEqual(self.page.locator('.node.dim').count(), 0)
        self.page.locator('#centerBtn').click()
        before = self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('#plus').click()
        self.assertNotEqual(before, self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#centerBtn').click()
        self.assertEqual(before, self.page.locator('#viewport').get_attribute('transform'))
        self.assertEqual(self.page.locator('.node.selected').count(), 0)
        self.assertEqual(self.page.locator('.cluster-muted').count(), 0)
        self.assertEqual(self.page.locator('.node.dim').count(), 0)
        self.page.locator('.filter[data-group="baryons"]').click()
        self.assertEqual(self.page.locator('.node:visible').count(), 66)
        self.assertEqual(self.page.locator('.edge[data-from="pip"]:visible').count(), 0)
        self.page.locator('#chargeFilter').select_option('neutral')
        self.assertEqual(self.page.locator('.node:visible').count(), 29)
        self.page.locator('#resetFilters').click()
        self.assertEqual(self.page.locator('.node:visible').count(), 200)
        self.page.locator('#plus').click()
        self.page.locator('#plus').click()
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
        self.assertEqual(self.page.locator('tbody tr').count(), 200)
        self.page.locator('[data-sort="mass"]').click()
        expect(self.page.locator('tbody tr').first.locator('td').nth(4)).to_have_text('0')
        self.page.locator('[data-sort="mass"]').click()
        expect(self.page.locator('tbody tr').first.locator('td').first).to_have_text('t')
        self.page.locator('tbody [data-particle="p"]').click()
        expect(self.page.locator('#detailSymbol')).to_have_text('p')
        self.mode('Классификация')
        self.assertEqual(self.page.locator('.class-family [data-particle]').count(), 200)
        self.assertIn('Мезоны · бозоны', self.page.locator('#modeContent').inner_text())
        self.page.locator('#modeContent [data-particle="gamma"]').click()
        expect(self.page.locator('#detailSymbol')).to_have_text('γ')
        self.page.locator('#search').fill('no_such_particle')
        expect(self.page.locator('#emptyState')).to_be_visible()
        self.page.locator('#clearSearch').click()
        self.assertEqual(self.page.locator('.class-family [data-particle]').count(), 200)

    def test_family_drilldown_and_connection_density(self):
        self.assertEqual(self.page.locator('.region').count(), 5)
        self.assertEqual(self.page.locator('.cluster').count(), 23)
        self.assertEqual(self.page.locator('.edge:visible').count(), 0)
        self.assertEqual(self.page.locator('.bundle:visible').count(), 0)
        self.page.locator('.node[data-id="pip"] .sphere').hover()
        self.assertEqual(self.page.locator('.edge:visible').count(), 0, 'Hover leaves the honeycomb unobstructed')
        self.assertTrue(self.page.locator('.edge:visible').evaluate_all('''edges=>edges.every(e=>
            [e.dataset.from,e.dataset.to].some(id=>document.querySelector('.node[data-id="'+id+'"]').dataset.cluster==='mesons:lightmesons'))'''))
        self.page.mouse.move(230, 180)
        self.assertEqual(self.page.locator('.edge:visible').count(), 0)
        before = self.page.locator('#viewport').get_attribute('transform')
        # Family selection highlights its cells without moving the camera.
        self.page.locator('.cluster[data-cluster="mesons:lightmesons"]').focus()
        self.page.keyboard.press('Enter')
        expect(self.page.locator('#mapPath')).to_have_text('Мезоны / Лёгкие')
        self.assertEqual(before, self.page.locator('#viewport').get_attribute('transform'))
        self.assertEqual(self.page.locator('.node.selected').count(), 0)
        self.assertEqual(self.page.locator('.cluster-muted').count(), 22)
        self.assertEqual(self.page.locator('.node.dim').count(), 182)
        self.page.locator('.node[data-id="pip"] .sphere').click()
        self.assertGreater(self.page.locator('.edge.active:visible').count(), 0)
        self.page.locator('.node[data-id="pip"] .sphere').hover()
        self.assertEqual(self.page.locator('.edge.preview:visible').count(), 0)
        self.assertTrue(self.page.locator('.edge:visible').evaluate_all("edges=>edges.every(e=>e.dataset.from==='pip'||e.dataset.to==='pip')"))
        self.page.locator('#mapHome').click()
        expect(self.page.locator('#mapPath')).to_have_text('Все семейства')
        self.assertEqual(before, self.page.locator('#viewport').get_attribute('transform'))

    def test_group_headers_tiles_and_zoom_limits(self):
        self.assertEqual(self.page.locator('.node polygon.hex-cell').count(),200)
        self.assertEqual(self.page.locator('.node circle').count(),0)
        self.assertEqual(self.page.locator('.region-boundary,.region-orbit,.cluster-inner').count(),0)
        self.assertTrue(self.page.locator('.hex-cell').evaluate_all('cells=>cells.every(c=>c.points.numberOfItems===6)'))
        self.assertFalse(self.page.locator('#edges').get_attribute('mask'))
        self.assertEqual(self.page.locator('.edge-track').count(),746)
        self.assertTrue(self.page.evaluate("!!(document.querySelector('#nodes').compareDocumentPosition(document.querySelector('#edges')) & Node.DOCUMENT_POSITION_FOLLOWING)"))
        for lower,upper in [('#hulls','#groupBorders'),('#groupBorders','#edges'),('#edges','#endpointMarks')]:
            self.assertTrue(self.page.evaluate("([lower,upper])=>!!(document.querySelector(lower).compareDocumentPosition(document.querySelector(upper)) & Node.DOCUMENT_POSITION_FOLLOWING)",[lower,upper]))
        overview=float(self.page.locator('#viewport').get_attribute('transform').split('scale(')[1].rstrip(')'))
        self.page.mouse.move(700,500)
        self.page.mouse.wheel(0,100000)
        self.page.wait_for_timeout(100)
        self.assertAlmostEqual(float(self.page.locator('#viewport').get_attribute('transform').split('scale(')[1].rstrip(')')),overview)
        expect(self.page.locator('#minus')).to_be_disabled()
        self.page.locator('.region[data-region="mesons"] .region-title').click()
        expect(self.page.locator('#mapPath')).to_have_text('Мезоны')
        self.assertEqual(self.page.locator('.node.dim').count(),87)
        self.page.mouse.move(700,500)
        self.page.mouse.wheel(0,-100000)
        self.page.wait_for_timeout(100)
        self.assertEqual(float(self.page.locator('#viewport').get_attribute('transform').split('scale(')[1].rstrip(')')),4)
        expect(self.page.locator('#plus')).to_be_disabled()
        self.page.locator('#mapHome').click()
        self.page.locator('.cluster[data-cluster="mesons:lightmesons"]').focus()
        self.page.keyboard.press('Enter')
        for width,height in [(320,740),(390,844),(1600,1000),(1920,1080)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.page.wait_for_timeout(50)
            failures=self.page.evaluate('''()=>{
                const failures=[],heads=[...document.querySelectorAll('.region')],wrap=document.querySelector('#canvasWrap').getBoundingClientRect();
                const surfaceTop=wrap.top+Number(document.querySelector('#mapSurfaceRect').getAttribute('y'));
                for(const r of heads){
                    const b=r.querySelector('text').getBoundingClientRect(),h=r.querySelector('rect').getBoundingClientRect();
                    if(b.left<h.left-.1||b.right>h.right+.1||b.top<h.top||b.bottom>h.bottom||h.bottom>surfaceTop||h.left<wrap.left||h.right>wrap.right)failures.push(r.dataset.region);
                }
                return failures;
            }''')
            self.assertEqual(failures,[], 'Family keys remain visible in the empty band above the map')

    def test_raised_subgroup_and_route_highlight(self):
        self.page.locator('.node[data-id="pip"] .sphere').click()
        self.assertEqual(self.page.locator('.node.lifted').count(),18)
        expect(self.page.locator('#hierarchyStatus')).to_contain_text('М1 · Лёгкие')
        self.assertTrue(self.page.locator('.edge:visible').evaluate_all("paths=>paths.every(p=>p.dataset.routed==='true'&&p.getTotalLength()>0&&!p.getAttribute('d').includes('Q'))"))
        self.page.locator('.node[data-id="pi0"] .sphere').hover()
        self.assertGreater(self.page.locator('.edge.route-highlight:visible').count(),0)
        self.assertTrue(self.page.locator('.edge.route-highlight:visible').evaluate_all("paths=>paths.every(p=>[p.dataset.from,p.dataset.to].includes('pip')&&[p.dataset.from,p.dataset.to].includes('pi0'))"))
        self.page.locator('#mapHome').click()
        self.assertEqual(self.page.locator('.node.lifted').count(),0)
        self.assertEqual(self.page.locator('.edge:visible').count(),0)

    def test_map_codes_boundaries_and_subgroup_names(self):
        self.page.evaluate('async()=>await document.fonts.ready')
        labels=self.page.locator('.particle-label').evaluate_all('nodes=>nodes.filter(n=>getComputedStyle(n).opacity!=="0").length')
        self.assertEqual(labels,200,'Every state has a readable glyph at desktop overview')
        self.assertEqual(self.page.locator('.group-cut').count(),5)
        self.assertEqual(self.page.locator('.subgroup-boundary').count(),23)
        thickness=self.page.evaluate("()=>['.group-cut','.subgroup-boundary','.hex-cell'].map(s=>parseFloat(getComputedStyle(document.querySelector(s)).strokeWidth))")
        self.assertGreater(thickness[0],thickness[1]*2)
        self.assertGreater(thickness[1],thickness[2]*4)
        for root in ['mesons','baryons','quarks','bosons','leptons']:
            self.page.locator(f'.region[data-region="{root}"]').focus()
            self.page.keyboard.press('Enter')
            keys=self.page.locator('#subgroupIndex .subgroup-key')
            tags=self.page.locator('.subgroup-tag')
            self.assertEqual(keys.count(),tags.count())
            for key in keys.all():
                cluster=key.get_attribute('data-cluster')
                code=key.locator('b').inner_text()
                tag=self.page.locator(f'.subgroup-tag[data-cluster="{cluster}"]')
                self.assertEqual(tag.locator('text').text_content(),code)
                self.assertIn(key.locator('span').inner_text(),tag.get_attribute('aria-label'))
                key.hover()
                expect(self.page.locator(f'.cluster[data-cluster="{cluster}"]')).to_have_class(re.compile('cluster-preview'))
            self.page.mouse.move(1,1)
            collisions=self.page.evaluate('''()=>{
                const labels=[...document.querySelectorAll('.particle-label')].filter(t=>getComputedStyle(t).opacity==='1');
                return [...document.querySelectorAll('.subgroup-tag rect')].flatMap(tag=>{
                    const a=tag.getBoundingClientRect();
                    return labels.filter(t=>{const b=t.getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5;}).map(t=>t.closest('.node').dataset.id);
                });
            }''')
            self.assertEqual(collisions,[],root+': subgroup codes never cover particle glyphs')
        self.page.locator('.region[data-region="baryons"]').focus()
        self.page.keyboard.press('Enter')
        self.page.locator('#subgroupIndex [data-cluster="baryons:charmedbaryons"]').click()
        expect(self.page.locator('#mapPath')).to_have_text('Барионы / Очарованные')
        expect(self.page.locator('#hierarchyStatus')).to_contain_text('Б7 · Очарованные')
        self.assertEqual(self.page.locator('.cluster.subgroup-lifted').count(),1)
        self.assertEqual(self.page.locator('.node.lifted').count(),12)
        self.page.locator('#subgroupIndex .all-subgroups').click()
        expect(self.page.locator('#mapPath')).to_have_text('Барионы')
        self.assertEqual(self.page.locator('#subgroupIndex .subgroup-key').count(),8)

    def test_family_hover_preview_without_selection_or_zoom(self):
        before=self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('.region[data-region="mesons"]').hover()
        expect(self.page.locator('#hierarchyStatus')).to_contain_text('Наведение · М · Мезоны')
        self.assertEqual(self.page.locator('#subgroupIndex .subgroup-key').count(),8)
        self.assertEqual(self.page.locator('.cluster-outline.preview:visible').count(),8)
        self.assertEqual(self.page.locator('.node.selected').count(),0)
        self.assertEqual(before,self.page.locator('#viewport').get_attribute('transform'))
        # Each patch is a closed ring with visible space from the shared ribs.
        gaps=self.page.locator('.cluster-outline.preview:visible').evaluate_all('''groups=>groups.map(g=>{
            const id=g.dataset.cluster,ink=g.querySelector('.outline-ink'),base=document.querySelector('.cluster[data-cluster="'+id+'"] .subgroup-boundary');
            const points=d=>[...d.matchAll(/[ML](-?[0-9.e+]+) (-?[0-9.e+]+)/g)].map(m=>({x:+m[1],y:+m[2]}));
            const polygon=points(base.getAttribute('d')),ring=points(ink.getAttribute('d'));
            const distance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
            const nearest=p=>Math.min(...polygon.map((a,i)=>distance(p,a,polygon[(i+1)%polygon.length])));
            return {id,closed:ink.getAttribute('d').trim().endsWith('Z'),gap:Math.min(...ring.map((a,i)=>{const b=ring[(i+1)%ring.length];return nearest({x:(a.x+b.x)/2,y:(a.y+b.y)/2});}))*ink.getScreenCTM().a};
        })''')
        self.assertTrue(all(g['closed'] and g['gap']>4.8 for g in gaps),gaps)
        # The entire first row is still below the names; hover doesn't crop the rings.
        surface=self.page.locator('#mapSurfaceRect')
        top=self.page.locator('#canvasWrap').bounding_box()['y']+float(surface.get_attribute('y'))
        for outline in self.page.locator('.cluster-outline.preview:visible').all():
            self.assertGreaterEqual(outline.bounding_box()['y'],top)
        self.page.locator('#subgroupIndex [data-cluster="mesons:lightmesons"]').hover()
        self.assertEqual(self.page.locator('.cluster-outline.preview:visible').count(),1)
        self.assertEqual(before,self.page.locator('#viewport').get_attribute('transform'))
        self.page.mouse.move(1,1)
        expect(self.page.locator('.cluster-outline.preview:visible')).to_have_count(0)
        expect(self.page.locator('#hierarchyStatus')).not_to_contain_text('Наведение')
        self.page.locator('.node[data-id="u"]').focus();self.page.keyboard.press('Enter')
        self.page.locator('.region[data-region="mesons"]').hover()
        self.assertEqual(self.page.locator('.node.selected').get_attribute('data-id'),'u')
        self.page.mouse.move(1,1)
        expect(self.page.locator('.cluster-outline.chosen:visible')).to_have_count(1)
        expect(self.page.locator('#hierarchyStatus')).to_contain_text('К1 · Лёгкие')

    def test_map_drag_never_selects_text(self):
        self.page.locator('.node[data-id="u"]').focus();self.page.keyboard.press('Enter')
        self.page.mouse.move(700,450);self.page.mouse.down();self.page.mouse.move(950,560,steps=8);self.page.mouse.up()
        self.assertEqual(self.page.evaluate('getSelection().toString()'),'')
        self.page.locator('#mapHome').click()
        self.page.mouse.move(280,178);self.page.mouse.down();self.page.mouse.move(1250,790,steps=8);self.page.mouse.up()
        self.assertEqual(self.page.evaluate('getSelection().toString()'),'')
        self.page.locator('.region[data-region="mesons"] .region-title').dblclick()
        self.assertEqual(self.page.evaluate('getSelection().toString()'),'')
        self.page.locator('#search').fill('протон');self.page.locator('#search').press('Control+A')
        self.assertEqual(self.page.locator('#search').evaluate('e=>e.selectionEnd-e.selectionStart'),6)

    def test_explicit_route_pair_and_cycle(self):
        camera=self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('.node[data-id="pip"] .sphere').click()
        expect(self.page.locator('#connectionReadout')).to_be_visible()
        self.assertEqual(self.page.locator('.node.route-target').count(),1)
        target=self.page.locator('.node.route-target').get_attribute('data-id')
        highlighted=self.page.locator('.edge.route-highlight:visible')
        self.assertGreater(highlighted.count(),0)
        self.assertTrue(highlighted.evaluate_all("edges=>edges.every(e=>[e.dataset.from,e.dataset.to].includes('pip'))"))
        self.assertIn(self.page.locator('.node.route-target title').text_content().split(' · ')[0],self.page.locator('#connectionPair').inner_text())
        self.assertTrue(self.page.locator('.edge.route-muted:visible').evaluate_all('edges=>edges.every(e=>+getComputedStyle(e).opacity<.05)'))
        self.page.locator('#connectionNext').click()
        self.assertNotEqual(target,self.page.locator('.node.route-target').get_attribute('data-id'))
        self.page.locator('#connectionPrev').click()
        self.assertEqual(target,self.page.locator('.node.route-target').get_attribute('data-id'))
        # Hover temporarily shows another pair, then restores the pinned route.
        self.page.locator('.node[data-id="pi0"] .sphere').hover()
        self.assertIn('π⁰',self.page.locator('#connectionPair').inner_text())
        self.page.mouse.move(10,10)
        self.assertEqual(target,self.page.locator('.node.route-target').get_attribute('data-id'))
        self.page.locator('#connectionAll').click()
        self.assertEqual(self.page.locator('.edge.route-muted:visible').count(),0)
        self.assertEqual(self.page.locator('.node.route-target').count(),0)
        for kind in ['strong','em','weak','composition','mixing','family']:
            self.page.locator(f'[data-edge="{kind}"]').uncheck()
        self.page.locator('.node[data-id="pip"] .sphere').click()
        self.assertEqual(self.page.locator('.edge:visible').count(),0)
        expect(self.page.locator('#connectionPair')).to_contain_text('связей нет')
        expect(self.page.locator('#connectionNext')).to_be_disabled()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'),'Selecting a particle with or without relations never zooms')
        self.page.locator('#mapHome').click()
        expect(self.page.locator('#connectionReadout')).to_be_hidden()

    def test_desktop_selection_search_and_filters_keep_camera(self):
        overview=self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('.node[data-id="pip"] .sphere').dblclick()
        self.assertEqual(overview,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#showAll').click()
        self.page.locator('#plus').click()
        camera=self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('.region[data-region="mesons"] .region-title').click()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#subgroupIndex [data-cluster="mesons:lightmesons"]').click()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('.node[data-id="pip"]').focus()
        self.page.keyboard.press('Enter')
        expect(self.page.locator('#detailSymbol')).to_have_text('π⁺')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        for selector in ['#connectionNext','#connectionPrev','#connectionAll','#connectionAll']:
            self.page.locator(selector).click()
            self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#connectionTypes [data-kind="family"]').click()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#showAll').click()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#search').fill('протон')
        self.page.locator('#search').press('Enter')
        expect(self.page.locator('#detailSymbol')).to_have_text('p')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#tab-links').click()
        self.page.locator('#related [data-particle="u"]').click()
        expect(self.page.locator('#detailSymbol')).to_have_text('u')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('.filter[data-group="baryons"]').click()
        self.page.locator('#resetFilters').click()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.mode('Таблица')
        self.mode('Граф')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#focusParticle').click()
        self.assertNotEqual(camera,self.page.locator('#viewport').get_attribute('transform'),'Find on map remains an explicit camera action')

    def test_neutral_routes_actual_direction_and_addresses(self):
        self.page.evaluate('async()=>await document.fonts.ready')
        transforms=self.page.locator('.particle-label').evaluate_all("labels=>labels.map(t=>t.getAttribute('transform'))")
        self.page.locator('.node[data-id="pip"]').focus()
        self.page.keyboard.press('Enter')
        paths=self.page.locator('.edge.route-highlight:visible')
        self.assertTrue(paths.evaluate_all("paths=>paths.every(p=>getComputedStyle(p).stroke==='rgb(255, 255, 255)')"))
        edge=paths.first
        source,destination=edge.get_attribute('data-from'),edge.get_attribute('data-to')
        self.assertEqual(self.page.locator('.node.route-from').get_attribute('data-id'),source)
        self.assertEqual(self.page.locator('.node.route-to').get_attribute('data-id'),destination)
        for suffix,particle in [('From',source),('To',destination)]:
            symbol=self.page.locator(f'.node[data-id="{particle}"] title').text_content().split(' · ')[0]
            expect(self.page.locator('#connection'+suffix+'Symbol')).to_contain_text(symbol)
            expect(self.page.locator('#connection'+suffix+'Address')).to_contain_text('Мезоны → М1 Лёгкие')
        self.assertEqual(self.page.locator('.endpoint-mark:visible').count(),2)
        self.page.locator('#connectionTypes [data-kind="family"]').click()
        expect(self.page.locator('#connectionKind')).to_have_text('Тип: семейство')
        self.assertTrue(self.page.locator('.edge.route-highlight:visible').evaluate_all("paths=>paths.every(p=>p.dataset.kind==='family'&&!p.hasAttribute('marker-end'))"))
        expect(self.page.locator('#connectionFromRole')).to_have_text('1 · Частица')
        expect(self.page.locator('#connectionToRole')).to_have_text('2 · Частица')
        self.page.locator('#mapHome').click()
        self.page.locator('.node[data-id="pdg4224"]').focus()
        self.page.keyboard.press('Enter')
        for _ in range(50):
            if self.page.locator('.node.route-target').get_attribute('data-id')=='c':break
            self.page.locator('#connectionNext').click()
        self.assertEqual(self.page.locator('.node.route-target').get_attribute('data-id'),'c')
        expect(self.page.locator('#connectionKind')).to_have_text('Тип: кварковый состав')
        self.assertEqual(self.page.locator('.node.route-from').get_attribute('data-id'),'c')
        expect(self.page.locator('#connectionFromAddress')).to_contain_text('Кварки → К2 Тяжёлые')
        expect(self.page.locator('#connectionToAddress')).to_contain_text('Барионы → Б7 Очарованные')
        self.assertTrue(self.page.locator('.edge.route-highlight:visible').evaluate_all("paths=>paths.every(p=>p.getAttribute('marker-end')&&p.getAttribute('stroke-dasharray')==='10 4 2 4')"))

        self.page.locator('#mapHome').click()
        self.assertEqual(transforms,self.page.locator('.particle-label').evaluate_all("labels=>labels.map(t=>t.getAttribute('transform'))"),'Endpoint badges never leave unrelated symbols permanently smaller')

    def test_symbol_fits_every_hexagon_after_fonts_load(self):
        self.page.evaluate('async()=>await document.fonts.ready')
        failures=self.page.locator('.node').evaluate_all('''nodes=>nodes.flatMap(n=>{
            const text=n.querySelector('.particle-label'),raw=text.getBBox(),factor=text.transform.baseVal.numberOfItems?text.transform.baseVal.getItem(0).matrix.a:1,b={x:raw.x*factor,y:raw.y*factor,width:raw.width*factor,height:raw.height*factor},r=+n.querySelector('.sphere').dataset.radius;
            const x=Math.max(Math.abs(b.x),Math.abs(b.x+b.width)),y=Math.max(Math.abs(b.y),Math.abs(b.y+b.height));
            return x>Math.sqrt(3)*r/2||x+Math.sqrt(3)*y>Math.sqrt(3)*r?[n.dataset.id]:[];
        })''')
        self.assertEqual(failures, [], 'Labels including superscripts stay inside their hexagons')
        self.page.locator('#search').fill('9000111')
        self.page.locator('#search').press('Enter')
        expect(self.page.locator('.node[data-id="pdg9000111"] .particle-label')).to_be_visible()
        self.assertFalse(self.page.locator('.node[data-id="pdg9000111"] .particle-label').get_attribute('textLength'), 'Fit uses font size, without stretching glyphs')
    def test_mobile_overview_and_family_tap(self):
        expect(self.page.locator('#world')).to_have_class(re.compile(r'overview'))
        labels = self.page.locator('.node .particle-label').evaluate_all('nodes=>nodes.filter(n=>getComputedStyle(n).opacity !== "0").length')
        self.assertEqual(labels, 0, 'Unreadably small state labels disappear at overview scale')
        self.page.locator('.region[data-region="mesons"] .region-title').tap()
        expect(self.page.locator('#mapPath')).to_have_text('Мезоны')
        overview=self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('#subgroupIndex [data-cluster="mesons:lightmesons"]').tap()
        self.assertEqual(overview,self.page.locator('#viewport').get_attribute('transform'))
        # Locating a particle is an explicit camera action, unlike selecting its family.
        self.page.locator('#detailBtn').tap()
        self.page.locator('#focusParticle').tap()
        camera=self.page.locator('#viewport').get_attribute('transform')
        self.assertNotEqual(overview,camera)
        self.page.locator('.node[data-id="pip"] .sphere').tap()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        expect(self.page.locator('#details')).not_to_have_class('right open')
        expect(self.page.locator('#connectionReadout')).to_be_visible()
        expect(self.page.locator('#detailSymbol')).to_have_text('π⁺')
        expect(self.page.locator('.cluster[data-cluster="mesons:lightmesons"]')).to_have_class(re.compile('subgroup-lifted'))
        self.assertGreaterEqual(self.page.locator('.node[data-id="pip"] .sphere').bounding_box()['y'],self.page.locator('#hierarchyBand').bounding_box()['y']+self.page.locator('#hierarchyBand').bounding_box()['height'])

        self.page.locator('#detailBtn').click()
        expect(self.page.locator('#details')).to_have_class('right open')
        self.page.locator('#closeDetail').click()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#subgroupIndex [data-cluster="mesons:lightmesons"]').tap()
        expect(self.page.locator('#mapPath')).to_have_text('Мезоны / Лёгкие')
        expect(self.page.locator('#details')).not_to_have_class('right open')
        self.assertEqual(self.page.locator('.node.selected').count(), 0)
        self.page.locator('.node[data-id="pip"] .sphere').tap()
        expect(self.page.locator('#details')).not_to_have_class('right open')
        expect(self.page.locator('#detailSymbol')).to_have_text('π⁺')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))

    def test_mobile_long_route_keeps_camera_and_endpoint_addresses(self):
        camera=self.page.locator('#viewport').get_attribute('transform')
        self.page.locator('.node[data-id="pdg4224"]').focus()
        self.page.keyboard.press('Enter')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        for _ in range(50):
            if self.page.locator('.node.route-target').get_attribute('data-id')=='c':break
            self.page.locator('#connectionNext').tap()
            self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.assertEqual(self.page.locator('.node.route-target').get_attribute('data-id'),'c')
        markers=self.page.locator('.endpoint-mark:visible')
        self.assertEqual(markers.count(),2)
        for marker in markers.all():
            self.assertGreaterEqual(marker.bounding_box()['height'],11)
        expect(self.page.locator('#connectionFromAddress')).to_contain_text('Кварки → К2')
        expect(self.page.locator('#connectionToAddress')).to_contain_text('Барионы → Б7')
        for selector in ['#connectionPrev','#connectionAll','#connectionAll']:
            self.page.locator(selector).tap()
            self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))

    def test_mobile_search_filters_details_and_keyboard_keep_camera(self):
        self.page.locator('#detailBtn').tap()
        self.page.locator('#focusParticle').tap()
        camera=self.page.locator('#viewport').get_attribute('transform')
        self.assertGreaterEqual(self.page.locator('#search').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)'),16)
        self.page.locator('#search').tap()
        # Simulate the height change caused by the keyboard/browser bars.
        self.page.set_viewport_size({'width':390,'height':650})
        self.page.wait_for_function("document.querySelector('#canvasWrap').clientHeight===540")
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#search').fill('протон')
        expect(self.page.locator('#detailSymbol')).to_have_text('p')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#search').press('Enter')
        expect(self.page.locator('#details')).to_have_class('right open')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#closeDetail').tap()
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'detailBtn','Closing the card must not refocus search and reopen the keyboard')
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.wait_for_function("document.querySelector('#canvasWrap').clientHeight===734")
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        expect(self.page.locator('.node[data-id="p"]')).to_have_attribute('aria-pressed','true')
        self.page.locator('#detailBtn').tap()
        self.page.locator('#tab-links').tap()
        self.page.locator('#related [data-particle="u"]').tap()
        expect(self.page.locator('#detailSymbol')).to_have_text('u')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#closeDetail').tap()
        self.page.locator('#filtersBtn').tap()
        self.page.locator('.filter[data-group="baryons"]').tap()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#filtersBtn').tap()
        self.page.locator('#resetFilters').tap()
        self.page.locator('#closeFilters').tap()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#mapHome').tap()
        self.assertNotEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        expect(self.page.locator('#minus')).to_be_disabled()

    def test_mobile_tap_jitter_double_tap_and_landscape(self):
        self.page.locator('#detailBtn').tap()
        self.page.locator('#focusParticle').tap()
        self.page.wait_for_function("document.querySelector('#details').getBoundingClientRect().top>=innerHeight")
        camera=self.page.locator('#viewport').get_attribute('transform')
        box=self.page.locator('.node[data-id="pip"] .sphere').bounding_box()
        x,y=box['x']+box['width']/2,box['y']+box['height']/2
        cdp=self.context.new_cdp_session(self.page)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':0}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+6,'y':y+4,'id':0}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        expect(self.page.locator('.node[data-id="pip"]')).to_have_attribute('aria-pressed','true')
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'),'Small finger motion remains a tap')
        self.page.locator('.node[data-id="pip"] .sphere').tap()
        self.page.locator('.node[data-id="pip"] .sphere').tap()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.assertEqual(self.page.evaluate('visualViewport.scale'),1,'Double-tap must not zoom the page')
        self.page.set_viewport_size({'width':844,'height':390})
        expect(self.page.locator('#canvasWrap')).to_have_class(re.compile('compact-map'))
        self.page.locator('#detailBtn').tap()
        self.page.locator('#focusParticle').tap()
        self.page.wait_for_function("document.querySelector('#details').getBoundingClientRect().top>=innerHeight")
        camera=self.page.locator('#viewport').get_attribute('transform')
        box=self.page.locator('.node[data-id="pip"] .sphere').bounding_box()
        self.assertLess(box['x']+box['width'],self.page.locator('#connectionReadout').bounding_box()['x'])
        self.page.locator('.node[data-id="pip"] .sphere').tap()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('#detailBtn').tap()
        expect(self.page.locator('#closeDetail')).to_be_in_viewport()
        self.assertEqual(self.page.locator('#details').evaluate('e=>e.scrollTop'),0,'Reopening the card shows its header and close button')
        self.page.locator('#closeDetail').tap()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))
        self.page.locator('.region[data-region="mesons"] .region-title').tap()
        self.page.locator('#subgroupIndex [data-cluster="mesons:lightmesons"]').tap()
        self.assertEqual(camera,self.page.locator('#viewport').get_attribute('transform'))

    def test_large_catalogue_overview_search_and_table(self):
        data = self.page.evaluate('''()=>{
            const data=structuredClone(PARTICLE_DATA),templates=[...data.particles];
            for(let i=templates.length;i<800;i++){
                const p=templates[i%templates.length];
                data.particles.push({...p,id:'state-'+i,pdg:800000+i,ru:'Тестовое состояние '+i,family:PARTICLE_LAYOUT.familyFor(p)});
            }
            return data;
        }''')
        self.page.route('**/particles.js', lambda route: route.fulfill(content_type='application/javascript', body='window.PARTICLE_DATA='+json.dumps(data)))
        self.page.route('**/extra-particles.js*', lambda route: route.fulfill(content_type='application/javascript', body=''))
        self.page.reload()
        self.assertEqual(self.page.locator('.node').count(), 800)
        expect(self.page.locator('#minus')).to_be_disabled()
        self.page.locator('#search').fill('800799')
        expect(self.page.locator('#detailName')).to_contain_text('Тестовое состояние 799')
        expect(self.page.locator('.node[data-id="state-799"]')).to_have_attribute('aria-pressed', 'true')
        self.mode('Таблица')
        self.page.locator('#search').fill('')
        self.assertEqual(self.page.locator('tbody tr').count(), 800)

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

    def test_added_particles_sources_composition_and_decays(self):
        self.page.locator('#search').fill('511')
        expect(self.page.locator('#detailSymbol')).to_have_text('B⁰')
        expect(self.page.locator('#dataSource')).to_contain_text('S042/2024')
        self.mode('Кварковый состав')
        expect(self.page.locator('.formula')).to_have_text('d b̄')
        self.assertEqual(self.page.locator('.component-orb').all_text_contents(), ['d','b̄'])
        self.page.locator('#search').fill('')
        self.page.locator('#localParticle').select_option('pdg9000221')
        self.assertEqual(self.page.locator('.component-orb').count(),0)
        expect(self.page.locator('.local-caption')).to_contain_text('Однозначный валентный состав')
        self.page.locator('#localParticle').select_option('pdg310')
        expect(self.page.locator('.local-caption')).to_contain_text('без CP-нарушения')
        self.mode('Распады')
        self.page.locator('#localParticle').select_option('pdg423')
        expect(self.page.locator('.channel-head').first).to_contain_text('D⁰ π⁰')
        expect(self.page.locator('.channel-head').first).to_contain_text('64.7')
        self.page.locator('.channel-products [data-particle="d0"]').first.click()
        expect(self.page.locator('.local-parent')).to_have_text('D⁰')
        self.mode('Таблица')
        self.page.locator('.filter[data-group="bottom"]').click()
        self.assertEqual(self.page.locator('tbody tr').count(),23)
        self.page.locator('#resetFilters').click()
        self.page.locator('#spinFilter').select_option('2')
        self.assertEqual(self.page.locator('tbody tr').count(),15)

    def test_mobile_drawer_sheet_pan_and_pinch(self):
        expect(self.page.locator('#minimapWrap')).to_be_hidden()
        self.assertTrue(self.page.locator('.modes').evaluate('e=>e.scrollWidth > e.clientWidth'))
        self.page.locator('#filtersBtn').click()
        expect(self.page.locator('#filters')).to_have_class('left open')
        expect(self.page.locator('#filtersBtn')).to_have_attribute('aria-expanded', 'true')
        self.page.locator('.filter[data-group="baryons"]').click()
        expect(self.page.locator('#overlay')).to_be_hidden()
        self.page.locator('#plus').click()
        self.page.locator('#plus').click()
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
        # The whole atlas stays centered at its zoom floor; pan after zooming in.
        self.page.locator('#plus').click()
        self.page.locator('#plus').click()
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
        touch('touchStart', [(80, 400), (310, 400)])
        touch('touchMove', [(190, 400), (191, 400)])
        touch('touchEnd', [])
        expect(self.page.locator('#minus')).to_be_disabled()
        pinch_scale=float(self.page.locator('#viewport').get_attribute('transform').split('scale(')[1].rstrip(')'))
        self.page.locator('#mapHome').click()
        overview_scale=float(self.page.locator('#viewport').get_attribute('transform').split('scale(')[1].rstrip(')'))
        self.assertAlmostEqual(pinch_scale,overview_scale,'Pinch-out stops at the full-map overview')

        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))

    def test_routes_and_catalog_without_service_worker(self):
        self.page.goto(self.base + 'particles/?from=short#map')
        self.page.wait_for_url('**/docs/particles/?from=short#map')
        self.assertEqual(self.page.locator('.node').count(), 200)
        self.page.goto(self.base + 'docs/#subject=%D0%91%D0%B0%D0%B7%D0%B0')
        card = self.page.locator('.knowledge-card').filter(has=self.page.locator('h4', has_text='Частицы'))
        expect(card).to_have_attribute('href', 'particles/')
        card.click()
        self.page.wait_for_url('**/docs/particles/')
        self.assertEqual(self.page.locator('.node').count(), 200)

    def test_responsive_layout(self):
        for width,height in [(320,740),(390,844),(768,1024),(1024,768),(1600,1000),(1920,1080)]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width':width,'height':height})
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.mode('Таблица')
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
                self.assertEqual(self.page.locator('tbody tr').count(),200)
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
        self.assertEqual(self.page.locator('.node').count(),200)
        self.mode('Распады')
        expect(self.page.locator('.channel-head')).to_contain_text('μ⁺ νμ')
        self.context.set_offline(False)


if __name__ == '__main__':
    unittest.main()
