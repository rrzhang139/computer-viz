// D_LATCH_MODULE — the gated D-latch level packaged as a LevelModule.
// Built from 1 SR latch + 2 gating NANDs + 1 inverter. Embedded by
// the DFF (master + slave) and standalone-navigable at level 3.

import { LevelModule } from './LevelModule';
import { DLatchSceneSvg } from './DLatchSceneSvg';
import {
  DLATCH_ABSORBED_TERMINALS,
  DLATCH_EXTERNAL_TERMINALS,
  DLATCH_GEOMETRY,
  WIRE_NODES,
  type Inputs as DLatchInputs,
} from './dLatchWireGraph';

type DLatchTerminal = (typeof DLATCH_EXTERNAL_TERMINALS)[number];
const TERMINALS = DLATCH_EXTERNAL_TERMINALS.reduce(
  (acc, name) => {
    const [x, y] = WIRE_NODES[name];
    acc[name] = [x, y] as const;
    return acc;
  },
  {} as Record<DLatchTerminal, readonly [number, number]>,
);

export const D_LATCH_MODULE = new LevelModule<DLatchTerminal, DLatchInputs>({
  id: 'dlatch',
  geometry: DLATCH_GEOMETRY,
  externalTerminals: TERMINALS,
  absorbedTerminals: DLATCH_ABSORBED_TERMINALS,
  Scene: DLatchSceneSvg,
});

export type { DLatchTerminal };
