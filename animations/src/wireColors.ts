// Per-symbol wire coloring for dense diagrams (CPU, datapath, …). When many
// wires run in parallel, a single accent colour makes them impossible to tell
// apart; here each signal/symbol gets its own hue, so you can trace a wire by
// colour. A coloured wire shows its hue ALWAYS — muted when idle, full + a
// matching glow when it carries a 1. Nets not in the map keep the monochrome
// --off/--on look, and embedded child previews (.detailed) are left untouched.
//
// applyWireColors(svg, map): map is net-name → CSS colour. Bits of one symbol
// share a colour (addr0/addr1 → the address hue). Call AFTER the page builds
// its .pulse overlays so the flowing dashes get coloured too.

type ColorMap = Record<string, string>;

export function applyWireColors(svg: SVGSVGElement, map: ColorMap) {
  ensureCss();
  svg.querySelectorAll<SVGElement>('.wire, .pulse').forEach((el) => {
    if (el.closest('.detailed')) return;            // embeds stay monochrome
    const net = el.getAttribute('data-net');
    const col = net ? map[net] : undefined;
    if (!col) return;
    el.classList.add('wire-colored');
    el.style.setProperty('--wire-col', col);
  });
  injectTermClasses(map);
}

// Single-source the prose↔wire colour link: emit a `.wt-<net>` text class per
// net so narrative terms can be tinted to match the wire they name, e.g.
// `<kbd class="wt-instr">instr</kbd>`. (Keys may include alias-only entries that
// no wire carries — they still produce a usable text class.)
function injectTermClasses(map: ColorMap) {
  const id = 'cv-wireterm-css';
  let css = '';
  for (const net of Object.keys(map)) {
    if (!/^[A-Za-z][\w-]*$/.test(net)) continue;
    // !important beats the more-specific `.step kbd { color: … }` base rule.
    css += `.wt-${net}{color:${map[net]} !important;}\n`;
  }
  let s = document.getElementById(id) as HTMLStyleElement | null;
  if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s); }
  s.textContent = (s.textContent || '') + css;
}

function ensureCss() {
  if (document.getElementById('cv-wirecolor-css')) return;
  const s = document.createElement('style');
  s.id = 'cv-wirecolor-css';
  s.textContent = `
.wire.wire-colored { stroke: var(--wire-col); stroke-opacity: 0.4; }
.wire.wire-colored[data-on="1"] { stroke: var(--wire-col); stroke-opacity: 1; filter: drop-shadow(0 0 5px var(--wire-col)); }
.pulse.wire-colored { stroke: var(--wire-col); }
`;
  document.head.appendChild(s);
}
