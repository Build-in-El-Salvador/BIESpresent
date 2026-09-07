const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
const path = require('path');
const A = f => path.join(__dirname, 'assets', f);
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__w')) {
        sessionStorage.setItem('__w','1');
        localStorage.clear(); indexedDB.deleteDatabase('bies-event-media');
      }
    } catch(_){}
  });
  await p.goto(APP); await p.waitForTimeout(900);
  await p.click('.tab[data-tab="decks"]');
  await p.setInputFiles('#f-slides', [A('slide-1.png'), A('slide-2.png')]);
  await p.waitForTimeout(900);
  ok('deck shows a slide count', (await p.locator('#decklist .tag').first().textContent()).includes('slides'));

  // storage wiped out from under it, the way an eviction or a fresh laptop would
  // close the live connection first, or the delete is simply blocked
  await p.evaluate(() => db().then(d => { d.close(); dbp = null; }));
  await p.evaluate(() => new Promise(res => {
    const r = indexedDB.deleteDatabase('bies-event-media');
    r.onsuccess = r.onerror = r.onblocked = () => res();
  }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.keyboard.press('e'); await p.waitForTimeout(900);
  await p.click('.tab[data-tab="decks"]'); await p.waitForTimeout(600);
  const tag = (await p.locator('#decklist .tag').first().textContent()).trim();
  ok('it says the files are missing', tag === 'files missing', tag);
  ok('and flags it', await p.locator('#decklist .tag').first().evaluate(e => e.classList.contains('hot')));
  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
