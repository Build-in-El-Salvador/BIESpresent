const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };
const D = '/private/tmp/claude-501/-Users-mike-Desktop-BIES-CORE/f0caea4f-2fcd-4552-9cac-9247e7218b20/scratchpad/';

(async () => {
  const b = await chromium.launch({channel:'chrome'});
  const p = await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(APP); await p.waitForTimeout(700);

  console.log('\n— the header clock is out of the countdown\'s way —');
  await p.click('#startbtn'); await p.waitForTimeout(500);
  const sizes = await p.evaluate(()=>({
    clock:+getComputedStyle(document.querySelector('#clock')).fontSize.replace('px',''),
    date: +getComputedStyle(document.querySelector('#datum')).fontSize.replace('px',''),
    count:+getComputedStyle(document.querySelector('#count')).fontSize.replace('px',''),
    oneLine: document.querySelector('#datum').getBoundingClientRect().top
           === document.querySelector('#clock').getBoundingClientRect().top }));
  ok('clock is small', sizes.clock < 26, `${sizes.clock}px`);
  ok('date matches the clock', sizes.date === sizes.clock, `${sizes.date} vs ${sizes.clock}`);
  ok('countdown dwarfs it', sizes.count / sizes.clock > 6, `${sizes.count} vs ${sizes.clock}`);
  ok('date and time on one line', sizes.oneLine);
  ok('reads like a menu bar',
     /^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}$/.test((await p.locator('#datum').textContent()).trim()),
     await p.locator('#datum').textContent());

  console.log('\n— the bottom-left is clean —');
  const chips = await p.evaluate(()=>[...document.querySelectorAll('#chips .chip')]
    .filter(c=>getComputedStyle(c).display!=='none').map(c=>c.textContent.trim()));
  ok('no Auto or Keys chip on screen', chips.length===0, chips.join(' | '));
  await p.keyboard.press('a'); await p.waitForTimeout(300);
  const chips2 = await p.evaluate(()=>[...document.querySelectorAll('#chips .chip')]
    .filter(c=>getComputedStyle(c).display!=='none').map(c=>c.textContent.trim()));
  ok('Manual still announces itself', chips2.includes('Manual'), chips2.join(' | '));
  await p.keyboard.press('a'); await p.waitForTimeout(200);
  await p.mouse.move(900,500); await p.waitForTimeout(400);
  ok('Keys moved to the hover controls',
     await p.locator('#keysbtn').isVisible());
  await p.click('#keysbtn'); await p.waitForTimeout(300);
  ok('and it opens the key list',
     await p.locator('#help').evaluate(e=>e.classList.contains('live')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  console.log('\n— the time picker —');
  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="segments"]'); await p.waitForTimeout(250);
  ok('time cell is a button, not a stepper',
     await p.locator('.segrow[data-i="2"] .clock').evaluate(e=>e.tagName==='BUTTON'));
  await p.locator('.segrow[data-i="2"] .clock').click(); await p.waitForTimeout(350);
  ok('picker opens', await p.locator('#timepop').evaluate(e=>e.classList.contains('on')));
  const cols = await p.evaluate(()=>[...document.querySelectorAll('#timepop .col')]
    .map(c=>({n:c.children.length, scrolls:c.scrollHeight>c.clientHeight})));
  ok('hours, minutes and AM/PM', JSON.stringify(cols.map(c=>c.n))==='[12,60,2]',
     JSON.stringify(cols.map(c=>c.n)));
  ok('columns actually scroll', cols[0].scrolls && cols[1].scrolls,
     JSON.stringify(cols.map(c=>c.scrolls)));
  ok('current value preselected',
     (await p.evaluate(()=>[...document.querySelectorAll('#timepop .sel')].map(x=>x.dataset.v).join(' ')))==='7 30 PM',
     await p.evaluate(()=>[...document.querySelectorAll('#timepop .sel')].map(x=>x.dataset.v).join(' ')));
  await p.locator('#timepop .col[data-part="m"] button[data-v="50"]').click(); await p.waitForTimeout(350);
  ok('picking a minute updates the row',
     (await p.locator('.segrow[data-i="2"] .clock').textContent()).trim()==='7:50 PM',
     await p.locator('.segrow[data-i="2"] .clock').textContent());
  ok('and stretches the segment before it',
     (await p.evaluate(()=>cfg.segments[1].min))===50, String(await p.evaluate(()=>cfg.segments[1].min)));
  ok('it stays open for a second pick',
     await p.locator('#timepop').evaluate(e=>e.classList.contains('on')));
  await p.screenshot({path:'shot-picker.png'});
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok('Escape closes it', !(await p.locator('#timepop').evaluate(e=>e.classList.contains('on'))));

  console.log('\n— sponsors: big by default —');
  await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(250);
  await p.setInputFiles('#f-sponsor', [D+'logo-wide.png']); await p.waitForTimeout(900);
  const one = await p.evaluate(()=>cfg.sponsors[0]);
  ok('a single logo fills the panel', one.w >= 45, `w=${one.w}%`);
  ok('it is centred', one.x===50 && one.y===50, `${one.x},${one.y}`);
  await p.click('#startbtn'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ rt.pinned='sponsors'; tick(); }); await p.waitForTimeout(500);
  const box = await p.evaluate(()=>{
    const el=document.querySelector('#sponsors .sp img'); const r=el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) }; });
  ok('rendered large on the real screen', box.w > 700, `${box.w}x${box.h}px`);
  await p.screenshot({path:'shot-sponsor1.png'});

  console.log('\n— the Arrange stage —');
  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(200);
  await p.setInputFiles('#f-sponsor', [D+'logo-square.png', D+'logo-tall.png']);
  await p.waitForTimeout(1200);
  ok('three logos auto-spaced', (await p.evaluate(()=>cfg.sponsors.map(s=>Math.round(s.x)).join(','))) ==='18,50,82',
     await p.evaluate(()=>cfg.sponsors.map(s=>Math.round(s.x)).join(',')));
  await p.click('#arrangebtn'); await p.waitForTimeout(500);
  ok('arrange stage opens', await p.locator('#arrange').evaluate(e=>e.classList.contains('on')));
  ok('stage is 16:9 like the screen',
     await p.evaluate(()=>{const r=document.querySelector('#arstage').getBoundingClientRect();
       return Math.abs(r.width/r.height - 16/9) < 0.05;}));
  ok('all three appear on it', (await p.locator('#arfield .ar').count())===3);

  // drag the middle logo
  const before = await p.evaluate(()=>({x:cfg.sponsors[1].x, y:cfg.sponsors[1].y}));
  const bb = await p.locator('#arfield .ar[data-i="1"]').boundingBox();
  await p.mouse.move(bb.x+bb.width/2, bb.y+bb.height/2);
  await p.mouse.down(); await p.mouse.move(bb.x+bb.width/2+140, bb.y+bb.height/2-40, {steps:8});
  await p.mouse.up(); await p.waitForTimeout(350);
  const after = await p.evaluate(()=>({x:cfg.sponsors[1].x, y:cfg.sponsors[1].y}));
  ok('dragging moves it right', after.x > before.x + 4, `${before.x.toFixed(1)} -> ${after.x.toFixed(1)}`);
  ok('and upward', after.y < before.y - 1, `${before.y.toFixed(1)} -> ${after.y.toFixed(1)}`);

  // resize with the grip
  await p.locator('#arfield .ar[data-i="1"] .plate').click(); await p.waitForTimeout(250);
  const w0 = await p.evaluate(()=>cfg.sponsors[1].w);
  const gb = await p.locator('#arfield .ar[data-i="1"] .grip').boundingBox();
  await p.mouse.move(gb.x+gb.width/2, gb.y+gb.height/2);
  await p.mouse.down(); await p.mouse.move(gb.x+70, gb.y+40, {steps:8}); await p.mouse.up();
  await p.waitForTimeout(350);
  const w1 = await p.evaluate(()=>cfg.sponsors[1].w);
  ok('the grip resizes it', w1 > w0 + 1, `${w0.toFixed(1)} -> ${w1.toFixed(1)}`);
  await p.click('#arbigger'); await p.waitForTimeout(250);
  ok('Bigger works too', (await p.evaluate(()=>cfg.sponsors[1].w)) > w1);
  await p.screenshot({path:'shot-arrange.png'});

  await p.click('#arauto'); await p.waitForTimeout(300);
  ok('Auto-arrange resets the spacing',
     (await p.evaluate(()=>cfg.sponsors.map(s=>Math.round(s.x)).join(',')))==='18,50,82');

  console.log('\n— it reaches the real screen and survives a reload —');
  const layout = await p.evaluate(()=>{ cfg.sponsors[0].x = 30; cfg.sponsors[0].w = 40; save();
    return cfg.sponsors.map(s=>[Math.round(s.x),Math.round(s.w)].join(':')).join(','); });
  await p.click('#ardone'); await p.waitForTimeout(400);
  await p.click('#startbtn'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ rt.pinned='sponsors'; tick(); }); await p.waitForTimeout(500);
  ok('panel uses the arranged positions',
     (await p.evaluate(()=>document.querySelector('#sponsors .sp').style.left))==='30%',
     await p.evaluate(()=>document.querySelector('#sponsors .sp').style.left));
  await p.reload(); await p.waitForTimeout(900);
  ok('layout survived the reload',
     (await p.evaluate(()=>cfg.sponsors.map(s=>[Math.round(s.x),Math.round(s.w)].join(':')).join(',')))===layout);
  ok('no errors', errs.length===0, errs.join(' | '));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
