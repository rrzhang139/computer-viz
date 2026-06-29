// Shared toolkit for the assembled-datapath pages (cpu, cpu_ldst).
//
// Each page hand-builds its own blocks + wiring, but the mechanics are
// identical: route Manhattan wires onto embedded child pins, drop connection
// dots, light nets/bodies/embeds to match state, and animate flow pulses on
// the conducting wires. `datapath(svg)` binds all of that to one <svg> and
// returns the toolkit; the page supplies the geometry and the signal model.

export type Bit = 0 | 1;
export type Pt = { x: number; y: number };
const SVG_NS = "http://www.w3.org/2000/svg";

// Point helpers: lane-x at p's y; lane-y at p's x (for Manhattan routing).
export const x = (n: number, p: Pt): Pt => ({ x: n, y: p.y });
export const y = (n: number, p: Pt): Pt => ({ x: p.x, y: n });

export function datapath(svg: SVGSVGElement) {
  const P = (p: Pt) => `${p.x},${p.y}`;

  // Drop a connection dot once per coordinate (dedup so shared endpoints don't
  // stack). Block-side wire endpoints get marked here; CPU-level source/sink
  // terminals carry their own dots in the page HTML.
  const marked = new Set<string>();
  function dot(p: Pt) {
    const key = `${Math.round(p.x)},${Math.round(p.y)}`;
    if (marked.has(key)) return;
    marked.add(key);
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("class", "pin"); c.setAttribute("cx", String(p.x)); c.setAttribute("cy", String(p.y)); c.setAttribute("r", "6");
    svg.appendChild(c);
  }

  // A labeled source terminal (dot + left-anchored label) for a tie-off / stub.
  function srcTerm(p: Pt, label: string) {
    dot(p);
    const t = document.createElementNS(SVG_NS, "text");
    t.setAttribute("class", "tlabel-small"); t.setAttribute("text-anchor", "end");
    t.setAttribute("x", String(p.x - 12)); t.setAttribute("y", String(p.y));
    t.textContent = label;
    svg.appendChild(t);
  }

  function setW(id: string, pts: Pt[]) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("points", pts.map(P).join(" "));
  }

  // Route a wire through an explicit point list; skips silently if any pin is
  // missing (so a half-wired layout degrades instead of throwing). Marks each
  // listed endpoint with a connection dot.
  function R(id: string, pts: (Pt | undefined)[], markEnds: Pt[] = []) {
    if (pts.some((p) => !p)) return;
    setW(id, pts as Pt[]);
    for (const m of markEnds) if (m) dot(m);
  }

  // A short labeled stub from `srcX` straight into one pin — for inactive /
  // tied-off MUX inputs that have no real driver.
  function stub(id: string, pin: Pt | undefined, label: string, srcX: number) {
    if (!pin) return;
    const src = { x: srcX, y: pin.y };
    R(id, [src, pin], [pin]);
    srcTerm(src, label);
  }

  // Flow pulses: a dashed overlay per page wire (skipping embeds). Call ONCE,
  // AFTER every R() has set its points — it snapshots each wire's geometry.
  let wires: SVGPolylineElement[] = [];
  const pulseFor = new Map<SVGPolylineElement, SVGPolylineElement>();
  function setupPulses() {
    wires = Array.from(svg.querySelectorAll<SVGPolylineElement>("polyline.wire")).filter((w) => !w.closest(".detailed"));
    for (const w of wires) {
      const p = document.createElementNS(SVG_NS, "polyline");
      p.setAttribute("class", "pulse");
      p.setAttribute("points", w.getAttribute("points") || "");
      p.setAttribute("data-on", "0");
      const net = w.getAttribute("data-net");
      if (net) p.setAttribute("data-net", net);
      w.insertAdjacentElement("afterend", p);
      pulseFor.set(w, p);
    }
  }

  // Light every page wire on a net (and its pulse) to `on`.
  function setNet(net: string, on: number) {
    for (const w of wires) if (w.getAttribute("data-net") === net) {
      w.setAttribute("data-on", String(on));
      pulseFor.get(w)?.setAttribute("data-on", String(on));
    }
  }
  const setPin = (id: string, on: number) => document.getElementById(id)?.setAttribute("data-on", String(on));
  const setBody = (id: string, on: number) => document.getElementById(id)?.setAttribute("data-on", String(on));

  // Light an embedded child diagram to match state: wireMap by data-net,
  // bodyMap by the component id preserved as data-body during embedding.
  function lightEmbed(hostId: string, wireMap: Record<string, number>, bodyMap: Record<string, number> = {}) {
    const host = document.getElementById(hostId);
    if (!host) return;
    for (const net in wireMap)
      host.querySelectorAll<SVGElement>(`.wire[data-net="${net}"]`).forEach((el) => el.setAttribute("data-on", String(wireMap[net])));
    for (const id in bodyMap)
      host.querySelector<SVGElement>(`[data-body="${id}"]`)?.setAttribute("data-on", String(bodyMap[id]));
  }

  return { R, dot, srcTerm, stub, setupPulses, setNet, setPin, setBody, lightEmbed };
}
