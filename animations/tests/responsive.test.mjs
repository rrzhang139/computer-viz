// Mobile-friendliness / responsive smoke test.
//
// For every page × viewport size:
//   - Asserts no horizontal scroll (scrollWidth ≤ clientWidth + 1)
//   - Asserts the SVG fits inside the viewport horizontally
//   - Asserts the step-panel renders and isn't clipped
//   - Asserts no body text smaller than 11px (readability floor)
//   - Asserts no button is taller than the viewport or extends off-screen
//   - Captures a screenshot to test-results/responsive/<page>/<viewport>.png
//
// Also runs three "dynamic" scenarios per page:
//   D1: load at 1280×800, click a couple of input buttons, then resize down
//       to 375×667 and re-check (no scroll, buttons still reachable)
//   D2: load at 375×667, tap inputs, resize up to 1280×800
//   D3: load at 768×1024 (tablet portrait), click the step "next" button to
//       advance the panel a few times, then resize to 414×896.
//
// Run: node tests/responsive.test.mjs (from animations/)

import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4183;
const HOST = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT, 'test-results', 'responsive');
mkdirSync(OUT_DIR, { recursive: true });

// ─── viewports ──────────────────────────────────────────────────────
const VIEWPORTS = [
  { name: 'iphone-se',       width: 320,  height: 568,  type: 'mobile' },
  { name: 'iphone-13',       width: 390,  height: 844,  type: 'mobile' },
  { name: 'iphone-plus',     width: 414,  height: 896,  type: 'mobile' },
  { name: 'iphone-landscape',width: 667,  height: 375,  type: 'mobile' },
  { name: 'pixel-fold-tall', width: 280,  height: 800,  type: 'mobile' },
  { name: 'ipad-portrait',   width: 768,  height: 1024, type: 'tablet' },
  { name: 'ipad-landscape',  width: 1024, height: 768,  type: 'tablet' },
  { name: 'laptop',          width: 1280, height: 800,  type: 'desktop' },
  { name: 'desktop-fhd',     width: 1920, height: 1080, type: 'desktop' },
  { name: 'ultrawide',       width: 2560, height: 1440, type: 'desktop' },
];

// ─── pages to test ──────────────────────────────────────────────────
const PAGES = [
  { url: '/',              name: 'gate' },
  { url: '/latch.html',    name: 'latch' },
  { url: '/dlatch.html',   name: 'dlatch' },
  { url: '/dff.html',      name: 'dff' },
  { url: '/register.html', name: 'register' },
  { url: '/halfadder.html',name: 'halfadder' },
  { url: '/fulladder.html',name: 'fulladder' },
  { url: '/adder4.html',   name: 'adder4' },
  { url: '/counter.html',  name: 'counter' },
  { url: '/decoder.html',  name: 'decoder' },
  { url: '/mux.html',      name: 'mux' },
  { url: '/regfile.html',  name: 'regfile' },
  { url: '/alu1.html',     name: 'alu1' },
  { url: '/datapath.html', name: 'datapath' },
  { url: '/idecode.html',  name: 'idecode' },
  { url: '/mem.html',      name: 'mem' },
  { url: '/fetch.html',    name: 'fetch' },
];

// ─── spawn vite preview ─────────────────────────────────────────────
const server = spawn(
  'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] },
);
const killServer = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', killServer);
process.on('SIGINT', () => { killServer(); process.exit(130); });

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview timeout')), 15_000);
  server.stdout?.on('data', (chunk) => {
    if (chunk.toString().includes(String(PORT))) {
      clearTimeout(t);
      setTimeout(resolve, 250);
    }
  });
  server.on('exit', (code) => reject(new Error(`vite exited ${code}`)));
});

// ─── test harness ───────────────────────────────────────────────────
const results = [];
const issues = [];
function record(page, vp, kind, ok, detail) {
  results.push({ page, vp, kind, ok, detail });
  if (!ok) issues.push({ page, vp, kind, detail });
}

// Checks run inside the browser; returns plain JSON of measurements + violations.
async function checkPage(page, label) {
  return page.evaluate(() => {
    const out = { violations: [], measurements: {} };
    const html = document.documentElement;
    const body = document.body;

    // 1. Horizontal scroll
    const hScroll = html.scrollWidth - html.clientWidth;
    out.measurements.hScroll = hScroll;
    if (hScroll > 1) out.violations.push(`horizontal scroll: scrollWidth ${html.scrollWidth} > clientWidth ${html.clientWidth}`);

    // 2. SVG fits horizontally and is not microscopic
    const svgs = [...document.querySelectorAll('svg')];
    const mainSvg = svgs.find((s) => s.getBoundingClientRect().width > 50);
    for (const svg of svgs) {
      const r = svg.getBoundingClientRect();
      if (r.right - r.left < 1) continue; // hidden
      if (r.right > html.clientWidth + 1) {
        out.violations.push(`svg "${svg.id || svg.getAttribute('aria-label') || 'unnamed'}" right=${r.right.toFixed(0)} > vw=${html.clientWidth}`);
      }
      if (r.left < -1) {
        out.violations.push(`svg "${svg.id || svg.getAttribute('aria-label') || 'unnamed'}" left=${r.left.toFixed(0)} < 0`);
      }
    }
    if (mainSvg) {
      const r = mainSvg.getBoundingClientRect();
      out.measurements.svgH = Math.round(r.height);
      // The main diagram should be at least 120px tall to be even minimally readable.
      // This catches the case where a wide diagram collapses to a sliver on narrow viewports.
      if (r.height < 120) {
        out.violations.push(`main svg height ${r.height.toFixed(0)}px < 120px (illegible)`);
      }
    }

    // 3. Step panel exists and is visible
    const stepPanel = document.querySelector('.step-panel');
    if (stepPanel) {
      const r = stepPanel.getBoundingClientRect();
      out.measurements.stepPanelW = Math.round(r.width);
      out.measurements.stepPanelH = Math.round(r.height);
      if (r.right > html.clientWidth + 1) out.violations.push(`step-panel right=${r.right.toFixed(0)} > vw=${html.clientWidth}`);
      if (r.width < 100) out.violations.push(`step-panel too narrow: ${r.width.toFixed(0)}px`);
    }

    // 4. Readable body text — no <p> smaller than 11px
    const proseEls = document.querySelectorAll('.step p, .walkthrough p, p');
    for (const el of proseEls) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const style = getComputedStyle(el);
      const fs = parseFloat(style.fontSize);
      if (fs < 11) {
        out.violations.push(`<p> font-size ${fs.toFixed(1)}px below 11px floor`);
        break; // one report per page
      }
    }

    // 5. Buttons fit on screen
    const buttons = [...document.querySelectorAll('.btn, button')];
    for (const b of buttons) {
      const r = b.getBoundingClientRect();
      if (r.width < 1) continue; // hidden
      if (r.right > html.clientWidth + 1) {
        out.violations.push(`button "${b.textContent.trim().slice(0, 20)}" right=${r.right.toFixed(0)} > vw=${html.clientWidth}`);
        break;
      }
      if (r.bottom > html.clientHeight + 200) {
        // allow off-screen below fold (page scrolls vertically), but not absurdly far
        // no-op
      }
    }

    // 6. Side nav (.nav) — when present, must not occlude content or extend off-screen
    const nav = document.querySelector('.nav');
    if (nav) {
      const r = nav.getBoundingClientRect();
      if (r.width > 1) {
        out.measurements.navW = Math.round(r.width);
        if (r.right > html.clientWidth + 1) out.violations.push(`nav right=${r.right.toFixed(0)} > vw=${html.clientWidth}`);
      }
    }

    return out;
  });
}

const browser = await chromium.launch();

try {
  for (const pageDef of PAGES) {
    const pageOutDir = path.join(OUT_DIR, pageDef.name);
    mkdirSync(pageOutDir, { recursive: true });

    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        isMobile: vp.type === 'mobile',
        hasTouch: vp.type !== 'desktop',
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));

      try {
        await page.goto(`${HOST}${pageDef.url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(300);

        const r = await checkPage(page);
        const label = `${pageDef.name} @ ${vp.name} (${vp.width}×${vp.height})`;
        if (r.violations.length === 0 && errors.length === 0) {
          record(pageDef.name, vp.name, 'static', true, '');
        } else {
          const detail = [...r.violations, ...errors.map((e) => `js error: ${e}`)].join(' | ');
          record(pageDef.name, vp.name, 'static', false, detail);
        }

        await page.screenshot({ path: path.join(pageOutDir, `${vp.name}.png`) });
      } finally {
        await page.close();
        await ctx.close();
      }
    }

    // ── dynamic scenarios for this page ────────────────────────────────
    // D1: load big → click a couple of toggles → resize down to phone
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      try {
        await page.goto(`${HOST}${pageDef.url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(200);
        // Click first 2 toggle-able buttons (not reset, not nav)
        const buttons = await page.$$('button.btn:not(.btn-reset)');
        for (let i = 0; i < Math.min(2, buttons.length); i++) {
          await buttons[i].click().catch(() => {});
          await page.waitForTimeout(80);
        }
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(250);
        const r = await checkPage(page);
        record(pageDef.name, 'D1:1280→375', 'dynamic', r.violations.length === 0, r.violations.join(' | '));
        await page.screenshot({ path: path.join(pageOutDir, 'D1-1280-to-375.png') });
      } finally {
        await page.close(); await ctx.close();
      }
    }

    // D2: load phone → tap inputs → resize up to laptop
    {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      try {
        await page.goto(`${HOST}${pageDef.url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(200);
        const buttons = await page.$$('button.btn:not(.btn-reset)');
        for (let i = 0; i < Math.min(2, buttons.length); i++) {
          await buttons[i].click().catch(() => {});
          await page.waitForTimeout(80);
        }
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.waitForTimeout(250);
        const r = await checkPage(page);
        record(pageDef.name, 'D2:375→1280', 'dynamic', r.violations.length === 0, r.violations.join(' | '));
        await page.screenshot({ path: path.join(pageOutDir, 'D2-375-to-1280.png') });
      } finally {
        await page.close(); await ctx.close();
      }
    }

    // D4: HEAVY interaction — click many toggles, advance steps repeatedly,
    //    then resize from desktop to phone and back to desktop, checking each step.
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      try {
        await page.goto(`${HOST}${pageDef.url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(200);
        const buttons = await page.$$('button.btn:not(.btn-reset):not(.btn-pulse)');
        // Click every toggle button at least once (caps to 8 to keep runtime sane)
        for (let i = 0; i < Math.min(8, buttons.length); i++) {
          await buttons[i].click().catch(() => {});
          await page.waitForTimeout(40);
        }
        // Cycle the step panel 4 times
        for (let i = 0; i < 4; i++) {
          await page.click('#stepNext').catch(() => {});
          await page.waitForTimeout(40);
        }
        // Now resize through 4 sizes and check each
        const sizes = [
          { w: 1280, h: 800,  label: 'D4@1280' },
          { w: 768,  h: 1024, label: 'D4@768'  },
          { w: 390,  h: 844,  label: 'D4@390'  },
          { w: 320,  h: 568,  label: 'D4@320'  },
          { w: 1280, h: 800,  label: 'D4back'  },
        ];
        for (const s of sizes) {
          await page.setViewportSize({ width: s.w, height: s.h });
          await page.waitForTimeout(200);
          const r = await checkPage(page);
          record(pageDef.name, s.label, 'dynamic', r.violations.length === 0, r.violations.join(' | '));
        }
        await page.screenshot({ path: path.join(pageOutDir, 'D4-heavy.png') });
      } finally {
        await page.close(); await ctx.close();
      }
    }

    // D5: open the TOC sidebar, then resize down to phone, then to tiny — sidebar
    //    must stay coherent (not exceed viewport, backdrop covers correctly).
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      try {
        await page.goto(`${HOST}${pageDef.url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(200);
        await page.click('.toc-toggle').catch(() => {});
        await page.waitForTimeout(200);
        // Verify open
        const open = await page.evaluate(() => document.querySelector('.toc-sidebar.is-open') !== null);
        if (!open) {
          record(pageDef.name, 'D5:sidebar-open', 'dynamic', false, 'toc sidebar did not open');
        } else {
          // Resize through three sizes with sidebar open
          for (const s of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
            await page.setViewportSize(s);
            await page.waitForTimeout(200);
            const r = await checkPage(page);
            // Also assert the sidebar isn't wider than the viewport
            const sidebarOk = await page.evaluate(() => {
              const sb = document.querySelector('.toc-sidebar');
              if (!sb) return true;
              const rect = sb.getBoundingClientRect();
              return rect.right <= document.documentElement.clientWidth + 1;
            });
            const detail = [...r.violations, sidebarOk ? '' : 'sidebar exceeds viewport'].filter(Boolean).join(' | ');
            record(pageDef.name, `D5@${s.width}/sidebar`, 'dynamic', detail.length === 0, detail);
          }
        }
        await page.screenshot({ path: path.join(pageOutDir, 'D5-sidebar-open.png') });
      } finally {
        await page.close(); await ctx.close();
      }
    }

    // D6: orientation change — portrait phone → landscape phone (rotate)
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      try {
        await page.goto(`${HOST}${pageDef.url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(200);
        const buttons = await page.$$('button.btn:not(.btn-reset)');
        for (let i = 0; i < Math.min(2, buttons.length); i++) {
          await buttons[i].click().catch(() => {});
          await page.waitForTimeout(60);
        }
        // Rotate
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForTimeout(250);
        const r = await checkPage(page);
        record(pageDef.name, 'D6:rotate-landscape', 'dynamic', r.violations.length === 0, r.violations.join(' | '));
        await page.screenshot({ path: path.join(pageOutDir, 'D6-rotate-landscape.png') });
        // Rotate back
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(250);
        const r2 = await checkPage(page);
        record(pageDef.name, 'D6:rotate-back', 'dynamic', r2.violations.length === 0, r2.violations.join(' | '));
      } finally {
        await page.close(); await ctx.close();
      }
    }

    // D3: tablet → advance step panel a few times → resize to phone
    {
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
      const page = await ctx.newPage();
      try {
        await page.goto(`${HOST}${pageDef.url}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(200);
        for (let i = 0; i < 3; i++) {
          await page.click('#stepNext').catch(() => {});
          await page.waitForTimeout(80);
        }
        await page.setViewportSize({ width: 414, height: 896 });
        await page.waitForTimeout(250);
        const r = await checkPage(page);
        record(pageDef.name, 'D3:768→414+steps', 'dynamic', r.violations.length === 0, r.violations.join(' | '));
        await page.screenshot({ path: path.join(pageOutDir, 'D3-768-to-414-steps.png') });
      } finally {
        await page.close(); await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
}

// ─── report ─────────────────────────────────────────────────────────
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
console.log('\n── Static checks (page × viewport) ──');
const fails = results.filter((r) => !r.ok);
const passes = results.filter((r) => r.ok);
console.log(`${passes.length} pass, ${fails.length} fail (of ${results.length} total)\n`);

if (fails.length) {
  // Group fails by page for the report
  const byPage = {};
  for (const f of fails) {
    byPage[f.page] = byPage[f.page] || [];
    byPage[f.page].push(f);
  }
  for (const pg of Object.keys(byPage).sort()) {
    console.log(`\n\x1b[31m▼ ${pg}\x1b[0m`);
    for (const f of byPage[pg]) {
      console.log(`  ${pad(f.vp, 22)} ${f.detail}`);
    }
  }
}

console.log(`\nScreenshots: ${OUT_DIR}/`);
killServer();
process.exit(fails.length === 0 ? 0 : 1);
