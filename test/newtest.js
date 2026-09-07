const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };

const CFG = {name:'Social Night',code:'SN20260902',date:'2026-09-02',start:'18:30',
  segments:[{title:"Doors open · Registration",min:30},{title:"Refreshments & mingling",min:30},
    {title:"Welcome — MC opens",min:10},{title:"Main talk",min:25},{title:"Q&A",min:15},
    {title:"Break",min:15,brk:true},{title:"Announcements & upcoming events",min:10},
    {title:"Open networking",min:45},{title:"Close & goodnight",min:15}],
  overrides:{},extra:{},anchorSlip:0,
  qr:{title:'Join',url:'https://buildinelsalvador.com/join',cap:'Scan'},
  sponsors:[],upcoming:[{when:'Sep 10',what:'Mastermind',meta:'MM20260910'}],dwell1:30,dwell2:12};

const clockShim = ([w,c]) => {
  const RD=Date, rn=Date.now.bind(Date), T=new RD(w).getTime(), t0=rn(), f=()=>T+(rn()-t0);
  window.Date=class extends RD{constructor(...a){a.length?super(...a):super(f())}static now(){return f()}};
  if (c) localStorage.setItem('bies-event-screen-v1', c);
};

async function ctxPage(b, at='2026-09-02T19:50:00', cfg=CFG, url=APP) {
  const ctx = await b.newContext({viewport:{width:1600,height:900}});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.addInitScript(clockShim, [at, cfg?JSON.stringify(cfg):null]);
  await p.goto(url); await p.waitForTimeout(600);
  return {p, ctx, errs};
}
const toSched = async p => { await p.keyboard.press('e'); await p.waitForTimeout(300);
  await p.click('.tab[data-tab="segments"]'); await p.waitForTimeout(250); };


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

  console.log('\n— 1. editing a start time restates the previous segment —');
  { const {p,ctx,errs} = await ctxPage(b); await toSched(p);
    ok('times open a picker, not a text field',
       await p.locator('.segrow[data-i="3"] .clock').evaluate(e=>e.tagName==='BUTTON'));
    ok('shows 7:40 PM for the main talk',
       (await p.locator('.segrow[data-i="3"] .clock').textContent()).trim()==='7:40 PM',
       await p.locator('.segrow[data-i="3"] .clock').textContent());
    // push the main talk's start from 7:40 to 7:50
    await setTime(p, 3, '7', '50', 'PM');
    const st = await p.evaluate(()=>cfg.segments.map(s=>s.min));
    ok('MC segment stretched 10 -> 20 min', st[2]===20, JSON.stringify(st.slice(0,5)));
    ok('main talk length untouched', st[3]===25, String(st[3]));
    ok('Q&A slid to 8:15',
       (await p.locator('.segrow[data-i="4"] .clock').textContent()).trim()==='8:15 PM',
       await p.locator('.segrow[data-i="4"] .clock').textContent());
    // pulling a time earlier shortens the previous segment
    await setTime(p, 3, '7', '35', 'PM');
    ok('MC segment shrank to 5 min', (await p.evaluate(()=>cfg.segments[2].min))===5,
       String(await p.evaluate(()=>cfg.segments[2].min)));
    // row 0 sets the night's start
    await setTime(p, 0, '6', '00', 'PM');
    ok('row 0 moves the whole night', (await p.evaluate(()=>cfg.start))==='18:00',
       await p.evaluate(()=>cfg.start));
    ok('no errors', errs.length===0, errs.join('|'));
    await ctx.close(); }

  console.log('\n— 2. ops codes never reach the screen —');
  { const {p,ctx} = await ctxPage(b);
    await p.keyboard.press('e'); await p.waitForTimeout(300);
    await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(200);
    await p.fill('#f-upcoming',
      'Sep 10 | Mastermind | MM20260910\nSep 25 | Oriente Tour | EX20260925 · 3 days\nOct 6 | Bitcoin 101 | PG20261006');
    await p.click('#startbtn'); await p.waitForTimeout(400);
    const stored = await p.evaluate(()=>JSON.stringify(cfg.upcoming));
    ok('codes stripped on parse', !/\d{8}/.test(stored), stored);
    ok('useful detail survives', stored.includes('3 days'), stored);
    await p.keyboard.press('2'); await p.waitForTimeout(600);
    const shown = await p.locator('#upnext').textContent();
    ok('nothing code-shaped on the panel', !/(SN|NN|MK|MM|EX|PG)\d{8}/.test(shown), shown.trim());
    ok('event name still shown', shown.includes('Oriente Tour'));
    // and a code smuggled in via an imported file is still blocked at render
    await p.evaluate(()=>{ cfg.upcoming=[{when:'Sep 25',what:'Tour EX20260925',meta:'EX20260925'}]; tick(); });
    await p.waitForTimeout(300);
    ok('import route blocked too',
       !/(EX)\d{8}/.test(await p.locator('#upnext').textContent()),
       (await p.locator('#upnext').textContent()).trim());
    await ctx.close(); }

  console.log('\n— 3. pasting a run of show —');
  { const {p,ctx} = await ctxPage(b); await toSched(p);
    p.on('dialog', d => d.accept());
    await p.evaluate(()=>{ document.querySelector('#pastewrap').open = true; });
    await p.waitForTimeout(200);
    await p.fill('#pastebox',
      'Time\tSegment\n6:30 PM\tDoors open\n7:00 PM\tWelcome\n7:15 PM\tSpeaker\n8:00 PM\tBreak\n8:20 PM\tPanel\n9:15 PM\tClose');
    await p.click('#parsebtn'); await p.waitForTimeout(500);
    const st = await p.evaluate(()=>({n:cfg.segments.length, start:cfg.start,
      mins:cfg.segments.map(s=>s.min), brks:cfg.segments.map(s=>!!s.brk),
      titles:cfg.segments.map(s=>s.title)}));
    ok('header row dropped', st.n===6, `${st.n}: ${st.titles.join(',')}`);
    ok('start read as 18:30', st.start==='18:30', st.start);
    ok('durations from the gaps', JSON.stringify(st.mins)==='[30,15,45,20,55,15]', JSON.stringify(st.mins));
    ok('break auto-detected', JSON.stringify(st.brks)==='[false,false,false,true,false,false]',
       JSON.stringify(st.brks));
    // the other supported shape: title + duration
    await p.evaluate(()=>{ document.querySelector('#pastewrap').open = true; });
    await p.waitForTimeout(200);
    await p.fill('#pastebox', 'Doors open | 30\nWelcome, 10\nMain talk — 25 min\nCoffee break | 15');
    await p.click('#parsebtn'); await p.waitForTimeout(500);
    const st2 = await p.evaluate(()=>({mins:cfg.segments.map(s=>s.min),
      titles:cfg.segments.map(s=>s.title), brks:cfg.segments.map(s=>!!s.brk)}));
    ok('durations read directly', JSON.stringify(st2.mins)==='[30,10,25,15]', JSON.stringify(st2.mins));
    ok('titles cleaned of separators', st2.titles[2]==='Main talk', JSON.stringify(st2.titles));
    ok('coffee break flagged', st2.brks[3]===true, JSON.stringify(st2.brks));
    await ctx.close(); }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
