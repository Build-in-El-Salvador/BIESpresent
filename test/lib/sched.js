/* A pure-node mirror of the scheduling maths in src/screen.html, so the timing
   rules can be exercised thousands of times a second without a browser.

   It is a mirror, not the shipped code — keep it in step by hand. The real
   functions in the page are covered too: verify.js, edittest.js and
   impromptu.js all call schedule() and current() inside the live document, so
   a drift between the two shows up there as a failure. */
global.location = { search:"", href:"file:///x.html" };
global.localStorage = { _m:{}, getItem(k){return this._m[k]??null}, setItem(k,v){this._m[k]=v}, removeItem(k){delete this._m[k]} };

"use strict";

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const STORE = "bies-event-screen-v1";
const LIVE  = "bies-event-screen-live-v1";

/* The board is a pure function of (config, wall clock), so a second window
   showing the same config draws the same screen with no message passing. Only
   the operator's runtime state — blackout, pause, which panel is held — has to
   be published, and only the operator's window ever writes it. */
const AUDIENCE = new URLSearchParams(location.search).get("view") === "audience";
const REHEARSE_SPEED = 240;          // a 3-hour night replays in well under a minute
const WARN_SEC = 120;                // countdown turns orange inside this

/* ── Defaults ──────────────────────────────────────────────────────────
   No run-of-show document exists in BIES CORE, so this is a proposed
   standard social night, not a recovered one. Edit it on the night.       */
const STD_NIGHT = [
  { title: "Doors open · Registration",       min: 30, brk: false, note: "" },
  { title: "Refreshments & mingling",         min: 30, brk: false, note: "Grab a drink, find someone you haven't met" },
  { title: "Welcome — MC opens",              min: 10, brk: false, note: "" },
  { title: "Main talk",                       min: 25, brk: false, note: "" },
  { title: "Q&A",                             min: 15, brk: false, note: "" },
  { title: "Break",                           min: 15, brk: true,  note: "" },
  { title: "Announcements & upcoming events", min: 10, brk: false, note: "" },
  { title: "Open networking",                 min: 45, brk: false, note: "" },
  { title: "Close & goodnight",               min: 15, brk: false, note: "" }
];

function defaults() {
  const d = new Date();
  return {
    name: "Social Night",
    code: "",
    date: iso(d),
    start: "18:30",
    segments: STD_NIGHT.map(s => Object.assign({}, s)),
    overrides: {},        // segment index -> pinned start (epoch ms)
    extra: {},            // segment index -> minutes added by the operator
    anchorSlip: 0,        // minutes the whole night has been shifted
    qr: { title: "Join the community", url: "", cap: "Scan to join the BIES WhatsApp group",
          img: "" },
    sponsors: [],
    upcoming: [
      { when: "Sep 10", what: "Mastermind",               meta: "" },
      { when: "Sep 17", what: "Networking Night",         meta: "" },
      { when: "Sep 25", what: "El Salvador Oriente Tour", meta: "3 days" },
      { when: "Oct 6",  what: "Bitcoin 101 — 6 weeks",    meta: "Tuesdays" }
    ],
    dwell1: 30,
    dwell2: 12
  };
}

const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

let cfg = defaults();
const rt = {
  autoAdvance: true, manualIndex: -1,
  paused: false, pausedAt: 0, pauseAccum: 0,
  rehearse: false, rehearseFrom: 0, rehearseAt: 0,
  blackout: false,
  panels: [], panelAt: 0, panelSince: 0, pinned: null,
  qrCache: null
};

/* ── Storage ─────────────────────────────────────────────────────────── */
function save() {
  if (AUDIENCE) return;                       // mirrors must never clobber the source
  try { localStorage.setItem(STORE, JSON.stringify(cfg)); }
  catch (e) { console.warn("save failed", e); }
}

// The slice of runtime state the second screen has to agree with us about
const liveKeys = ["blackout", "paused", "pausedAt", "pauseAccum", "autoAdvance",
                  "manualIndex", "rehearse", "rehearseFrom", "rehearseAt",
                  "pinned", "panelAt", "panelSince"];
const liveSnapshot = () => JSON.stringify(liveKeys.reduce((o, k) => (o[k] = rt[k], o), {}));

let lastLiveOut = "", lastLiveIn = "", lastCfgIn = "";

function publishLive() {
  const snap = liveSnapshot();
  if (snap === lastLiveOut) return;
  lastLiveOut = snap;
  try { localStorage.setItem(LIVE, snap); } catch (_) {}
}

// Called every tick in the audience window: pull config and runtime state across.
function pullLive() {
  try {
    const c = localStorage.getItem(STORE);
    if (c && c !== lastCfgIn) { lastCfgIn = c; load(); rt.qrCache = null; }
    const l = localStorage.getItem(LIVE);
    if (l && l !== lastLiveIn) {
      lastLiveIn = l;
      const got = JSON.parse(l);
      liveKeys.forEach(k => { if (got[k] !== undefined) rt[k] = got[k]; });
    }
  } catch (_) {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return;
    const got = JSON.parse(raw);
    cfg = Object.assign(defaults(), got);
    cfg.overrides = got.overrides || {};
    cfg.extra = got.extra || {};
    cfg.qr = Object.assign(defaults().qr, got.qr || {});
    if (!Array.isArray(cfg.segments) || !cfg.segments.length) cfg.segments = defaults().segments;
    cfg.sponsors = (cfg.sponsors || []).map(s =>          // v1 stored bare data URLs
      typeof s === "string" ? { src: s, name: "", show: false }
                            : { src: s.src, name: s.name || "", show: !!s.show,
                                x: s.x, y: s.y, w: s.w, h: s.h });
    if (cfg.sponsors.some(s => !hasLayout(s))) autoArrangeSponsors();
  } catch (e) { console.warn("load failed", e); }
}

/* ── Schedule maths ──────────────────────────────────────────────────── */
function anchor() {
  const [h, m] = String(cfg.start || "18:30").split(":").map(Number);
  const d = new Date((cfg.date || iso(new Date())) + "T00:00:00");   // local, not UTC
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime() + (cfg.anchorSlip || 0) * 60000;
}

// Durations chain from the anchor. An override pins one segment's start and
// everything after it re-chains from there; `extra` stretches a single segment.
function schedule() {
  const starts = [], ends = [];
  let t = anchor();
  cfg.segments.forEach((s, i) => {
    if (cfg.overrides[i] != null) t = cfg.overrides[i];
    starts[i] = t;
    ends[i] = t + Math.max(0, (Number(s.min) || 0) + (cfg.extra[i] || 0)) * 60000;
    t = ends[i];
  });
  return { starts, ends };
}

// The schedule clock. Pausing freezes it; rehearsing runs it fast.
function nowSched() {
  if (rt.rehearse) return rt.rehearseFrom + (Date.now() - rt.rehearseAt) * REHEARSE_SPEED;
  if (rt.paused)   return rt.pausedAt - rt.pauseAccum;
  return Date.now() - rt.pauseAccum;
}
// The header clock shows the REAL time — except while rehearsing, where showing
// the true time next to a simulated countdown would be a lie.
const nowClock = () => rt.rehearse ? nowSched() : Date.now();

function current() {
  const { starts, ends } = schedule();
  const n = cfg.segments.length;
  const now = nowSched();
  if (!n) return { idx: -1, starts, ends, state: "empty" };

  if (rt.autoAdvance) {
    let i = -1;
    for (let k = 0; k < n; k++) if (now >= starts[k]) i = k;
    if (now >= ends[n - 1]) i = n;
    if (rt.manualIndex > i) i = rt.manualIndex;
    if (i < 0)  return { idx: -1,    starts, ends, state: "pre" };
    if (i >= n) return { idx: n - 1, starts, ends, state: "post" };
    return { idx: i, starts, ends, state: "run" };
  }
  if (rt.manualIndex < 0)  return { idx: -1, starts, ends, state: "pre" };
  if (rt.manualIndex >= n) return { idx: n - 1, starts, ends, state: "post" };
  return { idx: rt.manualIndex, starts, ends, state: "run" };
}

/* ── Formatting ──────────────────────────────────────────────────────── */
function hhmm(ms) {
  const d = new Date(ms);
  let h = d.getHours(); const m = d.getMinutes();
  const mer = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return { t: `${h}:${String(m).padStart(2, "0")}`, mer };
}
const clockStr = ms => { const p = hhmm(ms); return `${p.t} ${p.mer}`; };

function dur(ms) {
  const neg = ms < 0;
  let s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);   s -= m * 60;
  const body = h > 0
    ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
    : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return (neg ? "+" : "") + body;
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dayStr = ms => { const d = new Date(ms);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };





/* ── Operator actions ────────────────────────────────────────────────── */

// Pinning a segment start must clear every pin after it, or an earlier
// "advance" would still be holding a later segment to a stale time.
function pin(i, t) {
  cfg.overrides[i] = t;
  Object.keys(cfg.overrides).forEach(k => { if (Number(k) > i) delete cfg.overrides[k]; });
}

function advance() {
  const { idx, state } = current();
  const n = cfg.segments.length;
  if (!n || state === "post") return;
  rt.manualIndex = state === "pre" ? 0 : idx + 1;
  tick();
}

function back() {
  const { idx, state } = current();
  const n = cfg.segments.length;
  if (!n || state === "pre") return;
  rt.autoAdvance = false;
  rt.manualIndex = state === "post" ? n - 1 : idx - 1;
  tick();
}

// Before the night starts this moves the whole thing; once running it stretches
// the segment you are in, which pushes everything after it.
function slip(mins) {
  const { idx, state } = current();
  if (state === "post" || state === "empty") return;
  if (state === "pre") cfg.anchorSlip = (cfg.anchorSlip || 0) + mins;
  else {
    const base = Number(cfg.segments[idx].min) || 0;
    cfg.extra[idx] = Math.max(-base, (cfg.extra[idx] || 0) + mins);
  }
  save(); tick();
}

function togglePause() {
  if (rt.paused) { rt.pauseAccum += Date.now() - rt.pausedAt; rt.paused = false; }
  else { rt.pausedAt = Date.now(); rt.paused = true; }
  tick();
}

function setRehearse(on) {
  if (on && cfg.segments.length) {
    const { starts } = schedule();
    rt.rehearse = true;
    rt.rehearseFrom = starts[0] - 90 * 1000;    // start a minute and a half before doors
    rt.rehearseAt = Date.now();
  } else rt.rehearse = false;
  tick();
}

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}


function save(){} function tick(){}
module.exports = { get cfg(){return cfg;}, set cfg(v){cfg=v;}, rt, schedule, current, nowSched,
                   anchor, dur, clockStr, advance, back, slip, togglePause, defaults, iso, STD_NIGHT };
