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
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__w')) {
        sessionStorage.setItem('__w', '1');
        localStorage.clear(); indexedDB.deleteDatabase('bies-event-media');
      }
    } catch (_) {}
  });
  await p.goto(APP); await p.waitForTimeout(900);
  await p.click('.tab[data-tab="music"]');
  await p.waitForTimeout(300);

  console.log('\n— the transport with nothing loaded —');
  ok('play is disabled', await p.locator('#auplay').isDisabled());
  ok('seek is disabled', await p.locator('#auseek').isDisabled());
  ok('it says so', (await p.locator('#autitle').textContent()).includes('Nothing loaded'));

  console.log('\n— loading tracks —');
  await p.setInputFiles('#f-audio', [A('tone.wav'), A('tone2.wav'), A('tone3.wav')]);
  await p.waitForTimeout(1200);
  ok('three rows', await p.locator('#aulist .mrow').count() === 3);
  ok('play enabled now', !(await p.locator('#auplay').isDisabled()));
  ok('sub counts them', (await p.locator('#ausub').textContent()).includes('3 track'));

  console.log('\n— play, pause, playhead —');
  await p.click('#auplay');
  await p.waitForTimeout(1200);
  ok('audio is playing', await p.evaluate(() => auEl && !auEl.paused));
  ok('title shows the track', (await p.locator('#autitle').textContent()).length > 2);
  ok('position reads 1 of 3', (await p.locator('#ausub').textContent()).trim() === '1 of 3');
  const dur = await p.locator('#audur').textContent();
  ok('duration filled in', /^\d+:\d\d$/.test(dur) && dur !== '0:00', dur);
  const t1 = await p.locator('#aunow').textContent();
  await p.waitForTimeout(1300);
  const t2 = await p.locator('#aunow').textContent();
  ok('elapsed time advances', t1 !== t2, [t1, t2]);
  ok('the bar fills as it goes',
     parseFloat(await p.locator('#auseek').evaluate(e => e.style.getPropertyValue('--fill'))) > 0);
  ok('the live row is marked',
     await p.locator('#aulist .mrow').first().evaluate(e => e.classList.contains('live')));
  ok('and tagged playing',
     (await p.locator('#aulist .mrow').first().locator('.tag').textContent()).trim() === 'playing');

  await p.click('#auplay');
  await p.waitForTimeout(500);
  ok('pause stops it', await p.evaluate(() => auEl.paused));
  ok('row no longer says playing',
     (await p.locator('#aulist .mrow').first().locator('.tag').textContent()).trim() === '1');

  console.log('\n— next and back —');
  await p.click('#auplay'); await p.waitForTimeout(400);
  await p.click('#aunext'); await p.waitForTimeout(900);
  ok('moved to track 2', (await p.locator('#ausub').textContent()).trim() === '2 of 3');
  await p.click('#auprev'); await p.waitForTimeout(900);
  ok('back went to track 1', (await p.locator('#ausub').textContent()).trim() === '1 of 3');
  // a few seconds in, back should restart rather than skip
  await p.evaluate(() => { auEl.currentTime = 5; });
  await p.waitForTimeout(400);
  await p.click('#auprev'); await p.waitForTimeout(600);
  ok('mid-track, back restarts instead of skipping',
     (await p.locator('#ausub').textContent()).trim() === '1 of 3' &&
     await p.evaluate(() => auEl.currentTime < 2));

  console.log('\n— scrubbing —');
  const box = await p.locator('#auseek').boundingBox();
  await p.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(600);
  ok('clicking the bar seeks', await p.evaluate(() => auEl.currentTime > 1),
     await p.evaluate(() => auEl.currentTime));

  console.log('\n— volume —');
  await p.locator('#auvol').fill('35');
  await p.waitForTimeout(400);
  ok('volume follows the slider',
     Math.abs(await p.evaluate(() => auEl.volume) - 0.35) < 0.02,
     await p.evaluate(() => auEl.volume));
  await p.click('#aumute'); await p.waitForTimeout(300);
  ok('mute mutes', await p.evaluate(() => auEl.muted));
  ok('the icon changed', (await p.locator('#auvicon').innerHTML()).includes('20.4'));
  await p.click('#aumute'); await p.waitForTimeout(300);
  ok('and unmutes', !(await p.evaluate(() => auEl.muted)));

  console.log('\n— volume survives a refresh —');
  await p.evaluate(() => save());
  await p.reload(); await p.waitForTimeout(1200);
  await p.keyboard.press('e'); await p.waitForTimeout(600);
  await p.click('.tab[data-tab="music"]'); await p.waitForTimeout(400);
  ok('remembered the level', Math.abs(await p.evaluate(() => cfg.vol) - 0.35) < 0.02,
     await p.evaluate(() => cfg.vol));
  ok('slider shows it', Math.abs(+(await p.locator('#auvol').inputValue()) - 35) < 2);

  console.log('\n— shuffle —');
  const order1 = await p.evaluate(() => cfg.audio.map(a => a.id).join(','));
  let moved = false;
  for (let i = 0; i < 8 && !moved; i++) {
    await p.click('#aushuffle'); await p.waitForTimeout(250);
    moved = (await p.evaluate(() => cfg.audio.map(a => a.id).join(','))) !== order1;
  }
  ok('shuffle reorders the list', moved);
  ok('and keeps every track', await p.locator('#aulist .mrow').count() === 3);

  console.log('\n— clean console —');
  ok('no errors', errs.length === 0, errs.slice(0, 4));

  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
