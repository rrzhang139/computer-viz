// symbols.ts — single source of truth for inline symbol strings.
//
// Every label, terminal name, type abbreviation, voltage tag, and role
// identifier that appears anywhere in the visualization should reference
// one of these constants. The point is to enforce that A and B are ALWAYS
// inputs, Y is ALWAYS the output, Vdd is ALWAYS the positive rail, etc. —
// across every level, every component, every test.
//
// This is orthogonal to:
//   - GLOSSARY.md's [BRACKET] symbols (those name folders, not literals)
//   - src/data/dictionary.ts (those carry hover-tooltip definitions)
// Use this file when you need the literal string itself.

export const LOGIC = {
  A: 'A',
  B: 'B',
  Y: 'Y',
  HIGH: '1',
  LOW: '0',
} as const;

export const SUPPLY = {
  Vdd: 'Vdd',
  GND: 'GND',
  V_G: 'V_G',
  V_D: 'V_D',
  V_S: 'V_S',
  V_DS: 'V_DS',
  V_GS: 'V_GS',
  V_th: 'V_th',
} as const;

export const TRANSISTOR_TYPE = {
  NMOS: 'NMOS',
  PMOS: 'PMOS',
  CMOS: 'CMOS',
  MOSFET: 'MOSFET',
} as const;

export const TRANSISTOR_ROLE = {
  P_A: 'P_A',
  P_B: 'P_B',
  N_A: 'N_A',
  N_B: 'N_B',
} as const;

export const GATE_TYPE = {
  NAND: 'NAND',
  NOR: 'NOR',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  XOR: 'XOR',
  XNOR: 'XNOR',
} as const;

export const DOPING = {
  n_plus: 'n+',
  p_plus: 'p+',
  n_type: 'n-type',
  p_type: 'p-type',
} as const;

export const MATERIAL = {
  polysilicon: 'polysilicon',
  SiO2: 'SiO₂',
  silicon: 'silicon',
} as const;

export const PART = {
  gate: 'gate',
  oxide: 'oxide',
  source: 'source',
  drain: 'drain',
  substrate: 'substrate',
  channel: 'channel',
  contact: 'contact',
} as const;

export const NETWORK = {
  pull_up: 'pull-up',
  pull_down: 'pull-down',
} as const;

// Derived types — handy for component props and discriminated unions.

export type Part = (typeof PART)[keyof typeof PART];
export type TransistorRole = (typeof TRANSISTOR_ROLE)[keyof typeof TRANSISTOR_ROLE];
export type TransistorKind = (typeof TRANSISTOR_TYPE)[keyof typeof TRANSISTOR_TYPE];
export type GateTypeName = (typeof GATE_TYPE)[keyof typeof GATE_TYPE];

// Helpful enumeration for tests + iteration.
export const ALL_PARTS: readonly Part[] = Object.values(PART);
export const ALL_TRANSISTOR_ROLES: readonly TransistorRole[] = Object.values(TRANSISTOR_ROLE);
