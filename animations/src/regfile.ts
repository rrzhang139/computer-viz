import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
import { applyWireColors } from "./wireColors";

// Symbol → wire colour (trace the many parallel lines). Each read port ties its
// address + result to one hue; the gated clock is its own colour, distinct from
// the raw clock, so you can see the clock get gated.
const WIRE_COLORS: Record<string, string> = {
  clk: "#56ccf2",
  we: "#ff6fae",
  waddr0: "#6f8cff", waddr1: "#6f8cff",
  raddrA0: "#57e08b", raddrA1: "#57e08b", rdata: "#57e08b",
  raddrB0: "#2fcfc7", raddrB1: "#2fcfc7", rdataB: "#2fcfc7",
  wdata: "#ffcf3a",
  wen0: "#b98cff", wen1: "#b98cff", wen2: "#b98cff", wen3: "#b98cff",
  gclk0: "#ff8a3d", gclk1: "#ff8a3d", gclk2: "#ff8a3d", gclk3: "#ff8a3d",
  q0: "#c8d860", q1: "#c8d860", q2: "#c8d860", q3: "#c8d860",
};

// Register file — 4 entries × 1 bit, 1 write port + 1 read port.
//
// Kept 1-bit-wide so every wire on the diagram is a single bit: the counts
// match each component's ports exactly (each register has one data-in, one
// clock, one data-out; the decoder has 3 inputs; the read MUX has 4 data
// inputs + 2 selects). A real register file stacks 32 of these bit-slices.
//
//   write: on a clock edge, if we=1, the register addressed by
//          (waddr1, waddr0) latches wdata.
//   read:  rdata = the bit held by the register addressed by (raddr1, raddr0)
//          (combinational — always live).
//
// Internally: a 2-to-4 decoder turns the write address into a one-hot
// write-enable (wen0..wen3). Each wen line is ANDed with clk to form that
// register's gated clock, so only the addressed register latches. The read
// port is a 4-to-1 MUX selecting one register's bit.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnWe     = document.getElementById('btnWe')     as HTMLButtonElement;
const btnWaddr1 = document.getElementById('btnWaddr1') as HTMLButtonElement;
const btnWaddr0 = document.getElementById('btnWaddr0') as HTMLButtonElement;
const btnWdata  = document.getElementById('btnWdata')  as HTMLButtonElement;
const btnRaddrA1 = document.getElementById('btnRaddrA1') as HTMLButtonElement;
const btnRaddrA0 = document.getElementById('btnRaddrA0') as HTMLButtonElement;
const btnRaddrB1 = document.getElementById('btnRaddrB1') as HTMLButtonElement;
const btnRaddrB0 = document.getElementById('btnRaddrB0') as HTMLButtonElement;
const btnPulse  = document.getElementById('btnPulse')  as HTMLButtonElement;
const btnReset  = document.getElementById('btnReset')  as HTMLButtonElement;
const svg       = document.getElementById('regfile')   as unknown as SVGSVGElement;

const waddrBits = document.getElementById('waddrBits') as HTMLElement;
const waddrDec  = document.getElementById('waddrDec')  as HTMLElement;
const raddrBits = document.getElementById('raddrBits') as HTMLElement;
const raddrDec  = document.getElementById('raddrDec')  as HTMLElement;
const raddrBBits = document.getElementById('raddrBBits') as HTMLElement;
const raddrBDec  = document.getElementById('raddrBDec')  as HTMLElement;
const memBits   = document.getElementById('memBits')   as HTMLElement;
const rdataBit  = document.getElementById('rdataBit')  as HTMLElement;
const rdataBBit = document.getElementById('rdataBBit') as HTMLElement;

type RfSnap = { mem: Bit[]; we: Bit; waddr1: Bit; waddr0: Bit; raddrA1: Bit; raddrA0: Bit; raddrB1: Bit; raddrB0: Bit; wdata: Bit };
const SNAP_KEY = 'regfile';
// Seed: only reg3 holds a 1. The walkthrough stores a bit into reg2 and
// reads it back, so reg0 (port A's power-on address 00) must start at 0 —
// otherwise "read back what you wrote" shows a 1 that was already there.
const SEED: Bit[] = [0, 0, 0, 1];
const _snap = loadSnapshot<RfSnap>(SNAP_KEY);
const mem: Bit[] = [
  (_snap?.mem?.[0] ?? SEED[0]) as Bit, (_snap?.mem?.[1] ?? SEED[1]) as Bit,
  (_snap?.mem?.[2] ?? SEED[2]) as Bit, (_snap?.mem?.[3] ?? SEED[3]) as Bit,
];
let we: Bit     = readBitParam('we', _snap?.we ?? 0);
let waddr1: Bit = readBitParam('waddr1', _snap?.waddr1 ?? 0);
let waddr0: Bit = readBitParam('waddr0', _snap?.waddr0 ?? 0);
let raddrA1: Bit = readBitParam('raddrA1', _snap?.raddrA1 ?? 0);
let raddrA0: Bit = readBitParam('raddrA0', _snap?.raddrA0 ?? 0);
let raddrB1: Bit = readBitParam('raddrB1', _snap?.raddrB1 ?? 0);
let raddrB0: Bit = readBitParam('raddrB0', (_snap?.raddrB0 ?? 1) as Bit);  // default port B → reg1, so the two ports differ on load
let wdata: Bit  = readBitParam('wdata', _snap?.wdata ?? 0);
let clk: Bit    = 0;  // transient — only high during a clock-write pulse

// ── Embed EXACT copies of each child page (the canonical exact-replica
// standard): decoder → /decoder.html (renderer), each register (a 1-bit DFF)
// → /dff.html, each read port → /mux.html. autoFillEmbeds returns each embed's
// projected pins; every wire below lands on a real pin — nothing hardcoded.
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const decoderDetail = document.getElementById('decoderDetail');
const DEC: Record<string, Pt>   = embeds.get('slot-decoder') || {};
const REG: Record<string, Pt>[] = [0, 1, 2, 3].map((i) => embeds.get(`slot-reg${i}`) || {});
const MUXA: Record<string, Pt>  = embeds.get('slot-mux')  || {};
const MUXB: Record<string, Pt>  = embeds.get('slot-muxB') || {};
const AND_CY: Record<number, number> = { 3: 92, 2: 230, 1: 385, 0: 540 };
const AND_TIP_X = 683.5;
function setWirePoints(id: string, points: string) {
  document.getElementById(id)?.setAttribute('points', points);
}
const placePin = (id: string, x: number, y: number) => {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
};

const rfReady = DEC.pinA1 && REG.every((r) => r.pinD && r.pinCLK && r.pinQ && r.pinQB)
  && MUXA.pinIn0 && MUXA.pinOut && MUXB.pinIn0;
if (rfReady) {
  // wdata: ONE wire — trunk up the bus, stub into each register's D pin.
  const WDATA_BUS_X = 700;
  setWirePoints('wdataTrunk', `0,710 ${WDATA_BUS_X},710 ${WDATA_BUS_X},${REG[3].pinD.y}`);
  for (let i = 0; i < 4; i++) setWirePoints(`wdataD${i}`, `${WDATA_BUS_X},${REG[i].pinD.y} ${REG[i].pinD.x},${REG[i].pinD.y}`);
  // gated clock: AND output → across → drop into each register's CLK pin (top).
  for (let i = 0; i < 4; i++) {
    const clkP = REG[i].pinCLK;
    setWirePoints(`gclk${i}`, `${AND_TIP_X},${AND_CY[i]} ${clkP.x},${AND_CY[i]} ${clkP.x},${clkP.y}`);
  }
  // each register's Q̄ is unused → short honest stub off the pin.
  for (let i = 0; i < 4; i++) setWirePoints(`qbStub${i}`, `${REG[i].pinQB.x},${REG[i].pinQB.y} 952,${REG[i].pinQB.y}`);
  // read addresses → each MUX's s1/s0 select pins.
  setWirePoints('raddrA1', `0,28 996,28 996,${MUXA.pinS1.y} ${MUXA.pinS1.x},${MUXA.pinS1.y}`);
  setWirePoints('raddrA0', `0,48 1006,48 1006,${MUXA.pinS0.y} ${MUXA.pinS0.x},${MUXA.pinS0.y}`);
  setWirePoints('raddrB1', `0,92 974,92 974,${MUXB.pinS1.y} ${MUXB.pinS1.x},${MUXB.pinS1.y}`);
  setWirePoints('raddrB0', `0,112 984,112 984,${MUXB.pinS0.y} ${MUXB.pinS0.x},${MUXB.pinS0.y}`);
  // register outputs (Q pin) fan to BOTH read MUXes' data input pins.
  const inKey = ['pinIn0', 'pinIn1', 'pinIn2', 'pinIn3'] as const;
  const laneA: Record<number, number> = { 3: 946, 2: 955, 1: 964, 0: 937 };
  const laneB: Record<number, number> = { 3: 946, 2: 955, 1: 964, 0: 937 };
  for (let i = 0; i < 4; i++) {
    const q = REG[i].pinQ, a = MUXA[inKey[i]], b = MUXB[inKey[i]];
    setWirePoints(`q${i}`,  `${q.x},${q.y} ${laneA[i]},${q.y} ${laneA[i]},${a.y} ${a.x},${a.y}`);
    setWirePoints(`q${i}B`, `${q.x},${q.y} ${laneB[i]},${q.y} ${laneB[i]},${b.y} ${b.x},${b.y}`);
  }
  // MUX output pins → rdata / rdataB pins + labels.
  const outA = MUXA.pinOut, outB = MUXB.pinOut;
  setWirePoints('rdata',  `${outA.x},${outA.y} 1500,${outA.y}`);
  setWirePoints('rdataB', `${outB.x},${outB.y} 1500,${outB.y}`);
  placePin('pinRdata', 1500, outA.y);
  document.querySelector('text[data-pin="rdata"]')?.setAttribute('y', String(outA.y));
  placePin('pinRdataB', 1500, outB.y);
  document.querySelector('text[data-pin="rdataB"]')?.setAttribute('y', String(outB.y));
  // Decoder: write address/enable → projected a1/EN/a0 pins; one-hot wen3..0
  // leave the sel pins and run into each AND's wen input.
  setWirePoints('waddr1Wire', `0,${DEC.pinA1.y} ${DEC.pinA1.x},${DEC.pinA1.y}`);
  setWirePoints('weWire',     `0,${DEC.pinEN.y} ${DEC.pinEN.x},${DEC.pinEN.y}`);
  setWirePoints('waddr0Wire', `0,${DEC.pinA0.y} ${DEC.pinA0.x},${DEC.pinA0.y}`);
  const wenLaneX: Record<number, number> = { 3: 568, 2: 556, 1: 544, 0: 532 };
  for (const i of [3, 2, 1, 0]) {
    const sel = DEC[`pinSel${i}`];
    const wenInY = AND_CY[i] + 13;
    setWirePoints(`wen${i}`, `${sel.x},${sel.y} ${wenLaneX[i]},${sel.y} ${wenLaneX[i]},${wenInY} 600,${wenInY}`);
  }
}

// ── Lighting for the embedded children (data-net wires + data-body bodies) ──
function lightDecoder(a1: Bit, a0: Bit, en: Bit, sel: Bit[]) {
  if (!decoderDetail) return;
  const na1: Bit = (a1 === 0 ? 1 : 0) as Bit, na0: Bit = (a0 === 0 ? 1 : 0) as Bit;
  const w = (net: string, on: Bit) => decoderDetail.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => decoderDetail.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('a1', a1); w('a0', a0); w('a1bar', na1); w('a0bar', na0); w('EN', en);
  body('gInvA1', na1); body('gInvA0', na0);
  for (let i = 0; i < 4; i++) { w(`sel${i}`, sel[i]); body(`gAnd${i}`, sel[i]); }
}
function lightDff(hostId: string, d: Bit, gclk: Bit, q: Bit) {
  const host = document.getElementById(hostId); if (!host) return;
  const notClk: Bit = (gclk === 0 ? 1 : 0) as Bit; const qb: Bit = (q === 0 ? 1 : 0) as Bit;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('D', d); w('CLK', gclk); w('notCLK', notClk); w('M', q); w('Q', q); w('QB', qb); w('Mbar', qb);
  body('iInv', notClk); body('gMaster', q); body('gSlave', q);
}
function lightMux(hostId: string, ins: Bit[], s1: Bit, s0: Bit) {
  const host = document.getElementById(hostId); if (!host) return;
  const sel: Bit[] = [0, 0, 0, 0] as Bit[]; sel[s1 * 2 + s0] = 1;
  const andOut: Bit[] = ins.map((v, i) => (v & sel[i]) as Bit);
  const out: Bit = (andOut[0] | andOut[1] | andOut[2] | andOut[3]) as Bit;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('s1', s1); w('s0', s0); w('EN', 1);
  for (let i = 0; i < 4; i++) { w(`in${i}`, ins[i]); w(`sel${i}`, sel[i]); w(`andOut${i}`, andOut[i]); body(`gAnd${i}`, andOut[i]); }
  w('out', out); body('gOr', out); body('gDecoder', 1);
}

// Per-wire pulse overlays so lit wires animate flow (skip embedded children).
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire')).filter((w) => !w.closest('.detailed'));
const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
for (const w of wires) {
  const p = document.createElementNS(SVG_NS, 'polyline');
  p.setAttribute('class', 'pulse');
  p.setAttribute('points', w.getAttribute('points') || '');
  const net = w.getAttribute('data-net');
  if (net) p.setAttribute('data-net', net);
  p.setAttribute('data-on', w.getAttribute('data-on') || '0');
  w.insertAdjacentElement('afterend', p);
  pulseFor.set(w, p);
}
applyWireColors(svg, WIRE_COLORS);

function setNet(net: string, on: Bit) {
  svg.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((el) => {
    if (el.closest('.detailed')) return;  // embedded children light via their own helpers
    el.setAttribute('data-on', String(on));
    pulseFor.get(el)?.setAttribute('data-on', String(on));
  });
}
function setPin(id: string, on: Bit) { document.getElementById(id)?.setAttribute('data-on', String(on)); }
function setBody(id: string, on: Bit) { document.getElementById(id)?.setAttribute('data-on', String(on)); }
function setBtn(btn: HTMLButtonElement | null, label: string, value: Bit) {
  if (!btn) return;
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  const waddrIdx = waddr1 * 2 + waddr0;
  const raddrIdx = raddrA1 * 2 + raddrA0;
  const raddrBIdx = raddrB1 * 2 + raddrB0;

  // Write decoder → one-hot write-enable (gated by we)
  const wen: Bit[] = [0, 0, 0, 0];
  if (we) wen[waddrIdx] = 1;
  const gclk: Bit[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) gclk[i] = (clk && wen[i]) as Bit;

  // Two read ports (combinational) — each picks one register's bit.
  const rdata: Bit = mem[raddrIdx];
  const rdataB: Bit = mem[raddrBIdx];

  // Input wires + pins
  setNet('we', we);         setPin('pinWe', we);
  setNet('waddr1', waddr1); setPin('pinWaddr1', waddr1);
  setNet('waddr0', waddr0); setPin('pinWaddr0', waddr0);
  setNet('raddrA1', raddrA1); setPin('pinRaddrA1', raddrA1);
  setNet('raddrA0', raddrA0); setPin('pinRaddrA0', raddrA0);
  setNet('raddrB1', raddrB1); setPin('pinRaddrB1', raddrB1);
  setNet('raddrB0', raddrB0); setPin('pinRaddrB0', raddrB0);
  setNet('clk', clk);       setPin('pinClk', clk);
  setNet('wdata', wdata);   setPin('pinWdata', wdata);

  // Internal nets
  for (let i = 0; i < 4; i++) {
    setNet(`wen${i}`, wen[i]);
    setNet(`gclk${i}`, gclk[i]);
    setNet(`q${i}`, mem[i]);
  }
  setNet('rdata', rdata);   setPin('pinRdata', rdata);
  setNet('rdataB', rdataB); setPin('pinRdataB', rdataB);

  // Body glows
  setBody('gDecoder', we);
  for (let i = 0; i < 4; i++) {
    setBody(`gAnd${i}`, wen[i]);
    setBody(`gReg${i}`, mem[i]);
  }
  setBody('gMux', rdata);
  setBody('gMuxB', rdataB);

  // Embedded-preview state — each is an exact copy of the child page.
  lightDecoder(waddr1, waddr0, we, wen);
  for (let i = 0; i < 4; i++) lightDff(`reg${i}Detail`, wdata, gclk[i], mem[i]);
  lightMux('muxDetail',  [...mem] as Bit[], raddrA1, raddrA0);
  lightMux('muxDetailB', [...mem] as Bit[], raddrB1, raddrB0);

  // Buttons
  setBtn(btnWe, 'we', we);
  setBtn(btnWaddr1, 'waddr1', waddr1);
  setBtn(btnWaddr0, 'waddr0', waddr0);
  setBtn(btnWdata, 'wdata', wdata);
  setBtn(btnRaddrA1, 'raddrA1', raddrA1);
  setBtn(btnRaddrA0, 'raddrA0', raddrA0);
  setBtn(btnRaddrB1, 'raddrB1', raddrB1);
  setBtn(btnRaddrB0, 'raddrB0', raddrB0);

  // Readouts
  waddrBits.textContent = `${waddr1}${waddr0}`;
  waddrDec.textContent = ` (${waddrIdx})`;
  raddrBits.textContent = `${raddrA1}${raddrA0}`;
  raddrDec.textContent = ` (${raddrIdx})`;
  raddrBBits.textContent = `${raddrB1}${raddrB0}`;
  raddrBDec.textContent = ` (${raddrBIdx})`;
  memBits.textContent = `r0=${mem[0]} r1=${mem[1]} r2=${mem[2]} r3=${mem[3]}`;
  rdataBit.textContent = String(rdata);
  rdataBBit.textContent = String(rdataB);
}

function persist() {
  saveSnapshot<RfSnap>(SNAP_KEY, { mem: [...mem] as Bit[], we, waddr1, waddr0, raddrA1, raddrA0, raddrB1, raddrB0, wdata });
}

function commitWrite() { if (we) mem[waddr1 * 2 + waddr0] = wdata; }

btnWe.addEventListener('click',     () => { we = we === 0 ? 1 : 0; render(); persist(); });
btnWaddr1.addEventListener('click', () => { waddr1 = waddr1 === 0 ? 1 : 0; render(); persist(); });
btnWaddr0.addEventListener('click', () => { waddr0 = waddr0 === 0 ? 1 : 0; render(); persist(); });
btnWdata.addEventListener('click',  () => { wdata = wdata === 0 ? 1 : 0; render(); persist(); });
btnRaddrA1.addEventListener('click', () => { raddrA1 = raddrA1 === 0 ? 1 : 0; render(); persist(); });
btnRaddrA0.addEventListener('click', () => { raddrA0 = raddrA0 === 0 ? 1 : 0; render(); persist(); });
btnRaddrB1.addEventListener('click', () => { raddrB1 = raddrB1 === 0 ? 1 : 0; render(); persist(); });
btnRaddrB0.addEventListener('click', () => { raddrB0 = raddrB0 === 0 ? 1 : 0; render(); persist(); });

// Clock-write pulse: clk 0→1 (latch on the edge) →0 — only the addressed
// register sees the gated clock edge.
btnPulse.addEventListener('click', () => {
  clk = 0; render();
  setTimeout(() => { clk = 1; commitWrite(); render(); persist(); }, 200);
  setTimeout(() => { clk = 0; render(); persist(); }, 1000);
});

btnReset.addEventListener('click', () => {
  for (let i = 0; i < 4; i++) mem[i] = SEED[i];   // back to the preloaded demo bits
  we = 0; waddr1 = 0; waddr0 = 0; raddrA1 = 0; raddrA0 = 0; raddrB1 = 0; raddrB0 = 1; wdata = 0; clk = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-downs ──────────────────────────────────────────────────────
document.getElementById('slot-decoder')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/decoder.html', {
    from: 'regfile', which: 'wdec', a1: waddr1, a0: waddr0, EN: we,
  }));
});
for (let i = 0; i < 4; i++) {
  document.getElementById(`slot-reg${i}`)?.addEventListener('click', () => {
    // Each register is a single-bit DFF: D=wdata, CLK=its gated clock, Q=stored bit.
    const selected = we && (waddr1 * 2 + waddr0) === i ? 1 : 0;
    window.location.assign(buildDrillUrl('/dff.html', {
      from: 'regfile', which: `reg${i}`,
      D: wdata, CLK: (clk && selected) as Bit, Q: mem[i],
    }));
  });
}
document.getElementById('slot-mux')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/mux.html', {
    from: 'regfile', which: 'rmuxA',
    in0: mem[0], in1: mem[1], in2: mem[2], in3: mem[3],
    s1: raddrA1, s0: raddrA0,
  }));
});
document.getElementById('slot-muxB')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/mux.html', {
    from: 'regfile', which: 'rmuxB',
    in0: mem[0], in1: mem[1], in2: mem[2], in3: mem[3],
    s1: raddrB1, s0: raddrB0,
  }));
});

initDrillBreadcrumb();
render();

initCanvasZoom();
initSteps();

initPanel();
initToc();
