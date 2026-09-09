const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const APP = pathToFileURL(path.join(__dirname, '..', 'BIESpresent.html')).href;
const A = f => path.join(__dirname, 'assets', f);
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

const stage = p => p.evaluate(() => {
  const kids = [...document.querySelectorAll('#airstage > *')];
  return kids.map(k => {
    const fg = k.querySelector ? k.querySelector('.fg') : null;
    return {
      tag: k.tagName, cls: k.className,
      fit: fg ? (fg.classList.contains('fill') ? 'fill' : 'fit') : null,
      blur: !!(k.querySelector && k.querySelector('.bg')),
      ken: !!(fg && fg.classList.contains('ken')),
      kms: fg ? fg.style.getPropertyValue('--kms') : null
    };
  });
});

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  // Page-scoped, never context-scoped: a context init script also runs in the
  // audience tab, where clearing storage wipes the state the operator just
  // published and the second screen comes up blank for reasons of its own.
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('w')) {
    sessionStorage.setItem('w','1'); localStorage.clear();
    indexedDB.deleteDatabase('bies-event-media'); } } catch(_){} });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(APP); await p.waitForTimeout(1100);
  if (await p.locator('#setup').evaluate(e => !e.classList.contains('live')))
    { await p.keyboard.press('e'); await p.waitForTimeout(500); }
  await p.click('.tab[data-tab="media"]');
  await p.setInputFiles('#f-mediaimg', [A('portrait.png'), A('wide.png'), A('slide-1.png')]);
  await p.waitForTimeout(1200);
  await p.setInputFiles('#f-mediavid', [A('clip.webm')]);
  await p.waitForTimeout(900);

  console.log('\n— shuffle —');
  ok('a photo can override its own crop', await p.locator('#medialist select[data-f="fit"]').count() === 3);
  const vidAt = () => p.evaluate(() => cfg.media.findIndex(m => m.kind === 'video'));
  const before = await p.evaluate(() => cfg.media.map(m => m.name).join(','));
  const vidBefore = await vidAt();
  let moved = false;
  for (let i = 0; i < 8 && !moved; i++) {
    await p.click('#mdshuffle'); await p.waitForTimeout(300);
    moved = (await p.evaluate(() => cfg.media.map(m => m.name).join(','))) !== before;
  }
  ok('it reorders the photos', moved, before);
  ok('and leaves the video where it was', await vidAt() === vidBefore);
  ok('nothing is lost', await p.evaluate(() => cfg.media.length) === 4);

  console.log('\n— crop modes —');
  await p.selectOption('#f-fit', 'fit');
  await p.locator('#medialist .mrow').first().locator('.pv').click();
  await p.waitForTimeout(300);
  await p.click('#mdsend'); await p.waitForTimeout(900);
  ok('fit letterboxes it', (await stage(p))[0].fit === 'fit', await stage(p));

  await p.selectOption('#f-fit', 'fill'); await p.waitForTimeout(800);
  ok('fill crops the photo already on the wall', (await stage(p))[0].fit === 'fill', await stage(p));

  await p.selectOption('#f-fit', 'blur'); await p.waitForTimeout(800);
  const blurred = (await stage(p))[0];
  ok('blurred backdrop sits behind it', blurred.blur === true, blurred);
  ok('and the photo itself is still whole', blurred.fit === 'fit', blurred);

  console.log('\n— a photo can overrule the reel —');
  const firstId = await p.evaluate(() => cfg.media.find(m => m.kind === 'image').id);
  await p.locator(`#medialist .mrow[data-id="${firstId}"] select[data-f="fit"]`).selectOption('fill');
  await p.waitForTimeout(800);
  ok('its own setting wins', await p.evaluate(() => rt.air.fit) === 'fill',
     await p.evaluate(() => [rt.air.fit, cfg.show.fit]));

  console.log('\n— Ken Burns —');
  ok('off by default', (await stage(p))[0].ken === false);
  await p.check('#f-ken'); await p.waitForTimeout(800);
  const kb = (await stage(p))[0];
  ok('the zoom is applied', kb.ken === true, kb);
  ok('and lasts a whole dwell', parseInt(kb.kms) >= 8000, kb.kms);

  console.log('\n— transitions —');
  await p.selectOption('#f-trans', 'fade');
  await p.fill('#f-transms', '1200'); await p.waitForTimeout(400);
  await p.fill('#f-interval', '3'); await p.waitForTimeout(400);
  await p.check('#f-showloop');                    // or it runs off the end mid-test
  await p.click('#reelstart');
  await p.waitForTimeout(1800);                    // let the first dissolve finish
  ok('the reel is running', await p.evaluate(() => rt.air.key.startsWith('reel:')));
  ok('one photo on the stage to start', (await stage(p)).length === 1, await stage(p));
  await p.click('#reelnext');
  await p.waitForTimeout(350);                     // mid-dissolve
  const during = await stage(p);
  ok('both photos are on screen during the crossfade', during.length === 2, during);
  await p.waitForTimeout(1700);
  ok('and the old one is gone afterwards', (await stage(p)).length === 1);

  // skipping faster than the dissolve stacks photos; they must all still clear
  for (let i = 0; i < 6; i++) { await p.click('#reelnext'); await p.waitForTimeout(120); }
  await p.waitForTimeout(2200);
  ok('hammering skip leaves nothing stranded', (await stage(p)).length === 1, await stage(p));

  await p.selectOption('#f-trans', 'cut'); await p.waitForTimeout(400);
  await p.click('#reelnext'); await p.waitForTimeout(320);
  ok('a cut swaps outright', (await stage(p)).length === 1, await stage(p));

  console.log('\n— speed, hold and skip while it runs —');
  await p.selectOption('#f-trans', 'fade');
  await p.fill('#f-interval', '20'); await p.waitForTimeout(500);
  const held = await p.evaluate(() => rt.air.key);
  await p.waitForTimeout(2500);
  ok('a slower speed takes effect immediately', await p.evaluate(() => rt.air.key) === held);

  await p.click('#reelhold'); await p.waitForTimeout(300);
  ok('Hold becomes Resume', (await p.locator('#reelhold').textContent()).trim() === 'Resume');
  await p.fill('#f-interval', '2'); await p.waitForTimeout(2600);
  ok('and held really means held', await p.evaluate(() => rt.air.key) === held);
  await p.click('#reelhold'); await p.waitForTimeout(2800);
  ok('resuming starts it moving again', await p.evaluate(() => rt.air && rt.air.key) !== held);

  const at = await p.evaluate(() => rt.air && rt.air.key);
  await p.click('#reelback'); await p.waitForTimeout(900);
  ok('back steps to the previous photo', await p.evaluate(() => rt.air && rt.air.key) !== at);

  console.log('\n— the end of a reel that is not looping —');
  await p.uncheck('#f-showloop');
  await p.fill('#f-interval', '2');
  await p.waitForTimeout(400);
  // step until it runs out; the button disables itself the moment it does
  for (let i = 0; i < 10; i++) {
    if (await p.locator('#reelnext').isDisabled()) break;
    await p.click('#reelnext'); await p.waitForTimeout(220);
  }
  await p.waitForTimeout(900);
  ok('it hands the wall back to the board', await p.evaluate(() => !rt.air));
  ok('and the reel has stopped', await p.locator('#reelhold').isDisabled());
  await p.check('#f-showloop');
  await p.click('#reelstart'); await p.waitForTimeout(1400);

  console.log('\n— the second screen gets all of it —');
  const aud = await ctx.newPage();
  await aud.goto(APP + '?view=audience');
  await aud.waitForTimeout(1800);
  // Hold it first. Comparing two windows while the reel is still turning over
  // samples them at different instants and compares different photographs.
  await p.click('#reelhold');
  await p.waitForTimeout(2200);                      // let any dissolve finish
  const there = await stage(aud), here = await stage(p);
  ok('the audience shows the same photo', there.length === 1 && here.length === 1,
     { there: there.length, here: here.length });
  ok('both windows agree on which one', await aud.evaluate(() => rt.air.key) ===
     await p.evaluate(() => rt.air.key));
  ok('with the same crop', there[0].fit === here[0].fit, [there[0].fit, here[0].fit]);
  ok('and the same zoom', there[0].ken === true && here[0].ken === true, [there[0], here[0]]);
  await p.click('#reelhold'); await p.waitForTimeout(400);

  await p.click('#reelstop'); await p.waitForTimeout(600);
  ok('stopping clears the wall', await p.evaluate(() => !rt.air));
  ok('the transport greys out', await p.locator('#reelhold').isDisabled());

  ok('no errors', errs.length === 0, errs.slice(0, 4));
  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
