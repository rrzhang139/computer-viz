import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import {
  buildDffScene, bindDffSceneState,
  DFF_SCENE_W, DFF_SCENE_H,
} from "./scenes/dffScene";
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
type RegSnap = { D: Bit[]; CLK: Bit; cells: { Q: Bit; QB: Bit; Qm: Bit; QBm: Bit }[] };
const SNAP_KEY = 'register';
const _snap = loadSnapshot<RegSnap>(SNAP_KEY);
// URL params (drilled-into from PC) take priority over snapshot.
const D: Bit[] = [
  readBitParam('D0', _snap?.D?.[0] ?? 0),
  readBitParam('D1', _snap?.D?.[1] ?? 0),
  readBitParam('D2', _snap?.D?.[2] ?? 0),
  readBitParam('D3', _snap?.D?.[3] ?? 0),
];
let CLK: Bit = readBitParam('CLK', _snap?.CLK ?? 0);
if (_snap?.cells) {
  for (let i = 0; i < 4; i++) {
    cells[i].Qm = _snap.cells[i].Qm;
    cells[i].QBm = _snap.cells[i].QBm;
    cells[i].Q  = _snap.cells[i].Q;
    cells[i].QB = _snap.cells[i].QB;
  }
}
// If Q params are provided (PC drill), force the cell to that Q state.
for (let i = 0; i < 4; i++) {
  const q = new URLSearchParams(window.location.search).get(`Q${i}`);
  if (q === '0' || q === '1') {
    const b: Bit = Number(q) as Bit;
    cells[i].Q = b; cells[i].QB = (b === 0 ? 1 : 0) as Bit;
    cells[i].Qm = b; cells[i].QBm = cells[i].QB;
  }
}

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

// ── DFF mini geometry: imported from src/scenes/dffScene.ts ───────────
// The DFF visualization lives in ONE module, shared by /dff.html, this
// register's per-bit overlay, and /counter.html's register-overlay
// sub-component. To change how a DFF looks anywhere, edit dffScene.ts.

const DFF_BOX = { w: 300, h: 120 };
// LSB-at-BOTTOM: bit 0 lives in the bottom slot, bit 3 in the top.
const DFF_SLOT_POS = [
  { x: 350, y: 540 },  // bit 0 — bottom
  { x: 350, y: 380 },  // bit 1
  { x: 350, y: 220 },  // bit 2
  { x: 350, y: 60  },  // bit 3 — top
];

// Mount one DFF scene per bit slot. Each <g class="detailed" data-slot>
// wraps the scene with the translate+scale needed to fit the slot.
for (let i = 0; i < 4; i++) {
  const slot = `bit${i}`;
  const pos = DFF_SLOT_POS[i];
  const wrap = document.createElementNS(SVG_NS, 'g');
  wrap.setAttribute('class', 'detailed');
  wrap.setAttribute('data-slot', slot);
  wrap.setAttribute('transform',
    `translate(${pos.x}, ${pos.y}) scale(${DFF_BOX.w / DFF_SCENE_W}, ${DFF_BOX.h / DFF_SCENE_H})`);
  wrap.appendChild(buildDffScene());
  document.getElementById(`slot-${slot}`)?.appendChild(wrap);
}

function setMiniState(i: number, D: Bit, CLK: Bit, Qm: Bit, Q: Bit) {
  const root = svg.querySelector<SVGGElement>(`g.detailed[data-slot="bit${i}"]`);
  if (!root) return;
  bindDffSceneState(root, { D, CLK, Qm, Q });
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

function persist() {
  saveSnapshot<RegSnap>(SNAP_KEY, {
    D: [...D] as Bit[], CLK,
    cells: cells.map((c) => ({ Qm: c.Qm, QBm: c.QBm, Q: c.Q, QB: c.QB })),
  });
}

for (let i = 0; i < 4; i++) {
  const btn = [btnD0, btnD1, btnD2, btnD3][i];
  btn.addEventListener('click', () => { D[i] = D[i] === 0 ? 1 : 0; render(); persist(); });
}
btnCLK.addEventListener('click', () => { CLK = CLK === 0 ? 1 : 0; render(); persist(); });
btnPulse.addEventListener('click', () => {
  CLK = 0; render();
  setTimeout(() => { CLK = 1; render(); persist(); }, 500);
  setTimeout(() => { CLK = 0; render(); persist(); }, 1100);
});
btnReset.addEventListener('click', () => {
  CLK = 0;
  for (let i = 0; i < 4; i++) {
    D[i] = 0;
    cells[i].Qm = 0; cells[i].QBm = 1;
    cells[i].Q = 0; cells[i].QB = 1;
  }
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-down: click any bit cell to view it as a standalone DFF ────
for (let i = 0; i < 4; i++) {
  document.getElementById(`slot-bit${i}`)?.addEventListener('click', () => {
    window.location.assign(buildDrillUrl('/dff.html', {
      from: 'register', which: `bit${i}`, D: D[i], CLK, Q: cells[i].Q,
    }));
  });
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
