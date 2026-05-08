// Parchment palette — soft, warm, light. Used by the level scenes so the
// 3D views feel like an illuminated manuscript rather than a neon dashboard.

export const parchment = {
  bg: '#f1e7cd',           // cream paper
  bgDeep: '#e8dcb5',       // shadowed parchment
  ink: '#3d2f1e',          // dark sepia text + outlines
  inkSoft: '#6b5742',      // muted sepia for secondary text
  rule: '#c8b88a',         // hairline rule between blocks
  substrate: '#a89876',    // warm sepia silicon
  doped: '#7a8fa3',        // muted slate-blue for n+ regions
  oxide: '#c4d2dc',        // pale glass-blue
  gate: '#5a4030',         // ink-brown polysilicon
  gateOn: '#c97b53',       // soft terracotta when V_G high
  electron: '#d4a04a',     // gold-amber carriers
  electronGlow: '#f0c97a', // brighter halo
  contact: '#9c8b6e',      // muted bronze metal contacts
  highlight: '#a3493e',    // dim russet ring for active element
} as const;
