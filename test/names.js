const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (d !== undefined ? '  << ' + JSON.stringify(d) : ''))); };

// title, channel, expected artist, expected song
const CASES = [
  ['Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)', 'RickAstleyVEVO',
   'Rick Astley', 'Never Gonna Give You Up'],
  ['Luis Fonsi - Despacito ft. Daddy Yankee', 'LuisFonsiVEVO',
   'Luis Fonsi', 'Despacito ft. Daddy Yankee'],
  ['PSY - GANGNAM STYLE(강남스타일) M/V', 'officialpsy',
   'PSY', 'GANGNAM STYLE(강남스타일)'],
  ['Bad Bunny - Tití Me Preguntó (Official Video)', 'BadBunnyPR',
   'Bad Bunny', 'Tití Me Preguntó'],
  ['Daft Punk - Around The World [Official Music Video]', 'DaftPunkVEVO',
   'Daft Punk', 'Around The World'],
  ['Radiohead – Creep (Lyrics)', 'Radiohead',
   'Radiohead', 'Creep'],
  ['SZA - Snooze (Official Audio)', 'SZAVEVO',
   'SZA', 'Snooze'],
  ['Coldplay - Yellow (Official Video) [4K]', 'ColdplayVEVO',
   'Coldplay', 'Yellow'],
  // meaningful parentheticals must survive
  ['Fred again.. - Delilah (pull me out of this)', 'Fred again..',
   'Fred again..', 'Delilah (pull me out of this)'],
  ['Bicep - Glue (Live at Field Day)', 'BicepMusic',
   'Bicep', 'Glue (Live at Field Day)'],
  ['Aphex Twin - Windowlicker (Remix)', 'WARPrecords',
   'Aphex Twin', 'Windowlicker (Remix)'],
  // no separator at all: fall back to the channel, tidied
  ['Weightless', 'Marconi Union - Topic', 'Marconi Union', 'Weightless'],
  ['Some Instrumental (Official Video)', 'LabelVEVO', 'Label', 'Some Instrumental']
];

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__w')) {
        sessionStorage.setItem('__w', '1'); localStorage.clear();
        indexedDB.deleteDatabase('bies-event-media');
      }
    } catch (_) {}
  });
  await p.goto(APP); await p.waitForTimeout(900);

  console.log('\n— pulling artist and song out of a video title —');
  const got = await p.evaluate(cs => cs.map(c => splitTitle(c[0], c[1])), CASES);
  CASES.forEach((c, i) => {
    ok(`${c[0].slice(0, 46)}`,
       got[i].artist === c[2] && got[i].song === c[3],
       { want: [c[2], c[3]], got: [got[i].artist, got[i].song] });
  });

  console.log('\n— the real lookup, against YouTube —');
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  await p.click('.tab[data-tab="music"]'); await p.waitForTimeout(300);
  await p.fill('#ytpaste', [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/kJQP7kiw5Fk',
    '9bZkp7q19f0'
  ].join('\n'));
  await p.click('#ytadd');
  await p.waitForTimeout(7000);
  const q = await p.evaluate(() => cfg.music.map(m => [m.artist, m.song]));
  ok('all three came back named', q.every(x => x[1]), q);
  ok('Rick Astley', q[0][0] === 'Rick Astley' && q[0][1] === 'Never Gonna Give You Up', q[0]);
  ok('Luis Fonsi',  q[1][0] === 'Luis Fonsi', q[1]);
  ok('PSY',         q[2][0] === 'PSY', q[2]);
  ok('fields are filled in the rows',
     (await p.locator('#ytlist input[data-f="artist"]').first().inputValue()) === 'Rick Astley');
  ok('the look-up button goes quiet once nothing is missing',
     await p.locator('#ytnames').isDisabled());

  console.log('\n— names survive, so the queue reads right offline —');
  await p.reload(); await p.waitForTimeout(1200);
  await p.keyboard.press('e'); await p.waitForTimeout(500);
  await p.click('.tab[data-tab="music"]'); await p.waitForTimeout(400);
  ok('still named after a refresh',
     (await p.locator('#ytlist input[data-f="song"]').first().inputValue()) === 'Never Gonna Give You Up');
  ok('and still in order',
     (await p.evaluate(() => cfg.music.map(m => m.vid).join(','))) === 'dQw4w9WgXcQ,kJQP7kiw5Fk,9bZkp7q19f0');

  console.log('\n— editing a name by hand sticks —');
  await p.locator('#ytlist input[data-f="song"]').first().fill('Never Gonna Give You Up (edit)');
  await p.waitForTimeout(400);
  ok('typed name saved', (await p.evaluate(() => cfg.music[0].song)) === 'Never Gonna Give You Up (edit)');

  ok('no errors', errs.length === 0, errs.slice(0, 4));
  await ctx.close(); await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FATAL ' + e.stack); process.exit(1); });
