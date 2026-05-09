// Invariants test for the canonical symbols module. Locks down properties
// any future component should be able to assume:
//   - every symbol value is a non-empty string
//   - PART matches the non-null variants of ElectronsPart
//   - role names follow the [PN]_[AB] pattern
//   - well-known symbols have their conventional values

import { describe, it, expect } from 'vitest';
import {
  ALL_PARTS,
  ALL_TRANSISTOR_ROLES,
  DOPING,
  GATE_TYPE,
  LOGIC,
  MATERIAL,
  NETWORK,
  PART,
  SUPPLY,
  TRANSISTOR_ROLE,
  TRANSISTOR_TYPE,
} from '../../src/levels/symbols';
import type { ElectronsPart } from '../../src/levels/descriptions';

const ALL_NAMESPACES = {
  LOGIC,
  SUPPLY,
  TRANSISTOR_TYPE,
  TRANSISTOR_ROLE,
  GATE_TYPE,
  DOPING,
  MATERIAL,
  PART,
  NETWORK,
};

describe('symbols.ts — canonical invariants', () => {
  it('every symbol is a non-empty string', () => {
    for (const [nsName, ns] of Object.entries(ALL_NAMESPACES)) {
      for (const [key, value] of Object.entries(ns)) {
        expect(typeof value, `${nsName}.${key} must be a string`).toBe('string');
        expect((value as string).length, `${nsName}.${key} must be non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it('LOGIC has A, B as inputs and Y as output', () => {
    expect(LOGIC.A).toBe('A');
    expect(LOGIC.B).toBe('B');
    expect(LOGIC.Y).toBe('Y');
    expect(LOGIC.HIGH).toBe('1');
    expect(LOGIC.LOW).toBe('0');
  });

  it('SUPPLY uses the conventional Vdd / GND names', () => {
    expect(SUPPLY.Vdd).toBe('Vdd');
    expect(SUPPLY.GND).toBe('GND');
    expect(SUPPLY.V_G).toBe('V_G');
    expect(SUPPLY.V_th).toBe('V_th');
  });

  it('TRANSISTOR_TYPE includes NMOS, PMOS, CMOS, MOSFET', () => {
    expect(Object.values(TRANSISTOR_TYPE).sort()).toEqual(['CMOS', 'MOSFET', 'NMOS', 'PMOS']);
  });

  it('TRANSISTOR_ROLE values follow [PN]_[AB] pattern', () => {
    for (const role of ALL_TRANSISTOR_ROLES) {
      expect(role, `role "${role}" should match [PN]_[AB]`).toMatch(/^[PN]_[AB]$/);
    }
    expect(ALL_TRANSISTOR_ROLES).toHaveLength(4);
  });

  it('PART covers exactly the non-null variants of ElectronsPart', () => {
    // Compile-time check: every ElectronsPart non-null value is a Part.
    const sample: Exclude<ElectronsPart, null>[] = [
      'gate',
      'oxide',
      'source',
      'drain',
      'substrate',
      'channel',
      'contact',
    ];
    for (const part of sample) {
      // Round-trip: every sample is in PART, and every PART value matches a sample.
      expect(ALL_PARTS).toContain(part);
    }
    expect(ALL_PARTS.length).toBe(sample.length);
  });

  it('DOPING distinguishes n+ vs p+ heavy doping and n-type vs p-type', () => {
    expect(DOPING.n_plus).toBe('n+');
    expect(DOPING.p_plus).toBe('p+');
    expect(DOPING.n_type).toBe('n-type');
    expect(DOPING.p_type).toBe('p-type');
  });

  it('GATE_TYPE includes the universal NAND', () => {
    expect(GATE_TYPE.NAND).toBe('NAND');
  });

  it('NETWORK names match the CMOS pull-up / pull-down convention', () => {
    expect(NETWORK.pull_up).toBe('pull-up');
    expect(NETWORK.pull_down).toBe('pull-down');
  });

  it('MATERIAL names are the canonical chemistry tags', () => {
    expect(MATERIAL.polysilicon).toBe('polysilicon');
    expect(MATERIAL.SiO2).toBe('SiO₂');
  });

  it('all values across namespaces are unique within their namespace', () => {
    for (const [nsName, ns] of Object.entries(ALL_NAMESPACES)) {
      const values = Object.values(ns) as string[];
      const unique = new Set(values);
      expect(unique.size, `${nsName} has duplicate values`).toBe(values.length);
    }
  });
});
