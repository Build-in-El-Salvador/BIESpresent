const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const APP = pathToFileURL(path.join(__dirname, '..', 'BIESpresent.html')).href;
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(APP);
  await p.waitForTimeout(1500);

  console.log('\n— the board holds the screen awake —');
  ok('a lock was taken', await p.evaluate(() => wakeState) === 'held',
     await p.evaluate(() => wakeState));
  ok('and it is a screen lock', await p.evaluate(() => wakeLock && wakeLock.type) === 'screen');
  ok('not released', await p.evaluate(() => wakeLock && wakeLock.released === false));
  ok('no warning shown', (await p.locator('#wakewarn').textContent()).trim() === '');

  console.log('\n— stepping out to a PowerPoint and coming back —');
  // the browser drops the lock whenever the page is hidden; this is that
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setPageVisibilityState', { visibility: 'hidden' }).catch(() => {});
  await p.waitForTimeout(1200);
  const whileHidden = await p.evaluate(() => wakeLock && wakeLock.released !== false ? 'released' : (wakeLock ? 'held' : 'gone'));
  await cdp.send('Emulation.setPageVisibilityState', { visibility: 'visible' }).catch(() => {});
  await p.waitForTimeout(1500);
  ok('the lock is taken again on return', await p.evaluate(() => wakeState) === 'held' &&
     await p.evaluate(() => !!(wakeLock && wakeLock.released === false)),
     { whileHidden, after: await p.evaluate(() => wakeState) });

  console.log('\n— the audience window holds one too —');
  const aud = await ctx.newPage();
  await aud.goto(APP + '?view=audience');
  await aud.waitForTimeout(1500);
  ok('second screen keeps itself awake', await aud.evaluate(() => wakeState) === 'held',
     await aud.evaluate(() => wakeState));

  console.log('\n— and it says so when it cannot —');
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: () => Promise.reject(new DOMException('nope', 'NotAllowedError')) }
    });
  });
  await p2.bringToFront();          // a background tab never asks for the lock at all
  await p2.goto(APP);
  await p2.waitForTimeout(1500);
  if (await p2.locator('#setup').evaluate(e => !e.classList.contains('live')))
    { await p2.keyboard.press('e'); await p2.waitForTimeout(600); }
  ok('the refusal was noticed', /^refused/.test(await p2.evaluate(() => wakeState)),
     await p2.evaluate(() => wakeState));
  const warn = (await p2.locator('#wakewarn').textContent()).trim();
  ok('a refused lock is reported', /could not be kept awake/.test(warn), warn);
  ok('and it says what to do about it', /display sleep to Never/i.test(warn), warn);

  ok('no errors', errs.length === 0, errs.slice(0, 3));
  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
