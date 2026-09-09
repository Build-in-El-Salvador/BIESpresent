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
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => {
    if (m.type() !== 'error') return;
    // The queue deliberately includes a made-up video id to exercise the shorts
    // parser, and YouTube answers 404. Chrome logs that whether or not the page
    // handles it, so it is noise here — but only from youtube.com.
    const from = (m.location() && m.location().url) || '';
    if (/youtube\.com/.test(from)) return;
    errs.push(m.text() + ' @ ' + from);
  });
  // start from nothing so counts are predictable
  await p.addInitScript(() => {
    // once, on the first load — not on the reload the test later depends on
    try {
      if (!sessionStorage.getItem('__wiped')) {
        sessionStorage.setItem('__wiped', '1');
        localStorage.clear();
        indexedDB.deleteDatabase('bies-event-media');
      }
    } catch (_) {}
  });
  await p.goto(APP);
  await p.waitForTimeout(900);

  console.log('\n— a PDF goes straight in —');
  await p.click('.tab[data-tab="decks"]');
  await p.setInputFiles('#f-deckpdf', [A('deck.pdf')]);
  await p.waitForTimeout(900);
  ok('deck listed', await p.locator('#decklist .mrow').count() === 1);
  ok('tagged PDF', (await p.locator('#decklist .tag').first().textContent()).trim() === 'PDF');
  ok('named from the file', (await p.locator('#decklist input[data-f="name"]').first().inputValue()) === 'deck');
  ok('preview mounts the pdf viewer', await p.locator('#dkpic embed').count() === 1);
  ok('viewer chrome switched off',
     (await p.locator('#dkpic embed').getAttribute('src')).includes('toolbar=0'));
  await p.click('#dksend');
  await p.waitForTimeout(700);
  ok('pdf on air', await p.locator('#airstage embed').count() === 1);
  ok('air bar names it', /deck/.test(await p.locator('#airwhat').textContent()));

  console.log('\n— a .pptx is logged, not pretended —');
  await p.setInputFiles('#f-deckraw', [A('deck.pptx')]);
  await p.waitForTimeout(600);
  const tags = await p.locator('#decklist .tag').allTextContents();
  ok('second row added', await p.locator('#decklist .mrow').count() === 2);
  ok('marked needs converting', tags.some(t => t.includes('needs converting')), tags);
  ok('its preview button is disabled',
     await p.locator('#decklist .mrow').nth(1).locator('.pv').isDisabled());

  console.log('\n— photos and a clip —');
  await p.click('.tab[data-tab="media"]');
  await p.setInputFiles('#f-mediaimg', [A('slide-1.png'), A('slide-2.png'), A('slide-3.png')]);
  await p.waitForTimeout(900);
  ok('three photos listed', await p.locator('#medialist .mrow').count() === 3);
  await p.setInputFiles('#f-mediavid', [A('clip.webm')]);
  await p.waitForTimeout(900);
  ok('clip listed too', await p.locator('#medialist .mrow').count() === 4);
  ok('clip tagged video',
     (await p.locator('#medialist .mrow').nth(3).locator('.tag').textContent()).trim() === 'video');
  ok('preview shows a video element', await p.locator('#mdpic video').count() === 1);
  ok('transport buttons appeared', await p.locator('#mdplay').isVisible());

  console.log('\n— reordering the reel —');
  const before = await p.locator('#medialist input[data-f="name"]').nth(0).inputValue();
  await p.locator('#medialist .mrow').nth(1).locator('.up').click();
  await p.waitForTimeout(400);
  ok('row moved up',
     (await p.locator('#medialist input[data-f="name"]').nth(0).inputValue()) !== before);

  console.log('\n— sending a clip —');
  await p.locator('#medialist .mrow').nth(3).locator('.pv').click();
  await p.waitForTimeout(400);
  await p.click('#mdsend');
  await p.waitForTimeout(900);
  ok('video mounted on the board', await p.locator('#airstage video').count() === 1);
  ok('and it is playing', await p.locator('#airstage video').evaluate(v => !v.paused));
  await p.click('#mdplay');
  await p.waitForTimeout(600);
  ok('pause reaches it', await p.locator('#airstage video').evaluate(v => v.paused));

  console.log('\n— the countdown overlay —');
  ok('slug hidden by default', !(await p.locator('#airslug').evaluate(e => e.classList.contains('on'))));
  await p.click('#airoverlay');
  await p.waitForTimeout(600);
  ok('slug on', await p.locator('#airslug').evaluate(e => e.classList.contains('on')));
  // The overlay cycles, so pin it to the countdown card before reading it —
  // otherwise this passes or fails on which card happened to be up.
  await p.evaluate(() => {
    cfg.show.slugSponsors = false; cfg.show.slugUpcoming = false; save(); tick();
  });
  await p.waitForTimeout(400);
  const slugT = await p.locator('#airslugt').textContent();
  ok('slug carries the next segment', slugT.length > 0, slugT);
  ok('slug carries a countdown', /\d/.test(await p.locator('#airslugc').textContent()));
  await p.evaluate(() => {
    cfg.show.slugSponsors = true; cfg.show.slugUpcoming = true; save(); tick();
  });

  console.log('\n— the photo reel —');
  await p.fill('#f-interval', '2');
  await p.waitForTimeout(200);
  await p.click('#reelstart');
  await p.waitForTimeout(600);
  const k1 = await p.evaluate(() => rt.air.key);
  ok('reel started on a photo', k1.startsWith('reel:'), k1);
  await p.waitForTimeout(2600);
  const k2 = await p.evaluate(() => rt.air.key);
  ok('it moved on by itself', k2 !== k1, [k1, k2]);
  await p.click('#reelstop');
  await p.waitForTimeout(600);
  ok('stop clears the wall', await p.evaluate(() => !rt.air));

  console.log('\n— the music queue —');
  await p.click('.tab[data-tab="music"]');
  await p.fill('#ytpaste', [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/9bZkp7q19f0?t=30',
    'kJQP7kiw5Fk',
    'https://www.youtube.com/shorts/abcdefghijk',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'not a link at all'
  ].join('\n'));
  await p.click('#ytadd');
  await p.waitForTimeout(600);
  ok('four queued, duplicate dropped', await p.locator('#ytlist .mrow').count() === 4,
     await p.locator('#ytlist .mrow').count());
  const ids = await p.evaluate(() => cfg.music.map(m => m.vid));
  ok('watch link parsed', ids[0] === 'dQw4w9WgXcQ', ids);
  ok('youtu.be with a timestamp parsed', ids[1] === '9bZkp7q19f0', ids);
  ok('a bare id is taken as one', ids[2] === 'kJQP7kiw5Fk', ids);
  ok('a short parsed', ids[3] === 'abcdefghijk', ids);

  await p.evaluate(() => { window.__opened = null; window.open = u => { window.__opened = u; return null; }; });
  await p.click('#ytopen');
  await p.waitForTimeout(300);
  const url = await p.evaluate(() => window.__opened);
  ok('opens one ad-hoc playlist', /watch_videos\?video_ids=/.test(url || ''), url);
  ok('in queue order', (url || '').endsWith('dQw4w9WgXcQ,9bZkp7q19f0,kJQP7kiw5Fk,abcdefghijk'), url);

  await p.locator('#ytlist .mrow').nth(0).locator('.dn').click();
  await p.waitForTimeout(400);
  ok('reordering sticks', (await p.evaluate(() => cfg.music[0].vid)) === '9bZkp7q19f0');
  await p.locator('#ytlist .mrow').nth(0).locator('.del').click();
  await p.waitForTimeout(400);
  ok('deleting sticks', await p.locator('#ytlist .mrow').count() === 3);

  await p.fill('#ytq', 'lofi beats');
  await p.click('#ytsearch');
  await p.waitForTimeout(300);
  ok('search opens a real YouTube tab',
     /results\?search_query=lofi%20beats/.test(await p.evaluate(() => window.__opened)));

  console.log('\n— local audio —');
  await p.setInputFiles('#f-audio', [A('tone.wav')]);
  await p.waitForTimeout(800);
  ok('track listed', await p.locator('#aulist .mrow').count() === 1);
  await p.locator('#aulist .pl').click();
  await p.waitForTimeout(900);
  ok('an audio element is playing',
     await p.evaluate(() => !!auEl && !!auEl.src && !auEl.paused));
  ok('nothing went to the wall', await p.evaluate(() => !rt.air));
  await p.click('#auplay');
  await p.waitForTimeout(500);
  ok('the same button pauses it', await p.evaluate(() => auEl.paused));

  console.log('\n— it all survives a refresh —');
  await p.locator('#medialist').count();
  await p.click('.tab[data-tab="decks"]');
  await p.locator('#decklist .mrow').first().locator('.pv').click();
  await p.waitForTimeout(300);
  await p.click('#dksend');
  await p.waitForTimeout(700);
  const liveKey = await p.evaluate(() => rt.air.key);
  await p.reload();
  await p.waitForTimeout(1400);
  await p.keyboard.press('e');
  await p.waitForTimeout(600);
  await p.click('.tab[data-tab="decks"]');
  await p.waitForTimeout(300);
  ok('decks still there', await p.locator('#decklist .mrow').count() === 2);
  await p.click('.tab[data-tab="media"]');
  await p.waitForTimeout(300);
  ok('media still there', await p.locator('#medialist .mrow').count() === 4);
  await p.click('.tab[data-tab="music"]');
  await p.waitForTimeout(300);
  ok('queue still there', await p.locator('#ytlist .mrow').count() === 3);
  ok('still knows what is on the wall', await p.evaluate(() => rt.air && rt.air.key) === liveKey);
  ok('and re-mounted it', await p.locator('#airstage').evaluate(e => e.children.length === 1));

  console.log('\n— clean console —');
  ok('no errors anywhere', errs.length === 0, errs.slice(0, 5));

  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
