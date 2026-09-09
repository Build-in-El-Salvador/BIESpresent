/* The on-air overlay: the strip along the bottom of whatever is on the wall,
   and the BIES bug in the corner.

   The interesting property is the interleave. The countdown is the one thing
   this board does that a deck cannot, so it is not simply one card in a queue —
   it is dealt back in between every other card. These tests hold that, and hold
   that both windows land on the same card at the same moment without anybody
   publishing which one it is. */
const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const path = require('path');
const APP = pathToFileURL(path.join(__dirname, '..', 'BIESpresent.html')).href;
const A = f => path.join(__dirname, 'assets', f);
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

// 19:50 on the night: mid-talk, so there is a real "up next" and a real countdown
const CFG = {
  name: 'Living Like a Local', code: 'LL20260926', date: '2026-09-26', start: '18:30',
  segments: [{ title: 'Doors open', min: 30 }, { title: 'Mingling', min: 30 },
             { title: 'Welcome — MC opens', min: 10 }, { title: 'Main talk', min: 25 },
             { title: 'Q&A', min: 15 }, { title: 'Open networking', min: 45 }],
  overrides: {}, extra: {}, anchorSlip: 0,
  qr: { title: 'Join', url: '', cap: '' },
  sponsors: [],
  upcoming: [{ when: 'Oct 6', what: 'Bitcoin 101', meta: '6 weeks' }],
  dwell1: 30, dwell2: 12
};

const kickers = p => p.evaluate(() => slugCards().map(c => c.k));

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 820 } });
  // one shared context, so the audience window is a second window of one browser
  await ctx.addInitScript(([w, c]) => {
    const RD = Date, rn = Date.now.bind(Date), T = new RD(w).getTime();
    let t0 = +(localStorage.getItem('__t0') || 0);
    if (!t0) { t0 = rn(); localStorage.setItem('__t0', String(t0)); }
    const f = () => T + (rn() - t0);
    window.Date = class extends RD {
      constructor(...a) { a.length ? super(...a) : super(f()); } static now() { return f(); } };
    if (c && !localStorage.getItem('bies-event-screen-v1'))
      localStorage.setItem('bies-event-screen-v1', c);
  }, ['2026-09-26T19:50:00', JSON.stringify(CFG)]);

  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('OP ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('OP ' + m.text()); });
  await p.goto(APP); await p.waitForTimeout(900);

  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="media"]');
  await p.setInputFiles('#f-mediaimg', [A('wide.png')]);
  await p.waitForTimeout(900);
  await p.click('#mdsend'); await p.waitForTimeout(700);

  console.log('\n— nothing to cycle through —');
  ok('a photo is on the wall', await p.evaluate(() => !!(rt.air && rt.air.key)));
  await p.click('#airoverlay'); await p.waitForTimeout(500);
  ok('overlay on', await p.locator('#airslug').evaluate(e => e.classList.contains('on')));
  ok('with no partners it is the countdown and what is coming up',
     JSON.stringify(await kickers(p)) === JSON.stringify(['Up next', 'See you at']),
     await kickers(p));
  ok('and it carries the countdown',
     /\d\d:\d\d/.test(await p.locator('#airslugc').textContent()),
     await p.locator('#airslugc').textContent());

  console.log('\n— a partner with a name and no logo —');
  await p.click('.tab[data-tab="panels"]');
  await p.click('#spaddname'); await p.waitForTimeout(300);
  await p.fill('#splist .spitem:last-child input[data-f="name"]', 'Hotel Los Cobanos');
  await p.click('#spaddname'); await p.waitForTimeout(300);
  await p.fill('#splist .spitem:last-child input[data-f="name"]', 'Surf City Coffee');
  await p.waitForTimeout(400);
  ok('two partners on file', await p.evaluate(() => cfg.sponsors.length) === 2);
  ok('neither carries an image', await p.evaluate(() => cfg.sponsors.every(s => !s.src)));
  ok('no broken image in the editor',
     await p.locator('#splist .spitem img').count() === 0);
  ok('the partner panel sets the name in the display face',
     await p.locator('#sponsors .spword').count() === 2);
  ok('and does not caption it twice',
     await p.locator('#sponsors .spname').count() === 0);

  console.log('\n— the cards, and the interleave —');
  const ks = await kickers(p);
  ok('the countdown is dealt back in between the others',
     JSON.stringify(ks) === JSON.stringify(
       ['Up next', 'Proudly sponsored by', 'Up next', 'See you at']), ks);
  const spCard = await p.evaluate(() =>
    slugCards().find(c => c.k === 'Proudly sponsored by'));
  ok('the sponsor card reads out both names',
     /Hotel Los Cobanos/.test(spCard.t) && /Surf City Coffee/.test(spCard.t), spCard.t);
  const upCard = await p.evaluate(() => slugCards().find(c => c.k === 'See you at'));
  ok('the coming-up card names the event', /Bitcoin 101/.test(upCard.t), upCard.t);
  ok('and puts its date where the countdown goes', upCard.c === 'Oct 6', upCard.c);

  console.log('\n— it actually turns over —');
  await p.fill('#f-slugsec', '3'); await p.waitForTimeout(300);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const seen = new Set(); let swapped = false;
  for (let i = 0; i < 56; i++) {
    seen.add(await p.locator('#airslugk').textContent());
    if (await p.locator('#airslugln').evaluate(e => e.classList.contains('swap'))) swapped = true;
    await p.waitForTimeout(250);
  }
  ok('every card came round', seen.size === 3, [...seen]);
  ok('and the swap is animated, not a snap', swapped);

  console.log('\n— both windows land on the same card —');
  let [aud] = await Promise.all([ctx.waitForEvent('page'), p.click('#secondbtn')]);
  aud.on('pageerror', e => errs.push('AUD ' + e.message));
  await aud.waitForLoadState(); await aud.waitForTimeout(1200);
  ok('audience window opened', aud.url().includes('view=audience'));
  let agreed = 0;
  for (let i = 0; i < 6; i++) {
    const [x, y] = await Promise.all([
      p.locator('#airslugk').textContent(), aud.locator('#airslugk').textContent()]);
    if (x === y) agreed++;
    await p.waitForTimeout(700);
  }
  // a sample taken across the turn-over boundary can legitimately disagree
  ok('the two screens agree card for card', agreed >= 5, agreed);

  console.log('\n— turning cards off —');
  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="panels"]');
  await p.uncheck('#f-slugsp'); await p.uncheck('#f-slugup');
  await p.waitForTimeout(400);
  ok('only the countdown is left',
     JSON.stringify(await kickers(p)) === JSON.stringify(['Up next']), await kickers(p));
  await p.check('#f-slugsp'); await p.uncheck('#f-slugnext');
  await p.waitForTimeout(400);
  ok('the countdown can be dropped too',
     JSON.stringify(await kickers(p)) === JSON.stringify(['Proudly sponsored by']),
     await kickers(p));

  console.log('\n— the extra line —');
  await p.fill('#f-slugnote', '#LivingLikeALocal'); await p.waitForTimeout(400);
  const note = await p.evaluate(() => slugCards().find(c => c.t === '#LivingLikeALocal'));
  ok('it gets a card', !!note);
  ok('under the name of the night', note && note.k === 'Living Like a Local', note && note.k);

  console.log('\n— the size slider —');
  const size = q => q.locator('#airslugt').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  const was = await size(p);
  ok('it starts at 100%', await p.locator('#f-slugscale').inputValue() === '100');
  await p.fill('#f-slugscale', '180');
  await p.dispatchEvent('#f-slugscale', 'input');
  await p.waitForTimeout(500);
  ok('the label follows the slider',
     (await p.locator('#slugscaleval').textContent()) === '180%',
     await p.locator('#slugscaleval').textContent());
  const big = await size(p);
  ok('the overlay text really grew', big > was * 1.6, [was, big]);
  ok('the audience screen grew with it', (await size(aud)) > was * 1.6,
     [was, await size(aud)]);
  await p.fill('#f-slugscale', '70');
  await p.dispatchEvent('#f-slugscale', 'input');
  await p.waitForTimeout(500);
  ok('and it goes smaller than it started', (await size(p)) < was, [was, await size(p)]);
  await p.fill('#f-slugscale', '140');
  await p.dispatchEvent('#f-slugscale', 'input');
  await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(1200);
  ok('the size survives a refresh',
     await p.evaluate(() => cfg.show.slugScale) === 1.4,
     await p.evaluate(() => cfg.show.slugScale));
  // reloading the operator closes its mirror on purpose — no orphan second screen
  ok('the reload took the mirror with it', aud.isClosed());
  [aud] = await Promise.all([ctx.waitForEvent('page'), p.click('#secondbtn')]);
  aud.on('pageerror', e => errs.push('AUD ' + e.message));
  await aud.waitForLoadState(); await aud.waitForTimeout(1000);

  console.log('\n— the logo bug —');
  ok('on by default', await p.locator('#airbug').evaluate(e => e.classList.contains('on')));
  ok('it is the brand icon, drawn not fetched',
     await p.locator('#airbug svg').count() === 1);
  ok('and nothing is painted behind it',
     await p.locator('#airbug').evaluate(e => {
       const bg = getComputedStyle(e).backgroundColor;
       return bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
     }));
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  await p.click('.tab[data-tab="media"]');
  await p.uncheck('#f-showbug'); await p.waitForTimeout(800);
  ok('the checkbox takes it off', !(await p.locator('#airbug').evaluate(e => e.classList.contains('on'))));
  ok('and the on-air bar agrees', !(await p.locator('#airbug2').isChecked()));
  ok('the audience screen follows it off',
     await aud.locator('#airbug').evaluate(e => !e.classList.contains('on')));
  await p.check('#f-showbug'); await p.waitForTimeout(700);
  ok('back on again', await aud.locator('#airbug').evaluate(e => e.classList.contains('on')));

  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close();
  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
