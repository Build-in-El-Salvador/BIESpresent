const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };


// the time cell is a picker now, not a text field
async function setTime(p, i, h, m, ap) {
  await p.locator(`.segrow[data-i="${i}"] .clock`).click();
  await p.waitForTimeout(200);
  await p.locator(`#timepop .col[data-part="h"] button[data-v="${h}"]`).click();
  await p.waitForTimeout(150);
  await p.locator(`#timepop .col[data-part="m"] button[data-v="${m}"]`).click();
  await p.waitForTimeout(150);
  await p.locator(`#timepop .col[data-part="ap"] button[data-v="${ap}"]`).click();
  await p.waitForTimeout(250);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
}

(async () => {
  const b = await chromium.launch({channel:'chrome'});
  const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(700);
  await p.click('.tab[data-tab="segments"]'); await p.waitForTimeout(200);

  const parse = s => p.evaluate(t => {
    const g = parseSchedule(t);
    return g && { start:g.start, titles:g.segments.map(x=>x.title),
                  mins:g.segments.map(x=>x.min), brks:g.segments.map(x=>!!x.brk) };
  }, s);

  console.log('\n— the shapes Notion and Docs actually produce —');

  let r = await parse("Time\tSegment\n6:30 PM\tDoors open\n7:00 PM\tWelcome\n7:15 PM\tSpeaker\n8:00 PM\tBreak\n9:15 PM\tClose");
  ok('notion table (tabs)', r.start==='18:30' && JSON.stringify(r.mins)==='[30,15,45,75,15]',
     JSON.stringify(r));

  r = await parse("| Time | Segment |\n|---|---|\n| 6:30 PM | Doors open |\n| 7:00 PM | Welcome |\n| 7:30 PM | Talk |");
  ok('markdown table with leading pipes', r.titles.join()==='Doors open,Welcome,Talk',
     JSON.stringify(r.titles));

  r = await parse("• 6:30 PM — Doors open\n• 7:00 PM — Welcome\n• 7:30 PM — Main talk");
  ok('bulleted list', r.titles.join()==='Doors open,Welcome,Main talk' && r.start==='18:30',
     JSON.stringify(r));

  r = await parse("1. Doors open | 30\n2. Welcome | 10\n3. Coffee break | 15");
  ok('numbered list', r.titles.join()==='Doors open,Welcome,Coffee break'
     && JSON.stringify(r.mins)==='[30,10,15]', JSON.stringify(r));

  console.log('\n— time ranges —');
  r = await parse("6:30 PM - 7:00 PM  Doors open\n7:15 PM - 7:45 PM  Welcome\n8:00 PM - 8:15 PM  Break");
  ok('ranges give their own length', JSON.stringify(r.mins)==='[30,30,15]', JSON.stringify(r.mins));
  ok('gaps between blocks are not absorbed', r.titles.join()==='Doors open,Welcome,Break',
     JSON.stringify(r.titles));
  ok('break still detected', JSON.stringify(r.brks)==='[false,false,true]', JSON.stringify(r.brks));

  r = await parse("6:30 – 7:00 PM  Doors open\n7:00 – 7:30 PM  Welcome");
  ok('meridiem only on the end time', r.start==='18:30' && JSON.stringify(r.mins)==='[30,30]',
     JSON.stringify(r));

  r = await parse("18:30-19:00 Doors open\n19:00-19:45 Talk");
  ok('24h ranges', r.start==='18:30' && JSON.stringify(r.mins)==='[30,45]', JSON.stringify(r));

  r = await parse("11:45 PM - 12:15 AM  Countdown\n12:15 AM - 1:00 AM  Party");
  ok('crossing midnight', JSON.stringify(r.mins)==='[30,45]', JSON.stringify(r.mins));

  console.log('\n— a plain dash is a separator, not a range —');
  r = await parse("7:00 PM - Welcome\n7:30 PM - Main talk");
  ok('dash before a title', r.titles.join()==='Welcome,Main talk', JSON.stringify(r.titles));

  console.log('\n— manual editing is untouched —');
  await p.waitForTimeout(200);
  ok('the segment list is still there', (await p.locator('.segrow').count())===9,
     String(await p.locator('.segrow').count()));
  ok('paste box starts collapsed', !(await p.locator('#pastewrap').evaluate(e=>e.open)));
  await p.locator('#addseg').click(); await p.waitForTimeout(250);
  ok('add segment still works', (await p.locator('.segrow').count())===10);
  await setTime(p, 0, '6', '00', 'PM');
  ok('time editing still works', (await p.evaluate(()=>cfg.start))==='18:00',
     await p.evaluate(()=>cfg.start));

  console.log('\n— live preview before committing —');
  await p.locator('#pastewrap summary').click(); await p.waitForTimeout(200);
  await p.fill('#pastebox', "6:30 PM Doors\n7:00 PM Welcome\n7:30 PM Break\n8:00 PM Close");
  await p.waitForTimeout(300);
  const note = await p.locator('#parsenote').textContent();
  ok('preview counts the segments', note.includes('4 segments'), note);
  ok('preview shows the total', /1h 45m/.test(note), note);
  ok('preview flags the break', note.includes('1 break'), note);
  ok('nothing replaced yet', (await p.locator('.segrow').count())===10,
     String(await p.locator('.segrow').count()));

  p.on('dialog', d => d.accept());
  await p.click('#parsebtn'); await p.waitForTimeout(500);
  ok('committing replaces the list', (await p.locator('.segrow').count())===4,
     String(await p.locator('.segrow').count()));
  ok('and collapses the paste box', !(await p.locator('#pastewrap').evaluate(e=>e.open)));
  ok('pasted rows are still hand-editable',
     await p.locator('.segrow[data-i="1"] input[data-f="title"]').evaluate(e=>!e.disabled));
  ok('no errors', errs.length===0, errs.join('|'));

  await p.click('.tab[data-tab="segments"]');
  await p.locator('#pastewrap summary').click(); await p.waitForTimeout(300);
  await p.screenshot({path:'shot-paste.png'});
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
