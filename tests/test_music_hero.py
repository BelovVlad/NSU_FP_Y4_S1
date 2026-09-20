"""Hero/audio browser regressions. Screenshots: build/hero-check/.

NOTEBOOK_BROWSER_CHANNEL=msedge python -m unittest discover -s tests -p test_music_hero.py -v
"""
import functools
import http.server
import json
import os
from pathlib import Path
import threading
import unittest
from urllib.parse import quote

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'build/hero-check'


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path.split('?')[0] == '/docs/index.html':
            body = (ROOT / 'docs/index.html').read_bytes()
            body = body[body.index(b'<!doctype'):]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()


class MusicHeroTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        OUT.mkdir(parents=True, exist_ok=True)
        cls.server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
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
        self.context = self.browser.new_context(viewport={'width':1920, 'height':1080})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open(self):
        self.page.goto(f'http://127.0.0.1:{self.server.server_port}/docs/index.html#subject='+quote('ФиХАиМ'))
        self.page.wait_for_function('''() => document.querySelectorAll('.hero-art img').length===3 &&
            [...document.querySelectorAll('.hero-art img')].every(i=>i.complete && i.naturalWidth)''')

    def play(self, track):
        # Select the rare track deterministically, then use the real playback control.
        self.page.evaluate('(id)=>chooseMusicTrack(id)', track)
        if self.page.viewport_size['width'] <= 720:
            self.page.click('#menuBtn')
            self.page.click('#musicToggle')
            self.page.click('#overlay', position={'x':380, 'y':300})
        else:
            self.page.click('#musicToggle')
        self.page.wait_for_function('!musicAudio.paused && musicAudio.currentTime > 0')
        self.page.wait_for_timeout(750)

    def layers(self):
        return self.page.locator('.hero-art img').evaluate_all('''els=>els.map(i=>{
            const css=getComputedStyle(i);
            return {name:i.className,opacity:+css.opacity,visibility:css.visibility,
                position:css.objectPosition,src:decodeURIComponent(new URL(i.src).pathname)};
        })''')

    def assert_layer(self, expected):
        for layer in self.layers():
            if layer['name'] == 'hero-art-'+expected:
                self.assertGreater(layer['opacity'], 0)
                self.assertEqual(layer['visibility'], 'visible')
            else:
                self.assertEqual(layer['opacity'], 0)
                self.assertEqual(layer['visibility'], 'hidden')

    def crop(self):
        return self.page.locator('.hero-art img:not(.hero-art-base)').evaluate_all('''els=>els.map((i,n)=>{
            const r=i.getBoundingClientRect(), p=getComputedStyle(i).objectPosition.split(' ').map(parseFloat);
            const scale=Math.max(r.width/i.naturalWidth,r.height/i.naturalHeight);
            const cropX=(i.naturalWidth*scale-r.width)*p[0]/100;
            const cropY=(i.naturalHeight*scale-r.height)*p[1]/100;
            return {image:i.className,width:r.width,height:r.height,scale,cropX,cropY,
                sourceTop:cropY/scale,sourceBottom:(cropY+r.height)/scale,
                headX:[1560,1652][n]*scale-cropX,headY:[625,641][n]*scale-cropY};
        })''')

    def test_desktop_and_mobile_states_and_crop(self):
        report = {}
        for width,height in [(1920,1080),(390,844)]:
            with self.subTest(width=width):
                self.page.set_viewport_size({'width':width,'height':height})
                self.open()
                for track, expected in [('off','base'),('na19','na19'),('na19x','na19x')]:
                    if track != 'off':
                        self.play(track)
                    self.assert_layer(expected)
                    self.page.screenshot(path=str(OUT/f'{width}-{track}.png'))
                    self.assertLessEqual(self.page.evaluate('document.documentElement.scrollWidth-innerWidth'), 1)
                    self.assertTrue(self.page.locator('.hero h1').is_visible())
                    report[f'{width}-{track}'] = self.layers()
                # Pause must hide music immediately, even while the entry animation is running.
                self.page.evaluate('musicAudio.pause()')
                self.assert_layer('base')
                crop = self.crop()
                self.assertLess(abs(crop[0]['headY']-crop[1]['headY']), 4)
                for c in crop:
                    self.assertTrue(0<c['headY']<c['height'])
                    self.assertTrue(0<c['headX']<c['width'])
                report[f'{width}-crop'] = crop
                # Re-rendering subjects must keep exactly the selected image visible.
                self.play('na19x')
                self.page.evaluate('renderSubject()')
                self.page.wait_for_timeout(220)
                self.assert_layer('na19x')
                self.page.evaluate('musicAudio.pause()')
                self.assert_layer('base')
        (OUT/'states-and-crop.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

    def test_transitions_and_fast_pause(self):
        self.open()
        self.page.evaluate("chooseMusicTrack('na19')")
        self.page.click('#musicToggle')
        self.page.wait_for_function('''() => {
            const opacity=+getComputedStyle(document.querySelector('.hero-art-na19')).opacity;
            return opacity>0 && opacity<1;
        }''')
        self.page.wait_for_timeout(700)
        self.assert_layer('na19')
        self.page.evaluate("chooseMusicTrack('na19x');void toggleMusic()")
        self.page.wait_for_function("document.body.classList.contains('music-na19x')")
        self.page.evaluate('musicAudio.pause()')
        self.assert_layer('base')
        self.page.wait_for_timeout(750)
        self.assert_layer('base')

    def test_glitch_keeps_buttons_fixed_and_has_quiet_gaps(self):
        self.open()
        self.play('na19x')
        samples = self.page.evaluate('''() => new Promise(resolve=>{
            const samples=[], start=performance.now();
            const sample=()=>{
                const rects=['#homeBtn','#musicToggle','#sortSelect','.tab','.hero-copy'].map(s=>{
                    const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height];
                });
                samples.push({time:performance.now()-start,rects,
                    hit:document.body.classList.contains('music-glitch-hit'),
                    shell:getComputedStyle(document.querySelector('.shell')).transform});
                if(performance.now()-start<6000)requestAnimationFrame(sample);else resolve(samples);
            };sample();
        })''')
        self.assertTrue(any(s['hit'] for s in samples), 'Real audio must produce a decorative pulse')
        for sample in samples:
            self.assertEqual(sample['rects'], samples[0]['rects'])
            self.assertEqual(sample['shell'], 'none')
        starts = [s['time'] for i,s in enumerate(samples) if s['hit'] and (i==0 or not samples[i-1]['hit'])]
        self.assertTrue(all(b-a>=1750 for a,b in zip(starts,starts[1:])))
        self.assertLess(sum(s['hit'] for s in samples)/len(samples), .12)
        # Exercise the maximum-strength path, including repeated triggers during a hit.
        pulse = self.page.evaluate('''() => new Promise(resolve=>{
            stopMusicGlitch();musicGlitchLastHit=-Infinity;triggerMusicGlitch(1);
            const start=performance.now(), shell=getComputedStyle(document.querySelector('.shell')).transform;
            const hero=getComputedStyle(document.querySelector('.hero-art')).transform;
            const sample=()=>{
                triggerMusicGlitch(1);
                if(document.body.classList.contains('music-glitch-hit'))requestAnimationFrame(sample);
                else resolve({duration:performance.now()-start,shell,hero});
            };sample();
        })''')
        self.assertEqual(pulse['shell'], 'none')
        self.assertIn(pulse['hero'], ['matrix(1, 0, 0, 1, 2, 0)','matrix(1, 0, 0, 1, -2, 0)'])
        self.assertGreaterEqual(pulse['duration'], 90)
        self.assertLess(pulse['duration'], 150)
        self.page.click('#musicMore')
        self.assertTrue(self.page.locator('#musicPanel').is_visible())
        self.page.click('#musicToggle')
        self.page.wait_for_function("!document.body.classList.contains('music-active')")
        self.assert_layer('base')
        (OUT/'glitch.json').write_text(json.dumps({'hitStartsMs':starts,'maximumPulse':pulse,
            'buttonDisplacementPx':0,'samples':len(samples)}, indent=2), encoding='utf-8')

    def test_reduced_motion(self):
        self.page.emulate_media(reduced_motion='reduce')
        self.open()
        self.play('na19x')
        self.assert_layer('na19x')
        self.assertEqual(self.page.locator('.hero-art-na19x').evaluate('(i)=>getComputedStyle(i).animationName'), 'none')
        self.page.evaluate('triggerMusicGlitch(1)')
        self.assertFalse(self.page.evaluate("document.body.classList.contains('music-glitch-hit')"))


if __name__ == '__main__':
    unittest.main()
