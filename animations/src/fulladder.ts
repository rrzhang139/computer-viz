import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
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

type FaSnap = { A: Bit; B: Bit; Cin: Bit };
const SNAP_KEY = 'fulladder';
const _snap = loadSnapshot<FaSnap>(SNAP_KEY);
let A: Bit = readBitParam('A', _snap?.A ?? 0);
let B: Bit = readBitParam('B', _snap?.B ?? 0);
let Cin: Bit = readBitParam('Cin', _snap?.Cin ?? 0);

// ── Embed an EXACT copy of /halfadder.html in each HA slot, and route the
// full adder's wires onto the embedded half adders' real pins. ───────────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const HA1: Record<string, Pt> = embeds.get('slot-ha1') || {};
const HA2: Record<string, Pt> = embeds.get('slot-ha2') || {};
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
const placePin = (id: string, x: number, y: number) => {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
};
if (HA1.pinA && HA1.pinB && HA1.pinSum && HA1.pinCarry &&
    HA2.pinA && HA2.pinB && HA2.pinSum && HA2.pinCarry) {
  // HA1: A_in←A, B_in←B, Sum→sum1, Carry→carry1.
  placePin('pinA', 0, HA1.pinA.y); setW('wA', `0,${HA1.pinA.y} ${HA1.pinA.x},${HA1.pinA.y}`);
  placePin('pinB', 0, HA1.pinB.y); setW('wB', `0,${HA1.pinB.y} ${HA1.pinB.x},${HA1.pinB.y}`);
  // sum1: HA1.Sum → HA2.A
  setW('wSum1', `${HA1.pinSum.x},${HA1.pinSum.y} ${HA2.pinA.x},${HA2.pinA.y}`);
  // Cin: enters from the left, wraps UP over HA1, down onto HA2.B (stay left of HA2 box)
  placePin('pinCin', 0, 380);
  setW('wCin', `0,380 60,380 60,40 ${HA2.pinB.x - 25},40 ${HA2.pinB.x - 25},${HA2.pinB.y} ${HA2.pinB.x},${HA2.pinB.y}`);
  // carry1: HA1.Carry → OR top input (530,320)
  setW('wCarry1', `${HA1.pinCarry.x},${HA1.pinCarry.y} 460,${HA1.pinCarry.y} 460,320 530,320`);
  // carry2: HA2.Carry → OR bottom input (530,400), wrapping below
  setW('wCarry2', `${HA2.pinCarry.x},${HA2.pinCarry.y} 810,${HA2.pinCarry.y} 810,460 490,460 490,400 530,400`);
  // S: HA2.Sum → S_out
  setW('wS', `${HA2.pinSum.x},${HA2.pinSum.y} 1020,${HA2.pinSum.y}`);
  placePin('pinS', 1020, HA2.pinSum.y);
}

// Light an embedded half adder to its logical state.
function lightHa(hostId: string, a: Bit, b: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const sum: Bit = (a ^ b) as Bit;
  const carry: Bit = (a & b) as Bit;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('A', a); w('B', b); w('sum', sum); w('carry', carry);
  body('gXor', sum); body('gAnd', carry);
}
interface SlotBox { x: number; y: number; w: number; h: number; }

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

  // Propagate state into the embedded half-adder copies + OR truth table
  lightHa('ha1Detail', A, B);
  lightHa('ha2Detail', sum1, Cin);
  highlightOrRow(carry1 * 2 + carry2);

  sumDisplay.textContent = String(S);
  coutDisplay.textContent = String(Cout);

  setBtn(btnA,   'A',   A);
  setBtn(btnB,   'B',   B);
  setBtn(btnCin, 'Cin', Cin);
}

function persist() { saveSnapshot<FaSnap>(SNAP_KEY, { A, B, Cin }); }
btnA.addEventListener('click',   () => { A   = A   === 0 ? 1 : 0; render(); persist(); });
btnB.addEventListener('click',   () => { B   = B   === 0 ? 1 : 0; render(); persist(); });
btnCin.addEventListener('click', () => { Cin = Cin === 0 ? 1 : 0; render(); persist(); });
btnReset.addEventListener('click', () => {
  A = 0; B = 0; Cin = 0;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-down to children ───────────────────────────────────────────
// HA1 takes (A, B) directly, produces sum1 and carry1.
// HA2 takes (sum1, Cin), produces S (final sum) and carry2.
// OR  takes (carry1, carry2), produces Cout.
document.getElementById('slot-ha1')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/halfadder.html', {
    from: 'fulladder', which: 'HA1', A, B,
  }));
});
document.getElementById('slot-ha2')?.addEventListener('click', () => {
  const sum1: Bit = ((A ^ B) & 1) as Bit;
  window.location.assign(buildDrillUrl('/halfadder.html', {
    from: 'fulladder', which: 'HA2', A: sum1, B: Cin,
  }));
});
// The OR gate doesn't have its own dedicated page (we only have /index.html
// for NAND), so no drill-down on slot-or. Hovering still reveals the OR's
// internal representation via CSS; clicks just no-op.
document.getElementById('slot-or')?.style.setProperty('cursor', 'default');

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
