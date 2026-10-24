"""Notes persistence, PDF-space geometry, recovery, backup and explicit offline library."""
import json
import unittest
from pathlib import Path
from urllib.parse import quote, urlencode

import test_site as fixtures


class AnnotationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixtures.SiteTests.setUpClass.__func__(cls)

    @classmethod
    def tearDownClass(cls):
        fixtures.SiteTests.tearDownClass.__func__(cls)

    setUp = fixtures.SiteTests.setUp
    tearDown = fixtures.SiteTests.tearDown
    pdf = fixtures.SiteTests.pdf
    home = fixtures.SiteTests.home
    pwa_ready = fixtures.SiteTests.pwa_ready

    def saved_count(self, count):
        self.page.wait_for_function('async count=>(await NSUAnnotations.backup()).objects.length===count', arg=count)

    def draw(self, offset=0):
        layer=self.page.locator('.continuous-page:first-child .user-notes>svg')
        box=layer.bounding_box()
        x,y=box['x']+80,box['y']+100+offset
        self.page.mouse.move(x,y)
        self.page.mouse.down()
        self.page.mouse.move(x+70,y+15,steps=12)
        self.page.mouse.up()

    def test_notes_persist_zoom_modes_undo_redo_and_eraser(self):
        self.pdf()
        self.page.locator('#notesToggle').click()
        self.draw()
        self.saved_count(1)
        original=self.page.evaluate('(async()=> (await NSUAnnotations.backup()).objects[0])()')
        self.page.locator('#noteUndo').click();self.saved_count(0)
        self.page.locator('#noteRedo').click();self.saved_count(1)
        self.draw(60);self.saved_count(2)
        self.page.locator('[data-note-tool=eraser]').click()
        self.page.locator('.continuous-page:first-child .user-notes path').first.click(position={'x':5,'y':2},force=True)
        self.saved_count(1)
        self.page.locator('#noteUndo').click();self.saved_count(2)
        self.page.locator('#notesToggle').click()
        self.page.locator('#zoom').fill('250');self.page.locator('#zoom').dispatch_event('change')
        self.page.wait_for_function("document.querySelector('.continuous-page:first-child .user-notes g')?.getAttribute('transform').includes('3.333')")
        self.assertEqual(self.page.evaluate('(async()=> (await NSUAnnotations.backup()).objects.find(a=>a.id===%s).points)()'%json.dumps(original['id'])),original['points'])
        self.page.reload()
        self.page.wait_for_function("document.querySelectorAll('.continuous-page:first-child .user-notes path').length===2")
        self.assertEqual(self.page.locator('#notesToggle').get_attribute('aria-pressed'),'false')

    def test_text_selection_copy_highlight_and_note_editing(self):
        self.context.grant_permissions(['clipboard-read','clipboard-write'])
        self.pdf()
        self.page.wait_for_selector('.text-layer span')
        self.page.evaluate("""() => {const span=document.querySelector('.text-layer span');const range=document.createRange();range.selectNodeContents(span);getSelection().removeAllRanges();getSelection().addRange(range);}""")
        self.page.locator('.notes-selection').wait_for(state='visible')
        self.page.locator('.notes-selection button').first.click()
        self.assertIn('alpha',self.page.evaluate('navigator.clipboard.readText()'))
        self.page.locator('.notes-selection button').nth(1).click();self.saved_count(1)
        self.assertEqual(self.page.locator('.user-notes polygon').count(),1)
        self.page.locator('#notesToggle').click();self.page.locator('[data-note-tool=note]').click()
        self.page.locator('.continuous-page:first-child .user-notes>svg').click(position={'x':130,'y':200})
        self.page.locator('.note-editor textarea').fill('Формула: E = mc²')
        self.page.get_by_role('button',name='Сохранить',exact=True).click();self.saved_count(2)
        self.page.locator('#notesToggle').click()
        self.page.locator('.note-pin').click()
        self.page.locator('.note-editor textarea').fill('Изменённая заметка')
        self.page.get_by_role('button',name='Сохранить',exact=True).click()
        self.page.wait_for_function("async()=>(await NSUAnnotations.backup()).objects.some(a=>a.text==='Изменённая заметка')")
        self.page.reload();self.page.locator('.note-pin').wait_for()
        self.page.locator('.note-pin').click()
        self.assertEqual(self.page.locator('.note-editor textarea').input_value(),'Изменённая заметка')

    def test_notes_failed_write_is_visible_and_retry_preserves_action(self):
        self.pdf();self.page.locator('#notesToggle').click()
        self.page.evaluate("() => {window.savedWriter=NSUAnnotations.save;NSUAnnotations.save=()=>Promise.reject(new DOMException('full','QuotaExceededError'));}")
        self.draw()
        self.page.wait_for_function("document.querySelector('.notes-status').textContent.includes('Не сохранено')")
        self.assertEqual(self.page.locator('.user-notes path').count(),1)
        self.assertEqual(self.page.evaluate('(async()=> (await NSUAnnotations.backup()).objects.length)()'),0)
        self.page.evaluate('() => {NSUAnnotations.save=savedWriter;}')
        self.page.locator('.notes-status button').click();self.saved_count(1)

    def test_notes_backup_validation_merge_and_version_recovery(self):
        self.pdf('&v=old');self.page.locator('#notesToggle').click();self.draw();self.saved_count(1)
        backup=self.page.evaluate('NSUAnnotations.backup()')
        self.page.evaluate('NSUAnnotations.clear()');self.saved_count(0)
        self.page.evaluate('data=>NSUAnnotations.import(data)',backup);self.saved_count(1)
        invalid=json.loads(json.dumps(backup));invalid['objects'][0]['points']=[['bad',1]]
        self.assertTrue(self.page.evaluate("async data=>{try{await NSUAnnotations.import(data);return false;}catch{return true;}}",invalid))
        self.saved_count(1)
        if not fixtures.REAL_PDFJS:
            self.pdf('&v=new')
            self.page.locator('.notes-recovery summary').click()
            self.assertEqual(self.page.locator('.continuous-page:first-child .user-notes path').count(),0)
            self.page.once('dialog',lambda d:d.accept())
            self.page.get_by_role('button',name='Восстановить в текущем PDF').click()
            self.saved_count(2)
            self.assertEqual(self.page.locator('.continuous-page:first-child .user-notes path').count(),1)

    def test_notes_settings_backup_ui_and_responsive_layout(self):
        self.pdf();self.page.locator('#notesToggle').click();self.draw();self.saved_count(1)
        self.home()
        for width in [320,390,768,1440]:
            self.page.set_viewport_size({'width':width,'height':900})
            settings=self.page.locator('#appSettings').bounding_box()
            search=self.page.locator('#globalSearch').bounding_box()
            self.assertGreaterEqual(settings['x'],search['x']+search['width'])
            self.assertLessEqual(settings['x']+settings['width'],width)
        self.page.locator('#appSettings').click()
        with self.page.expect_download() as download:
            self.page.get_by_role('button',name='Экспорт резервной копии',exact=True).click()
        backup=Path(download.value.path()).read_text(encoding='utf-8')
        self.assertEqual(len(json.loads(backup)['objects']),1)
        self.page.once('dialog',lambda d:d.accept())
        self.page.get_by_role('button',name='Удалить все аннотации',exact=True).click();self.saved_count(0)
        self.page.once('dialog',lambda d:d.accept())
        self.page.locator('input[type=file]').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':backup.encode()})
        self.saved_count(1)
        self.page.get_by_role('button',name='Мои заметки',exact=True).click()
        self.page.locator('.app-downloads a').first.wait_for()
        self.assertIn('page=1',self.page.locator('.app-downloads a').first.get_attribute('href'))

    def test_mobile_notes_rotation_and_two_finger_cancel(self):
        self.page.set_viewport_size({'width':390,'height':844});self.pdf()
        self.page.locator('#notesToggle').click()
        self.page.wait_for_selector('.continuous-page .user-notes svg')
        self.page.evaluate("""() => {const el=document.querySelector('.continuous-page .user-notes svg');
          el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:21,pointerType:'touch',clientX:60,clientY:180,bubbles:true,button:0}));
          el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:22,pointerType:'touch',clientX:180,clientY:180,bubbles:true,button:0}));
          el.dispatchEvent(new PointerEvent('pointerup',{pointerId:21,pointerType:'touch',bubbles:true}));
          el.dispatchEvent(new PointerEvent('pointerup',{pointerId:22,pointerType:'touch',bubbles:true}));}""")
        self.saved_count(0)
        # A completed touch stroke must survive orientation and fit-width changes.
        self.page.evaluate("""() => {const el=document.querySelector('.continuous-page .user-notes svg'),r=el.getBoundingClientRect();
          const send=(type,x,y)=>el.dispatchEvent(new PointerEvent(type,{pointerId:31,pointerType:'touch',clientX:r.left+x,clientY:r.top+y,bubbles:true,button:0,pressure:.6}));
          send('pointerdown',60,100);send('pointermove',120,130);send('pointerup',120,130);}""")
        self.saved_count(1)
        points=self.page.evaluate('(async()=>(await NSUAnnotations.backup()).objects[0].points)()')
        for width,height in [(320,800),(390,844),(844,390),(768,1024),(1440,900)]:
            self.page.set_viewport_size({'width':width,'height':height})
            tools=self.page.locator('.notes-tools').bounding_box()
            self.assertGreaterEqual(tools['x'],0)
            self.assertLessEqual(tools['x']+tools['width'],width)
        self.assertEqual(self.page.evaluate('(async()=>(await NSUAnnotations.backup()).objects[0].points)()'),points)
        self.page.reload()
        self.page.locator('.user-notes path').wait_for()

    def test_mobile_tablet_layout_and_fullscreen_reader(self):
        self.page.set_viewport_size({'width':1024,'height':1366});self.home()
        self.assertTrue(self.page.evaluate('isPhoneLayout()'))
        self.assertTrue(self.page.locator('#menuBtn').is_visible())
        self.assertLessEqual(self.page.locator('.sidebar').bounding_box()['x']+self.page.locator('.sidebar').bounding_box()['width'],1)
        self.page.locator('#menuBtn').click()
        self.page.wait_for_function("document.querySelector('.sidebar').getBoundingClientRect().left>=0")
        self.page.locator('#overlay').click(position={'x':800,'y':100})
        self.page.evaluate('openPdfFullscreen(viewerUrl(FILES[0]))')
        frame=self.page.frame_locator('#pdfFullscreenFrame')
        frame.locator('.continuous-page .user-notes svg').first.wait_for()
        for width,height in [(1024,1366),(1366,1024),(820,1180)]:
            self.page.set_viewport_size({'width':width,'height':height})
            self.assertTrue(frame.locator('body').evaluate("el=>el.classList.contains('compact-view')&&el.classList.contains('continuous-mode')"))
        frame.locator('#notesToggle').click()
        for button in frame.locator('.notes-tool-group button').all():
            self.assertGreaterEqual(button.bounding_box()['width'],44)
        output=fixtures.ROOT/'build/tablet-reader';output.mkdir(parents=True,exist_ok=True)
        self.page.screenshot(path=str(output/'tablet-notes.png'))

    def test_mobile_tablet_notebook_uses_touch_outline(self):
        self.page.set_viewport_size({'width':1366,'height':1024})
        self.page.goto(self.base+'notebook/viewer.html?'+urlencode({'file':self.nb}))
        self.page.locator('#tocLinks a').first.wait_for(state='attached')
        self.page.locator('#tocToggle').click()
        self.page.locator('#tocClose').wait_for()
        outline=self.page.locator('#notebookOutline').bounding_box()
        self.assertGreaterEqual(outline['x'],0);self.assertLessEqual(outline['x']+outline['width'],1366)
        self.page.locator('#tocLinks a').first.click()
        self.page.wait_for_function("!document.body.classList.contains('toc-open')")

    def test_continuous_stroke_crosses_pages_and_keeps_saved_dom(self):
        self.page.set_viewport_size({'width':1440,'height':1000});self.pdf()
        self.page.locator('#zoom').fill('35');self.page.locator('#zoom').blur()
        self.page.wait_for_function("document.querySelectorAll('.continuous-page .user-notes svg').length===2&&document.querySelector('.continuous-page').offsetHeight<450")
        self.page.locator('#notesToggle').click()
        first=self.page.locator('.continuous-page[data-page="1"] .user-notes svg')
        second=self.page.locator('.continuous-page[data-page="2"] .user-notes svg')
        a,b=first.bounding_box(),second.bounding_box()
        x=a['x']+90;y=a['y']+60
        self.page.mouse.move(x,y);self.page.mouse.down();self.page.mouse.move(x+60,y+10,steps=10);self.page.mouse.up();self.saved_count(1)
        self.page.evaluate("window.savedStroke=document.querySelector('.continuous-page .user-notes g path')")
        self.page.mouse.move(x,a['y']+a['height']-45);self.page.mouse.down()
        self.page.mouse.move(x+10,a['y']+a['height']-10,steps=6)
        self.page.evaluate('notes.reload()')
        self.assertTrue(self.page.evaluate("savedStroke===document.querySelector('.continuous-page .user-notes g path')"))
        self.page.evaluate("renderContinuousPage(document.querySelector('.continuous-page'),1,true)")
        self.assertTrue(self.page.evaluate("savedStroke===document.querySelector('.continuous-page .user-notes g path')"))
        self.page.mouse.move(x+20,b['y']+50,steps=15);self.page.mouse.up();self.saved_count(3)
        self.assertEqual(sorted(self.page.evaluate('(async()=>(await NSUAnnotations.backup()).objects.map(a=>a.page))()')),[1,1,2])
        self.page.locator('#noteUndo').click();self.saved_count(1)
        self.page.locator('#noteRedo').click();self.saved_count(3)
        self.page.reload();self.page.locator('#notesToggle').wait_for()
        self.page.wait_for_function("document.querySelectorAll('.continuous-page .user-notes g:not(.notes-draft) path').length>=2")

    def test_mobile_two_finger_pan_while_drawing(self):
        self.page.set_viewport_size({'width':820,'height':1180});self.pdf()
        self.page.locator('#notesToggle').click()
        self.page.locator('.continuous-page .user-notes svg').first.wait_for()
        client=self.context.new_cdp_session(self.page)
        def touch(kind,y):
            client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[] if kind=='touchEnd' else [{'x':160,'y':y,'id':1},{'x':340,'y':y,'id':2}]})
        before=self.page.locator('#viewer').evaluate('el=>el.scrollTop')
        touch('touchStart',600)
        for y in [570,540,510,480,450]:touch('touchMove',y)
        touch('touchEnd',450)
        self.page.wait_for_function('before=>document.querySelector("#viewer").scrollTop>before+100',arg=before)
        self.saved_count(0)
        old_zoom=int(self.page.locator('#zoom').input_value())
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':200,'y':500,'id':1},{'x':400,'y':500,'id':2}]})
        client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':160,'y':480,'id':1},{'x':440,'y':480,'id':2}]})
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        self.assertGreater(int(self.page.locator('#zoom').input_value()),old_zoom+20);self.saved_count(0)
        self.page.wait_for_function("[...document.querySelectorAll('.continuous-page')].some(el=>el.dataset.stale==='0'&&el.getBoundingClientRect().top<400&&el.getBoundingClientRect().bottom>550)")
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':300,'y':500,'id':1}]})
        for i in range(1,9):client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':300+i*8,'y':500+i*2,'id':1}]})
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        self.saved_count(1)

    def test_eraser_drag_is_one_undo_action(self):
        self.pdf();self.page.locator('#notesToggle').click();self.draw();self.draw(60);self.saved_count(2)
        box=self.page.locator('.continuous-page:first-child .user-notes svg').bounding_box()
        self.page.locator('[data-note-tool=eraser]').click()
        x=box['x']+110;y=box['y']+106
        self.page.mouse.move(x,y);self.page.mouse.down();self.page.mouse.move(x,y+60,steps=10);self.page.mouse.up()
        self.saved_count(0);self.page.locator('#noteUndo').click();self.saved_count(2)

    def test_mobile_stylus_pressure_palm_and_finger_scroll(self):
        self.page.set_viewport_size({'width':820,'height':1180});self.pdf();self.page.locator('#notesToggle').click()
        self.page.locator('.continuous-page .user-notes svg').first.wait_for()
        self.page.evaluate("""() => {const el=document.querySelector('.continuous-page .user-notes svg'),r=el.getBoundingClientRect();
          const send=(type,id,pointerType,x,y,pressure)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType,clientX:r.left+x,clientY:r.top+y,pressure,bubbles:true,button:0}));
          send('pointerdown',51,'pen',100,140,.1);send('pointermove',51,'pen',140,145,.3);
          send('pointerdown',52,'touch',180,220,.5);send('pointermove',51,'pen',200,155,.9);
          send('pointerup',52,'touch',180,220,.5);send('pointerup',51,'pen',220,160,.8);}""")
        self.saved_count(1)
        data=self.page.evaluate('(async()=>(await NSUAnnotations.backup()).objects[0])()')
        self.assertGreater(max(p[2] for p in data['points'])-min(p[2] for p in data['points']),.5)
        self.assertEqual(data['brushVersion'],2)
        self.page.locator('.notes-options summary').click()
        self.assertFalse(self.page.locator('#noteFinger').is_checked())
        self.page.locator('.notes-options summary').click()
        before=self.page.locator('#viewer').evaluate('el=>el.scrollTop')
        self.page.wait_for_timeout(200) # Let the post-Pencil palm rejection window expire.
        self.page.evaluate("""() => {const el=document.querySelector('.continuous-page .user-notes svg'),r=el.getBoundingClientRect();
          for(const [type,y] of [['pointerdown',300],['pointermove',220],['pointerup',220]])el.dispatchEvent(new PointerEvent(type,{pointerId:61,pointerType:'touch',clientX:r.left+120,clientY:r.top+y,bubbles:true,button:0}));}""")
        self.assertGreater(self.page.locator('#viewer').evaluate('el=>el.scrollTop'),before+50);self.saved_count(1)

    def test_mobile_pencil_capture_loss_endpoint_and_resting_finger(self):
        self.page.set_viewport_size({'width':820,'height':1180});self.pdf();self.page.locator('#notesToggle').click()
        self.page.locator('.continuous-page .user-notes svg').first.wait_for()
        result=self.page.evaluate("""() => {
          const el=document.querySelector('.continuous-page .user-notes svg'),r=el.getBoundingClientRect();
          const send=(target,type,id,pointerType,x,y,pressure,extra={})=>{
            const event=new PointerEvent(type,{pointerId:id,pointerType,clientX:r.left+x,clientY:r.top+y,pressure,bubbles:true,button:0,cancelable:true});
            Object.assign(event,extra);target.dispatchEvent(event);
          };
          notes.fingerDrawing=false;
          send(el,'pointerdown',101,'touch',140,240,.5);
          const before=document.querySelector('#viewer').scrollTop;
          send(el,'pointerdown',102,'pen',100,140,.2);
          send(el,'pointermove',101,'touch',140,180,.5);
          send(el,'lostpointercapture',102,'pen',100,140,.2);
          const stillWriting=!!notes.draft;
          send(window,'pointermove',102,'pen',200,180,.8,{getCoalescedEvents:()=>[{clientX:r.left+150,clientY:r.top+160,pressure:.4}]});
          send(window,'pointerup',102,'pen',240,200,0);
          send(el,'pointerup',101,'touch',140,180,.5);
          const object=[...notes.items.values()][0],last=object.points.at(-1);
          const expected=[...notes.layers][0].viewport.convertToPdfPoint(240,200);
          return {stillWriting,scrollDelta:document.querySelector('#viewer').scrollTop-before,last,expected,points:object.points.length};
        }""")
        self.saved_count(1)
        self.assertTrue(result['stillWriting']);self.assertEqual(result['scrollDelta'],0)
        self.assertEqual(result['points'],4)
        self.assertAlmostEqual(result['last'][0],result['expected'][0],delta=.01)
        self.assertAlmostEqual(result['last'][1],result['expected'][1],delta=.01)
        self.assertAlmostEqual(result['last'][2],.8,places=4)
        # A browser cancellation saves the received ink rather than dropping a word.
        self.page.evaluate("""() => {const el=document.querySelector('.continuous-page .user-notes svg'),r=el.getBoundingClientRect();
          for(const [type,x] of [['pointerdown',100],['pointermove',180],['pointercancel',180]])el.dispatchEvent(new PointerEvent(type,{pointerId:103,pointerType:'pen',clientX:r.left+x,clientY:r.top+240,pressure:.5,bubbles:true,button:0}));}""")
        self.saved_count(2)

    def test_mobile_safari_pencil_touch_fallback_and_no_duplicate_ink(self):
        self.page.set_viewport_size({'width':820,'height':1180});self.pdf();self.page.locator('#notesToggle').click()
        self.page.locator('.continuous-page .user-notes svg').first.wait_for()
        self.page.evaluate("""() => {
          const el=document.querySelector('.continuous-page .user-notes svg'),r=el.getBoundingClientRect();
          const touch=(type,x,force)=>{
            const t={identifier:7,touchType:'stylus',clientX:r.left+x,clientY:r.top+180,force};
            const event=new Event(type,{bubbles:true,cancelable:true});
            Object.defineProperties(event,{changedTouches:{value:[t]},touches:{value:type==='touchend'?[]:[t]}});el.dispatchEvent(event);
          };
          touch('touchstart',100,.2);touch('touchmove',140,.5);touch('touchmove',190,.9);touch('touchend',220,0);
          window.sendPencilTouch=touch;
        }""")
        self.saved_count(1)
        self.assertFalse(self.page.evaluate('notes.fingerDrawing'))
        data=self.page.evaluate('(async()=>(await NSUAnnotations.backup()).objects[0])()')
        self.assertEqual(len(data['points']),4);self.assertAlmostEqual(data['points'][-1][2],.9,places=4)
        self.page.evaluate("""() => {
          const el=document.querySelector('.continuous-page .user-notes svg'),r=el.getBoundingClientRect();
          const send=(type,x)=>el.dispatchEvent(new PointerEvent(type,{pointerId:8,pointerType:'pen',clientX:r.left+x,clientY:r.top+180,pressure:.6,bubbles:true,button:0}));
          send('pointerdown',280);sendPencilTouch('touchstart',280,.6);
          send('pointermove',340);sendPencilTouch('touchmove',340,.6);
          send('pointerup',380);sendPencilTouch('touchend',380,0);
        }""")
        self.saved_count(2)
        self.page.reload();self.page.locator('.continuous-page .user-notes g:not(.notes-draft) path').first.wait_for()
        self.saved_count(2)

    def test_mobile_tablet_chrome_hides_without_moving_document(self):
        self.page.set_viewport_size({'width':820,'height':1180});self.pdf()
        self.page.locator('.continuous-page .user-notes svg').first.wait_for()
        self.assertLessEqual(self.page.locator('.toolbar').bounding_box()['height'],48)
        self.assertGreaterEqual(self.page.locator('.continuous-page').first.bounding_box()['y'],self.page.locator('.toolbar').bounding_box()['height']-1)
        self.assertLess(self.page.locator('.mobile-nav').bounding_box()['width'],100)
        surface=self.page.locator('#viewer').bounding_box()
        self.page.wait_for_timeout(1100)
        self.page.locator('#viewer').evaluate('el=>el.scrollTop=140')
        self.page.wait_for_function("document.body.classList.contains('reader-chrome-hidden')")
        self.assertEqual(surface,self.page.locator('#viewer').bounding_box())
        self.page.get_by_role('button',name='Показать панели PDF').click()
        self.assertFalse(self.page.evaluate("document.body.classList.contains('reader-chrome-hidden')"))
        self.page.locator('#notesToggle').click();self.page.wait_for_timeout(900)
        self.page.locator('#viewer').evaluate('el=>el.scrollTop=280')
        self.page.wait_for_function("document.body.classList.contains('reader-chrome-hidden')")
        self.assertTrue(self.page.evaluate('notes.enabled'))
        self.assertFalse(self.page.locator('.notes-tools').is_visible())
        self.page.locator('#viewer').evaluate('el=>el.scrollTop=220')
        self.page.wait_for_function("!document.body.classList.contains('reader-chrome-hidden')")
        self.assertTrue(self.page.locator('.notes-tools').is_visible())
        self.assertEqual(surface,self.page.locator('#viewer').bounding_box())
        self.page.locator('.notes-options summary').click();self.page.wait_for_timeout(900)
        self.page.locator('#viewer').evaluate('el=>el.scrollTop=340')
        self.page.wait_for_timeout(200)
        self.assertFalse(self.page.evaluate("document.body.classList.contains('reader-chrome-hidden')"))

    @unittest.skipUnless(fixtures.REAL_PDFJS,'Actual TextLayer geometry requires NSU_REAL_PDFJS=1')
    def test_real_textlayer_multiline_cyrillic_and_rotated_page(self):
        import pymupdf
        fonts=[Path('C:/Windows/Fonts/arial.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
        font=next((p for p in fonts if p.exists()),None)
        if not font:self.skipTest('No Cyrillic test font installed')
        path='text-geometry.pdf'
        with pymupdf.open() as doc:
            for width,height,rotation in [(595,842,0),(842,595,90)]:
                page=doc.new_page(width=width,height=height)
                page.insert_text((72,90),'Кириллица and Latin',fontname='testfont',fontfile=str(font),fontsize=24)
                page.insert_text((72,130),'Second line: alpha beta',fontname='testfont',fontfile=str(font),fontsize=14)
                page.insert_text((72,170),'E = mc',fontsize=20)
                page.insert_text((134,160),'2',fontsize=10)
                page.set_rotation(rotation)
            doc.save(self.root/path)
        self.context.grant_permissions(['clipboard-read','clipboard-write'])
        self.page.goto(self.base+'pdfjs/viewer.html?'+urlencode({'file':path}))
        self.page.wait_for_function("document.querySelector('.continuous-page:first-child .text-layer')?.textContent.includes('Кириллица')")
        for zoom in [35,250,400]:
            self.page.locator('#zoom').fill(str(zoom));self.page.locator('#zoom').blur()
            self.page.wait_for_function("z=>{const t=document.querySelector('.continuous-page:first-child .text-layer');return Math.abs(parseFloat(t?.style.getPropertyValue('--scale-factor'))-z/100*96/72)<1e-8&&t.textContent.includes('Кириллица')}",arg=zoom)
            geometry=self.page.evaluate("""() => {const span=[...document.querySelectorAll('.continuous-page:first-child .text-layer span')].find(s=>s.textContent.includes('Кириллица'));
              const r=span.getBoundingClientRect(),p=document.querySelector('.continuous-page:first-child').getBoundingClientRect();
              return {left:r.left-p.left,top:r.top-p.top,scale:parseFloat(document.querySelector('.continuous-page:first-child .text-layer').style.getPropertyValue('--scale-factor'))};}""")
            self.assertAlmostEqual(geometry['left'],72*geometry['scale'],delta=1)
            self.assertLess(abs(geometry['top']-(90-24)*geometry['scale']),7*geometry['scale'])
        self.page.evaluate("""() => {const spans=[...document.querySelectorAll('.continuous-page:first-child .text-layer span')];const r=document.createRange();
          r.setStart(spans[0].firstChild,0);r.setEnd(spans[1].firstChild,spans[1].textContent.length);getSelection().removeAllRanges();getSelection().addRange(r);}""")
        self.page.locator('.notes-selection button').first.click()
        copied=self.page.evaluate('navigator.clipboard.readText()')
        self.assertIn('Кириллица and Latin',copied);self.assertIn('Second line: alpha beta',copied)
        self.page.locator('.notes-selection button').nth(1).click();self.saved_count(1)
        self.assertGreaterEqual(self.page.locator('.user-notes polygon').count(),2)
        self.page.locator('#page').fill('2');self.page.locator('#page').blur()
        self.page.wait_for_function("document.querySelector('.continuous-page:nth-child(2) .text-layer')?.dataset.mainRotation==='90'")
        self.assertIn('Кириллица',self.page.locator('.continuous-page:nth-child(2) .text-layer').text_content())

    @unittest.skipIf(fixtures.REAL_PDFJS,'Large-document virtualization uses a deterministic 200-page fixture')
    def test_notes_virtualization_keeps_only_nearby_canvases(self):
        stub=fixtures.PDF_STUB.replace('numPages:2,','numPages:200,').replace('n>2)','n>200)')
        self.context.route('**/vendor/pdfjs-*/pdf.min.mjs',
            lambda route:route.fulfill(body=stub,content_type='text/javascript',headers={'Access-Control-Allow-Origin':'*'}))
        self.page.goto(self.base+'pdfjs/viewer.html?'+urlencode({'file':self.a}))
        self.page.wait_for_function("document.querySelector('#total').textContent==='/ 200'")
        self.page.locator('#notesToggle').click();self.draw();self.saved_count(1)
        self.page.locator('#notesToggle').click()
        self.page.wait_for_function("document.querySelector('.continuous-page .user-notes path')")
        self.page.locator('#page').fill('150');self.page.locator('#page').dispatch_event('change')
        self.page.wait_for_function("document.querySelector('.continuous-page[data-page=\"150\"] canvas')")
        self.page.wait_for_function("document.querySelectorAll('.continuous-page canvas').length<=6")
        self.page.locator('#page').fill('1');self.page.locator('#page').dispatch_event('change')
        self.page.wait_for_function("document.querySelector('.continuous-page[data-page=\"1\"] .user-notes path')")
        self.saved_count(1)

    def test_notes_fullscreen_iframe_close_and_reopen(self):
        self.home()
        self.page.evaluate('openPdfFullscreen(viewerUrl(FILES[0]))')
        frame=self.page.frame_locator('#pdfFullscreenFrame')
        frame.locator('#notesToggle').click()
        box=frame.locator('.continuous-page:first-child .user-notes svg').bounding_box()
        self.page.mouse.move(box['x']+100,box['y']+140);self.page.mouse.down()
        self.page.mouse.move(box['x']+200,box['y']+170,steps=10);self.page.mouse.up()
        self.saved_count(1)
        frame.locator('#back').click()
        self.page.wait_for_function("!document.querySelector('#pdfFullscreen').classList.contains('open')")
        self.page.evaluate('openPdfFullscreen(viewerUrl(FILES[0]))')
        frame.locator('.continuous-page:first-child .user-notes path').wait_for()
        self.saved_count(1)

    def test_pwa_notes_survive_library_clear_and_shell_update(self):
        import re,time
        self.pwa_ready();self.pdf();self.page.locator('#notesToggle').click();self.draw();self.saved_count(1)
        self.page.evaluate("args=>NSUApp.request('SAVE_MATERIAL',args)",{'url':self.base+'../'+quote(self.a),'viewer':self.page.url,'title':'Saved'})
        self.page.evaluate("NSUApp.request('CLEAR_MATERIALS')");self.saved_count(1)
        self.assertEqual(self.page.evaluate("NSUApp.request('LIST_MATERIALS')"),[])
        worker=self.root/'docs/sw.js';original=worker.read_text(encoding='utf-8')
        try:
            worker.write_text(re.sub(r"SHELL_VERSION = '[^']+'","SHELL_VERSION = 'notes-update'",original),encoding='utf-8')
            import os;os.utime(worker,(time.time()+2,time.time()+2))
            self.page.evaluate('async()=>{const r=await NSUApp.ready;await r.update()}')
            self.page.wait_for_function("async()=>(await caches.keys()).some(n=>n.endsWith('shell-notes-update'))")
            self.page.reload();self.page.locator('.continuous-page:first-child .user-notes path').wait_for();self.saved_count(1)
        finally:worker.write_text(original,encoding='utf-8')

    def test_pwa_bulk_library_pause_resume_versions_and_notebook(self):
        catalogue=self.root/'docs/search-index/files.json';original=catalogue.read_text(encoding='utf-8')
        data=json.loads(original);data['files'].append({'path':self.nb,'type':'ipynb','version':'nb1','size':1000})
        catalogue.write_text(json.dumps(data),encoding='utf-8')
        try:
            self.page.goto(self.base)
            self.page.wait_for_function('FILES.length===3')
            self.page.evaluate('NSUApp.ready.then(()=>true)')
            self.page.wait_for_function('!!navigator.serviceWorker.controller')
            self.page.on('dialog',lambda d:d.accept())
            self.page.locator('#appSettings').click()
            self.delayed_paths['/'+quote(self.a)]=.8
            self.page.get_by_role('button',name='Сохранить все материалы',exact=True).click()
            self.page.wait_for_function("document.querySelector('#appDialog .app-manager-progress').hidden===false")
            self.page.get_by_role('button',name='Остановить загрузку',exact=True).click()
            self.page.wait_for_function("document.querySelector('#appDialog').textContent.includes('Загрузка не завершена.')")
            self.assertLess(len(self.page.evaluate("NSUApp.request('LIST_MATERIALS')")),3)
            self.page.get_by_role('button',name='Продолжить / повторить',exact=True).click()
            self.page.wait_for_function("document.querySelector('#appDialog').textContent.includes('Библиотека сохранена.')")
            files=self.page.evaluate("NSUApp.request('LIST_MATERIALS')")
            self.assertEqual(len(files),3)
            pdf_requests=len([p for method,p in self.requests if p.endswith('.pdf')])
            self.page.get_by_role('button',name='Продолжить / повторить',exact=True).click()
            self.page.wait_for_function("document.querySelector('#appDialog').textContent.includes('Библиотека сохранена.')")
            self.assertEqual(pdf_requests,len([p for method,p in self.requests if p.endswith('.pdf')]))
            data['files'][1]['version']='updated-pdf'
            catalogue.write_text(json.dumps(data),encoding='utf-8')
            self.page.get_by_role('button',name='Продолжить / повторить',exact=True).click()
            self.page.wait_for_function("document.querySelector('#appDialog').textContent.includes('Библиотека сохранена.')")
            self.assertEqual(pdf_requests+1,len([p for method,p in self.requests if p.endswith('.pdf')]))
            files=self.page.evaluate("NSUApp.request('LIST_MATERIALS')")
            self.assertEqual(len(files),3)
            self.context.set_offline(True)
            for file in files:
                result=self.page.evaluate('async url=>{const r=await fetch(url);return {ok:r.ok,size:(await r.arrayBuffer()).byteLength}}',file['url'])
                self.assertTrue(result['ok']);self.assertGreater(result['size'],0)
            self.context.set_offline(False)
            notebook=next(file for file in files if '.ipynb' in file['url'])
            # An ordinary earlier visit must not leave a second cached copy after deletion.
            self.page.evaluate("async file=>{const cache=await caches.open((await caches.keys()).find(n=>n.endsWith('data-v1')));await cache.put(file.url,new Response('old notebook'));}",notebook)
            self.page.evaluate("file=>NSUApp.request('REMOVE_MATERIAL',{url:file.url})",notebook)
            self.assertEqual(len(self.page.evaluate("NSUApp.request('LIST_MATERIALS')")),2)
            self.assertFalse(self.page.evaluate("async file=>(await caches.match(file.url))!==undefined",notebook))
        finally:catalogue.write_text(original,encoding='utf-8')


if __name__=='__main__':unittest.main()
