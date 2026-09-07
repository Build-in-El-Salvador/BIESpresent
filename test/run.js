/* Runs every suite and prints one total.
 *
 * The browser suites drive the real Google Chrome on this machine rather than a
 * bundled Chromium, because that is what runs the board on the night — hence
 * playwright-core, which downloads no browsers. Chrome must be installed.
 *
 *   node test/run.js          everything
 *   node test/run.js --fast   just the pure-node suites, about a second
 *   node test/run.js qr sched only suites whose name contains one of these
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const NODE_ONLY = ['qrtest2', 'schedtest'];
const args = process.argv.slice(2);
const fast = args.includes('--fast');
const want = args.filter(a => !a.startsWith('--'));

const all = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && f !== 'run.js')
  .map(f => f.replace(/\.js$/, ''))
  .sort((a, b) => (NODE_ONLY.includes(b) - NODE_ONLY.includes(a)) || a.localeCompare(b));

const suites = all.filter(s =>
  (!fast || NODE_ONLY.includes(s)) &&
  (!want.length || want.some(w => s.includes(w))));

if (!fs.existsSync(path.join(__dirname, '..', 'BIESpresent.html')))
  console.log('! BIESpresent.html is missing — run `npm run build` first\n');

let pass = 0, fail = 0, broke = [];
for (const s of suites) {
  let out = '';
  try {
    out = execFileSync('node', [path.join(__dirname, s + '.js')],
                       { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
  }
  const m = out.match(/(\d+) (?:passed|identical), (\d+) failed/);
  if (!m) {
    broke.push(s);
    console.log(`  ${s.padEnd(12)} DID NOT REPORT`);
    console.log(out.trim().split('\n').slice(-6).map(l => '      ' + l).join('\n'));
    continue;
  }
  pass += +m[1]; fail += +m[2];
  console.log(`  ${s.padEnd(12)} ${m[1].padStart(3)} passed` +
              (+m[2] ? `, ${m[2]} FAILED` : '') );
  if (+m[2]) console.log(out.split('\n').filter(l => /FAIL/.test(l))
                            .map(l => '      ' + l.trim()).join('\n'));
}

console.log(`\n  ${suites.length} suites — ${pass} passed, ${fail} failed` +
            (broke.length ? `, ${broke.length} did not run (${broke.join(', ')})` : ''));
process.exit(fail || broke.length ? 1 : 0);
