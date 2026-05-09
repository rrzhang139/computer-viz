// Contextual descriptions shown in the right-toolbar "Spotlight" card.
// Each level has a default story (so landing makes sense without clicking),
// and the Transistor level has per-part definitions tied to the part picker.

// Names refer to terminals / regions of one MOSFET — these are the part
// picker entries inside the Transistor level. (The "Gate" *level* — a logic
// gate built from many transistors — is a separate concept; don't confuse
// it with the *gate terminal* of one transistor.)
export type ElectronsPart = 'gate' | 'oxide' | 'source' | 'drain' | 'substrate' | null;

export interface Spotlight {
  title: string;
  subtitle: string;
  body: string;
}

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
    "Tick the clock to flip V_G — one channel lights up, the other goes dark. " +
    "Pairing them is what CMOS means.",
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
};
