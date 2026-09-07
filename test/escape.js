const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const APP = pathToFileURL(path.join(__dirname, '..', 'BIESpresent.html')).href;
const A = f => path.join(__dirname, 'assets', f);
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

async function withPdfOnAir(ctx) {
  const p = await ctx.newPage();
  await p.goto(APP); await p.waitForTimeout(1000);
  if (await p.locator('#setup').evaluate(e => !e.classList.contains('live')))
    { await p.keyboard.press('e'); await p.waitForTimeout(500); }
  await p.click('.tab[data-tab="decks"]');
  await p.setInputFiles('#f-deckpdf', [A('deck.pdf')]);
  await p.waitForTimeout(1100);
  await p.click('#dksend'); await p.waitForTimeout(800);
  await p.keyboard.press('Escape'); await p.waitForTimeout(1400);
  return p;
}

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('w')) { sessionStorage.setItem('w','1'); localStorage.clear(); indexedDB.deleteDatabase('bies-event-media'); } } catch(_){} });
  let p = await withPdfOnAir(ctx);

  console.log('\n— a PDF is on the wall —');
  ok('it is up', await p.locator('#airstage embed').count() === 1);
  ok('the way out is pinned open', await p.evaluate(() =>
     document.body.classList.contains('on-air')));
  ok('Take off air is showing', await p.locator('#offbtn').isVisible());
  ok('controls are not faded out', await p.evaluate(() =>
     getComputedStyle(document.querySelector('#controls')).opacity === '1'));

  console.log('\n— click straight into the PDF, the way anyone would —');
  await p.mouse.click(700, 430);
  await p.waitForTimeout(700);
  ok('focus did not stay in the plugin', await p.evaluate(() =>
     document.activeElement && document.activeElement.tagName) !== 'EMBED',
     await p.evaluate(() => document.activeElement && document.activeElement.tagName));

  await p.keyboard.press('b'); await p.waitForTimeout(500);
  ok('B still blacks the screen out', await p.evaluate(() => rt.blackout));
  await p.keyboard.press('b'); await p.waitForTimeout(400);

  await p.keyboard.press('e'); await p.waitForTimeout(700);
  ok('E still opens the editor', await p.locator('#setup').evaluate(e => e.classList.contains('live')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(600);

  console.log('\n— X takes it off air —');
  await p.mouse.click(700, 430); await p.waitForTimeout(500);
  await p.keyboard.press('x'); await p.waitForTimeout(800);
  ok('nothing on air', await p.evaluate(() => !rt.air));
  ok('the layer is gone', !(await p.locator('#airview').evaluate(e => e.classList.contains('live'))));
  ok('and the button hides again', !(await p.locator('#offbtn').isVisible()));

  console.log('\n— and the button works too —');
  await p.close();
  p = await withPdfOnAir(ctx);
  await p.mouse.click(700, 430); await p.waitForTimeout(400);
  await p.click('#offbtn'); await p.waitForTimeout(800);
  ok('Take off air clears it', await p.evaluate(() => !rt.air));

  console.log('\n— a refresh mid-talk keeps the deck up —');
  await p.close();
  p = await withPdfOnAir(ctx);
  await p.reload(); await p.waitForTimeout(1800);
  ok('still on air after reload', await p.evaluate(() => !!(rt.air && rt.air.key)));

  console.log('\n— but last night\'s state does not come back —');
  await p.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('bies-event-screen-live-v1'));
    l.at = Date.now() - 5 * 60 * 60 * 1000;         // five hours ago
    localStorage.setItem('bies-event-screen-live-v1', JSON.stringify(l));
  });
  await p.reload(); await p.waitForTimeout(1800);
  ok('board comes up clean', await p.evaluate(() => !rt.air));
  ok('no PDF on screen', await p.locator('#airstage embed').count() === 0);
  ok('and the controls behave normally again', !(await p.evaluate(() =>
     document.body.classList.contains('on-air'))));

  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
