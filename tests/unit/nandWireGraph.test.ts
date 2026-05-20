// Direction invariant for the NAND wire graph.
//
// The screenshot bug that motivated this test: the single Y-junction wire
// `[[-1.6,1.15],[-1.6,0.5],[1.6,0.5],[1.6,1.15]]` always animated its
// electron from start (P_A drain) to end (P_B drain) — so on the P_B side
// the ball appeared to be running UP from Y into P_B's drain, the wrong
// way for a pull-up that should be flowing FROM the PMOS drain DOWN INTO
// the Y junction.
//
// The fix split that wire into two: P_A.drain → Y_junction and
// P_B.drain → Y_junction, each with its own activation condition. This
// test pins it: every wire's pts[0] equals WIRE_NODES[from] and its last
// point equals WIRE_NODES[to]. A future regression that swaps endpoints
// or writes a wire whose polyline runs opposite to its declared direction
// fails here.

import { describe, it, expect } from 'vitest';
import {
  WIRES,
  WIRE_NODES,
  wirePoints,
  type WireSpec,
} from '../../src/levels/nandWireGraph';

const eq = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);

describe('nandWireGraph — direction invariant', () => {
  it('every wire references valid `from` / `to` nodes', () => {
    for (const w of WIRES) {
      expect(WIRE_NODES[w.from], `from=${w.from}`).toBeDefined();
      expect(WIRE_NODES[w.to], `to=${w.to}`).toBeDefined();
    }
  });

  it('every wire: pts[0] === WIRE_NODES[from]', () => {
    for (const w of WIRES) {
      const pts = wirePoints(w);
      expect(eq(pts[0], WIRE_NODES[w.from]), `wire ${w.from}→${w.to}: pts[0]=${pts[0]} expected ${WIRE_NODES[w.from]}`).toBe(true);
    }
  });

  it('every wire: pts[last] === WIRE_NODES[to]', () => {
    for (const w of WIRES) {
      const pts = wirePoints(w);
      const last = pts[pts.length - 1];
      expect(eq(last, WIRE_NODES[w.to]), `wire ${w.from}→${w.to}: pts[last]=${last} expected ${WIRE_NODES[w.to]}`).toBe(true);
    }
  });

  it('no wire is zero-length (from !== to)', () => {
    for (const w of WIRES) {
      expect(w.from, `wire from=${w.from} to=${w.to}`).not.toBe(w.to);
    }
  });
});

describe('nandWireGraph — physical correctness of flow', () => {
  // These tests pin the SPECIFIC physical claims of the diagram so future
  // refactors can't accidentally make electrons flow backwards.

  const findWire = (from: WireSpec['from'], to: WireSpec['to']) =>
    WIRES.find((w) => w.from === from && w.to === to);

  it('Vdd → P_A source: a downward pull-up, active when A=0', () => {
    const w = findWire('Vdd_tap_PA', 'PA_source');
    expect(w).toBeDefined();
    expect(w!.flowWhen?.({ A: 0, B: 0, Y: 1 })).toBe(true);
    expect(w!.flowWhen?.({ A: 1, B: 0, Y: 1 })).toBe(false);
    // start y > end y → flows downward in screen space
    const pts = wirePoints(w!);
    expect(pts[0][1]).toBeGreaterThan(pts[pts.length - 1][1]);
  });

  it('Vdd → P_B source: a downward pull-up, active when B=0', () => {
    const w = findWire('Vdd_tap_PB', 'PB_source');
    expect(w).toBeDefined();
    expect(w!.flowWhen?.({ A: 0, B: 0, Y: 1 })).toBe(true);
    expect(w!.flowWhen?.({ A: 0, B: 1, Y: 1 })).toBe(false);
    const pts = wirePoints(w!);
    expect(pts[0][1]).toBeGreaterThan(pts[pts.length - 1][1]);
  });

  it('P_A drain → Y junction (not the other way!) — fixes the upstream-electron bug', () => {
    const w = findWire('PA_drain', 'Y_junction');
    expect(w).toBeDefined();
    // electron must flow only when P_A is conducting
    expect(w!.flowWhen?.({ A: 0, B: 1, Y: 1 })).toBe(true);
    expect(w!.flowWhen?.({ A: 1, B: 1, Y: 0 })).toBe(false);
    // visually: P_A drain (y=1.15) is ABOVE Y junction (y=0.5) → flows down
    const pts = wirePoints(w!);
    expect(pts[0][1]).toBeGreaterThan(pts[pts.length - 1][1]);
  });

  it('P_B drain → Y junction (not the other way!) — fixes the upstream-electron bug', () => {
    const w = findWire('PB_drain', 'Y_junction');
    expect(w).toBeDefined();
    expect(w!.flowWhen?.({ A: 1, B: 0, Y: 1 })).toBe(true);
    expect(w!.flowWhen?.({ A: 1, B: 1, Y: 0 })).toBe(false);
    const pts = wirePoints(w!);
    expect(pts[0][1]).toBeGreaterThan(pts[pts.length - 1][1]);
  });

  it('Y → N_A drain: only flows when both NMOS are ON (Y is being pulled down)', () => {
    const w = findWire('Y_junction', 'NA_drain');
    expect(w).toBeDefined();
    expect(w!.flowWhen?.({ A: 1, B: 1, Y: 0 })).toBe(true);
    expect(w!.flowWhen?.({ A: 0, B: 1, Y: 1 })).toBe(false);
    expect(w!.flowWhen?.({ A: 1, B: 0, Y: 1 })).toBe(false);
  });

  it('NMOS chain runs strictly downward (N_A source → N_B drain → GND)', () => {
    const mid = findWire('NA_source', 'NB_drain');
    const toGnd = findWire('NB_source', 'GND_tap_NB');
    expect(mid).toBeDefined();
    expect(toGnd).toBeDefined();
    for (const w of [mid!, toGnd!]) {
      const pts = wirePoints(w);
      expect(pts[0][1]).toBeGreaterThan(pts[pts.length - 1][1]);
    }
  });

  it('A input drives BOTH A-controlled gates (P_A and N_A)', () => {
    expect(findWire('A_input', 'PA_gate')).toBeDefined();
    expect(findWire('A_tap_to_NMOS', 'NA_gate')).toBeDefined();
  });

  it('B input drives BOTH B-controlled gates (P_B and N_B)', () => {
    expect(findWire('B_input', 'PB_gate')).toBeDefined();
    expect(findWire('B_tap_to_NMOS', 'NB_gate')).toBeDefined();
  });

  it('there is NO single wire spanning both PMOS drains (regression guard for the old Y-junction bug)', () => {
    // The old buggy wire had P_A drain as `from` and ended at P_B drain.
    // After the split, no wire connects PA_drain ↔ PB_drain directly.
    const offending = WIRES.find(
      (w) => (w.from === 'PA_drain' && w.to === 'PB_drain') || (w.from === 'PB_drain' && w.to === 'PA_drain'),
    );
    expect(offending).toBeUndefined();
  });
});

// -------------------------------------------------------------------------
// Truth-table-driven "dead wire" guardrail.
//
// For each of the four (A,B) input states, we enumerate by hand which wires
// SHOULD be carrying current (electron-pulse visible) and assert each wire's
// flowWhen agrees. A wire that animates an electron when its circuit is
// physically open fails here. Catches things like the original
// `Y_junction → Y_out: flowWhen: () => true` which kept flowing even when
// Y=0 and the output was being pulled to GND (no current toward the load).
// -------------------------------------------------------------------------

type WireId = `${WireSpec['from']}->${WireSpec['to']}`;
const wireId = (w: WireSpec): WireId => `${w.from}->${w.to}` as WireId;

// Per-state truth table. Each entry is the EXHAUSTIVE set of wire ids that
// must be flowing in that state. Every wire not in the set must NOT flow.
// (Power rails are never live by design: they're modeled as static reservoirs.)
const EXPECTED_LIVE: Record<string, ReadonlySet<WireId>> = {
  // A=0, B=0, Y=1 — both PMOS conducting, NAND output HIGH
  '0,0,1': new Set<WireId>([
    'Vdd_tap_PA->PA_source',
    'Vdd_tap_PB->PB_source',
    'PA_drain->Y_junction',
    'PB_drain->Y_junction',
    'Y_junction->Y_out',
  ]),
  // A=0, B=1, Y=1 — only P_A conducts; B input wires carry the HIGH signal
  '0,1,1': new Set<WireId>([
    'Vdd_tap_PA->PA_source',
    'PA_drain->Y_junction',
    'Y_junction->Y_out',
    'B_input->PB_gate',
    'B_tap_to_NMOS->NB_gate',
  ]),
  // A=1, B=1, Y=0 — both NMOS conducting, output pulled LOW through the chain
  '1,1,0': new Set<WireId>([
    'Y_junction->NA_drain',
    'NA_source->NB_drain',
    'NB_source->GND_tap_NB',
    'A_input->PA_gate',
    'A_tap_to_NMOS->NA_gate',
    'B_input->PB_gate',
    'B_tap_to_NMOS->NB_gate',
  ]),
  // A=1, B=0, Y=1 — only P_B conducts; A input wires carry the HIGH signal
  '1,0,1': new Set<WireId>([
    'Vdd_tap_PB->PB_source',
    'PB_drain->Y_junction',
    'Y_junction->Y_out',
    'A_input->PA_gate',
    'A_tap_to_NMOS->NA_gate',
  ]),
};

describe('nandWireGraph — KCL-ish dead-wire guardrail', () => {
  const states: { A: 0 | 1; B: 0 | 1; Y: 0 | 1 }[] = [
    { A: 0, B: 0, Y: 1 },
    { A: 0, B: 1, Y: 1 },
    { A: 1, B: 1, Y: 0 },
    { A: 1, B: 0, Y: 1 },
  ];

  for (const inputs of states) {
    const key = `${inputs.A},${inputs.B},${inputs.Y}`;
    it(`state (A=${inputs.A}, B=${inputs.B}, Y=${inputs.Y}): every wire matches the expected live-set`, () => {
      const expected = EXPECTED_LIVE[key];
      for (const w of WIRES) {
        const id = wireId(w);
        const actuallyFlowing = w.flowWhen?.(inputs) ?? false;
        const shouldFlow = expected.has(id);
        expect(
          actuallyFlowing,
          `wire ${id} in state (A=${inputs.A}, B=${inputs.B}, Y=${inputs.Y}): shouldFlow=${shouldFlow} actual=${actuallyFlowing}`,
        ).toBe(shouldFlow);
      }
    });
  }

  it('power rails (Vdd_rail, GND_rail) never carry visualized current', () => {
    const rails = WIRES.filter(
      (w) =>
        (w.from === 'Vdd_rail_left' && w.to === 'Vdd_rail_right') ||
        (w.from === 'GND_rail_left' && w.to === 'GND_rail_right'),
    );
    expect(rails.length).toBe(2);
    for (const w of rails) {
      for (const s of states) {
        expect(w.flowWhen?.(s) ?? false, `${wireId(w)} in (A=${s.A}, B=${s.B})`).toBe(false);
      }
    }
  });

  it('every wire is covered by the truth table (no orphan wires)', () => {
    // Any wire that never appears in any expected set across all 4 states
    // AND can flow in some state is a wire whose flow we haven't physically
    // justified. Power rails are exempt (they appear in none and never flow).
    const everLive = new Set<WireId>();
    for (const set of Object.values(EXPECTED_LIVE)) for (const id of set) everLive.add(id);
    for (const w of WIRES) {
      const id = wireId(w);
      const couldFlow = states.some((s) => w.flowWhen?.(s) ?? false);
      if (couldFlow && !everLive.has(id)) {
        throw new Error(
          `Wire ${id} can flow in some state but is not in EXPECTED_LIVE. Either add it to the truth table with physical justification, or fix flowWhen.`,
        );
      }
    }
  });
});
