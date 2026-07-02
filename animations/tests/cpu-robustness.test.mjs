// cpu-robustness — adversarial checks on the CPU pages' interaction layer.
// Fast (one page-pair, ~5s); guards the failure modes a demo can't afford:
//
//   1. CLICK RACE — N rapid presses of "run instruction" during one clock
//      pulse must commit exactly ONE instruction (no double-execute, no
//      PC skip). Locked by the busy-guard in cpuShared.bindCpuControls.
//   2. SNAPSHOT TAMPERING — garbage in the sessionStorage snapshot (wrong
//      types, out-of-range, non-arrays) must degrade to seed state, never
//      to NaN/undefined leaking into the readout or array indexing.
//   3. MALFORMED data-hl — a bad token must degrade to "catches nothing";
//      it must never throw out of the click handler (CSS.escape path).
//
// Run: npm run test:cpu-robustness   (part of npm run test:all)

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4193;
const HOST = `http://localhost:${PORT}`;

let failures = 0;
const results = [];
function expect(label, ok, detail = '') {
  results.push({ ok, label, detail });
  if (!ok) failures++;
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: new URL('..', import.meta.url).pathname, stdio: ['ignore', 'pipe', 'pipe'] });
function killServer() { try { server.kill('SIGTERM'); } catch {} }
process.on('exit', killServer);
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite preview timeout')), 15000);
  server.stdout.on('data', (b) => {
    if (b.toString().includes('Local')) { clearTimeout(t); setTimeout(res, 300); }
  });
  server.on('exit', (code) => rej(new Error(`vite exited ${code}`)));
});

const browser = await chromium.launch();
const page = await browser.newPage();

console.log('\n── CPU robustness: race, tampering, malformed tokens ──');

for (const file of ['cpu.html', 'cpu_ldst.html']) {
  // 1. Click race.
  await page.goto(`${HOST}/${file}`);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);
  await page.click('#btnReset');
  await page.evaluate(() => {
    const b = document.getElementById('btnStep');
    b.click(); b.click(); b.click();
  });
  await page.waitForTimeout(900);
  const pc = await page.$eval('#rPc', (e) => e.textContent);
  expect(`${file}: triple-click runs exactly one instruction`, pc === '01',
    pc === '01' ? '' : `PC=${pc}, want 01 — pulse commits are racing`);

  // 2. Snapshot tampering (per-page key = filename without .html).
  const key = `computer-viz:${file.replace(/\.html$/, '')}`;
  await page.evaluate((k) => sessionStorage.setItem(k,
    JSON.stringify({ pc: 999, regs: ['x', { a: 1 }, 77, null], mem: 'garbage' })), key);
  await page.reload();
  await page.waitForTimeout(300);
  const regs = await page.$eval('#rRegs', (e) => e.textContent);
  const clean = /r0=[01] r1=[01] r2=[01] r3=[01]/.test(regs)
    && !regs.includes('NaN') && !regs.includes('undefined');
  expect(`${file}: corrupt snapshot degrades to seed state`, clean, clean ? '' : `readout: ${regs}`);

  // 3. Malformed data-hl tokens.
  await page.evaluate((k) => sessionStorage.removeItem(k), key);
  const noThrow = await page.evaluate(() => {
    try {
      const p = document.querySelector('.step p[data-hl]');
      if (!p) return true;
      p.setAttribute('data-hl', 'net:bad"name] open:1#$% box: junk pin:');
      p.click(); p.click();
      return true;
    } catch { return false; }
  });
  expect(`${file}: malformed data-hl degrades without throwing`, noThrow);
}

await browser.close();
killServer();

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
process.exit(failures ? 1 : 0);
