"""Browser smoke tests for the site Overseer encounter controller."""
import functools
import json
import http.server
import os
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class OverseerBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class Handler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *_args):
                pass

        cls.server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(channel=os.getenv('PLAYWRIGHT_CHANNEL') or None)
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/docs/'

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def page(self, mobile=False, clock=False, config=None):
        context = self.browser.new_context(
            viewport={'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 800},
            is_mobile=mobile, has_touch=mobile, service_workers='block')
        context.add_init_script("""
          window.__OVERSEER_TEST_CONFIG__={
            initialWindow:600000,raisedWindow:600000,musicWindow:600000,
            glitchMin:35,glitchMax:40,activeMax:5000,mobileActiveMax:250,
            cooldown:180,scanInterval:10
          };
          window.__overseerMusicPaused=true;
          Object.defineProperty(HTMLMediaElement.prototype,'paused',{
            configurable:true,get(){return window.__overseerMusicPaused}
          });
        """)
        if config:
            context.add_init_script('Object.assign(window.__OVERSEER_TEST_CONFIG__,' + json.dumps(config) + ')')
        page = context.new_page()
        if clock:
            page.clock.install(time=1893456000000)
            page.clock.pause_at(1893456000000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://giscus.app/**', lambda route: route.fulfill(body='', content_type='text/javascript'))
        page.goto(self.url)
        page.wait_for_function('window.NSUOverseer && document.querySelector("#nsuOverseer")')
        self.addCleanup(lambda: self.assertEqual(errors, []))
        self.addCleanup(context.close)
        return page

    def test_timed_probability_windows_and_active_deadline(self):
        page = self.page(clock=True, config={
            'initialWindow': 1400, 'raisedWindow': 700, 'activeMax': 1800,
            'cooldown': 700, 'scanInterval': 700})
        page.evaluate('Math.random=()=>.999')
        for elapsed, stage, chance in [(1400, 1, .2), (700, 2, .4), (700, 3, .45), (700, 4, .5)]:
            page.clock.run_for(elapsed)
            state = page.evaluate('NSUOverseer.getState()')
            self.assertFalse(state['active'])
            self.assertEqual(state['ambientStage'], stage)
            self.assertAlmostEqual(state['scheduleChance'], chance)
        # The next random trial succeeds inside its window, not at the boundary.
        page.evaluate('Math.random=()=>0')
        page.clock.run_for(700)
        self.assertTrue(page.evaluate('NSUOverseer.getState().active'))
        page.clock.run_for(900)
        page.evaluate('NSUOverseer.teleport()')
        page.clock.run_for(900)
        self.assertFalse(page.evaluate('NSUOverseer.getState().active'))
        self.assertFalse(page.evaluate("NSUOverseer.show('danger')"))
        page.clock.run_for(721)
        self.assertTrue(page.evaluate('NSUOverseer.getState().active'))

    def test_hidden_clipped_and_covered_word_does_not_summon(self):
        page = self.page()
        page.evaluate("""() => {
          const wrap=document.createElement('div');wrap.id='visibilityFixture';
          wrap.style.cssText='position:fixed;left:500px;top:300px;z-index:9999;opacity:0';
          wrap.innerHTML='<span>Грибанов</span>';document.body.append(wrap);
          NSUOverseer.scan();
        }""")
        self.assertFalse(page.evaluate('NSUOverseer.getState().active'))
        page.evaluate("""() => {
          const wrap=document.querySelector('#visibilityFixture');
          wrap.style.opacity='1';wrap.style.height='1px';wrap.style.overflow='hidden';
          NSUOverseer.scan();
        }""")
        self.assertFalse(page.evaluate('NSUOverseer.getState().active'))
        page.evaluate("""() => {
          document.querySelector('#visibilityFixture').style.height='40px';
          const cover=document.createElement('div');cover.id='coverFixture';
          cover.style.cssText='position:fixed;left:490px;top:290px;width:200px;height:80px;background:black;z-index:10000';
          document.body.append(cover);NSUOverseer.scan();
        }""")
        self.assertFalse(page.evaluate('NSUOverseer.getState().active'))
        page.evaluate("document.querySelector('#coverFixture').remove();NSUOverseer.scan()")
        self.assertTrue(page.evaluate('NSUOverseer.getState().active'))

    def test_turning_glitch_music_off_cancels_pending_encounter(self):
        page = self.page(clock=True, config={'glitchMin': 1500, 'glitchMax': 6000})
        page.evaluate("""() => {
          Math.random=()=>.5;
          chooseMusicTrack('na19x');window.__overseerMusicPaused=false;
          document.querySelector('#siteMusic').dispatchEvent(new Event('play'));
        }""")
        state = page.evaluate('NSUOverseer.getState()')
        self.assertEqual(state['scheduleMode'], 'glitch')
        self.assertEqual(page.evaluate('NSUOverseer.getState().scheduleWindowEnds-Date.now()'), 3750)
        page.clock.run_for(1000)
        page.evaluate("""() => {
          window.__overseerMusicPaused=true;
          document.querySelector('#siteMusic').dispatchEvent(new Event('pause'));
        }""")
        page.clock.run_for(6000)
        self.assertFalse(page.evaluate('NSUOverseer.getState().active'))
        self.assertEqual(page.evaluate('NSUOverseer.getState().scheduleMode'), 'ambient')

    def test_probability_ladder_render_and_cursor_escape(self):
        page = self.page()
        chances = page.evaluate('[0,1,2,3,4,13,14].map(window.NSUOverseer.chanceForStage)')
        for actual, expected in zip(chances, [.1, .2, .4, .45, .5, .95, 1]):
            self.assertAlmostEqual(actual, expected)
        self.assertTrue(page.evaluate("window.NSUOverseer.show('ambient')"))
        page.wait_for_selector('#nsuOverseer.is-active')
        page.wait_for_timeout(120)
        before = page.evaluate('window.NSUOverseer.getState().position')
        self.assertTrue(before['x'] < 60 or before['x'] > 1220 or before['y'] < 60 or before['y'] > 740)
        asset_urls = page.evaluate("performance.getEntriesByType('resource').map(entry=>entry.name).filter(url=>url.includes('/Overseer/'))")
        self.assertTrue(any(url.endswith('/Overseer/assets/Circle20.png') for url in asset_urls))
        self.assertFalse(any('overseer-extracted' in url for url in asset_urls))
        nonempty = page.evaluate("""() => Array.from(
          document.querySelector('.overseer-canvas').getContext('2d').getImageData(0,0,1280,800).data
        ).some(value=>value>0)""")
        self.assertTrue(nonempty)
        output = ROOT / 'build' / 'overseer'
        output.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(output / 'desktop.png'))
        page.mouse.move(before['x'], before['y'])
        page.wait_for_function("""before => {
          const now=window.NSUOverseer.getState().position;
          return Math.hypot(now.x-before.x,now.y-before.y)>80;
        }""", arg=before)
        self.assertTrue(page.evaluate('window.NSUOverseer.getState().active'))

    def test_gribanov_overrides_schedule_but_not_cooldown(self):
        page = self.page()
        page.evaluate("""() => {
          const word=document.createElement('div');word.id='dangerFixture';
          word.style.cssText='position:fixed;left:500px;top:200px;font-size:30px;z-index:3';
          word.textContent='Грибанов';document.body.append(word);window.NSUOverseer.scan();
        }""")
        page.wait_for_function("window.NSUOverseer.getState().active && window.NSUOverseer.getState().reason==='danger'")
        page.wait_for_timeout(180)
        output = ROOT / 'build' / 'overseer'
        output.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(output / 'danger.png'))
        page.evaluate("window.NSUOverseer.hide('test');window.NSUOverseer.scan()")
        self.assertFalse(page.evaluate('window.NSUOverseer.getState().active'))
        page.wait_for_function("window.NSUOverseer.getState().active && window.NSUOverseer.getState().reason==='danger'", timeout=1500)

    def test_music_modes_replace_ambient_schedule(self):
        page = self.page()
        page.evaluate("""() => {
          chooseMusicTrack('na19');window.__overseerMusicPaused=false;
          document.querySelector('#siteMusic').dispatchEvent(new Event('play'));
        }""")
        page.wait_for_function("window.NSUOverseer.getState().scheduleMode==='music'")
        self.assertEqual(page.evaluate('window.NSUOverseer.getState().scheduleChance'), .5)
        page.evaluate("""() => {
          chooseMusicTrack('na19x');document.body.classList.add('music-na19x');
          document.querySelector('#siteMusic').dispatchEvent(new Event('play'));
        }""")
        page.wait_for_function("window.NSUOverseer.getState().active && window.NSUOverseer.getState().reason==='glitch'", timeout=1500)
        page.wait_for_timeout(180)
        self.assertTrue(page.locator('#musicToggle').is_visible())
        output = ROOT / 'build' / 'overseer'
        output.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(output / 'glitch.png'))

    def test_mobile_timeout_touch_sparks_and_session_suppression(self):
        page = self.page(mobile=True)
        self.assertTrue(page.evaluate('window.NSUOverseer.getState().mobile'))
        page.evaluate("window.NSUOverseer.show('ambient')")
        page.wait_for_function('window.NSUOverseer.getState().active')
        page.wait_for_function('!window.NSUOverseer.getState().active', timeout=1200)

        page.reload()
        page.wait_for_function('window.NSUOverseer && document.querySelector("#nsuOverseer")')
        page.evaluate("window.NSUOverseer.show('ambient')")
        position = page.evaluate('window.NSUOverseer.getState().position')
        page.touchscreen.tap(position['x'], position['y'])
        page.wait_for_function("window.NSUOverseer?.getState().disintegrating && window.NSUOverseer.getState().reason==='shattered'")
        page.wait_for_timeout(90)
        self.assertTrue(page.evaluate("""() => Array.from(
          document.querySelector('.overseer-canvas').getContext('2d').getImageData(0,0,390,844).data
        ).some(value=>value>0)"""))
        output = ROOT / 'build' / 'overseer'
        output.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(output / 'mobile-sparks.png'))
        page.wait_for_function("!window.NSUOverseer.getState().active && window.NSUOverseer.getState().suppressedUntilReload", timeout=1600)
        self.assertFalse(page.evaluate("window.NSUOverseer.show('danger')"))
        page.evaluate("""() => {
          const word=document.createElement('div');word.textContent='Грибанов';document.body.append(word);
          window.NSUOverseer.scan();
        }""")
        page.wait_for_timeout(80)
        self.assertFalse(page.evaluate('window.NSUOverseer.getState().active'))

    def test_music_hover_only_projects_for_existing_overseer(self):
        page = self.page(clock=True, config={'activeMax': 20000})
        deadline = page.evaluate('NSUOverseer.getState().scheduleWindowEnds')
        page.locator('#musicToggle').hover()
        page.clock.run_for(50)
        self.assertFalse(page.evaluate('NSUOverseer.getState().active'))
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')
        self.assertEqual(page.evaluate('NSUOverseer.getState().scheduleWindowEnds'), deadline)

        with page.expect_response(lambda response: response.url.endswith('/GuidancePebbles.png')) as sprite_response:
            page.evaluate("NSUOverseer.show('ambient')")
        sprite_response.value.body()
        page.clock.run_for(200)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicApproach'), 'moving')
        page.clock.run_for(700)
        self.assertEqual(page.evaluate('NSUOverseer.getState().projectionBuild'), 0)
        self.assertGreater(page.evaluate('NSUOverseer.getState().haloAmount'), .5)
        page.clock.run_for(700)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), 'pebbles')
        self.assert_music_distance(page)
        page.mouse.move(640, 400)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')
        page.locator('#musicToggle').hover()
        page.clock.run_for(1500)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')
        self.assert_music_distance(page)
        page.mouse.move(640, 400)
        page.evaluate("""() => {
          chooseMusicTrack('na19x');window.__overseerMusicPaused=false;
          document.querySelector('#siteMusic').dispatchEvent(new Event('play'));
        }""")
        page.clock.run_for(900)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), 'stop')
        page.locator('#musicToggle').hover()
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), 'stop')
        page.mouse.move(640, 400)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), 'stop')
        page.evaluate("NSUOverseer.hide('test')")
        page.locator('#musicToggle').hover()
        self.assertFalse(page.evaluate('NSUOverseer.getState().active'))
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')

    def test_playing_either_track_blocks_pebbles_until_reload(self):
        for track in ['na19', 'na19x']:
            with self.subTest(track=track):
                page = self.page(clock=True, config={'activeMax': 20000})
                page.evaluate("""track => {
                  chooseMusicTrack(track);window.__overseerMusicPaused=false;
                  document.querySelector('#siteMusic').dispatchEvent(new Event('play'));
                  NSUOverseer.show('ambient');
                }""", track)
                page.locator('#musicToggle').hover()
                page.clock.run_for(1500)
                self.assertNotEqual(page.evaluate('NSUOverseer.getState().musicHologram'), 'pebbles')
                self.assert_music_distance(page)
                page.evaluate("""() => {
                  window.__overseerMusicPaused=true;
                  document.querySelector('#siteMusic').dispatchEvent(new Event('pause'));
                }""")
                page.mouse.move(640, 400)
                page.locator('#musicToggle').hover()
                page.clock.run_for(1500)
                self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')
                self.assert_music_distance(page)

                page.reload()
                page.wait_for_function('window.NSUOverseer && document.querySelector("#nsuOverseer")')
                page.evaluate("NSUOverseer.show('ambient')")
                page.mouse.move(640, 400)
                page.locator('#musicToggle').hover()
                page.clock.run_for(1500)
                self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), 'pebbles')

    def assert_music_distance(self, page):
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicApproach'), 'arrived')
        separation = page.evaluate("""() => {
          const rect=document.querySelector('#musicToggle').getBoundingClientRect();
          const pos=NSUOverseer.getState().position;
          return Math.hypot(pos.x-rect.left-rect.width/2,pos.y-rect.top-rect.height/2);
        }""")
        self.assertGreaterEqual(separation, 3 * 48 - .01)
        self.assertLessEqual(separation, 4.5 * 48 + .01)

    def test_leaving_music_before_arrival_preserves_first_hologram(self):
        page = self.page(clock=True, config={'activeMax': 20000})
        with page.expect_response(lambda response: response.url.endswith('/GuidancePebbles.png')) as sprite_response:
            page.evaluate("NSUOverseer.show('ambient')")
        sprite_response.value.body()
        page.clock.run_for(350)
        page.locator('#musicToggle').hover()
        page.clock.run_for(200)
        page.mouse.move(640, 400)
        page.clock.run_for(650)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')
        page.locator('#musicToggle').hover()
        page.clock.run_for(1500)
        self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), 'pebbles')
        self.assert_music_distance(page)

    def test_crown_opens_before_projection_and_lingers_after_distraction(self):
        page = self.page(clock=True, config={'activeMax': 20000})
        page.emulate_media(reduced_motion='reduce')
        with page.expect_response(lambda response: response.url.endswith('/miscDangerSymbol.png')) as sprite_response:
            page.evaluate("""() => {
              const word=document.createElement('div');word.textContent='Грибанов';
              word.style.cssText='position:fixed;left:500px;top:300px;z-index:9999';
              document.body.append(word);NSUOverseer.scan();
            }""")
        sprite_response.value.body()
        page.clock.run_for(450)
        self.assertEqual(page.evaluate('NSUOverseer.getState().projectionBuild'), 0)
        self.assertGreater(page.evaluate('NSUOverseer.getState().haloAmount'), .5)
        page.clock.run_for(700)
        self.assertGreater(page.evaluate('NSUOverseer.getState().projectionBuild'), .9)
        before = page.evaluate('NSUOverseer.getState()')
        point = before['position']
        inward = {'top': (0, 100), 'bottom': (0, -100), 'left': (100, 0), 'right': (-100, 0)}[before['edge']]
        page.mouse.move(point['x'] + inward[0], point['y'] + inward[1])
        page.clock.run_for(50)
        self.assertEqual(page.evaluate('NSUOverseer.getState().focus'), 'cursor')
        self.assertEqual(page.evaluate('NSUOverseer.getState().projectionBuild'), 0)
        self.assertGreater(page.evaluate('NSUOverseer.getState().haloAmount'), .8)
        page.clock.run_for(350)
        self.assertGreater(page.evaluate('NSUOverseer.getState().crownOpen'), .8)
        page.clock.run_for(1200)
        self.assertEqual(page.evaluate('NSUOverseer.getState().projectionStage'), 'idle')
        self.assertEqual(page.evaluate('NSUOverseer.getState().haloAmount'), 0)
        page.mouse.move(1200 if point['x'] < 640 else 80, 700 if point['y'] < 400 else 80)
        page.clock.run_for(200)
        self.assertEqual(page.evaluate('NSUOverseer.getState().projectionBuild'), 0)
        page.clock.run_for(800)
        self.assertGreater(page.evaluate('NSUOverseer.getState().projectionBuild'), .9)

    def test_music_approaches_sample_intervals_instead_of_two_points(self):
        page = self.page(clock=True, config={'activeMax': 60000})
        page.evaluate("""() => {
          let seed=1234;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
          chooseMusicTrack('na19');window.__overseerMusicPaused=false;
          document.querySelector('#siteMusic').dispatchEvent(new Event('play'));
          NSUOverseer.show('ambient');
        }""")
        positions=[]
        for _ in range(12):
            page.mouse.move(640, 400)
            page.locator('#musicToggle').hover()
            page.clock.run_for(850)
            self.assert_music_distance(page)
            self.assertEqual(page.evaluate('NSUOverseer.getState().musicHologram'), '')
            pos=page.evaluate('NSUOverseer.getState().position')
            positions.append((round(pos['x']), round(pos['y'])))
        self.assertGreater(len(set(positions)), 8)

    def test_cursor_escape_starts_before_touching_the_head(self):
        page = self.page(clock=True)
        page.emulate_media(reduced_motion='reduce')
        page.evaluate("NSUOverseer.show('ambient')")
        page.clock.run_for(400)
        state=page.evaluate('NSUOverseer.getState()')
        point=state['position']
        dx,dy={'top':(0,1),'bottom':(0,-1),'left':(1,0),'right':(-1,0)}[state['edge']]
        page.mouse.move(point['x']+dx*100,point['y']+dy*100)
        page.clock.run_for(100)
        self.assertEqual(page.evaluate('NSUOverseer.getState().focus'), 'cursor')
        self.assertFalse(page.locator('#nsuOverseer').evaluate("node=>node.classList.contains('is-zipping')"))
        page.mouse.move(point['x']+dx*50,point['y']+dy*50)
        self.assertTrue(page.locator('#nsuOverseer').evaluate("node=>node.classList.contains('is-zipping')"))
        page.clock.run_for(140)
        displacement=page.evaluate("""point=>{
          const now=NSUOverseer.getState().position;
          return Math.hypot(now.x-point.x,now.y-point.y);
        }""", point)
        self.assertGreater(displacement,80)
        self.assertTrue(page.evaluate('NSUOverseer.getState().active'))

    def test_pwa_shell_contains_overseer_component(self):
        context = self.browser.new_context(service_workers='allow')
        self.addCleanup(context.close)
        page = context.new_page()
        page.route('https://giscus.app/**', lambda route: route.fulfill(body='', content_type='text/javascript'))
        page.goto(self.url)
        page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        cached = page.evaluate("""async () => {
          const keys=await caches.keys();
          const urls=[];
          for(const key of keys) urls.push(...(await (await caches.open(key)).keys()).map(request=>request.url));
          return urls.filter(url=>url.includes('/Overseer/'));
        }""")
        self.assertEqual(
            {url.split('/')[-1].split('?')[0] for url in cached},
            {'overseer.js', 'overseer.css', 'Circle20.png', 'GuidancePebbles.png', 'miscDangerSymbol.png', 'keyArrowA.png', 'keyXA.png', 'noise.png'})


if __name__ == '__main__':
    unittest.main()
