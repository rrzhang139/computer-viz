// Pins TRANSISTOR_NETS — the "what does each terminal of this transistor
// connect to in the parent NAND gate?" mapping. Hover previews use these
// labels to tell the user "the source you see at top is Vdd; the drain
// at bottom is Y" etc. Get them wrong and the preview misleads.

import { describe, it, expect } from 'vitest';
import { TRANSISTOR_NETS } from '../../src/levels/MiniViews';
import { TRANSISTOR_ROLE } from '../../src/levels/symbols';

describe('TRANSISTOR_NETS — per-role parent wiring', () => {
  it('covers every TRANSISTOR_ROLE', () => {
    for (const role of Object.values(TRANSISTOR_ROLE)) {
      expect(TRANSISTOR_NETS[role], `missing nets for ${role}`).toBeDefined();
    }
  });

  it('every PMOS has source=Vdd at top and drain=Y at bottom (the pull-up wiring)', () => {
    expect(TRANSISTOR_NETS.P_A.top).toBe('Vdd');
    expect(TRANSISTOR_NETS.P_A.bottom).toBe('Y');
    expect(TRANSISTOR_NETS.P_B.top).toBe('Vdd');
    expect(TRANSISTOR_NETS.P_B.bottom).toBe('Y');
  });

  it('NMOS pull-down chain: N_A drain at Y, source at mid; N_B drain at mid, source at GND', () => {
    expect(TRANSISTOR_NETS.N_A.top).toBe('Y');
    expect(TRANSISTOR_NETS.N_A.bottom).toBe('mid');
    expect(TRANSISTOR_NETS.N_B.top).toBe('mid');
    expect(TRANSISTOR_NETS.N_B.bottom).toBe('GND');
  });

  it('the A-input drives P_A and N_A; B drives P_B and N_B', () => {
    expect(TRANSISTOR_NETS.P_A.side).toBe('A');
    expect(TRANSISTOR_NETS.N_A.side).toBe('A');
    expect(TRANSISTOR_NETS.P_B.side).toBe('B');
    expect(TRANSISTOR_NETS.N_B.side).toBe('B');
  });
});
