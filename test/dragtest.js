const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
const path = require('path');
const A = f => path.join(__dirname, 'assets', f);
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

// Playwright's mouse cannot drive HTML5 drag-and-drop, so fire the real events
// with a shared DataTransfer the way the browser would.
async function dragRow(p, list, fromIdx, toIdx) {
  await p.evaluate(([sel, a, z]) => {
    const rows = document.querySelectorAll(sel + ' .mrow');
    const src = rows[a], dst = rows[z];
    const dt = new DataTransfer();
    const fire = (el, type) => {
      const ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
      el.dispatchEvent(ev);
    };
    fire(src.querySelector('.hnd') || src, 'dragstart');
    fire(dst, 'dragover');
    fire(dst, 'drop');
    fire(src, 'dragend');
  }, [list, fromIdx, toIdx]);
  await p.waitForTimeout(350);
}

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__w')) {
        sessionStorage.setItem('__w','1'); localStorage.clear();
        indexedDB.deleteDatabase('bies-event-media');
      }
    } catch(_){}
  });
  await p.goto(APP); await p.waitForTimeout(900);
  await p.click('.tab[data-tab="music"]'); await p.waitForTimeout(300);

  console.log('\n— the queue has handles —');
  await p.fill('#ytpaste', ['aaaaaaaaaaa','bbbbbbbbbbb','ccccccccccc','ddddddddddd'].join('\n'));
  await p.click('#ytadd'); await p.waitForTimeout(2500);
  ok('four queued', await p.locator('#ytlist .mrow').count() === 4);
  ok('every row has a grab handle', await p.locator('#ytlist .mrow .hnd').count() === 4);
  ok('and is draggable',
     await p.locator('#ytlist .mrow').first().getAttribute('draggable') === 'true');

  const ids = () => p.evaluate(() => cfg.music.map(m => m.vid).join(','));
  ok('starting order', await ids() === 'aaaaaaaaaaa,bbbbbbbbbbb,ccccccccccc,ddddddddddd', await ids());

  console.log('\n— drag the last track to the top —');
  await dragRow(p, '#ytlist', 3, 0);
  ok('it landed first', await ids() === 'ddddddddddd,aaaaaaaaaaa,bbbbbbbbbbb,ccccccccccc', await ids());
  ok('numbering redrew', (await p.locator('#ytlist .tag').first().textContent()).trim() === '1');

  console.log('\n— and one from the top into the middle —');
  await dragRow(p, '#ytlist', 0, 2);
  ok('dropped where it was aimed', await ids() === 'aaaaaaaaaaa,bbbbbbbbbbb,ddddddddddd,ccccccccccc', await ids());

  console.log('\n— dropping a row on itself changes nothing —');
  const same = await ids();
  await dragRow(p, '#ytlist', 1, 1);
  ok('order untouched', await ids() === same);

  console.log('\n— it survives a refresh —');
  await p.reload(); await p.waitForTimeout(1200);
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  await p.click('.tab[data-tab="music"]'); await p.waitForTimeout(300);
  ok('order saved', await ids() === 'aaaaaaaaaaa,bbbbbbbbbbb,ddddddddddd,ccccccccccc', await ids());

  console.log('\n— the audio playlist drags too —');
  await p.setInputFiles('#f-audio', [A('tone.wav'), A('tone2.wav'), A('tone3.wav')]);
  await p.waitForTimeout(1200);
  const anames = () => p.evaluate(() => cfg.audio.map(a => a.name).join(','));
  const a0 = await anames();
  await dragRow(p, '#aulist', 2, 0);
  const a1 = await anames();
  ok('audio reordered', a1 !== a0 && a1.split(',')[0] === a0.split(',')[2], [a0, a1]);
  ok('handles there too', await p.locator('#aulist .mrow .hnd').count() === 3);

  console.log('\n— so does the media reel —');
  await p.click('.tab[data-tab="media"]'); await p.waitForTimeout(300);
  await p.setInputFiles('#f-mediaimg', [A('slide-1.png'), A('slide-2.png'), A('slide-3.png')]);
  await p.waitForTimeout(1200);
  const mnames = () => p.evaluate(() => cfg.media.map(m => m.name).join(','));
  const m0 = await mnames();
  await dragRow(p, '#medialist', 0, 2);
  const m1 = await mnames();
  ok('media reordered', m1 !== m0 && m1.split(',')[2] === m0.split(',')[0], [m0, m1]);

  console.log('\n— the arrows still work alongside it —');
  await p.locator('#medialist .mrow').nth(0).locator('.dn').click();
  await p.waitForTimeout(400);
  ok('arrow moved it one place', (await mnames()).split(',')[1] === m1.split(',')[0]);

  ok('no errors', errs.length === 0, errs.slice(0, 4));
  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
