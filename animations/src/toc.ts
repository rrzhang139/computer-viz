// Toggle-expandable table-of-contents sidebar, injected into every page.
// Two categories sorted bottom-up by hierarchy:
//   - combinational logic: NAND → half adder → full adder → 4-bit adder
//   - memory components:   SR latch → D latch → DFF → register

type Entry = { href: string; label: string; tag: string };

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

@media (max-width: 600px) {
  .toc-toggle { top: 10px; left: 10px; width: 40px; height: 40px; }
  .toc-sidebar { width: 260px; padding-top: 64px; }
}
`;

function pathMatches(href: string, path: string): boolean {
  if (href === "/") return path === "/" || path === "/index.html" || path === "";
  return path === href || path === href.replace(/\.html$/, "");
}

function renderSection(title: string, entries: Entry[], currentPath: string): string {
  const items = entries
    .map((e) => {
      const active = pathMatches(e.href, currentPath);
      const aria = active ? ` aria-current="page"` : "";
      return `<li><a href="${e.href}"${aria}><span class="toc-tag">${e.tag}.</span><span>${e.label}</span></a></li>`;
    })
    .join("");
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
}
