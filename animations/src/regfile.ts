import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { renderDecoderScene, decoderTerminals } from "./scenes/decoderScene";
import {
  buildDffScene, bindDffSceneState, placeDffScene,
  DFF_SCENE_W, DFF_SCENE_H, DFF_SCENE_ANCHORS,
} from "./scenes/dffScene";
import {
  buildMuxScene, bindMuxSceneState, MUX_SCENE_W, MUX_SCENE_H, MUX_SCENE_ANCHORS,
} from "./scenes/muxScene";

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
const btnRaddr1 = document.getElementById('btnRaddr1') as HTMLButtonElement;
const btnRaddr0 = document.getElementById('btnRaddr0') as HTMLButtonElement;
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

type RfSnap = { mem: Bit[]; we: Bit; waddr1: Bit; waddr0: Bit; raddr1: Bit; raddr0: Bit; raddrB1: Bit; raddrB0: Bit; wdata: Bit };
const SNAP_KEY = 'regfile';
// Seed the four registers with a pattern where flipping either read-address
// bit changes the bit read out, so reading is obviously live on load.
// (reg0=1, reg1=0, reg2=0, reg3=1.)
const SEED: Bit[] = [1, 0, 0, 1];
const _snap = loadSnapshot<RfSnap>(SNAP_KEY);
const mem: Bit[] = [
  (_snap?.mem?.[0] ?? SEED[0]) as Bit, (_snap?.mem?.[1] ?? SEED[1]) as Bit,
  (_snap?.mem?.[2] ?? SEED[2]) as Bit, (_snap?.mem?.[3] ?? SEED[3]) as Bit,
];
let we: Bit     = readBitParam('we', _snap?.we ?? 0);
let waddr1: Bit = readBitParam('waddr1', _snap?.waddr1 ?? 0);
let waddr0: Bit = readBitParam('waddr0', _snap?.waddr0 ?? 0);
let raddr1: Bit = readBitParam('raddr1', _snap?.raddr1 ?? 0);
let raddr0: Bit = readBitParam('raddr0', _snap?.raddr0 ?? 0);
let raddrB1: Bit = readBitParam('raddrB1', _snap?.raddrB1 ?? 0);
let raddrB0: Bit = readBitParam('raddrB0', (_snap?.raddrB0 ?? 1) as Bit);  // default port B → reg1, so the two ports differ on load
let wdata: Bit  = readBitParam('wdata', _snap?.wdata ?? 0);
let clk: Bit    = 0;  // transient — only high during a clock-write pulse

// ── Hover previews (CLAUDE.md rule 21): decoder → decoderScene, each register
// (a single-bit DFF) → dffScene, read MUX → muxScene.
const DEC_BOX = { x: 210, y: 140, w: 280, h: 240 };  // matches the gDecoder rect
const decoderDetail = document.getElementById('decoderDetail');
if (decoderDetail) {
  decoderDetail.appendChild(renderDecoderScene(
    DEC_BOX,
    { idPrefix: 'dp', showPins: false, pinRadius: 3 },
  ));
}
// ── Register column geometry ─────────────────────────────────────────
// One source of truth for the register boxes. Every wire that touches a
// register (wdata→D, gated clock→CLK, Q→read MUX) is routed onto the DFF
// preview's PROJECTED terminals, so it lands on the cell's real D (left-
// center) / CLK (top-center) / Q (right-center) — the same cell you see on
// hover. Nothing here is hardcoded to a terminal y.
const REG_X = 720, REG_W = 210, REG_H = 100;
// reg3 at top, reg0 at bottom (LSB-at-bottom). Gaps above each box leave
// room for the gated clock to drop into the top edge.
const REG_TOP: Record<number, number> = { 3: 110, 2: 265, 1: 420, 0: 575 };
// Each clock-gate AND sits in the gap ABOVE its register; its output runs
// across at this y, then drops straight down into the register's CLK.
const AND_CY: Record<number, number> = { 3: 92, 2: 230, 1: 385, 0: 540 };
const AND_TIP_X = 683.5;  // right tip of the AND D-shape (gate body is x∈[600,683.5])

function regTerminals(i: number) {
  const place = { x: REG_X, y: REG_TOP[i], w: REG_W, h: REG_H };
  const sx = place.w / DFF_SCENE_W, sy = place.h / DFF_SCENE_H;
  const proj = (a: { x: number; y: number }) => ({ x: place.x + a.x * sx, y: place.y + a.y * sy });
  return { place, D: proj(DFF_SCENE_ANCHORS.D), CLK: proj(DFF_SCENE_ANCHORS.CLK), Q: proj(DFF_SCENE_ANCHORS.Q) };
}

const dffScenes: (SVGGElement | null)[] = [null, null, null, null];
for (let i = 0; i < 4; i++) {
  const host = document.getElementById(`reg${i}Detail`);
  if (!host) continue;
  const scene = buildDffScene();
  dffScenes[i] = scene;
  // Preview fills the box exactly so its D/CLK/Q stubs sit on the box edges
  // (where the parent wires meet them).
  host.appendChild(placeDffScene(scene, regTerminals(i).place));
}

// Two read-MUX boxes (port A top, port B bottom). Each preview (buildMuxScene)
// is dropped in at a uniform scale; the SAME transform projects its input/
// output anchors into page coordinates so the parent wires meet the MUX's real
// terminals (nothing hardcoded to a y). `mountMux` returns the scene (for state
// binding) + an `at()` projector.
function mountMux(hostId: string, box: { x: number; y: number; w: number; h: number }) {
  const sc = Math.min(box.w / MUX_SCENE_W, box.h / MUX_SCENE_H);
  const ox = box.x + (box.w - MUX_SCENE_W * sc) / 2;
  const oy = box.y + (box.h - MUX_SCENE_H * sc) / 2;
  const at = (a: { x: number; y: number }) => ({ x: ox + a.x * sc, y: oy + a.y * sc });
  const host = document.getElementById(hostId);
  let scene: SVGGElement | null = null;
  if (host) {
    scene = buildMuxScene();
    const wrap = document.createElementNS(SVG_NS, 'g');
    wrap.setAttribute('transform', `translate(${ox}, ${oy}) scale(${sc})`);
    wrap.appendChild(scene);
    host.appendChild(wrap);
  }
  return { scene, at };
}
const MUX_A_BOX = { x: 1010, y: 110, w: 185, h: 220 };   // matches gMux rect
const MUX_B_BOX = { x: 1010, y: 410, w: 185, h: 220 };   // matches gMuxB rect
const muxA = mountMux('muxDetail', MUX_A_BOX);
const muxB = mountMux('muxDetailB', MUX_B_BOX);

// Route the projected wires. Only the route shape (lane x's, the over-the-top
// read-address path, the wdata bus x) lives here; every endpoint is a
// projected terminal.
function setWirePoints(id: string, points: string) {
  document.getElementById(id)?.setAttribute('points', points);
}
{
  const reg = [0, 1, 2, 3].map(regTerminals);
  // wdata: ONE wire. trunk up the bus, stub into each register's D (left-center)
  const WDATA_BUS_X = 700;
  const topD = reg[3].D.y;  // reg3 D is the highest stub
  setWirePoints('wdataTrunk', `0,710 ${WDATA_BUS_X},710 ${WDATA_BUS_X},${topD}`);
  for (let i = 0; i < 4; i++) setWirePoints(`wdataD${i}`, `${WDATA_BUS_X},${reg[i].D.y} ${reg[i].D.x},${reg[i].D.y}`);
  // gated clock: AND output → across → drop into each register's CLK (top-center)
  for (let i = 0; i < 4; i++) {
    const { CLK } = reg[i];
    setWirePoints(`gclk${i}`, `${AND_TIP_X},${AND_CY[i]} ${CLK.x},${AND_CY[i]} ${CLK.x},${CLK.y}`);
  }
  // read addresses: port A across the top into MUX-A selects, port B into
  // MUX-B selects (both projected onto the preview's s1/s0 stubs).
  const aS1 = muxA.at(MUX_SCENE_ANCHORS.s1), aS0 = muxA.at(MUX_SCENE_ANCHORS.s0);
  setWirePoints('raddr1', `0,28 990,28 990,${aS1.y} ${aS1.x},${aS1.y}`);
  setWirePoints('raddr0', `0,48 1000,48 1000,${aS0.y} ${aS0.x},${aS0.y}`);
  const bS1 = muxB.at(MUX_SCENE_ANCHORS.s1), bS0 = muxB.at(MUX_SCENE_ANCHORS.s0);
  setWirePoints('raddrB1', `0,92 974,92 974,${bS1.y} ${bS1.x},${bS1.y}`);
  setWirePoints('raddrB0', `0,112 984,112 984,${bS0.y} ${bS0.x},${bS0.y}`);
  // register outputs (Q, right-center) fan to BOTH read MUXes' data inputs.
  const inKey = ['in0', 'in1', 'in2', 'in3'] as const;
  const laneA = { 3: 952, 2: 958, 1: 958, 0: 952 } as Record<number, number>;
  const laneB = { 3: 946, 2: 964, 1: 964, 0: 946 } as Record<number, number>;
  for (let i = 0; i < 4; i++) {
    const q = reg[i].Q;
    const a = muxA.at(MUX_SCENE_ANCHORS[inKey[i]]);
    const b = muxB.at(MUX_SCENE_ANCHORS[inKey[i]]);
    setWirePoints(`q${i}`,  `${q.x},${q.y} ${laneA[i]},${q.y} ${laneA[i]},${a.y} ${a.x},${a.y}`);
    setWirePoints(`q${i}B`, `${q.x},${q.y} ${laneB[i]},${q.y} ${laneB[i]},${b.y} ${b.x},${b.y}`);
  }
  // MUX outputs → rdata / rdataB pins + labels.
  const outA = muxA.at(MUX_SCENE_ANCHORS.out), outB = muxB.at(MUX_SCENE_ANCHORS.out);
  setWirePoints('rdata', `${outA.x},${outA.y} 1400,${outA.y}`);
  setWirePoints('rdataB', `${outB.x},${outB.y} 1400,${outB.y}`);
  document.getElementById('pinRdata')?.setAttribute('cy', String(outA.y));
  document.querySelector('text[data-pin="rdata"]')?.setAttribute('y', String(outA.y));
  document.getElementById('pinRdataB')?.setAttribute('cy', String(outB.y));
  document.querySelector('text[data-pin="rdataB"]')?.setAttribute('y', String(outB.y));

  // Decoder: write address/enable → its projected a1/EN/a0 inputs; one-hot
  // wen3..0 leave its projected sel outputs and run into each AND's wen input.
  const dec = decoderTerminals(DEC_BOX);
  setWirePoints('waddr1Wire', `0,${dec.a1_in.y} ${dec.a1_in.x},${dec.a1_in.y}`);
  setWirePoints('weWire', `0,${dec.EN_in.y} ${dec.EN_in.x},${dec.EN_in.y}`);
  setWirePoints('waddr0Wire', `0,${dec.a0_in.y} ${dec.a0_in.x},${dec.a0_in.y}`);
  const wenLaneX: Record<number, number> = { 3: 568, 2: 556, 1: 544, 0: 532 };
  for (const i of [3, 2, 1, 0]) {
    const sel = dec[`sel${i}_out`];
    const wenInY = AND_CY[i] + 13;  // AND wen input (lower of the two left inputs)
    setWirePoints(`wen${i}`, `${sel.x},${sel.y} ${wenLaneX[i]},${sel.y} ${wenLaneX[i]},${wenInY} 600,${wenInY}`);
  }
}

// Per-wire pulse overlays so lit wires animate flow.
const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire'));
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

function setNet(net: string, on: Bit) {
  svg.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((el) => {
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
  const raddrIdx = raddr1 * 2 + raddr0;
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
  setNet('raddr1', raddr1); setPin('pinRaddr1', raddr1);
  setNet('raddr0', raddr0); setPin('pinRaddr0', raddr0);
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

  // Hover-preview state.
  if (decoderDetail) {
    const na1: Bit = (waddr1 === 0 ? 1 : 0) as Bit;
    const na0: Bit = (waddr0 === 0 ? 1 : 0) as Bit;
    decoderDetail.querySelector('#dpInvA1')?.setAttribute('data-on', String(na1));
    decoderDetail.querySelector('#dpInvA0')?.setAttribute('data-on', String(na0));
    const setPrev = (net: string, on: Bit) =>
      decoderDetail.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`)
        .forEach((w) => w.setAttribute('data-on', String(on)));
    setPrev('a1', waddr1); setPrev('a0', waddr0);
    setPrev('a1bar', na1); setPrev('a0bar', na0);
    setPrev('EN', we);
    for (let i = 0; i < 4; i++) {
      decoderDetail.querySelector(`#dpAnd${i}`)?.setAttribute('data-on', String(wen[i]));
      setPrev(`sel${i}`, wen[i]);
    }
  }
  // Each register's DFF preview: D=wdata (pending), its gated clock, the held bit.
  for (let i = 0; i < 4; i++) {
    if (dffScenes[i]) bindDffSceneState(dffScenes[i]!, { D: wdata, CLK: gclk[i], Qm: mem[i], Q: mem[i] });
  }
  // Read-MUX previews: the four stored bits, each port's read address as select.
  if (muxA.scene) bindMuxSceneState(muxA.scene, { ins: [...mem] as Bit[], s1: raddr1, s0: raddr0 });
  if (muxB.scene) bindMuxSceneState(muxB.scene, { ins: [...mem] as Bit[], s1: raddrB1, s0: raddrB0 });

  // Buttons
  setBtn(btnWe, 'we', we);
  setBtn(btnWaddr1, 'waddr1', waddr1);
  setBtn(btnWaddr0, 'waddr0', waddr0);
  setBtn(btnWdata, 'wdata', wdata);
  setBtn(btnRaddr1, 'raddr1', raddr1);
  setBtn(btnRaddr0, 'raddr0', raddr0);
  setBtn(btnRaddrB1, 'raddrB1', raddrB1);
  setBtn(btnRaddrB0, 'raddrB0', raddrB0);

  // Readouts
  waddrBits.textContent = `${waddr1}${waddr0}`;
  waddrDec.textContent = ` (${waddrIdx})`;
  raddrBits.textContent = `${raddr1}${raddr0}`;
  raddrDec.textContent = ` (${raddrIdx})`;
  raddrBBits.textContent = `${raddrB1}${raddrB0}`;
  raddrBDec.textContent = ` (${raddrBIdx})`;
  memBits.textContent = `r0=${mem[0]} r1=${mem[1]} r2=${mem[2]} r3=${mem[3]}`;
  rdataBit.textContent = String(rdata);
  rdataBBit.textContent = String(rdataB);
}

function persist() {
  saveSnapshot<RfSnap>(SNAP_KEY, { mem: [...mem] as Bit[], we, waddr1, waddr0, raddr1, raddr0, raddrB1, raddrB0, wdata });
}

function commitWrite() { if (we) mem[waddr1 * 2 + waddr0] = wdata; }

btnWe.addEventListener('click',     () => { we = we === 0 ? 1 : 0; render(); persist(); });
btnWaddr1.addEventListener('click', () => { waddr1 = waddr1 === 0 ? 1 : 0; render(); persist(); });
btnWaddr0.addEventListener('click', () => { waddr0 = waddr0 === 0 ? 1 : 0; render(); persist(); });
btnWdata.addEventListener('click',  () => { wdata = wdata === 0 ? 1 : 0; render(); persist(); });
btnRaddr1.addEventListener('click', () => { raddr1 = raddr1 === 0 ? 1 : 0; render(); persist(); });
btnRaddr0.addEventListener('click', () => { raddr0 = raddr0 === 0 ? 1 : 0; render(); persist(); });
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
  we = 0; waddr1 = 0; waddr0 = 0; raddr1 = 0; raddr0 = 0; raddrB1 = 0; raddrB0 = 1; wdata = 0; clk = 0;
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
    s1: raddr1, s0: raddr0,
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

// ── Step walkthrough nav ─────────────────────────────────────────────
const steps = Array.from(document.querySelectorAll<HTMLElement>('.step'));
const stepPrev = document.getElementById('stepPrev') as HTMLButtonElement;
const stepNext = document.getElementById('stepNext') as HTMLButtonElement;
const stepNum  = document.getElementById('stepNum')!;
const stepCount = document.getElementById('stepCount')!;
stepCount.textContent = ` / ${steps.length}`;
let currentStep = 0;
function showStep(i: number) {
  currentStep = Math.max(0, Math.min(steps.length - 1, i));
  steps.forEach((s, idx) => s.toggleAttribute('hidden', idx !== currentStep));
  stepNum.textContent = String(currentStep + 1);
  stepPrev.disabled = currentStep === 0;
  stepNext.disabled = currentStep === steps.length - 1;
}
stepPrev.addEventListener('click', () => showStep(currentStep - 1));
stepNext.addEventListener('click', () => showStep(currentStep + 1));
showStep(0);

initPanel();
initToc();
