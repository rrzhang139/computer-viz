import { initPanel } from "./panel";
import { initToc } from "./toc";
import { readBitParam, initDrillBreadcrumb } from "./drillContext";
// Same logic as src/main.ts (NAND truth table). Only the SVG topology changes.

type Bit = 0 | 1;

const btnA = document.getElementById('btnA') as HTMLButtonElement;
const btnB = document.getElementById('btnB') as HTMLButtonElement;
const svg = document.getElementById('gate') as unknown as SVGSVGElement;

// Drill-down support: when arrived from a parent layer (e.g. /latch.html
// clicked on slot-n1), initialize A and B from the URL ?A=… &B=…
let A: Bit = readBitParam('A', 0);
let B: Bit = readBitParam('B', 0);

const wires = Array.from(svg.querySelectorAll<SVGPolylineElement>('.wire'));
const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
for (const w of wires) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
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
    const pulse = pulseFor.get(el as SVGPolylineElement);
    if (pulse) pulse.setAttribute('data-on', String(on));
  });
}

function setBtn(btn: HTMLButtonElement, label: string, value: Bit) {
  btn.setAttribute('data-on', String(value));
  btn.textContent = `${label} ${value}`;
}

function render() {
  const Y: Bit = (A & B) === 1 ? 0 : 1;
  const pA_on: Bit = A === 0 ? 1 : 0;
  const pB_on: Bit = B === 0 ? 1 : 0;
  const nA_on: Bit = A;
  const nB_on: Bit = B;
  const midConducting: Bit = nA_on && nB_on ? 1 : 0;

  setAttr('.wire[data-net="A"]', A);
  setAttr('.wire[data-net="B"]', B);
  setAttr('.wire[data-net="Y"]', Y);
  setAttr('.wire[data-net="mid"]', midConducting);

  document.getElementById('tP_A')!.setAttribute('data-on', String(pA_on));
  document.getElementById('tP_B')!.setAttribute('data-on', String(pB_on));
  document.getElementById('tN_A')!.setAttribute('data-on', String(nA_on));
  document.getElementById('tN_B')!.setAttribute('data-on', String(nB_on));

  document.getElementById('pinA')!.setAttribute('data-on', String(A));
  document.getElementById('pinB')!.setAttribute('data-on', String(B));
  document.getElementById('pinY')!.setAttribute('data-on', String(Y));

  setBtn(btnA, 'A', A);
  setBtn(btnB, 'B', B);
}

btnA.addEventListener('click', () => {
  A = A === 0 ? 1 : 0;
  render();
});
btnB.addEventListener('click', () => {
  B = B === 0 ? 1 : 0;
  render();
});

const btnReset = document.getElementById('btnReset') as HTMLButtonElement | null;
btnReset?.addEventListener('click', () => {
  A = 0;
  B = 0;
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

initPanel();
initToc();
initDrillBreadcrumb();
