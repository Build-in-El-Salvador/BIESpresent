const QR = require('./lib/qr.js');
const ref = require('qrcode');

const cases = [
  "https://chat.whatsapp.com/ABC123",
  "https://buildinelsalvador.com",
  "A", "HELLO WORLD", "12345",
  "https://buildinelsalvador.com/events/SN20260902?ref=screen",
  "Build in El Salvador — Social Night",
  "https://gitworkshop.dev/npub16r543kh96ksxqx2ffff/aop-console",
  "HTTPS://BUILDINELSALVADOR.COM/SN20260902",
  ...[1,14,15,26,27,62,84,106,122,152,180,213].map(n=>"x".repeat(n)),
  "ñáéíóú ¿Cómo estás? El Salvador",
  "https://buildinelsalvador.com/?q=" + "A9".repeat(60),
];

let pass = 0, fail = 0;
for (const s of cases) {
  const mine = QR.encode(s);
  // force byte mode so we compare like with like
  const t = ref.create([{data: s, mode: 'byte'}], {errorCorrectionLevel:'M'});
  const n = t.modules.size;
  if (n !== mine.size) { console.log(`SIZE mine=${mine.size} ref=${n} "${s.slice(0,30)}"`); fail++; continue; }
  let d = 0;
  for (let r=0;r<n;r++) for (let c=0;c<n;c++)
    if ((mine.modules[r][c]?1:0) !== (t.modules.data[r*n+c]?1:0)) d++;
  if (d===0){pass++;console.log(`ok   v${mine.version} ${n}x${n}  "${s.slice(0,40)}"`);}
  else{fail++;console.log(`DIFF v${mine.version} ${d} modules  "${s.slice(0,40)}"`);}
}
console.log(`\n${pass} identical, ${fail} failed`);
