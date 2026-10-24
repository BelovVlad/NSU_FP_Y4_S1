"""Optional end-to-end PWA check with real CDN libraries, then a disconnected browser.

Uses synthetic documents in a temporary site. Run with PLAYWRIGHT_CHANNEL=msedge
on Windows, or install Playwright Chromium. Screenshots go to build/pwa/.
"""
import json
from urllib.parse import quote, urlencode

from test_site import ROOT, SiteTests


def main():
    SiteTests.setUpClass()
    context = None
    try:
        fixture = {'nbformat': 4, 'metadata': {}, 'cells': [{'cell_type': 'markdown',
            'source': '# Офлайн-справочник\n\nЗаряд $q$ и закон Вина $b=\\lambda_{\\max}T$.\n\n$$E=mc^2$$'}]}
        (SiteTests.root / SiteTests.nb).write_text(json.dumps(fixture), encoding='utf-8')
        catalogue=SiteTests.root/'docs/search-index/files.json'
        data=json.loads(catalogue.read_text(encoding='utf-8'))
        data['files'].append({'path':SiteTests.nb,'type':'ipynb','version':'offline-fixture'})
        catalogue.write_text(json.dumps(data),encoding='utf-8')
        context = SiteTests.browser.new_context(viewport={'width':390,'height':844})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(SiteTests.base)
        page.evaluate('NSUApp.ready.then(()=>true)')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        client = context.new_cdp_session(page)
        manifest = client.send('Page.getAppManifest')
        assert manifest.get('url') and not manifest.get('errors'), manifest
        installability = client.send('Page.getInstallabilityErrors')
        assert not [error for error in installability['installabilityErrors'] if error['errorId'] != 'in-incognito'], installability
        out = ROOT / 'build/pwa'
        out.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(out/'install-mobile.png'))
        notebook_url = SiteTests.base + 'notebook/viewer.html?' + urlencode({'file':SiteTests.nb,'v':'offline-fixture'})
        # Save the notebook before ever visiting its renderer: offline readiness
        # must come from preparation, not a previous online rendering session.
        page.evaluate("args=>NSUApp.request('SAVE_MATERIAL',args)",{
            'url':SiteTests.base+'../'+quote(SiteTests.nb)+'?v=offline-fixture',
            'viewer':notebook_url,'title':'Офлайн-справочник'})
        pdf_url = SiteTests.base + 'pdfjs/viewer.html?' + urlencode({'file':SiteTests.a,'v':'offline-fixture'})
        page.goto(pdf_url)
        page.wait_for_function("document.querySelector('#total').textContent==='/ 2'",timeout=60000)
        page.locator('#notesToggle').click()
        box=page.locator('.canvas-wrap .user-notes svg').bounding_box()
        page.mouse.move(box['x']+80,box['y']+110);page.mouse.down()
        page.mouse.move(box['x']+180,box['y']+130,steps=12);page.mouse.up()
        page.wait_for_function('async()=>(await NSUAnnotations.backup()).objects.length===1')
        page.locator('#notesToggle').click()
        page.locator('#toolsToggle').click()
        page.locator('#saveOffline').click()
        page.wait_for_function("document.querySelector('#saveOffline').textContent==='Сохранён'",timeout=60000)
        page.evaluate('NSUApp.warm()')
        page.screenshot(path=str(out/'save-pdf-mobile.png'))
        # Close all pages before going offline: no in-memory renderer or module instances may be reused.
        page.close()
        context.set_offline(True)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(SiteTests.base)
        page.wait_for_function('FILES.length===3')
        page.locator('#appSettings').click()
        page.get_by_role('button',name='Сохранённые материалы',exact=True).click()
        page.locator('.app-downloads a[href*="pdfjs/"]').first.click()
        page.wait_for_function("document.querySelector('#total')?.textContent==='/ 2' && !document.querySelector('#loading').classList.contains('show')",timeout=30000)
        page.locator('.canvas-wrap .user-notes path').wait_for()
        page.screenshot(path=str(out/'pdf-offline-mobile.png'))
        page.goto(notebook_url)
        page.wait_for_function("document.querySelectorAll('mjx-container').length===3",timeout=30000)
        page.evaluate('document.fonts.ready.then(()=>true)')
        assert page.locator('mjx-merror,[data-mjx-error]').count() == 0
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(out/'notebook-offline-mobile.png'))
        assert not errors, errors
        print(json.dumps({'installability':installability,'offline_pdf':'passed','offline_notes':'passed','cold_offline_math':'passed','screenshots':str(out)},ensure_ascii=False,indent=2))
    except Exception:
        if context and context.pages:
            debug_page = context.pages[-1]
            print('URL:', debug_page.url)
            print('Errors:', errors)
            print('Page:', debug_page.locator('body').inner_text()[:1800])
            print('Cached:', debug_page.evaluate('async()=>Object.fromEntries(await Promise.all((await caches.keys()).map(async name=>[name,(await (await caches.open(name)).keys()).map(r=>r.url)])))'))
        raise
    finally:
        if context:
            context.close()
        SiteTests.tearDownClass()


if __name__ == '__main__':
    main()
