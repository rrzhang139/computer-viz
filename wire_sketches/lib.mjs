// Shared parsing + routing helpers for wire_sketches/{render,check}.mjs.
// Anything that both the SVG generator and the geometry checker need lives
// here so they can't drift apart.
//
// Programmatic-first architecture: every derived geometric value (canvas
// aspect, terminal offsets, absorbed coords, component buffer, wire
// spacing) is COMPUTED from the layer markdown's primary inputs (scene
// bounds, external terminals, embedded-children boxes, wire endpoints).
// The few literal constants here are dimensionless thresholds (relative
// tolerances, fractions) — no per-layer hardcoded coords or aspects.

import fs from 'node:fs';
import path from 'node:path';

// Cache layers by their absolute path so a recursive load doesn't
// re-parse the same file twice.
const LAYER_CACHE = new Map();

export function loadLayer(mdPath) {
  const absPath = path.resolve(mdPath);
  if (LAYER_CACHE.has(absPath)) return LAYER_CACHE.get(absPath);

  const src = fs.readFileSync(absPath, 'utf8');
  const sections = splitSections(src);
  const bounds = parseBounds(sections['Scene bounds'] || '');
  const ext = parseExternalTerminals(sections['External terminals'] || '');
  const children = parseEmbeddedChildren(sections['Embedded children'] || '');
  const allNodes = buildNodeMap(src);
  const wires = parseWires(sections['Wires'] || '');
  const supplyRoutes = computeSupplyRoutes(ext, children, bounds);
  const layer = {
    mdPath: absPath, src, sections, bounds, ext, children,
    allNodes, wires, supplyRoutes,
  };
  // Cache before recursing so a child-of-this-layer mapping that loops
  // back doesn't infinitely recurse.
  LAYER_CACHE.set(absPath, layer);

  // PROGRAMMATIC GEOMETRY DERIVATIONS — every value below is computed
  // from the markdown above, not stored in a per-layer constants table.

  // 1. Canvas aspect of this layer (w / h). Used by parent layers to
  // size embedded child boxes so the zoom-into-this-layer transition
  // matches the box the user just clicked.
  layer.canvasAspect = canvasAspectFromBounds(bounds);

  // 2. Normalized edge offsets for each of THIS layer's external data
  // terminals — exactly what a parent embedding this layer needs to
  // know to place the absorbed-terminal at the correct edge fraction.
  layer.terminalOffsets = deriveTerminalOffsetsFromExternals(ext, bounds);

  // 3. Convenience aliases (single-letter shortcuts that the
  // dlatch-style "A → ..." / "T → ..." parent syntax uses).
  layer.terminalOffsetsWithAliases = withCanonicalAliases(layer.terminalOffsets);

  // 4. Aesthetic buffer (invisible halo) around every child box in this
  // layer's scene, scaled to the layer's own world units so a "0.15-ish"
  // gap reads visually consistent across layers of different sizes.
  layer.componentBuffer = componentBufferFromBounds(bounds);

  // 5. For each embedded child, recursively load the canonical child
  // layer .md file (if one exists). Attaches `child.childLayer` so
  // `projectChildTerminal(child, key)` has everything it needs without
  // any per-key lookup tables here.
  for (const child of children) {
    const childMd = resolveChildLayerMdPath(child, absPath);
    child.childLayer = childMd ? loadLayer(childMd) : null;
  }

  // 6. Auto-derive absorbed-terminal coords from the embedded-children
  // mappings (each `<term> → <name>` arrow in the table). Each derived
  // coord = child box corner + child.childLayer.terminalOffsets[term]
  // applied along the declared edge. Hardcoded coords in the markdown's
  // absorbed-terminals table take precedence (escape hatch for any
  // non-canonical placement).
  const derived = deriveAbsorbedTerminals(layer);
  for (const [name, pt] of derived) {
    if (!allNodes.has(name)) allNodes.set(name, pt);
  }

  // 7. Aesthetic wire relaxation: after all named nodes resolve, push
  // each free (non-anchored) via point AWAY from foreign child boxes
  // by at least `componentBuffer`, and evenly distribute parallel
  // lanes that share a corridor. Updates wire polylines in place.
  relaxWirePathsForAesthetics(layer);

  return layer;
}

// ─── Programmatic geometry helpers ──────────────────────────────────────
//
// Every per-layer canonical value (aspect, terminal offsets, buffer)
// derives from the layer's own markdown — parsed in `loadLayer`. There
// is no per-layer keyword-keyed lookup table; the child layer ITSELF
// is the source of truth.
//
// Helpers below are the single computation site used by both the
// renderer and the checker. They accept fully-loaded layer objects
// (with `.bounds` and `.ext` populated) rather than re-reading files.

// Canvas aspect (w/h) of a layer, derived from its declared bounds.
export function canvasAspectFromBounds(bounds) {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  if (h === 0) return null;
  return w / h;
}

// Aesthetic buffer (world units) around every child box in this scene.
// Scaled to the layer's own size so a "small fraction" of the canvas
// reads consistently regardless of whether the scene is 2 units or 12
// units wide. The dimensionless fraction is the ONLY tuning knob; it
// was chosen so the resulting halo is visually noticeable but small
// enough that tight inter-component corridors can still satisfy the
// buffer when the supply router centers the lane.
export function componentBufferFromBounds(bounds) {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  return 0.012 * Math.min(w, h);
}

// Convert each EXTERNAL terminal into a normalized edge-fractional
// offset. Same formula the renderer uses to place embedded children's
// absorbed terminals:
//   LEFT/RIGHT edges:  frac = (sceneMaxY - termY) / sceneH
//                       (0 = top of edge, 1 = bottom)
//   TOP/BOTTOM edges:  frac = (termX - sceneMinX) / sceneW
//                       (0 = left, 1 = right)
// Vdd / GND rails are skipped — they're handled by `computeSupplyRoutes`,
// not as point terminals.
export function deriveTerminalOffsetsFromExternals(ext, bounds) {
  const offsets = {};
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  for (const e of ext) {
    if (e.key === 'Vdd' || e.key === 'GND') continue;
    let frac = null;
    if (e.edge === 'LEFT' || e.edge === 'RIGHT') {
      frac = (bounds.maxY - e.y) / h;
    } else if (e.edge === 'TOP' || e.edge === 'BOTTOM') {
      frac = (e.x - bounds.minX) / w;
    }
    if (frac == null) continue;
    offsets[e.key] = { edge: e.edge, frac };
  }
  return offsets;
}

// Augment an offsets map with canonical short aliases. Each terminal
// named "<X>_<suffix>" gets an alias just "<X>" — so the dlatch's
// table can write "A → GS_A_in" and have it resolve to the same offset
// as the gate's full "A_input" key.
//
// No fallback aliases (like a fictional "T" for TOP-edge data input)
// are injected — every alias MUST come from a real terminal of the
// child layer. This is the programmatic guarantee that the parent
// can't invent a connection point the child doesn't actually have:
// when the user zooms into the child, every wire that touched it from
// outside lands on a terminal that exists in the child's own scene.
export function withCanonicalAliases(offsets) {
  const out = { ...offsets };
  for (const [key, val] of Object.entries(offsets)) {
    const short = key.split('_')[0];
    if (short !== key && !(short in out)) out[short] = val;
  }
  return out;
}

// Locate the canonical `.md` for a child's free-text layer descriptor
// (e.g. "gate (NAND)" → `layer1_gate.md`). Returns absolute path or
// null if no matching file exists in the same directory as the parent.
export function resolveChildLayerMdPath(child, parentMdPath) {
  const layerStr = String(child.layer || '').trim().toLowerCase();
  if (!layerStr) return null;
  // Pull the first identifier-ish word, e.g. "gate (NAND)" → "gate".
  const m = layerStr.match(/^([a-z][a-z0-9-]*)/);
  if (!m) return null;
  const wantKey = m[1];
  const dir = path.dirname(parentMdPath);
  let files;
  try { files = fs.readdirSync(dir); } catch { return null; }
  for (const f of files) {
    if (!/^layer\d+_/.test(f) || !f.endsWith('.md')) continue;
    const parts = f.match(/^layer\d+_([a-z0-9-]+)\.md$/);
    if (!parts) continue;
    if (parts[1] === wantKey) return path.join(dir, f);
  }
  return null;
}

// Read the child's resolved canvas aspect — derived from the child
// layer's own bounds, NOT from a per-layer keyword table.
export function childCanvasAspect(child) {
  return child.childLayer?.canvasAspect ?? null;
}

// Single source of truth for absorbed-terminal placement. Given a
// child placement (cx, cy, w, h in parent world coords) and one of the
// child layer's terminal keys, return where the wire that terminates
// at that child terminal physically lands in parent world coords —
// snapped to the declared edge at the projected fractional offset.
//
// The offsets come directly from the CHILD layer's `.terminalOffsetsWithAliases`,
// which was derived from that layer's own external-terminals table at
// load time. Nothing here is hardcoded per child layer.
export function projectChildTerminal(child, terminalKey) {
  // Transistors are physical leaf objects whose terminals sit slightly
  // INSIDE the body (e.g. the gate is a polysilicon strip a small
  // distance from the box edge) — they don't follow the edge-snap
  // projection model. The parent's markdown declares their absorbed
  // positions explicitly; we don't auto-derive.
  if (/transistor/i.test(String(child.layer || ''))) return null;
  const cl = child.childLayer;
  if (!cl) return null;
  const offsets = cl.terminalOffsetsWithAliases || cl.terminalOffsets;
  if (!offsets) return null;
  const term = offsets[terminalKey];
  if (!term) return null;
  const left = child.cx - child.w / 2;
  const right = child.cx + child.w / 2;
  const top = child.cy + child.h / 2;
  const bottom = child.cy - child.h / 2;
  switch (term.edge) {
    case 'LEFT':   return { x: left,  y: top - term.frac * child.h };
    case 'RIGHT':  return { x: right, y: top - term.frac * child.h };
    case 'TOP':    return { x: left + term.frac * child.w, y: top };
    case 'BOTTOM': return { x: left + term.frac * child.w, y: bottom };
    default:       return null;
  }
}

// For each embedded child, walk every (child_terminal → absorbed_name)
// mapping declared in the parent's embedded-children table and project
// the terminal into parent coords. Returns Map<absorbedName, {x, y}>.
//
// Mapping formats handled:
//   • Layer 2 style: one column per child terminal, header "<term> →".
//     The cell value IS the absorbed-name in the parent.
//   • Layer 3 style: a single text column with concatenated pairs like
//     "A (D, LEFT) → GS_A_in, T (EN, TOP) → GS_T_in".
export function deriveAbsorbedTerminals(layer) {
  const out = new Map();
  for (const child of layer.children) {
    for (const [sourceKey, absorbedName] of extractChildMappings(layer, child)) {
      const pos = projectChildTerminal(child, sourceKey);
      if (pos) out.set(absorbedName, pos);
    }
  }
  return out;
}

// Parse the parent's "Embedded children" table to extract every
// (child_terminal_key, absorbed_name) mapping declared for `child`.
// Two formats supported:
//   • Layer-2 style: one column per terminal, with header "X →" and
//     the cell value being the absorbed name.
//   • Layer-3 style: a free-text column with concatenated pairs like
//     "A (D, LEFT) → GS_A_in, T (EN, TOP) → GS_T_in".
// Returns an array of [sourceKey, absorbedName] tuples.
export function extractChildMappings(layer, child) {
  const sec = (layer.sections || {})['Embedded children'] || '';
  if (!sec) return [];
  const lines = sec.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return [];
  const headers = splitRow(lines[0]);

  const termCols = [];
  for (let i = 0; i < headers.length; i++) {
    const m = headers[i].match(/^([A-Za-z_]\w*)\s*→/);
    if (!m) continue;
    const headerTermKey = m[1];
    const isRealTerm = layer.children.some((c) => {
      const offsets = c.childLayer?.terminalOffsetsWithAliases;
      return offsets && headerTermKey in offsets;
    });
    if (isRealTerm) termCols.push({ idx: i, termKey: headerTermKey });
  }

  for (const line of lines.slice(2)) {
    const cells = splitRow(line);
    if (cells[0] !== child.id) continue;
    const out = [];
    for (const tc of termCols) {
      const absorbed = (cells[tc.idx] || '').trim();
      if (!absorbed || absorbed === '—') continue;
      out.push([tc.termKey, absorbed]);
    }
    for (let i = 4; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const re = /([A-Za-z_]\w*)(?:\s*\([^)]*\))?\s*→\s*([A-Za-z_]\w*)/g;
      let m;
      while ((m = re.exec(cell)) !== null) out.push([m[1], m[2]]);
    }
    return out;
  }
  return [];
}

// ─── Aesthetic wire relaxation ──────────────────────────────────────────
//
// Buffer enforcement: every INTERMEDIATE via point that's too close to
// a foreign child (closer than `layer.componentBuffer`) is pushed away
// just enough to clear the buffer. Conservative — we never shift a via
// whose coord matches an ANCHOR node's coord on the relevant axis,
// because anchor nodes (named junctions, external terminals) are the
// authoritative reference points for the wire's path. A via on the
// same vertical lane as EN_bus_GS, for instance, must keep that x.
//
// Even-spacing of corridors is a stretch goal — it requires constraint
// propagation across multiple wires (so all parallel runs in a shared
// corridor shift together). Implemented here on a best-effort basis:
// runs that are clearly "alone in a corridor" stay put; runs whose
// neighbouring obstacles allow centering are centered.
export function relaxWirePathsForAesthetics(layer) {
  const buffer = layer.componentBuffer;
  const childBoxes = layer.children.map((c) => ({ id: c.id, ...boxOfChild(c) }));
  // Anchor x-set and y-set: only the coords of TRUE anchor nodes —
  // external terminals (parent connects here) and absorbed terminals
  // (terminating on a child's body). Junction nodes like `Q_branch`,
  // `EN_bus_GS` are just named intermediate corners — they can move
  // with the wires that pass through them, so their coords are NOT
  // pinned.
  const anchorNames = collectAnchorNames(layer);
  const anchorXs = new Set();
  const anchorYs = new Set();
  for (const [name, pt] of layer.allNodes) {
    if (!anchorNames.has(name)) continue;
    anchorXs.add(round(pt.x));
    anchorYs.add(round(pt.y));
  }

  // PASS A — buffer enforcement: push individual vias away from foreign
  // children when they're closer than `buffer`. Only shift vias whose
  // adjacent polyline segments remain axis-aligned after the shift —
  // a corner via cannot move without breaking one of its perpendicular
  // segments into a diagonal, so we leave it alone (the check rule
  // surfaces any remaining violation for the human to address).
  for (const wire of layer.wires) {
    const fromPt = layer.allNodes.get(wire.from);
    const toPt = layer.allNodes.get(wire.to);
    if (!fromPt || !toPt) continue;
    for (let i = 0; i < wire.via.length; i++) {
      const prev = i === 0 ? fromPt : wire.via[i - 1];
      const next = i === wire.via.length - 1 ? toPt : wire.via[i + 1];
      const shifted = relaxViaAwayFromChildren(
        wire.via[i], prev, next, childBoxes, buffer, layer.bounds,
      );
      if (shifted) wire.via[i] = shifted;
    }
  }

  // PASS B — even-spacing: when MULTIPLE parallel wire lanes share a
  // corridor between the same pair of obstacles, redistribute them so
  // the gaps between adjacent lanes (and between the edge lanes and
  // the bounding obstacles) are all equal. This is the "if constrained
  // then evenly space" rule.
  evenSpaceParallelLanes(layer, childBoxes, anchorXs, anchorYs);

  // PASS C — collinear-corner smoothing: remove any via whose prev and
  // next are colinear with itself (3 points on the same line). The
  // middle point is redundant and only contributes visual "jitter".
  // Safe by construction: removing it doesn't change the polyline's
  // shape, only its node count.
  for (const wire of layer.wires) {
    const fromPt = layer.allNodes.get(wire.from);
    const toPt = layer.allNodes.get(wire.to);
    if (!fromPt || !toPt) continue;
    wire.via = removeCollinearCorners([fromPt, ...wire.via, toPt]).slice(1, -1);
  }

  // PASS D — zig-zag → L-shape simplification. A 4-point polyline
  // (p0,p1,p2,p3) where p1 and p2 are intermediate vias forming H-V-H
  // or V-H-V can often collapse to a single bend (one via). Try every
  // candidate (direct line if endpoints share an axis; L-shape with
  // bend at either p0's axis or p3's axis), and use the first that
  // doesn't cross any foreign child's interior or graze an edge too
  // long.
  //
  // Wires that explicitly reference NAMED junction nodes (e.g.
  // `Q_branch`, `EN_bus_GS`) are LEFT ALONE — those junctions are the
  // author's intentional wraparound design and shouldn't be collapsed.
  const junctionCoords = [];
  for (const [name, pt] of layer.allNodes) {
    if (anchorNames.has(name)) continue;
    if (layer.children.some((c) => c.id === name)) continue;
    junctionCoords.push(pt);
  }
  for (const wire of layer.wires) {
    const fromPt = layer.allNodes.get(wire.from);
    const toPt = layer.allNodes.get(wire.to);
    if (!fromPt || !toPt) continue;
    const usesJunction = wire.via.some((v) =>
      junctionCoords.some((j) =>
        Math.abs(j.x - v.x) < 1e-3 && Math.abs(j.y - v.y) < 1e-3));
    if (usesJunction) continue;
    simplifyZShapes(wire, fromPt, toPt, childBoxes, buffer, layer.bounds);
  }
}

// Walk a polyline and drop any vertex whose two neighbors are colinear
// with it (same x or same y for all three points within EPS_AXIS).
// First and last points (anchors) are preserved.
function removeCollinearCorners(pts) {
  const EPS_COL = 1e-3;
  const out = [pts[0]];
  for (let i = 1; i + 1 < pts.length; i++) {
    const a = out[out.length - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const sameX = Math.abs(a.x - b.x) < EPS_COL && Math.abs(b.x - c.x) < EPS_COL;
    const sameY = Math.abs(a.y - b.y) < EPS_COL && Math.abs(b.y - c.y) < EPS_COL;
    if (sameX || sameY) continue;  // b is redundant
    out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Test whether a segment crosses the strictly-interior of an
// axis-aligned box. Mirror of check.mjs's logic so the relaxation can
// reason about obstacles. Returns true iff at least one point strictly
// inside the box lies on the segment.
function segmentCrossesBoxInterior(p1, p2, box) {
  const EPS = 1e-6;
  if (Math.abs(p1.x - p2.x) < EPS) {
    if (p1.x <= box.left + EPS || p1.x >= box.right - EPS) return false;
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    return Math.min(yMax, box.top) - Math.max(yMin, box.bottom) > EPS;
  }
  if (Math.abs(p1.y - p2.y) < EPS) {
    if (p1.y <= box.bottom + EPS || p1.y >= box.top - EPS) return false;
    const xMin = Math.min(p1.x, p2.x);
    const xMax = Math.max(p1.x, p2.x);
    return Math.min(xMax, box.right) - Math.max(xMin, box.left) > EPS;
  }
  return false;  // diagonal — should not exist after relaxation
}

// Which child (if any) owns the given point — i.e. which child's box
// the point lies on the boundary of or inside. Used by the simplifier
// to know which children the wire is connecting (so the new path is
// allowed to graze those boxes' edges, just not foreign-child interiors).
function pointOnChild(pt, childBoxes) {
  const EPS = 1e-3;
  for (const cb of childBoxes) {
    if (pt.x >= cb.left - EPS && pt.x <= cb.right + EPS &&
        pt.y >= cb.bottom - EPS && pt.y <= cb.top + EPS) {
      return cb;
    }
  }
  return null;
}

// PASS D worker: walk a single wire's polyline and try to collapse
// every (p0,p1,p2,p3) Z-pattern into the smallest equivalent path
// (direct line if endpoints share an axis; L-shape with one bend
// otherwise). Iterates until no further simplification fires.
//
// A candidate is REJECTED when its path either:
//   • crosses a foreign child's interior (would be picked up by
//     check.mjs anyway, but we pre-empt it here so the user-visible
//     SVG never contains the broken path);
//   • runs ALONG any child's edge for more than `grazeThreshold` —
//     this is the rule that prevents the cross-coupled feedback
//     wires (whose endpoints share an x at the NAND's right edge)
//     from collapsing to a straight vertical that hugs the box.
function simplifyZShapes(wire, fromPt, toPt, childBoxes, componentBuffer, sceneBounds) {
  // Single buffer for both child-edge and scene-edge grazing. Matches
  // the check.mjs threshold so the simplifier never picks a candidate
  // that the checker would later flag.
  const grazeThreshold = componentBuffer;
  const sceneEdgeThreshold = componentBuffer;

  let changed = true;
  let safety = 16;
  while (changed && safety-- > 0) {
    changed = false;
    const pts = [fromPt, ...wire.via, toPt];
    for (let i = 0; i + 3 < pts.length; i++) {
      if (i + 1 >= wire.via.length) break;
      const p0 = pts[i], p3 = pts[i + 3];

      // Candidate simpler paths (ordered: fewer vias first).
      const candidates = [];
      const EPS_AX = 1e-3;
      if (Math.abs(p0.y - p3.y) < EPS_AX) candidates.push([]);
      if (Math.abs(p0.x - p3.x) < EPS_AX) candidates.push([]);
      candidates.push([{ x: p3.x, y: p0.y }]);                   // L-A
      candidates.push([{ x: p0.x, y: p3.y }]);                   // L-B

      for (const candVias of candidates) {
        const candPath = [p0, ...candVias, p3];
        let clear = true;
        for (let j = 0; j + 1 < candPath.length; j++) {
          const a = candPath[j], b = candPath[j + 1];
          for (const cb of childBoxes) {
            if (segmentCrossesBoxInterior(a, b, cb)) { clear = false; break; }
            if (segmentGrazesBoxEdgeForLength(a, b, cb) > grazeThreshold) {
              clear = false; break;
            }
          }
          if (!clear) break;
          if (sceneBounds && sceneEdgeGrazeLength(a, b, sceneBounds) > sceneEdgeThreshold) {
            clear = false; break;
          }
        }
        if (clear) {
          wire.via.splice(i, 2, ...candVias);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
}

// Max length over which an axis-aligned segment runs along any of the
// scene's outer boundary edges. Mirror of check.mjs sceneEdgeGrazes.
function sceneEdgeGrazeLength(p1, p2, bounds) {
  const EPS = 1e-6;
  const horiz = Math.abs(p1.y - p2.y) < EPS;
  const vert = Math.abs(p1.x - p2.x) < EPS;
  if (horiz) {
    if (Math.abs(p1.y - bounds.minY) < EPS || Math.abs(p1.y - bounds.maxY) < EPS) {
      return Math.abs(p2.x - p1.x);
    }
  }
  if (vert) {
    if (Math.abs(p1.x - bounds.minX) < EPS || Math.abs(p1.x - bounds.maxX) < EPS) {
      return Math.abs(p2.y - p1.y);
    }
  }
  return 0;
}

// Length over which an axis-aligned segment runs colinear with one of
// a box's four edges. Mirror of check.mjs's logic, exposed here so the
// simplifier can pre-empt grazing violations.
function segmentGrazesBoxEdgeForLength(p1, p2, box) {
  const EPS = 1e-6;
  const horiz = Math.abs(p1.y - p2.y) < EPS;
  const vert = Math.abs(p1.x - p2.x) < EPS;
  if (horiz) {
    const onTop = Math.abs(p1.y - box.top) < EPS;
    const onBot = Math.abs(p1.y - box.bottom) < EPS;
    if (!onTop && !onBot) return 0;
    const xMin = Math.min(p1.x, p2.x);
    const xMax = Math.max(p1.x, p2.x);
    return Math.max(0, Math.min(xMax, box.right) - Math.max(xMin, box.left));
  }
  if (vert) {
    const onLeft = Math.abs(p1.x - box.left) < EPS;
    const onRight = Math.abs(p1.x - box.right) < EPS;
    if (!onLeft && !onRight) return 0;
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    return Math.max(0, Math.min(yMax, box.top) - Math.max(yMin, box.bottom));
  }
  return 0;
}

// Detect groups of parallel wire lanes that share an obstacle-bounded
// corridor, and redistribute their coords evenly across the corridor.
//
// A "lane" is a pair (or longer chain) of consecutive vias whose shared
// coord makes the segment between them axis-aligned along the corridor.
// Vias on the lane must be FREE on that axis — neither pinned to a
// named anchor coord. Anchored endpoints of the wire are never moved.
function evenSpaceParallelLanes(layer, childBoxes, anchorXs, anchorYs) {
  const lanesByAxis = { vertical: [], horizontal: [] };
  for (let wi = 0; wi < layer.wires.length; wi++) {
    const wire = layer.wires[wi];
    for (let i = 0; i + 1 < wire.via.length; i++) {
      const a = wire.via[i];
      const b = wire.via[i + 1];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const SAME = 1e-6;
      if (dx < SAME && dy >= SAME) {
        if (anchorXs.has(round(a.x))) continue;
        lanesByAxis.vertical.push({
          wire, wireIdx: wi, viaIndices: [i, i + 1],
          coord: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y),
        });
      } else if (dy < SAME && dx >= SAME) {
        if (anchorYs.has(round(a.y))) continue;
        lanesByAxis.horizontal.push({
          wire, wireIdx: wi, viaIndices: [i, i + 1],
          coord: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x),
        });
      }
    }
  }
  redistributeLanesInCorridors(lanesByAxis.vertical, 'vertical', layer, childBoxes);
  redistributeLanesInCorridors(lanesByAxis.horizontal, 'horizontal', layer, childBoxes);
}

function redistributeLanesInCorridors(lanes, axis, layer, childBoxes) {
  if (lanes.length < 2) return;

  // Merge lanes that share the same coord into a single "track". Two
  // separate wires both intentionally drawn at, say, x=5.5 (e.g. the
  // top NAND's Q-out segment and the bottom NAND's Q̄-out segment)
  // were aligned by design — they should stay aligned after
  // redistribution. A track collects every via on the same coord and
  // moves them together.
  const trackMap = new Map();
  for (const lane of lanes) {
    const key = round(lane.coord);
    if (!trackMap.has(key)) {
      trackMap.set(key, { coord: lane.coord, lo: lane.lo, hi: lane.hi, members: [] });
    }
    const t = trackMap.get(key);
    t.lo = Math.min(t.lo, lane.lo);
    t.hi = Math.max(t.hi, lane.hi);
    t.members.push(lane);
  }
  const tracks = Array.from(trackMap.values()).sort((a, b) => a.coord - b.coord);

  // Group tracks into corridors: tracks whose y-ranges overlap AND
  // whose bounding obstacles match.
  const corridors = [];
  for (const track of tracks) {
    const obs = obstacleBoundsForLane(track, childBoxes, layer.bounds, axis);
    let added = false;
    for (const c of corridors) {
      // A track joins if it overlaps with ANY existing track in the
      // corridor (not just the last one) AND shares the same obstacle
      // bounds. This catches the "Q output sharing a column with Q̄
      // output" case where the two short tracks don't overlap each
      // other but both overlap with the long cross-coupled feedback.
      const yOverlap = c.tracks.some((t) =>
        Math.min(t.hi, track.hi) - Math.max(t.lo, track.lo) > 0);
      const sameLeftBound = Math.abs(c.obs.lo - obs.lo) < layer.componentBuffer * 1.5;
      const sameRightBound = Math.abs(c.obs.hi - obs.hi) < layer.componentBuffer * 1.5;
      if (yOverlap && sameLeftBound && sameRightBound) {
        c.tracks.push(track);
        c.obs.lo = Math.max(c.obs.lo, obs.lo);
        c.obs.hi = Math.min(c.obs.hi, obs.hi);
        added = true;
        break;
      }
    }
    if (!added) corridors.push({ tracks: [track], obs: { ...obs } });
  }

  // For each corridor with ≥2 tracks, distribute evenly. But only if
  // the corridor is REALLY constrained — at least one of the bounds
  // must come from a child's edge (not just the scene boundary).
  // Otherwise the lanes are free in space and shouldn't be forced to
  // share a "corridor" they don't compete for.
  const EPS_BOUND = 1e-3;
  const sceneMin = axis === 'vertical' ? layer.bounds.minX : layer.bounds.minY;
  const sceneMax = axis === 'vertical' ? layer.bounds.maxX : layer.bounds.maxY;
  for (const c of corridors) {
    if (c.tracks.length < 2) continue;
    const loIsScene = Math.abs(c.obs.lo - sceneMin) < EPS_BOUND;
    const hiIsScene = Math.abs(c.obs.hi - sceneMax) < EPS_BOUND;
    if (loIsScene && hiIsScene) continue;  // no real constraint
    const n = c.tracks.length;
    const span = c.obs.hi - c.obs.lo;
    if (span <= 0) continue;
    const gap = span / (n + 1);
    if (gap < layer.componentBuffer * 0.7) continue;
    for (let i = 0; i < n; i++) {
      const newCoord = c.obs.lo + gap * (i + 1);
      const track = c.tracks[i];
      for (const lane of track.members) {
        for (const viaIdx of lane.viaIndices) {
          const via = lane.wire.via[viaIdx];
          if (axis === 'vertical') via.x = newCoord;
          else                      via.y = newCoord;
        }
        lane.coord = newCoord;
      }
      track.coord = newCoord;
    }
  }
}

// For a single vertical lane (coord = x, perpendicular range [lo, hi]
// = y-range), find the nearest child to its LEFT and RIGHT whose y
// range overlaps the lane's y range. Returns the corridor bounds
// [lo, hi] in x: from the rightmost-left-child's right edge to the
// leftmost-right-child's left edge (clamped to scene bounds).
// Horizontal lanes symmetric with y/x swap.
function obstacleBoundsForLane(lane, childBoxes, sceneBounds, axis) {
  let lo, hi;
  if (axis === 'vertical') {
    lo = sceneBounds.minX; hi = sceneBounds.maxX;
    for (const cb of childBoxes) {
      const yOverlap = Math.min(cb.top, lane.hi) - Math.max(cb.bottom, lane.lo);
      if (yOverlap <= 0) continue;
      if (cb.right <= lane.coord && cb.right > lo) lo = cb.right;
      if (cb.left  >= lane.coord && cb.left  < hi) hi = cb.left;
    }
  } else {
    lo = sceneBounds.minY; hi = sceneBounds.maxY;
    for (const cb of childBoxes) {
      const xOverlap = Math.min(cb.right, lane.hi) - Math.max(cb.left, lane.lo);
      if (xOverlap <= 0) continue;
      if (cb.top    <= lane.coord && cb.top    > lo) lo = cb.top;
      if (cb.bottom >= lane.coord && cb.bottom < hi) hi = cb.bottom;
    }
  }
  return { lo, hi };
}

function round(n) { return Math.round(n * 1e6) / 1e6; }

// Identify the set of TRUE-ANCHOR node names — those whose coords are
// pinned by design and must not be relaxed away from. Includes:
//   • Every external-terminal key (parent connection point).
//   • Every absorbed-terminal name declared in the markdown's
//     "Absorbed-terminal coords" table OR derived from the
//     embedded-children mapping. These are the points where a wire
//     physically meets a child's body.
// Everything else in `layer.allNodes` (junction nodes, bus taps,
// wraparound corners) is just a named intermediate via — free to
// move with the wires that pass through it.
function collectAnchorNames(layer) {
  const names = new Set();
  for (const e of layer.ext) names.add(e.key);
  // Auto-derived absorbed terminals from the embedded-children mapping.
  for (const name of deriveAbsorbedTerminals(layer).keys()) names.add(name);
  // Hardcoded absorbed terminals from the layer's table (parse keys
  // out of the markdown's "Absorbed-terminal coords" section).
  const sec = (layer.sections || {})['Absorbed-terminal coords'] || '';
  for (const line of sec.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = splitRow(line);
    const k = cells[0];
    if (!k || k === 'absorbed key' || /^[-:]+$/.test(k)) continue;
    names.add(k);
  }
  return names;
}

function boxOfChild(c) {
  return {
    left: c.cx - c.w / 2,
    right: c.cx + c.w / 2,
    bottom: c.cy - c.h / 2,
    top: c.cy + c.h / 2,
  };
}

// Push a via away from any foreign child within `buffer`. Only shifts
// when the resulting via keeps BOTH adjacent polyline segments
// axis-aligned (a corner via — perpendicular adjacent segments —
// cannot move on either axis without making one segment diagonal, so
// it's left alone). The check rule surfaces any remaining buffer
// violation for the human to resolve by moving components apart.
function relaxViaAwayFromChildren(via, prev, next, childBoxes, buffer, sceneBounds) {
  let worst = null;
  for (const cb of childBoxes) {
    const d = distancePointToBox(via, cb);
    if (d > 0 && d < buffer && (!worst || d < worst.d)) worst = { d, cb };
  }
  if (!worst) return null;

  const EPS = 1e-6;
  // A shift on axis A is safe iff both adjacent segments LIE ON the
  // OTHER axis at via's coord — that is, prev/next share via's coord on
  // axis A. If prev shares via.x (vertical segment), shifting via.x
  // breaks that vertical. So x-shift is safe only when prev.x ≠ via.x
  // for both prev and next (i.e., both segments are horizontal at
  // via.y).
  const prevHoriz = !prev || Math.abs(prev.y - via.y) < EPS;
  const nextHoriz = !next || Math.abs(next.y - via.y) < EPS;
  const prevVert  = !prev || Math.abs(prev.x - via.x) < EPS;
  const nextVert  = !next || Math.abs(next.x - via.x) < EPS;
  const canShiftX = prevHoriz && nextHoriz;
  const canShiftY = prevVert && nextVert;
  if (!canShiftX && !canShiftY) return null;  // corner via — can't shift

  const cb = worst.cb;
  const padX = Math.max(cb.left - via.x, 0, via.x - cb.right);
  const padY = Math.max(cb.bottom - via.y, 0, via.y - cb.top);
  const eps = buffer * 1.01;
  let newX = via.x, newY = via.y;

  const preferX = canShiftX && (!canShiftY || padX <= padY) && padX > 0;
  const preferY = canShiftY && !preferX && padY > 0;
  if (preferX) {
    if (via.x < cb.left) newX = cb.left - eps;
    else                 newX = cb.right + eps;
  } else if (preferY) {
    if (via.y < cb.bottom) newY = cb.bottom - eps;
    else                   newY = cb.top + eps;
  } else {
    return null;
  }

  newX = Math.max(sceneBounds.minX, Math.min(sceneBounds.maxX, newX));
  newY = Math.max(sceneBounds.minY, Math.min(sceneBounds.maxY, newY));
  return { x: newX, y: newY };
}

// Distance from a point to a box (0 if inside or on boundary).
function distancePointToBox(p, box) {
  const dx = Math.max(box.left - p.x, 0, p.x - box.right);
  const dy = Math.max(box.bottom - p.y, 0, p.y - box.top);
  return Math.sqrt(dx * dx + dy * dy);
}

// Distance from an axis-aligned (or diagonal) segment to a box.
// Used by check.mjs's buffer rule. For axis-aligned segments the
// answer is exact; diagonals are sampled along the parametric line.
export function distanceSegmentToBox(p1, p2, box) {
  const EPS = 1e-9;
  const vert = Math.abs(p1.x - p2.x) < EPS;
  const horiz = Math.abs(p1.y - p2.y) < EPS;
  if (vert) {
    const dx = Math.max(box.left - p1.x, 0, p1.x - box.right);
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    const dy = Math.max(box.bottom - yMax, 0, yMin - box.top);
    return Math.sqrt(dx * dx + dy * dy);
  }
  if (horiz) {
    const dy = Math.max(box.bottom - p1.y, 0, p1.y - box.top);
    const xMin = Math.min(p1.x, p2.x);
    const xMax = Math.max(p1.x, p2.x);
    const dx = Math.max(box.left - xMax, 0, xMin - box.right);
    return Math.sqrt(dx * dx + dy * dy);
  }
  // Diagonal — sample.
  let m = Infinity;
  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    m = Math.min(m, distancePointToBox({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    }, box));
  }
  return m;
}

// Build the list of all polyline segments in the layer: explicit wires
// from the Wires table + auto-routed Vdd/GND drops/risers. Each segment is
// {p1, p2, label, kind, owners} where `owners` lists the children whose
// terminals coincide with each endpoint (null if no child owns it).
export function collectAllSegments(layer) {
  const segs = [];
  const terminalsByChild = buildTerminalsByChild(layer);

  for (const w of layer.wires) {
    const fromNode = layer.allNodes.get(w.from);
    const toNode = layer.allNodes.get(w.to);
    if (!fromNode || !toNode) continue;
    const pts = [fromNode, ...w.via, toNode];
    // Wire-level owners: every child whose declared terminal coincides with
    // ANY of the wire's polyline points (endpoints OR via). A via at a
    // named absorbed terminal is the explicit way to say "this wire is
    // allowed to pass through that child's body".
    const wireOwners = new Set();
    for (const pt of pts) {
      const o = ownerOf(pt, terminalsByChild);
      if (o) wireOwners.add(o);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      segs.push({
        p1: pts[i],
        p2: pts[i + 1],
        label: 'wire ' + w.from + ' → ' + w.to + ' [' + i + ']',
        kind: 'wire',
        net: w.net || '',
        owners: [...wireOwners],
      });
    }
  }

  for (const route of layer.supplyRoutes) {
    for (let i = 0; i < route.pts.length - 1; i++) {
      const isLast = i === route.pts.length - 2;
      segs.push({
        p1: { x: route.pts[i][0], y: route.pts[i][1] },
        p2: { x: route.pts[i + 1][0], y: route.pts[i + 1][1] },
        label: 'auto-' + route.kind + ' → ' + route.childId + ' [' + i + ']',
        kind: 'auto-' + route.kind,
        net: route.kind,
        owners: [isLast ? route.childId : null],
      });
    }
  }

  return segs;
}

function buildTerminalsByChild(layer) {
  // Map child id → list of {name, x, y} for all named nodes that "belong"
  // to that child. Heuristic: the node name starts with the child id with
  // underscores stripped (matches "P_A" → "PA_*", "N1" → "N1_*", etc.).
  const map = new Map();
  for (const c of layer.children) map.set(c.id, []);
  for (const [name, pt] of layer.allNodes) {
    for (const c of layer.children) {
      const idCompact = c.id.replace(/_/g, '');
      if (name.startsWith(idCompact + '_') || name === idCompact) {
        map.get(c.id).push({ name, x: pt.x, y: pt.y });
        break;
      }
    }
  }
  return map;
}

function ownerOf(point, terminalsByChild) {
  const EPS = 1e-6;
  for (const [childId, terms] of terminalsByChild) {
    for (const t of terms) {
      if (Math.abs(t.x - point.x) < EPS && Math.abs(t.y - point.y) < EPS) {
        return childId;
      }
    }
  }
  return null;
}

function computeSupplyRoutes(_ext, _children, _bounds) {
  // Auto-supply routes (Vdd/GND drops per child) are disabled by design:
  // each child must EXPOSE ONLY the terminals that an explicit wire in
  // the parent's Wires table connects to (per the "expose nothing
  // else" contract enforced by `check.mjs` rule 7). The supply RAILS
  // along the top (Vdd) and bottom (GND) of the scene are still drawn
  // — power distribution is implicit, with each child sitting between
  // the two rails.
  return [];
}

// Pick the supply route from parent rail (`parentY`) into the child's
// top/bottom edge at column x=`cx`. If the direct vertical line crosses
// another child's bbox, detour via a side bus (left for Vdd, right for
// GND) using a Z-staircase: down the bus, horizontally THROUGH A CLEAR
// LANE in the gap between the vertical-direction blocker and the target,
// then a perpendicular drop into the child's edge.
//
// The "clear lane" choice avoids any *other* child whose x-range overlaps
// the horizontal bus path — so the lane never cuts through some
// unrelated sibling sitting in the middle of the parent.
export function computeSupplyRoute(cx, parentY, childEdgeY, child, allChildren, bounds, side, inset, buffer) {
  const EPS = 1e-6;
  // Kind-stagger: shift the drop column slightly left for Vdd routes and
  // slightly right for GND routes. Without this, when a child has Vdd
  // dropping in from above and a SIBLING (sharing cx) has GND rising from
  // below, both final vertical drops collide at the same x.
  // `buffer` falls back to a small fraction of the scene size if the
  // caller didn't pass one — keeps backward compat with legacy callers.
  if (buffer == null) buffer = componentBufferFromBounds(bounds);
  const stagger = buffer * 0.65;
  const dropX = cx + (side === 'top' ? -stagger : stagger);

  const segMin = Math.min(parentY, childEdgeY);
  const segMax = Math.max(parentY, childEdgeY);
  // Blocker detection uses dropX (the actual column the route will use),
  // not cx — otherwise a stagger that nudges the route into a previously-
  // excluded sibling box gets missed.
  const verticalBlockers = allChildren.filter((other) => {
    if (other === child) return false;
    const oL = other.cx - other.w / 2;
    const oR = other.cx + other.w / 2;
    const oT = other.cy + other.h / 2;
    const oB = other.cy - other.h / 2;
    if (dropX <= oL || dropX >= oR) return false;
    if (segMax <= oB || segMin >= oT) return false;
    return true;
  });

  if (verticalBlockers.length === 0) return [[dropX, parentY], [dropX, childEdgeY]];

  const busX = side === 'top' ? bounds.minX + inset : bounds.maxX - inset;
  // Candidate y-range for the horizontal lane: between the closest
  // vertical blocker and the target child's edge.
  let candLow, candHigh;
  if (side === 'top') {
    const lowestBlockerBottom = Math.min(...verticalBlockers.map((b) => b.cy - b.h / 2));
    candLow = childEdgeY;
    candHigh = lowestBlockerBottom;
  } else {
    const highestBlockerTop = Math.max(...verticalBlockers.map((b) => b.cy + b.h / 2));
    candLow = highestBlockerTop;
    candHigh = childEdgeY;
  }

  // Children whose x-range overlaps the horizontal segment AND whose
  // y-range falls inside the candidate band: they forbid that y.
  const horizMin = Math.min(busX, cx);
  const horizMax = Math.max(busX, cx);
  const forbidden = [];
  for (const other of allChildren) {
    if (other === child) continue;
    const oL = other.cx - other.w / 2;
    const oR = other.cx + other.w / 2;
    if (oR <= horizMin + EPS || oL >= horizMax - EPS) continue;
    const oT = other.cy + other.h / 2;
    const oB = other.cy - other.h / 2;
    if (oT <= candLow + EPS || oB >= candHigh - EPS) continue;
    forbidden.push([Math.max(oB, candLow), Math.min(oT, candHigh)]);
  }

  // Compute free intervals inside [candLow, candHigh] not covered by any
  // forbidden y-range. Then pick a side-preferred lane: for Vdd (top side)
  // we prefer the highest free lane (the route stays near the top rail);
  // for GND (bottom side) we prefer the lowest. This naturally separates
  // Vdd routes from GND routes vertically so they don't share a lane.
  forbidden.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [lo, hi] of forbidden) {
    if (merged.length && merged[merged.length - 1][1] >= lo - EPS) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], hi);
    } else {
      merged.push([lo, hi]);
    }
  }
  const gaps = [];
  let cursor = candLow;
  for (const [lo, hi] of merged) {
    if (lo > cursor + EPS) gaps.push([cursor, lo]);
    cursor = Math.max(cursor, hi);
  }
  if (cursor < candHigh - EPS) gaps.push([cursor, candHigh]);

  let approachY;
  if (gaps.length === 0) {
    approachY = (candLow + candHigh) / 2;
  } else {
    // Side preference: top → highest hi first, bottom → lowest lo first.
    gaps.sort((a, b) => side === 'top' ? b[1] - a[1] : a[0] - b[0]);
    const [gLo, gHi] = gaps[0];
    const gapLen = gHi - gLo;
    if (gapLen >= 2 * buffer) {
      // Room for full buffer + breathing — bias to the preferred edge
      // so neighbouring routes can fit alongside without forcing
      // everyone to the center.
      approachY = side === 'top' ? gHi - buffer : gLo + buffer;
    } else {
      // Tight corridor — center the lane so the distance to the two
      // bounding obstacles is equal (the "constrained → evenly space"
      // rule the user asked for).
      approachY = (gLo + gHi) / 2;
    }
  }

  return [
    [busX, parentY],
    [busX, approachY],
    [dropX, approachY],
    [dropX, childEdgeY],
  ];
}

// ─── Parsing helpers ────────────────────────────────────────────────────

export function splitSections(src) {
  const sections = {};
  const lines = src.split('\n');
  let cur = null;
  let buf = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (cur) sections[cur] = buf.join('\n');
      cur = m[1];
      buf = [];
    } else if (cur) {
      buf.push(line);
    }
  }
  if (cur) sections[cur] = buf.join('\n');
  return sections;
}

export function parseBounds(text) {
  const m = text.match(
    /x\s*∈\s*\[\s*([\-\d.]+)\s*,\s*([\-\d.]+)\s*\][\s\S]*?y\s*∈\s*\[\s*([\-\d.]+)\s*,\s*([\-\d.]+)\s*\]/,
  );
  if (!m) return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
  return { minX: +m[1], maxX: +m[2], minY: +m[3], maxY: +m[4] };
}

export function splitRow(line) {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map((s) => s.trim());
}

export function parseTable(text) {
  const lines = text.split('\n');
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith('|')) {
      if (start < 0) start = i;
      end = i;
    } else if (start >= 0 && t === '') {
      break;
    }
  }
  if (start < 0) return [];
  const rows = lines.slice(start, end + 1).map(splitRow);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(2).map((cells) => {
    const r = {};
    headers.forEach((h, i) => { r[h] = cells[i] || ''; });
    return r;
  });
}

export function parseXY(s) {
  const m = String(s || '').match(/\(\s*([\-\d.]+)\s*,\s*([\-\d.]+)\s*\)/);
  if (!m) return null;
  return { x: +m[1], y: +m[2] };
}

export function parseWH(s) {
  const m = String(s || '').match(/([\-\d.]+)\s*[×x]\s*([\-\d.]+)/);
  if (!m) return null;
  return { w: +m[1], h: +m[2] };
}

export function parseExternalTerminals(text) {
  return parseTable(text)
    .map((r) => {
      const xy = parseXY(r['(x, y)']);
      if (!xy) return null;
      return { key: r['key'], role: r['role'] || '', x: xy.x, y: xy.y, edge: r['edge'] || '' };
    })
    .filter((r) => r && r.key);
}

export function parseEmbeddedChildren(text) {
  const rows = parseTable(text);
  return rows
    .map((r) => {
      const id = r['child id'] || r['child_id'];
      const layer = r['child layer'] || r['child_layer'] || '';
      const c = parseXY(r['center (cx, cy)']);
      const wh = parseWH(r['box (w × h)']);
      if (!id || !c || !wh) return null;
      return { id, layer, cx: c.x, cy: c.y, w: wh.w, h: wh.h };
    })
    .filter(Boolean);
}

export function parseWires(text) {
  return parseTable(text)
    .map((r) => {
      const from = r['from'];
      const to = r['to'];
      if (!from || !to) return null;
      const via = [];
      const viaText = r['via'] || '';
      if (viaText && viaText !== '—') {
        const matches = [...viaText.matchAll(/\(\s*([\-\d.]+)\s*,\s*([\-\d.]+)\s*\)/g)];
        for (const m of matches) via.push({ x: +m[1], y: +m[2] });
      }
      return { from, to, via, net: r['net'] || '' };
    })
    .filter(Boolean);
}

export function findAllTables(src) {
  const lines = src.split('\n');
  const tables = [];
  let cur = [];
  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      cur.push(line);
    } else if (cur.length > 0) {
      tables.push(cur.join('\n'));
      cur = [];
    }
  }
  if (cur.length > 0) tables.push(cur.join('\n'));
  return tables;
}

export function buildNodeMap(src) {
  const map = new Map();
  for (const table of findAllTables(src)) {
    const rows = parseTable(table);
    if (rows.length === 0) continue;
    const headers = Object.keys(rows[0]);
    const xyCol = headers.find((h) => /\(\s*x\s*,\s*y\s*\)/.test(h));
    if (!xyCol) continue;
    const nameCol = headers[0];
    for (const r of rows) {
      const name = String(r[nameCol] || '').replace(/[`*]/g, '').trim();
      const xy = parseXY(r[xyCol]);
      if (name && xy && !map.has(name)) {
        map.set(name, { x: xy.x, y: xy.y });
      }
    }
  }
  const inlineRe = /`([A-Za-z_][\w\-]*)`\s*\(\s*([\-\d.]+)\s*,\s*([\-\d.]+)\s*\)/g;
  for (const m of src.matchAll(inlineRe)) {
    if (!map.has(m[1])) map.set(m[1], { x: +m[2], y: +m[3] });
  }
  return map;
}
