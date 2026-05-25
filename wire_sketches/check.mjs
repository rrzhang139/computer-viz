#!/usr/bin/env node
// Deterministic geometry checker for wire_sketches/layerN_<name>.md.
//
// Usage:
//   node wire_sketches/check.mjs <layer.md> [<layer.md> ...]
//   node wire_sketches/check.mjs --all
//
// Reports any of the following as VIOLATIONS:
//   1. Two children's bounding boxes overlap (any non-zero intersection of
//      their open interiors).
//   2. A wire (or auto-routed supply) segment crosses through the OPEN
//      INTERIOR of a child's bounding box that the segment does not
//      terminate inside / on. (A wire whose endpoint is owned by that
//      child — i.e. matches one of the child's declared terminal coords —
//      is allowed to enter the box.)
//   3. A wire segment runs co-linear with a foreign child's BOUNDARY edge
//      for non-trivial length (visually identical to grazing the body).
//   4. Two segments overlap in a 1-D run (parallel & coincident, not just
//      crossing at a single point). Same-net branches sharing a stub at a
//      junction are not flagged.
//   5. A wire endpoint is FLOATING — not touching any of: a child's
//      bounding box, an external terminal, a supply rail, the parent's
//      outer boundary, or another wire's polyline.
//   6. A wire endpoint or via point is STRICTLY INSIDE a non-transistor
//      child's body. Composite children (NANDs, latches, etc.) are
//      abstract boxes; wires must terminate ON the box edge, not enter
//      the interior. Transistors are exempt — they're leaf physical
//      objects whose bodies legitimately absorb wire ends.
//
// Exit code 0 iff no violations across all checked files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadLayer, collectAllSegments, childCanvasAspect,
  distanceSegmentToBox, deriveAbsorbedTerminals,
  extractChildMappings,
} from './lib.mjs';

const EPS = 1e-6;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const files = args.includes('--all')
  ? fs.readdirSync(__dirname).filter((f) => /^layer\d+_.+\.md$/.test(f)).sort().map((f) => path.join(__dirname, f))
  : args.map((a) => path.resolve(a));

if (files.length === 0) {
  console.error('usage: node wire_sketches/check.mjs [--all | <file.md> ...]');
  process.exit(1);
}

let totalViolations = 0;
for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  const violations = checkLayer(file);
  if (violations.length === 0) {
    console.log('PASS  ' + rel);
  } else {
    console.log('FAIL  ' + rel + '  (' + violations.length + ' violation' + (violations.length === 1 ? '' : 's') + ')');
    for (const v of violations) console.log('  • ' + v);
    totalViolations += violations.length;
  }
}

process.exit(totalViolations === 0 ? 0 : 1);

function checkLayer(mdPath) {
  const layer = loadLayer(mdPath);
  const violations = [];

  // 0. Supply terminals must sit on the canonical scene edges: Vdd on
  // TOP (y == sceneBounds.maxY), GND on BOTTOM (y == sceneBounds.minY).
  // This is the spatial-invariant contract from CLAUDE.md — the
  // top/bottom rails are the only places power/ground can live.
  const EPS_EDGE = 1e-6;
  for (const e of layer.ext) {
    if (e.key === 'Vdd' && Math.abs(e.y - layer.bounds.maxY) > EPS_EDGE) {
      violations.push(
        'supply-position: Vdd at y=' + e.y + ' is not on the TOP edge (y=' +
        layer.bounds.maxY + ')'
      );
    }
    if (e.key === 'GND' && Math.abs(e.y - layer.bounds.minY) > EPS_EDGE) {
      violations.push(
        'supply-position: GND at y=' + e.y + ' is not on the BOTTOM edge (y=' +
        layer.bounds.minY + ')'
      );
    }
  }

  // 1. Child-child box overlap.
  for (let i = 0; i < layer.children.length; i++) {
    for (let j = i + 1; j < layer.children.length; j++) {
      const c1 = layer.children[i];
      const c2 = layer.children[j];
      const b1 = boxOf(c1);
      const b2 = boxOf(c2);
      const xOverlap = Math.min(b1.right, b2.right) - Math.max(b1.left, b2.left);
      const yOverlap = Math.min(b1.top, b2.top) - Math.max(b1.bottom, b2.bottom);
      if (xOverlap > EPS && yOverlap > EPS) {
        violations.push(
          'box-overlap: ' + c1.id + ' [' + b1.left + ',' + b1.right + ']×[' + b1.bottom + ',' + b1.top +
          '] ∩ ' + c2.id + ' [' + b2.left + ',' + b2.right + ']×[' + b2.bottom + ',' + b2.top + ']',
        );
      }
    }
  }

  // 2. Segments crossing a child's interior. The owner exemption ONLY
  // applies to transistors — physical leaves whose absorbed terminals
  // legitimately sit inside the body. Composite children (gates,
  // latches, …) have all terminals on the boundary, so even an owned
  // wire must approach from OUTSIDE the box.
  const segments = collectAllSegments(layer);
  for (const seg of segments) {
    for (const c of layer.children) {
      const isOwner = seg.owners.includes(c.id);
      const isLeaf = /transistor/i.test(c.layer);
      if (isOwner && isLeaf) continue;
      if (segmentCrossesBoxInterior(seg.p1, seg.p2, boxOf(c))) {
        violations.push(
          'wire-through-box: "' + seg.label + '" segment (' + fmtPt(seg.p1) + ' → ' + fmtPt(seg.p2) +
          ') crosses ' + c.id + "'s interior",
        );
      }
    }
  }

  // 3. Wire segment grazing a child's edge for non-trivial length.
  // NO exemption — even an owned transistor wire sliding along the
  // box's edge is visually a "wire along edge", which is exactly what
  // we're trying to surface. (Rule 2's owner+leaf exemption still
  // covers INTERIOR crossings for transistor terminals that sit
  // slightly inside the body — that's a different geometry.)
  const GRAZE_TOL = layer.componentBuffer;
  for (const seg of segments) {
    for (const c of layer.children) {
      const grazeLen = segmentGrazesBoxEdge(seg.p1, seg.p2, boxOf(c));
      if (grazeLen > GRAZE_TOL) {
        violations.push(
          'wire-along-edge: "' + seg.label + '" runs along ' + c.id + "'s boundary for " +
          grazeLen.toFixed(3) + ' world units',
        );
      }
    }
  }

  // 4. Segment-segment co-linear overlap (parallel & coincident with
  // non-zero length). Skipped when:
  //   • the two segments share an exact endpoint (junction / T-shape), or
  //   • the two segments carry the SAME net — overlap of same-net wires
  //     is functional shared infrastructure, not visual clutter.
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const s1 = segments[i];
      const s2 = segments[j];
      if (s1.net && s2.net && s1.net === s2.net) continue;
      if (sharesEndpoint(s1, s2)) continue;
      const overlap = collinearOverlap(s1, s2);
      if (overlap && overlap > EPS) {
        violations.push(
          'wire-wire-overlap: "' + s1.label + '" (net=' + (s1.net || '-') + ') and "' +
          s2.label + '" (net=' + (s2.net || '-') + ') run co-linear for ' +
          overlap.toFixed(3) + ' world units',
        );
      }
    }
  }

  // 5. Floating endpoints. Every wire's `from` and `to` coord, plus every
  // auto-supply route's start and end, must touch SOMETHING: a child box,
  // an external terminal, a supply rail, another wire's polyline, or the
  // scene's outer boundary.
  const endpointGroups = [];
  for (const w of layer.wires) {
    const fromPt = layer.allNodes.get(w.from);
    const toPt = layer.allNodes.get(w.to);
    if (!fromPt || !toPt) continue;
    const prefix = 'wire ' + w.from + ' → ' + w.to;
    endpointGroups.push({ name: w.from, pt: fromPt, ownPrefix: prefix });
    endpointGroups.push({ name: w.to, pt: toPt, ownPrefix: prefix });
  }
  for (const route of layer.supplyRoutes) {
    const prefix = 'auto-' + route.kind + ' → ' + route.childId;
    const first = route.pts[0];
    const last = route.pts[route.pts.length - 1];
    endpointGroups.push({
      name: route.kind + '-rail-tap',
      pt: { x: first[0], y: first[1] },
      ownPrefix: prefix,
    });
    endpointGroups.push({
      name: route.childId + '.' + route.kind,
      pt: { x: last[0], y: last[1] },
      ownPrefix: prefix,
    });
  }
  for (const ep of endpointGroups) {
    const conn = endpointConnection(ep.pt, layer, segments, ep.ownPrefix);
    if (!conn) {
      violations.push(
        'floating-endpoint: ' + ep.ownPrefix + ' endpoint "' + ep.name + '" at ' + fmtPt(ep.pt) +
        ' is not connected to any component, terminal, rail, boundary, or wire',
      );
    }
  }

  // 6a. Child box aspect ratio matches its child layer's canvas aspect.
  // The zoom-in transition should land in a viewport whose proportions
  // match what the user clicked. Tolerance: 5% relative.
  const ASPECT_TOL = 0.05;
  for (const c of layer.children) {
    const expected = childCanvasAspect(c);
    if (expected == null) continue;
    const actual = c.w / c.h;
    const rel = Math.abs(actual - expected) / expected;
    if (rel > ASPECT_TOL) {
      violations.push(
        'child-box-aspect: ' + c.id + ' (' + c.layer + ') box ' + c.w + '×' + c.h +
        ' has aspect ' + actual.toFixed(3) + ' but child canvas aspect is ' +
        expected.toFixed(3) + ' (' + (rel * 100).toFixed(1) + '% off; max ' +
        (ASPECT_TOL * 100) + '%)',
      );
    }
  }

  // 6c. Non-axis-aligned wire segments. Every wire segment must be
  // purely horizontal or purely vertical — diagonals indicate a wire
  // whose endpoints disagree on either x or y. Tolerance scales with
  // the layer's component buffer (so floating-point round-off of
  // auto-derived terminal positions doesn't trip the rule, but a real
  // diagonal of buffer-comparable magnitude does).
  const EPS_AXIS = layer.componentBuffer * 0.05;
  for (const seg of segments) {
    if (seg.kind !== 'wire') continue;  // auto-routed supplies are axis-aligned by construction
    const dx = Math.abs(seg.p1.x - seg.p2.x);
    const dy = Math.abs(seg.p1.y - seg.p2.y);
    if (dx > EPS_AXIS && dy > EPS_AXIS) {
      violations.push(
        'non-axis-aligned: "' + seg.label + '" (' + fmtPt(seg.p1) + ' → ' +
        fmtPt(seg.p2) + ') is diagonal — Δx=' + dx.toFixed(4) + ', Δy=' +
        dy.toFixed(4) + ' (one of these must be ≤ ' + EPS_AXIS.toFixed(4) + ')'
      );
    }
  }

  // 6d. Zig-zag / dogleg detection. A wire whose polyline includes a
  // "small jog" — two perpendicular bends separated by a segment
  // shorter than `zigzagTol` — is a visual zig-zag. Detect by walking
  // every quadruple of consecutive polyline points (p0..p3) and
  // checking the middle segment (p1, p2). If it's perpendicular to its
  // neighbors AND shorter than the tolerance, flag it.
  //
  // Tolerances derive from `componentBuffer` (so they scale with scene
  // size — no per-layer constant).
  const zigzagTol = layer.componentBuffer * 1.2;
  for (const wire of layer.wires) {
    const fromPt = layer.allNodes.get(wire.from);
    const toPt = layer.allNodes.get(wire.to);
    if (!fromPt || !toPt) continue;
    const pts = [fromPt, ...wire.via, toPt];
    for (let i = 0; i + 3 < pts.length; i++) {
      const p0 = pts[i], p1 = pts[i + 1], p2 = pts[i + 2], p3 = pts[i + 3];
      const midDx = Math.abs(p1.x - p2.x);
      const midDy = Math.abs(p1.y - p2.y);
      const midIsShortH = midDy < EPS_AXIS && midDx < zigzagTol && midDx > EPS_AXIS;
      const midIsShortV = midDx < EPS_AXIS && midDy < zigzagTol && midDy > EPS_AXIS;
      if (!midIsShortH && !midIsShortV) continue;
      const beforeIsV = Math.abs(p0.x - p1.x) < EPS_AXIS;
      const afterIsV  = Math.abs(p2.x - p3.x) < EPS_AXIS;
      const beforeIsH = Math.abs(p0.y - p1.y) < EPS_AXIS;
      const afterIsH  = Math.abs(p2.y - p3.y) < EPS_AXIS;
      const isZigzag =
        (midIsShortH && beforeIsV && afterIsV) ||
        (midIsShortV && beforeIsH && afterIsH);
      if (isZigzag) {
        const midLen = midIsShortH ? midDx : midDy;
        violations.push(
          'zig-zag: wire ' + wire.from + ' → ' + wire.to +
          ' has a ' + (midIsShortH ? 'horizontal' : 'vertical') +
          ' jog of ' + midLen.toFixed(3) + ' wu between two perpendicular ' +
          'bends (tolerance ' + zigzagTol.toFixed(3) + ' wu)'
        );
      }
    }
  }

  // 6b. Wires too close to a child's body. Enforces the invisible
  // "component buffer" halo around every child — aesthetic breathing
  // room so wires don't visually crowd a block. Same owner exemption
  // rule: only transistor leaves are exempt; composites enforce the
  // buffer even on owned wires (the wire approaches the terminal
  // perpendicular to the edge, with `buffer` of clearance everywhere
  // EXCEPT at the terminal point itself).
  for (const seg of segments) {
    for (const c of layer.children) {
      const isOwner = seg.owners.includes(c.id);
      const isLeaf = /transistor/i.test(c.layer);
      if (isOwner && isLeaf) continue;
      const box = boxOf(c);
      const dist = distanceSegmentToBox(seg.p1, seg.p2, box);
      if (dist > EPS && dist < layer.componentBuffer - EPS) {
        violations.push(
          'wire-too-close: "' + seg.label + '" passes within ' + dist.toFixed(3) +
          ' wu of ' + c.id + " (component buffer " + layer.componentBuffer.toFixed(3) + " wu)",
        );
      }
    }
  }

  // 7e. Wire-along-scene-edge — a non-rail wire segment that hugs the
  // scene's outer boundary for non-trivial length is almost always a
  // bug: either the simplifier collapsed a path to the cheapest L it
  // could find (which happened to be at the boundary), or the author
  // wrote a via right on the edge by mistake. Supply rails (Vdd/GND
  // nets) are exempt — they're DEFINED as the top/bottom scene edges.
  // Threshold = `componentBuffer` so floating-point grazes from
  // external pins sitting on the boundary don't trip the rule.
  const SCENE_EDGE_TOL = layer.componentBuffer;
  for (const seg of segments) {
    if (seg.net === 'Vdd' || seg.net === 'GND') continue;
    const grazes = sceneEdgeGrazes(seg.p1, seg.p2, layer.bounds);
    for (const [edgeName, length] of grazes) {
      if (length > SCENE_EDGE_TOL) {
        violations.push(
          'wire-along-scene-edge: "' + seg.label + '" runs along the ' +
          'scene ' + edgeName + ' boundary for ' + length.toFixed(3) + ' wu'
        );
      }
    }
  }

  // 7a. Every absorbed terminal that targets a child WITH A LAYER FILE
  // must be a canonical terminal of that child layer — i.e. the
  // mapping source key (left side of "X → name") must appear in the
  // child's `terminalOffsetsWithAliases`. This is the
  // "overlay-assertion" the user asked for: when you zoom into the
  // child, every wire that touched it from outside lands on a terminal
  // the child actually exposes. No invented terminals.
  for (const child of layer.children) {
    if (!child.childLayer) continue;  // sub-gates (e.g. inverter) are exempt
    const allowed = child.childLayer.terminalOffsetsWithAliases || {};
    const mappings = extractChildMappings(layer, child);
    for (const [sourceKey, absorbedName] of mappings) {
      if (!(sourceKey in allowed)) {
        violations.push(
          'non-canonical-terminal: child "' + child.id + '" (' + child.layer +
          ') maps "' + sourceKey + ' → ' + absorbedName +
          '" but "' + sourceKey + '" is not a real terminal of the child layer ' +
          '(canonical keys: ' + Object.keys(allowed).sort().join(', ') + ')'
        );
      }
    }
  }

  // 7b. Every wire endpoint that targets a child terminal must equal the
  // child's projected position — never a hardcoded override that drifts
  // away from the canonical layout. Iterating over deriveAbsorbedTerminals
  // gives every (name, canonical_position) pair; if `layer.allNodes` has
  // the name pointing at a different position, the parent has hardcoded
  // a value that disagrees with the canonical projection.
  const derivedMap = deriveAbsorbedTerminals(layer);
  for (const [name, canonical] of derivedMap) {
    const actual = layer.allNodes.get(name);
    if (!actual) continue;
    const dx = Math.abs(actual.x - canonical.x);
    const dy = Math.abs(actual.y - canonical.y);
    if (dx > 1e-3 || dy > 1e-3) {
      violations.push(
        'overlay-mismatch: absorbed terminal "' + name +
        '" sits at ' + fmtPt(actual) + ' but the child\'s canonical projection ' +
        'puts it at (' + canonical.x.toFixed(3) + ', ' + canonical.y.toFixed(3) +
        ') — the wire wouldn\'t touch the child\'s real terminal when overlaid'
      );
    }
  }

  // 7c. Every external data terminal must be touched by at least one
  // wire's `from`/`to`. Supply rails (Vdd/GND) are exempt (rails, not
  // point endpoints). Primitive leaf layers — those with no embedded
  // children, e.g. transistor — are also exempt: their external
  // terminals exist for PARENT layers to wire to, not for the leaf
  // itself.
  if (layer.children.length > 0) {
    const wireEndpointsForExt = new Set();
    for (const w of layer.wires) {
      wireEndpointsForExt.add(w.from);
      wireEndpointsForExt.add(w.to);
    }
    for (const e of layer.ext) {
      if (e.key === 'Vdd' || e.key === 'GND') continue;
      if (!wireEndpointsForExt.has(e.key)) {
        violations.push(
          'orphan-external: external terminal "' + e.key + '" at ' +
          fmtPt({ x: e.x, y: e.y }) + ' is declared but no wire connects to it'
        );
      }
    }
  }

  // 7d. Orphan named nodes. Every entry in `layer.allNodes` must appear
  // in at least one wire's polyline (from, to, OR via — vias still
  // count because they pin a path through that point). Catches stale
  // junction names left over from a refactor.
  // Exempts: `Vdd` and `GND` are rail names that aren't expected to be
  // wire endpoints (wires use Vdd_left, Vdd_rail_left, etc.).
  // Exempts: layers with no children (leaf primitives) — their
  // external terminals exist only for parents to consume.
  if (layer.children.length > 0) {
    const referencedNames = new Set();
    for (const w of layer.wires) {
      referencedNames.add(w.from);
      referencedNames.add(w.to);
    }
    for (const [name, pt] of layer.allNodes) {
      if (name === 'Vdd' || name === 'GND') continue;
      if (referencedNames.has(name)) continue;
      let foundInVia = false;
      for (const w of layer.wires) {
        for (const v of w.via) {
          if (Math.abs(v.x - pt.x) < 1e-6 && Math.abs(v.y - pt.y) < 1e-6) {
            foundInVia = true; break;
          }
        }
        if (foundInVia) break;
      }
      if (!foundInVia) {
        violations.push(
          'orphan-node: named node "' + name + '" at ' + fmtPt(pt) +
          ' is not referenced by any wire (from / to / via)'
        );
      }
    }
  }

  // 7. Expose only the terminals that a wire actually touches. Every
  // absorbed terminal declared in the embedded-children mapping must
  // appear as the `from` or `to` of at least one wire — if it doesn't,
  // the child box is exposing a connection point with nothing on the
  // other end, which is exactly the visual clutter the
  // "expose-nothing-else" rule was added to prevent. Conversely, every
  // wire endpoint must be a declared absorbed terminal, an external
  // terminal, a supply-rail key, or another named junction node (already
  // enforced by rule 5's floating-endpoint check above).
  const wireEndpoints = new Set();
  for (const w of layer.wires) {
    wireEndpoints.add(w.from);
    wireEndpoints.add(w.to);
  }
  for (const [name] of deriveAbsorbedTerminals(layer)) {
    if (!wireEndpoints.has(name)) {
      violations.push(
        'unused-terminal: child terminal "' + name + '" is exposed but no ' +
        'wire connects to it — either add a wire or remove the mapping'
      );
    }
  }

  // 6. Wire endpoints / via points strictly inside a non-transistor body.
  for (const w of layer.wires) {
    const fromPt = layer.allNodes.get(w.from);
    const toPt = layer.allNodes.get(w.to);
    if (!fromPt || !toPt) continue;
    const candidates = [
      { name: w.from, pt: fromPt },
      ...w.via.map((v, i) => ({ name: w.from + '→' + w.to + ' via#' + i, pt: v })),
      { name: w.to, pt: toPt },
    ];
    for (const cand of candidates) {
      for (const c of layer.children) {
        if (/transistor/i.test(c.layer)) continue;
        const b = boxOf(c);
        const insideOpen = cand.pt.x > b.left + EPS && cand.pt.x < b.right - EPS &&
                           cand.pt.y > b.bottom + EPS && cand.pt.y < b.top - EPS;
        if (insideOpen) {
          violations.push(
            'endpoint-in-body: "' + cand.name + '" at ' + fmtPt(cand.pt) +
            ' is strictly inside ' + c.id + "'s body — must sit on the box boundary",
          );
        }
      }
    }
  }

  return violations;
}

// Returns a short string describing what `pt` connects to, or null if
// nothing.
function endpointConnection(pt, layer, allSegments, ownPrefix) {
  // 1. Closed child bounding box.
  for (const c of layer.children) {
    const b = boxOf(c);
    if (pt.x >= b.left - EPS && pt.x <= b.right + EPS &&
        pt.y >= b.bottom - EPS && pt.y <= b.top + EPS) {
      return 'child ' + c.id;
    }
  }
  // 2. External point-terminal (exact coord match).
  for (const e of layer.ext) {
    if (e.key === 'Vdd' || e.key === 'GND') continue;
    if (Math.abs(e.x - pt.x) < EPS && Math.abs(e.y - pt.y) < EPS) {
      return 'external ' + e.key;
    }
  }
  // 3. Supply rail (Vdd at top y, GND at bottom y, anywhere along x).
  for (const e of layer.ext) {
    if (e.key !== 'Vdd' && e.key !== 'GND') continue;
    if (Math.abs(e.y - pt.y) < EPS &&
        pt.x >= layer.bounds.minX - EPS && pt.x <= layer.bounds.maxX + EPS) {
      return 'rail ' + e.key;
    }
  }
  // 4. On another wire's polyline (any segment not belonging to the same wire).
  for (const seg of allSegments) {
    if (seg.label.startsWith(ownPrefix)) continue;
    if (pointOnSegment(pt, seg.p1, seg.p2)) {
      return 'wire-junction "' + seg.label + '"';
    }
  }
  // 5. On the parent's outer boundary.
  const b = layer.bounds;
  if (Math.abs(pt.x - b.minX) < EPS || Math.abs(pt.x - b.maxX) < EPS ||
      Math.abs(pt.y - b.minY) < EPS || Math.abs(pt.y - b.maxY) < EPS) {
    return 'scene-boundary';
  }
  return null;
}

function pointOnSegment(p, a, b) {
  if (Math.abs(a.x - b.x) < EPS) {
    // Vertical segment.
    if (Math.abs(p.x - a.x) > EPS) return false;
    const yMin = Math.min(a.y, b.y) - EPS;
    const yMax = Math.max(a.y, b.y) + EPS;
    return p.y >= yMin && p.y <= yMax;
  }
  if (Math.abs(a.y - b.y) < EPS) {
    // Horizontal segment.
    if (Math.abs(p.y - a.y) > EPS) return false;
    const xMin = Math.min(a.x, b.x) - EPS;
    const xMax = Math.max(a.x, b.x) + EPS;
    return p.x >= xMin && p.x <= xMax;
  }
  // Diagonal — colinearity + parametric check.
  const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > EPS) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot >= -EPS && dot <= lenSq + EPS;
}

// Length over which a segment runs strictly along (co-linear with) one of
// the box's four edges. A wire that just touches a corner returns 0;
// a wire that runs along the top edge for 1.5 world units returns 1.5.
function segmentGrazesBoxEdge(p1, p2, box) {
  const vert = Math.abs(p1.x - p2.x) < EPS;
  const horiz = Math.abs(p1.y - p2.y) < EPS;
  if (!vert && !horiz) return 0;
  if (horiz) {
    // Y must match top or bottom edge.
    const onTop = Math.abs(p1.y - box.top) < EPS;
    const onBot = Math.abs(p1.y - box.bottom) < EPS;
    if (!onTop && !onBot) return 0;
    const xMin = Math.min(p1.x, p2.x);
    const xMax = Math.max(p1.x, p2.x);
    return Math.max(0, Math.min(xMax, box.right) - Math.max(xMin, box.left));
  }
  // Vertical.
  const onLeft = Math.abs(p1.x - box.left) < EPS;
  const onRight = Math.abs(p1.x - box.right) < EPS;
  if (!onLeft && !onRight) return 0;
  const yMin = Math.min(p1.y, p2.y);
  const yMax = Math.max(p1.y, p2.y);
  return Math.max(0, Math.min(yMax, box.top) - Math.max(yMin, box.bottom));
}

function boxOf(c) {
  return {
    left: c.cx - c.w / 2,
    right: c.cx + c.w / 2,
    bottom: c.cy - c.h / 2,
    top: c.cy + c.h / 2,
  };
}

// A segment (p1 → p2) crosses the OPEN INTERIOR of `box` iff at least one
// point strictly inside the box lies on the segment. Endpoints touching
// or sliding along an edge don't count.
function segmentCrossesBoxInterior(p1, p2, box) {
  const xMin = Math.min(p1.x, p2.x);
  const xMax = Math.max(p1.x, p2.x);
  const yMin = Math.min(p1.y, p2.y);
  const yMax = Math.max(p1.y, p2.y);

  // Axis-aligned fast path covers every segment we currently emit.
  if (Math.abs(p1.x - p2.x) < EPS) {
    // Vertical segment.
    if (p1.x <= box.left + EPS || p1.x >= box.right - EPS) return false;
    const overlap = Math.min(yMax, box.top) - Math.max(yMin, box.bottom);
    return overlap > EPS;
  }
  if (Math.abs(p1.y - p2.y) < EPS) {
    // Horizontal segment.
    if (p1.y <= box.bottom + EPS || p1.y >= box.top - EPS) return false;
    const overlap = Math.min(xMax, box.right) - Math.max(xMin, box.left);
    return overlap > EPS;
  }

  // Diagonal — Liang-Barsky parametric clip against the box, then check if
  // any interior parameter survives in (0, 1).
  let t0 = 0;
  let t1 = 1;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const ps = [-dx, dx, -dy, dy];
  const qs = [p1.x - box.left, box.right - p1.x, p1.y - box.bottom, box.top - p1.y];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(ps[i]) < EPS) {
      if (qs[i] < 0) return false;
    } else {
      const r = qs[i] / ps[i];
      if (ps[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t1 - t0 > EPS && t0 < 1 - EPS && t1 > EPS;
}

// Returns the lengths over which an axis-aligned segment runs colinear
// with each of the scene's outer boundary edges. Each entry is
// [edgeName, length]. Diagonal segments return an empty list.
function sceneEdgeGrazes(p1, p2, bounds) {
  const EPS = 1e-6;
  const out = [];
  const horiz = Math.abs(p1.y - p2.y) < EPS;
  const vert = Math.abs(p1.x - p2.x) < EPS;
  if (horiz) {
    const length = Math.abs(p2.x - p1.x);
    if (Math.abs(p1.y - bounds.minY) < EPS) out.push(['bottom', length]);
    if (Math.abs(p1.y - bounds.maxY) < EPS) out.push(['top', length]);
  }
  if (vert) {
    const length = Math.abs(p2.y - p1.y);
    if (Math.abs(p1.x - bounds.minX) < EPS) out.push(['left', length]);
    if (Math.abs(p1.x - bounds.maxX) < EPS) out.push(['right', length]);
  }
  return out;
}

function sharesEndpoint(s1, s2) {
  return ptEq(s1.p1, s2.p1) || ptEq(s1.p1, s2.p2) || ptEq(s1.p2, s2.p1) || ptEq(s1.p2, s2.p2);
}

function ptEq(a, b) {
  return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
}

// If two axis-aligned segments are co-linear (both vertical at the same x,
// or both horizontal at the same y), return their overlapping length.
function collinearOverlap(s1, s2) {
  const s1Vert = Math.abs(s1.p1.x - s1.p2.x) < EPS;
  const s2Vert = Math.abs(s2.p1.x - s2.p2.x) < EPS;
  const s1Horiz = Math.abs(s1.p1.y - s1.p2.y) < EPS;
  const s2Horiz = Math.abs(s2.p1.y - s2.p2.y) < EPS;
  if (s1Vert && s2Vert && Math.abs(s1.p1.x - s2.p1.x) < EPS) {
    const a = [Math.min(s1.p1.y, s1.p2.y), Math.max(s1.p1.y, s1.p2.y)];
    const b = [Math.min(s2.p1.y, s2.p2.y), Math.max(s2.p1.y, s2.p2.y)];
    return Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
  }
  if (s1Horiz && s2Horiz && Math.abs(s1.p1.y - s2.p1.y) < EPS) {
    const a = [Math.min(s1.p1.x, s1.p2.x), Math.max(s1.p1.x, s1.p2.x)];
    const b = [Math.min(s2.p1.x, s2.p2.x), Math.max(s2.p1.x, s2.p2.x)];
    return Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
  }
  return 0;
}

function fmtPt(p) {
  return '(' + p.x.toFixed(2) + ', ' + p.y.toFixed(2) + ')';
}
