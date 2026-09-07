const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
// the built file, one level up from this directory
const APP = pathToFileURL(require('path').join(__dirname, '..', 'BIESpresent.html')).href;
const jsQR = require('jsqr'); const { PNG } = require('pngjs');
/* The "upload your own code" path needs a real QR image. It used to point at a
   file on one laptop; now the test draws its own, encoding the same URL the
   generated code does so the "still scans" check means something. */
const qrgen = require('qrcode');
const QRPNG = require('path').join(require('os').tmpdir(), 'biespresent-test-qr.png');
const QR_URL = 'https://buildinelsalvador.com/#join';
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };
const decodeShot = buf => { const png = PNG.sync.read(buf);
  const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return r ? r.data : null; };

(async () => {
  await qrgen.toFile(QRPNG, QR_URL, { type: 'png', width: 640, margin: 2 });
  const b = await chromium.launch({channel:'chrome'});
  const p = await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  // Pin the clock. Without this the suite runs against real wall time and the
  // default night's break (8:20-8:35 PM) takes the whole screen, so the QR
  // panel cannot be screenshotted at all between those two times.
  const D = new Date(); const today =
    `${D.getFullYear()}-${String(D.getMonth()+1).padStart(2,'0')}-${String(D.getDate()).padStart(2,'0')}`;
  await p.addInitScript(w => {
    const RD = Date, rn = Date.now.bind(Date), T = new RD(w).getTime(), t0 = rn(), f = () => T + (rn() - t0);
    window.Date = class extends RD {
      constructor(...a) { a.length ? super(...a) : super(f()); }
      static now() { return f(); }
    };
  }, today + 'T19:50:00');
  await p.goto(APP); await p.waitForTimeout(700);

  console.log('\n— the generated code, end to end —');
  await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(200);
  await p.fill('#f-qrurl', 'https://buildinelsalvador.com/#join'); await p.waitForTimeout(400);
  ok('preview appears from the link',
     await p.locator('#qrthumb').evaluate(e=>e.classList.contains('on')));
  await p.click('#startbtn'); await p.waitForTimeout(500);
  await p.keyboard.press('3'); await p.waitForTimeout(700);
  let shot = await p.locator('#qrbox').screenshot();
  ok('a phone would read the generated code', decodeShot(shot)==='https://buildinelsalvador.com/#join',
     String(decodeShot(shot)));

  console.log('\n— uploading your own image —');
  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(200);
  await p.setInputFiles('#f-qrimg', QRPNG); await p.waitForTimeout(900);
  ok('note says it is using the upload',
     (await p.locator('#qrnote').textContent()).includes('uploaded'),
     await p.locator('#qrnote').textContent());
  ok('stored on the config', (await p.evaluate(()=>cfg.qr.img.length)) > 1000);
  ok('kept as PNG, not re-encoded lossily',
     (await p.evaluate(()=>cfg.qr.img.slice(0,20))).startsWith('data:image/png'),
     await p.evaluate(()=>cfg.qr.img.slice(0,22)));

  await p.click('#startbtn'); await p.waitForTimeout(500);
  await p.keyboard.press('3'); await p.waitForTimeout(800);
  shot = await p.locator('#qrbox').screenshot();
  ok('the uploaded code still scans off the screen',
     decodeShot(shot)==='https://buildinelsalvador.com/#join', String(decodeShot(shot)));
  ok('the link text is still printed underneath',
     (await p.locator('#qrurl').textContent()).includes('buildinelsalvador.com'),
     await p.locator('#qrurl').textContent());
  await p.screenshot({path:'shot-qrpanel.png'});

  console.log('\n— reverting, and the panel-visibility rules —');
  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(200);
  await p.click('#qrclear'); await p.waitForTimeout(500);
  ok('upload cleared', (await p.evaluate(()=>cfg.qr.img))==='');
  ok('falls back to the generated code',
     (await p.locator('#qrnote').textContent()).includes('Generated'),
     await p.locator('#qrnote').textContent());
  await p.click('#startbtn'); await p.waitForTimeout(400);
  await p.keyboard.press('3'); await p.waitForTimeout(700);
  shot = await p.locator('#qrbox').screenshot();
  ok('generated code back and scanning', decodeShot(shot)==='https://buildinelsalvador.com/#join');

  // image but no link -> panel must still show
  await p.keyboard.press('e'); await p.waitForTimeout(400);
  await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(200);
  await p.fill('#f-qrurl', ''); await p.waitForTimeout(200);
  await p.setInputFiles('#f-qrimg', QRPNG); await p.waitForTimeout(900);
  await p.click('#startbtn'); await p.waitForTimeout(400);
  ok('image alone keeps the panel in rotation',
     await p.evaluate(()=>panelList().includes('qr')),
     JSON.stringify(await p.evaluate(()=>panelList())));
  // neither -> panel hidden
  await p.evaluate(()=>{ cfg.qr.img=''; cfg.qr.url=''; save(); tick(); });
  await p.waitForTimeout(300);
  ok('neither one hides the panel',
     !(await p.evaluate(()=>panelList().includes('qr'))),
     JSON.stringify(await p.evaluate(()=>panelList())));

  console.log('\n— it survives a reload and an export —');
  await p.evaluate(()=>{ cfg.qr.url='https://buildinelsalvador.com/#join'; save(); });
  await p.keyboard.press('e'); await p.waitForTimeout(300);
  await p.click('.tab[data-tab="panels"]'); await p.waitForTimeout(200);
  await p.setInputFiles('#f-qrimg', QRPNG); await p.waitForTimeout(900);
  await p.click('#startbtn'); await p.waitForTimeout(300);
  const len = await p.evaluate(()=>cfg.qr.img.length);
  await p.reload(); await p.waitForTimeout(900);
  ok('upload survived the reload', (await p.evaluate(()=>cfg.qr.img.length))===len,
     `${len} -> ${await p.evaluate(()=>cfg.qr.img.length)}`);
  await p.keyboard.press('3'); await p.waitForTimeout(700);
  shot = await p.locator('#qrbox').screenshot();
  ok('and still scans after the reload', decodeShot(shot)==='https://buildinelsalvador.com/#join');
  ok('no errors', errs.length===0, errs.join('|'));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
