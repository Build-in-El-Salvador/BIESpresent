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
  qr:{title:'Join the community',url:'https://buildinelsalvador.com/join',cap:'Scan to join the BIES WhatsApp group'},
  sponsors:[], upcoming:[{when:'Sep 10',what:'Mastermind',meta:'MM20260910'},
                         {when:'Sep 17',what:'Networking Night',meta:'NN20260917'}],
  dwell1:30, dwell2:12
};

async function page(b, at='2026-09-02T19:42:30', cfg=CFG) {
  const ctx = await b.newContext({ viewport:{width:1920,height:1080} });
  const p = await ctx.newPage();
  const errs=[], net=[];
  p.on('pageerror', e=>errs.push('PAGEERROR '+e.message));
  p.on('console', m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text()); });
  p.on('request', r=>{ if(!r.url().startsWith('file://')) net.push(r.url()); });
  await p.addInitScript(([when, cfgJson]) => {
    const RD=Date, rn=Date.now.bind(Date), T=new RD(when).getTime(), t0=rn();
    const f=()=>T+(rn()-t0);
    window.Date=class extends RD{constructor(...a){a.length?super(...a):super(f())}static now(){return f()}};
    if (cfgJson) localStorage.setItem('bies-event-screen-v1', cfgJson);
  }, [at, cfg?JSON.stringify(cfg):null]);
  await p.goto(APP); await p.waitForTimeout(600);
  return { p, ctx, errs, net };
}

(async () => {
  const b = await chromium.launch({ channel:'chrome' });

  console.log('\n— 1. rehearse mode replays the night —');
  { const {p,ctx,errs} = await page(b, '2026-09-02T17:00:00');
    await p.keyboard.press('d'); await p.waitForTimeout(300);
    ok('rehearse chip visible', !(await p.locator('#chiprehearse').evaluate(e=>e.classList.contains('hide'))));
    const seen = new Set(); let sawBreak=false, sawOver=false;
    for (let i=0;i<175;i++) {                      // ~55s real; the night needs 49s at 240x
      const s = await p.evaluate(() => ({
        now: document.querySelector('#nowtitle').textContent,
        brk: document.querySelector('#breakview').classList.contains('live'),
        cnt: document.querySelector('#count').textContent }));
      seen.add(s.now); if (s.brk) sawBreak=true; if (s.cnt.startsWith('+')) sawOver=true;
      await p.waitForTimeout(300);
    }
    ok('every segment appeared', seen.size >= 9, `saw ${seen.size}: ${[...seen].join(' / ')}`);
    ok('break takeover fired', sawBreak);
    ok('reached the end', seen.has("That's a wrap"), [...seen].pop());
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    ok('escape leaves rehearse', await p.locator('#chiprehearse').evaluate(e=>e.classList.contains('hide')));
    ok('no errors during rehearse', errs.length===0, errs.join(' | '));
    await ctx.close(); }

  console.log('\n— 2. overrun counts up in manual mode —');
  { const {p,ctx} = await page(b, '2026-09-02T19:42:30');
    await p.keyboard.press('a'); await p.waitForTimeout(200);
    ok('switched to manual, still in Main talk',
       (await p.locator('#nowtitle').textContent())==='Main talk',
       await p.locator('#nowtitle').textContent());
    // shrink the live segment so it expires immediately
    await p.evaluate(() => { cfg.extra[3] = -24; save(); tick(); });
    await p.waitForTimeout(400);
    const cnt = await p.locator('#count').textContent();
    const cls = await p.locator('#count').getAttribute('class');
    ok('countdown shows a + overrun', cnt.startsWith('+'), cnt);
    ok('countdown is orange', cls.includes('over'), cls);
    ok('does not auto-advance past it', (await p.locator('#nowtitle').textContent())==='Main talk');
    ok('sub-label says running over', (await p.locator('#countsub').textContent()).includes('over'));
    await ctx.close(); }

  console.log('\n— 3. slip moves every downstream time on screen —');
  { const {p,ctx} = await page(b, '2026-09-02T19:42:30');
    const before = await p.$$eval('#itin .row .t', n=>n.map(x=>x.textContent));
    await p.keyboard.press('='); await p.keyboard.press('='); await p.keyboard.press('=');
    await p.waitForTimeout(400);
    const after = await p.$$eval('#itin .row .t', n=>n.map(x=>x.textContent));
    ok('past + current rows unchanged', before.slice(0,4).join()===after.slice(0,4).join(),
       after.slice(0,4).join());
    ok('Q&A moved 8:05 -> 8:20', before[4]==='8:05 PM' && after[4]==='8:20 PM', `${before[4]} -> ${after[4]}`);
    ok('close moved 9:30 -> 9:45', after[8]==='9:45 PM', after[8]);
    const chip = await p.locator('#chiplate').textContent();
    ok('behind-schedule chip shows 15 min', chip.includes('15'), chip);
    await p.keyboard.press('-'); await p.keyboard.press('-'); await p.keyboard.press('-');
    await p.waitForTimeout(300);
    ok('slipping back restores the times',
       (await p.$$eval('#itin .row .t', n=>n.map(x=>x.textContent)))[8]==='9:30 PM');
    await ctx.close(); }

  console.log('\n— 4. fully offline —');
  { const {p,ctx,net,errs} = await page(b);
    await p.keyboard.press('3'); await p.waitForTimeout(500);
    ok('zero network requests', net.length===0, net.join(' '));
    const f = await p.evaluate(()=>({ ppf:document.fonts.check('700 40px "PP Formula Narrow"'),
                                      inter:document.fonts.check('400 16px Inter'),
                                      qr:!!document.querySelector('#qrbox svg'),
                                      logo:!!document.querySelector('#head .logo svg') }));
    ok('brand font embedded', f.ppf);
    ok('body font embedded', f.inter);
    ok('QR generated locally', f.qr);
    ok('logo inlined', f.logo);
    ok('no errors', errs.length===0, errs.join(' | '));
    await ctx.close(); }

  console.log('\n— 5. survives a refresh mid-event —');
  { const ctx = await b.newContext({ viewport:{width:1920,height:1080} });
    const p = await ctx.newPage();
    await p.addInitScript(([when,c]) => {
      const RD=Date, rn=Date.now.bind(Date), T=new RD(when).getTime(), t0=rn();
      const f=()=>T+(rn()-t0);
      window.Date=class extends RD{constructor(...a){a.length?super(...a):super(f())}static now(){return f()}};
      if(!localStorage.getItem('bies-event-screen-v1')) localStorage.setItem('bies-event-screen-v1', c);
    }, ['2026-09-02T19:42:30', JSON.stringify(CFG)]);
    await p.goto(APP); await p.waitForTimeout(500);
    await p.keyboard.press('='); await p.keyboard.press('=');   // 10 min slip
    await p.waitForTimeout(300);
    const pre = await p.$$eval('#itin .row .t', n=>n.map(x=>x.textContent));
    await p.reload(); await p.waitForTimeout(700);
    const post = await p.$$eval('#itin .row .t', n=>n.map(x=>x.textContent));
    ok('slip survived the reload', pre.join()===post.join(), `${pre[8]} vs ${post[8]}`);
    ok('setup did not reopen', !(await p.locator('#setup').evaluate(e=>e.classList.contains('live'))));
    ok('event name restored', (await p.locator('#ident').textContent()).includes('SN20260902'));
    await ctx.close(); }

  console.log('\n— 6. blackout and panel pinning —');
  { const {p,ctx} = await page(b);
    await p.keyboard.press('b'); await p.waitForTimeout(300);
    ok('blackout covers the screen', await p.locator('#blackout').evaluate(e=>e.classList.contains('live')));
    await p.screenshot({path:'shot-blackout.png'});
    await p.keyboard.press('b'); await p.waitForTimeout(200);
    ok('blackout clears', !(await p.locator('#blackout').evaluate(e=>e.classList.contains('live'))));
    await p.keyboard.press('2'); await p.waitForTimeout(600);
    ok('panel 2 pinned', await p.locator('.panel[data-panel="upcoming"]').evaluate(e=>e.classList.contains('live')));
    await p.screenshot({path:'shot-upcoming2.png'});
    await p.keyboard.press('?'); await p.waitForTimeout(300);
    ok('help overlay opens', await p.locator('#help').evaluate(e=>e.classList.contains('live')));
    await p.screenshot({path:'shot-help.png'});
    await ctx.close(); }

  console.log('\n— 7. break takeover renders —');
  { const {p,ctx} = await page(b, '2026-09-02T20:25:00');
    await p.waitForTimeout(400);
    ok('break view is live', await p.locator('#breakview').evaluate(e=>e.classList.contains('live')));
    ok('break clock shows the time', (await p.locator('#breakclock').textContent()).includes('PM'));
    await p.screenshot({path:'shot-break2.png'});
    await ctx.close(); }

  console.log('\n— 8. empty / broken config does not freeze the clock —');
  { const {p,ctx,errs} = await page(b, '2026-09-02T19:42:30',
      Object.assign({}, CFG, {segments:[]}));
    await p.waitForTimeout(600);
    const c1 = await p.locator('#clock').textContent();
    await p.waitForTimeout(1200);
    const c2 = await p.locator('#clock').textContent();
    ok('clock still running with no segments', c1.length>0 && c2.length>0, `${c1} / ${c2}`);
    ok('no uncaught errors', errs.filter(e=>e.startsWith('PAGEERROR')).length===0, errs.join(' | '));
    await ctx.close(); }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
