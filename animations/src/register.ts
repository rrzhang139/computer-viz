// 4-bit register: four DFFs sharing one CLK. Each cell is independent; the
// shared clock is what gives the bundle its atomic-update property.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnD0    = document.getElementById('btnD0')    as HTMLButtonElement;
const btnD1    = document.getElementById('btnD1')    as HTMLButtonElement;
const btnD2    = document.getElementById('btnD2')    as HTMLButtonElement;
const btnD3    = document.getElementById('btnD3')    as HTMLButtonElement;
const btnCLK   = document.getElementById('btnCLK')   as HTMLButtonElement;
const btnPulse = document.getElementById('btnPulse') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg      = document.getElementById('register') as unknown as SVGSVGElement;
const wordEl   = document.getElementById('wordDisplay') as HTMLElement;

// 4 bits of state. Each cell has master + slave latch state.
interface DFFState { Qm: Bit; QBm: Bit; Q: Bit; QB: Bit; }
const cells: DFFState[] = [
  { Qm: 0, QBm: 1, Q: 0, QB: 1 },
  { Qm: 0, QBm: 1, Q: 0, QB: 1 },
  { Qm: 0, QBm: 1, Q: 0, QB: 1 },
  { Qm: 0, QBm: 1, Q: 0, QB: 1 },
];
const D: Bit[] = [0, 0, 0, 0];
let CLK: Bit = 0;

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

// ── DFF mini geometry ─────────────────────────────────────────────────
// Local coords 500 × 200 (aspect 2.5, matches the parent DFF box 300 × 120).
// When the user hovers a bit slot, this mini fills the box: D enters left,
// CLK enters top and fans out (one branch to slave EN, one "notCLK" branch
// to master EN — both share the trunk start to suggest the inversion).
const DFF_MINI_WIRES: { net: string; points: string }[] = [
  { net: 'D',      points: '0,100 60,100' },
  { net: 'CLK',    points: '250,0 250,25' },
  { net: 'CLK',    points: '250,25 360,25 360,40' },
  { net: 'notCLK', points: '250,25 140,25 140,40' },
  { net: 'M',      points: '220,100 280,100' },
  { net: 'Q',      points: '440,100 500,100' },
];
const DFF_MINI_BOXES = [
  { tid: 'master', x: 60,  y: 40, w: 160, h: 120, lx: 140, ly: 100 },
  { tid: 'slave',  x: 280, y: 40, w: 160, h: 120, lx: 360, ly: 100 },
];

const DFF_BOX = { w: 300, h: 120 };
const DFF_SLOT_POS = [
  { x: 350, y: 60  },
  { x: 350, y: 220 },
  { x: 350, y: 380 },
  { x: 350, y: 540 },
];

function buildDffMini(slot: string, posX: number, posY: number): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  g.setAttribute('transform',
    `translate(${posX}, ${posY}) scale(${DFF_BOX.w / 500}, ${DFF_BOX.h / 200})`);

  for (const w of DFF_MINI_WIRES) {
    const wire = document.createElementNS(SVG_NS, 'polyline');
    wire.setAttribute('class', 'wire-mini');
    wire.setAttribute('data-net', w.net);
    wire.setAttribute('data-on', '0');
    wire.setAttribute('points', w.points);
    g.appendChild(wire);
  }
  for (const b of DFF_MINI_BOXES) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', b.tid);
    r.setAttribute('x', String(b.x));
    r.setAttribute('y', String(b.y));
    r.setAttribute('width', String(b.w));
    r.setAttribute('height', String(b.h));
    r.setAttribute('rx', '8');
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

for (let i = 0; i < 4; i++) {
  const slot = `bit${i}`;
  const pos = DFF_SLOT_POS[i];
  document.getElementById(`slot-${slot}`)
    ?.appendChild(buildDffMini(slot, pos.x, pos.y));
}

function setMiniState(i: number, D: Bit, CLK: Bit, Qm: Bit, Q: Bit) {
  const root = svg.querySelector(`g.detailed[data-slot="bit${i}"]`);
  if (!root) return;
  const notCLK: Bit = CLK === 0 ? 1 : 0;
  const set = (sel: string, on: Bit) =>
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  set('.wire-mini[data-net="D"]',      D);
  set('.wire-mini[data-net="CLK"]',    CLK);
  set('.wire-mini[data-net="notCLK"]', notCLK);
  set('.wire-mini[data-net="M"]',      Qm);
  set('.wire-mini[data-net="Q"]',      Q);
  root.querySelector(`.tbody-mini[data-tid="master"]`)?.setAttribute('data-on', String(Qm));
  root.querySelector(`.tbody-mini[data-tid="slave"]`)?.setAttribute('data-on', String(Q));
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

  // Settle each cell independently. All share the same CLK / notCLK.
  for (let i = 0; i < 4; i++) {
    const cell = cells[i];
    const masterState = { Q: cell.Qm, QB: cell.QBm };
    settleDLatch(D[i], notCLK, masterState);
    cell.Qm = masterState.Q; cell.QBm = masterState.QB;

    const slaveState = { Q: cell.Q, QB: cell.QB };
    settleDLatch(cell.Qm, CLK, slaveState);
    cell.Q = slaveState.Q; cell.QB = slaveState.QB;
  }

  // Wires
  setAttr('.wire[data-net="CLK"]', CLK);
  for (let i = 0; i < 4; i++) {
    setAttr(`.wire[data-net="D${i}"]`, D[i]);
    setAttr(`.wire[data-net="Q${i}"]`, cells[i].Q);
  }

  // DFF bodies glow by current Q (the cell's stored bit).
  for (let i = 0; i < 4; i++) {
    document.getElementById(`gBit${i}`)!
      .setAttribute('data-on', String(cells[i].Q));
    setMiniState(i, D[i], CLK, cells[i].Qm, cells[i].Q);
  }

  // Pins
  document.getElementById('pinCLK')!.setAttribute('data-on', String(CLK));
  for (let i = 0; i < 4; i++) {
    document.getElementById(`pinD${i}`)!.setAttribute('data-on', String(D[i]));
    document.getElementById(`pinQ${i}`)!.setAttribute('data-on', String(cells[i].Q));
  }

  // Buttons
  setBtn(btnD0, 'D0', D[0]);
  setBtn(btnD1, 'D1', D[1]);
  setBtn(btnD2, 'D2', D[2]);
  setBtn(btnD3, 'D3', D[3]);
  setBtn(btnCLK, 'CLK', CLK);

  // Stored word readout (bit 3 is MSB on the LEFT, bit 0 on the RIGHT —
  // standard binary notation regardless of physical layout)
  wordEl.textContent = `${cells[3].Q}${cells[2].Q}${cells[1].Q}${cells[0].Q}`;
}

for (let i = 0; i < 4; i++) {
  const btn = [btnD0, btnD1, btnD2, btnD3][i];
  btn.addEventListener('click', () => { D[i] = D[i] === 0 ? 1 : 0; render(); });
}
btnCLK.addEventListener('click', () => { CLK = CLK === 0 ? 1 : 0; render(); });
btnPulse.addEventListener('click', () => {
  CLK = 0; render();
  setTimeout(() => { CLK = 1; render(); }, 500);
  setTimeout(() => { CLK = 0; render(); }, 1100);
});
btnReset.addEventListener('click', () => {
  CLK = 0;
  for (let i = 0; i < 4; i++) {
    D[i] = 0;
    cells[i].Qm = 0; cells[i].QBm = 1;
    cells[i].Q = 0; cells[i].QB = 1;
  }
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
