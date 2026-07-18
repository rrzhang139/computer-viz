// Automatic, exact-copy hover previews.
//
// A drillable slot can declare `data-embed-page="/foo.html"` (+ optional
// `data-embed-svg="<svgId>"`). `autoFillEmbeds` then fills that slot's
// `.detailed` group with an INERT, scaled copy of /foo.html's own <svg> — so
// the preview you see on hover is LITERALLY the page you land on when you
// click. Single source: the copy is taken from the page's raw HTML at build
// time, so it can never drift from the real layout.
//
// This is enforced by tests/preview-fidelity.test.mjs (strict, like
// wire-alignment): every [data-embed-page] preview must contain the target
// page's exact net set, and must render large enough that its wires stay
// distinguishable.

import { renderDecoderScene } from './scenes/decoderScene';
import indexRaw from '../index.html?raw';
import latchRaw from '../latch.html?raw';
import dlatchRaw from '../dlatch.html?raw';
import dffRaw from '../dff.html?raw';
import registerRaw from '../register.html?raw';
import halfadderRaw from '../halfadder.html?raw';
import fulladderRaw from '../fulladder.html?raw';
import adder4Raw from '../adder4.html?raw';
import decoderRaw from '../decoder.html?raw';
import muxRaw from '../mux.html?raw';
import regfileRaw from '../regfile.html?raw';
import alu1Raw from '../alu1.html?raw';
import memRaw from '../mem.html?raw';
import dmemRaw from '../dmem.html?raw';
import idecodeRaw from '../idecode.html?raw';
import pcsrcRaw from '../pcsrc.html?raw';
import branchpcRaw from '../branchpc.html?raw';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Registry: page path → its raw HTML. Add a child page here to make it
// embeddable (static imports keep the embed synchronous — ready before any
// test or first paint). Every drillable preview embeds its child's real page.
export const PAGE_RAW: Record<string, string> = {
  '/index.html': indexRaw,
  '/latch.html': latchRaw,
  '/dlatch.html': dlatchRaw,
  '/dff.html': dffRaw,
  '/register.html': registerRaw,
  '/halfadder.html': halfadderRaw,
  '/fulladder.html': fulladderRaw,
  '/adder4.html': adder4Raw,
  '/decoder.html': decoderRaw,
  '/mux.html': muxRaw,
  '/regfile.html': regfileRaw,
  '/alu1.html': alu1Raw,
  '/mem.html': memRaw,
  '/dmem.html': dmemRaw,
  '/idecode.html': idecodeRaw,
  '/pcsrc.html': pcsrcRaw,
  '/branchpc.html': branchpcRaw,
};

// Some pages build their diagram at runtime from a shared scene module rather
// than ship it as static HTML (e.g. /decoder.html is an empty <svg> that
// decoder.ts fills via renderDecoderScene). For those, reading raw HTML would
// embed a blank svg, so we register a RENDERER that produces the exact same
// scene the page itself draws — the embed and the page share one source of
// truth (stronger than an HTML-text match: they literally call one function).
// A renderer takes the slot box and returns the scene <g> already in box
// (world→box-projected) coordinates, with `.pin` / `.wire` / `.tbody` markup.
export const PAGE_RENDERERS: Record<string, (box: Box) => SVGGElement> = {
  '/decoder.html': (box) => renderDecoderScene(box, { showPins: true }),
};

type Box = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };
// Projected positions of the embedded child's external pins, keyed by the
// child's original pin id (e.g. "pinRaddr1", "pinA"), in the host svg's coords.
export type PinMap = Record<string, Pt>;

function embedSvg(host: Element, raw: string, svgId: string, box: Box): PinMap | null {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const src = svgId ? doc.getElementById(svgId) : doc.querySelector('svg');
  if (!src) return null;
  const [vx, vy, vw, vh] = (src.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
  const sc = Math.min(box.w / vw, box.h / vh);
  const tx = box.x + (box.w - vw * sc) / 2 - vx * sc;
  const ty = box.y + (box.h - vh * sc) / 2 - vy * sc;
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${tx}, ${ty}) scale(${sc})`);
  g.setAttribute('pointer-events', 'none');
  g.setAttribute('class', 'embed');
  g.setAttribute('data-embed', svgId);
  const pins: PinMap = {};
  // Clone the page's diagram. Record each external pin's projected position
  // (by its original id) BEFORE stripping ids; strip ids (avoid collisions /
  // slot-discovery tests) and the interactive `child-slot` class.
  for (const child of Array.from(src.children)) {
    const c = child.cloneNode(true) as Element;
    for (const e of [c, ...Array.from(c.querySelectorAll('*'))]) {
      const id = e.getAttribute('id');
      if (id && e.classList?.contains('pin')) {
        const cx = parseFloat(e.getAttribute('cx') || '0');
        const cy = parseFloat(e.getAttribute('cy') || '0');
        pins[id] = { x: tx + cx * sc, y: ty + cy * sc };
        e.setAttribute('data-pin-id', id);  // keep findable without an id
      }
      // Component bodies light by id on the real page; preserve the id as
      // data-body so the embed can be lit to match state (else they'd stay dark).
      if (id && (e.classList?.contains('tbody') || e.classList?.contains('tbody-mini'))) {
        e.setAttribute('data-body', id);
      }
      e.removeAttribute('id');
      e.classList?.remove('child-slot');
      // CRITICAL: the parent slot fades its OWN `.simple-body`/`.simple-label`
      // to 0 on hover (to reveal this preview). The embedded child's component
      // boxes/labels share those class names and sit INSIDE the hovered slot,
      // so they'd be faded to invisible too — you'd see only wires, no gates.
      // Drop the class names (keep `tbody`/`tlabel` for styling + lighting) so
      // the inner structure stays visible.
      e.classList?.remove('simple-body');
      e.classList?.remove('simple-label');
      // If the embedded page is itself a migrated composite, its own slots
      // carry data-embed-page. Strip those so the clone is fully inert and is
      // never re-discovered as a (now id-less) embed slot by the fidelity test.
      e.removeAttribute('data-embed-page');
      e.removeAttribute('data-embed-svg');
    }
    g.appendChild(c);
  }
  host.appendChild(g);
  return pins;
}

// Embed a renderer-built scene (already in box coordinates). Records each
// pin's position by id, marks bodies, and strips ids/embed attrs (inert clone).
function embedRendered(host: Element, render: (box: Box) => SVGGElement, box: Box): PinMap {
  const scene = render(box);
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('pointer-events', 'none');
  g.setAttribute('class', 'embed');
  g.appendChild(scene);
  const pins: PinMap = {};
  for (const e of Array.from(g.querySelectorAll('*'))) {
    const id = e.getAttribute('id');
    if (id && e.classList?.contains('pin')) {
      pins[id] = { x: parseFloat(e.getAttribute('cx') || '0'), y: parseFloat(e.getAttribute('cy') || '0') };
      e.setAttribute('data-pin-id', id);
    }
    if (id && (e.classList?.contains('tbody') || e.classList?.contains('tbody-mini'))) {
      e.setAttribute('data-body', id);
    }
    e.removeAttribute('id');
    e.classList?.remove('child-slot');
    e.classList?.remove('simple-body');
    e.classList?.remove('simple-label');
    e.removeAttribute('data-embed-page');
    e.removeAttribute('data-embed-svg');
  }
  host.appendChild(g);
  return pins;
}

// Inject (once per document) the styling that keeps an embedded preview
// LEGIBLE. Unlit component boxes/wires/pins are near-black on the page (so they
// recede behind lit ones), but at preview scale on a black canvas that makes
// the inner STRUCTURE invisible — you'd see only the lit wires, not the gates.
// These rules brighten only the OFF elements (`:not([data-on="1"])`), so lit
// ones keep the page's orange and the boxes/wires are always visible. One
// place fixes every embed on every page.
function ensureEmbedStyle() {
  if (document.getElementById('embed-legibility')) return;
  const s = document.createElement('style');
  s.id = 'embed-legibility';
  s.textContent = `
    /* The embed group is scaled DOWN to fit its box, which would shrink every
       stroke to sub-pixel (invisible). non-scaling-stroke keeps strokes at a
       constant on-screen width so the inner gates/wires stay legible. */
    .embed .tbody, .embed .tbody-mini, .embed .wire, .embed .pin, .embed path {
      vector-effect: non-scaling-stroke;
    }
    .embed .tbody:not([data-on="1"]), .embed .tbody-mini:not([data-on="1"]),
    .embed path.tbody:not([data-on="1"]) {
      fill: #202020; stroke: #7a7a7a; stroke-dasharray: none; stroke-width: 1.4;
    }
    .embed .tbody[data-on="1"], .embed .tbody-mini[data-on="1"] { stroke-width: 1.7; }
    .embed .wire { stroke-width: 1.7; }
    .embed .wire:not([data-on="1"]) { stroke: #5e5e5e; }
    .embed .pin:not([data-on="1"]) { fill: #6f6f6f; }
    /* Keep the COMPONENT/BLOCK names inside a preview so the preview is
       self-labeling and a walkthrough can reference its parts by name
       (decoder, MUX, reg0..3, full adder, ...). These are the .tlabel /
       .tlabel-mini class — across every page the block name uses it, while
       the noisy pin/wire/sub labels use .tlabel-small / .tlabel-sub /
       .tlabel-mini-tiny. Hide everything, then re-show only the names; the
       small labels are there in full when you actually drill in. One place
       governs every embed on every page. */
    .embed text { display: none; }
    .embed text.tlabel, .embed text.tlabel-mini { display: inline; fill: #cbcbcb; }
    .embed .tbody[data-on="1"] + text.tlabel,
    .embed .tbody-mini[data-on="1"] + text.tlabel-mini { fill: var(--on); }
  `;
  document.head.appendChild(s);
}

// Fill every [data-embed-page] slot under `root`. Returns slotId → projected
// child pin positions (so the parent can route its wires ONTO the embedded
// replica's real pins). Logs loudly any slot it cannot satisfy.
export function autoFillEmbeds(root: ParentNode): Map<string, PinMap> {
  ensureEmbedStyle();
  const out = new Map<string, PinMap>();
  for (const slot of Array.from(root.querySelectorAll('[data-embed-page]'))) {
    const id = (slot as Element).id;
    const page = slot.getAttribute('data-embed-page') || '';
    const svgId = slot.getAttribute('data-embed-svg') || '';
    const raw = PAGE_RAW[page];
    const renderer = PAGE_RENDERERS[page];
    const host = slot.querySelector('.detailed');
    const bodyRect = slot.querySelector('rect.simple-body');
    if ((!raw && !renderer) || !host || !bodyRect) {
      console.error(`[embedPreview] #${id}: cannot embed "${page}" ` +
        `(raw=${!!raw}, renderer=${!!renderer}, host=${!!host}, box=${!!bodyRect}). Add it to PAGE_RAW/PAGE_RENDERERS / fix the slot.`);
      continue;
    }
    const box: Box = {
      x: parseFloat(bodyRect.getAttribute('x') || '0'),
      y: parseFloat(bodyRect.getAttribute('y') || '0'),
      w: parseFloat(bodyRect.getAttribute('width') || '0'),
      h: parseFloat(bodyRect.getAttribute('height') || '0'),
    };
    if (renderer) { out.set(id, embedRendered(host, renderer, box)); continue; }
    const pins = embedSvg(host, raw, svgId, box);
    if (pins) out.set(id, pins);
    else console.error(`[embedPreview] #${id}: no <svg#${svgId}> in "${page}".`);
  }
  return out;
}
