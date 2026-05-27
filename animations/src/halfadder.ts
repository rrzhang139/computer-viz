import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
// Half adder: A + B → (sum, carry)
//   sum   = A XOR B
//   carry = A AND B
// Treats XOR and AND as black-box gates. Hovering each one reveals its
// truth table with the current input row highlighted.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const btnA = document.getElementById('btnA') as HTMLButtonElement;
const btnB = document.getElementById('btnB') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg = document.getElementById('halfadder') as unknown as SVGSVGElement;
const sumDisplay = document.getElementById('sumDisplay')!;
const carryDisplay = document.getElementById('carryDisplay')!;

type HaSnap = { A: Bit; B: Bit };
const SNAP_KEY = 'halfadder';
const _snap = loadSnapshot<HaSnap>(SNAP_KEY);
let A: Bit = readBitParam('A', _snap?.A ?? 0);
let B: Bit = readBitParam('B', _snap?.B ?? 0);

// ── Truth-table overlay builder ──────────────────────────────────────
// Each gate's overlay is a small panel that fills the gate box with:
//   • a thin border + title at the top
//   • 4 rows of (A, B, Y) values
//   • the current row highlighted in orange
//
// The overlay's local coords match the gate box so we can place text at
// natural pixel positions (no scale transform = no font-size headaches).

interface GateBox { x: number; y: number; w: number; h: number; }
const GATE_BOXES: Record<'xor' | 'and', GateBox> = {
  xor: { x: 320, y: 60,  w: 240, h: 160 },
  and: { x: 320, y: 280, w: 240, h: 160 },
};
const TRUTH_TABLES: Record<'xor' | 'and', Bit[]> = {
  // outputs for rows (A=0,B=0), (A=0,B=1), (A=1,B=0), (A=1,B=1)
  xor: [0, 1, 1, 0],
  and: [0, 0, 0, 1],
};

function buildTruthTable(gate: 'xor' | 'and', box: GateBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', gate);

  // Outer border
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('class', 'tt-bg');
  bg.setAttribute('x', String(box.x));
  bg.setAttribute('y', String(box.y));
  bg.setAttribute('width', String(box.w));
  bg.setAttribute('height', String(box.h));
  bg.setAttribute('rx', '12');
  g.appendChild(bg);

  // Title
  const title = document.createElementNS(SVG_NS, 'text');
  title.setAttribute('class', 'tt-title');
  title.setAttribute('x', String(box.x + box.w / 2));
  title.setAttribute('y', String(box.y + 18));
  title.textContent = gate.toUpperCase();
  g.appendChild(title);

  // Column header
  const headerY = box.y + 42;
  for (const [i, label] of ['A', 'B', 'Y'].entries()) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'tt-header');
    t.setAttribute('x', String(box.x + 60 + i * 60));
    t.setAttribute('y', String(headerY));
    t.textContent = label;
    g.appendChild(t);
  }
  // Divider under header
  const div = document.createElementNS(SVG_NS, 'line');
  div.setAttribute('class', 'tt-divider');
  div.setAttribute('x1', String(box.x + 20));
  div.setAttribute('y1', String(headerY + 12));
  div.setAttribute('x2', String(box.x + box.w - 20));
  div.setAttribute('y2', String(headerY + 12));
  g.appendChild(div);

  // 4 rows
  const rowH = 22;
  const rowStart = headerY + 22;
  const outputs = TRUTH_TABLES[gate];
  for (let row = 0; row < 4; row++) {
    const a = ((row >> 1) & 1) as Bit;
    const b = (row & 1) as Bit;
    const y = outputs[row];
    const yMid = rowStart + row * rowH + rowH / 2;

    // Row highlight rect (fills when row is "current")
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('class', 'tt-row');
    r.setAttribute('data-row', String(row));
    r.setAttribute('x', String(box.x + 20));
    r.setAttribute('y', String(rowStart + row * rowH));
    r.setAttribute('width', String(box.w - 40));
    r.setAttribute('height', String(rowH));
    r.setAttribute('rx', '4');
    g.appendChild(r);

    // Group with the three cell values so we can style them when the row is on
    const cellG = document.createElementNS(SVG_NS, 'g');
    cellG.setAttribute('class', 'tt-cell-group');
    for (const [i, v] of [a, b, y].entries()) {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('class', 'tt-cell');
      t.setAttribute('x', String(box.x + 60 + i * 60));
      t.setAttribute('y', String(yMid));
      t.textContent = String(v);
      cellG.appendChild(t);
    }
    g.appendChild(cellG);
  }

  return g;
}

for (const gate of ['xor', 'and'] as const) {
  document.getElementById(`slot-${gate}`)
    ?.appendChild(buildTruthTable(gate, GATE_BOXES[gate]));
}

// ── Pulse overlay for wires (same as other pages) ─────────────────────
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

function highlightRow(gate: 'xor' | 'and', currentRow: number) {
  const root = svg.querySelector(`g.detailed[data-slot="${gate}"]`);
  if (!root) return;
  root.querySelectorAll<SVGRectElement>('.tt-row').forEach((r) => {
    const row = Number(r.getAttribute('data-row'));
    r.setAttribute('data-on', row === currentRow ? '1' : '0');
  });
}

function render() {
  const sum: Bit = (A ^ B) as Bit;
  const carry: Bit = (A & B) as Bit;

  setAttr('.wire[data-net="A"]',     A);
  setAttr('.wire[data-net="B"]',     B);
  setAttr('.wire[data-net="sum"]',   sum);
  setAttr('.wire[data-net="carry"]', carry);

  document.getElementById('gXor')!.setAttribute('data-on', String(sum));
  document.getElementById('gAnd')!.setAttribute('data-on', String(carry));

  document.getElementById('pinA')!.setAttribute('data-on',     String(A));
  document.getElementById('pinB')!.setAttribute('data-on',     String(B));
  document.getElementById('pinSum')!.setAttribute('data-on',   String(sum));
  document.getElementById('pinCarry')!.setAttribute('data-on', String(carry));

  // Truth table row highlight: index = A*2 + B
  const row = A * 2 + B;
  highlightRow('xor', row);
  highlightRow('and', row);

  sumDisplay.textContent = String(sum);
  carryDisplay.textContent = String(carry);

  setBtn(btnA, 'A', A);
  setBtn(btnB, 'B', B);
}

function persist() { saveSnapshot<HaSnap>(SNAP_KEY, { A, B }); }
btnA.addEventListener('click', () => { A = A === 0 ? 1 : 0; render(); persist(); });
btnB.addEventListener('click', () => { B = B === 0 ? 1 : 0; render(); persist(); });
btnReset.addEventListener('click', () => {
  A = 0; B = 0; clearSnapshot(SNAP_KEY); render();
});

// XOR and AND don't have dedicated gate pages of their own — /index.html
// is the NAND gate, not XOR or AND. So no drill-down for these slots.
// Hovering still swaps the simple body for the gate's mini representation;
// that's purely CSS-driven and works without a click handler.
// Mark these slots as non-clickable so the cursor doesn't lie.
for (const id of ['slot-xor', 'slot-and']) {
  document.getElementById(id)?.style.setProperty('cursor', 'default');
}

initDrillBreadcrumb();

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

initPanel();
initToc();
