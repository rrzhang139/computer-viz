import { initPanel } from "./panel";
import { initToc } from "./toc";
import {
  readBitParam, initDrillBreadcrumb,
  loadSnapshot, saveSnapshot, clearSnapshot,
} from "./drillContext";
import { renderDecoderScene } from "./scenes/decoderScene";
import { initSteps } from "./steps";
import { initCanvasZoom } from "./canvasZoom";

// 2-to-4 decoder: 2 address bits + 1 enable → 4 one-hot outputs.
//   sel0 = ~a1 · ~a0 · EN
//   sel1 = ~a1 ·  a0 · EN
//   sel2 =  a1 · ~a0 · EN
//   sel3 =  a1 ·  a0 · EN
//
// State persists across drill-down round-trips via sessionStorage.
// URL params (?a1=…&a0=…&EN=…) override the snapshot — used when a
// future parent (e.g. a register file) drills into this page.

type Bit = 0 | 1;

const btnA1    = document.getElementById('btnA1')    as HTMLButtonElement;
const btnA0    = document.getElementById('btnA0')    as HTMLButtonElement;
const btnEN    = document.getElementById('btnEN')    as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const svg      = document.getElementById('decoder')  as unknown as SVGSVGElement;
const addrBits = document.getElementById('addrBits') as HTMLElement;
const addrDec  = document.getElementById('addrDec')  as HTMLElement;
const oneHotBits = document.getElementById('oneHotBits') as HTMLElement;

type DecoderSnap = { a1: Bit; a0: Bit; EN: Bit };
const SNAP_KEY = 'decoder';
const _snap = loadSnapshot<DecoderSnap>(SNAP_KEY);
let a1: Bit = readBitParam('a1', _snap?.a1 ?? 0);
let a0: Bit = readBitParam('a0', _snap?.a0 ?? 0);
let EN: Bit = readBitParam('EN', _snap?.EN ?? 1);

const SVG_NS = 'http://www.w3.org/2000/svg';

// Populate the SVG from the shared wireframe-derived renderer. Scene
// is 1200×800 (= 100 px per world unit). The same renderer is used in
// /mux.html for the decoder hover-preview — guarantees the two views
// stay 1:1 with wire_sketches/layer10_decoder.md.
svg.appendChild(renderDecoderScene(
  { x: 0, y: 0, w: 1200, h: 800 },
  { idPrefix: 'g', showPins: true },
));

// Add pulse overlays for each wire so lit lines visibly flow.
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
  const a1bar: Bit = (a1 === 0 ? 1 : 0) as Bit;
  const a0bar: Bit = (a0 === 0 ? 1 : 0) as Bit;
  const sel: Bit[] = [
    ((a1bar & a0bar & EN) & 1) as Bit,  // sel0
    ((a1bar & a0    & EN) & 1) as Bit,  // sel1
    ((a1    & a0bar & EN) & 1) as Bit,  // sel2
    ((a1    & a0    & EN) & 1) as Bit,  // sel3
  ];

  // Light the buses
  setNet('a1', a1);
  setNet('a1bar', a1bar);
  setNet('a0', a0);
  setNet('a0bar', a0bar);
  setNet('EN', EN);

  // Light outputs
  setNet('sel0', sel[0]);
  setNet('sel1', sel[1]);
  setNet('sel2', sel[2]);
  setNet('sel3', sel[3]);

  // Pins
  setPin('pinA1', a1);
  setPin('pinA0', a0);
  setPin('pinEN', EN);
  setPin('pinSel0', sel[0]);
  setPin('pinSel1', sel[1]);
  setPin('pinSel2', sel[2]);
  setPin('pinSel3', sel[3]);

  // Gate bodies glow per state
  document.getElementById('gInvA1')!.setAttribute('data-on', String(a1bar));
  document.getElementById('gInvA0')!.setAttribute('data-on', String(a0bar));
  document.getElementById('gAnd0')!.setAttribute('data-on', String(sel[0]));
  document.getElementById('gAnd1')!.setAttribute('data-on', String(sel[1]));
  document.getElementById('gAnd2')!.setAttribute('data-on', String(sel[2]));
  document.getElementById('gAnd3')!.setAttribute('data-on', String(sel[3]));

  // Buttons
  setBtn(btnA1, 'a1', a1);
  setBtn(btnA0, 'a0', a0);
  setBtn(btnEN, 'EN', EN);

  // Readouts
  addrBits.textContent = `${a1}${a0}`;
  addrDec.textContent  = String(a1 * 2 + a0);
  oneHotBits.textContent = `${sel[3]}${sel[2]}${sel[1]}${sel[0]}`;
}

function persist() {
  saveSnapshot<DecoderSnap>(SNAP_KEY, { a1, a0, EN });
}

btnA1.addEventListener('click', () => { a1 = a1 === 0 ? 1 : 0; render(); persist(); });
btnA0.addEventListener('click', () => { a0 = a0 === 0 ? 1 : 0; render(); persist(); });
btnEN.addEventListener('click', () => { EN = EN === 0 ? 1 : 0; render(); persist(); });
btnReset.addEventListener('click', () => {
  a1 = 0; a0 = 0; EN = 1;
  clearSnapshot(SNAP_KEY);
  render();
});

render();

initCanvasZoom();
initSteps();

initPanel();
initToc();
initDrillBreadcrumb();
