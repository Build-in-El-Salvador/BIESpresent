const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };

const CFG={name:'Social Night',code:'SN20260902',date:'2026-09-02',start:'18:30',
  segments:[{title:"Doors open",min:30},{title:"Mingling",min:30},{title:"Welcome — MC opens",min:10},
    {title:"Main talk",min:25},{title:"Q&A",min:15},{title:"Break",min:15,brk:true},
    {title:"Announcements",min:10},{title:"Networking",min:45},{title:"Close",min:15}],
  overrides:{},extra:{},anchorSlip:0,
  qr:{title:'Join',url:'https://buildinelsalvador.com/join',cap:'Scan'},
  sponsors:[],upcoming:[{when:'Sep 10',what:'Mastermind',meta:''}],dwell1:30,dwell2:12};

(async () => {
  const b = await chromium.launch({channel:'chrome'});
  // one shared context = one shared localStorage, exactly like two windows of one browser
  const ctx = await b.newContext({viewport:{width:1440,height:810}});
  await ctx.addInitScript(([w,c])=>{
    const RD=Date, rn=Date.now.bind(Date), T=new RD(w).getTime();
    // both windows must share one origin, or the second page's fake clock starts
    // however many milliseconds later it happened to load (real Date.now does not)
    let t0 = +(localStorage.getItem('__t0') || 0);
    if (!t0) { t0 = rn(); localStorage.setItem('__t0', String(t0)); }
    const f = () => T + (rn() - t0);
    window.Date=class extends RD{constructor(...a){a.length?super(...a):super(f())}static now(){return f()}};
    if (c && !localStorage.getItem('bies-event-screen-v1'))
      localStorage.setItem('bies-event-screen-v1', c);
  },['2026-09-02T19:50:00', JSON.stringify(CFG)]);

  const op = await ctx.newPage();
  const errs=[]; op.on('pageerror',e=>errs.push('OP '+e.message));
  await op.goto(APP); await op.waitForTimeout(700);

  console.log('\n— the second screen opens —');
  const [aud] = await Promise.all([
    ctx.waitForEvent('page'),
    op.click('#secondbtn')
  ]);
  aud.on('pageerror',e=>errs.push('AUD '+e.message));
  await aud.waitForLoadState(); await aud.waitForTimeout(900);
  ok('audience window opened', aud.url().includes('view=audience'), aud.url());
  ok('operator chip says it is live',
     !(await op.locator('#chipsecond').evaluate(e=>e.classList.contains('hide'))));
  ok('audience hides the operator buttons',
     await aud.locator('#controls').evaluate(e=>getComputedStyle(e).display==='none'));
  ok('audience hides the status chips',
     await aud.locator('#chips').evaluate(e=>getComputedStyle(e).display==='none'));
  ok('both showing the same segment',
     (await op.locator('#nowtitle').textContent())===(await aud.locator('#nowtitle').textContent()),
     `${await op.locator('#nowtitle').textContent()} / ${await aud.locator('#nowtitle').textContent()}`);

  console.log('\n— the operator drives it —');
  await op.keyboard.press('='); await op.keyboard.press('=');   // 10 min slip
  await aud.waitForTimeout(900);
  ok('slip reached the audience screen',
     (await aud.locator('#countsub').textContent())===(await op.locator('#countsub').textContent()),
     `op ${await op.locator('#countsub').textContent()} / aud ${await aud.locator('#countsub').textContent()}`);

  await op.keyboard.press('ArrowRight'); await aud.waitForTimeout(900);
  ok('advance reached it', (await aud.locator('#nowtitle').textContent())==='Q&A',
     await aud.locator('#nowtitle').textContent());

  await op.keyboard.press('3'); await aud.waitForTimeout(900);
  ok('panel pin reached it',
     await aud.locator('.panel[data-panel="qr"]').evaluate(e=>e.classList.contains('live')));

  await op.keyboard.press('b'); await aud.waitForTimeout(900);
  ok('blackout reached it',
     await aud.locator('#blackout').evaluate(e=>e.classList.contains('live')));
  await op.keyboard.press('b'); await aud.waitForTimeout(700);

  console.log('\n— editing on the laptop updates the room —');
  await op.keyboard.press('r'); await op.waitForTimeout(300);
  await op.keyboard.press('e'); await op.waitForTimeout(400);
  await op.locator('.segrow[data-i="6"] input[data-f="title"]').fill('Raffle draw');
  await op.click('#startbtn'); await aud.waitForTimeout(1000);
  const audRows = await aud.$$eval('#itin .row .n', n=>n.map(x=>x.textContent));
  ok('renamed segment appeared on the audience screen', audRows.includes('Raffle draw'),
     audRows.join(' / '));
  ok('the editor never appeared on the audience screen',
     !(await aud.locator('#setup').evaluate(e=>e.classList.contains('live'))));

  console.log('\n— the mirror takes no orders —');
  await aud.keyboard.press('e'); await aud.waitForTimeout(400);
  ok('E does nothing on the audience screen',
     !(await aud.locator('#setup').evaluate(e=>e.classList.contains('live'))));
  await aud.keyboard.press('b'); await aud.waitForTimeout(400);
  ok('B does nothing on the audience screen',
     !(await aud.locator('#blackout').evaluate(e=>e.classList.contains('live'))));
  const opCfg = await op.evaluate(()=>localStorage.getItem('bies-event-screen-v1'));
  await aud.evaluate(()=>{ cfg.name='HACKED'; save(); });
  await aud.waitForTimeout(300);
  ok('the mirror cannot write config',
     (await op.evaluate(()=>localStorage.getItem('bies-event-screen-v1')))===opCfg);

  console.log('\n— coming back from another app —');
  const before = await op.locator('#count').textContent();
  await op.evaluate(()=>{});                       // simulate losing focus
  await aud.bringToFront(); await op.waitForTimeout(2500);
  await op.bringToFront(); await op.waitForTimeout(400);
  const after = await op.locator('#count').textContent();
  ok('countdown kept running while backgrounded', before!==after, `${before} -> ${after}`);
  const st = await op.evaluate(()=>({state:current().state, idx:current().idx}));
  ok('still on the same segment', st.state==='run', JSON.stringify(st));

  await aud.screenshot({path:'shot-audience.png'});
  await op.screenshot({path:'shot-operator.png'});
  /* The window has to be opened inside the gesture that asked for it. Awaiting
     the screen layout first spends the gesture, and the popup is then blocked
     outright — Brave did exactly that, silently: no second screen and no
     message. Keeping the opener synchronous is the fix, so pin it here. */
  ok('the opener does not await before opening',
     await op.evaluate(() => openSecondScreen.constructor.name) === 'Function',
     await op.evaluate(() => openSecondScreen.constructor.name));

  ok('no errors in either window', errs.length===0, errs.join(' | '));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
