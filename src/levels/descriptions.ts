// Contextual descriptions shown in the right-toolbar "Spotlight" card.
// Each level has a default story (so landing makes sense without clicking),
// and the Transistor level has per-part definitions tied to the part picker.

// Names refer to terminals / regions of one MOSFET — these are the part
// picker entries inside the Transistor level. (The "Gate" *level* — a logic
// gate built from many transistors — is a separate concept; don't confuse
// it with the *gate terminal* of one transistor.)
export type ElectronsPart =
  | 'gate'
  | 'oxide'
  | 'source'
  | 'drain'
  | 'substrate'
  | 'channel'
  | 'contact'
  | null;

export interface Spotlight {
  title: string;
  subtitle: string;
  body: string;
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
