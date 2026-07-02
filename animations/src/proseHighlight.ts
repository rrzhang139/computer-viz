// Click-to-locate: tie each prose paragraph to the wires/blocks it describes.
//
// A step paragraph can declare `data-hl="net:addr0 net:addr1 open:gPc"`. The
// paragraph becomes clickable; clicking it SPOTLIGHTS those elements on the
// canvas — named page wires flash bright, named blocks OPEN their live preview
// (so you see the components inside), and everything else dims — so the reader
// sees exactly which part of the diagram the sentence is about. Click again /
// Esc / step-change clears it.
//
// Tokens:
//   net:NAME   → page wires (+ their flow pulses + dotted control lines) on
//                that data-net. A wire carrying 1 flashes hot; a wire at 0
//                shows muted in its hue (spotlit ≠ lit — "look here" must not
//                contradict prose that says the wire sits dark).
//   open:ID    → a component box: open its hover-preview and keep it bright
//   box:ID     → a component box: flash the box itself (no preview)
//   pin:ID     → a terminal dot
//
// Optional per-paragraph camera: `data-hl-focus` on the same <p> zooms the
// canvas to the spotlighted elements while the spotlight is active (or to an
// explicit "#a,#b" selector list); clearing restores the step's own focus.
// Use it when a paragraph reads a small preview's internals that are
// illegible at the step's zoom level.

import { getZoomController } from "./canvasZoom";

function ensureCss() {
  if (document.getElementById("cv-prose-hl-css")) return;
  const s = document.createElement("style");
  s.id = "cv-prose-hl-css";
  s.textContent = `
    .step p.ph-clickable {
      cursor: pointer; position: relative;
      border-left: 2px solid transparent; border-radius: 4px;
      padding-left: 12px; margin-left: -14px;
      transition: border-color 120ms, background 120ms;
    }
    .step p.ph-clickable:hover { border-left-color: #555; background: rgba(255,255,255,0.035); }
    .step p.ph-sel { border-left-color: var(--on, #EF9F27); background: rgba(239,159,39,0.09); }

    /* Spotlight: dim everything not flagged, on the active canvas. */
    svg.ph-active .wire:not(.ph-on), svg.ph-active .pulse:not(.ph-on),
    svg.ph-active .ctrl-wire:not(.ph-on),
    svg.ph-active .tbody:not(.ph-on), svg.ph-active .pin:not(.ph-on),
    svg.ph-active .rail, svg.ph-active .stage-head,
    svg.ph-active .tlabel:not(.ph-on), svg.ph-active .tlabel-small:not(.ph-on) {
      opacity: 0.1; transition: opacity 160ms;
    }
    /* Flagged wires/blocks: keep their colour, but go bright, bold + flashing. */
    svg.ph-active .wire.ph-on { stroke-width: 7 !important; stroke-opacity: 1; }
    svg.ph-active .ctrl-wire.ph-on { opacity: 1 !important; stroke-width: 4 !important; }
    svg.ph-active .wire.bus.ph-on { stroke-width: 11 !important; }
    svg.ph-active .pulse.ph-on[data-on="1"] { opacity: 0.95 !important; }
    svg.ph-active .tbody.ph-on { stroke-opacity: 1; }
    svg.ph-active .tlabel.ph-on, svg.ph-active .tlabel-small.ph-on { opacity: 1; fill: var(--on, #EF9F27); }
    svg.ph-active .wire.ph-on, svg.ph-active .ctrl-wire.ph-on, svg.ph-active .tbody.ph-on, svg.ph-active .pin.ph-on {
      animation: ph-flash 0.85s ease-in-out infinite;
    }
    @keyframes ph-flash {
      0%, 100% { filter: drop-shadow(0 0 3px #fff8e6) drop-shadow(0 0 6px var(--on, #EF9F27)); }
      50%      { filter: drop-shadow(0 0 11px #ffffff) drop-shadow(0 0 18px var(--on, #EF9F27)); }
    }
    /* A spotlit wire that carries 0 must still READ as idle: muted in its own
       hue, soft amber pulse — never the white-hot flash of a live wire. */
    svg.ph-active .wire.ph-on:not([data-on="1"]),
    svg.ph-active .ctrl-wire.ph-on:not([data-on="1"]) {
      stroke-opacity: 0.45; opacity: 0.45;
      animation: ph-flash-dim 0.85s ease-in-out infinite;
    }
    @keyframes ph-flash-dim {
      0%, 100% { filter: none; }
      50%      { filter: drop-shadow(0 0 7px var(--on, #EF9F27)); }
    }

    /* open:ID — force the block's preview open and keep it fully bright even
       while the rest of the canvas is dimmed (and likewise for anything hovered). */
    .child-slot.ph-open .simple-body, .child-slot.ph-open .simple-label { opacity: 0; }
    .child-slot.ph-open .detailed { opacity: 1; }
    svg.ph-active .child-slot.ph-open .detailed, svg.ph-active .child-slot.ph-open .detailed *,
    svg.ph-active .child-slot:hover .detailed, svg.ph-active .child-slot:hover .detailed * {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(s);
}

export function initProseHighlight(svg: SVGSVGElement) {
  ensureCss();
  const onEls: Element[] = [];
  const openSlots: Element[] = [];
  let activeP: HTMLElement | null = null;
  let focusApplied = false;

  // data-hl names are authored, but a typo must degrade to "token catches
  // nothing" (the test gate's job), never to a selector exception that kills
  // the whole click handler.
  const esc = (name: string) => CSS.escape(name);

  // Restore the step walkthrough's own camera after a paragraph focus.
  function restoreStepFocus() {
    const ctrl = getZoomController();
    if (!ctrl) return;
    const sel = document.querySelector<HTMLElement>(".step:not([hidden])")?.dataset.focus;
    if (!sel || sel === "all" || sel === "reset") { ctrl.reset({ animate: true }); return; }
    ctrl.focusSelectors(sel.split(",").map((s) => s.trim()).filter(Boolean), { animate: true });
  }

  function clear() {
    svg.classList.remove("ph-active");
    onEls.forEach((e) => e.classList.remove("ph-on"));
    openSlots.forEach((e) => e.classList.remove("ph-open"));
    onEls.length = 0; openSlots.length = 0;
    if (activeP) activeP.classList.remove("ph-sel");
    activeP = null;
    if (focusApplied) { focusApplied = false; restoreStepFocus(); }
  }
  const mark = (el: Element | null) => { if (el && !el.classList.contains("ph-on")) { el.classList.add("ph-on"); onEls.push(el); } };

  function applyFocus(p: HTMLElement) {
    const spec = p.getAttribute("data-hl-focus");
    if (spec == null) return;
    const ctrl = getZoomController();
    if (!ctrl) return;
    if (spec.trim().startsWith("#")) {
      ctrl.focusSelectors(spec.split(",").map((s) => s.trim()).filter(Boolean), { animate: true });
      focusApplied = true;
      return;
    }
    // Default: zoom to what the spotlight caught (flagged elements + opened slots).
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of [...onEls, ...openSlots]) {
      const g = el as SVGGraphicsElement;
      if (typeof g.getBBox !== "function") continue;
      const b = g.getBBox();
      if (!b.width && !b.height) continue;
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.width); y1 = Math.max(y1, b.y + b.height);
    }
    if (!isFinite(x0)) return;
    ctrl.focus({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, { animate: true });
    focusApplied = true;
  }

  function apply(p: HTMLElement) {
    clear();
    for (const tok of (p.getAttribute("data-hl") || "").split(/\s+/).filter(Boolean)) {
      const [kind, rawName] = tok.split(":");
      if (!rawName) continue;
      const name = esc(rawName);
      if (kind === "net") {
        svg.querySelectorAll(`.wire[data-net="${name}"], .pulse[data-net="${name}"], .ctrl-wire[data-net="${name}"]`)
          .forEach((e) => { if (!e.closest(".detailed")) mark(e); });
      } else if (kind === "open") {
        const slot = svg.querySelector(`#${name}`)?.closest(".child-slot");
        if (slot) { slot.classList.add("ph-open"); openSlots.push(slot); }
      } else if (kind === "box") {
        const rect = svg.querySelector(`#${name}`);
        mark(rect);
        const slot = rect?.closest(".child-slot") || svg;
        slot.querySelectorAll(":scope > .tlabel, :scope > .simple-label, :scope > .tlabel-small").forEach(mark);
      } else if (kind === "pin") {
        mark(svg.querySelector(`#${name}`));
      }
    }
    if (onEls.length || openSlots.length) {
      svg.classList.add("ph-active");
      p.classList.add("ph-sel");
      activeP = p;
      applyFocus(p);
    }
  }

  document.querySelectorAll<HTMLElement>(".step p[data-hl]").forEach((p) => {
    p.classList.add("ph-clickable");
    p.setAttribute("role", "button");
    p.addEventListener("click", () => { if (activeP === p) clear(); else apply(p); });
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") clear(); });
  document.getElementById("stepPrev")?.addEventListener("click", clear);
  document.getElementById("stepNext")?.addEventListener("click", clear);
}
