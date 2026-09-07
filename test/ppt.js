const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };
const CFG={name:'Social Night',date:'2026-09-02',start:'18:30',
  segments:[{title:"Doors open",min:30},{title:"Mingling",min:30},{title:"Welcome",min:10},
    {title:"Main talk",min:25},{title:"Q&A",min:15},{title:"Break",min:15,brk:true},
    {title:"Announcements",min:10},{title:"Networking",min:45},{title:"Close",min:15}],
  overrides:{},extra:{},anchorSlip:0,qr:{url:''},sponsors:[],upcoming:[],dwell1:30,dwell2:12};

(async () => {
  const b = await chromium.launch({channel:'chrome'});
  const ctx = await b.newContext({viewport:{width:1440,height:810}});
  // real wall clock, deliberately: this is the whole point of the test
  await ctx.addInitScript(c=>{ if(!localStorage.getItem('bies-event-screen-v1'))
    localStorage.setItem('bies-event-screen-v1',c); }, JSON.stringify(CFG));
  const p = await ctx.newPage();
  await p.goto(APP); await p.waitForTimeout(600);

  // anchor the night so the current moment lands mid "Main talk"
  await p.evaluate(() => {
    const now = new Date();
    const d = new Date(now.getTime() - 80*60000);       // doors opened 80 min ago
    cfg.date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    cfg.start = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    save(); tick();
  });
  await p.waitForTimeout(400);
  const seg0 = await p.locator('#nowtitle').textContent();
  const c0   = await p.locator('#count').textContent();
  ok('mid-event on a real clock', seg0==='Main talk', seg0);

  // ── switch away to "PowerPoint" for 6 seconds ────────────────────────
  const other = await ctx.newPage();
  await other.goto('data:text/html,<h1>Someone else%27s deck</h1>');
  await other.bringToFront();
  await new Promise(r => setTimeout(r, 6000));
  await p.bringToFront();
  await p.waitForTimeout(300);

  const seg1 = await p.locator('#nowtitle').textContent();
  const c1   = await p.locator('#count').textContent();
  const toSec = s => { const m=s.replace('+','').split(':').map(Number);
    return m.length===3 ? m[0]*3600+m[1]*60+m[2] : m[0]*60+m[1]; };
  const drop = toSec(c0) - toSec(c1);
  ok('same segment on return', seg1===seg0, `${seg0} -> ${seg1}`);
  ok('countdown advanced by the real elapsed time', drop >= 5 && drop <= 9, `${drop}s for ~6s away`);

  // ── the harder case: close the file entirely and reopen it ───────────
  await p.close();
  const p2 = await ctx.newPage();
  await p2.goto(APP); await p2.waitForTimeout(800);
  const seg2 = await p2.locator('#nowtitle').textContent();
  ok('reopening the file resumes in place', seg2===seg0, `${seg0} -> ${seg2}`);
  ok('setup did not reopen', !(await p2.locator('#setup').evaluate(e=>e.classList.contains('live'))));

  // ── and confirm PAUSE is the one thing that does stop the clock ──────
  await p2.keyboard.press(' '); await p2.waitForTimeout(200);
  const pa = await p2.locator('#count').textContent();
  await new Promise(r => setTimeout(r, 2500));
  const pb = await p2.locator('#count').textContent();
  ok('Space really does freeze it', pa===pb, `${pa} / ${pb}`);
  await p2.keyboard.press(' '); await p2.waitForTimeout(1600);
  ok('and resuming carries on', (await p2.locator('#count').textContent())!==pa);

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
