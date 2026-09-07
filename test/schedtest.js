const S = require('./lib/sched.js');
let pass=0, fail=0;
const ok=(n,c,d='')=>{ c?(pass++,console.log(`  ok    ${n}`)):(fail++,console.log(`  FAIL  ${n}  ${d}`)); };

// freeze the wall clock
let FAKE = new Date("2026-09-02T18:00:00").getTime();
const realNow = Date.now;
Date.now = () => FAKE;
const at = (h,m) => { FAKE = new Date(`2026-09-02T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime(); };

function reset(){
  S.cfg = S.defaults();
  S.cfg.date = "2026-09-02"; S.cfg.start = "18:30";
  S.rt.autoAdvance = true; S.rt.manualIndex = -1;
  S.rt.paused=false; S.rt.pauseAccum=0; S.rt.rehearse=false;
}

console.log("\n— schedule chaining —");
reset();
let s = S.schedule();
ok("first segment starts 6:30 PM", S.clockStr(s.starts[0])==="6:30 PM", S.clockStr(s.starts[0]));
ok("MC opens at 7:30 PM (idx 2)",  S.clockStr(s.starts[2])==="7:30 PM", S.clockStr(s.starts[2]));
ok("break starts 8:20 PM (idx 5)", S.clockStr(s.starts[5])==="8:20 PM", S.clockStr(s.starts[5]));
ok("night ends 9:45 PM",           S.clockStr(s.ends[8])==="9:45 PM",   S.clockStr(s.ends[8]));

console.log("\n— state at various times —");
reset();
at(18,0);  ok("18:00 is pre-show",  S.current().state==="pre",  S.current().state);
at(19,15); ok("19:15 in mingling",  S.current().idx===1,        "idx "+S.current().idx);
at(20,25); ok("20:25 in the break", S.current().idx===5 && S.cfg.segments[5].brk, "idx "+S.current().idx);
at(21,50); ok("21:50 is post-show", S.current().state==="post", S.current().state);

console.log("\n— slip pushes everything downstream —");
reset();
at(19,50);                                   // during the main talk (idx 3)
ok("in the main talk", S.current().idx===3, "idx "+S.current().idx);
const before = S.schedule().starts[5];
S.slip(5); S.slip(5); S.slip(5);             // three presses of +
const after = S.schedule().starts[5];
ok("break moved 15 min later", (after-before)===15*60000, `${(after-before)/60000} min`);
ok("break now 8:35 PM", S.clockStr(after)==="8:35 PM", S.clockStr(after));
ok("end moved too", S.clockStr(S.schedule().ends[8])==="10:00 PM", S.clockStr(S.schedule().ends[8]));
ok("still inside the main talk", S.current().idx===3, "idx "+S.current().idx);

console.log("\n— pre-show slip moves the whole night —");
reset();
at(18,10);
S.slip(-5);
ok("doors pulled to 6:25 PM", S.clockStr(S.schedule().starts[0])==="6:25 PM", S.clockStr(S.schedule().starts[0]));
ok("anchorSlip recorded", S.cfg.anchorSlip===-5, String(S.cfg.anchorSlip));

console.log("\n— advance early re-chains —");
reset();
at(19,00);                                   // mingling (idx 1), talk not due till 7:40
ok("in mingling", S.current().idx===1, "idx "+S.current().idx);
S.advance();                                 // start the MC now
ok("MC segment is live", S.current().idx===2, "idx "+S.current().idx);
ok("MC pinned to 7:00 PM", S.clockStr(S.schedule().starts[2])==="7:00 PM", S.clockStr(S.schedule().starts[2]));
ok("talk follows at 7:10 PM", S.clockStr(S.schedule().starts[3])==="7:10 PM", S.clockStr(S.schedule().starts[3]));

console.log("\n— advancing then going back clears stale pins —");
reset();
at(19,00); S.advance(); S.advance();          // jumped to the talk (idx 3)
ok("now in the talk", S.current().idx===3, "idx "+S.current().idx);
at(19,05); S.back();                          // back to the MC
ok("back in the MC segment", S.current().idx===2, "idx "+S.current().idx);
ok("stale pin on idx 3 cleared", S.cfg.overrides[3]===undefined, JSON.stringify(S.cfg.overrides));
at(19,20);
ok("does not jump forward again", S.current().idx===3, "idx "+S.current().idx);

console.log("\n— manual mode overruns instead of advancing —");
reset();
at(19,45);
const hereIdx = S.current().idx;
S.rt.autoAdvance = false; S.rt.manualIndex = hereIdx;
const held = S.current().idx;
at(20,30);                                    // long past the talk's planned end
ok("still holding the same segment", S.current().idx===held, "idx "+S.current().idx);
const c = S.current();
const left = c.ends[c.idx] - S.nowSched();
ok("countdown is negative (overrun)", left < 0, `${Math.round(left/60000)} min`);
ok("overrun renders with a +", S.dur(left).startsWith("+"), S.dur(left));

console.log("\n— auto mode never overruns —");
reset();
at(19,45);
const ca = S.current();
ok("countdown stays positive", (ca.ends[ca.idx] - S.nowSched()) > 0);

console.log("\n— pause freezes the schedule clock —");
reset();
at(19,00);
const t0 = S.nowSched();
S.togglePause();
at(19,20);                                    // 20 real minutes pass while paused
ok("schedule clock frozen", Math.abs(S.nowSched()-t0) < 1000, `${(S.nowSched()-t0)/1000}s drift`);
S.togglePause();
ok("resumes where it left off", Math.abs(S.nowSched()-t0) < 1000, `${(S.nowSched()-t0)/1000}s drift`);
at(19,25);
ok("runs on after resume", Math.abs(S.nowSched()-t0-5*60000) < 1000, `${(S.nowSched()-t0)/60000} min`);

console.log("\n— a segment cannot be shrunk below zero —");
reset();
at(19,50);
for (let i=0;i<10;i++) S.slip(-5);
const sc = S.schedule();
ok("main talk length >= 0", sc.ends[3] >= sc.starts[3], `${(sc.ends[3]-sc.starts[3])/60000} min`);

console.log("\n— formatting —");
ok("60s renders 01:00",     S.dur(60000)==="01:00", S.dur(60000));
ok("1h renders 1:00:00",    S.dur(3600000)==="1:00:00", S.dur(3600000));
ok("overrun renders +02:30",S.dur(-150000)==="+02:30", S.dur(-150000));

Date.now = realNow;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
