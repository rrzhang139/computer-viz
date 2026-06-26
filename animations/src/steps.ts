import { loadSnapshot, saveSnapshot } from './drillContext';
import { getZoomController } from './canvasZoom';

// Step walkthrough nav — the ONE shared implementation for every page.
//
//  • prev/next flip through the `.step` articles in the side panel.
//  • The current step persists in sessionStorage per page, so drilling into a
//    child page and coming back lands on the same step of the prose.
//  • Overflowing prose scales down via the `--content-scale` CSS var.
//
// Narrative interaction (opt-in per step, via data-attributes on each `.step`):
//
//  • data-focus="#gPc,#gImem"  — when this step is shown, the canvas zooms to
//    the union of those elements (the stage being discussed). "all" / absent on
//    a focus-using page → zoom to fit. Needs the zoom controller (initCanvasZoom
//    must run first); a no-op otherwise. A page only opts in if ANY step carries
//    data-focus, so manual zoom is preserved on pages that don't.
//
//  • data-gate="#btnWe"  — the control the reader must act on before "next →"
//    unlocks. The control is highlighted and the arrow stays muted until the
//    gate event fires (data-gate-event, default "click"; use "pointerenter" for
//    hover steps). Satisfied gates persist per page, so going back doesn't
//    re-lock a step you already did.
//
//  • data-stage="fetch" + ?stage=fetch (or ?step=N) — deep-link straight to a
//    step. Powers /cpu/<stage> sub-views that reuse this same prose, focused.
export function initSteps() {
  const steps = Array.from(document.querySelectorAll<HTMLElement>('.step'));
  if (steps.length === 0) return;
  const stepPrev = document.getElementById('stepPrev') as HTMLButtonElement;
  const stepNext = document.getElementById('stepNext') as HTMLButtonElement;
  const stepNum = document.getElementById('stepNum')!;
  const stepCount = document.getElementById('stepCount')!;
  const stepPanel = document.querySelector<HTMLElement>('.step-panel')!;
  const stepBodies = document.querySelector<HTMLElement>('.step-bodies')!;
  const page = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';
  const STEP_KEY = `${page}:step`;
  stepCount.textContent = ` / ${steps.length}`;

  ensureCss();
  const hint = document.createElement('span');
  hint.className = 'cv-step-hint';
  hint.hidden = true;
  hint.textContent = '▸ do the highlighted step to continue';
  document.querySelector('.step-meta')?.appendChild(hint);

  const usesFocus = steps.some((s) => s.dataset.focus);
  // Gate satisfaction is in-memory only (NOT persisted): every fresh load
  // re-engages the gates so a step is always gated until you do its action.
  // Within one page session a satisfied step stays unlocked as you navigate.
  const satisfied = new Set<number>();
  let clearGate: (() => void) | null = null;
  let currentStep = 0;
  let locked = false;

  function fitStep() {
    let scale = 1;
    stepPanel.style.setProperty('--content-scale', '1');
    const active = steps[currentStep];
    for (let n = 0; n < 8 && active && active.scrollHeight > stepBodies.clientHeight && scale > 0.72; n++) {
      scale -= 0.05;
      stepPanel.style.setProperty('--content-scale', scale.toFixed(2));
    }
  }

  function applyFocus(step: HTMLElement) {
    if (!usesFocus) return;
    const ctrl = getZoomController();
    if (!ctrl) return;
    const sel = step.dataset.focus;
    if (!sel || sel === 'all' || sel === 'reset') { ctrl.reset({ animate: true }); return; }
    ctrl.focusSelectors(sel.split(',').map((s) => s.trim()).filter(Boolean), { animate: true });
  }

  // A gate "soft-locks" next: the button stays ENABLED (so a programmatic
  // click resolves instantly instead of hanging on a disabled element — the
  // responsive suite clicks next blindly), but is visually muted and the click
  // handler refuses to advance until the gate fires. Only the genuine last
  // step uses the real `disabled` attribute.
  function unlockNext(isLast: boolean) {
    locked = false;
    stepNext.classList.remove('cv-locked');
    stepNext.disabled = isLast;
    hint.hidden = true;
  }
  function applyGate(step: HTMLElement, idx: number) {
    if (clearGate) { clearGate(); clearGate = null; }
    const isLast = idx === steps.length - 1;
    const gsel = step.dataset.gate;
    if (!gsel || satisfied.has(idx)) { unlockNext(isLast); return; }
    const targets = Array.from(document.querySelectorAll<HTMLElement>(gsel));
    if (targets.length === 0) { unlockNext(isLast); return; }

    const ev = step.dataset.gateEvent || 'click';
    locked = true;
    stepNext.disabled = false;
    stepNext.classList.add('cv-locked');
    hint.hidden = false;
    targets.forEach((t) => t.classList.add('cv-gate-target'));
    const onFire = () => {
      if (idx !== currentStep) return;
      satisfied.add(idx);
      cleanup();
      unlockNext(isLast);
    };
    const cleanup = () => {
      targets.forEach((t) => { t.classList.remove('cv-gate-target'); t.removeEventListener(ev, onFire); });
    };
    targets.forEach((t) => t.addEventListener(ev, onFire));
    clearGate = cleanup;
  }

  function showStep(i: number) {
    currentStep = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, idx) => s.toggleAttribute('hidden', idx !== currentStep));
    stepNum.textContent = String(currentStep + 1);
    stepPrev.disabled = currentStep === 0;
    const active = steps[currentStep];
    applyGate(active, currentStep);   // owns stepNext.disabled (gate + last-step)
    applyFocus(active);
    fitStep();
    saveSnapshot<number>(STEP_KEY, currentStep);
  }

  window.addEventListener('resize', fitStep);
  stepPrev.addEventListener('click', () => showStep(currentStep - 1));
  stepNext.addEventListener('click', () => {
    if (locked) { hint.hidden = false; return; }   // gated: nudge, don't advance
    if (!stepNext.disabled) showStep(currentStep + 1);
  });

  showStep(startStep(steps, STEP_KEY));
}

// Resolve the initial step: ?stage=NAME (data-stage match) → ?step=N → saved → 0.
function startStep(steps: HTMLElement[], key: string): number {
  const params = new URLSearchParams(window.location.search);
  const stage = params.get('stage');
  if (stage) {
    const idx = steps.findIndex((s) => s.dataset.stage === stage);
    if (idx >= 0) return idx;
  }
  const n = params.get('step');
  if (n && /^\d+$/.test(n)) return Number(n) - 1;
  return loadSnapshot<number>(key) ?? 0;
}

function ensureCss() {
  if (document.getElementById('cv-steps-css')) return;
  const s = document.createElement('style');
  s.id = 'cv-steps-css';
  s.textContent = `
.cv-step-hint { color: var(--on, #EF9F27); font-size: 11px; letter-spacing: 0.04em; margin-left: 12px; text-transform: none; }
.btn.cv-locked { opacity: 0.4; cursor: not-allowed; }
@keyframes cvGatePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,159,39,0.55); } 70% { box-shadow: 0 0 0 8px rgba(239,159,39,0); } }
.btn.cv-gate-target, button.cv-gate-target { animation: cvGatePulse 1.3s ease-out infinite; border-color: var(--on, #EF9F27) !important; color: var(--on, #EF9F27) !important; }
@keyframes cvGateStroke { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.cv-gate-target .simple-body { stroke: var(--on, #EF9F27) !important; stroke-width: 3 !important; stroke-dasharray: none !important; filter: drop-shadow(0 0 9px rgba(239,159,39,0.75)); animation: cvGateStroke 1.3s ease-in-out infinite; }
`;
  document.head.appendChild(s);
}
