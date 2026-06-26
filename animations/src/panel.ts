// Step-panel: fixed-bottom explanation modal anchored to the bottom of the
// viewport. The canvas above auto-expands to fill the area between the page
// header and the top of this modal.
//
// Text stays at full readable size. When a step's content is taller than
// the panel, the BODIES area scrolls — we don't shrink the text. The user
// scrolls within the sidebar to read long passages.

const PANEL_HEIGHT_PX = 220;

const OVERRIDE_CSS = `
/* Fixed-bottom explanation modal. */
.step-panel {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  max-width: none !important;
  height: ${PANEL_HEIGHT_PX}px !important;
  border-radius: 16px 16px 0 0 !important;
  border: 1px solid #1f1f1f !important;
  border-bottom: none !important;
  padding: 18px 32px 20px !important;
  z-index: 40;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.55);
  box-sizing: border-box;
}

/* Readable, FIXED text — no auto-shrink. Long steps scroll. */
.step h3 { font-size: 19px !important; margin: 0 0 12px !important; }
.step p  { font-size: 18px !important; line-height: 1.55 !important; margin: 0 0 12px !important; }
.step p:last-child { margin-bottom: 0 !important; }
.step kbd { font-size: 15px !important; }
.step-meta { font-size: 14px !important; margin: 0 0 12px !important; }
.step-nav .btn { font-size: 14px !important; min-width: 96px !important; padding: 8px 16px !important; }

/* Make the bodies area SCROLLABLE when content overflows. */
.step-bodies {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  /* Make the scrollbar visible-but-subtle so users discover it. */
  scrollbar-width: thin;
  scrollbar-color: #2a2a2a transparent;
  /* Small bottom padding so the last line doesn't kiss the panel edge. */
  padding-right: 6px;
}
.step-bodies::-webkit-scrollbar { width: 8px; }
.step-bodies::-webkit-scrollbar-track { background: transparent; }
.step-bodies::-webkit-scrollbar-thumb {
  background: #2a2a2a;
  border-radius: 4px;
}
.step-bodies::-webkit-scrollbar-thumb:hover { background: #3a3a3a; }

/* Reserve space at the bottom so canvas content isn't hidden behind the
   fixed panel. Then let the SVG fill all remaining vertical space. */
body { padding-bottom: ${PANEL_HEIGHT_PX}px; }

.canvas-col { width: 100%; }
.canvas-col svg {
  max-height: calc(100vh - ${PANEL_HEIGHT_PX + 110}px) !important;
  min-height: 240px;
  height: auto !important;
  width: 100% !important;
}

@media (max-width: 900px) {
  .step-panel { padding: 14px 18px 16px !important; height: 240px !important; }
  body { padding-bottom: 240px; }
  .canvas-col svg {
    max-height: calc(100vh - 360px) !important;
    min-height: 200px;
    height: auto !important;
  }
}
@media (max-width: 600px) {
  .step-panel { height: 260px !important; }
  body { padding-bottom: 260px; }
  .step h3 { font-size: 17px !important; }
  .step p { font-size: 16px !important; }
  .canvas-col svg {
    max-height: calc(100vh - 380px) !important;
    min-height: 180px;
    height: auto !important;
  }
}
/* Landscape phone / short viewport: shrink panel so the diagram still has room.
   Also compress controls and readout — many-button pages (regfile, datapath)
   otherwise eat the entire short axis. */
@media (max-height: 500px) {
  .step-panel { height: 140px !important; padding: 8px 14px 10px !important; }
  body { padding-bottom: 140px; }
  .step h3 { font-size: 13px !important; margin: 0 0 5px !important; }
  .step p { font-size: 12px !important; line-height: 1.35 !important; margin: 0 0 5px !important; }
  .step-meta { font-size: 10px !important; margin: 0 0 5px !important; }
  .step-nav .btn { min-width: 70px !important; min-height: 32px !important; padding: 4px 10px !important; font-size: 12px !important; }
  .controls { gap: 6px !important; row-gap: 4px !important; padding: 0 !important; }
  .controls-row { gap: 5px !important; row-gap: 4px !important; }
  .controls .btn, .controls-row .btn {
    min-height: 32px !important; min-width: 44px !important;
    padding: 4px 8px !important; font-size: 11px !important;
  }
  .controls-row .label { font-size: 9px !important; min-width: auto !important; }
  .out-readout, .sel-readout {
    font-size: 10px !important; padding: 4px 10px !important; gap: 8px !important;
  }
  .canvas-col svg {
    max-height: calc(100vh - 200px) !important;
    min-height: 100px;
    height: auto !important;
  }
}
`;

function injectStyles() {
  if (document.getElementById('panel-overrides')) return;
  const style = document.createElement('style');
  style.id = 'panel-overrides';
  style.textContent = OVERRIDE_CSS;
  document.head.appendChild(style);
}

export function initPanel() {
  injectStyles();
  const panel = document.querySelector<HTMLElement>('.step-panel');
  if (!panel) return;
  const bodies = panel.querySelector<HTMLElement>('.step-bodies');
  if (!bodies) return;

  // When switching steps, reset the scroll position to the top so the
  // user starts at the heading of the new step (not wherever they last
  // scrolled in the previous step).
  const mo = new MutationObserver(() => {
    bodies.scrollTop = 0;
  });
  bodies.querySelectorAll<HTMLElement>('.step').forEach((s) => {
    mo.observe(s, { attributes: true, attributeFilter: ['hidden'] });
  });
}
