/* "Reset to the original times."

   The plan and tonight are two different things. Everything in the editor is
   the plan right up until the night starts; from then on the editor describes
   what is actually happening, and the plan is frozen so there is something to
   go back to. This suite holds both halves of that, and holds that the reset
   only ever touches times — it never adds, removes or renames a segment, and
   it leaves anything added during the night at the length it was given. */
const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const APP = pathToFileURL(path.join(__dirname, '..', 'BIESpresent.html')).href;
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

const SEGS = [{ title: 'Doors open', min: 30 }, { title: 'Mingling', min: 30 },
              { title: 'Welcome — MC opens', min: 10 }, { title: 'Main talk', min: 25 },
              { title: 'Q&A', min: 15 }, { title: 'Open networking', min: 45 }];
const base = extra => Object.assign({
  name: 'Living Like a Local', code: '', date: '2026-09-26', start: '18:30',
  segments: SEGS.map(s => Object.assign({}, s)),
  overrides: {}, extra: {}, anchorSlip: 0,
  qr: { title: '', url: '', cap: '' }, sponsors: [], upcoming: [], dwell1: 30, dwell2: 12
}, extra);

const shown = p => p.$$eval('#itin .row .t', xs => xs.map(x => x.textContent.trim()));
const drift = p => p.evaluate(() => ({
  slip: cfg.anchorSlip, extra: JSON.stringify(cfg.extra),
  pins: JSON.stringify(cfg.overrides), start: cfg.start }));

async function open(b, when, cfgObj) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 860 } });
  await ctx.addInitScript(([w, c]) => {
    const RD = Date, rn = Date.now.bind(Date), T = new RD(w).getTime();
    let t0 = +(localStorage.getItem('__t0') || 0);
    if (!t0) { t0 = rn(); localStorage.setItem('__t0', String(t0)); }
    const f = () => T + (rn() - t0);
    window.Date = class extends RD {
      constructor(...a) { a.length ? super(...a) : super(f()); } static now() { return f(); } };
    // seed once, or a reload quietly puts the original config back and the
    // test ends up asserting against the seed rather than against the app
    if (c && !localStorage.getItem('bies-event-screen-v1'))
      localStorage.setItem('bies-event-screen-v1', c);
  }, [when, JSON.stringify(cfgObj)]);
  const p = await ctx.newPage();
  p.on('dialog', d => d.accept());
  await p.goto(APP); await p.waitForTimeout(900);
  return p;
}

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const errs = [];

  /* ── a night already running, set up earlier with a plan on file ── */
  const PLAN = { start: '18:30', mins: { 0: 30, 1: 30, 2: 10, 3: 25, 4: 15, 5: 45 } };
  const p = await open(b, '2026-09-26T19:00:00', base({ plan: PLAN }));
  p.on('pageerror', e => errs.push('A ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('A ' + m.text()); });
  if (await p.locator('#setup').evaluate(e => e.classList.contains('live')))
    { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  const t0 = await shown(p);

  console.log('\n— nothing to undo —');
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  await p.click('.tab[data-tab="segments"]');
  ok('the button is there', await p.locator('#replan').count() === 1);
  ok('and greyed out with nothing to undo', await p.locator('#replan').isDisabled());
  ok('the note says so',
     /original times/.test(await p.locator('#plannote').textContent()),
     await p.locator('#plannote').textContent());

  console.log('\n— the speaker overruns —');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.keyboard.press('='); await p.keyboard.press('=');   // +5, +5 on the live segment
  await p.waitForTimeout(400);
  const t1 = await shown(p);
  ok('the times moved', JSON.stringify(t1) !== JSON.stringify(t0), t1);
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  await p.click('.tab[data-tab="segments"]');
  ok('the button wakes up', !(await p.locator('#replan').isDisabled()));
  ok('and the note counts the slip',
     /10 min of slip/.test(await p.locator('#plannote').textContent()),
     await p.locator('#plannote').textContent());

  console.log('\n— resetting —');
  await p.click('#replan'); await p.waitForTimeout(600);
  ok('every time is back', JSON.stringify(await shown(p)) === JSON.stringify(t0),
     await shown(p));
  const d = await drift(p);
  ok('the slip is cleared', d.slip === 0 && d.extra === '{}' && d.pins === '{}', d);
  ok('the button goes quiet again', await p.locator('#replan').isDisabled());
  ok('and the segments are untouched',
     await p.evaluate(() => cfg.segments.map(s => s.title).join('|')) ===
     SEGS.map(s => s.title).join('|'));

  console.log('\n— a length changed by hand mid-event —');
  await p.fill('#seglist .segrow:nth-child(4) input[data-f="min"]', '40');
  await p.dispatchEvent('#seglist .segrow:nth-child(4) input[data-f="min"]', 'input');
  await p.waitForTimeout(500);
  ok('the note notices', /1 changed length/.test(await p.locator('#plannote').textContent()),
     await p.locator('#plannote').textContent());
  await p.click('#replan'); await p.waitForTimeout(600);
  ok('the talk is back to 25 minutes',
     await p.evaluate(() => Number(cfg.segments[3].min)) === 25,
     await p.evaluate(() => cfg.segments[3].min));

  console.log('\n— something added tonight keeps what it was given —');
  await p.click('#addseg'); await p.waitForTimeout(400);
  await p.fill('#seglist .segrow:last-child input[data-f="min"]', '20');
  await p.dispatchEvent('#seglist .segrow:last-child input[data-f="min"]', 'input');
  await p.waitForTimeout(400);
  ok('adding one at the end disturbs nothing, so there is nothing to undo',
     await p.locator('#replan').isDisabled());
  // the keys only reach the board, so give it some real slip to undo
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.keyboard.press('='); await p.waitForTimeout(400);
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  await p.click('.tab[data-tab="segments"]');
  await p.click('#replan'); await p.waitForTimeout(600);
  ok('the added segment survives', await p.evaluate(() => cfg.segments.length) === 7,
     await p.evaluate(() => cfg.segments.length));
  ok('with the length it was given',
     await p.evaluate(() => Number(cfg.segments[6].min)) === 20,
     await p.evaluate(() => cfg.segments[6].min));
  ok('and the planned ones are still planned',
     await p.evaluate(() => Number(cfg.segments[3].min)) === 25);

  /* ── setting a night up before it starts ── */
  console.log('\n— before the night starts, the editor IS the plan —');
  const q = await open(b, '2026-09-26T16:00:00', base({}));
  q.on('pageerror', e => errs.push('B ' + e.message));
  q.on('console', m => { if (m.type() === 'error') errs.push('B ' + m.text()); });
  if (await q.locator('#setup').evaluate(e => !e.classList.contains('live')))
    { await q.keyboard.press('e'); await q.waitForTimeout(500); }
  await q.click('.tab[data-tab="segments"]');
  ok('a plan was captured on sight', await q.evaluate(() => !!cfg.plan));
  await q.fill('#seglist .segrow:nth-child(4) input[data-f="min"]', '40');
  await q.dispatchEvent('#seglist .segrow:nth-child(4) input[data-f="min"]', 'input');
  await q.waitForTimeout(500);
  ok('an edit before doors becomes the plan',
     await q.evaluate(() => cfg.plan.mins[3]) === 40,
     await q.evaluate(() => cfg.plan.mins[3]));
  ok('so there is nothing to reset', await q.locator('#replan').isDisabled());

  console.log('\n— doors opened late —');
  await q.keyboard.press('Escape'); await q.waitForTimeout(300);
  await q.keyboard.press('-'); await q.keyboard.press('-');   // the whole night, 10 earlier
  await q.waitForTimeout(400);
  ok('the whole night moved', await q.evaluate(() => cfg.anchorSlip) === -10,
     await q.evaluate(() => cfg.anchorSlip));
  await q.keyboard.press('e'); await q.waitForTimeout(500);
  await q.click('.tab[data-tab="segments"]');
  ok('shifting the night is undoable too', !(await q.locator('#replan').isDisabled()));
  await q.click('#replan'); await q.waitForTimeout(600);
  ok('and it comes back', await q.evaluate(() => cfg.anchorSlip) === 0);
  ok('with the pre-doors edit intact',
     await q.evaluate(() => Number(cfg.segments[3].min)) === 40);

  console.log('\n— it survives a refresh —');
  await q.reload(); await q.waitForTimeout(1100);
  ok('the plan is on file, not just in memory',
     await q.evaluate(() => cfg.plan && cfg.plan.mins[3]) === 40);

  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
