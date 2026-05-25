// Full adder: A + B + Cin → (S, Cout)
//   sum1   = A XOR B          (HA1's sum)
//   carry1 = A AND B          (HA1's carry)
//   S      = sum1 XOR Cin     (HA2's sum, = final sum bit)
//   carry2 = sum1 AND Cin     (HA2's carry)
//   Cout   = carry1 OR carry2 (final carry)
//
// Hovering HA1 or HA2 shows their internal XOR+AND state.
// Hovering the OR gate shows its truth table.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnA   = document.getElementById('btnA')   as HTMLButtonElement;
const btnB   = document.getElementById('btnB')   as HTMLButtonElement;
const btnCin = document.getElementById('btnCin') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg = document.getElementById('fulladder') as unknown as SVGSVGElement;
const sumDisplay = document.getElementById('sumDisplay')!;
const coutDisplay = document.getElementById('coutDisplay')!;

let A: Bit = 0;
let B: Bit = 0;
let Cin: Bit = 0;

// ── HA mini geometry ──────────────────────────────────────────────────
// Local coords match the HA box (240 × 160). Inside: two stylized sub-boxes
// for XOR (top) and AND (bottom), plus internal wires routing A and B to
// each sub-box and the sub-box outputs to the parent HA's sum/carry exits.

const HA_BOX = { w: 240, h: 160 };
const HA_MINI_WIRES: { net: string; points: string }[] = [
  // A net: enters at (0, 40), tees down at x=30 to reach AND below
  { net: 'A',     points: '0,40 30,40 30,110' },
  { net: 'A',     points: '30,40 80,40' },
  { net: 'A',     points: '30,110 80,110' },
  // B net: enters at (0, 120), tees up at x=50 to reach XOR above
  { net: 'B',     points: '0,120 50,120 50,60' },
  { net: 'B',     points: '50,60 80,60' },
  { net: 'B',     points: '50,120 80,120' },
  // Sub-box outputs
  { net: 'sum',   points: '160,40 240,40' },
  { net: 'carry', points: '160,120 240,120' },
];
const HA_MINI_BOXES = [
  { tid: 'XOR', x: 80,  y: 20,  w: 80, h: 40, lx: 120, ly: 40 },
  { tid: 'AND', x: 80,  y: 100, w: 80, h: 40, lx: 120, ly: 120 },
];

interface SlotBox { x: number; y: number; w: number; h: number; }
const HA_SLOT_POS: Record<string, SlotBox> = {
  ha1: { x: 180, y: 60, w: 240, h: 160 },
  ha2: { x: 530, y: 60, w: 240, h: 160 },
};

function buildHaMini(slot: string, box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  g.setAttribute('transform',
    `translate(${box.x}, ${box.y}) scale(${box.w / HA_BOX.w}, ${box.h / HA_BOX.h})`);

  // Background pane so the mini reads as a unit
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('fill', 'rgba(20, 20, 20, 0.92)');
  bg.setAttribute('stroke', 'var(--on)');
  bg.setAttribute('stroke-width', '1.5');
  bg.setAttribute('vector-effect', 'non-scaling-stroke');
  bg.setAttribute('x', '0'); bg.setAttribute('y', '0');
  bg.setAttribute('width', String(HA_BOX.w));
  bg.setAttribute('height', String(HA_BOX.h));
  bg.setAttribute('rx', '10');
  g.appendChild(bg);

  for (const w of HA_MINI_WIRES) {
    const wire = document.createElementNS(SVG_NS, 'polyline');
    wire.setAttribute('class', 'wire-mini');
    wire.setAttribute('data-net', w.net);
    wire.setAttribute('data-on', '0');
    wire.setAttribute('points', w.points);
    g.appendChild(wire);
  }
  for (const b of HA_MINI_BOXES) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tbody-mini');
    r.setAttribute('data-tid', b.tid);
    r.setAttribute('x', String(b.x));
    r.setAttribute('y', String(b.y));
    r.setAttribute('width', String(b.w));
    r.setAttribute('height', String(b.h));
    r.setAttribute('rx', '6');
    g.appendChild(r);
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tlabel-mini');
    t.setAttribute('data-tid', b.tid);
    t.setAttribute('x', String(b.lx));
    t.setAttribute('y', String(b.ly));
    t.textContent = b.tid;
    g.appendChild(t);
  }
  return g;
}

for (const slot of Object.keys(HA_SLOT_POS)) {
  document.getElementById(`slot-${slot}`)
    ?.appendChild(buildHaMini(slot, HA_SLOT_POS[slot]));
}

function setHaMiniState(slot: string, A: Bit, B: Bit) {
  const root = svg.querySelector(`g.detailed[data-slot="${slot}"]`);
  if (!root) return;
  const sum: Bit = (A ^ B) as Bit;
  const carry: Bit = (A & B) as Bit;
  const set = (sel: string, on: Bit) =>
    root.querySelectorAll(sel).forEach((el) => el.setAttribute('data-on', String(on)));
  set('.wire-mini[data-net="A"]',     A);
  set('.wire-mini[data-net="B"]',     B);
  set('.wire-mini[data-net="sum"]',   sum);
  set('.wire-mini[data-net="carry"]', carry);
  root.querySelector(`.tbody-mini[data-tid="XOR"]`)?.setAttribute('data-on', String(sum));
  root.querySelector(`.tbody-mini[data-tid="AND"]`)?.setAttribute('data-on', String(carry));
}

// ── OR truth table overlay ───────────────────────────────────────────
const OR_BOX = { x: 530, y: 280, w: 200, h: 160 };
const OR_TRUTH: Bit[] = [0, 1, 1, 1]; // outputs for (0,0), (0,1), (1,0), (1,1)

function buildOrTruthTable(box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', 'or');

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('class', 'tt-bg');
  bg.setAttribute('x', String(box.x)); bg.setAttribute('y', String(box.y));
  bg.setAttribute('width', String(box.w)); bg.setAttribute('height', String(box.h));
  bg.setAttribute('rx', '12');
  g.appendChild(bg);

  const title = document.createElementNS(SVG_NS, 'text');
  title.setAttribute('class', 'tt-title');
  title.setAttribute('x', String(box.x + box.w / 2));
  title.setAttribute('y', String(box.y + 18));
  title.textContent = 'OR';
  g.appendChild(title);

  const headerY = box.y + 42;
  for (const [i, label] of ['A', 'B', 'Y'].entries()) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tt-header');
    t.setAttribute('x', String(box.x + 50 + i * 50));
    t.setAttribute('y', String(headerY));
    t.textContent = label;
    g.appendChild(t);
  }
  const div = document.createElementNS(SVG_NS, 'line');
  div.setAttribute('class', 'tt-divider');
  div.setAttribute('x1', String(box.x + 20)); div.setAttribute('y1', String(headerY + 12));
  div.setAttribute('x2', String(box.x + box.w - 20)); div.setAttribute('y2', String(headerY + 12));
  g.appendChild(div);

  const rowH = 22, rowStart = headerY + 22;
  for (let row = 0; row < 4; row++) {
    const a = ((row >> 1) & 1) as Bit;
    const b = (row & 1) as Bit;
    const y = OR_TRUTH[row];
    const yMid = rowStart + row * rowH + rowH / 2;
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tt-row');
    r.setAttribute('data-row', String(row));
    r.setAttribute('x', String(box.x + 20));
    r.setAttribute('y', String(rowStart + row * rowH));
    r.setAttribute('width', String(box.w - 40));
    r.setAttribute('height', String(rowH));
    r.setAttribute('rx', '4');
    g.appendChild(r);
    const cellG = document.createElementNS(SVG_NS, 'g');
    cellG.setAttribute('class', 'tt-cell-group');
    for (const [i, v] of [a, b, y].entries()) {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'tt-cell');
      t.setAttribute('x', String(box.x + 50 + i * 50));
      t.setAttribute('y', String(yMid));
      t.textContent = String(v);
      cellG.appendChild(t);
    }
    g.appendChild(cellG);
  }
  return g;
}
document.getElementById('slot-or')?.appendChild(buildOrTruthTable(OR_BOX));

function highlightOrRow(currentRow: number) {
  const root = svg.querySelector(`g.detailed[data-slot="or"]`);
  if (!root) return;
  root.querySelectorAll<SVGRectElement>('.tt-row').forEach((r) => {
    const row = Number(r.getAttribute('data-row'));
    r.setAttribute('data-on', row === currentRow ? '1' : '0');
  });
}

// ── Pulse overlay for wires ──────────────────────────────────────────
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
  const sum1:   Bit = (A ^ B) as Bit;
  const carry1: Bit = (A & B) as Bit;
  const S:      Bit = (sum1 ^ Cin) as Bit;
  const carry2: Bit = (sum1 & Cin) as Bit;
  const Cout:   Bit = (carry1 | carry2) as Bit;

  setAttr('.wire[data-net="A"]',      A);
  setAttr('.wire[data-net="B"]',      B);
  setAttr('.wire[data-net="Cin"]',    Cin);
  setAttr('.wire[data-net="sum1"]',   sum1);
  setAttr('.wire[data-net="carry1"]', carry1);
  setAttr('.wire[data-net="carry2"]', carry2);
  setAttr('.wire[data-net="S"]',      S);
  setAttr('.wire[data-net="Cout"]',   Cout);

  document.getElementById('gHa1')!.setAttribute('data-on', String(sum1 || carry1));
  document.getElementById('gHa2')!.setAttribute('data-on', String(S    || carry2));
  document.getElementById('gOr') !.setAttribute('data-on', String(Cout));

  document.getElementById('pinA')!.setAttribute('data-on',    String(A));
  document.getElementById('pinB')!.setAttribute('data-on',    String(B));
  document.getElementById('pinCin')!.setAttribute('data-on',  String(Cin));
  document.getElementById('pinS')!.setAttribute('data-on',    String(S));
  document.getElementById('pinCout')!.setAttribute('data-on', String(Cout));

  // Propagate state into hover overlay minis
  setHaMiniState('ha1', A, B);
  setHaMiniState('ha2', sum1, Cin);
  highlightOrRow(carry1 * 2 + carry2);

  sumDisplay.textContent = String(S);
  coutDisplay.textContent = String(Cout);

  setBtn(btnA,   'A',   A);
  setBtn(btnB,   'B',   B);
  setBtn(btnCin, 'Cin', Cin);
}

btnA.addEventListener('click',   () => { A   = A   === 0 ? 1 : 0; render(); });
btnB.addEventListener('click',   () => { B   = B   === 0 ? 1 : 0; render(); });
btnCin.addEventListener('click', () => { Cin = Cin === 0 ? 1 : 0; render(); });
btnReset.addEventListener('click', () => { A = 0; B = 0; Cin = 0; render(); });

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
