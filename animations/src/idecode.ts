import { initPanel } from "./panel";
import { initToc } from "./toc";
import { readBitParam, initDrillBreadcrumb, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// Instruction decoder — pure field extraction. The 8-bit instruction word
// (opcode | rs1 | rs2 | rd) is sliced into four 2-bit fields, each wired
// STRAIGHT to its datapath control input. No logic, no crossings:
//   opcode → op,  rs1 → raddrA,  rs2 → raddrB,  rd → waddr
// (Opcode encoding == ALU op encoding by construction, so op needs no remap.)

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('idecode') as unknown as SVGSVGElement;

// Each bit: button id, svg cell id, output pin id, wire net, state key.
type BitDef = { btn: string; cell: string; pin: string; net: string; label: string };
const BITS: BitDef[] = [
  { btn: 'btnOp1', cell: 'gBitOp1', pin: 'pinOp1',     net: 'op1',     label: 'op1' },
  { btn: 'btnOp0', cell: 'gBitOp0', pin: 'pinOp0',     net: 'op0',     label: 'op0' },
  { btn: 'btnA1',  cell: 'gBitA1',  pin: 'pinRaddrA1', net: 'raddrA1', label: 'rs1₁' },
  { btn: 'btnA0',  cell: 'gBitA0',  pin: 'pinRaddrA0', net: 'raddrA0', label: 'rs1₀' },
  { btn: 'btnB1',  cell: 'gBitB1',  pin: 'pinRaddrB1', net: 'raddrB1', label: 'rs2₁' },
  { btn: 'btnB0',  cell: 'gBitB0',  pin: 'pinRaddrB0', net: 'raddrB0', label: 'rs2₀' },
  { btn: 'btnW1',  cell: 'gBitW1',  pin: 'pinWaddr1',  net: 'waddr1',  label: 'rd₁' },
  { btn: 'btnW0',  cell: 'gBitW0',  pin: 'pinWaddr0',  net: 'waddr0',  label: 'rd₀' },
];

type Snap = { v: Bit[] };
const SNAP_KEY = 'idecode';
const _snap = loadSnapshot<Snap>(SNAP_KEY);
const v: Bit[] = BITS.map((b, i) => readBitParam(b.net, (_snap?.v?.[i] ?? 0) as Bit));

// ── Per-wire pulse overlays so lit field wires animate flow. ──
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
  for (const w of wires) if (w.getAttribute('data-net') === net) {
    w.setAttribute('data-on', String(on));
    pulseFor.get(w)?.setAttribute('data-on', String(on));
  }
}
const T = (id: string) => document.getElementById(id) as HTMLElement;
function setBtn(id: string, label: string, value: Bit) {
  const b = document.getElementById(id) as HTMLButtonElement | null;
  if (!b) return;
  b.setAttribute('data-on', String(value));
  b.textContent = `${label} ${value}`;
}

const OP_NAMES = ['ADD', 'AND', 'OR', 'XOR'];   // ALU op encoding (00..11)

function render() {
  BITS.forEach((b, i) => {
    const on = v[i];
    setNet(b.net, on);
    document.getElementById(b.pin)?.setAttribute('data-on', String(on));
    const cell = document.getElementById(b.cell);
    cell?.setAttribute('data-on', String(on));
    // the bit value text sits right after the cell rect
    const valText = cell?.nextElementSibling as SVGTextElement | null;
    if (valText) valText.textContent = String(on);
    setBtn(b.btn, b.label, on);
  });

  const op = v[0] * 2 + v[1];
  const rs1 = v[2] * 2 + v[3], rs2 = v[4] * 2 + v[5], rd = v[6] * 2 + v[7];

  // Field output buses (/2) + the incoming instruction bus (/8). A bus lights
  // when its field carries a non-zero value (0 = dim, as everywhere else).
  const on = (n: number): Bit => (n ? 1 : 0);
  setNet('instr', on(op | rs1 | rs2 | rd));
  setNet('op', on(op)); setNet('raddrA', on(rs1)); setNet('raddrB', on(rs2)); setNet('waddr', on(rd));
  document.getElementById('pinInstr')?.setAttribute('data-on', String(on(op | rs1 | rs2 | rd)));
  document.getElementById('pinOp')?.setAttribute('data-on', String(on(op)));
  document.getElementById('pinRaddrA')?.setAttribute('data-on', String(on(rs1)));
  document.getElementById('pinRaddrB')?.setAttribute('data-on', String(on(rs2)));
  document.getElementById('pinWaddr')?.setAttribute('data-on', String(on(rd)));

  // per-field decoded meaning, shown in the diagram beside each field
  T('fldOp').textContent = `= ${OP_NAMES[op]}`;
  T('fldA').textContent = `= r${rs1}`;
  T('fldB').textContent = `= r${rs2}`;
  T('fldW').textContent = `= r${rd}`;

  T('instrBits').textContent = `${v[0]}${v[1]}·${v[2]}${v[3]}·${v[4]}${v[5]}·${v[6]}${v[7]}`;
  T('opName').textContent = `${v[0]}${v[1]} (${OP_NAMES[op]})`;
  T('readBits').textContent = `A=${v[2]}${v[3]} B=${v[4]}${v[5]}`;
  T('writeBits').textContent = `${v[6]}${v[7]}`;
}

function persist() { saveSnapshot<Snap>(SNAP_KEY, { v: [...v] as Bit[] }); }

BITS.forEach((b, i) => {
  document.getElementById(b.btn)?.addEventListener('click', () => {
    v[i] = (v[i] ? 0 : 1) as Bit; render(); persist();
  });
});
document.getElementById('btnReset')?.addEventListener('click', () => {
  for (let i = 0; i < v.length; i++) v[i] = 0;
  clearSnapshot(SNAP_KEY); render();
});

initDrillBreadcrumb();
render();

initCanvasZoom();
initSteps();
initPanel();
initToc();
