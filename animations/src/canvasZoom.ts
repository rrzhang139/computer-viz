// Figma-style pan/zoom for a diagram <svg>, plus the programmatic focus the
// step walkthrough uses to zoom into one stage at a time.
//
// Why viewBox (not a CSS transform): panning/zooming the viewBox keeps stroke
// widths and world coordinates intact, so the hover-preview / wire-alignment
// math (which reads getScreenCTM at the DEFAULT fit) is unaffected — at rest
// the viewBox equals the one authored in HTML.
//
//  • wheel        → zoom toward the cursor
//  • drag         → pan (a drag is suppressed from becoming a drill-click)
//  • + / − / ⤢    → zoom in / out / fit, floating top-right over the canvas
//  • focus(...)   → smooth-animate to a region (used per narrative step)
//
// The module finds the page's main diagram as `.canvas-col svg` and exposes a
// singleton controller via getZoomController(), so initSteps() can drive it
// without the page wiring them together. Call initCanvasZoom() before
// initSteps().

type Box = { x: number; y: number; w: number; h: number };

export type ZoomController = {
  svg: SVGSVGElement;
  focus(box: Box, opts?: { pad?: number; animate?: boolean }): void;
  focusSelectors(selectors: string[], opts?: { pad?: number; animate?: boolean }): void;
  reset(opts?: { animate?: boolean }): void;
};

let current: ZoomController | null = null;
export function getZoomController(): ZoomController | null {
  return current;
}

const CSS = `
.cv-canvas-wrap { position: relative; width: 100%; display: flex; justify-content: center; }
.cv-canvas-wrap > svg { cursor: grab; touch-action: none; }
.cv-canvas-wrap > svg:active { cursor: grabbing; }
.cv-zoom-controls { position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; z-index: 6; }
.cv-zoom-btn { pointer-events: auto; width: 34px; height: 34px; border-radius: 9px; background: rgba(18,18,18,0.92); border: 1px solid #2a2a2a; color: #bbb; font: inherit; font-size: 18px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 120ms, border-color 120ms; }
.cv-zoom-btn:hover { color: var(--on, #EF9F27); border-color: var(--on, #EF9F27); }
.cv-zoom-btn:active { background: rgba(239,159,39,0.16); }
`;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function initCanvasZoom(): ZoomController | null {
  const found = document.querySelector<SVGSVGElement>('.canvas-col svg');
  if (!found) return null;
  const svg: SVGSVGElement = found;   // declared non-null so closures keep it

  const vb = svg.viewBox.baseVal;
  const base: Box = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  if (!base.w || !base.h) return null;
  const aspect = base.w / base.h;
  let view: Box = { ...base };
  let displayed: Box = { ...base };

  if (!document.getElementById('cv-zoom-css')) {
    const s = document.createElement('style');
    s.id = 'cv-zoom-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Wrap the svg so the controls can overlay it without disturbing layout.
  const wrap = document.createElement('div');
  wrap.className = 'cv-canvas-wrap';
  svg.parentNode!.insertBefore(wrap, svg);
  wrap.appendChild(svg);
  const controls = document.createElement('div');
  controls.className = 'cv-zoom-controls';
  controls.innerHTML =
    '<button class="cv-zoom-btn" data-z="in" aria-label="zoom in" title="zoom in">+</button>' +
    '<button class="cv-zoom-btn" data-z="out" aria-label="zoom out" title="zoom out">−</button>' +
    '<button class="cv-zoom-btn" data-z="fit" aria-label="fit to view" title="fit to view">⤢</button>';
  wrap.appendChild(controls);

  const MIN_W = base.w / 12;   // deepest zoom-in
  const MAX_W = base.w * 1.8;  // farthest zoom-out

  function clampSize(w: number): number {
    return clamp(w, MIN_W, MAX_W);
  }
  // Keep the view centre roughly over the diagram so it can't be lost.
  function clampPos(b: Box): Box {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const ccx = clamp(cx, base.x - base.w * 0.4, base.x + base.w * 1.4);
    const ccy = clamp(cy, base.y - base.h * 0.4, base.y + base.h * 1.4);
    return { x: b.x + (ccx - cx), y: b.y + (ccy - cy), w: b.w, h: b.h };
  }

  function writeVB(b: Box) {
    svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.w} ${b.h}`);
    displayed = { ...b };
  }

  let raf = 0;
  function setView(target: Box, animate: boolean) {
    const t = clampPos(target);
    view = t;
    cancelAnimationFrame(raf);
    if (!animate) { writeVB(t); return; }
    const from = { ...displayed };
    const start = performance.now();
    const dur = 420;
    const tick = (now: number) => {
      const k = clamp((now - start) / dur, 0, 1);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      writeVB({
        x: from.x + (t.x - from.x) * e, y: from.y + (t.y - from.y) * e,
        w: from.w + (t.w - from.w) * e, h: from.h + (t.h - from.h) * e,
      });
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // Expand a region to the base aspect ratio (so the svg element's height never
  // changes), centred, with a little breathing room.
  function toView(box: Box, pad = 0.14): Box {
    let w = box.w * (1 + pad * 2), h = box.h * (1 + pad * 2);
    if (w / h > aspect) h = w / aspect; else w = h * aspect;
    w = clampSize(w); h = w / aspect;
    return { x: box.x + box.w / 2 - w / 2, y: box.y + box.h / 2 - h / 2, w, h };
  }

  // ── wheel: zoom toward the cursor ─────────────────────────────────────────
  function clientToUser(cx: number, cy: number) {
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    const u = pt.matrixTransform(ctm.inverse());
    return { x: u.x, y: u.y };
  }
  svg.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const u = clientToUser(e.clientX, e.clientY);
    const factor = Math.exp(-e.deltaY * 0.0016);   // wheel up → zoom in
    const nw = clampSize(view.w / factor);
    const s = nw / view.w;
    setView({ x: u.x - (u.x - view.x) * s, y: u.y - (u.y - view.y) * s, w: nw, h: view.h * s }, false);
  }, { passive: false });

  // ── drag: pan; a real drag is suppressed from triggering a drill-click ────
  let down: { x: number; y: number } | null = null;
  let lastPan = { x: 0, y: 0 };
  let dragging = false, moved = 0, pid = 0;
  svg.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY }; moved = 0; dragging = false; pid = e.pointerId;
  });
  svg.addEventListener('pointermove', (e: PointerEvent) => {
    if (!down) return;
    if (!dragging) {
      if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 5) return;
      dragging = true; lastPan = { x: e.clientX, y: e.clientY };
      try { svg.setPointerCapture(pid); } catch { /* noop */ }
    }
    const ctm = svg.getScreenCTM(); if (!ctm) return;
    const dx = e.clientX - lastPan.x, dy = e.clientY - lastPan.y;
    lastPan = { x: e.clientX, y: e.clientY };
    moved += Math.abs(dx) + Math.abs(dy);
    setView({ x: view.x - dx / ctm.a, y: view.y - dy / ctm.d, w: view.w, h: view.h }, false);
  });
  window.addEventListener('pointerup', () => {
    if (dragging) { try { svg.releasePointerCapture(pid); } catch { /* noop */ } }
    down = null; dragging = false;
  });
  // Capture phase: a click that ended a pan must not reach the drill handlers.
  svg.addEventListener('click', (e: MouseEvent) => {
    if (moved > 5) { e.stopPropagation(); e.preventDefault(); moved = 0; }
  }, true);

  // ── buttons ───────────────────────────────────────────────────────────────
  function zoomCentre(factor: number) {
    const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    const nw = clampSize(view.w / factor), nh = nw / aspect;
    setView({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh }, true);
  }
  controls.addEventListener('click', (e) => {
    const z = (e.target as HTMLElement).dataset.z;
    if (z === 'in') zoomCentre(1.4);
    else if (z === 'out') zoomCentre(1 / 1.4);
    else if (z === 'fit') setView(base, true);
  });

  function bboxOf(selectors: string[]): Box | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const sel of selectors) {
      svg.querySelectorAll<SVGGraphicsElement>(sel).forEach((el) => {
        if (typeof el.getBBox !== 'function') return;
        const b = el.getBBox();
        if (!b.width && !b.height) return;
        x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
      });
    }
    if (!isFinite(x0)) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  const controller: ZoomController = {
    svg,
    focus(box, opts) { setView(toView(box, opts?.pad), opts?.animate ?? true); },
    focusSelectors(selectors, opts) {
      const b = bboxOf(selectors);
      if (b) setView(toView(b, opts?.pad), opts?.animate ?? true);
      else setView(base, opts?.animate ?? true);
    },
    reset(opts) { setView(base, opts?.animate ?? true); },
  };
  current = controller;
  return controller;
}
