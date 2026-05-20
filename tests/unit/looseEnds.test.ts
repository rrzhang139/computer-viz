// Loose-end detection for the gate wire graph.
//
// A "loose end" is a wire endpoint that's neither:
//   • shared with another wire (i.e. an internal junction), nor
//   • declared as a parent-connected EXTERNAL terminal, nor
//   • declared as an ABSORBED terminal (transistor body slab consumes it)
//
// Visually, a loose end manifests as a wire that just stops in the air
// inside a level — the user sees a wire end without anything connecting
// to it. The test enforces that every endpoint in nandWireGraph is
// accounted for, so any future wire addition either:
//   • lands on a known junction / external / absorbed terminal, or
//   • forces the author to declare the new endpoint's category.

import { describe, it, expect } from 'vitest';
import {
  GATE_ABSORBED_TERMINALS,
  GATE_EXTERNAL_TERMINALS,
  WIRES,
  WIRE_NODES,
  wirePoints,
  type WireNodeId,
} from '../../src/levels/nandWireGraph';

// Check whether point p lies on segment (a, b) within `eps` tolerance.
function pointOnSegment(p: readonly number[], a: readonly number[], b: readonly number[], eps = 1e-6): boolean {
  const ax = a[0], ay = a[1], bx = b[0], by = b[1], px = p[0], py = p[1];
  // Cross product: zero means colinear.
  const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
  if (Math.abs(cross) > eps) return false;
  // Dot product to ensure p is BETWEEN a and b.
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  const lenSq = (bx - ax) ** 2 + (by - ay) ** 2;
  return dot >= -eps && dot <= lenSq + eps;
}

// Returns true if `node` (a coordinate) lies on the polyline of some
// OTHER wire (not the ones it's already an endpoint of).
function isOnAnotherWire(nodeCoord: readonly number[], excludeWireIds: Set<string>): boolean {
  for (let i = 0; i < WIRES.length; i++) {
    if (excludeWireIds.has(String(i))) continue;
    const pts = wirePoints(WIRES[i]);
    for (let j = 0; j + 1 < pts.length; j++) {
      if (pointOnSegment(nodeCoord, pts[j], pts[j + 1])) return true;
    }
  }
  return false;
}

describe('Gate wire graph — no loose ends', () => {
  it('every WIRE_NODES entry is categorized (external, absorbed, or junction)', () => {
    // Count how many wires touch each node (any node referenced as from/to).
    const wireCount: Record<string, number> = {};
    for (const w of WIRES) {
      wireCount[w.from] = (wireCount[w.from] ?? 0) + 1;
      wireCount[w.to] = (wireCount[w.to] ?? 0) + 1;
    }

    const external = new Set<WireNodeId>(GATE_EXTERNAL_TERMINALS);
    const absorbed = new Set<WireNodeId>(GATE_ABSORBED_TERMINALS);
    const nodeIds = Object.keys(WIRE_NODES) as WireNodeId[];

    // For each node, also figure out WHICH wires include it as an endpoint
    // (so we can exclude those wires when checking for T-junctions).
    const wiresAtNode: Record<string, Set<string>> = {};
    for (let i = 0; i < WIRES.length; i++) {
      const w = WIRES[i];
      (wiresAtNode[w.from] ??= new Set<string>()).add(String(i));
      (wiresAtNode[w.to] ??= new Set<string>()).add(String(i));
    }

    const looseEnds: WireNodeId[] = [];
    for (const id of nodeIds) {
      const count = wireCount[id] ?? 0;
      const isJunction = count >= 2;
      const isExternal = external.has(id);
      const isAbsorbed = absorbed.has(id);
      // T-junction: the node lies on another wire's segment.
      const isTJunction =
        !isJunction && isOnAnotherWire(WIRE_NODES[id], wiresAtNode[id] ?? new Set());
      if (!isJunction && !isExternal && !isAbsorbed && !isTJunction) {
        looseEnds.push(id);
      }
    }

    expect(
      looseEnds.length,
      `Loose endpoints: ${JSON.stringify(looseEnds)}. Either share these with another wire, declare them in GATE_EXTERNAL_TERMINALS (parent connects), or declare them in GATE_ABSORBED_TERMINALS (transistor body covers).`,
    ).toBe(0);
  });

  it('every declared external/absorbed is actually a node in WIRE_NODES', () => {
    for (const id of [...GATE_EXTERNAL_TERMINALS, ...GATE_ABSORBED_TERMINALS]) {
      expect(WIRE_NODES[id], `${id} not in WIRE_NODES`).toBeDefined();
    }
  });

  it('external and absorbed sets are disjoint (a terminal cannot be both)', () => {
    const ext = new Set<string>(GATE_EXTERNAL_TERMINALS);
    for (const id of GATE_ABSORBED_TERMINALS) {
      expect(ext.has(id), `${id} declared as both external and absorbed`).toBe(false);
    }
  });
});
