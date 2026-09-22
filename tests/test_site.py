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
        for relative in ['docs/index.html', 'docs/search-worker.js', 'docs/pdfjs/viewer.html', 'docs/pdfjs/controls.css',
                         'docs/notebook/viewer.html', 'docs/notebook/viewer.css', 'docs/giscus-config.json']:
            target = cls.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)
        cls.a = 'ОВФ/01_Лекции/a.pdf'
        cls.b = 'ФЭЧ/01_Лекции/b.pdf'
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
        self.context=self.browser.new_context()
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


if __name__ == '__main__':
    unittest.main()
