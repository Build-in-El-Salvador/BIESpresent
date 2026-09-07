/* The QR encoder, lifted straight out of src/screen.html at test time.

   It used to be a copy kept beside the tests, which meant the tests could keep
   passing against an encoder the board no longer shipped. Reading the real
   file makes that impossible. The encoder is the first <script> block and
   touches no DOM, so it evaluates in node as-is. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', '..', 'src', 'screen.html');
const html = fs.readFileSync(SRC, 'utf8');

const open = html.indexOf('<script>');
const close = html.indexOf('</script>', open);
if (open < 0 || close < 0) throw new Error('no <script> block in ' + SRC);
const code = html.slice(open + '<script>'.length, close);

if (!/const QR = \(function/.test(code))
  throw new Error('the first script block is no longer the QR encoder — check ' + SRC);

const box = { module: { exports: {} } };
vm.createContext(box);
vm.runInContext(code + '\n;module.exports = QR;', box, { filename: 'screen.html:qr' });

module.exports = box.module.exports;
