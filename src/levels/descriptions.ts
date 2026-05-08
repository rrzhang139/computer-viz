// Contextual descriptions shown in the right-toolbar "Spotlight" card.
// Each level has a default story (so landing makes sense without clicking),
// and the Electrons level has per-part definitions tied to the part picker.
//
// Keep titles short. Body copy is ~2-3 sentences — long enough to ground the
// concept, short enough to read at a glance.

export type ElectronsPart = 'gate' | 'oxide' | 'source' | 'drain' | 'substrate' | null;

export interface Spotlight {
  title: string;
  subtitle: string;
  body: string;
}

export const transistorSpotlight: Spotlight = {
  title: 'A row of switches',
  subtitle: '4× [T] — the smallest digital primitive',
  body:
    "A transistor is a voltage-controlled switch. Modern chips have billions. " +
    "Click any one to fly the camera in and watch its carriers — actual electrons — drift across the channel.",
};

export const electronsDefaultSpotlight: Spotlight = {
  title: 'Why electrons move',
  subtitle: "this is what 'on' means",
  body:
    "Raise V_G → the gate's electric field pulls electrons from the n+ source into a thin channel under the oxide. " +
    "They drift right to the drain. That's a logical 1. " +
    "Lower V_G → no channel, no flow. That's a 0. " +
    "Every binary value is built from this.",
};

export const partSpotlights: Record<Exclude<ElectronsPart, null>, Spotlight> = {
  gate: {
    title: 'Gate',
    subtitle: 'polysilicon — the control terminal',
    body:
      "Polysilicon — heavily-doped silicon, so it conducts. Holds the control voltage V_G. " +
      "When high, its electric field reaches through the oxide and inverts the silicon below from p-type to n-type — opening a channel for electrons.",
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
    subtitle: 'electron reservoir',
    body:
      "Heavily n-doped silicon — silicon laced with phosphorus (or arsenic) so it has an excess of mobile electrons. " +
      "When the channel opens, electrons enter the channel from here.",
  },
  drain: {
    title: 'Drain (n+)',
    subtitle: 'electron exit',
    body:
      "Same n+ silicon as the source, on the other side. A small voltage V_DS between source and drain creates the field that pulls electrons across the now-conducting channel.",
  },
  substrate: {
    title: 'Substrate (p-type bulk)',
    subtitle: 'silicon body — the default state',
    body:
      "Lightly p-doped silicon. By default the region under the oxide is p-type — electrons can't flow from the n+ source to the n+ drain because of the p-region in between. " +
      "The gate field temporarily inverts that region. That's the whole trick.",
  },
};
