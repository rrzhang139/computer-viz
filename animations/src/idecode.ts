import { initPanel } from "./panel";
import { initToc } from "./toc";
import { buildDrillUrl, readBitParam, initDrillBreadcrumb, loadSnapshot, saveSnapshot, clearSnapshot } from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// Instruction decoder — field extraction + the control unit. The 10-bit word
// (opcode | func | rs1 | rs2 | rd) slices into fields wired STRAIGHT to their
// datapath outputs; the opcode bundle feeds the CONTROL UNIT, whose rows are
// truth-table lines (textbook: opcode → Control → named signal lines):
//   opcode 01 (BEQ) → Branch   10 (LW) → memToReg   11 (SW) → memWrite   00 → none

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('idecode') as unknown as SVGSVGElement;

// Each bit: button id, svg cell id, output pin id, wire net, state key.
type BitDef = { btn: string; cell: string; pin: string; net: string; label: string };
const BITS: BitDef[] = [
  { btn: 'btnOc1', cell: 'gBitOc1', pin: 'pinOc1',     net: 'oc1',     label: 'oc₁' },
  { btn: 'btnOc0', cell: 'gBitOc0', pin: 'pinOc0',     net: 'oc0',     label: 'oc₀' },
  { btn: 'btnOp1', cell: 'gBitOp1', pin: 'pinOp1',     net: 'op1',     label: 'f₁' },
  { btn: 'btnOp0', cell: 'gBitOp0', pin: 'pinOp0',     net: 'op0',     label: 'f₀' },
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

// Embed the real control unit into the CONTROL slot, then re-land the
// opcode/funct taps and the four control outputs on its projected pins.
const embeds = autoFillEmbeds(svg);
const CT = embeds.get('slot-ctrl') || {};
const setW = (id: string, points: string) => {
  const w = document.getElementById(id);
  if (w) w.setAttribute('points', points);
};
if (CT.pinOc1 && CT.pinBranch) {
  setW('wCtlOc1', `640,126 640,${CT.pinOc1.y} ${CT.pinOc1.x},${CT.pinOc1.y}`);
  setW('wCtlOc0', `640,126 640,${CT.pinOc0.y} ${CT.pinOc0.x},${CT.pinOc0.y}`);
  setW('wCtlF1', `620,238 620,${CT.pinF1.y} ${CT.pinF1.x},${CT.pinF1.y}`);
  setW('wCtlF0', `620,238 620,${CT.pinF0.y} ${CT.pinF0.x},${CT.pinF0.y}`);
  setW('wCtlBr', `${CT.pinBranch.x},${CT.pinBranch.y} 1060,${CT.pinBranch.y} 1060,75 1280,75`);
  setW('wCtlJp', `${CT.pinJump.x},${CT.pinJump.y} 1004,${CT.pinJump.y} 1004,190 1140,190 1140,118 1280,118`);
  setW('wCtlMr', `${CT.pinMemToReg.x},${CT.pinMemToReg.y} 1100,${CT.pinMemToReg.y} 1100,161 1280,161`);
  setW('wCtlMw', `${CT.pinMemWrite.x},${CT.pinMemWrite.y} 1020,${CT.pinMemWrite.y} 1020,204 1280,204`);
}
const ctrlDetail = document.getElementById('ctrlDetail');

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

  const oc = v[0] * 2 + v[1], op = v[2] * 2 + v[3];
  const rs1 = v[4] * 2 + v[5], rs2 = v[6] * 2 + v[7], rd = v[8] * 2 + v[9];
  // the control unit: truth-table rows keyed on the opcode pattern
  const branch   = (oc === 1 && op <= 1 ? 1 : 0) as Bit;   // 01,f0x = BEQ/BNE
  const jump     = (oc === 1 && op === 2 ? 1 : 0) as Bit;  // 01,f10 = JAL
  const memToReg = (oc === 2 ? 1 : 0) as Bit;   // 10 = LW
  const memWrite = (oc === 3 ? 1 : 0) as Bit;   // 11 = SW

  // Field output buses (/2) + the incoming instruction bus (/10). A bus lights
  // when its field carries a non-zero value (0 = dim, as everywhere else).
  const on = (n: number): Bit => (n ? 1 : 0);
  // P&H ALUOp: a branch FORCES the ALU operation to the compare (XOR = 1-bit
  // subtract) no matter what the func field says; otherwise func passes through.
  const aluOp = branch ? 3 : op;
  setNet('instr', on(oc | op | rs1 | rs2 | rd));
  setNet('opcode', on(oc));
  setNet('op', on(aluOp)); setNet('raddrA', on(rs1)); setNet('raddrB', on(rs2)); setNet('waddr', on(rd));
  setNet('branch', branch); setNet('jump', jump); setNet('memtoreg', memToReg); setNet('memwrite', memWrite);
  // The embedded control-unit preview mirrors /ctrlunit.html's own lighting.
  if (ctrlDetail) {
    const fam = (oc === 1 ? 1 : 0) as Bit;
    const cf1 = v[2], cf0 = v[3];
    const f1bar = (cf1 ? 0 : 1) as Bit, f0bar = (cf0 ? 0 : 1) as Bit;
    const jmp1 = (fam && cf1 ? 1 : 0) as Bit;
    const cbody = (id: string, on2: Bit) =>
      ctrlDetail.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on2));
    cbody('gOpdec', 1);
    cbody('gNot1', f1bar); cbody('gNot0', f0bar);
    cbody('gAnd1', branch); cbody('gAnd2', jmp1); cbody('gAnd3', jump);
    const cnet = (net: string, on2: Bit) =>
      ctrlDetail.querySelectorAll<SVGElement>(`.wire[data-net="${net}"]`).forEach((w) => w.setAttribute('data-on', String(on2)));
    cnet('oc1', v[0]); cnet('oc0', v[1]); cnet('one', 1);
    cnet('fam', fam); cnet('r00', (oc === 0 ? 1 : 0) as Bit);
    cnet('f1', cf1); cnet('f0', cf0);
    cnet('f1bar', f1bar); cnet('f0bar', f0bar); cnet('jmp1', jmp1);
    cnet('branch', branch); cnet('jump', jump);
    cnet('memtoreg', memToReg); cnet('memwrite', memWrite);
  }
  document.getElementById('gCtlJump')?.setAttribute('data-on', String(jump));
  document.getElementById('gCtlBranch')?.setAttribute('data-on', String(branch));
  document.getElementById('gCtlMemToReg')?.setAttribute('data-on', String(memToReg));
  document.getElementById('gCtlMemWrite')?.setAttribute('data-on', String(memWrite));
  document.getElementById('pinInstr')?.setAttribute('data-on', String(on(oc | op | rs1 | rs2 | rd)));
  document.getElementById('pinOp')?.setAttribute('data-on', String(on(aluOp)));
  document.getElementById('pinRaddrA')?.setAttribute('data-on', String(on(rs1)));
  document.getElementById('pinRaddrB')?.setAttribute('data-on', String(on(rs2)));
  document.getElementById('pinWaddr')?.setAttribute('data-on', String(on(rd)));
  document.getElementById('pinBranch')?.setAttribute('data-on', String(branch));
  document.getElementById('pinJump')?.setAttribute('data-on', String(jump));
  document.getElementById('pinMemToReg')?.setAttribute('data-on', String(memToReg));
  document.getElementById('pinMemWrite')?.setAttribute('data-on', String(memWrite));

  // per-field decoded meaning, shown in the diagram beside each field
  const kindName = oc === 2 ? 'LW' : oc === 3 ? 'SW' : oc === 1 ? (op === 2 ? 'JAL' : op === 1 ? 'BNE' : 'BEQ') : 'R';
  T('fldOc').textContent = `= ${kindName}`;
  T('fldOp').textContent = branch ? '= XOR ←ctrl' : `= ${OP_NAMES[op]}`;
  T('fldA').textContent = `= r${rs1}`;
  T('fldB').textContent = `= r${rs2}`;
  T('fldW').textContent = (oc === 1 || oc === 3) ? `= imm ${rd >= 2 ? rd - 4 : (rd === 0 ? '+0' : '+1')}` : `= r${rd}`;

  T('instrBits').textContent = `${v[0]}${v[1]}·${v[2]}${v[3]}·${v[4]}${v[5]}·${v[6]}${v[7]}·${v[8]}${v[9]}`;
  T('opName').textContent = `${v[0]}${v[1]} (${kindName === 'R' ? OP_NAMES[op] : kindName})`;
  T('readBits').textContent = `A=${v[4]}${v[5]} B=${v[6]}${v[7]}`;
  T('writeBits').textContent = `${v[8]}${v[9]}`;
  T('ctlBits').textContent = `branch=${branch} jump=${jump} memToReg=${memToReg} memWrite=${memWrite}`;
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

// Drill: the control slot opens the real control-unit page with the live bits.
document.getElementById('slot-ctrl')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/ctrlunit.html', {
    from: 'idecode', which: 'ctrl', oc1: v[0], oc0: v[1], f1: v[2], f0: v[3],
  }));
});

initDrillBreadcrumb();
render();

initCanvasZoom();
initSteps();
initPanel();
initToc();
