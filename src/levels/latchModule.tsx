// LATCH_MODULE — the SR-latch level packaged as a LevelModule, for any
// parent (DFF, future register, etc.) to embed.

import { LevelModule } from './LevelModule';
import { LatchSceneSvg } from './LatchSceneSvg';
import {
  LATCH_ABSORBED_TERMINALS,
  LATCH_EXTERNAL_TERMINALS,
  LATCH_GEOMETRY,
  WIRE_NODES,
  type Inputs as LatchInputs,
} from './latchWireGraph';

type LatchTerminal = (typeof LATCH_EXTERNAL_TERMINALS)[number];
const TERMINALS = LATCH_EXTERNAL_TERMINALS.reduce(
  (acc, name) => {
    const [x, y] = WIRE_NODES[name];
    acc[name] = [x, y] as const;
    return acc;
  },
  {} as Record<LatchTerminal, readonly [number, number]>,
);

export const LATCH_MODULE = new LevelModule<LatchTerminal, LatchInputs>({
  id: 'latch',
  geometry: LATCH_GEOMETRY,
  externalTerminals: TERMINALS,
  absorbedTerminals: LATCH_ABSORBED_TERMINALS,
  Scene: LatchSceneSvg,
});

export type { LatchTerminal };
