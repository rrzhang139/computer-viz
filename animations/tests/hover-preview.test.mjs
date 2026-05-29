// hover-preview — enforces the connected-hover preview contract
// (CLAUDE.md rule 21) across EVERY animation page, so a new layer can't
// ship a drillable block that doesn't reveal the child's internals on hover.
//
// The invariant, stated behaviorally so it can't be faked:
//
//   For every drill target on every page — i.e. every `[id^="slot-"]`
//   whose computed cursor is `pointer` (the signal, locked by the
//   drilldown test, that clicking it navigates into a child page) —
//   hovering it MUST materialize a non-empty preview of that child's
//   internals (scene/mini elements), not just a highlight.
//
// Leaf-gate slots that have no child page (XOR/AND/OR) are `cursor:
// default` and are skipped — they are not drill targets.
//
// Why this gate exists: the preview is easy to forget when adding a
// layer (the page still "works" and drills on click), and every reviewer
// before this test had to catch it by eye. This makes it mechanical.
//
// Pages are DISCOVERED from the directory, so a newly-added *.html is
// covered automatically — no list to update.
//
// Run: npm run test:hover-preview   (part of npm run test:all)

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4187;
const HOST = `http://localhost:${PORT}`;

// A populated preview has many elements (observed range 11–53). Require a
// comfortable floor so a stray element can't satisfy the rule, but well
// below the smallest real preview.
const MIN_PREVIEW_ELEMENTS = 5;
// Selector for "this is a rendered child preview" — the scene/mini classes
// every preview uses, plus anything inside a `.detailed` group.
const PREVIEW_SELECTOR = '.detailed *, .wire-mini, [class*="-scene"] *, .mini-bg';

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

const pages = readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_'))
  .sort();

const server = spawn(
  'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
);
function killServer() { try { server.kill('SIGTERM'); } catch {} }
process.on('exit', killServer);

await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15000);
  server.stdout.on('data', (b) => {
    if (b.toString().includes('Local')) { clearTimeout(t); setTimeout(res, 400); }
  });
  server.on('exit', (code) => rej(new Error(`vite exited ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

console.log('\n── Hover-preview: every drillable block reveals child internals ──');

let checkedDrillTargets = 0;
for (const file of pages) {
  await page.goto(`${HOST}/${file}`);
  await page.waitForTimeout(200);
  const slots = await page.$$eval('[id^="slot-"]', (els) => els.map((e) => e.id));
  for (const id of slots) {
    const cursor = await page.$eval(`#${id}`, (e) => getComputedStyle(e).cursor).catch(() => '?');
    if (cursor !== 'pointer') continue;  // not a drill target — exempt
    checkedDrillTargets++;
    await page.hover(`#${id}`).catch(() => {});
    await page.waitForTimeout(140);
    const count = await page.$eval(
      `#${id}`,
      (e, sel) => e.querySelectorAll(sel).length,
      PREVIEW_SELECTOR,
    ).catch(() => -1);
    // Move the cursor away so the next hover starts clean.
    await page.mouse.move(5, 5);
    expect(
      `${file} #${id}: hover reveals preview (${count} els)`,
      count >= MIN_PREVIEW_ELEMENTS,
      count < MIN_PREVIEW_ELEMENTS
        ? `drillable block (cursor:pointer) showed ${count} preview els (< ${MIN_PREVIEW_ELEMENTS}). ` +
          `Add a connected-hover preview: wrap the block in .child-slot, add a ` +
          `<g class="detailed"> and mount the child's scene into it (see regfile.ts / mux.ts).`
        : '',
    );
  }
}

await browser.close();
killServer();

// Sanity: we actually exercised some drill targets (guards against the
// selector silently matching nothing if the id convention ever changes).
expect(`exercised drill targets across ${pages.length} pages`, checkedDrillTargets >= 10,
  checkedDrillTargets < 10 ? `only found ${checkedDrillTargets} — did the slot id convention change?` : '');

const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 64)}`;
  if (!r.ok && r.detail) line += `\n        ${r.detail}`;
  console.log(line);
}
console.log(`\n${failures === 0
  ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m'
  : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
process.exit(failures);
