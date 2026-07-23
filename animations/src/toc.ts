// Toggle-expandable table-of-contents sidebar, injected into every page.
// Two categories sorted bottom-up by hierarchy:
//   - combinational logic: NAND → half adder → full adder → 4-bit adder
//   - memory components:   SR latch → D latch → DFF → register

import { initPinLabels } from './pinLabels';

type Entry = { href: string; label: string; tag: string; children?: Entry[] };

const COMBINATIONAL: Entry[] = [
  { href: "/",               label: "NAND gate",   tag: "1" },
  { href: "/halfadder.html", label: "half adder",  tag: "2" },
  { href: "/fulladder.html", label: "full adder",  tag: "3" },
  { href: "/adder4.html",    label: "4-bit adder", tag: "4" },
];

const MEMORY: Entry[] = [
  { href: "/latch.html",    label: "SR latch", tag: "1" },
  { href: "/dlatch.html",   label: "D latch",  tag: "2" },
  { href: "/dff.html",      label: "DFF",      tag: "3" },
  { href: "/register.html", label: "register", tag: "4" },
];

const DATAPATH: Entry[] = [
  { href: "/counter.html",  label: "program counter", tag: "1" },
  { href: "/decoder.html",  label: "2-to-4 decoder",  tag: "2" },
  { href: "/mux.html",      label: "4-to-1 MUX",      tag: "3" },
  { href: "/regfile.html",  label: "register file",   tag: "4" },
  // The canonical ALU is the 1-bit slice (the true design unit; widen by
  // stacking). The 4-bit /alu.html still builds but is unpinned from the tour.
  { href: "/alu1.html",     label: "ALU",             tag: "5" },
  { href: "/datapath.html", label: "datapath",        tag: "6" },
  { href: "/mem.html",      label: "memory",          tag: "7" },
  { href: "/fetch.html",    label: "fetch (PC + mem)", tag: "8" },
  // The CPU page is a hub: every block on it is a live drill into the page that
  // builds it. The dropdown lists those component subpages (each is also the
  // block's hover preview), so you can jump straight to any stage.
  {
    href: "/cpu.html", label: "CPU · R-type (registers only)", tag: "9", children: [
      { href: "/cpu.html",     label: "overview",            tag: "·" },
      { href: "/counter.html", label: "PC · program counter", tag: "a" },
      { href: "/mem.html",     label: "instruction memory",   tag: "b" },
      { href: "/idecode.html", label: "instruction decoder",  tag: "c" },
      { href: "/ctrlunit.html", label: "control unit",         tag: "c" },
      { href: "/regfile.html", label: "register file",        tag: "d" },
      { href: "/alu1.html",    label: "ALU",                  tag: "e" },
    ],
  },
  // The load/store CPU = the R-type core plus a data memory and a revived
  // write-back MUX (it now chooses ALU-result vs. loaded data).
  {
    href: "/cpu_ldst.html", label: "CPU · load/store (lw/sw)", tag: "10", children: [
      { href: "/cpu_ldst.html", label: "overview",            tag: "·" },
      { href: "/counter.html",  label: "PC · program counter", tag: "a" },
      { href: "/mem.html",      label: "instruction memory",   tag: "b" },
      { href: "/idecode.html",  label: "instruction decoder",  tag: "c" },
      { href: "/ctrlunit.html",  label: "control unit",         tag: "c" },
      { href: "/regfile.html",  label: "register file",        tag: "d" },
      { href: "/alu1.html",     label: "ALU",                  tag: "e" },
      { href: "/dmem.html",     label: "data memory",          tag: "f" },
      { href: "/mux.html",      label: "write-back MUX",       tag: "g" },
    ],
  },
  // The branch CPU = the load/store core plus a PC-source MUX and the taken
  // logic — the machine chooses its next instruction.
  {
    href: "/cpu_branch.html", label: "CPU · branch (beq)", tag: "11", children: [
      { href: "/cpu_branch.html", label: "overview",            tag: "·" },
      { href: "/pcsrc.html",      label: "PCSrc · branch decision", tag: "!" },
      { href: "/branchpc.html",   label: "PC · +1 & branch select", tag: "a" },
      { href: "/mem.html",        label: "instruction memory",   tag: "b" },
      { href: "/idecode.html",    label: "instruction decoder",  tag: "c" },
      { href: "/ctrlunit.html",    label: "control unit",         tag: "c" },
      { href: "/regfile.html",    label: "register file",        tag: "d" },
      { href: "/alu1.html",       label: "ALU",                  tag: "e" },
      { href: "/dmem.html",       label: "data memory",          tag: "f" },
      { href: "/mux.html",        label: "write-back MUX",       tag: "g" },
    ],
  },
];

const CSS = `
/* Hide the legacy top nav — the sidebar TOC replaces it. */
.nav { display: none !important; }

.toc-toggle {
  position: fixed; top: 12px; left: 12px; z-index: 60;
  width: 38px; height: 38px;
  background: #141414; color: #cccccc;
  border: 1px solid #2a2a2a; border-radius: 8px;
  font-family: ui-monospace, monospace; font-size: 18px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.toc-toggle:hover { color: var(--on, #EF9F27); border-color: #3a3a3a; }
.toc-toggle:focus-visible { outline: 2px solid var(--on, #EF9F27); outline-offset: 2px; }

.toc-backdrop {
  position: fixed; inset: 0; z-index: 55;
  background: rgba(0,0,0,0.5);
  opacity: 0; pointer-events: none;
  transition: opacity 180ms ease;
}
.toc-backdrop.is-open { opacity: 1; pointer-events: auto; }

.toc-sidebar {
  position: fixed; top: 0; left: 0; bottom: 0; z-index: 58;
  width: 280px; max-width: 86vw;
  background: #0f0f0f;
  border-right: 1px solid #1f1f1f;
  padding: 60px 18px 20px;
  transform: translateX(-100%);
  transition: transform 220ms ease;
  overflow-y: auto;
  box-shadow: 6px 0 24px rgba(0,0,0,0.5);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  box-sizing: border-box;
}
.toc-sidebar.is-open { transform: translateX(0); }

.toc-title {
  color: #666;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin: 0 0 18px;
}

.toc-section { margin-bottom: 22px; }
.toc-section-head {
  color: var(--on, #EF9F27);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #1f1f1f;
}

.toc-list { list-style: none; margin: 0; padding: 0; }
.toc-list li { margin: 0; }
.toc-list a {
  display: flex; align-items: baseline; gap: 10px;
  padding: 8px 10px;
  color: #aaa; text-decoration: none;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid transparent;
}
.toc-list a:hover { color: #fff; background: #181818; }
.toc-list a[aria-current="page"] {
  color: var(--on, #EF9F27);
  background: #1a1410;
  border-color: #2a1f12;
}
.toc-list .toc-tag {
  color: #555; font-size: 11px;
  width: 14px; flex: 0 0 14px;
}
.toc-list a[aria-current="page"] .toc-tag { color: var(--on, #EF9F27); }

/* Expandable CPU dropdown */
.toc-drop { margin: 0; }
.toc-summary {
  display: flex; align-items: baseline; gap: 10px;
  padding: 8px 10px; color: #aaa; font-size: 13px;
  border-radius: 6px; cursor: pointer; list-style: none;
}
.toc-summary::-webkit-details-marker { display: none; }
.toc-summary::after { content: "▸"; margin-left: auto; color: #555; font-size: 10px; }
details[open] > .toc-summary::after { content: "▾"; color: var(--on, #EF9F27); }
.toc-summary:hover { color: #fff; background: #181818; }
.toc-sublist { margin: 2px 0 6px 12px; padding-left: 8px; border-left: 1px solid #1f1f1f; }
.toc-sublist a { font-size: 12.5px; }

@media (max-width: 600px) {
  .toc-toggle { top: 10px; left: 10px; width: 40px; height: 40px; }
  .toc-sidebar { width: 260px; padding-top: 64px; }
}

/* Page name injected into the bottom panel's step-meta bar ("D LATCH · 1 / 6"). */
.step-meta .step-page-name { color: var(--on, #EF9F27); }
.step-meta .step-page-sep { color: #444; margin: 0 2px; }
`;

function pathMatches(href: string, path: string): boolean {
  if (href === "/") return path === "/" || path === "/index.html" || path === "";
  return path === href || path === href.replace(/\.html$/, "");
}

// Canonical display name for a page, resolved from the same labels the TOC
// shows. Top-level entries win over dropdown children (e.g. /counter.html is
// "program counter", not the CPU dropdown's "PC · program counter").
export function pageTitle(path: string): string {
  const sections = [COMBINATIONAL, MEMORY, DATAPATH];
  for (const entries of sections) {
    for (const e of entries) if (pathMatches(e.href, path)) return e.label;
  }
  for (const entries of sections) {
    for (const e of entries) {
      for (const c of e.children ?? []) {
        if (c.label !== "overview" && pathMatches(c.href, path)) return c.label;
      }
    }
  }
  return path.replace(/^\//, "").replace(/\.html$/, "") || "index";
}

function renderEntry(e: Entry, currentPath: string, fromStem?: string): string {
  const active = pathMatches(e.href, currentPath);
  const aria = active ? ` aria-current="page"` : "";
  // Subpages of a lesson hub link WITH the lesson's drill context, so the
  // parent's prose stays locked in the step panel (steps.ts adoptParentSteps).
  const href = fromStem && !active && e.href !== `/${fromStem}.html`
    ? `${e.href}?from=${fromStem}` : e.href;
  const link = `<a href="${href}"${aria}><span class="toc-tag">${e.tag}.</span><span>${e.label}</span></a>`;
  if (!e.children) return `<li>${link}</li>`;
  // Expandable group: open when on this page or any of its subpages.
  const childActive = e.children.some((c) => pathMatches(c.href, currentPath));
  const open = active || childActive ? " open" : "";
  const stem = e.href.replace(/^\//, "").replace(/\.html$/, "") || "index";
  const kids = e.children.map((c) => renderEntry(c, currentPath, stem)).join("");
  return `<li><details class="toc-drop"${open}>` +
    `<summary class="toc-summary"><span class="toc-tag">${e.tag}.</span><span>${e.label}</span></summary>` +
    `<ul class="toc-list toc-sublist">${kids}</ul></details></li>`;
}

function renderSection(title: string, entries: Entry[], currentPath: string): string {
  const items = entries.map((e) => renderEntry(e, currentPath)).join("");
  return `
    <div class="toc-section">
      <div class="toc-section-head">${title}</div>
      <ul class="toc-list">${items}</ul>
    </div>
  `;
}

export function initToc() {
  if (document.querySelector(".toc-sidebar")) return;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const path = window.location.pathname;

  const toggle = document.createElement("button");
  toggle.className = "toc-toggle";
  toggle.setAttribute("aria-label", "Open table of contents");
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "☰";

  const backdrop = document.createElement("div");
  backdrop.className = "toc-backdrop";

  const sidebar = document.createElement("nav");
  sidebar.className = "toc-sidebar";
  sidebar.setAttribute("aria-label", "Table of contents");
  sidebar.innerHTML = `
    <div class="toc-title">computer-viz / contents</div>
    ${renderSection("combinational logic", COMBINATIONAL, path)}
    ${renderSection("memory components", MEMORY, path)}
    ${renderSection("datapath / control", DATAPATH, path)}
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);

  function setOpen(open: boolean) {
    sidebar.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.textContent = open ? "×" : "☰";
  }

  toggle.addEventListener("click", () => {
    setOpen(!sidebar.classList.contains("is-open"));
  });
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("is-open")) setOpen(false);
  });

  // Every page's bottom panel opens with the step counter ("1 / 6") but never
  // said WHICH page you're on. Prepend the page's canonical name so the bar
  // reads "D LATCH · 1 / 6" (step-meta CSS uppercases it). initToc is the one
  // init every page calls, so injecting here covers every page.
  const meta = document.querySelector(".step-meta");
  if (meta && !meta.querySelector(".step-page-name")) {
    const name = document.createElement("span");
    name.className = "step-page-name";
    const from = new URLSearchParams(window.location.search).get("from");
    name.textContent = from
      ? `${pageTitle(`/${from === "gate" ? "" : from + ".html"}`)} ▸ ${pageTitle(path)}`
      : pageTitle(path);
    const sep = document.createElement("span");
    sep.className = "step-page-sep";
    sep.textContent = " · ";
    meta.insertBefore(sep, meta.firstChild);
    meta.insertBefore(name, sep);
  }

  // initToc is the one init every page calls, so it's the canonical hook for
  // page-wide invariants: keep every terminal label clear of its pin + legible.
  initPinLabels();
}
