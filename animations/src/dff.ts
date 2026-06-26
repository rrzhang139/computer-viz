import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  buildDrillUrl, readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { autoFillEmbeds } from "./embedPreview";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";
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

type DffSnap = { D: Bit; CLK: Bit; Q: Bit };
const SNAP_KEY = 'dff';
const _snap = loadSnapshot<DffSnap>(SNAP_KEY);
let D: Bit = readBitParam('D', _snap?.D ?? 0);
let CLK: Bit = readBitParam('CLK', _snap?.CLK ?? 0);
// Initial Q state — set when drilled-in from register, so the DFF shows
// the bit's current stored value without needing a CLK pulse first.
const _initialQ: Bit = readBitParam('Q', _snap?.Q ?? 0);
// Master and slave latch internal states.
let Qm: Bit = _initialQ;  let QBm: Bit = (_initialQ === 0 ? 1 : 0) as Bit;
let Q:  Bit = _initialQ;  let QB:  Bit = QBm;

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

// ── Embed exact copies of /dlatch.html in the master/slave slots and route
// the DFF's wires onto the embedded D-latches' projected pins. ────────────
type Pt = { x: number; y: number };
const embeds = autoFillEmbeds(svg);
const M_: Record<string, Pt> = embeds.get('slot-master') || {};
const S_: Record<string, Pt> = embeds.get('slot-slave')  || {};
const setW = (id: string, pts: string) => document.getElementById(id)?.setAttribute('points', pts);
const placePin = (id: string, x: number, y: number) => {
  const c = document.getElementById(id);
  if (c) { c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); }
};
if (M_.pinD && M_.pinEN && M_.pinQ && M_.pinQB &&
    S_.pinD && S_.pinEN && S_.pinQ && S_.pinQB) {
  // D → master.D
  placePin('pinD', 0, M_.pinD.y); setW('wD', `0,${M_.pinD.y} ${M_.pinD.x},${M_.pinD.y}`);
  // CLK → inverter (kept short), and CLK → slave.EN (from the top)
  placePin('pinCLK', 315, 35);
  setW('wCLK_inv', `315,35 315,75`);
  setW('wCLK_slave', `315,35 ${S_.pinEN.x},35 ${S_.pinEN.x},${S_.pinEN.y}`);
  // notCLK (inverter out) → master.EN
  setW('wNotCLK', `315,105 ${M_.pinEN.x},105 ${M_.pinEN.x},${M_.pinEN.y}`);
  // M (master Q) → slave.D
  setW('wM', `${M_.pinQ.x},${M_.pinQ.y} 580,${M_.pinQ.y} 580,${S_.pinD.y} ${S_.pinD.x},${S_.pinD.y}`);
  // master Q̄ unused → short stub off the pin (far end outside the box)
  setW('wMasterQB', `${M_.pinQB.x},${M_.pinQB.y} 560,${M_.pinQB.y}`);
  // slave Q / Q̄ → output pins
  setW('wQ', `${S_.pinQ.x},${S_.pinQ.y} 1020,${S_.pinQ.y}`);   placePin('pinQ', 1020, S_.pinQ.y);
  setW('wQB', `${S_.pinQB.x},${S_.pinQB.y} 1020,${S_.pinQB.y}`); placePin('pinQB', 1020, S_.pinQB.y);
}

// Light an embedded D latch to its logical state.
function lightDlatch(hostId: string, d: Bit, en: Bit, q: Bit, qb: Bit) {
  const host = document.getElementById(hostId);
  if (!host) return;
  const dbar: Bit = (d === 0 ? 1 : 0) as Bit;
  const sbar: Bit = ((d & en) === 1 ? 0 : 1) as Bit;
  const rbar: Bit = ((dbar & en) === 1 ? 0 : 1) as Bit;
  const w = (net: string, on: Bit) => host.querySelectorAll(`.wire[data-net="${net}"]`).forEach((e) => e.setAttribute('data-on', String(on)));
  const body = (id: string, on: Bit) => host.querySelector(`[data-body="${id}"]`)?.setAttribute('data-on', String(on));
  w('D', d); w('Dbar', dbar); w('EN', en); w('Sbar', sbar); w('Rbar', rbar); w('Q', q); w('QB', qb);
  body('iInv', dbar); body('gGS', sbar); body('gGR', rbar); body('gLatch', q);
}

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
  // Propagate state into the embedded D-latch copies.
  lightDlatch('masterDetail', D,  notCLK, Qm, QBm);
  lightDlatch('slaveDetail',  Qm, CLK,    Q,  QB);

  document.getElementById('pinD')!.setAttribute('data-on',   String(D));
  document.getElementById('pinCLK')!.setAttribute('data-on', String(CLK));
  document.getElementById('pinQ')!.setAttribute('data-on',   String(Q));
  document.getElementById('pinQB')!.setAttribute('data-on',  String(QB));

  setBtn(btnD,   'D',   D);
  setBtn(btnCLK, 'CLK', CLK);
}

function persist() { saveSnapshot<DffSnap>(SNAP_KEY, { D, CLK, Q }); }

btnD.addEventListener('click', () => { D = D === 0 ? 1 : 0; render(); persist(); });
btnCLK.addEventListener('click', () => { CLK = CLK === 0 ? 1 : 0; render(); persist(); });
btnPulse.addEventListener('click', () => {
  CLK = 0; render();
  setTimeout(() => { CLK = 1; render(); persist(); }, 500);
  setTimeout(() => { CLK = 0; render(); persist(); }, 1100);
});
btnReset.addEventListener('click', () => {
  D = 0; CLK = 0;
  Qm = 0; QBm = 1; Q = 0; QB = 1;
  clearSnapshot(SNAP_KEY);
  render();
});

// ── Drill-down to children (master / slave D latches) ────────────────
// master D latch: D_in = D, EN = !CLK
// slave  D latch: D_in = Qm (master output), EN = CLK
document.getElementById('slot-master')?.addEventListener('click', () => {
  const notCLK: Bit = (CLK === 0 ? 1 : 0) as Bit;
  window.location.assign(buildDrillUrl('/dlatch.html', {
    from: 'dff', which: 'master', D, EN: notCLK,
  }));
});
document.getElementById('slot-slave')?.addEventListener('click', () => {
  window.location.assign(buildDrillUrl('/dlatch.html', {
    from: 'dff', which: 'slave', D: Qm, EN: CLK,
  }));
});

initDrillBreadcrumb();

render();

initCanvasZoom();
initSteps();

initPanel();
initToc();
