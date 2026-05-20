// GATE_MODULE — the NAND-gate level packaged as a LevelModule.
//
// Anything that needs to embed the gate (currently: LevelLatch via
// MiniNandView; future: LevelDff via skip-level views or unit tests
// inspecting the gate's structural contract) imports THIS instead of
// reaching into nandWireGraph + NandSceneSvg + various constants
// separately.
//
// To embed:
//   import { GATE_MODULE } from './gateModule';
//   const A = GATE_MODULE.projectTerminal('A_input', cx, cy, w, h);
//   {GATE_MODULE.renderMini({ cx, cy, w, h, inputs: {A: 1, B: 0, Y: 1}, testid: 'foo' })}

import { LevelModule } from './LevelModule';
import { NandSceneSvg } from './NandSceneSvg';
import {
  GATE_ABSORBED_TERMINALS,
  GATE_EXTERNAL_TERMINALS,
  GATE_GEOMETRY,
  WIRE_NODES,
  type Inputs as GateInputs,
} from './nandWireGraph';

// External terminals (the points the PARENT level must wire up). Each
// maps to the WIRE_NODES coord. Derived from the list in nandWireGraph
// so updating one place is enough.
type GateTerminal = (typeof GATE_EXTERNAL_TERMINALS)[number];
const TERMINALS = GATE_EXTERNAL_TERMINALS.reduce(
  (acc, name) => {
    const [x, y] = WIRE_NODES[name];
    acc[name] = [x, y] as const;
    return acc;
  },
  {} as Record<GateTerminal, readonly [number, number]>,
);

export const GATE_MODULE = new LevelModule<GateTerminal, GateInputs>({
  id: 'gate',
  geometry: GATE_GEOMETRY,
  externalTerminals: TERMINALS,
  absorbedTerminals: GATE_ABSORBED_TERMINALS,
  Scene: NandSceneSvg,
});

export type { GateTerminal };
