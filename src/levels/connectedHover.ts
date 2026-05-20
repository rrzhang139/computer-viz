// Composable foundation for the "connected hover preview" pattern.
//
// Every level above transistor follows the same pattern:
//   - The parent diagram contains N child sub-components (transistors in a
//     gate, NANDs in a latch, latches in a DFF, …).
//   - Each child has K terminals where parent wires meet it.
//   - Hovering a child SWAPS the simple block for a "detailed" component
//     whose terminals literally sit on the parent wire endpoints, with
//     internal animations showing signal flow.
//
// This file holds the SHARED types + the hover-state hook so adding a new
// level is "encode the connection points + write the detailed renderer."
// The renderer itself stays per-level (different rendering technologies:
// SVG for latch/DFF, r3f for gate).

import { useCallback, useState } from 'react';

// ── Shared geometry types ─────────────────────────────────────────────────
// 2D for SVG levels, 3D for r3f levels. The connection-point tables in
// each level pick whichever fits.
export type Point2 = readonly [number, number] | { x: number; y: number };
export type Point3 = readonly [number, number, number];

// A single terminal on a child: where the parent wire meets it, plus the
// human-readable label of the parent net.
export interface TerminalConnection<P> {
  point: P;
  netLabel: string;
}

// A child sub-component's full connection profile: terminals keyed by
// their canonical names within the child (e.g. 'source' | 'drain' | 'gate'
// for a MOSFET; 'A' | 'B' | 'Y' for a NAND).
export type ChildConnections<P, K extends string> = Record<K, TerminalConnection<P>>;

// ── Hover state hook ──────────────────────────────────────────────────────
// One shared hook for "which child is hovered?". Any level uses this with
// the right `Id` type — `'P_A' | 'P_B' | …` for the gate, `'nand-1' |
// 'nand-2'` for the latch, etc. The detailed/simple swap then becomes a
// trivial conditional on `hovered === id`.
//
// The state-update functions are stable (useCallback), and `clearIf` keeps
// hover from sticking when the user moves between adjacent children — the
// child that was hovered only clears if no new hover has replaced it yet.
export function useHoveredChild<Id extends string>() {
  const [hovered, setHovered] = useState<Id | null>(null);
  const enter = useCallback((id: Id) => {
    setHovered(id);
  }, []);
  const leaveIf = useCallback((id: Id) => {
    setHovered((prev) => (prev === id ? null : prev));
  }, []);
  const leaveAll = useCallback(() => {
    setHovered(null);
  }, []);
  return { hovered, enter, leaveIf, leaveAll };
}

// ── Testid contract ───────────────────────────────────────────────────────
// Every "detailed" component renders a root with `${id}-detailed` and a
// terminal label with `${id}-detailed-net-${terminalKey}`. Tests across
// levels can iterate on these names predictably.
export function detailedTestId(id: string): string {
  return `${id}-detailed`;
}
export function netTestId(id: string, terminalKey: string): string {
  return `${id}-detailed-net-${terminalKey}`;
}
