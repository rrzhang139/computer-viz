// Shared parsing + routing helpers for wire_sketches/{render,check}.mjs.
// Anything that both the SVG generator and the geometry checker need lives
// here so they can't drift apart.

import fs from 'node:fs';

export function loadLayer(mdPath) {
  const src = fs.readFileSync(mdPath, 'utf8');
  const sections = splitSections(src);
  const bounds = parseBounds(sections['Scene bounds'] || '');
  const ext = parseExternalTerminals(sections['External terminals'] || '');
  const children = parseEmbeddedChildren(sections['Embedded children'] || '');
  const allNodes = buildNodeMap(src);
  const wires = parseWires(sections['Wires'] || '');
  const supplyRoutes = computeSupplyRoutes(ext, children, bounds);
  const layer = { mdPath, src, sections, bounds, ext, children, allNodes, wires, supplyRoutes };
  // Auto-derive absorbed-terminal coords from the embedded-children
  // mappings. Every (child_id, child_terminal_key) pair listed in the
  // parent's "Embedded children" table is projected via the single
  // `projectChildTerminal` formula (base box corner + scaled offset
  // along the declared edge) — no parent ever computes these by hand.
  //
  // Hardcoded entries in the markdown's "Absorbed-terminal coords"
  // table TAKE PRECEDENCE — they're the escape hatch for non-canonical
  // placements (e.g. the dlatch's GS_T_in sits on the gate-mini's TOP
  // edge at a specific x, which the canonical "T" alias can't express).
  // Derived values fill in only the terminals the markdown didn't pin.
  const derived = deriveAbsorbedTerminals(layer);
  for (const [name, pt] of derived) {
    if (!allNodes.has(name)) allNodes.set(name, pt);
  }
  return layer;
}

// ─── Programmatic terminal offsets ──────────────────────────────────────
//
// Each child layer's external terminals are stored ONCE here as normalized
// edge offsets. A "fraction" runs 0→1 from the canonical corner along the
// declared edge:
//   LEFT / RIGHT  edges: frac = (sceneMaxY - terminalY) / sceneH
//                          (0 = top of edge, 1 = bottom)
//   TOP / BOTTOM  edges: frac = (terminalX - sceneMinX) / sceneW
//                          (0 = left, 1 = right)
//
// Every parent that embeds the child reuses these. To place the absorbed
// terminal in parent coords:
//
//   base    = the box corner this edge belongs to
//   offset  = frac × box_dim  along the edge
//
// That's `projectChildTerminal` below — the single source of truth. No
// other file computes absorbed coords; hand-written numbers in the
// markdown are overridden at load time.
//
// Adding a new child layer? Append an entry here keyed by the layer's
// short name (e.g. 'register', 'mux'). Adding a new alias name a parent
// uses for an existing terminal (like layer 3 calling gate's A_input
// just "A")? Add the alias inside the existing layer's block.

// Canvas aspect ratio (w / h) for each child layer. When a parent
// embeds the child as a box, the box's w:h SHOULD match the child's
// canvas aspect — that way, when the user clicks the box and zooms
// into the child layer, the visible viewport stays proportionally
// consistent (no "the thing I clicked is wide but the room I landed
// in is square" jarring transition).
//
// Source values come directly from each layer's "Scene bounds" header;
// adding a new layer means adding one line here.
export const CHILD_LAYER_CANVAS_ASPECT = {
  transistor: 2 / 2,    // layer 0: x ∈ [-1, 1], y ∈ [-1, 1]
  gate:       10 / 7,   // layer 1: x ∈ [-5, 5], y ∈ [-3.5, 3.5]
  latch:      12 / 7,   // layer 2: x ∈ [-6, 6], y ∈ [-3.5, 3.5]
  dlatch:     12 / 8,   // layer 3: x ∈ [-6, 6], y ∈ [-4, 4]
};

// Return the canvas aspect of the child's layer, or null when the
// child layer is not in the registry (e.g. inverter sub-gates).
export function childCanvasAspect(child) {
  const key = childLayerKey(child);
  if (!key) return null;
  return CHILD_LAYER_CANVAS_ASPECT[key] ?? null;
}

export const CHILD_LAYER_TERMINAL_OFFSETS = {
  // (Layer 0 — transistor — is intentionally absent. Transistors are
  // leaf physical objects whose source/drain wire ends sit INSIDE the
  // body (the semiconductor "absorbs" them), not on the box boundary.
  // Their absorbed-terminal coords stay in the markdown table and are
  // not overridden here.)
  //
  // Layer 1 — NAND gate. Bounds y ∈ [-3.5, 3.5] (h=7).
  //   A_input at world (-4,  1.5)  → LEFT edge,  yFrac = (3.5 − 1.5)/7
  //   B_input at world ( 4,  1.5)  → RIGHT edge, yFrac = same
  //   Y_out   at world ( 3,  0.5)  → RIGHT edge, yFrac = (3.5 − 0.5)/7
  // Aliases A / B / Y / T (for "TOP-input" gating use): see layer 3.
  gate: {
    A_input: { edge: 'LEFT',  frac: 2 / 7 },
    B_input: { edge: 'RIGHT', frac: 2 / 7 },
    Y_out:   { edge: 'RIGHT', frac: 3 / 7 },
    // Single-letter aliases used in layer 3's concatenated-text format.
    A: { edge: 'LEFT',  frac: 2 / 7 },
    B: { edge: 'RIGHT', frac: 2 / 7 },
    Y: { edge: 'RIGHT', frac: 3 / 7 },
    // "T" is a parent-level fiction: the dlatch's gating NANDs (GS, GR)
    // re-purpose the canonical gate as a 2-input NAND with one input on
    // the TOP edge (EN). The gate layer has no native TOP data terminal,
    // so the parent declares this offset locally. We place it at xFrac
    // 0.5 (TOP edge center) — overridable by the parent if needed.
    T: { edge: 'TOP', frac: 0.5 },
  },
  // Layer 2 — SR latch. Bounds y ∈ [-3.5, 3.5] (h=7).
  latch: {
    S_in:   { edge: 'LEFT',  frac: 1.5 / 7 },  // y = 2.0
    R_in:   { edge: 'LEFT',  frac: 5.5 / 7 },  // y = -2.0
    Q_out:  { edge: 'RIGHT', frac: 2 / 7 },    // y = 1.5
    QB_out: { edge: 'RIGHT', frac: 5 / 7 },    // y = -1.5
  },
  // Layer 3 — D latch. Bounds y ∈ [-4, 4] (h=8), x ∈ [-6, 6] (w=12).
  dlatch: {
    D_in:   { edge: 'LEFT',  frac: 0.5 },        // y = 0
    EN_in:  { edge: 'TOP',   frac: 4.5 / 12 },   // x = -1.5
    Q_out:  { edge: 'RIGHT', frac: 2.5 / 8 },    // y = 1.5
    QB_out: { edge: 'RIGHT', frac: 5.5 / 8 },    // y = -1.5
  },
};

// Resolve a child's free-text layer descriptor (e.g. "gate (NAND)",
// "inverter") to the short key used in CHILD_LAYER_TERMINAL_OFFSETS.
// Returns null when the child has no canonical offset table (the
// markdown's absorbed-terminals section is then the authority).
export function childLayerKey(child) {
  const s = String(child.layer || '').trim().toLowerCase();
  // Transistors are exempt — their absorbed coords are physically
  // INSIDE the body and stay hardcoded in the markdown.
  if (/transistor/.test(s)) return null;
  if (/d[-\s]*latch/.test(s)) return 'dlatch';
  if (/latch/.test(s)) return 'latch';
  if (/gate|nand/.test(s)) return 'gate';
  return null;
}

// Single source of truth for absorbed-terminal placement. Given a child
// placement (cx, cy, w, h in parent world coords) and one of the child
// layer's terminal keys, return where the wire that terminates at that
// child terminal physically lands in parent world coords:
//
//   x = box_edge_x  (snapped LEFT or RIGHT)
//   y = box_top − frac × box_h
//
// (analogous for TOP / BOTTOM edges). Every parent uses this — no
// hand-written absorbed coords.
export function projectChildTerminal(child, terminalKey) {
  const key = childLayerKey(child);
  if (!key) return null;
  const offsets = CHILD_LAYER_TERMINAL_OFFSETS[key];
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
  const sec = (layer.sections || {})['Embedded children'] || '';
  if (!sec) return out;
  const lines = sec.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return out;
  const headers = splitRow(lines[0]);

  // Column-per-terminal headers like "A_input →". Only count headers
  // whose term-key string actually corresponds to a child-layer terminal
  // (otherwise generic headers like "output → absorbed" would silently
  // claim the column and shadow the free-text parser below).
  const termCols = [];
  for (let i = 0; i < headers.length; i++) {
    const m = headers[i].match(/^([A-Za-z_]\w*)\s*→/);
    if (!m) continue;
    const headerTermKey = m[1];
    // A header term-key is valid IFF some child's layer-key has that
    // terminal in CHILD_LAYER_TERMINAL_OFFSETS. Anything else (e.g.
    // "output", "input(s)") is a description, not a per-cell binding.
    const isRealTerm = layer.children.some((c) => {
      const lk = childLayerKey(c);
      return lk && CHILD_LAYER_TERMINAL_OFFSETS[lk] && headerTermKey in CHILD_LAYER_TERMINAL_OFFSETS[lk];
    });
    if (isRealTerm) termCols.push({ idx: i, termKey: headerTermKey });
  }

  for (const child of layer.children) {
    for (const line of lines.slice(2)) {
      const cells = splitRow(line);
      if (cells[0] !== child.id) continue;

      // Format A: each declared term column maps directly.
      for (const tc of termCols) {
        const absorbed = (cells[tc.idx] || '').trim();
        if (!absorbed || absorbed === '—') continue;
        const pos = projectChildTerminal(child, tc.termKey);
        if (pos) out.set(absorbed, pos);
      }

      // Format B: free-text cells in the rightmost columns, with
      // "<term> [(...)]? → <absorbed>" pairs. Always scan every cell
      // past the fixed columns — a cell already consumed by Format A
      // won't contain "→" so the inner loop is a no-op there.
      for (let i = 4; i < cells.length; i++) {
        const cell = cells[i];
        if (!cell) continue;
        const re = /([A-Za-z_]\w*)(?:\s*\([^)]*\))?\s*→\s*([A-Za-z_]\w*)/g;
        let m;
        while ((m = re.exec(cell)) !== null) {
          const pos = projectChildTerminal(child, m[1]);
          if (pos) out.set(m[2], pos);
        }
      }
      break;
    }
  }
  return out;
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

function computeSupplyRoutes(ext, children, bounds) {
  const vddTerm = ext.find((e) => e.key === 'Vdd');
  const gndTerm = ext.find((e) => e.key === 'GND');
  const supplyChildren = children.filter((c) => !/transistor/i.test(c.layer));
  const inset = (bounds.maxX - bounds.minX) * 0.025;
  const routes = [];
  for (const c of supplyChildren) {
    if (vddTerm) {
      const childTop = c.cy + c.h / 2;
      routes.push({
        kind: 'Vdd',
        childId: c.id,
        pts: computeSupplyRoute(c.cx, vddTerm.y, childTop, c, supplyChildren, bounds, 'top', inset),
      });
    }
    if (gndTerm) {
      const childBot = c.cy - c.h / 2;
      routes.push({
        kind: 'GND',
        childId: c.id,
        pts: computeSupplyRoute(c.cx, gndTerm.y, childBot, c, supplyChildren, bounds, 'bottom', inset),
      });
    }
  }
  return routes;
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
export function computeSupplyRoute(cx, parentY, childEdgeY, child, allChildren, bounds, side, inset) {
  const EPS = 1e-6;
  // Kind-stagger: shift the drop column slightly left for Vdd routes and
  // slightly right for GND routes. Without this, when a child has Vdd
  // dropping in from above and a SIBLING (sharing cx) has GND rising from
  // below, both final vertical drops collide at the same x.
  const stagger = 0.1;
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
    const margin = Math.min(0.1, (gHi - gLo) * 0.4);
    approachY = side === 'top' ? gHi - margin : gLo + margin;
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
