// Canonical terminal-label clearance + legibility — applied on EVERY page.
//
// THE RULE (enforced by tests/label-clearance.test.mjs): no wire/terminal
// label may overlap a `.pin` terminal node, on any page. A label printed on top
// of its own pin is unreadable and hides the connection point.
//
// Two things conspired to break this across the pages:
//   1. The CSS `text-anchor: middle` on `.tlabel-small` OVERRODE the inline
//      `text-anchor="end|start"` presentation attribute (in SVG, a CSS rule
//      beats a presentation attribute), so labels meant to sit beside their pin
//      were actually centred ON it.
//   2. A few pages place the label on the pin's own x with only a tiny offset.
//
// Rather than hand-fix 15 pages, this runs once per page (called from initToc,
// the universal page-chrome hook): for any label that still overlaps a pin it
// nudges the label to a guaranteed clearance on the side it already leans
// toward, and pins the anchor via INLINE STYLE (which beats the stylesheet).
// It never moves pins or wires — only labels — so wire alignment is untouched.
//
// It also paints a dark halo behind every terminal/component label so the text
// stays legible where it crosses a wire ("make the labels more visible").

const MIN_CLEAR = 4;      // nudge any label whose box is closer than this to a pin
const GAP = 10;           // ...out to this much clearance from the pin edge
const HALO_ID = 'pin-label-halo';

function ensureHalo() {
  if (document.getElementById(HALO_ID)) return;
  const s = document.createElement('style');
  s.id = HALO_ID;
  // paint-order:stroke draws the (background-coloured) outline first, so the
  // fill sits on top — a clean halo that masks wires directly behind the glyphs.
  s.textContent = `
    svg text.tlabel-small, svg text.tlabel, svg text.tlabel-sub {
      paint-order: stroke fill;
      stroke: var(--bg, #0a0a0a);
      stroke-width: 4px;
      stroke-linejoin: round;
    }
    /* Embedded-preview labels render tiny; no halo there. */
    .embed text, .detailed text { stroke: none; }
  `;
  document.head.appendChild(s);
}

const notInEmbed = (el: Element) => !el.closest('.embed, .detailed');

type PinBox = { cx: number; cy: number; r: number };

// Signed gap between a label box and a pin box: positive = clear on at least one
// axis, <= 0 = overlapping. (Same metric the test uses.)
function gapTo(bb: DOMRect, p: PinBox): number {
  const gx = Math.max(p.cx - p.r - (bb.x + bb.width), bb.x - (p.cx + p.r));
  const gy = Math.max(p.cy - p.r - (bb.y + bb.height), bb.y - (p.cy + p.r));
  return Math.max(gx, gy);
}

// The pin this label sits TOO CLOSE to (smallest gap < MIN_CLEAR), or null.
function worstTooClose(bb: DOMRect, pins: PinBox[]): PinBox | null {
  let worst: PinBox | null = null, minGap = MIN_CLEAR;
  for (const p of pins) {
    const g = gapTo(bb, p);
    if (g < minGap) { minGap = g; worst = p; }
  }
  return worst;
}

export function initPinLabels() {
  ensureHalo();
  // Defer one frame so any JS-driven scene layout (placePin, etc.) has settled.
  requestAnimationFrame(() => {
    for (const svg of Array.from(document.querySelectorAll('svg'))) {
      const pins: PinBox[] = Array.from(svg.querySelectorAll('circle.pin'))
        .filter(notInEmbed)
        .map((p) => ({
          cx: parseFloat(p.getAttribute('cx') || '0'),
          cy: parseFloat(p.getAttribute('cy') || '0'),
          r: parseFloat(p.getAttribute('r') || '7'),
        }));
      if (!pins.length) continue;
      const labels = Array.from(svg.querySelectorAll('text'))
        .filter((t) => notInEmbed(t) && (t.textContent || '').trim()) as SVGTextElement[];

      // Canvas bounds, so a sideways nudge never shoves a label off-screen.
      // A small overflow tolerance keeps labels that the page sized to sit right
      // at the reserved edge (e.g. left-edge inputs) on the horizontal path;
      // only a label that would genuinely run off-canvas flips to a vertical nudge.
      const [vx, , vw] = (svg.getAttribute('viewBox') || '0 0 0 0').split(/\s+/).map(Number);
      const M = 3, OVERFLOW_TOL = 5;
      const fitsX = (lo: number, hi: number) =>
        !vw || Math.max((vx + M) - lo, hi - (vx + vw - M), 0) <= OVERFLOW_TOL;

      const nudgeVert = (t: SVGTextElement, p: PinBox, bb: DOMRect, dy: number) => {
        const h = bb.height || 14;
        t.setAttribute('y', String(dy >= 0 ? p.cy + p.r + GAP + h * 0.5 : p.cy - p.r - GAP - h * 0.5));
      };

      for (const t of labels) {
        // A few iterations in case clearing one pin slides the label onto another.
        for (let pass = 0; pass < 3; pass++) {
          let bb: DOMRect;
          try { bb = t.getBBox() as unknown as DOMRect; } catch { break; }
          const hit = worstTooClose(bb, pins);
          if (!hit) break;
          const lcx = bb.x + bb.width / 2, lcy = bb.y + bb.height / 2;
          const dx = lcx - hit.cx, dy = lcy - hit.cy;
          if (Math.abs(dx) >= Math.abs(dy)) {
            // Prefer pushing off the side the label already leans toward — but
            // only if it stays on-canvas; otherwise drop to a vertical nudge.
            const right = dx >= 0;
            const x = right ? hit.cx + hit.r + GAP : hit.cx - hit.r - GAP;
            const lo = right ? x : x - bb.width, hi = right ? x + bb.width : x;
            if (fitsX(lo, hi)) {
              t.style.textAnchor = right ? 'start' : 'end';
              t.setAttribute('x', String(x));
            } else {
              nudgeVert(t, hit, bb, dy);
            }
          } else {
            nudgeVert(t, hit, bb, dy);
          }
        }
      }
    }
  });
}
