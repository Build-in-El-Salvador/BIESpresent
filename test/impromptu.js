const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };
const CFG={name:'Social Night',date:'2026-09-02',start:'18:30',
  segments:[{title:"Doors open",min:30},{title:"Mingling",min:30},{title:"Welcome",min:10},
    {title:"Main talk",min:25},{title:"Q&A",min:15},{title:"Break",min:15,brk:true},
    {title:"Networking",min:45},{title:"Close",min:15}],
  overrides:{},extra:{},anchorSlip:0,qr:{url:''},sponsors:[],upcoming:[],dwell1:30,dwell2:12};

async function fresh(b, at='2026-09-02T19:50:00') {     // mid "Main talk" (7:40-8:05)
  const ctx = await b.newContext({viewport:{width:1600,height:1000}});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([w,c])=>{
    const RD=Date, rn=Date.now.bind(Date), T=new RD(w).getTime(), t0=rn(), f=()=>T+(rn()-t0);
    window.Date=class extends RD{constructor(...a){a.length?super(...a):super(f())}static now(){return f()}};
    localStorage.setItem('bies-event-screen-v1', c);
  },[at, JSON.stringify(CFG)]);
  await p.goto(APP); await p.waitForTimeout(650);
  return {p, ctx, errs};
}
const times = p => p.evaluate(()=>{ const s=schedule();
  return cfg.segments.map((x,i)=>({t:clockStr(s.starts[i]), title:x.title})); });
const live = p => p.locator('#nowtitle').textContent();

async function insertAfter(p, i, title, min) {
  await p.keyboard.press('e'); await p.waitForTimeout(350);
  await p.click('.tab[data-tab="segments"]'); await p.waitForTimeout(250);
  await p.locator(`.segrow[data-i="${i}"] .ins`).click(); await p.waitForTimeout(300);
  await p.locator(`.segrow[data-i="${i+1}"] input[data-f="title"]`).fill(title); await p.waitForTimeout(150);
  await p.locator(`.segrow[data-i="${i+1}"] input[data-f="min"]`).fill(String(min)); await p.waitForTimeout(350);
  await p.click('#startbtn'); await p.waitForTimeout(350);
}

(async () => {
  const b = await chromium.launch({channel:'chrome'});

  console.log('\n— an impromptu segment after the live one pushes the rest —');
  { const {p,ctx,errs} = await fresh(b);
    const before = await times(p);
    ok('live segment is the main talk', (await live(p))==='Main talk', await live(p));
    await insertAfter(p, 3, 'Surprise guest', 20);
    const after = await times(p);
    ok('it landed right after the main talk', after[4].title==='Surprise guest', after[4].title);
    ok('it starts when the talk ends', after[4].t==='8:05 PM', after[4].t);
    ok('Q&A pushed 8:05 -> 8:25', after[5].t==='8:25 PM', `${before[4].t} -> ${after[5].t}`);
    ok('break pushed by the same 20 min', after[6].t==='8:40 PM', `${before[5].t} -> ${after[6].t}`);
    ok('the close moved too', after[8].t==='9:40 PM', `${before[7].t} -> ${after[8].t}`);
    ok('everything after moved by exactly 20 min',
       before.slice(4).every((r,k)=>{
         const d=(new Date('2026-09-02 '+after[k+5].t)-new Date('2026-09-02 '+r.t))/60000;
         return d===20; }));
    ok('the board did not move', (await live(p))==='Main talk', await live(p));

    console.log('\n— changing its length moves the rest again —');
    await p.keyboard.press('e'); await p.waitForTimeout(350);
    await p.locator('.segrow[data-i="4"] input[data-f="min"]').fill('35'); await p.waitForTimeout(350);
    await p.click('#startbtn'); await p.waitForTimeout(350);
    const after2 = await times(p);
    ok('Q&A slid a further 15 min', after2[5].t==='8:40 PM', after2[5].t);
    ok('close now 9:55 PM', after2[8].t==='9:55 PM', after2[8].t);
    ok('no errors', errs.length===0, errs.join('|'));
    await ctx.close(); }

  console.log('\n— inserting BEFORE the live segment cannot move the present —');
  { const {p,ctx} = await fresh(b);
    await insertAfter(p, 2, 'Sponsor video', 30);
    const after = await times(p);
    ok('the board stays on the main talk', (await live(p))==='Main talk', await live(p));
    ok('the talk keeps its real 7:40 start',
       after.find(r=>r.title==='Main talk').t==='7:40 PM',
       after.find(r=>r.title==='Main talk').t);
    ok('later segments are undisturbed',
       after.find(r=>r.title==='Q&A').t==='8:05 PM', after.find(r=>r.title==='Q&A').t);
    await ctx.close(); }

  console.log('\n— removing a future segment pulls the rest earlier —');
  { const {p,ctx} = await fresh(b);
    await p.keyboard.press('e'); await p.waitForTimeout(350);
    await p.locator('.segrow[data-i="4"] .del').click(); await p.waitForTimeout(350);   // drop Q&A
    await p.click('#startbtn'); await p.waitForTimeout(350);
    const after = await times(p);
    ok('Q&A gone', !after.some(r=>r.title==='Q&A'), after.map(r=>r.title).join(','));
    ok('break pulled 8:20 -> 8:05', after[4].t==='8:05 PM', after[4].t);
    ok('board still on the main talk', (await live(p))==='Main talk', await live(p));
    await ctx.close(); }

  console.log('\n— removing the live segment hands over cleanly —');
  { const {p,ctx} = await fresh(b);
    await p.keyboard.press('e'); await p.waitForTimeout(350);
    await p.locator('.segrow[data-i="3"] .del').click(); await p.waitForTimeout(350);
    await p.click('#startbtn'); await p.waitForTimeout(400);
    ok('the next segment takes over', (await live(p))==='Q&A', await live(p));
    ok('and starts when the talk did',
       (await times(p)).find(r=>r.title==='Q&A').t==='7:40 PM',
       (await times(p)).find(r=>r.title==='Q&A').t);
    await ctx.close(); }

  console.log('\n— reordering the future leaves the present alone —');
  { const {p,ctx} = await fresh(b);
    await p.keyboard.press('e'); await p.waitForTimeout(350);
    await p.evaluate(()=>{                       // swap Break and Networking
      editSegments(()=>{ const [m]=cfg.segments.splice(5,1); cfg.segments.splice(6,0,m); },
                   len=>moveMap(len,5,6));
      segRows();
    });
    await p.click('#startbtn'); await p.waitForTimeout(350);
    const after = await times(p);
    ok('order swapped', after[5].title==='Networking' && after[6].title==='Break',
       after.map(r=>r.title).join(','));
    ok('main talk untouched', after[3].t==='7:40 PM', after[3].t);
    ok('board unchanged', (await live(p))==='Main talk', await live(p));
    await ctx.close(); }

  console.log('\n— before doors, an insert still shifts the whole night —');
  { const {p,ctx} = await fresh(b, '2026-09-02T17:00:00');
    ok('pre-show', (await p.evaluate(()=>current().state))==='pre');
    await insertAfter(p, 0, 'Extra setup', 15);
    const after = await times(p);
    ok('doors still 6:30 PM', after[0].t==='6:30 PM', after[0].t);
    ok('mingling pushed 7:00 -> 7:15', after[2].t==='7:15 PM', after[2].t);
    ok('and the whole night with it', after[after.length-1].t==='9:35 PM', after[after.length-1].t);
    await ctx.close(); }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
