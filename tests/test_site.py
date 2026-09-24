"""Browser regressions using synthetic documents; course materials are never changed.

Default: deterministic PDF.js stub for navigation/error scenarios, no CDN required.
NSU_REAL_PDFJS=1: exercise the same synthetic PDF with the actual CDN PDF.js build.
PLAYWRIGHT_CHANNEL=msedge: use an existing Edge installation locally.
"""
import ast
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
import unittest
from urllib.parse import urlsplit

import pymupdf
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REAL_PDFJS = os.environ.get('NSU_REAL_PDFJS') == '1'
PDF_STUB = """
export const GlobalWorkerOptions={};
export const Util={transform:(a,b)=>b};
export function getDocument({url}){
  const document={numPages:2,getOutline:async()=>[],getDestination:async()=>null,
    getPage:async n=>{
      if(!Number.isInteger(n)||n<1||n>2)throw new Error('Invalid page request.');
      return {pageNumber:n,cleanup(){},getOperatorList:async()=>({}),
        getTextContent:async()=>({items:[]}),getAnnotations:async()=>[],
        getViewport:({scale})=>({width:595*scale,height:842*scale,scale}),
        render:({canvasContext})=>{
          if(window.__failNextRender){window.__failNextRender=false;return {cancel(){},promise:Promise.reject(new Error('<b>temporary render failure</b>'))}}
          canvasContext.fillRect(0,0,20,20);
          return {cancel(){},promise:Promise.resolve()};
        }};
    }};
  return {promise:fetch(url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer()}).then(()=>document)};
}
"""


class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        for relative in ['docs/index.html', 'docs/knowledge.css', 'docs/search-worker.js', 'docs/pdfjs/viewer.html', 'docs/pdfjs/controls.css',
                         'docs/notebook/viewer.html', 'docs/notebook/viewer.css', 'docs/notebook/outline.js', 'docs/giscus-config.json',
                         'docs/app.js', 'docs/app.css', 'docs/sw.js', 'docs/manifest.webmanifest',
                         'docs/assets/nsu-fp-emblem.webp', 'docs/assets/app-192.png', 'docs/assets/app-512.png']:
            target = cls.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)
        # GitHub Pages removes Jekyll front matter before serving the HTML.
        index_html = cls.root / 'docs/index.html'
        index_html.write_text(index_html.read_text(encoding='utf-8').removeprefix('---\n---\n'),encoding='utf-8')
        cls.a = 'ОВФ/01_Лекции/a.pdf'
        cls.b = 'ФЭЧ/01_Лекции/b.pdf'
        cls.nb = 'База/Практика/Физика/Физические константы.ipynb'
        cls.empty_nb = 'База/Словарик.ipynb'
        for path,source in [(cls.nb,'<h1>Reference</h1>'+('<p>Introduction</p>'*30)+
            '<h2>Units</h2>'+('<p>Units and values</p>'*30)+'<h3>Detail</h3><h4>Nested</h4>'+('<p>Details</p>'*30)+
            '<h2>Units</h2>'+('<p>Last section</p>'*30)),(cls.empty_nb,'<p>No headings yet</p>')]:
            target=cls.root/path
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(json.dumps({'nbformat':4,'metadata':{},'cells':[{'cell_type':'markdown','source':source}]}),encoding='utf-8')
        for path in [cls.a, cls.b]:
            target = cls.root / path
            target.parent.mkdir(parents=True, exist_ok=True)
            with pymupdf.open() as doc:
                doc.new_page().insert_text((72, 72), 'alpha beta')
                doc.new_page().insert_text((72, 72), 'gamma delta')
                doc.save(target)
        index = cls.root / 'docs/search-index'
        index.mkdir()
        def write(name, value):
            (index / name).write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
        write('files.json', {'files':[
            {'path':cls.a, 'type':'pdf', 'version':'fixture-a', 'page_count':2},
            {'path':cls.b, 'type':'pdf', 'version':'fixture-b', 'page_count':2}]})
        write('structure.json', {'groups':[{'subject':'ОВФ', 'section':'Лекции', 'pdf_path':cls.a,
            'items':[{'id':'a1', 'title':'First lecture', 'page':1}, {'id':'a2', 'title':'Second lecture', 'page':2}]}]})
        write('manifest.json', {'version':3, 'shards':[
            {'subject':'ОВФ', 'file':'part-00.json', 'version':'a'},
            {'subject':'ФЭЧ', 'file':'part-01.json', 'version':'b'}]})
        write('part-00.json', {'records':[{'path':cls.a, 'pages':[{'n':1,'t':'alpha beta'}, {'n':2,'t':'gamma delta'}]}]})
        write('part-01.json', {'records':[{'path':cls.b, 'pages':[{'n':1,'t':'needle in second section'}]}]})
        cls.requests=[]
        cls.failed_paths=set()
        class Handler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *_args):
                pass
            def do_GET(self):
                path=urlsplit(self.path).path
                cls.requests.append(('GET',path))
                if path in cls.failed_paths:
                    self.send_response(503)
                    self.end_headers()
                    return
                try:
                    super().do_GET()
                except ConnectionError:
                    pass  # Navigating away may cancel an in-flight response.
            def do_HEAD(self):
                cls.requests.append(('HEAD',urlsplit(self.path).path))
                super().do_HEAD()
        cls.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(cls.root)))
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.base=f'http://127.0.0.1:{cls.server.server_port}/docs/'
        cls.playwright=sync_playwright().start()
        options={'headless':True}
        if os.environ.get('PLAYWRIGHT_CHANNEL'):
            options['channel']=os.environ['PLAYWRIGHT_CHANNEL']
        cls.browser=cls.playwright.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def setUp(self):
        self.failed_paths.clear()
        self.requests.clear()
        self.context=self.browser.new_context(service_workers='allow' if self._testMethodName.startswith('test_pwa_') else 'block')
        self.context.route('https://giscus.app/**', lambda route: route.fulfill(body='',content_type='text/javascript'))
        if not REAL_PDFJS:
            self.context.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@*/build/pdf.min.mjs',
                lambda route: route.fulfill(body=PDF_STUB,content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'}))
        self.page=self.context.new_page()
        self.errors=[]
        self.page.on('pageerror',lambda error:self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors,[])

    def home(self):
        self.page.goto(self.base)
        self.page.wait_for_function('FILES.length===2')

    def pdf(self, extra=''):
        from urllib.parse import urlencode
        self.page.goto(self.base+'pdfjs/viewer.html?'+urlencode({'file':self.a})+extra)
        self.page.wait_for_function("document.querySelector('#total').textContent==='/ 2' && !document.querySelector('#loading').classList.contains('show')")

    def search(self, query):
        self.page.evaluate('(q)=>runSearch(q)',query)
        self.page.wait_for_function('!state.searchBusy')

    def test_indexer_syntax_and_generated_file_paths(self):
        ast.parse((ROOT/'.github/scripts/build_search_index.py').read_text(encoding='utf-8'))
        metadata=json.loads((ROOT/'docs/search-index/files.json').read_text(encoding='utf-8'))
        self.assertTrue(metadata['files'])
        for file in metadata['files']:
            self.assertTrue((ROOT/file['path']).is_file(),file['path'])

    def test_search_retries_only_failed_shards(self):
        self.home()
        self.failed_paths.add('/docs/search-index/part-00.json')
        self.search('alpha')
        self.assertIn('неполными',self.page.locator('.search-note').inner_text())
        successful_count=self.requests.count(('GET','/docs/search-index/part-01.json'))
        self.failed_paths.clear()
        self.page.locator('.search-note button').click()
        self.page.wait_for_function('!state.searchBusy && searchGroupsAll.length===1')
        self.assertEqual(self.page.evaluate('searchGroupsAll[0].hits[0].page'),1)
        self.assertEqual(self.requests.count(('GET','/docs/search-index/part-01.json')),successful_count)

    def test_search_retries_failed_manifest_and_short_terms(self):
        self.home()
        self.failed_paths.add('/docs/search-index/manifest.json')
        self.search('alpha')
        self.assertIn('неполными',self.page.locator('.search-note').inner_text())
        self.failed_paths.clear()
        self.search('alpha')
        self.assertEqual(self.page.evaluate('searchGroupsAll.length'),1)
        self.search('x z')
        self.assertEqual(self.page.evaluate('searchGroupsAll.length'),0)
        self.search('a b')
        self.assertEqual(self.page.evaluate('searchGroupsAll.length'),1)
        self.search('needle')
        self.assertEqual(self.page.evaluate('searchGroupsAll[0].f.path'),self.b)

    def test_subject_sort_and_lecture_switch_keep_iframe(self):
        self.home()
        self.page.evaluate("state.view='subjects';state.subject='ОВФ';state.section='';render()")
        frame=self.page.frame_locator('.preview-frame')
        frame.locator('#total').wait_for(state='attached')
        self.page.wait_for_function("document.querySelector('.preview-frame').contentDocument.querySelector('#total').textContent==='/ 2'")
        self.page.evaluate("window.savedFrame=document.querySelector('.preview-frame');window.savedDocument=savedFrame.contentDocument")
        self.page.select_option('#sortSelect','name')
        self.assertTrue(self.page.evaluate("savedFrame===document.querySelector('.preview-frame') && savedDocument===savedFrame.contentDocument"))
        self.page.locator('[data-entry="a2"]').click()
        self.page.wait_for_function("document.querySelector('.preview-frame').contentDocument.querySelector('#page').value==='2'")
        self.assertTrue(self.page.evaluate('savedDocument===savedFrame.contentDocument'))
        self.assertEqual(frame.locator('#title').inner_text(),'Second lecture')
        self.assertFalse(any(method=='HEAD' for method,_ in self.requests))

    def test_search_hit_switch_keeps_pdf_document(self):
        self.home()
        self.search('a')  # The UI deliberately requires at least two characters.
        self.search('alpha')
        self.page.wait_for_function("document.querySelector('.search-preview-frame')?.contentDocument.querySelector('#total')?.textContent==='/ 2'")
        self.page.evaluate("window.savedDocument=document.querySelector('.search-preview-frame').contentDocument")
        self.page.locator('.search-group-main').click()
        self.assertTrue(self.page.evaluate("savedDocument===document.querySelector('.search-preview-frame').contentDocument"))

    def test_preview_fills_available_height_without_resetting_pdf(self):
        self.page.set_viewport_size({'width':1440,'height':900})
        self.home()
        self.page.evaluate("""state.view='subjects';state.subject='ОВФ';state.section='';
            state.structure.groups[0].items=Array.from({length:35},(_,i)=>({id:'row-'+i,title:'Lecture '+i,number:i+1,page:2}));render()""")
        self.page.wait_for_function("document.querySelector('.preview-frame')?.contentDocument.querySelector('#page')?.value==='2'")
        self.page.wait_for_function("!document.querySelector('.preview-frame').contentDocument.querySelector('#loading').classList.contains('show')")
        self.page.evaluate("""window.savedFrame=document.querySelector('.preview-frame');window.savedDocument=savedFrame.contentDocument;
            savedDocument.querySelector('#viewer').scrollTop=160;window.savedPdfScroll=savedDocument.querySelector('#viewer').scrollTop""")
        before=self.page.locator('.preview-frame-wrap').bounding_box()['height']
        self.page.evaluate('window.scrollTo(0,600)')
        self.page.wait_for_function("Math.abs(document.querySelector('.preview-panel').getBoundingClientRect().bottom-(innerHeight-8))<2")
        self.assertGreater(self.page.locator('.preview-frame-wrap').bounding_box()['height'],before+200)
        # Allow a debounced PDF resize handler to fire, if it regresses.
        self.page.wait_for_timeout(350)
        self.assertTrue(self.page.evaluate("savedFrame===document.querySelector('.preview-frame') && savedDocument===savedFrame.contentDocument"))
        self.assertEqual(self.page.evaluate("savedDocument.querySelector('#page').value"),'2')
        self.assertAlmostEqual(self.page.evaluate("savedDocument.querySelector('#viewer').scrollTop"),self.page.evaluate('savedPdfScroll'),delta=1)
        self.page.set_viewport_size({'width':1440,'height':1200})
        self.page.wait_for_function("Math.abs(document.querySelector('.preview-panel').getBoundingClientRect().bottom-(innerHeight-8))<2")
        self.assertGreater(self.page.locator('.preview-frame-wrap').bounding_box()['height'],1000)
        self.page.evaluate('window.scrollTo(0,0)')
        self.page.wait_for_function("Math.abs(document.querySelector('.preview-panel').getBoundingClientRect().bottom-(innerHeight-8))<2")

    def test_new_query_supersedes_pending_search(self):
        self.home()
        self.page.evaluate("runSearch('alpha');runSearch('needle')")
        self.page.wait_for_function('!state.searchBusy && searchGroupsAll.length===1')
        self.assertEqual(self.page.evaluate('searchGroupsAll[0].f.path'),self.b)
        self.page.evaluate("runSearch('alpha');state.view='home';setActiveNav('home');render()")
        self.page.wait_for_function("document.querySelector('.home-grid')!==null")
        self.assertEqual(self.page.evaluate('state.view'),'home')
        self.assertEqual(self.page.locator('#searchResults').count(),0)

    def test_pdf_page_validation_and_resolution(self):
        self.pdf('&page=1.5')
        self.assertEqual(self.page.locator('#page').input_value(),'1')
        pixels=self.page.evaluate('canvas.width*canvas.height')
        self.assertLess(pixels,1000000)
        for value,expected in [('1.5','1'),('999','2'),('-10','1')]:
            self.page.fill('#page',value)
            self.page.locator('#page').dispatch_event('change')
            self.page.wait_for_function('(expected)=>document.querySelector("#page").value===expected && !document.querySelector("#loading").classList.contains("show")',arg=expected)
            self.assertEqual(self.page.locator('#stage canvas').count(),1)
            self.assertEqual(self.page.locator('#stage .error').count(),0)

    def test_reader_side_controls_and_responsive_embed(self):
        self.pdf()
        self.assertLessEqual(self.page.locator('.toolbar').bounding_box()['width'],80)
        self.assertTrue(self.page.locator('#fit').is_visible())
        self.assertTrue(self.page.locator('#searchToggle').is_visible())
        self.page.set_viewport_size({'width':640,'height':720})
        self.pdf('&embed=1')
        self.assertTrue(self.page.locator('#fit').is_visible())
        self.assertTrue(self.page.locator('#searchToggle').is_visible())
        self.page.wait_for_function('canvas.getBoundingClientRect().right<=viewer.getBoundingClientRect().right+1')
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.wait_for_function("document.body.classList.contains('compact-view')")
        self.assertTrue(self.page.locator('#toolsToggle').is_visible())
        self.page.locator('#toolsToggle').click()
        self.assertTrue(self.page.locator('#fit').is_visible())
        self.assertTrue(self.page.locator('#viewMode').is_visible())
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.locator('#toolsToggle').get_attribute('aria-expanded'),'false')

    def test_phone_landscape_settings_stay_inside_viewport(self):
        self.page.set_viewport_size({'width':844,'height':390})
        self.pdf()
        self.page.locator('#toolsToggle').click()
        self.page.wait_for_function("document.body.classList.contains('tools-open')")
        self.assertTrue(self.page.locator('#readerControls').evaluate("(el)=>el.parentElement===document.body"))
        box=self.page.locator('#readerControls').bounding_box()
        self.assertGreaterEqual(box['x'],0)
        self.assertGreaterEqual(box['y'],0)
        self.assertLessEqual(box['x']+box['width'],844)
        self.assertLessEqual(box['y']+box['height'],390)
        self.assertGreaterEqual(box['width'],440)
        self.assertGreater(box['height'],330)
        self.assertTrue(self.page.locator('#toolsClose').is_visible())
        self.assertTrue(self.page.locator('#fit').is_visible())
        self.assertTrue(self.page.locator('#viewMode').is_visible())
        self.assertEqual(self.page.locator('#readerControls').evaluate("(el)=>getComputedStyle(el).position"),'fixed')

    def test_mobile_zoom_continuous_mode_and_page_navigation(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.pdf()
        self.page.locator('#toolsToggle').click()
        before=float(self.page.locator('#zoom').input_value())
        self.page.locator('#zoomIn').click()
        self.page.wait_for_function('(before)=>Number(document.querySelector("#zoom").value)>before',arg=before)
        self.page.locator('#fit').click()
        self.page.wait_for_function("!document.body.classList.contains('tools-open') && canvas.getBoundingClientRect().right<=innerWidth+1")
        self.page.locator('#toolsToggle').click()
        self.page.locator('#viewMode').click()
        self.page.wait_for_function("document.querySelectorAll('.continuous-page canvas').length===2")
        self.assertEqual(self.page.locator('#viewMode').get_attribute('aria-pressed'),'true')
        self.page.locator('#mNext').click()
        self.page.wait_for_function("document.querySelector('#mPageInfo').textContent==='2 / 2'")
        self.page.locator('#toolsToggle').click()
        self.page.locator('#viewMode').click()
        self.page.wait_for_function("!document.body.classList.contains('continuous-mode') && document.querySelector('#page').value==='2'")
        self.assertTrue(self.page.locator('#canvas').is_visible())

    def test_small_phone_settings_fit_and_search_stays_accessible(self):
        self.page.set_viewport_size({'width':320,'height':640})
        self.pdf()
        self.page.locator('#toolsToggle').click()
        controls=self.page.locator('#readerControls').bounding_box()
        self.assertGreaterEqual(controls['x'],0)
        self.assertLessEqual(controls['x']+controls['width'],320)
        self.assertLessEqual(controls['y']+controls['height'],self.page.locator('.mobile-nav').bounding_box()['y'])
        self.assertEqual(self.page.locator('#readerControls').evaluate('(el)=>el.scrollWidth<=el.clientWidth'),True)
        self.page.locator('#toolsClose').click()
        self.page.locator('#searchToggle').click()
        self.assertEqual(self.page.locator('#searchToggle').get_attribute('aria-expanded'),'true')
        self.assertTrue(self.page.locator('#searchInput').is_visible())
        self.page.locator('#searchClose').click()
        self.page.locator('#outlineToggle').click()
        self.assertTrue(self.page.locator('#outlinePanel').is_visible())
        self.assertLessEqual(self.page.locator('#outlinePanel').bounding_box()['width'],320)

    @unittest.skipIf(REAL_PDFJS,'Failure injection is provided by the deterministic PDF.js stub')
    def test_pdf_can_recover_from_render_failure(self):
        self.pdf()
        self.page.evaluate('window.__failNextRender=true')
        self.page.locator('#next').click()
        self.page.locator('#stage .error').wait_for()
        self.assertEqual(self.page.locator('#stage .error b').count(),0)
        self.page.fill('#page','1')
        self.page.locator('#page').dispatch_event('change')
        self.page.wait_for_function("!document.querySelector('#stage .error') && !document.querySelector('#loading').classList.contains('show')")
        self.assertTrue(self.page.locator('#canvas').is_visible())

    def test_giscus_reads_config_file(self):
        self.home()
        self.page.locator('.feedback-setup').wait_for()
        self.assertIn(('GET','/docs/giscus-config.json'),self.requests)

    def stub_notebook_dependencies(self):
        # These navigation fixtures contain trusted, pre-rendered HTML; the
        # Markdown/TeX libraries are checked separately with real notebooks.
        self.context.route('https://cdn.jsdelivr.net/**',lambda route:route.fulfill(
            body='window.marked={parse:s=>s};window.DOMPurify={sanitize:s=>s};',content_type='text/javascript'))
        self.context.route('https://cdnjs.cloudflare.com/**',lambda route:route.fulfill(body='',content_type='text/javascript'))

    def test_knowledge_cards_filter_and_open_reading_page(self):
        self.stub_notebook_dependencies()
        self.context.route('**/search-index/files.json',lambda route:route.fulfill(json={'files':[
            {'path':self.nb,'type':'ipynb'},{'path':self.empty_nb,'type':'ipynb'}]}))
        self.page.goto(self.base+'#subject=База')
        self.page.wait_for_selector('.knowledge-card')
        self.assertEqual(self.page.locator('.knowledge-card').count(),2)
        self.assertEqual(self.page.locator('.preview-frame').count(),0)
        self.page.locator('#knowledgeSearch').fill('константы')
        self.assertEqual(self.page.locator('.knowledge-card').count(),1)
        self.page.locator('.knowledge-card').click()
        self.page.wait_for_url('**/notebook/viewer.html?**')
        self.page.wait_for_selector('#tocLinks a')
        self.page.locator('#back').click()
        self.page.wait_for_selector('.knowledge-card')
        self.assertIn('subject=',self.page.url)

    def test_notebook_outline_hierarchy_anchors_and_scroll(self):
        from urllib.parse import urlencode
        self.stub_notebook_dependencies()
        self.page.goto(self.base+'notebook/viewer.html?'+urlencode({'file':self.nb}))
        self.page.wait_for_selector('#tocLinks a')
        links=self.page.locator('#tocLinks a')
        self.assertEqual(links.count(),5)
        hrefs=links.evaluate_all('(els)=>els.map(el=>el.hash)')
        self.assertEqual(len(set(hrefs)),5)
        self.assertEqual(self.page.locator('#tocLinks details').count(),2)
        links.last.click()
        self.page.wait_for_function("document.querySelector('#tocLinks a[aria-current]').hash===location.hash")
        self.page.reload()
        self.page.wait_for_function("document.querySelector('#tocLinks a[aria-current]')?.hash===location.hash")
        self.page.locator('#zoomSelect').select_option('150')
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'))

    def test_notebook_mobile_contents_and_no_headings(self):
        from urllib.parse import urlencode
        self.stub_notebook_dependencies()
        self.page.set_viewport_size({'width':320,'height':640})
        self.page.goto(self.base+'notebook/viewer.html?'+urlencode({'file':self.nb}))
        self.page.locator('#tocToggle').click()
        self.assertTrue(self.page.locator('#notebookOutline').is_visible())
        self.assertGreaterEqual(self.page.locator('#notebookOutline').bounding_box()['height'],640)
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        self.page.keyboard.press('Escape')
        self.assertEqual(self.page.locator('#tocToggle').get_attribute('aria-expanded'),'false')
        self.page.locator('#tocToggle').click()
        self.page.locator('#tocLinks a').last.click()
        self.assertFalse(self.page.locator('#notebookOutline').is_visible())
        self.page.goto(self.base+'notebook/viewer.html?'+urlencode({'file':self.empty_nb}))
        self.page.wait_for_selector('.markdown-body')
        self.assertFalse(self.page.locator('#tocToggle').is_visible())

    def test_reference_search_targets_rows_and_accepts_symbols(self):
        from urllib.parse import urlencode
        self.stub_notebook_dependencies()
        fixture={'nbformat':4,'metadata':{'nsu_reference':{'version':1}},'cells':[{
            'cell_type':'markdown','source':r'''<h1>Constants</h1><table><thead><tr><th>Quantity</th><th>Symbol</th><th>Value</th></tr></thead>
            <tbody><tr><td>Reduced Planck constant</td><td>$\hbar$</td><td>First value</td></tr>
            <tr><td>Another Planck constant</td><td>h</td><td>Second value</td></tr>
            <tr><td>Magnetic permeability</td><td>$\mu_0$</td><td>Third value</td></tr></tbody></table><p>Independent explanatory note</p>'''}]}
        self.page.route(lambda url:urlsplit(url).path.endswith('.ipynb'),lambda route:route.fulfill(json=fixture))
        self.page.goto(self.base+'notebook/viewer.html?'+urlencode({'file':self.nb}))
        self.page.wait_for_selector('tbody tr')
        self.page.locator('#findInput').fill('Planck')
        self.page.wait_for_function("document.querySelector('#findStatus').textContent==='1/2'")
        self.assertIn('Reduced',self.page.locator('tr.find-hit').inner_text())
        self.page.locator('#findNext').click()
        self.assertIn('Another',self.page.locator('tr.find-hit').inner_text())
        for query in ['hbar','ℏ','mu0','μ₀']:
            self.page.locator('#findInput').fill(query)
            self.page.locator('#findInput').press('Enter')
            self.assertEqual(self.page.locator('#findStatus').inner_text(),'1/1')
            self.assertIn('Reduced' if query in ['hbar','ℏ'] else 'Magnetic',self.page.locator('tr.find-hit').inner_text())
        self.page.set_viewport_size({'width':320,'height':640})
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        self.assertEqual(self.page.locator('tbody td').nth(1).get_attribute('data-label'),'Symbol')
        self.page.locator('#findInput').fill('Independent')
        self.page.locator('#findInput').press('Enter')
        self.assertEqual(self.page.locator('.cell.find-hit').count(),1)
        self.page.locator('#findInput').fill('')
        self.assertEqual(self.page.locator('.find-hit').count(),0)
        self.assertEqual(self.page.locator('#findStatus').inner_text(),'')

    def test_reference_shortcuts_and_single_symbol_search(self):
        from urllib.parse import urlencode
        self.stub_notebook_dependencies()
        fixture={'nbformat':4,'metadata':{'nsu_reference':{'version':1}},'cells':[{
            'cell_type':'markdown','source':r'''<h1>Units</h1><h2 id="dimensions">Dimensions</h2>
            <h3>Electricity</h3><table><thead><tr><th>Quantity</th><th>Symbol</th><th>Dimension</th></tr></thead>
            <tbody><tr><td>Charge</td><td>$q$</td><td>$q$</td></tr>
            <tr><td>Capacitance</td><td>$C$</td><td>$q^2$</td></tr></tbody></table>
            <h2 id="magnetism">Magnetism</h2><p>Magnetic quantities</p>'''}]}
        self.page.route(lambda url:urlsplit(url).path.endswith('.ipynb'),lambda route:route.fulfill(json=fixture))
        self.page.goto(self.base+'notebook/viewer.html?'+urlencode({'file':self.nb})+'#dimensions')
        self.page.wait_for_selector('.reference-nav a')
        self.assertEqual(self.page.locator('.reference-nav a').count(),2)
        self.page.locator('.reference-nav a[href="#magnetism"]').click()
        self.assertTrue(self.page.url.endswith('#magnetism'))
        self.page.locator('#findInput').fill('q')
        self.page.wait_for_function("document.querySelector('#findStatus').textContent==='1/1'")
        self.assertIn('Charge',self.page.locator('tr.find-hit').inner_text())
        self.assertEqual(self.page.locator('#findResults button').count(),1)
        self.assertIn('Electricity',self.page.locator('#findResults').inner_text())
        self.page.set_viewport_size({'width':320,'height':640})
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        self.page.locator('#findResults button').click()
        self.assertFalse(self.page.locator('#findResults').is_visible())
        self.assertEqual(self.page.locator('#findInput').evaluate('(el)=>el===document.activeElement'),True)

    def test_notebook_preserves_inline_and_display_math_modes(self):
        from urllib.parse import urlencode
        self.stub_notebook_dependencies()
        # MathJax defaults to display=true when the conversion option is absent.
        self.context.route('**/tex-mml-chtml.js',lambda route:route.fulfill(content_type='text/javascript',body='''
          window.MathJax={getMetricsFor:()=>({em:16,ex:8}),
            tex2chtmlPromise:async(tex,options)=>{
              const el=document.createElement('mjx-container');el.textContent=tex;
              if(options.display!==false)el.setAttribute('display','true');return el;
            },startup:{promise:Promise.resolve(),document:{clear(){},updateDocument(){}}}};
        '''))
        fixture={'nbformat':4,'metadata':{},'cells':[{'cell_type':'markdown',
            'source':'<p>Charge $q$</p>\n\n$$F=ma$$'}]}
        self.page.route(lambda url:urlsplit(url).path.endswith('.ipynb'),lambda route:route.fulfill(json=fixture))
        self.page.goto(self.base+'notebook/viewer.html?'+urlencode({'file':self.nb}))
        self.page.wait_for_function("document.querySelectorAll('.math-rendered').length===2")
        self.assertEqual(self.page.locator('.math-inline mjx-container[display="true"]').count(),0)
        self.assertEqual(self.page.locator('.math-display mjx-container[display="true"]').count(),1)

    def pwa_ready(self):
        self.home()
        self.page.evaluate('NSUApp.ready.then(()=>true)')
        self.page.wait_for_function('!!navigator.serviceWorker.controller')

    def test_pwa_offline_shell_material_versions_and_metadata(self):
        from urllib.parse import quote
        self.pwa_ready()
        url='../'+quote(self.nb)+'?v=one'
        read='async url=>{const r=await fetch(url);return {ok:r.ok,text:await r.text()}}'
        self.assertTrue(self.page.evaluate(read,url)['ok'])
        count=len(self.requests)
        self.assertTrue(self.page.evaluate(read,url)['ok'])
        self.assertEqual(len(self.requests),count,'A versioned notebook should not be downloaded twice')
        self.assertTrue(self.page.evaluate(read,url.replace('one','two'))['ok'])
        self.assertGreater(len(self.requests),count,'A new content version must reach the server')
        self.context.set_offline(True)
        self.page.reload()
        self.page.wait_for_function('FILES.length===2')
        self.assertTrue(self.page.evaluate(read,url)['ok'])
        self.assertIn('Reference',self.page.evaluate(read,url)['text'])
        self.page.locator('#offlineFiles').click()
        self.page.wait_for_function("document.querySelector('#appDialog').textContent.includes('Пока нет')")

    def test_pwa_pdf_explicit_save_offline_ranges_and_removal(self):
        from urllib.parse import quote, urlencode
        self.pwa_ready()
        url=self.base+'../'+quote(self.a)+'?v=fixture-a'
        viewer=self.base+'pdfjs/viewer.html?'+urlencode({'file':self.a,'v':'fixture-a','embed':'1'})
        # Merely fetching/opening a PDF must not fill offline storage.
        self.page.evaluate('async url=>(await fetch(url)).arrayBuffer().then(b=>b.byteLength)',url)
        self.assertEqual(self.page.evaluate("NSUApp.request('LIST_PDFS')"),[])
        result=self.page.evaluate("args=>NSUApp.request('SAVE_PDF',args)",{'url':url,'viewer':viewer,'title':'Тестовый PDF'})
        self.assertGreater(result['bytes'],100)
        self.context.set_offline(True)
        def range_read(value):
            return self.page.evaluate('''async ({url,value})=>{const r=await fetch(url,{headers:{Range:value}});
                return {status:r.status,range:r.headers.get('content-range'),size:(await r.arrayBuffer()).byteLength}}''',{'url':url,'value':value})
        self.assertEqual(range_read('bytes=0-99'),{'status':206,'range':f"bytes 0-99/{result['bytes']}",'size':100})
        self.assertEqual(range_read('bytes=-10')['size'],10)
        self.assertEqual(range_read('bytes=999999-')['status'],416)
        self.page.locator('#offlineFiles').click()
        self.page.wait_for_function("document.querySelector('.app-downloads a')?.textContent==='Тестовый PDF'")
        self.assertNotIn('embed=',self.page.locator('.app-downloads a').get_attribute('href'))
        self.page.get_by_role('button',name='Удалить сохранённый файл Тестовый PDF').click()
        self.page.wait_for_function("document.querySelectorAll('.app-downloads li').length===0")
        self.assertEqual(self.page.evaluate("NSUApp.request('LIST_PDFS')"),[])

    def test_pwa_has_no_install_cta_and_invalid_pdf(self):
        from urllib.parse import quote
        self.pwa_ready()
        self.assertEqual(self.page.locator('#installApp').count(),0)
        result=self.page.evaluate('''async args=>{try {await NSUApp.request('SAVE_PDF',args);return 'unexpected success';}
            catch(error){return error.message;}}''',{'url':self.base+'../'+quote(self.nb),
                'viewer':self.base+'pdfjs/viewer.html','title':'Not a PDF'})
        self.assertIn('Некорректная',result)

    def test_pwa_update_preserves_saved_documents(self):
        import time
        from urllib.parse import quote
        self.pwa_ready()
        self.assertEqual(self.page.locator('#appUpdate').count(),0,'A first installation is not an update')
        self.page.evaluate("args=>NSUApp.request('SAVE_PDF',args)",{
            'url':self.base+'../'+quote(self.a),'viewer':self.base+'pdfjs/viewer.html','title':'Saved before update'})
        worker=self.root/'docs/sw.js'
        original=worker.read_text(encoding='utf-8')
        try:
            worker.write_text(original.replace("SHELL_VERSION = 'v1'","SHELL_VERSION = 'test-update'"),encoding='utf-8')
            # SimpleHTTPRequestHandler's Last-Modified validator has one-second precision.
            os.utime(worker,(time.time()+2,time.time()+2))
            self.page.evaluate('async()=>{const r=await NSUApp.ready;await r.update()}')
            self.page.locator('#appUpdate').wait_for(state='visible')
            self.page.locator('#appUpdate').click()
            self.page.wait_for_function("async()=>(await caches.keys()).some(name=>name.endsWith('shell-test-update'))")
            self.page.wait_for_function('typeof NSUApp!=="undefined" && !!navigator.serviceWorker.controller')
            files=self.page.evaluate("NSUApp.request('LIST_PDFS')")
            self.assertEqual([file['title'] for file in files],['Saved before update'])
        finally:
            worker.write_text(original,encoding='utf-8')


if __name__ == '__main__':
    unittest.main()
