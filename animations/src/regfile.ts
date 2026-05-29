import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { renderDecoderScene } from "./scenes/decoderScene";
import { buildDffScene, bindDffSceneState, placeDffScene } from "./scenes/dffScene";
import { buildMuxScene, bindMuxSceneState, placeMuxScene } from "./scenes/muxScene";

// Register file — 4 entries × 1 bit, 1 write port + 1 read port.
//
//   write: on a clock edge, if we=1, the register addressed by
//          (waddr1, waddr0) latches wdata.
//   read:  rdata = value of the register addressed by (raddr1, raddr0)
//          (combinational — always live).
//
// Internally: a 2-to-4 decoder turns the write address into a one-hot
// write-enable (wen0..wen3). Each wen line is ANDed with clk to form
// that register's gated clock, so only the addressed register sees an
// edge. The read port is a 4-to-1 MUX selecting one register's Q.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnWe     = document.getElementById('btnWe')     as HTMLButtonElement;
const btnWaddr1 = document.getElementById('btnWaddr1') as HTMLButtonElement;
const btnWaddr0 = document.getElementById('btnWaddr0') as HTMLButtonElement;
const btnWdata  = document.getElementById('btnWdata')  as HTMLButtonElement;
const btnRaddr1 = document.getElementById('btnRaddr1') as HTMLButtonElement;
const btnRaddr0 = document.getElementById('btnRaddr0') as HTMLButtonElement;
const btnPulse  = document.getElementById('btnPulse')  as HTMLButtonElement;
const btnReset  = document.getElementById('btnReset')  as HTMLButtonElement;
const svg       = document.getElementById('regfile')   as unknown as SVGSVGElement;

const waddrBits = document.getElementById('waddrBits') as HTMLElement;
const waddrDec  = document.getElementById('waddrDec')  as HTMLElement;
const raddrBits = document.getElementById('raddrBits') as HTMLElement;
const raddrDec  = document.getElementById('raddrDec')  as HTMLElement;
const memBits   = document.getElementById('memBits')   as HTMLElement;
const rdataBit  = document.getElementById('rdataBit')  as HTMLElement;

type RfSnap = { mem: Bit[]; we: Bit; waddr1: Bit; waddr0: Bit; raddr1: Bit; raddr0: Bit; wdata: Bit };
const SNAP_KEY = 'regfile';
const _snap = loadSnapshot<RfSnap>(SNAP_KEY);
const mem: Bit[] = [
  (_snap?.mem?.[0] ?? 0) as Bit,
  (_snap?.mem?.[1] ?? 0) as Bit,
  (_snap?.mem?.[2] ?? 0) as Bit,
  (_snap?.mem?.[3] ?? 0) as Bit,
];
let we: Bit     = readBitParam('we', _snap?.we ?? 0);
let waddr1: Bit = readBitParam('waddr1', _snap?.waddr1 ?? 0);
let waddr0: Bit = readBitParam('waddr0', _snap?.waddr0 ?? 0);
let raddr1: Bit = readBitParam('raddr1', _snap?.raddr1 ?? 0);
let raddr0: Bit = readBitParam('raddr0', _snap?.raddr0 ?? 0);
let wdata: Bit  = readBitParam('wdata', _snap?.wdata ?? 0);
let clk: Bit    = 0;  // transient — only high during a clock-write pulse

// ── Hover previews: each child block swaps in its real internals on hover.
// All three reuse the single-source scene modules the standalone pages use,
// so the preview is the actual /decoder.html, /dff.html and /mux.html scene
// fitted to this layer's box (CLAUDE.md rule 21 — connected-hover preview).
const decoderDetail = document.getElementById('decoderDetail');
if (decoderDetail) {
  decoderDetail.appendChild(renderDecoderScene(
    { x: 210, y: 35, w: 280, h: 280 },
    { idPrefix: 'dp', showPins: false, pinRadius: 3 },
  ));
}
const REG_BOX_Y: Record<number, number> = { 3: 70, 2: 245, 1: 420, 0: 595 };
const dffScenes: (SVGGElement | null)[] = [null, null, null, null];
for (let i = 0; i < 4; i++) {
  const host = document.getElementById(`reg${i}Detail`);
  if (!host) continue;
  const scene = buildDffScene();
  dffScenes[i] = scene;
  host.appendChild(placeDffScene(scene, { x: 735, y: REG_BOX_Y[i], w: 210, h: 140 }));
}
const muxDetailHost = document.getElementById('muxDetail');
const muxScene = muxDetailHost ? buildMuxScene() : null;
if (muxDetailHost && muxScene) {
  muxDetailHost.appendChild(placeMuxScene(muxScene, { x: 1120, y: 315, w: 210, h: 350 }));
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
    const p = pulseFor.get(el);
    if (p) p.setAttribute('data-on', String(on));
  });
}
function setPin(id: string, on: Bit) {
  document.getElementById(id)?.setAttribute('data-on', String(on));
}
function setBody(id: string, on: Bit) {
  document.getElementById(id)?.setAttribute('data-on', String(on));
}
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  const waddrIdx = waddr1 * 2 + waddr0;
  const raddrIdx = raddr1 * 2 + raddr0;

  // Write decoder → one-hot write-enable (gated by we)
  const wen: Bit[] = [0, 0, 0, 0];
  if (we) wen[waddrIdx] = 1;
  // Gated clock per register (only the selected one passes a clock edge)
  const gclk: Bit[] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) gclk[i] = (clk && wen[i]) as Bit;

  // Read port (combinational)
  const rdata: Bit = mem[raddrIdx];

  // ── Input wires + pins
  setNet('we', we);         setPin('pinWe', we);
  setNet('waddr1', waddr1); setPin('pinWaddr1', waddr1);
  setNet('waddr0', waddr0); setPin('pinWaddr0', waddr0);
  setNet('raddr1', raddr1); setPin('pinRaddr1', raddr1);
  setNet('raddr0', raddr0); setPin('pinRaddr0', raddr0);
  setNet('clk', clk);       setPin('pinClk', clk);
  setNet('wdata', wdata);   setPin('pinWdata', wdata);

  // ── Internal nets
  for (let i = 0; i < 4; i++) {
    setNet(`wen${i}`, wen[i]);
    setNet(`gclk${i}`, gclk[i]);
    setNet(`q${i}`, mem[i]);
  }
  setNet('rdata', rdata);
  setPin('pinRdata', rdata);

  // ── Body glows
  setBody('gDecoder', we);                 // decoder active when write-enabled
  for (let i = 0; i < 4; i++) {
    setBody(`gAnd${i}`, wen[i]);           // the armed clock-gate (selected register)
    setBody(`gReg${i}`, mem[i]);           // stored bit (body glow shows state)
  }
  setBody('gMux', rdata);

  // ── Hover-preview state (drives each child block's embedded internals).
  // Decoder mini: inverters produce ~waddr, the 4 ANDs follow the one-hot.
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
  // DFF minis: each cell shows D=wdata, its gated clock, and the held bit.
  for (let i = 0; i < 4; i++) {
    if (dffScenes[i]) bindDffSceneState(dffScenes[i]!, { D: wdata, CLK: gclk[i], Qm: mem[i], Q: mem[i] });
  }
  // MUX mini: the four stored bits as data inputs, read address as select.
  if (muxScene) bindMuxSceneState(muxScene, { ins: [...mem] as Bit[], s1: raddr1, s0: raddr0 });

  // ── Buttons
  setBtn(btnWe, 'we', we);
  setBtn(btnWaddr1, 'waddr1', waddr1);
  setBtn(btnWaddr0, 'waddr0', waddr0);
  setBtn(btnWdata, 'wdata', wdata);
  setBtn(btnRaddr1, 'raddr1', raddr1);
  setBtn(btnRaddr0, 'raddr0', raddr0);

  // ── Readouts
  waddrBits.textContent = `${waddr1}${waddr0}`;
  waddrDec.textContent = ` (${waddrIdx})`;
  raddrBits.textContent = `${raddr1}${raddr0}`;
  raddrDec.textContent = ` (${raddrIdx})`;
  memBits.textContent = `${mem[3]} ${mem[2]} ${mem[1]} ${mem[0]}`;
  rdataBit.textContent = String(rdata);
}

function persist() {
  saveSnapshot<RfSnap>(SNAP_KEY, { mem: [...mem] as Bit[], we, waddr1, waddr0, raddr1, raddr0, wdata });
}

// Commit a write: latch wdata into the addressed register iff we=1.
function commitWrite() {
  if (we) mem[waddr1 * 2 + waddr0] = wdata;
}

btnWe.addEventListener('click',     () => { we = we === 0 ? 1 : 0; render(); persist(); });
btnWaddr1.addEventListener('click', () => { waddr1 = waddr1 === 0 ? 1 : 0; render(); persist(); });
btnWaddr0.addEventListener('click', () => { waddr0 = waddr0 === 0 ? 1 : 0; render(); persist(); });
btnWdata.addEventListener('click',  () => { wdata = wdata === 0 ? 1 : 0; render(); persist(); });
btnRaddr1.addEventListener('click', () => { raddr1 = raddr1 === 0 ? 1 : 0; render(); persist(); });
btnRaddr0.addEventListener('click', () => { raddr0 = raddr0 === 0 ? 1 : 0; render(); persist(); });

// Clock-write pulse: clk 0→1 (latch on the edge) →0. The gated-clock wire
// lights up only for the addressed register, so you see the edge reach
// exactly one cell.
btnPulse.addEventListener('click', () => {
  clk = 0; render();
  setTimeout(() => { clk = 1; commitWrite(); render(); persist(); }, 200);
  setTimeout(() => { clk = 0; render(); persist(); }, 1000);
});

btnReset.addEventListener('click', () => {
  mem[0] = 0; mem[1] = 0; mem[2] = 0; mem[3] = 0;
  we = 0; waddr1 = 0; waddr0 = 0; raddr1 = 0; raddr0 = 0; wdata = 0; clk = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-downs ──────────────────────────────────────────────────────
document.getElementById('slot-decoder')?.addEventListener('click', () => {
  // Write-address decoder: a1=waddr1, a0=waddr0, EN=we.
  window.location.assign(buildDrillUrl('/decoder.html', {
    from: 'regfile', which: 'wdec', a1: waddr1, a0: waddr0, EN: we,
  }));
});
for (let i = 0; i < 4; i++) {
  document.getElementById(`slot-reg${i}`)?.addEventListener('click', () => {
    // Cell i is a DFF: D=wdata (pending), CLK=its gated clock, Q=stored bit.
    const selected = we && (waddr1 * 2 + waddr0) === i ? 1 : 0;
    window.location.assign(buildDrillUrl('/dff.html', {
      from: 'regfile', which: `reg${i}`,
      D: wdata, CLK: (clk && selected) as Bit, Q: mem[i],
    }));
  });
}
document.getElementById('slot-mux')?.addEventListener('click', () => {
  // Read MUX: in0..in3 = the four stored bits, select = read address.
  window.location.assign(buildDrillUrl('/mux.html', {
    from: 'regfile', which: 'rmux',
    in0: mem[0], in1: mem[1], in2: mem[2], in3: mem[3],
    s1: raddr1, s0: raddr0,
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
