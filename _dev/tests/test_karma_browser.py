"""Karma UI smoke tests against local files; no game/extraction folders needed."""
import functools
import http.server
import json
import os
from pathlib import Path
import threading
import unittest
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


class KarmaBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class Handler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *args):
                pass
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(channel=os.getenv('PLAYWRIGHT_CHANNEL') or None)
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/docs/'

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def page(self, mobile=False):
        context = self.browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},
                                          is_mobile=mobile,has_touch=mobile,service_workers='block')
        page = context.new_page()
        page.clock.install(time=datetime(2026,9,26,7,tzinfo=timezone.utc))
        page.route('https://**/*', lambda route: route.abort())
        rules=json.loads((ROOT/'docs/Karma/rules.json').read_text('utf-8'))
        totals=[4,2,2,2,3,2,4,2]
        counts={s['id']:n for s,n in zip(rules['series'],totals)}
        structure={'groups':[{'subject':s['subject'],'section':s['section'],'items':[{}]*n} for s,n in zip(rules['series'],totals)]}
        history={'rules':rules,'currentCounts':counts,'snapshots':[{'at':'2026-09-25T12:00:00+07:00','counts':counts}]}
        page.route('**/search-index/structure.json',lambda route:route.fulfill(json=structure))
        page.route('**/search-index/karma-history.json',lambda route:route.fulfill(json=history))
        self.addCleanup(context.close)
        return page

    def test_desktop_lazy_load_open_reopen_and_refresh(self):
        page = self.page()
        errors,requests = [],[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda request:requests.append(request.url))
        page.goto(self.url)
        self.assertFalse(any('/Karma/' in url for url in requests))
        page.locator('#secretAcademicTrigger').dblclick()
        page.wait_for_function("document.querySelector('#secretAcademicKarma')?.dataset.level==='1'")
        page.wait_for_timeout(2300)
        self.assertEqual(page.locator('.karma-subject').count(),5)
        self.assertEqual(page.locator('.karma-subject.complete').count(),1)
        self.assertEqual(page.locator('.karma-header h3').inner_text(),'Карма')
        self.assertEqual(page.locator('.karma-eyebrow,.karma-clock,.karma-level').count(),0)
        self.assertFalse(any('UIArp' in url for url in requests))
        self.assertEqual(page.locator('.karma-subject.complete').filter(has_text='ФиХАиМ').count(),0)
        fiham=page.locator('.karma-subject').filter(has_text='ФиХАиМ')
        self.assertEqual(fiham.locator('b').inner_text(),'6 / 8')
        self.assertIn('Лекции + Семинары',fiham.inner_text())
        self.assertNotIn('долг по предмету',page.locator('.karma-series').inner_text())
        self.assertNotIn('долг',fiham.get_attribute('title'))
        self.assertEqual(page.locator('.karma-display').get_attribute('aria-label'),'Карма 1 из 10')
        self.assertEqual(page.locator('.karma-status').text_content(),'')
        self.assertTrue(page.locator('.karma-status').is_hidden())
        for subject,total in [('ТДиСФ','4 / 8'),('ФЭЧ','5 / 8'),('ФиХАиМ','6 / 8')]:
            row=page.locator('.karma-subject').filter(has_text=subject)
            self.assertEqual(row.locator('small').inner_text(),'Лекции + Семинары')
            self.assertEqual(row.locator('b').inner_text(),total)
        self.assertEqual(page.locator('.secret-subject-list,.secret-subject').count(),0)
        debts=page.locator('#secretAcademicSubjects')
        self.assertIn('Что сейчас не закрыто',debts.inner_text())
        self.assertEqual(debts.locator('.secret-debt').count(),6)
        self.assertEqual(debts.locator('.secret-debt').filter(has_text='ФиХАиМ').locator('.secret-debt-name').inner_text(),'ФиХАиМ · Семинары')
        flower=page.locator('.karma-tracks > div').nth(0)
        self.assertEqual(page.locator('.karma-tracks b').count(),0)
        self.assertNotIn('дней',page.locator('.karma-tracks').inner_text())
        self.assertAlmostEqual(flower.locator('em').evaluate('(el)=>parseFloat(el.style.width)'),0,places=4)
        self.assertTrue(page.evaluate("document.querySelector('#secretAcademicKarma').compareDocumentPosition(document.querySelector('#secretAcademicSummary')) & Node.DOCUMENT_POSITION_FOLLOWING"))
        self.assertTrue(page.evaluate("Array.from(document.querySelector('.karma-display canvas').getContext('2d').getImageData(0,0,280,310).data).some(x=>x>0)"))
        page.locator('#secretAcademicRefresh').click()
        page.wait_for_function("!document.querySelector('#secretAcademicRefresh').disabled")
        page.keyboard.press('Escape')
        page.locator('#secretAcademicTrigger').dblclick()
        page.wait_for_selector('#secretAcademicDashboard.is-open')
        page.wait_for_timeout(2200)
        self.assertEqual(page.locator('#secretAcademicKarma').count(),1)
        self.assertFalse(any('-extracted/' in url for url in requests))
        self.assertFalse(errors,errors)
        output=ROOT/'build/karma';output.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(output/'desktop.png'))

    def test_mobile_double_tap_and_no_horizontal_overflow(self):
        page = self.page(True)
        page.goto(self.url)
        page.locator('#menuBtn').tap()
        trigger=page.locator('#secretAcademicTrigger')
        trigger.tap();page.wait_for_timeout(100);trigger.tap()
        page.wait_for_function("document.querySelector('.karma-subject.complete')")
        page.wait_for_timeout(2100)
        card=page.locator('#secretAcademicKarma')
        self.assertTrue(card.evaluate('(el)=>el.scrollWidth<=el.clientWidth'))
        box=card.bounding_box()
        self.assertGreaterEqual(box['x'],0)
        self.assertLessEqual(box['x']+box['width'],390)
        output=ROOT/'build/karma';output.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(output/'mobile.png'))

    def test_published_files_render_karma_without_mocked_history(self):
        context=self.browser.new_context(service_workers='block')
        self.addCleanup(context.close)
        page=context.new_page()
        page.route('https://**/*',lambda route:route.abort())
        errors,failed=[],[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('response',lambda response:failed.append(response.url) if response.status>=400 and
                ('/Karma/' in response.url or 'karma-history.json' in response.url) else None)
        page.goto(self.url)
        page.locator('#secretAcademicTrigger').dblclick()
        page.wait_for_function("document.querySelector('#secretAcademicKarma')?.dataset.level")
        page.wait_for_function("Array.from(document.querySelector('.karma-display canvas').getContext('2d').getImageData(0,0,360,360).data).some(x=>x>0)")
        self.assertEqual(page.locator('.karma-subject').count(),5)
        self.assertFalse(failed,failed)
        self.assertFalse(errors,errors)

    def test_unavailable_history_does_not_break_statistics(self):
        page = self.page()
        page.route('**/karma-history.json',lambda route:route.fulfill(status=503,body='offline'))
        page.goto(self.url)
        page.locator('#secretAcademicTrigger').dblclick()
        page.wait_for_function("document.querySelector('.karma-status')?.textContent.includes('недоступна')")
        self.assertEqual(page.locator('.secret-academic-metric').count(),4)

    def test_level_endpoints_flower_days_and_subject_surplus(self):
        page=self.page()
        page.goto(self.url)
        page.locator('#secretAcademicTrigger').dblclick()
        page.wait_for_function("document.querySelector('#secretAcademicKarma')?.dataset.level==='1'")
        states=page.evaluate("""async () => {
          const {rules}=await (await fetch('search-index/karma-history.json')).json();
          const host=document.createElement('div');
          const view=new KarmaView(host),now=Date.now(),day=86400000;
          const fill=count=>Object.fromEntries(rules.series.map(s=>[s.id,count]));
          const partial={...fill(0),[rules.series[0].id]:100};
          const iso=time=>new Date(time).toISOString();
          // One debt in seven sections and its full repayment on each of the last n days.
          const climb=n=>Array.from({length:n},(_,k)=>[{at:iso(now-(n-k)*day),counts:partial},
            {at:iso(now-(n-k)*day+3600000),counts:fill(100)}]).flat();
          const read=snapshots=>{
            const result=KarmaEngine.calculate({rules,snapshots},now);
            view.render(result,now);
            const tracks=host.querySelectorAll('.karma-tracks>div');
            return {level:host.dataset.level,label:host.querySelector('.karma-display').getAttribute('aria-label'),
              width:parseFloat(tracks[0].querySelector('em').style.width),
              maximum:parseFloat(tracks[1].querySelector('em').style.width)};
          };
          const states={initial:read([{at:iso(now-day/2),counts:fill(0)}]),oneDay:read(climb(1)),
            all:read([{at:iso(now-day),counts:fill(100)}]),beforeTop:read(climb(14)),top:read(climb(15))};
          const empty=Object.fromEntries(rules.series.map(s=>[s.id,0]));
          const full=Object.fromEntries(rules.series.map(s=>[s.id,100]));
          view.render(KarmaEngine.calculate({rules,snapshots:[
            {at:new Date(now-day).toISOString(),counts:empty},
            {at:new Date(now).toISOString(),counts:full}]},now),now);
          states.flower={width:parseFloat(host.querySelector('.karma-tracks em').style.width)};
          const counts=Object.fromEntries(rules.series.map(s=>[s.id,0]));
          counts['fiham-lectures']=6;counts['fiham-seminars']=2;
          view.render(KarmaEngine.calculate({rules,snapshots:[{at:new Date(now).toISOString(),counts}]},now),now);
          const subject=[...host.querySelectorAll('.karma-subject')].find(el=>el.textContent.includes('ФиХАиМ'));
          states.surplus={count:subject.querySelector('b').textContent,complete:subject.classList.contains('complete')};
          view.stop();return states;
        }""")
        self.assertEqual(states['initial']['level'],'1')
        self.assertEqual(states['initial']['label'],'Карма 1 из 10')
        self.assertEqual(states['initial']['width'],0)
        self.assertEqual(states['oneDay']['level'],'2')
        self.assertEqual(states['flower'],{'width':100})
        self.assertEqual(states['all']['level'],'1')
        self.assertEqual(states['beforeTop']['level'],'9')
        self.assertEqual(states['top']['level'],'10')
        self.assertEqual(states['top']['label'],'Карма 10 из 10')
        self.assertAlmostEqual(states['beforeTop']['maximum'],600/7,places=4)
        self.assertEqual(states['top']['maximum'],100)
        self.assertEqual(states['surplus'],{'count':'6 / 8','complete':False})

    def test_waiting_label_replaces_checkmark_only_until_deadline(self):
        page=self.page()
        page.goto(self.url)
        page.locator('#secretAcademicTrigger').dblclick()
        page.wait_for_function("document.querySelector('#secretAcademicKarma')?.dataset.level")
        states=page.evaluate("""async () => {
          const {rules}=await (await fetch('search-index/karma-history.json')).json();
          const counts=Object.fromEntries(rules.series.map(s=>[s.id,4]));
          const history={rules,snapshots:[{at:'2026-09-28T00:00:00+07:00',counts}]};
          const host=document.createElement('div'),view=new KarmaView(host);
          const read=iso=>{
            const now=Date.parse(iso),result=KarmaEngine.calculate(history,now);
            view.render(result,now);
            const row=[...host.querySelectorAll('.karma-subject')].find(el=>el.textContent.includes('ОВФ'));
            return {complete:row.classList.contains('complete'),waiting:row.classList.contains('waiting'),
              label:row.querySelector('.karma-subject-waiting')?.textContent||'',level:result.level};
          };
          const states={afterLesson:read('2026-09-29T15:00:00+07:00'),
            deadline:read('2026-09-30T09:00:00+07:00')};
          view.stop();return states;
        }""")
        self.assertEqual(states['afterLesson'],{'complete':False,'waiting':True,
                                                'label':'ожидание до 9:00','level':0})
        self.assertEqual(states['deadline'],{'complete':False,'waiting':False,'label':'','level':0})

    def test_increase_sound_phases_and_loop_cleanup(self):
        page=self.page()
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.add_init_script("localStorage.setItem('nsu-editor-karma-visual-v1',JSON.stringify({level:0,shield:false,protectedUntil:null}))")
        rules=json.loads((ROOT/'docs/Karma/rules.json').read_text('utf-8'))
        full={row['id']:100 for row in rules['series']}
        page.route('**/search-index/karma-history.json',lambda route:route.fulfill(json={
            'rules':rules,'currentCounts':full,'snapshots':[
                {'at':'2026-09-25T12:00:00+07:00','counts':{**full,rules['series'][0]['id']:0}},
                {'at':'2026-09-25T13:00:00+07:00','counts':full}]}))
        page.route('**/search-index/structure.json',lambda route:route.fulfill(json={
            'groups':[{'subject':row['subject'],'section':row['section'],'items':[{}]*100} for row in rules['series']]}))
        page.goto(self.url)
        page.evaluate("""() => {
          window.__sounds=[];
          const play=window.playSecretDashboardSound;
          window.playSecretDashboardSound=(name,volume,options)=>{
            const item={name,volume,loop:!!options?.loop,stopped:false};window.__sounds.push(item);
            const stop=play(name,volume,options);
            const wrapped=()=>{item.stopped=true;stop()};wrapped.set=stop.set;return wrapped;
          };
        }""")
        page.locator('#secretAcademicTrigger').dblclick()
        page.wait_for_function("window.__sounds.some(s=>s.name==='karmaRiseA')")
        page.wait_for_function("document.querySelector('#secretAcademicKarma').dataset.phase==='Resting'")
        page.wait_for_function("window.__sounds.some(s=>s.loop&&s.stopped)")
        sounds=page.evaluate('window.__sounds')
        self.assertEqual([s['volume'] for s in sounds if s['name']=='karmaFuzz'],[.4])
        self.assertEqual([s['volume'] for s in sounds if s['name']=='karmaRiseA'],[.4])
        self.assertEqual([s['volume'] for s in sounds if s['name']=='UIWoodHit'],[.4])
        self.assertTrue(any(s['name'].startswith('karmaWheelC_') and s['volume']==.4 for s in sounds))
        self.assertFalse(errors,errors)


if __name__=='__main__':
    unittest.main()
