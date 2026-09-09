/* Two things about the clock times.

   One: moving through the night is not the same as re-timing it. Stepping
   forward used to pin the segment you had just started, which re-chained
   everything after it — so an operator walking the running order rewrote the
   whole schedule under their own hands. Now it moves where we are and leaves
   the times as written.

   Two: a night can go far enough off plan that the printed times mislead more
   than they help, and the room should stop being told them without the
   operator having to invent new ones on the spot. */
const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const APP = pathToFileURL(path.join(__dirname, '..', 'BIESpresent.html')).href;
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

const CFG = {
  name: 'Living Like a Local', code: '', date: '2026-09-26', start: '18:30',
  segments: [{ title: 'Doors open', min: 30 }, { title: 'Mingling', min: 30 },
             { title: 'Welcome — MC opens', min: 10 }, { title: 'Main talk', min: 25 },
             { title: 'Q&A', min: 15 }, { title: 'Open networking', min: 45 }],
  overrides: {}, extra: {}, anchorSlip: 0,
  qr: { title: '', url: '', cap: '' }, sponsors: [], upcoming: [], dwell1: 30, dwell2: 12
};

// the times the room can actually read, straight off the running order
const shown = p => p.$$eval('#itin .row .t', xs => xs.map(x => x.textContent.trim()));
const idx = p => p.evaluate(() => current().idx);

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 820 } });
  await ctx.addInitScript(([w, c]) => {
    const RD = Date, rn = Date.now.bind(Date), T = new RD(w).getTime();
    let t0 = +(localStorage.getItem('__t0') || 0);
    if (!t0) { t0 = rn(); localStorage.setItem('__t0', String(t0)); }
    const f = () => T + (rn() - t0);
    window.Date = class extends RD {
      constructor(...a) { a.length ? super(...a) : super(f()); } static now() { return f(); } };
    if (c && !localStorage.getItem('bies-event-screen-v1'))
      localStorage.setItem('bies-event-screen-v1', c);
  }, ['2026-09-26T19:00:00', JSON.stringify(CFG)]);

  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('OP ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('OP ' + m.text()); });
  await p.goto(APP); await p.waitForTimeout(900);
  if (await p.locator('#setup').evaluate(e => e.classList.contains('live')))
    { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }

  console.log('\n— stepping through the night —');
  ok('7pm is mingling', await idx(p) === 1, await idx(p));
  const t0 = await shown(p);
  ok('the running order is on screen with its times', t0.length === 6, t0);
  ok('the MC is written for 7:30 PM', t0[2] === '7:30 PM', t0[2]);

  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  ok('next moves us into the MC', await idx(p) === 2, await idx(p));
  ok('and not one published time moved',
     JSON.stringify(await shown(p)) === JSON.stringify(t0), await shown(p));
  ok('nothing was pinned', await p.evaluate(() => JSON.stringify(cfg.overrides)) === '{}',
     await p.evaluate(() => JSON.stringify(cfg.overrides)));

  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);
  ok('three presses, three segments on', await idx(p) === 4, await idx(p));
  ok('times still untouched',
     JSON.stringify(await shown(p)) === JSON.stringify(t0), await shown(p));
  ok('the board is still on the clock, not being hand-driven',
     await p.evaluate(() => rt.autoAdvance));

  console.log('\n— what the room sees while we are ahead —');
  ok('the segments we walked past read as done',
     await p.$$eval('#itin .row', rs => rs.filter(r => r.classList.contains('past')).length) === 4,
     await p.$$eval('#itin .row', rs => rs.map(r => r.className)));
  ok('and exactly one is marked as now',
     await p.$$eval('#itin .row.now', rs => rs.length) === 1);

  console.log('\n— going back takes the wheel —');
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(400);
  ok('one back', await idx(p) === 3, await idx(p));
  ok('and the clock stops driving', await p.evaluate(() => rt.autoAdvance) === false);
  ok('the chip says so', !(await p.locator('#chipmode').evaluate(e => e.classList.contains('hide'))));
  ok('still no pins', await p.evaluate(() => JSON.stringify(cfg.overrides)) === '{}');
  await p.keyboard.press('a'); await p.waitForTimeout(400);
  ok('A hands it back to the clock', await p.evaluate(() => rt.autoAdvance));
  ok('and drops where the operator had moved to',
     await p.evaluate(() => rt.manualIndex) === -1);
  ok('so the clock decides again', await idx(p) === 1, await idx(p));

  console.log('\n— slip is still how you move the night —');
  await p.keyboard.press('-'); await p.waitForTimeout(400);
  const t1 = await shown(p);
  ok('minus does move the times', JSON.stringify(t1) !== JSON.stringify(t0), t1);
  await p.keyboard.press('='); await p.waitForTimeout(400);
  ok('and plus puts them back',
     JSON.stringify(await shown(p)) === JSON.stringify(t0), await shown(p));

  console.log('\n— hiding the times —');
  await p.keyboard.press('t'); await p.waitForTimeout(400);
  ok('the column is gone', (await shown(p)).every(x => x === '') ||
     await p.locator('#itin .row .t').first().evaluate(e => getComputedStyle(e).display === 'none'));
  ok('the running order itself stays', await p.locator('#itin .row').count() === 6);
  ok('so does the marker on where we are', await p.locator('#itin .row.now').count() === 1);
  ok('the countdown stays', /\d/.test(await p.locator('#count').textContent()));
  ok('but it stops naming a clock time',
     (await p.locator('#countsub').textContent()).trim() === '',
     await p.locator('#countsub').textContent());

  await p.keyboard.press('e'); await p.waitForTimeout(500);
  ok('the setup checkbox agrees', await p.locator('#f-hidetimes').isChecked());
  await p.click('.tab[data-tab="segments"]');
  ok('the operator can still see and edit the times',
     (await p.locator('#seglist .clock').first().textContent()).includes('PM'),
     await p.locator('#seglist .clock').first().textContent());
  await p.uncheck('#f-hidetimes'); await p.waitForTimeout(400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok('and unticking brings them back',
     JSON.stringify(await shown(p)) === JSON.stringify(t0), await shown(p));

  console.log('\n— it survives a reload —');
  await p.keyboard.press('t'); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(1100);
  ok('still hidden after a refresh', await p.evaluate(() => !!cfg.hideTimes));
  ok('and the screen agrees',
     await p.locator('#itin').evaluate(e => e.classList.contains('notimes')));

  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
