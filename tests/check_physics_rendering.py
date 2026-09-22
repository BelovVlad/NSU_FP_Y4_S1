"""Render the real physics notebooks with MathJax and validate their TeX in KaTeX.

python tests/check_physics_rendering.py
Requires network access to the pinned CDN libraries used by the site.
PLAYWRIGHT_CHANNEL=msedge uses an installed Edge on Windows.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import threading
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'build/physics-typography'


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results = []
    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('PLAYWRIGHT_CHANNEL'):
                options['channel'] = os.environ['PLAYWRIGHT_CHANNEL']
            browser = p.chromium.launch(**options)
            context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            for filename, label, sections in [
                ('Физические константы','constants',['Тепловое излучение','Ускорение, калория и давление','Молярная масса воздуха']),
                ('Системы единиц и фундаментальные соотношения','units',['Часто используемые приставки','Масса и энергия покоя','Электричество: заряд, ток и поле']),
            ]:
                path = f'База/Практика/Физика/{filename}.ipynb'
                page.set_viewport_size({'width':1440,'height':1000})
                page.goto(f'http://127.0.0.1:{server.server_port}/docs/notebook/viewer.html?'+urlencode({'file':path}))
                page.wait_for_selector('.reference-nav')
                page.wait_for_function("document.querySelectorAll('.math-placeholder:not(.math-rendered)').length===0", timeout=120000)
                assert page.locator('[data-mjx-error],mjx-merror,.math-error').count() == 0
                assert page.locator('.math-inline mjx-container[display="true"]').count() == 0, 'Inline TeX became block math'
                assert page.locator('.math-display mjx-container:not([display="true"])').count() == 0
                # Check the other renderer used by notebook previews; MathJax is more permissive.
                page.add_script_tag(url='https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js')
                katex_errors = page.evaluate('''()=>[...mathRegistry.values()].flatMap(token=>{
                    try{katex.renderToString(token.tex,{displayMode:token.display,throwOnError:true,strict:'ignore'});return []}
                    catch(error){return [{tex:token.tex,error:String(error)}]}
                })''')
                assert not katex_errors, katex_errors
                count = page.locator('.math-rendered').count()
                for number, section in enumerate(sections):
                    heading = page.locator('.markdown-body h3').filter(has_text=section).first
                    heading.evaluate('(el)=>el.scrollIntoView({block:"start"})')
                    page.screenshot(path=str(OUT/f'{label}-{number}-desktop.png'))
                # Test every table's layout at both extremes of the supported zoom range.
                for width in [1440, 390, 320]:
                    page.set_viewport_size({'width':width,'height':1000 if width==1440 else 844})
                    for zoom in ['80','100','150']:
                        page.locator('#zoomSelect').select_option(zoom)
                        page.wait_for_timeout(100)
                        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (label,width,zoom)
                    page.locator('#zoomSelect').select_option('100')
                    if width<1000:
                        for number,section in enumerate(sections):
                            page.locator('.markdown-body h3').filter(has_text=section).first.evaluate('(el)=>el.scrollIntoView({block:"start"})')
                            page.screenshot(path=str(OUT/f'{label}-{number}-{width}.png'))
                assert not errors, errors
                results.append({'notebook':filename, 'math_expressions':count, 'MathJax_errors':0, 'KaTeX_errors':0})
                print(json.dumps(results[-1],ensure_ascii=False),flush=True)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (OUT/'report.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__ == '__main__':
    main()
