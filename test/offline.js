const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } });
  // the venue wifi is down. Real offline emulation, not a route filter — a
  // filter still lets Chrome answer from its own cache, which is how the first
  // version of this test managed to pass while proving nothing.
  await ctx.setOffline(true);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.addInitScript(() => {
    try { localStorage.clear(); indexedDB.deleteDatabase('bies-event-media'); } catch (_) {}
  });
  await p.goto(APP); await p.waitForTimeout(900);
  await p.click('.tab[data-tab="music"]'); await p.waitForTimeout(300);

  const t0 = Date.now();
  // ids this browser profile has never asked about, so nothing can be cached
  await p.fill('#ytpaste', 'https://www.youtube.com/watch?v=OPf0YbXqDm0\nhttps://youtu.be/JGwWNGJdvx8');
  await p.click('#ytadd');
  await p.waitForTimeout(9000);
  console.log('\n— wifi down —');
  ok('the tracks still queue', await p.locator('#ytlist .mrow').count() === 2);
  ok('nothing threw', errs.length === 0, errs.slice(0, 3));
  ok('it gives up rather than hanging', Date.now() - t0 < 20000);
  ok('the button comes back', (await p.locator('#ytnames').textContent()).includes('Look up'));
  ok('the row falls back to the id',
     (await p.locator('#ytlist input[data-f="song"]').first().getAttribute('placeholder')) === 'OPf0YbXqDm0',
     await p.locator('#ytlist input[data-f="song"]').first().getAttribute('placeholder'));
  ok('and it says a connection is needed',
     (await p.locator('#ytnote').textContent()).includes('unnamed'),
     await p.locator('#ytnote').textContent());
  ok('the queue still opens in YouTube', !(await p.locator('#ytopen').isDisabled()));

  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
