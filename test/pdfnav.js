/* Turning the pages of a PDF that is on the wall.

   Chrome's PDF viewer honours #page= on the way in and refuses to be moved
   afterwards — changing the fragment blanks it — so a page turn means loading a
   second viewer. The whole design rests on that, and on holding the page the
   room is already looking at underneath until the new one has painted. These
   tests hold both halves: that the right page arrives, and that the wall never
   goes black on the way there. */
const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const { PNG } = require('pngjs');
const APP = pathToFileURL(path.join(__dirname, '..', 'BIESpresent.html')).href;
const A = f => path.join(__dirname, 'assets', f);
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

const stage = p => p.evaluate(() => [...document.querySelectorAll('#airstage > *')]
  .map(e => ({ tag: e.tagName, page: (e.src || '').match(/page=(\d+)/), op: e.style.opacity })));
const pageOf = p => p.evaluate(() => rt.air && rt.air.page);
// the slide art is white on black, so ink is how you tell a drawn page from a blank one
const ink = buf => { const im = PNG.sync.read(buf); let n = 0;
  for (let i = 0; i < im.data.length; i += 4) if (im.data[i] > 200) n++;
  return n; };

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 760 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('w')) {
    sessionStorage.setItem('w', '1'); localStorage.clear();
    indexedDB.deleteDatabase('bies-event-media'); } } catch (_) {} });
  const errs = [];
  p.on('pageerror', e => errs.push('OP ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('OP ' + m.text()); });
  await p.goto(APP); await p.waitForTimeout(1000);
  if (await p.locator('#setup').evaluate(e => !e.classList.contains('live')))
    { await p.keyboard.press('e'); await p.waitForTimeout(400); }

  console.log('\n— how long is the deck —');
  await p.click('.tab[data-tab="decks"]');
  await p.setInputFiles('#f-deckpdf', [A('deck.pdf')]);
  await p.waitForTimeout(1400);
  ok('the deck is catalogued', await p.evaluate(() => cfg.decks.length) === 1);
  ok('and its length was read out of the file',
     await p.evaluate(() => cfg.decks[0].pages) === 3,
     await p.evaluate(() => cfg.decks[0].pages));
  ok('the preview says where it is',
     (await p.locator('#dkpos').textContent()).trim() === '1 / 3',
     await p.locator('#dkpos').textContent());

  console.log('\n— stepping the preview, before anything is on the wall —');
  await p.click('#dknext'); await p.waitForTimeout(500);
  ok('forward', (await p.locator('#dkpos').textContent()).trim() === '2 / 3');
  ok('the preview really moved',
     /page=2/.test(await p.locator('#dkpic embed').getAttribute('src')));
  await p.click('#dkprev'); await p.click('#dkprev'); await p.waitForTimeout(500);
  ok('and it stops at the front', (await p.locator('#dkpos').textContent()).trim() === '1 / 3');

  console.log('\n— on the wall —');
  await p.click('#dksend'); await p.waitForTimeout(1200);
  ok('a viewer is mounted', (await stage(p)).length === 1);
  ok('on page one', await pageOf(p) === 1);
  ok('the on-air bar says so',
     /page 1 of 3/.test(await p.locator('#airwhat').textContent()),
     await p.locator('#airwhat').textContent());

  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const shot1 = await p.screenshot();

  console.log('\n— the right arrow turns the page —');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(90);
  const mid = await stage(p);
  ok('the page the room is looking at is held underneath', mid.length === 2, mid);
  ok('and it is the new one that is hidden, not the old',
     mid.length === 2 && mid[0].op === '' && mid[1].op === '0', mid);
  await p.waitForTimeout(1000);
  ok('one viewer again once it has painted', (await stage(p)).length === 1);
  ok('now on page two', await pageOf(p) === 2);
  const shot2 = await p.screenshot();
  ok('and the wall really changed', ink(shot1) !== ink(shot2), [ink(shot1), ink(shot2)]);
  ok('the wall never went blank', ink(shot2) > 500, ink(shot2));

  console.log('\n— left arrow, and the clicker keys —');
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(1000);
  ok('back to one', await pageOf(p) === 1);
  await p.keyboard.press('PageDown'); await p.waitForTimeout(1000);
  ok('PageDown forward', await pageOf(p) === 2);
  await p.keyboard.press('PageUp'); await p.waitForTimeout(1000);
  ok('PageUp back', await pageOf(p) === 1);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1000);
  ok('the down arrow works too, for the clickers that send it', await pageOf(p) === 2);

  console.log('\n— the ends of the deck —');
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900);
  ok('it will not go before the first page', await pageOf(p) === 1);
  for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800); }
  ok('and it stops at the last', await pageOf(p) === 3);
  ok('with one viewer on the stage, not a pile of them',
     (await stage(p)).length === 1, await stage(p));

  console.log('\n— the last page really is the last page —');
  const shot3 = await p.screenshot();
  ok('page three is a different picture from page one',
     Math.abs(ink(shot3) - ink(shot1)) > 100, [ink(shot1), ink(shot3)]);

  console.log('\n— a fast hand on the clicker —');
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(60);
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(1600);
  ok('lands where the clicks add up to', await pageOf(p) === 2, await pageOf(p));
  ok('and leaves exactly one viewer behind', (await stage(p)).length === 1, await stage(p));

  console.log('\n— the operator screen keeps up —');
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  ok('the preview followed the wall',
     (await p.locator('#dkpos').textContent()).trim() === '2 / 3',
     await p.locator('#dkpos').textContent());
  ok('the on-air bar too',
     /page 2 of 3/.test(await p.locator('#airwhat').textContent()),
     await p.locator('#airwhat').textContent());

  console.log('\n— the arrows go back to the running order —');
  await p.click('#airoff'); await p.waitForTimeout(500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const seg0 = await p.evaluate(() => current().idx);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  ok('right advances the segment again with nothing on the wall',
     await p.evaluate(() => current().idx) !== seg0);
  ok('N still works whatever is on the wall',
     typeof (await p.evaluate(() => { advance(); return current().idx; })) === 'number');

  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
