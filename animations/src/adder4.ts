// 4-bit ripple-carry adder: four full adders chained.
//   FA_i: S_i = A_i XOR B_i XOR carry_in;  carry_out = majority(A_i, B_i, carry_in)
//   carry_in for FA_0 is the external Cin; each subsequent FA gets the prior FA's carry_out.
// Hovering an FA shows three sub-boxes (HA1, HA2, OR) lit according to that bit's state.

type Bit = 0 | 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

const svg = document.getElementById('adder4') as unknown as SVGSVGElement;
const aBitsEl   = document.getElementById('aBits')!;
const bBitsEl   = document.getElementById('bBits')!;
const sumBitsEl = document.getElementById('sumBits')!;
const aDecEl    = document.getElementById('aDec')!;
const bDecEl    = document.getElementById('bDec')!;
const sumDecEl  = document.getElementById('sumDec')!;

// State: A[i] and B[i] are bit i (i=0 is LSB). Cin is external carry-in.
const A: Bit[] = [0, 0, 0, 0];
const B: Bit[] = [0, 0, 0, 0];
let Cin: Bit = 0;

// ── FA hover mini ─────────────────────────────────────────────────────
// For each FA, the mini shows three small sub-boxes labeled HA1/HA2/OR.
// They light up based on whether that FA's internal computation activates
// each component for this bit's input combination.
interface SlotBox { x: number; y: number; w: number; h: number; }
const FA_BOXES: Record<string, SlotBox> = {
  fa3: { x: 80,  y: 200, w: 220, h: 200 },
  fa2: { x: 330, y: 200, w: 220, h: 200 },
  fa1: { x: 580, y: 200, w: 220, h: 200 },
  fa0: { x: 830, y: 200, w: 220, h: 200 },
};

function buildFaMini(slot: string, box: SlotBox): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'detailed');
  g.setAttribute('data-slot', slot);
  // Mini uses parent SVG coords directly (no scaling). Anchored to the box.
  const x = box.x, y = box.y, w = box.w, h = box.h;

  // Background pane behind the mini sub-boxes
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('class', 'mini-bg');
  bg.setAttribute('x', String(x + 6)); bg.setAttribute('y', String(y + 6));
  bg.setAttribute('width', String(w - 12)); bg.setAttribute('height', String(h - 12));
  bg.setAttribute('rx', '10');
  g.appendChild(bg);

  // HA1 top-left, HA2 top-right, OR bottom-center
  const subBoxes = [
    { tid: 'HA1', x: x + 20,  y: y + 25,  w: 80, h: 55, lx: x + 60,  ly: y + 52 },
    { tid: 'HA2', x: x + 120, y: y + 25,  w: 80, h: 55, lx: x + 160, ly: y + 52 },
    { tid: 'OR',  x: x + 70,  y: y + 110, w: 80, h: 55, lx: x + 110, ly: y + 137 },
  ];
  for (const b of subBoxes) {
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

for (const slot of Object.keys(FA_BOXES)) {
  document.getElementById(`slot-${slot}`)
    ?.appendChild(buildFaMini(slot, FA_BOXES[slot]));
}

function setFaMiniState(slot: string, a: Bit, b: Bit, cin: Bit) {
  const root = svg.querySelector(`g.detailed[data-slot="${slot}"]`);
  if (!root) return;
  const sum1: Bit = (a ^ b) as Bit;
  const c1: Bit = (a & b) as Bit;
  const S: Bit = (sum1 ^ cin) as Bit;
  const c2: Bit = (sum1 & cin) as Bit;
  const Cout: Bit = (c1 | c2) as Bit;
  root.querySelector(`.tbody-mini[data-tid="HA1"]`)
    ?.setAttribute('data-on', String(sum1 || c1));
  root.querySelector(`.tbody-mini[data-tid="HA2"]`)
    ?.setAttribute('data-on', String(S || c2));
  root.querySelector(`.tbody-mini[data-tid="OR"]`)
    ?.setAttribute('data-on', String(Cout));
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
  // Walk the ripple. carryIn[i] is the carry into FA_i.
  // (carryIn[0] = Cin, carryIn[i+1] = FA_i.Cout)
  const carryIn: Bit[] = [0, 0, 0, 0];
  const S: Bit[] = [0, 0, 0, 0];
  let carry: Bit = Cin;
  for (let i = 0; i < 4; i++) {
    carryIn[i] = carry;
    const a = A[i], b = B[i];
    S[i] = (a ^ b ^ carry) as Bit;
    carry = ((a & b) | (a & carry) | (b & carry)) as Bit;
  }
  const Cout: Bit = carry;

  // Wires
  for (let i = 0; i < 4; i++) {
    setAttr(`.wire[data-net="A${i}"]`, A[i]);
    setAttr(`.wire[data-net="B${i}"]`, B[i]);
    setAttr(`.wire[data-net="S${i}"]`, S[i]);
  }
  setAttr('.wire[data-net="Cin"]',  Cin);
  setAttr('.wire[data-net="C01"]',  carryIn[1]);
  setAttr('.wire[data-net="C12"]',  carryIn[2]);
  setAttr('.wire[data-net="C23"]',  carryIn[3]);
  setAttr('.wire[data-net="Cout"]', Cout);

  // FA bodies glow if any output (S or its outgoing carry) is high
  for (let i = 0; i < 4; i++) {
    const outCarry: Bit = i === 3 ? Cout : (carryIn[i + 1] as Bit);
    const on: Bit = (S[i] || outCarry) ? 1 : 0;
    document.getElementById(`gFa${i}`)!.setAttribute('data-on', String(on));
    setFaMiniState(`fa${i}`, A[i], B[i], carryIn[i]);
  }

  // Pins
  for (let i = 0; i < 4; i++) {
    document.getElementById(`pinA${i}`)!.setAttribute('data-on', String(A[i]));
    document.getElementById(`pinB${i}`)!.setAttribute('data-on', String(B[i]));
    document.getElementById(`pinS${i}`)!.setAttribute('data-on', String(S[i]));
  }
  document.getElementById('pinCin')!.setAttribute('data-on',  String(Cin));
  document.getElementById('pinCout')!.setAttribute('data-on', String(Cout));

  // Word display (MSB-first: index 3, 2, 1, 0)
  const aStr = `${A[3]}${A[2]}${A[1]}${A[0]}`;
  const bStr = `${B[3]}${B[2]}${B[1]}${B[0]}`;
  const sumStr = `${Cout}${S[3]}${S[2]}${S[1]}${S[0]}`;
  const aDec = A[3] * 8 + A[2] * 4 + A[1] * 2 + A[0];
  const bDec = B[3] * 8 + B[2] * 4 + B[1] * 2 + B[0];
  const sumDec = aDec + bDec + Cin;
  aBitsEl.textContent = aStr;
  bBitsEl.textContent = bStr;
  sumBitsEl.textContent = sumStr;
  aDecEl.textContent = String(aDec);
  bDecEl.textContent = String(bDec);
  sumDecEl.textContent = String(sumDec);

  // Buttons
  for (let i = 0; i < 4; i++) {
    setBtn(document.getElementById(`btnA${i}`) as HTMLButtonElement, `A${i}`, A[i]);
    setBtn(document.getElementById(`btnB${i}`) as HTMLButtonElement, `B${i}`, B[i]);
  }
  setBtn(document.getElementById('btnCin') as HTMLButtonElement, 'Cin', Cin);
}

for (let i = 0; i < 4; i++) {
  const ba = document.getElementById(`btnA${i}`) as HTMLButtonElement;
  ba.addEventListener('click', () => { A[i] = A[i] === 0 ? 1 : 0; render(); });
  const bb = document.getElementById(`btnB${i}`) as HTMLButtonElement;
  bb.addEventListener('click', () => { B[i] = B[i] === 0 ? 1 : 0; render(); });
}
const btnCin = document.getElementById('btnCin') as HTMLButtonElement;
btnCin.addEventListener('click', () => { Cin = Cin === 0 ? 1 : 0; render(); });
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
btnReset.addEventListener('click', () => {
  for (let i = 0; i < 4; i++) { A[i] = 0; B[i] = 0; }
  Cin = 0; render();
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
