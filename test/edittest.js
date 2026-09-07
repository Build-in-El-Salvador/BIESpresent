const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };

const CFG = {
  name:'Social Night', code:'SN20260902', date:'2026-09-02', start:'18:30',
  segments:[{title:"Doors open · Registration",min:30},{title:"Refreshments & mingling",min:30},
    {title:"Welcome — MC opens",min:10},{title:"Main talk",min:25},{title:"Q&A",min:15},
    {title:"Break",min:15,brk:true},{title:"Announcements & upcoming events",min:10},
    {title:"Open networking",min:45},{title:"Close & goodnight",min:15}],
  overrides:{},extra:{},anchorSlip:0,
  qr:{title:'Join',url:'https://buildinelsalvador.com/join',cap:'Scan'},
  sponsors:[], upcoming:[{when:'Sep 10',what:'Mastermind',meta:'MM20260910'}], dwell1:30, dwell2:12
};

async function open(b, at='2026-09-02T19:50:00') {
  const ctx = await b.newContext({ viewport:{width:1920,height:1080} });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.addInitScript(([when,c])=>{
    const RD=Date, rn=Date.now.bind(Date), T=new RD(when).getTime(), t0=rn();
    const f=()=>T+(rn()-t0);
    window.Date=class extends RD{constructor(...a){a.length?super(...a):super(f())}static now(){return f()}};
    localStorage.setItem('bies-event-screen-v1', c);
  },[at, JSON.stringify(CFG)]);
  await p.goto(APP); await p.waitForTimeout(600);
  return { p, ctx, errs };
}

(async () => {
  const b = await chromium.launch({ channel:'chrome' });

  console.log('\n— the way out is findable —');
  { const {p,ctx,errs} = await open(b);
    await p.waitForTimeout(300);
    ok('controls visible right after boot',
       await p.locator('#controls').evaluate(e=>getComputedStyle(e).opacity==='1'));
    await p.waitForTimeout(8500);
    ok('they fade away on their own',
       await p.locator('#controls').evaluate(e=>getComputedStyle(e).opacity==='0'));
    await p.mouse.move(900,500); await p.waitForTimeout(500);
    ok('a mouse nudge brings them back',
       await p.locator('#controls').evaluate(e=>getComputedStyle(e).opacity==='1'));
    await p.click('#editbtn'); await p.waitForTimeout(400);
    ok('Edit tonight opens the editor',
       await p.locator('#setup').evaluate(e=>e.classList.contains('live')));
    ok('button says Back to the screen mid-event',
       (await p.locator('#startbtn').textContent()).includes('Back to the screen'),
       await p.locator('#startbtn').textContent());
    ok('live strip shows what the room sees',
       await p.locator('#livestrip').evaluate(e=>e.classList.contains('on')));
    ok('live strip names the segment',
       (await p.locator('#livenow').textContent()).includes('Main talk'),
       await p.locator('#livenow').textContent());
    ok('live strip counts down',
       /^\d\d:\d\d$/.test((await p.locator('#livecd').textContent()).trim()),
       await p.locator('#livecd').textContent());
    await p.click('#startbtn'); await p.waitForTimeout(400);
    ok('and it closes again',
       !(await p.locator('#setup').evaluate(e=>e.classList.contains('live'))));
    ok('no errors', errs.length===0, errs.join('|'));
    await ctx.close(); }

  console.log('\n— editing mid-event keeps tonight\'s slip —');
  { const {p,ctx,errs} = await open(b);
    // fall 15 minutes behind during the main talk
    await p.keyboard.press('='); await p.keyboard.press('='); await p.keyboard.press('=');
    await p.waitForTimeout(300);
    const beforeEnd = await p.locator('#countsub').textContent();
    ok('main talk now ends 8:20 PM', beforeEnd.includes('8:20'), beforeEnd);

    await p.keyboard.press('e'); await p.waitForTimeout(400);
    // delete Q&A (row index 4), the segment after the live one
    await p.locator('.segrow[data-i="4"] .del').click();
    await p.waitForTimeout(300);
    const st = await p.evaluate(()=>({ n:cfg.segments.length, extra:JSON.stringify(cfg.extra),
                                       titles:cfg.segments.map(s=>s.title) }));
    ok('a segment was removed', st.n===8, String(st.n));
    ok('Q&A is the one that went', !st.titles.includes('Q&A'), st.titles.join(','));
    ok('the +15 stayed on the main talk', st.extra==='{"3":15}', st.extra);
    await p.click('#startbtn'); await p.waitForTimeout(400);
    ok('still showing the main talk',
       (await p.locator('#nowtitle').textContent())==='Main talk',
       await p.locator('#nowtitle').textContent());
    ok('and still ending 8:20 PM',
       (await p.locator('#countsub').textContent()).includes('8:20'),
       await p.locator('#countsub').textContent());
    ok('no errors', errs.length===0, errs.join('|'));
    await ctx.close(); }

  console.log('\n— inserting a segment before the live one —');
  { const {p,ctx} = await open(b);
    await p.keyboard.press('='); await p.keyboard.press('=');   // +10 on the main talk
    await p.keyboard.press('e'); await p.waitForTimeout(400);
    await p.locator('.segrow[data-i="1"] .ins').click();        // insert high up the list
    await p.waitForTimeout(300);
    const st = await p.evaluate(()=>({ n:cfg.segments.length, extra:JSON.stringify(cfg.extra) }));
    ok('segment inserted', st.n===10, String(st.n));
    ok('the +10 followed the main talk down to index 4', st.extra==='{"4":10}', st.extra);
    await p.click('#startbtn'); await p.waitForTimeout(400);
    ok('still on the main talk', (await p.locator('#nowtitle').textContent())==='Main talk',
       await p.locator('#nowtitle').textContent());
    await ctx.close(); }

  console.log('\n— reorder + guard rails —');
  { const {p,ctx} = await open(b);
    const m = await p.evaluate(() => {
      const r = {};
      r.move  = JSON.stringify(moveMap(5, 1, 3));
      r.del   = JSON.stringify(deleteMap(5, 2));
      r.ins   = JSON.stringify(insertMap(5, 2));
      return r;
    });
    ok('moveMap 1->3 shifts the span', m.move==='{"0":0,"1":3,"2":1,"3":2,"4":4}', m.move);
    ok('deleteMap drops and closes up', m.del==='{"0":0,"1":1,"2":-1,"3":2,"4":3}', m.del);
    ok('insertMap opens a gap', m.ins==='{"0":0,"1":1,"2":3,"3":4,"4":5}', m.ins);

    await p.keyboard.press('e'); await p.waitForTimeout(300);
    const n0 = await p.evaluate(()=>cfg.segments.length);
    for (let i=0;i<n0;i++) {
      const row = p.locator('.segrow .del').first();
      if (await row.count()) { await row.click(); await p.waitForTimeout(60); }
    }
    ok('never deletes the last segment', (await p.evaluate(()=>cfg.segments.length))===1,
       String(await p.evaluate(()=>cfg.segments.length)));
    await ctx.close(); }

  console.log('\n— changing the start time mid-event does not wipe the night —');
  { const {p,ctx} = await open(b);
    await p.keyboard.press('='); await p.keyboard.press('=');
    await p.waitForTimeout(200);
    const before = await p.evaluate(()=>JSON.stringify(cfg.extra));
    await p.keyboard.press('e'); await p.waitForTimeout(300);
    ok('opens on the Schedule tab mid-event',
       await p.locator('.pane[data-pane="segments"]').evaluate(e=>e.classList.contains('on')));
    await p.click('.tab[data-tab="event"]'); await p.waitForTimeout(200);
    await p.fill('#f-start', '18:45'); await p.waitForTimeout(400);
    const after = await p.evaluate(()=>JSON.stringify(cfg.extra));
    ok('slip survived the edit', before===after && after!=='{}', `${before} -> ${after}`);
    await ctx.close(); }

  console.log('\n— controls stay reachable over blackout and breaks —');
  { const {p,ctx} = await open(b, '2026-09-02T20:25:00');
    await p.waitForTimeout(300);
    ok('break takeover is up', await p.locator('#breakview').evaluate(e=>e.classList.contains('live')));
    await p.mouse.move(800,400); await p.waitForTimeout(400);
    const z = await p.evaluate(()=>({
      ctl:+getComputedStyle(document.querySelector('#controls')).zIndex,
      brk:+getComputedStyle(document.querySelector('#breakview')).zIndex,
      blk:+getComputedStyle(document.querySelector('#blackout')).zIndex }));
    ok('controls sit above the break layer', z.ctl>z.brk, JSON.stringify(z));
    ok('controls sit above blackout', z.ctl>z.blk, JSON.stringify(z));
    await p.click('#editbtn'); await p.waitForTimeout(400);
    ok('editable from inside a break',
       await p.locator('#setup').evaluate(e=>e.classList.contains('live')));
    await p.screenshot({path:'shot-editor-live.png'});
    await ctx.close(); }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
