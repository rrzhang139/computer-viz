// Contextual descriptions shown in the right-toolbar "Spotlight" card.
// Each level has a default story (so landing makes sense without clicking),
// and the Transistor level has per-part definitions tied to the part picker.

// Names refer to terminals / regions of one MOSFET — these are the part
// picker entries inside the Transistor level. (The "Gate" *level* — a logic
// gate built from many transistors — is a separate concept; don't confuse
// it with the *gate terminal* of one transistor.)
//
// Implemented as `Part | null` where `Part` lives in `./symbols.ts` (the
// single source of truth for every label string in the app).
import type { Part } from './symbols';
export type ElectronsPart = Part | null;

export interface Spotlight {
  title: string;
  subtitle: string;
  body: string;
  // Optional, visually-demoted line shown BELOW the body. Used to carry the
  // parent ↔ this-level terminal mapping on drill-down spotlights without
  // burying the level's own explanation. See CLAUDE.md rule #17.
  parentMap?: string;
}

// PhaseSpotlight is what the right-toolbar spotlight panel shows AFTER the
// user has stepped at least once. At cycle === 0 we fall back to the level's
// default Spotlight (the "what is this level" pitch). After the first step
// the spotlight panel becomes the explainer for the current phase: which
// state we're in, why the wires are colored the way they are, and a small
// row of live meter values (A=1 B=0 Y=1, etc.) underneath.
//
// This is the single home for phase prose — components import these
// functions instead of carrying their own PHASE_TEXT tables.
export interface PhaseSpotlight {
  title: string;
  subtitle: string;
  body: string;
  meters: { label: string; value: string }[];
}

const wrap = (n: number): number => ((n % 4) + 4) % 4;

export function gatePhaseFor(cycle: number): PhaseSpotlight {
  const seq: [0 | 1, 0 | 1][] = [[0, 0], [0, 1], [1, 1], [1, 0]];
  const [a, b] = seq[wrap(cycle)];
  const y = a === 1 && b === 1 ? 0 : 1;
  const meters = [
    { label: 'A', value: String(a) },
    { label: 'B', value: String(b) },
    { label: 'Y', value: String(y) },
  ];
  if (a === 0 && b === 0) {
    return {
      title: 'Both inputs LOW → Y = 1',
      subtitle: 'PMOS pull-up wins',
      body:
        'Both PMOS conduct (PMOS is active LOW). Y is connected to Vdd through both pull-up paths in parallel. Both NMOS are off, so no path to GND. The Y wire sits at Vdd; the next gate reads it as 1.',
      meters,
    };
  }
  if (a === 0 && b === 1) {
    return {
      title: 'B flipped HIGH — Y stays at 1',
      subtitle: 'one PMOS is enough',
      body:
        'P_B turned OFF and N_B turned ON, but P_A is still ON (A is still 0), so Y stays connected to Vdd through P_A. The pull-down chain is broken (N_A off). NAND only cares when BOTH inputs are 1.',
      meters,
    };
  }
  if (a === 1 && b === 1) {
    return {
      title: 'Both inputs HIGH → Y = 0',
      subtitle: 'NMOS series chain wins',
      body:
        'Both PMOS are OFF — no path to Vdd. Both NMOS are ON, completing the SERIES chain to GND. Y is pulled down to ground. THIS is the only state that produces 0; that 0 will switch the next gate forward.',
      meters,
    };
  }
  return {
    title: 'B flipped LOW — Y back to 1',
    subtitle: 'P_B alone pulls up',
    body:
      'A is still 1 (so P_A off, N_A on) but B = 0 means P_B is ON again. P_B alone is enough to pull Y up to Vdd. The NMOS series chain is broken (N_B off). Gates are stateless — only the CURRENT input matters.',
    meters,
  };
}

export function latchPhaseFor(cycle: number): PhaseSpotlight {
  const c = wrap(cycle);
  if (c === 1) {
    return {
      title: 'SET — S̄ pulled LOW',
      subtitle: 'NAND1 forces Q HIGH',
      body:
        "S̄ = 0 forces NAND1's output (Q) to 1 regardless of feedback. Q then drives NAND2; with R̄ = 1, Q̄ resolves to 0. The latch latches HIGH.",
      meters: [
        { label: 'S̄', value: '0' },
        { label: 'R̄', value: '1' },
        { label: 'Q', value: '1' },
        { label: 'Q̄', value: '0' },
      ],
    };
  }
  if (c === 3) {
    return {
      title: 'RESET — R̄ pulled LOW',
      subtitle: 'NAND2 forces Q̄ HIGH',
      body:
        "R̄ = 0 forces NAND2's output (Q̄) to 1. Q̄ drives NAND1; with S̄ = 1, Q resolves to 0. The latch latches LOW.",
      meters: [
        { label: 'S̄', value: '1' },
        { label: 'R̄', value: '0' },
        { label: 'Q', value: '0' },
        { label: 'Q̄', value: '1' },
      ],
    };
  }
  if (c === 0) {
    return {
      title: 'HOLD — both inputs HIGH',
      subtitle: 'feedback alone keeps the bit alive',
      body:
        'S̄ = 1, R̄ = 1. Neither set nor reset is asserted. The cross-coupling holds whatever Q was. This is the latch REMEMBERING — the bit lives in the loop.',
      meters: [
        { label: 'S̄', value: '1' },
        { label: 'R̄', value: '1' },
        { label: 'Q', value: '0' },
        { label: 'Q̄', value: '1' },
      ],
    };
  }
  return {
    title: 'HOLD — both inputs HIGH',
    subtitle: 'still remembering after SET',
    body:
      'S̄ = 1, R̄ = 1 again. The previous SET pulse is gone but Q stays at 1 — that is the entire point of the cross-coupling. Memory persists between writes.',
    meters: [
      { label: 'S̄', value: '1' },
      { label: 'R̄', value: '1' },
      { label: 'Q', value: '1' },
      { label: 'Q̄', value: '0' },
    ],
  };
}

export function dffPhaseFor(cycle: number): PhaseSpotlight {
  const c = wrap(cycle);
  if (c === 0) {
    return {
      title: 'CLK LOW — master tracking D',
      subtitle: 'slave is frozen, holding Q from the last edge',
      body:
        "CLK = 0, so !CLK = 1 enables the master. The master is transparent: its stored bit follows D. The slave's EN = CLK = 0, so the slave is FROZEN — Q stays at whatever it was after the last rising edge.",
      meters: [
        { label: 'CLK', value: '0' },
        { label: 'D', value: '0' },
        { label: 'M', value: '0' },
        { label: 'Q', value: '1' },
        { label: 'Q̄', value: '0' },
      ],
    };
  }
  if (c === 1) {
    return {
      title: 'CLK ROSE — captured 0 → Q = 0',
      subtitle: 'rising edge hands the bit from master to slave',
      body:
        "CLK went 0 → 1. At that instant the master locked the value of D (= 0). The slave's EN is now HIGH, so the slave becomes transparent and passes the master's snapshot to Q. THIS is the edge where Q updates.",
      meters: [
        { label: 'CLK', value: '1' },
        { label: 'D', value: '0' },
        { label: 'M', value: '0' },
        { label: 'Q', value: '0' },
        { label: 'Q̄', value: '1' },
      ],
    };
  }
  if (c === 2) {
    return {
      title: 'CLK LOW · D = 1 — but Q is still 0',
      subtitle: 'KEY INSIGHT — new data is queued in the master',
      body:
        'The master is transparent again and now tracks D = 1. But the slave is FROZEN (EN = CLK = 0), so Q does not move. New data is QUEUED in the master, waiting for the next rising edge to be released.',
      meters: [
        { label: 'CLK', value: '0' },
        { label: 'D', value: '1' },
        { label: 'M', value: '1' },
        { label: 'Q', value: '0' },
        { label: 'Q̄', value: '1' },
      ],
    };
  }
  return {
    title: 'CLK ROSE — captured 1 → Q = 1',
    subtitle: 'rising edge releases the queued bit',
    body:
      'Rising edge again. Master locks D = 1, slave forwards it, Q updates from 0 → 1. Each clock tick is exactly one chance for the bit to advance — that lockstep is what makes the whole CPU synchronous.',
    meters: [
      { label: 'CLK', value: '1' },
      { label: 'D', value: '1' },
      { label: 'M', value: '1' },
      { label: 'Q', value: '1' },
      { label: 'Q̄', value: '0' },
    ],
  };
}

// Structured summary card shown at the bottom-left of each level. The point
// is to answer four questions for the learner without requiring them to
// hunt through prose: what is this, why does it exist, where do its inputs
// come from, where does its output go.
export interface LevelSummary {
  what: string;
  why: string;
  inputs: string;
  outputs: string;
}

export const dffLevelSummary: LevelSummary = {
  what: 'A D flip-flop — two latches in master-slave + a clock inverter. The atomic CPU storage element.',
  why: 'A bare latch is "transparent" — its output follows its input whenever enabled, which makes building a synchronous machine with thousands of latches a timing nightmare. The DFF fixes this: the bit only updates on a clock EDGE, so the entire CPU advances in lockstep on every tick. Every CPU register, pipeline stage latch, and stateful pipeline buffer is a row of these.',
  inputs: 'D (the bit to capture) and CLK (the clock). The captured value is what D was at the instant CLK rose from 0 to 1.',
  outputs: 'Q (the captured bit) and Q̄ (its inverse). Q does NOT track D between edges — it stays frozen until the next rising edge. That delay is what makes synchronous logic possible.',
};

export const dffSpotlight: Spotlight = {
  title: 'A D flip-flop',
  subtitle: 'master-slave: 2 latches + a clock inverter',
  body:
    "Two SR latches stacked. The MASTER latch is enabled while CLK is LOW (it tracks D). The SLAVE latch is enabled while CLK is HIGH (it passes the master’s frozen value to Q). On the rising clock edge, the master locks and the slave starts passing — that is the EDGE where Q updates. Click either latch to drill in.",
};

export const masterLatchSpotlight: Spotlight = {
  title: 'Master latch — captures D while CLK is LOW',
  subtitle: 'a gated D latch built around this same SR core',
  body:
    "From the DFF, this is the input-side latch. The diagram shows the SR-latch CORE; the DFF wraps it with two extra NANDs that derive S̄ and R̄ from D and EN. The mapping: D in the DFF drives S̄ ; !D drives R̄ ; EN gates them both. While CLK = 0 the master is transparent and Q (here) tracks D; on the rising edge it freezes.",
};

export const slaveLatchSpotlight: Spotlight = {
  title: 'Slave latch — passes the snapshot to Q while CLK is HIGH',
  subtitle: 'identical SR core, opposite-phase clock',
  body:
    "From the DFF, this is the output-side latch. Its inputs are derived from the MASTER's Q and Q̄ (via the same gating idiom). EN is driven by CLK directly, so the slave is enabled exactly when the master is FROZEN — that is what makes the whole DFF edge-triggered.",
};

export const latchLevelSummary: LevelSummary = {
  what: 'An SR latch — two cross-coupled NAND gates that REMEMBER one bit.',
  why: 'The first stateful primitive. Logic gates alone are memoryless functions of their inputs; feedback turns them into the smallest unit of memory. Every register, cache, and flip-flop in the machine descends from this loop.',
  inputs: 'Two active-low control lines: S̄ (set, pull low to write 1) and R̄ (reset, pull low to write 0). When both are HIGH, the latch holds.',
  outputs: 'Two complementary bits: Q (the stored value) and Q̄ (its inverse). They stay locked even after the inputs return to HOLD — that\'s the bit being remembered.',
};

export const latchSpotlight: Spotlight = {
  title: 'An SR latch',
  subtitle: '2× NAND, cross-coupled — the birth of memory',
  body:
    "Two NAND gates, each feeding one of the other's inputs. That feedback loop has TWO stable states (Q=0 and Q=1); a brief pulse on S̄ or R̄ flips between them, and the latch stays in whichever state you last wrote. Click either NAND to drill into the gate.",
};

export const nand1Spotlight: Spotlight = {
  title: 'NAND gate',
  subtitle: 'Y = NOT(A AND B) — the universal logic primitive',
  body:
    "A NAND gate outputs 0 only when both inputs are 1; otherwise it outputs 1. Four CMOS transistors compute this: a PMOS pull-up network ties Y to Vdd whenever either input is 0, and an NMOS pull-down chain only completes the path to GND when both inputs are 1. " +
    "Hold one input HIGH and the gate becomes NOT(other input) — that's how a single NAND doubles as an inverter. Every boolean function (AND, OR, XOR, full adders, memory) reduces to a tree of these. Click any transistor to drill in.",
  parentMap: 'From the latch: A = S̄ · B = Q̄ · Y = Q.',
};

export const nand2Spotlight: Spotlight = {
  title: 'NAND gate',
  subtitle: 'Y = NOT(A AND B) — the universal logic primitive',
  body:
    "A NAND gate outputs 0 only when both inputs are 1; otherwise it outputs 1. Four CMOS transistors compute this: a PMOS pull-up network ties Y to Vdd whenever either input is 0, and an NMOS pull-down chain only completes the path to GND when both inputs are 1. " +
    "Hold one input HIGH and the gate becomes NOT(other input) — that's how a single NAND doubles as an inverter. Every boolean function (AND, OR, XOR, full adders, memory) reduces to a tree of these. Click any transistor to drill in.",
  parentMap: 'From the latch: A = R̄ · B = Q · Y = Q̄.',
};

export const gateLevelSummary: LevelSummary = {
  what: 'A NAND gate — 4 transistors in CMOS, computing Y = NOT(A AND B).',
  why: 'Universal logic primitive — every boolean function reduces to a tree of NANDs. Modern CPUs have billions.',
  inputs: 'Two binary signals A and B (each 0 or 1) coming from a previous logic stage.',
  outputs: 'One binary signal Y. Goes to the next gate\'s input. Y = 0 only when A = 1 AND B = 1; otherwise Y = 1.',
};

export const pmosLevelSummary: LevelSummary = {
  what: 'A P-channel MOSFET (PMOS) — a voltage-controlled switch with inverted polarity.',
  why: 'The pull-UP half of CMOS. Drives its drain toward Vdd when active. Pairing PMOS with NMOS is what makes static logic possible with near-zero idle current.',
  inputs: 'Gate (V_G) — the control signal. Source — typically tied to Vdd.',
  outputs: 'Drain — connected to source (≈ Vdd) when V_G is LOW; high-impedance ("floating") when V_G is HIGH.',
};

export const nmosLevelSummary: LevelSummary = {
  what: 'An N-channel MOSFET (NMOS) — the intuitive voltage-controlled switch.',
  why: 'The pull-DOWN half of CMOS. Drives its drain toward GND when active. Originally the only kind in early NMOS-only logic; CMOS pairs it with a PMOS.',
  inputs: 'Gate (V_G) — control signal. Source — typically tied to GND.',
  outputs: 'Drain — connected to source (≈ GND) when V_G is HIGH; floating when V_G is LOW.',
};

export const compareLevelSummary: LevelSummary = {
  what: 'Two complementary MOSFETs side-by-side: NMOS (active HIGH) and PMOS (active LOW).',
  why: 'The "C" in CMOS. Their complementary behavior means at most one is conducting at a time — that\'s what kills static current.',
  inputs: 'The SAME V_G drives both gate terminals.',
  outputs: 'Two drain potentials — they invert OPPOSITELY as V_G flips.',
};

export const gateSpotlight: Spotlight = {
  title: 'A logic gate',
  subtitle: '4× [T] wired together',
  body:
    "A small group of transistors that computes a boolean function. " +
    "This NAND has 4: 2 PMOS pulling up to Vdd, 2 NMOS pulling down to GND. " +
    "Click any to fly into it.",
};

export const transistorDefaultSpotlight: Spotlight = {
  title: 'NMOS vs PMOS',
  subtitle: 'two complementary switches',
  body:
    "Two MOSFETs side by side, driven by the SAME V_G. Their channels invert OPPOSITELY: " +
    "NMOS conducts when V_G = 1; PMOS conducts when V_G = 0. " +
    "Pairing them is what CMOS means.",
};

export const pmosSpotlight: Spotlight = {
  title: 'PMOS — active LOW',
  subtitle: "you arrived here by clicking a P_ transistor",
  body:
    "P-channel MOSFET. The channel inverts (conducts) when V_G = 0 — opposite of NMOS. " +
    "Used as a PULL-UP: when on, it connects its node to Vdd. " +
    "Tick the clock and watch — the channel glows when V_G drops to 0.",
};

export const nmosSpotlight: Spotlight = {
  title: 'NMOS — active HIGH',
  subtitle: "you arrived here by clicking an N_ transistor",
  body:
    "N-channel MOSFET. The channel inverts (conducts) when V_G = 1 — the intuitive case. " +
    "Used as a PULL-DOWN: when on, it connects its node to GND. " +
    "Tick the clock and watch — the channel glows when V_G goes to 1.",
};

export const partSpotlights: Record<Exclude<ElectronsPart, null>, Spotlight> = {
  gate: {
    title: 'Gate (terminal)',
    subtitle: 'polysilicon — the control input',
    body:
      "Polysilicon — heavily-doped silicon, so it conducts. Holds the control voltage V_G. " +
      "When high, its electric field reaches through the oxide and inverts the silicon below from p-type to n-type — opening a channel between source and drain.",
  },
  oxide: {
    title: 'Gate oxide',
    subtitle: 'silicon dioxide — the insulator',
    body:
      "SiO₂, ~1–3 nm thin. The gate voltage creates a field through the oxide, but no current flows through it. " +
      "That's why this is a field-effect transistor: the gate doesn't touch the channel — it controls it from above through pure electrostatics.",
  },
  source: {
    title: 'Source (n+)',
    subtitle: 'reservoir of mobile electrons',
    body:
      "Heavily n-doped silicon — laced with phosphorus or arsenic so it has an excess of mobile electrons. " +
      "When the channel opens, electrons enter from here.",
  },
  drain: {
    title: 'Drain (n+)',
    subtitle: 'where current exits',
    body:
      "Same n+ silicon as the source, on the other side. A small voltage V_DS between source and drain creates the field that pulls electrons across the now-conducting channel.",
  },
  substrate: {
    title: 'Substrate (p-type bulk)',
    subtitle: 'the silicon body — default OFF state',
    body:
      "Lightly p-doped silicon. By default the region under the oxide is p-type — electrons can't flow from the n+ source to the n+ drain because of the p-region in between. " +
      "The gate field temporarily inverts that region. That's the whole trick.",
  },
  channel: {
    title: 'Channel (inversion layer)',
    subtitle: 'the conducting bridge that forms when V_G crosses Vth',
    body:
      "A thin (~1–3 nm) sheet at the silicon-oxide interface. When V_G goes past the threshold V_th, the gate's electric field pulls minority carriers into this sheet, FLIPPING its type (p→n in NMOS, n→p in PMOS). " +
      "When the channel exists, source and drain are connected. When V_G drops below V_th, the channel disappears and the device is OFF.",
  },
  contact: {
    title: 'Metal contact',
    subtitle: 'how the transistor wires up to the next layer',
    body:
      "Tungsten or copper plug that connects the doped silicon (or polysilicon) underneath to the metal layers above. Without these, the device is unwired silicon — no signals in or out. " +
      "Modern processes have 10+ stacked metal layers connected by vias; the contacts you see here are the very first interface between silicon and the wiring above.",
  },
};
