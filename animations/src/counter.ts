import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import {
  buildRegisterScene, bindRegisterSceneState,
  REGISTER_SCENE_W, REGISTER_SCENE_H,
} from "./scenes/registerScene";

// Program counter: 4-bit register + 4-bit adder + feedback loop.
//
// State is a single 4-bit value PC; the adder's output is always
// (PC + STEP) mod 16, computed live between clock edges. On the rising
// edge of CLK, the register snapshots the adder's output → PC := PC + STEP.
//
// STEP is toggleable between 1 (single-step demo) and 4 (RV32I-style
// word-aligned fetch, advancing by one 4-byte instruction per cycle).

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnCLK   = document.getElementById('btnCLK')   as HTMLButtonElement;
const btnPulse = document.getElementById('btnPulse') as HTMLButtonElement;
const btnStep  = document.getElementById('btnStep')  as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg      = document.getElementById('counter')  as unknown as SVGSVGElement;
const pcBits   = document.getElementById('pcBits')   as HTMLElement;
const pcDec    = document.getElementById('pcDec')    as HTMLElement;
const nextBits = document.getElementById('nextBits') as HTMLElement;
const adderTitle = document.getElementById('adderTitle')    as unknown as SVGTextElement;
const adderSubtitle = document.getElementById('adderSubtitle') as unknown as SVGTextElement;
const loopTag    = document.getElementById('loopTag')       as unknown as SVGTextElement;

type PcSnap = { PC: number; CLK: Bit; STEP: 1 | 4 };
const SNAP_KEY = 'counter';
const _snap = loadSnapshot<PcSnap>(SNAP_KEY);
let PC = _snap?.PC ?? 0;             // 0..15
let CLK: Bit = _snap?.CLK ?? 0;
let prevCLK: Bit = 0;
let STEP: 1 | 4 = (_snap?.STEP === 4 ? 4 : 1);

function bitOf(n: number, i: number): Bit {
  return ((n >> i) & 1) as Bit;
}
function bitsOf(n: number): string {
  return `${bitOf(n, 3)}${bitOf(n, 2)}${bitOf(n, 1)}${bitOf(n, 0)}`;
}

// ── Hover overlays — shared layout constants ────────────────────────────
// Both overlays fill their parent box (380 × 480). Each holds 4 sub-cells
// stacked vertically. CRITICAL: row centers must match the parent's D/Q/A/S
// wire y-positions so the overlay's per-row terminals line up pixel-perfect
// with the parent wires on hover.
//
// Per layer-9 wireframe (wire_sketches/layer9_counter.md): bits sit at
// evenly-spaced fractions (0.125 / 0.375 / 0.625 / 0.875) of the box
// height. Parent register box top-left = (80, 140), height 480:
//   bit 3: y = 140 + 0.125·480 = 200 → overlay-local y =  60
//   bit 2: y = 140 + 0.375·480 = 320 → overlay-local y = 180
//   bit 1: y = 140 + 0.625·480 = 440 → overlay-local y = 300
//   bit 0: y = 140 + 0.875·480 = 560 → overlay-local y = 420
// Same fractions for the adder box at (800, 140).
const OVERLAY_W = 380;
const OVERLAY_H = 480;
const CELL_BOX_W = 200;
const CELL_BOX_H = 70;
// Center the cells horizontally: (OVERLAY_W - CELL_BOX_W) / 2 = 90. Then
// the LEFT-side input stub (D / A) and the RIGHT-side output run (Q / S)
// are equal-length 90px segments — symmetric.
const CELL_BOX_X = 90;
// Row centers locked to parent wire y-positions. Box y = center - H/2.
const CELL_Y_BY_BIT: Record<number, number> = {
  3:  60 - CELL_BOX_H / 2,   // box y: 25,  center: 60
  2: 180 - CELL_BOX_H / 2,   // box y: 145, center: 180
  1: 300 - CELL_BOX_H / 2,   // box y: 265, center: 300
  0: 420 - CELL_BOX_H / 2,   // box y: 385, center: 420
};
// y in the gap between bit lowerBit (BELOW) and bit lowerBit+1 (ABOVE).
// Row pitch 120; with H=70, each gap is 50 units tall — center at
// midpoint of adjacent row centers (e.g. bit-0 center 420, bit-1 center
// 300 → gap center 360).
const GAP_Y_BY_LOWER_BIT: Record<number, number> = {
  0: 360,
  1: 240,
  2: 120,
};

const REG_OVERLAY_X = 80;
const REG_OVERLAY_Y = 140;
const ADD_OVERLAY_X = 800;
const ADD_OVERLAY_Y = 140;

function makeOverlayBg(g: SVGGElement) {
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('class', 'mini-bg');
  bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
  bg.setAttribute('width',  String(OVERLAY_W));
  bg.setAttribute('height', String(OVERLAY_H));
  bg.setAttribute('rx', '14');
  g.appendChild(bg);
}

// Register overlay: embeds the shared registerScene (4 labeled "DFF bit N"
// boxes). This is the SAME visual that /register.html shows at its top
// level — no master/slave detail, because that lives one layer deeper
// and the user has to drill into /register.html to see it.
function buildRegisterOverlay(): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('transform', `translate(${REG_OVERLAY_X}, ${REG_OVERLAY_Y})`);
  makeOverlayBg(g);

  // "CLK (shared)" header across the top.
  const clkHeader = document.createElementNS(SVG_NS, 'text');
  clkHeader.setAttribute('class', 'tlabel-mini-tiny');
  clkHeader.setAttribute('x', String(OVERLAY_W / 2));
  clkHeader.setAttribute('y', '10');
  clkHeader.textContent = 'CLK (shared)';
  g.appendChild(clkHeader);

  // External per-bit D and Q wires (light up to mirror parent state).
  for (let bit = 3; bit >= 0; bit--) {
    const boxY = CELL_Y_BY_BIT[bit];
    const rowCenter = boxY + CELL_BOX_H / 2;
    const dWire = document.createElementNS(SVG_NS, 'polyline');
    dWire.setAttribute('class', 'wire-mini');
    dWire.setAttribute('data-net', `D${bit}`);
    dWire.setAttribute('points', `0,${rowCenter} ${CELL_BOX_X},${rowCenter}`);
    g.appendChild(dWire);
    const qWire = document.createElementNS(SVG_NS, 'polyline');
    qWire.setAttribute('class', 'wire-mini');
    qWire.setAttribute('data-net', `Q${bit}`);
    qWire.setAttribute('points',
      `${CELL_BOX_X + CELL_BOX_W},${rowCenter} ${OVERLAY_W},${rowCenter}`);
    g.appendChild(qWire);
  }

  // Embed the shared register scene. Frame is 380×480 (same as overlay),
  // so scale is 1×1 and translate is (0, 0).
  const sx = OVERLAY_W / REGISTER_SCENE_W;
  const sy = OVERLAY_H / REGISTER_SCENE_H;
  const wrap = document.createElementNS(SVG_NS, 'g');
  wrap.setAttribute('class', 'register-scene-wrap');
  wrap.setAttribute('transform', `translate(0, 0) scale(${sx}, ${sy})`);
  wrap.appendChild(buildRegisterScene());
  g.appendChild(wrap);

  return g;
}

// Adder overlay: 4 FAs stacked, per-gap carry arrows (no rail to cross
// S wires). A enters LEFT, S exits RIGHT, B is constant 0001.
function buildAdderOverlay(): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('transform', `translate(${ADD_OVERLAY_X}, ${ADD_OVERLAY_Y})`);
  makeOverlayBg(g);

  // Top external Cout label — appears above FA3
  const coutLbl = document.createElementNS(SVG_NS, 'text');
  coutLbl.setAttribute('class', 'tlabel-mini-tiny');
  coutLbl.setAttribute('x', String(CELL_BOX_X + CELL_BOX_W / 2));
  coutLbl.setAttribute('y', '10');
  coutLbl.textContent = '↑ Cout (unused)';
  g.appendChild(coutLbl);

  // Bottom external Cin label — appears below FA0. Cin is hardwired to
  // GND in a pure adder (we're not doing subtraction), so the label
  // explicitly shows the tie.
  const cinLbl = document.createElementNS(SVG_NS, 'text');
  cinLbl.setAttribute('class', 'tlabel-mini-tiny');
  cinLbl.setAttribute('x', String(CELL_BOX_X + CELL_BOX_W / 2));
  cinLbl.setAttribute('y', String(OVERLAY_H - 6));
  cinLbl.textContent = '↑ Cin = 0  (tied to GND)';
  g.appendChild(cinLbl);

  for (let bit = 3; bit >= 0; bit--) {
    const boxY = CELL_Y_BY_BIT[bit];
    const rowCenter = boxY + CELL_BOX_H / 2;

    // A input wire (LEFT short stub)
    const aWire = document.createElementNS(SVG_NS, 'polyline');
    aWire.setAttribute('class', 'wire-mini');
    aWire.setAttribute('data-net', `A${bit}`);
    aWire.setAttribute('points', `0,${rowCenter} ${CELL_BOX_X},${rowCenter}`);
    g.appendChild(aWire);

    // S output wire (RIGHT, long)
    const sWire = document.createElementNS(SVG_NS, 'polyline');
    sWire.setAttribute('class', 'wire-mini');
    sWire.setAttribute('data-net', `S${bit}`);
    sWire.setAttribute('points',
      `${CELL_BOX_X + CELL_BOX_W},${rowCenter} ${OVERLAY_W},${rowCenter}`);
    g.appendChild(sWire);

    // FA box
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-bit', String(bit));
    r.setAttribute('x', String(CELL_BOX_X));
    r.setAttribute('y', String(boxY));
    r.setAttribute('width',  String(CELL_BOX_W));
    r.setAttribute('height', String(CELL_BOX_H));
    r.setAttribute('rx', '10');
    g.appendChild(r);

    // Title + readout
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini');
    t.setAttribute('x', String(CELL_BOX_X + CELL_BOX_W / 2));
    t.setAttribute('y', String(rowCenter - 8));
    t.textContent = `FA bit ${bit}`;
    g.appendChild(t);

    const tsub = document.createElementNS(SVG_NS, 'text');
    tsub.setAttribute('class', 'tlabel-mini-tiny');
    tsub.setAttribute('x', String(CELL_BOX_X + CELL_BOX_W / 2));
    tsub.setAttribute('y', String(rowCenter + 14));
    tsub.textContent = `S = 0`;
    tsub.setAttribute('data-fa-readout', String(bit));
    g.appendChild(tsub);

    // B input — a short stub on the LEFT side of the cell, at a y below
    // A (which is at rowCenter). Per layer-7 wireframe, the FA's B input
    // is on LEFT frac 0.4 (between A at 0.2 and Cin at 0.667). In the
    // counter context, B is a CONSTANT tied to Vdd (B=1) or GND (B=0) —
    // drawn as a short stub so it visibly differs from A which comes
    // from the parent's Q wire.
    const bY = rowCenter + 18;
    const bWire = document.createElementNS(SVG_NS, 'polyline');
    bWire.setAttribute('class', 'wire-mini');
    bWire.setAttribute('data-net', `B${bit}`);
    bWire.setAttribute('data-on', '0');
    bWire.setAttribute('points', `${CELL_BOX_X - 30},${bY} ${CELL_BOX_X},${bY}`);
    g.appendChild(bWire);

    // B-constant label, just to the LEFT of the B stub.
    const bLbl = document.createElementNS(SVG_NS, 'text');
    bLbl.setAttribute('class', 'tlabel-mini-tiny');
    bLbl.setAttribute('data-b-label', String(bit));
    bLbl.setAttribute('x', String(CELL_BOX_X - 35));
    bLbl.setAttribute('y', String(bY));
    bLbl.setAttribute('text-anchor', 'end');
    g.appendChild(bLbl);
  }

  // Per-gap carry indicators: short vertical "↑ Cn" arrows in each gap
  // between adjacent FAs. lowerBit is the bit BELOW the gap (Cout source).
  for (const lowerBitStr of Object.keys(GAP_Y_BY_LOWER_BIT)) {
    const lowerBit = Number(lowerBitStr);
    const gapY = GAP_Y_BY_LOWER_BIT[lowerBit];
    const arrowX = CELL_BOX_X + CELL_BOX_W / 2;

    const arrow = document.createElementNS(SVG_NS, 'polyline');
    arrow.setAttribute('class', 'wire-mini');
    arrow.setAttribute('data-net', `carry${lowerBit + 1}`);
    arrow.setAttribute('points', `${arrowX},${gapY + 10} ${arrowX},${gapY - 10}`);
    g.appendChild(arrow);

    const arrowLbl = document.createElementNS(SVG_NS, 'text');
    arrowLbl.setAttribute('class', 'tlabel-mini-tiny');
    arrowLbl.setAttribute('x', String(arrowX + 18));
    arrowLbl.setAttribute('y', String(gapY + 4));
    arrowLbl.textContent = `↑ C${lowerBit}${lowerBit + 1}`;
    g.appendChild(arrowLbl);
  }

  return g;
}

// Mount the overlays
document.getElementById('slot-register')?.appendChild(buildRegisterOverlay());
document.getElementById('slot-adder')?.appendChild(buildAdderOverlay());

function setMiniWire(slotId: string, net: string, on: Bit) {
  document.getElementById(slotId)
    ?.querySelectorAll<SVGPolylineElement>(`.wire-mini[data-net="${net}"]`)
    .forEach((el) => el.setAttribute('data-on', String(on)));
}
function setMiniBit(slotId: string, bit: number, on: Bit) {
  document.getElementById(slotId)
    ?.querySelector<SVGRectElement>(`.tbody-mini[data-bit="${bit}"]`)
    ?.setAttribute('data-on', String(on));
}
function setMiniReadout(slotId: string, attr: string, bit: number, text: string, on: Bit) {
  const el = document.getElementById(slotId)
    ?.querySelector<SVGTextElement>(`text[${attr}="${bit}"]`);
  if (!el) return;
  el.textContent = text;
  el.setAttribute('fill', on ? 'var(--on)' : '#666');
}

// Add per-wire pulse overlays so the .pulse class can animate flow on lit wires.
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

function setWire(net: string, on: Bit) {
  svg.querySelectorAll<SVGPolylineElement>(`.wire[data-net="${net}"]`).forEach((el) => {
    el.setAttribute('data-on', String(on));
    const p = pulseFor.get(el);
    if (p) p.setAttribute('data-on', String(on));
  });
}
function setPin(id: string, on: Bit) {
  document.getElementById(id)?.setAttribute('data-on', String(on));
}
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  // Edge detection: capture the adder's output on rising edge of CLK.
  const next = (PC + STEP) & 0b1111;
  if (prevCLK === 0 && CLK === 1) {
    PC = next;
  }
  prevCLK = CLK;

  const newNext = (PC + STEP) & 0b1111;

  // Dynamic labels for the current STEP mode.
  adderTitle.textContent = `+${STEP} adder`;
  adderSubtitle.textContent = STEP === 1
    ? '4-bit · B = 0001 (constant)'
    : '4-bit · B = 0100 (constant)';
  loopTag.textContent = `+${STEP} feedback loop`;
  btnStep.textContent = `step: +${STEP}`;

  // Register and adder body glow based on whether their stored/computed value
  // is non-zero — a coarse "active" indicator.
  document.getElementById('boxReg')!.setAttribute('data-on', PC !== 0 ? '1' : '0');
  document.getElementById('boxAdd')!.setAttribute('data-on', newNext !== 0 ? '1' : '0');

  // Per-bit Q and S wires + labels
  for (let i = 0; i < 4; i++) {
    const q = bitOf(PC, i);
    const s = bitOf(newNext, i);
    setWire(`Q${i}`, q);
    setWire(`S${i}`, s);
    document.getElementById(`qLabel${i}`)!.textContent = `Q${i} = ${q}`;
    document.getElementById(`sLabel${i}`)!.textContent = `S${i} = ${s}`;
    document.getElementById(`qLabel${i}`)!.setAttribute('fill', q ? 'var(--on)' : '#555');
    document.getElementById(`sLabel${i}`)!.setAttribute('fill', s ? 'var(--on)' : '#555');
    setPin(`pinS${i}`, s);
    setPin(`pinD${i}`, s); // D inputs = adder outputs (feedback)

    // Register overlay: parent wires (D and Q at row-center) light per bit.
    // The inner register scene gets bound once after this loop.
    setMiniWire('slot-register', `D${i}`, s);
    setMiniWire('slot-register', `Q${i}`, q);

    // Adder overlay: mirror A/S/carry state on the 4-FA mini
    setMiniWire('slot-adder', `A${i}`, q);
    setMiniWire('slot-adder', `S${i}`, s);
    setMiniBit('slot-adder', i, s);
    setMiniReadout('slot-adder', 'data-fa-readout', i, `S = ${s}`, s);
  }
  setMiniWire('slot-register', 'CLK', CLK);

  // Bind the inner register scene (cell rects + Q readouts) to the
  // current PC bits. Single call — the shared module fans out to all 4
  // cells via data-bit attributes.
  const regSceneRoot = document.querySelector<SVGGElement>(
    '#slot-register .register-scene-wrap',
  );
  if (regSceneRoot) {
    bindRegisterSceneState(regSceneRoot, {
      Q: [bitOf(PC, 0), bitOf(PC, 1), bitOf(PC, 2), bitOf(PC, 3)],
    });
  }

  // Carry chain inside the adder overlay. B is the STEP constant, expanded
  // bit-by-bit: STEP=1 → B=0001, STEP=4 → B=0100.
  const A = [bitOf(PC, 0), bitOf(PC, 1), bitOf(PC, 2), bitOf(PC, 3)];
  const B = [bitOf(STEP, 0), bitOf(STEP, 1), bitOf(STEP, 2), bitOf(STEP, 3)];
  const carry: number[] = [0, 0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const sum3 = A[i] + B[i] + carry[i];
    carry[i + 1] = sum3 >= 2 ? 1 : 0;
  }
  for (let k = 0; k <= 4; k++) {
    setMiniWire('slot-adder', `carry${k}`, carry[k] as Bit);
  }
  // Light up each FA's B-constant input wire based on the current STEP.
  for (let i = 0; i < 4; i++) {
    setMiniWire('slot-adder', `B${i}`, B[i] as Bit);
  }
  // Update per-FA B-constant labels in the adder overlay based on STEP.
  for (let i = 0; i < 4; i++) {
    const lbl = document.querySelector<SVGTextElement>(
      `#slot-adder text[data-b-label="${i}"]`,
    );
    if (lbl) {
      // B is HARDWIRED — show the tie explicitly. B=1 means the wire is
      // permanently connected to Vdd; B=0 means tied to GND. The +1/+4
      // toggle in the UI is showing two different physical circuits, not
      // a runtime switch (a real chip can't dynamically retie wires).
      lbl.textContent = `B=${B[i]} (${B[i] ? 'Vdd' : 'GND'})`;
      lbl.setAttribute('fill', B[i] ? 'var(--on)' : '#666');
    }
  }

  // CLK wire + pin
  setWire('CLK', CLK);
  setPin('pinCLK', CLK);

  // Controls
  setBtn(btnCLK, 'CLK', CLK);

  // Readout
  pcBits.textContent = bitsOf(PC);
  pcDec.textContent = String(PC);
  nextBits.textContent = bitsOf(newNext);
}

function persist() { saveSnapshot<PcSnap>(SNAP_KEY, { PC, CLK, STEP }); }

btnCLK.addEventListener('click', () => { CLK = CLK === 0 ? 1 : 0; render(); persist(); });
btnStep.addEventListener('click', () => {
  STEP = STEP === 1 ? 4 : 1;
  render();
  persist();
});
btnPulse.addEventListener('click', () => {
  CLK = 0; render();
  setTimeout(() => { CLK = 1; render(); persist(); }, 500);
  setTimeout(() => { CLK = 0; render(); persist(); }, 1100);
});
btnReset.addEventListener('click', () => {
  PC = 0; CLK = 0; prevCLK = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-down: clicking the register or adder navigates with the
// current PC bits and STEP-derived B constant baked into URL params.
function bit(n: number, i: number): Bit { return ((n >> i) & 1) as Bit; }
document.getElementById('slot-register')?.addEventListener('click', () => {
  // The register's D inputs receive the adder's output (= PC + STEP) and
  // its Q outputs hold the current PC. Both feed via URL params so the
  // register page shows the same snapshot.
  const next = (PC + STEP) & 0b1111;
  window.location.assign(buildDrillUrl('/register.html', {
    from: 'counter', which: 'register',
    D0: bit(next, 0), D1: bit(next, 1), D2: bit(next, 2), D3: bit(next, 3),
    Q0: bit(PC, 0),   Q1: bit(PC, 1),   Q2: bit(PC, 2),   Q3: bit(PC, 3),
    CLK,
  }));
});
document.getElementById('slot-adder')?.addEventListener('click', () => {
  // The adder's A inputs receive PC bits; B is the constant STEP
  // (0001 for +1, 0100 for +4); Cin is 0.
  window.location.assign(buildDrillUrl('/adder4.html', {
    from: 'counter', which: 'adder',
    A0: bit(PC, 0),   A1: bit(PC, 1),   A2: bit(PC, 2),   A3: bit(PC, 3),
    B0: bit(STEP, 0), B1: bit(STEP, 1), B2: bit(STEP, 2), B3: bit(STEP, 3),
    Cin: 0,
  }));
});

initDrillBreadcrumb();

render();

// Step walkthrough nav
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
