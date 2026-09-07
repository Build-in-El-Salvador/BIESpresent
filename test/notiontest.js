const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
const fs = require('fs');
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };
/* The real thing, copied out of the BIES Notion itinerary: tab-separated,
   times in three different shapes, a "1 hour" duration, and two continuation
   lines with no time of their own. Every parser rule exists because of a row
   in here. */
const PASTE = fs.readFileSync(require('path').join(__dirname, 'assets', 'notion-paste.txt'), 'utf8');

(async () => {
  const b = await chromium.launch({channel:'chrome'});
  const ctx = await b.newContext({viewport:{width:1600,height:1000}});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  p.on('dialog', d => d.accept());
  await p.goto(APP); await p.waitForTimeout(700);

  console.log('\n— the real Notion three-column paste —');
  await p.click('.tab[data-tab="segments"]'); await p.waitForTimeout(200);
  await p.locator('#pastewrap summary').click(); await p.waitForTimeout(200);
  await p.fill('#pastebox', PASTE); await p.waitForTimeout(400);
  const note = await p.locator('#parsenote').textContent();
  ok('preview counts 13 segments', note.includes('13 segments'), note);
  ok('preview mentions the folded note', note.includes('1 with a note'), note);
  await p.click('#parsebtn'); await p.waitForTimeout(600);

  const got = await p.evaluate(()=>{
    const s = schedule();
    return { titles: cfg.segments.map(x=>x.title),
             times:  cfg.segments.map((_,i)=>clockStr(s.starts[i])),
             notes:  cfg.segments.map(x=>x.note||''),
             start:  cfg.start, end: clockStr(s.ends[s.ends.length-1]) };
  });
  ok('no duration text became a title',
     !got.titles.some(x=>/^\d+\s*(min|hour)/i.test(x)), got.titles.join(' / '));
  ok('no bracketed time became a title',
     !got.titles.some(x=>/^\[/.test(x)), got.titles.join(' / '));
  ok('starts 4:00 PM', got.start==='16:00', got.start);
  ok('every time matches the sheet',
     got.times.join(',')===['4:00 PM','5:00 PM','6:00 PM','6:15 PM','6:30 PM','6:45 PM','7:00 PM',
       '7:15 PM','7:30 PM','7:35 PM','8:30 PM','9:00 PM','9:30 PM'].join(','), got.times.join(','));
  ok('9:30 with no am/pm read as the evening', got.times[12]==='9:30 PM', got.times[12]);
  ok('sub-lines folded onto Doors open',
     got.notes[1]==='Guests arrive/Host greets · Appetizers/Networking', JSON.stringify(got.notes[1]));
  ok('they did not become segments',
     !got.titles.includes('Guests arrive/Host greets'), got.titles.join(' / '));
  ok('night ends 10:00 PM', got.end==='10:00 PM', got.end);

  console.log('\n— the display shows time and item only —');
  await p.click('#startbtn'); await p.waitForTimeout(500);
  await p.evaluate(()=>{ rt.pinned='itinerary'; tick(); }); await p.waitForTimeout(400);
  const rows = await p.$$eval('#itin .row', ns => ns.map(n => n.textContent.trim()));
  ok('no minute counts anywhere in the itinerary',
     !rows.some(r=>/\d+\s*MIN/i.test(r)), rows.filter(r=>/MIN/i.test(r)).join(' | ') || '(none)');
  ok('titles still there', rows.some(r=>r.includes('Speaker 1')), rows[4]);

  console.log('\n— the note shows under the live segment —');
  await p.evaluate(()=>{
    const now=new Date(); const d=new Date(now.getTime()-30*60000);   // 30 min into Doors open
    cfg.date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const s=new Date(d.getTime()-60*60000);
    cfg.start=`${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`;
    save(); tick();
  });
  await p.waitForTimeout(400);
  ok('now showing Doors open', (await p.locator('#nowtitle').textContent())==='Doors open',
     await p.locator('#nowtitle').textContent());
  ok('note rendered beneath it',
     (await p.locator('#nownote').textContent()).includes('Appetizers'),
     await p.locator('#nownote').textContent());

  console.log('\n— saving —');
  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="event"]'); await p.waitForTimeout(200);
  await p.fill('#f-name', 'Founders Dinner'); await p.waitForTimeout(500);
  ok('name saved as it was typed',
     (await p.evaluate(()=>JSON.parse(localStorage.getItem('bies-event-screen-v1')).name))==='Founders Dinner',
     await p.evaluate(()=>JSON.parse(localStorage.getItem('bies-event-screen-v1')).name));
  ok('a Saved marker appeared',
     await p.locator('#savednote').evaluate(e=>e.classList.contains('on')));

  // the exact thing that failed: change it and refresh without closing the editor
  await p.fill('#f-name', 'Bitcoin Mastermind'); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(900);
  ok('survives a refresh with the editor still open',
     (await p.evaluate(()=>cfg.name))==='Bitcoin Mastermind', await p.evaluate(()=>cfg.name));
  ok('and reaches the board', (await p.locator('#ident').textContent()).includes('Bitcoin Mastermind'),
     await p.locator('#ident').textContent());

  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="event"]'); await p.waitForTimeout(200);
  await p.fill('#f-code', 'MM20260910'); await p.waitForTimeout(300);
  await p.click('#savebtn'); await p.waitForTimeout(300);
  ok('the Save button works too',
     (await p.evaluate(()=>JSON.parse(localStorage.getItem('bies-event-screen-v1')).code))==='MM20260910');

  console.log('\n— notes stay editable —');
  await p.click('.tab[data-tab="segments"]'); await p.waitForTimeout(300);
  const nf = p.locator('.segrow[data-i="1"] input[data-f="note"]');
  ok('note field carries the pasted text',
     (await nf.inputValue()).includes('Appetizers'), await nf.inputValue());
  await nf.fill('Drinks and hellos'); await p.waitForTimeout(400);
  ok('editing a note sticks', (await p.evaluate(()=>cfg.segments[1].note))==='Drinks and hellos');
  ok('editing a note does not steal focus',
     await p.evaluate(()=>document.activeElement.dataset.f==='note'));
  ok('no errors', errs.length===0, errs.join(' | '));

  await p.screenshot({path:'shot-notion.png'});
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
