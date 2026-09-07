const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
const path = require('path');
const A = f => path.join(__dirname, 'assets', f);

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  << ' + JSON.stringify(extra) : '')); }
};

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  await p.goto(APP);
  await p.waitForTimeout(700);

  console.log('\n— loads clean —');
  ok('no console errors on load', errs.length === 0, errs);
  ok('setup opened on first run', await p.locator('#setup').evaluate(e => e.classList.contains('live')));

  console.log('\n— the new tabs exist —');
  for (const t of ['decks', 'media', 'music']) {
    ok(t + ' tab present', await p.locator(`.tab[data-tab="${t}"]`).count() === 1);
  }

  console.log('\n— a slide deck —');
  await p.click('.tab[data-tab="decks"]');
  await p.setInputFiles('#f-slides', [A('slide-1.png'), A('slide-2.png'), A('slide-3.png')]);
  await p.waitForTimeout(900);
  ok('deck row appeared', await p.locator('#decklist .mrow').count() === 1);
  ok('counted 3 slides', (await p.locator('#decklist .tag').first().textContent()).includes('3 slides'));
  ok('preview shows a slide', await p.locator('#dkpic img').count() === 1);
  ok('position reads 1 / 3', (await p.locator('#dkpos').textContent()).trim() === '1 / 3');
  ok('thumb strip has 3', await p.locator('#dkthumbs img').count() === 3);

  console.log('\n— preview moves without touching the wall —');
  await p.click('#dknext');
  await p.waitForTimeout(300);
  ok('preview advanced to 2 / 3', (await p.locator('#dkpos').textContent()).trim() === '2 / 3');
  ok('nothing on air yet', await p.evaluate(() => !rt || !rt.air));
  ok('air bar hidden', !(await p.locator('#airbar').evaluate(e => e.classList.contains('on'))));

  console.log('\n— send to screen —');
  await p.click('#dksend');
  await p.waitForTimeout(600);
  ok('air bar showing', await p.locator('#airbar').evaluate(e => e.classList.contains('on')));
  const label = await p.locator('#airwhat').textContent();
  ok('bar names the slide', /slide 2 of 3/.test(label), label);
  ok('airview live', await p.locator('#airview').evaluate(e => e.classList.contains('live')));
  ok('an image is mounted', await p.locator('#airstage img').count() === 1);

  console.log('\n— once live, stepping moves the wall —');
  await p.click('#dknext');
  await p.waitForTimeout(500);
  ok('wall is on slide 3', /slide 3 of 3/.test(await p.locator('#airwhat').textContent()));
  ok('preview followed', (await p.locator('#dkpos').textContent()).trim() === '3 / 3');
  await p.click('#dknext');
  await p.waitForTimeout(400);
  ok('does not run past the last slide', /slide 3 of 3/.test(await p.locator('#airwhat').textContent()));

  console.log('\n— the second screen sees the same slide —');
  const shown = await p.locator('#airstage img').evaluate(e => e.naturalWidth + 'x' + e.naturalHeight);
  const aud = await ctx.newPage();
  await aud.goto(APP + '?view=audience');
  await aud.waitForTimeout(1500);
  ok('audience mounted the image', await aud.locator('#airstage img').count() === 1);
  ok('audience shows the same file',
     await aud.locator('#airstage img').evaluate(e => e.naturalWidth + 'x' + e.naturalHeight) === shown,
     shown);
  ok('audience minted its own blob url',
     await aud.locator('#airstage img').evaluate(e => e.src.startsWith('blob:')));

  console.log('\n— a clicker drives it —');
  await p.keyboard.press('Escape');           // out of setup, onto the board
  await p.waitForTimeout(400);
  await p.keyboard.press('PageUp');
  await p.waitForTimeout(500);
  ok('PageUp went back a slide', await p.evaluate(() => rt.air.key.endsWith(':1')),
     await p.evaluate(() => rt.air.key));
  await p.keyboard.press('PageDown');
  await p.waitForTimeout(500);
  ok('PageDown went forward', await p.evaluate(() => rt.air.key.endsWith(':2')));
  await aud.waitForTimeout(900);
  ok('second screen followed the clicker',
     await aud.evaluate(() => rt.air.key.endsWith(':2')));

  console.log('\n— blackout still wins —');
  await p.keyboard.press('b');
  await p.waitForTimeout(400);
  ok('blackout is up', await p.locator('#blackout').evaluate(e => e.classList.contains('live')));
  const z = await p.evaluate(() => [
    getComputedStyle(document.querySelector('#blackout')).zIndex,
    getComputedStyle(document.querySelector('#airview')).zIndex
  ]);
  ok('blackout sits above the media', +z[0] > +z[1], z);
  await p.keyboard.press('b');
  await p.waitForTimeout(300);

  console.log('\n— take it off air —');
  await p.keyboard.press('e');
  await p.waitForTimeout(500);
  await p.click('#airoff');
  await p.waitForTimeout(700);
  ok('airview hidden', !(await p.locator('#airview').evaluate(e => e.classList.contains('live'))));
  ok('stage emptied', await p.locator('#airstage').evaluate(e => e.children.length === 0));
  await aud.waitForTimeout(900);
  ok('second screen cleared too', await aud.locator('#airstage').evaluate(e => e.children.length === 0));

  console.log('\n— console stayed clean —');
  ok('no errors through the whole run', errs.length === 0, errs.slice(0, 4));

  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
