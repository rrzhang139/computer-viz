// DFF (master-slave D flip-flop):
//   - master D latch is transparent when CLK = 0 (its EN = !CLK)
//   - slave  D latch is transparent when CLK = 1 (its EN =  CLK)
// Because the two are never enabled at the same time, a value can only
// travel D → master → slave → Q at the rising clock edge.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnD     = document.getElementById('btnD')     as HTMLButtonElement;
const btnCLK   = document.getElementById('btnCLK')   as HTMLButtonElement;
const btnPulse = document.getElementById('btnPulse') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg      = document.getElementById('dff')      as unknown as SVGSVGElement;

let D: Bit = 0;
let CLK: Bit = 0;
// Master and slave latch internal states.
let Qm: Bit = 0;  let QBm: Bit = 1;
let Q:  Bit = 0;  let QB:  Bit = 1;

// Each D latch settles by:
//   Sbar = NAND(input, EN)
//   Rbar = NAND(!input, EN)
//   then iterate the SR latch until stable.
function settleDLatch(input: Bit, EN: Bit, state: { Q: Bit; QB: Bit }) {
  const Sbar: Bit = (input & EN) === 1 ? 0 : 1;
  const inv: Bit = input === 0 ? 1 : 0;
  const Rbar: Bit = (inv & EN) === 1 ? 0 : 1;
  let q = state.Q, qb = state.QB;
  for (let i = 0; i < 6; i++) {
    const nQ:  Bit = (Sbar & qb) === 1 ? 0 : 1;
    const nQB: Bit = (Rbar & q)  === 1 ? 0 : 1;
    if (nQ === q && nQB === qb) break;
    q = nQ; qb = nQB;
  }
  state.Q = q; state.QB = qb;
}

// ── D-latch mini geometry (for master/slave hover overlays) ─────────────
// Local coords match the standalone D-latch page content (840 × 560).
const DLATCH_MINI_WIRES: { net: string; points: string }[] = [
  // D input branches
  { net: 'D',    points: '0,280 35,280' },
  { net: 'D',    points: '0,280 20,280 20,145 145,145' },
  // D̄ from inverter to G_R
  { net: 'Dbar', points: '105,280 125,280 125,355 145,355' },
  // EN trunk down the inner-left corridor + branches into G_S and G_R B-inputs
  { net: 'EN',   points: '315,35 315,75 125,75 125,415' },
  { net: 'EN',   points: '125,205 145,205' },
  { net: 'EN',   points: '125,415 145,415' },
  // S̄ / R̄ into the SR latch
  { net: 'Sbar', points: '345,165 435,165 435,224 525,224' },
  { net: 'Rbar', points: '345,375 435,375 435,308 525,308' },
  // Q / Q̄ out
  { net: 'Q',   points: '805,233 820,233 820,175 840,175' },
  { net: 'QB',  points: '805,317 820,317 820,385 840,385' },
];
const DLATCH_MINI_BOXES = [
  { tid: 'inv',   x: 35,  y: 259, w: 70,  h: 42,  lx: 70,  ly: 280 },
  { tid: 'G_S',   x: 145, y: 105, w: 200, h: 140, lx: 245, ly: 175 },
  { tid: 'G_R',   x: 145, y: 315, w: 200, h: 140, lx: 245, ly: 385 },
  { tid: 'latch', x: 525, y: 187, w: 280, h: 186, lx: 665, ly: 280 },
];

interface SlotBox { x: number; y: number; w: number; h: number; }
const DLATCH_BOXES: Record<string, SlotBox> = {
  master: { x: 180, y: 160, w: 360, h: 240 },
  slave:  { x: 620, y: 160, w: 360, h: 240 },
};

function buildDlatchMini(slot: string, box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  g.setAttribute('transform',
    `translate(${box.x}, ${box.y}) scale(${box.w / 840}, ${box.h / 560})`);
  for (const w of DLATCH_MINI_WIRES) {
    const wire = document.createElementNS(SVG_NS, 'polyline');
    wire.setAttribute('class', 'wire-mini');
    wire.setAttribute('data-net', w.net);
    wire.setAttribute('data-on', '0');
    wire.setAttribute('points', w.points);
    g.appendChild(wire);
  }
  for (const b of DLATCH_MINI_BOXES) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', b.tid);
    r.setAttribute('x', String(b.x));
    r.setAttribute('y', String(b.y));
    r.setAttribute('width', String(b.w));
    r.setAttribute('height', String(b.h));
    r.setAttribute('rx', b.tid === 'inv' ? '6' : '10');
    g.appendChild(r);
    const txt = document.createElementNS(SVG_NS, 'text');
    txt.setAttribute('class', 'tlabel-mini');
    txt.setAttribute('data-tid', b.tid);
    txt.setAttribute('x', String(b.lx));
    txt.setAttribute('y', String(b.ly));
    txt.textContent = b.tid;
    g.appendChild(txt);
  }
  return g;
}

for (const slot of Object.keys(DLATCH_BOXES)) {
  document.getElementById(`slot-${slot}`)
    ?.appendChild(buildDlatchMini(slot, DLATCH_BOXES[slot]));
}

function setDlatchMiniState(
  slot: string, D: Bit, EN: Bit, Q: Bit, QB: Bit,
) {
  const root = svg.querySelector(`g.detailed[data-slot="${slot}"]`);
  if (!root) return;
  const Dbar: Bit = D === 0 ? 1 : 0;
  const Sbar: Bit = (D & EN) === 1 ? 0 : 1;
  const Rbar: Bit = (Dbar & EN) === 1 ? 0 : 1;
  const set = (sel: string, on: Bit) =>
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  set('.wire-mini[data-net="D"]',    D);
  set('.wire-mini[data-net="Dbar"]', Dbar);
  set('.wire-mini[data-net="EN"]',   EN);
  set('.wire-mini[data-net="Sbar"]', Sbar);
  set('.wire-mini[data-net="Rbar"]', Rbar);
  set('.wire-mini[data-net="Q"]',    Q);
  set('.wire-mini[data-net="QB"]',   QB);
  root.querySelector(`.tbody-mini[data-tid="inv"]`)?.setAttribute('data-on', String(Dbar));
  root.querySelector(`.tbody-mini[data-tid="G_S"]`)?.setAttribute('data-on', String(Sbar));
  root.querySelector(`.tbody-mini[data-tid="G_R"]`)?.setAttribute('data-on', String(Rbar));
  root.querySelector(`.tbody-mini[data-tid="latch"]`)?.setAttribute('data-on', String(Q));
}

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

function setAttr(selector: string, on: Bit) {
  svg.querySelectorAll(selector).forEach((el) => {
    (el as Element).setAttribute('data-on', String(on));
    const p = pulseFor.get(el as SVGPolylineElement);
    if (p) p.setAttribute('data-on', String(on));
  });
}
function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  const notCLK: Bit = CLK === 0 ? 1 : 0;
  // Settle in order: master first (its input is D), then slave (its input is Qm).
  const masterState = { Q: Qm, QB: QBm };
  settleDLatch(D, notCLK, masterState);
  Qm = masterState.Q; QBm = masterState.QB;

  const slaveState = { Q, QB };
  settleDLatch(Qm, CLK, slaveState);
  Q = slaveState.Q; QB = slaveState.QB;

  setAttr('.wire[data-net="D"]',      D);
  setAttr('.wire[data-net="CLK"]',    CLK);
  setAttr('.wire[data-net="notCLK"]', notCLK);
  setAttr('.wire[data-net="M"]',      Qm);
  setAttr('.wire[data-net="Q"]',      Q);
  setAttr('.wire[data-net="QB"]',     QB);

  document.getElementById('iInv')!.setAttribute('data-on', String(notCLK));
  // The master glows when its INTERNAL Qm is high; same for slave with Q.
  document.getElementById('gMaster')!.setAttribute('data-on', String(Qm));
  document.getElementById('gSlave')!.setAttribute('data-on', String(Q));
  // Propagate state into the hover overlay minis.
  setDlatchMiniState('master', D, notCLK, Qm, QBm);
  setDlatchMiniState('slave',  Qm, CLK,    Q,  QB);

  document.getElementById('pinD')!.setAttribute('data-on',   String(D));
  document.getElementById('pinCLK')!.setAttribute('data-on', String(CLK));
  document.getElementById('pinQ')!.setAttribute('data-on',   String(Q));
  document.getElementById('pinQB')!.setAttribute('data-on',  String(QB));

  setBtn(btnD,   'D',   D);
  setBtn(btnCLK, 'CLK', CLK);
}

btnD.addEventListener('click', () => { D = D === 0 ? 1 : 0; render(); });
btnCLK.addEventListener('click', () => { CLK = CLK === 0 ? 1 : 0; render(); });
btnPulse.addEventListener('click', () => {
  // CLK: 0 → 1 → 0, with visible pauses so the rising edge feels dramatic.
  CLK = 0; render();
  setTimeout(() => { CLK = 1; render(); }, 500);
  setTimeout(() => { CLK = 0; render(); }, 1100);
});
btnReset.addEventListener('click', () => {
  D = 0; CLK = 0;
  Qm = 0; QBm = 1; Q = 0; QB = 1;
  render();
});

render();

// Step-through walkthrough nav
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
