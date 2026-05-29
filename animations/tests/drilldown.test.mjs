// End-to-end test for the drill-down feature across every parent → child
// pair in the project.
//
// Drill-down contract (one-way only, parent → child):
//   1. Parent builds /child.html?from=<parent>&which=<slot>&<state>
//      and navigates.
//   2. Child reads URL params on init, displays a "← back to" breadcrumb.
//   3. Child does NOT write back to the parent. Browser back restores the
//      parent's pre-drill state via sessionStorage snapshot.
//
// Run: npm run test (from animations/)

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = 4180;
const HOST = `http://localhost:${PORT}`;
const OUT_DIR = path.join(ROOT, 'test-results', 'drilldown');
mkdirSync(OUT_DIR, { recursive: true });

// ── Start vite preview ──────────────────────────────────────────────
const server = spawn(
  'npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] },
);
function killServer() { try { server.kill('SIGTERM'); } catch {} }
process.on('exit', killServer);
process.on('SIGINT', () => { killServer(); process.exit(130); });

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview timeout')), 15_000);
  server.stdout?.on('data', (chunk) => {
    if (chunk.toString().includes(String(PORT))) {
      clearTimeout(t);
      setTimeout(resolve, 200);
    }
  });
  server.on('exit', (code) => reject(new Error(`vite exited ${code}`)));
});

// ── Test harness ────────────────────────────────────────────────────
let failures = 0;
const results = [];
function expect(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  results.push({ ok, label, got, want });
  if (!ok) failures++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1700, height: 1100 } });
const page = await ctx.newPage();

// Helpers
const attr = (sel, name) => page.$eval(sel, (el, n) => el.getAttribute(n), name);
const wireOn = async (net) => attr(`[data-net="${net}"]`, 'data-on');
const btnOn = async (sel) => attr(sel, 'data-on');

async function clearSession() {
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
}

async function drill(slotSel) {
  // Any navigation with ?from= query param counts as a successful drill.
  await Promise.all([
    page.waitForURL(/\?from=/),
    page.click(slotSel),
  ]);
}

async function checkBreadcrumb(expectedText) {
  const el = await page.$('a[href="#"]');
  if (!el) {
    expect(`breadcrumb visible: ${expectedText}`, null, expectedText);
    return;
  }
  const text = await el.evaluate((e) => e.textContent);
  expect(`breadcrumb: ${expectedText}`, text, expectedText);
}

async function backAndExpectAlive(parentSel) {
  await page.goBack();
  await page.waitForSelector(parentSel);
}

try {
  // ════════════════════════════════════════════════════════════════
  // 1) latch → NAND
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 1) SR latch → NAND ──────────────────────────────');
  await page.goto(`${HOST}/latch.html`);
  await clearSession();
  // default: Sbar=1, Rbar=1, Q=0, QB=1 → N1.A=Sbar=1, N1.B=QB=1
  await drill('#slot-n1');
  await page.waitForSelector('#btnA');
  expect('N1 → /index.html ?from=latch', new URL(page.url()).searchParams.get('from'), 'latch');
  expect('N1 ?which=N1', new URL(page.url()).searchParams.get('which'), 'N1');
  expect('N1 ?A=1', new URL(page.url()).searchParams.get('A'), '1');
  expect('N1 ?B=1', new URL(page.url()).searchParams.get('B'), '1');
  expect('N1 btnA=1', await btnOn('#btnA'), '1');
  expect('N1 btnB=1', await btnOn('#btnB'), '1');
  await checkBreadcrumb('← back to latch · N1');
  await page.screenshot({ path: path.join(OUT_DIR, '01_latch_to_N1.png') });

  await backAndExpectAlive('#slot-n1');
  expect('latch back: Sbar=1', await btnOn('#btnS'), '1');

  // Toggle S, then N2
  await page.click('#btnS');
  await page.waitForTimeout(60);
  expect('latch Sbar=0 after click', await btnOn('#btnS'), '0');
  expect('latch Q lit',  await wireOn('Q'),  '1');
  expect('latch QB dark',await wireOn('QB'), '0');
  await drill('#slot-n2');
  expect('N2 ?which=N2', new URL(page.url()).searchParams.get('which'), 'N2');
  expect('N2 ?A=1 (Rbar)', new URL(page.url()).searchParams.get('A'), '1');
  expect('N2 ?B=1 (Q)',    new URL(page.url()).searchParams.get('B'), '1');
  await checkBreadcrumb('← back to latch · N2');

  await backAndExpectAlive('#slot-n1');
  expect('latch back: Sbar STILL 0 (snapshot)', await btnOn('#btnS'), '0');

  // ════════════════════════════════════════════════════════════════
  // 2) D latch → SR latch core
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 2) D latch → SR latch core ──────────────────────');
  await page.goto(`${HOST}/dlatch.html`);
  await clearSession();
  // default D=0, EN=0 → Sbar=1, Rbar=1
  await drill('#slot-latch');
  await page.waitForSelector('#btnS');
  expect('dlatch→latch from=dlatch', new URL(page.url()).searchParams.get('from'), 'dlatch');
  expect('dlatch→latch ?Sbar=1', new URL(page.url()).searchParams.get('Sbar'), '1');
  expect('dlatch→latch ?Rbar=1', new URL(page.url()).searchParams.get('Rbar'), '1');
  expect('SR latch btnS=1', await btnOn('#btnS'), '1');
  await checkBreadcrumb('← back to dlatch · SR-core');

  await backAndExpectAlive('#slot-latch');
  // Set D=1, EN=1 in D latch → Sbar=0, Rbar=1, Q→1
  await page.click('#btnD');
  await page.click('#btnEN');
  await page.waitForTimeout(80);
  await drill('#slot-latch');
  expect('dlatch→latch ?Sbar=0 (D=1,EN=1)', new URL(page.url()).searchParams.get('Sbar'), '0');
  expect('dlatch→latch ?Rbar=1', new URL(page.url()).searchParams.get('Rbar'), '1');
  await page.screenshot({ path: path.join(OUT_DIR, '02_dlatch_to_latch.png') });

  await backAndExpectAlive('#slot-latch');
  expect('dlatch back D=1 (snapshot)',  await btnOn('#btnD'),  '1');
  expect('dlatch back EN=1 (snapshot)', await btnOn('#btnEN'), '1');

  // D latch → gating NAND (gS)
  await drill('#slot-gs');
  expect('gS from=dlatch', new URL(page.url()).searchParams.get('from'), 'dlatch');
  expect('gS which=gS',    new URL(page.url()).searchParams.get('which'), 'gS');
  expect('gS A=1 (D=1)',   new URL(page.url()).searchParams.get('A'), '1');
  expect('gS B=1 (EN=1)',  new URL(page.url()).searchParams.get('B'), '1');
  await checkBreadcrumb('← back to dlatch · gS');
  await backAndExpectAlive('#slot-latch');

  // ════════════════════════════════════════════════════════════════
  // 3) DFF → D latch (master / slave)
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 3) DFF → D latch (master / slave) ──────────────');
  await page.goto(`${HOST}/dff.html`);
  await clearSession();
  // default D=0, CLK=0 → master EN = !CLK = 1, slave EN = CLK = 0
  await drill('#slot-master');
  expect('dff→dlatch master from=dff',  new URL(page.url()).searchParams.get('from'),  'dff');
  expect('dff→dlatch master which=master', new URL(page.url()).searchParams.get('which'), 'master');
  expect('master ?D=0 (DFF D)',         new URL(page.url()).searchParams.get('D'),  '0');
  expect('master ?EN=1 (!CLK)',         new URL(page.url()).searchParams.get('EN'), '1');
  await checkBreadcrumb('← back to dff · master');
  await backAndExpectAlive('#slot-master');

  await page.click('#btnD');  // D=1
  await page.click('#btnCLK'); // CLK=1
  await page.waitForTimeout(80);
  await drill('#slot-slave');
  expect('slave which=slave', new URL(page.url()).searchParams.get('which'), 'slave');
  // With D=1 and CLK=1, master EN = !CLK = 0 (slave saw the master's prior
  // state). Slave's D = Qm. The DFF's Qm reflects whatever the master held
  // last time master was transparent. At fresh load Qm=0 → after D=1,
  // CLK 0→1: master locked, slave sees Qm=1 if master was transparent at
  // D=1 first. Test sequence here clicks D then CLK so master saw D=1.
  expect('slave EN=1 (CLK=1)', new URL(page.url()).searchParams.get('EN'), '1');
  await page.screenshot({ path: path.join(OUT_DIR, '03_dff_to_slave.png') });

  await backAndExpectAlive('#slot-master');
  expect('dff back D=1 (snapshot)',   await btnOn('#btnD'),   '1');
  expect('dff back CLK=1 (snapshot)', await btnOn('#btnCLK'), '1');

  // ════════════════════════════════════════════════════════════════
  // 4) Register → DFF (per bit)
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 4) Register → DFF (per bit) ────────────────────');
  await page.goto(`${HOST}/register.html`);
  await clearSession();
  // Set D2=1 and pulse — register stores 0100 (bit 2)
  await page.click('#btnD2');
  await page.click('#btnPulse');
  await page.waitForTimeout(1300);
  expect('register Q2 lit', await wireOn('Q2'), '1');
  await drill('#slot-bit2');
  expect('register→dff which=bit2', new URL(page.url()).searchParams.get('which'), 'bit2');
  expect('bit2 D=1', new URL(page.url()).searchParams.get('D'), '1');
  expect('bit2 Q=1', new URL(page.url()).searchParams.get('Q'), '1');
  await checkBreadcrumb('← back to register · bit2');
  // DFF page should show Q wire lit since ?Q=1 was passed
  expect('drilled DFF Q lit',  await wireOn('Q'),  '1');
  expect('drilled DFF QB dark', await wireOn('QB'), '0');
  await page.screenshot({ path: path.join(OUT_DIR, '04_register_to_bit2.png') });

  await backAndExpectAlive('#slot-bit2');
  expect('register back D2=1 (snapshot)', await btnOn('#btnD2'), '1');

  // ════════════════════════════════════════════════════════════════
  // 5) Full adder → half adder (HA1 / HA2)
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 5) Full adder → half adder ─────────────────────');
  await page.goto(`${HOST}/fulladder.html`);
  await clearSession();
  // default A=0, B=0, Cin=0
  await drill('#slot-ha1');
  expect('FA→HA1 which=HA1', new URL(page.url()).searchParams.get('which'), 'HA1');
  expect('HA1 A=0', new URL(page.url()).searchParams.get('A'), '0');
  expect('HA1 B=0', new URL(page.url()).searchParams.get('B'), '0');
  await checkBreadcrumb('← back to fulladder · HA1');
  await backAndExpectAlive('#slot-ha1');

  // Set A=1, B=1 → sum1 = 0, carry1 = 1
  await page.click('#btnA');
  await page.click('#btnB');
  await page.waitForTimeout(60);
  await drill('#slot-ha2');
  expect('FA→HA2 which=HA2', new URL(page.url()).searchParams.get('which'), 'HA2');
  // HA2 receives sum1 (= A XOR B) as A, Cin as B. Sum1=0, Cin=0.
  expect('HA2 A=0 (sum1)',  new URL(page.url()).searchParams.get('A'), '0');
  expect('HA2 B=0 (Cin)',   new URL(page.url()).searchParams.get('B'), '0');
  await checkBreadcrumb('← back to fulladder · HA2');
  await page.screenshot({ path: path.join(OUT_DIR, '05_fa_to_ha2.png') });

  await backAndExpectAlive('#slot-ha1');
  expect('FA back A=1 (snapshot)', await btnOn('#btnA'), '1');

  // ════════════════════════════════════════════════════════════════
  // 6) 4-bit adder → full adder
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 6) 4-bit adder → full adder ────────────────────');
  await page.goto(`${HOST}/adder4.html`);
  await clearSession();
  // Set A=0011 (3), B=0001 (1) — A0=1, A1=1, B0=1, others 0 → sum should be 0100
  await page.click('#btnA0');
  await page.click('#btnA1');
  await page.click('#btnB0');
  await page.waitForTimeout(60);

  // Drill into FA0 — should receive A0=1, B0=1, Cin=0
  await drill('#slot-fa0');
  expect('adder4→FA0 which=FA0', new URL(page.url()).searchParams.get('which'), 'FA0');
  expect('FA0 A=1', new URL(page.url()).searchParams.get('A'), '1');
  expect('FA0 B=1', new URL(page.url()).searchParams.get('B'), '1');
  expect('FA0 Cin=0', new URL(page.url()).searchParams.get('Cin'), '0');
  await checkBreadcrumb('← back to adder4 · FA0');
  await backAndExpectAlive('#slot-fa0');

  // Drill into FA1 — should receive A1=1, B1=0, Cin=1 (carry from FA0)
  await drill('#slot-fa1');
  expect('FA1 A=1', new URL(page.url()).searchParams.get('A'), '1');
  expect('FA1 B=0', new URL(page.url()).searchParams.get('B'), '0');
  expect('FA1 Cin=1 (carry from FA0=1·1)', new URL(page.url()).searchParams.get('Cin'), '1');
  await page.screenshot({ path: path.join(OUT_DIR, '06_adder4_to_fa1.png') });
  await backAndExpectAlive('#slot-fa0');
  expect('adder4 back A0=1 (snapshot)', await btnOn('#btnA0'), '1');

  // ════════════════════════════════════════════════════════════════
  // 7) PC counter → register and → adder
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 7) PC counter → register, PC → adder ──────────');
  await page.goto(`${HOST}/counter.html`);
  await clearSession();
  // Pulse to get PC=1 (in +1 mode)
  await page.click('#btnPulse');
  await page.waitForTimeout(1300);

  await drill('#slot-register');
  expect('counter→register from=counter',  new URL(page.url()).searchParams.get('from'),  'counter');
  expect('counter→register which=register', new URL(page.url()).searchParams.get('which'), 'register');
  // PC=1 → Q0=1 others 0. D = PC+1 = 2 → D1=1 others 0.
  expect('register Q0=1 (PC bit 0)', new URL(page.url()).searchParams.get('Q0'), '1');
  expect('register Q1=0', new URL(page.url()).searchParams.get('Q1'), '0');
  expect('register D1=1 (next PC bit 1)', new URL(page.url()).searchParams.get('D1'), '1');
  await checkBreadcrumb('← back to counter · register');
  // On the drilled register page, Q0 wire should be lit
  expect('drilled register Q0 lit', await wireOn('Q0'), '1');
  await page.screenshot({ path: path.join(OUT_DIR, '07_counter_to_register.png') });
  await backAndExpectAlive('#slot-register');

  // Toggle to +4 mode and drill into adder
  await page.click('#btnStep');
  await page.waitForTimeout(60);
  await drill('#slot-adder');
  expect('counter→adder which=adder', new URL(page.url()).searchParams.get('which'), 'adder');
  // PC=1 still (toggling STEP doesn't change PC). A inputs = PC = 0001.
  // B inputs = STEP = 4 = 0100.
  expect('adder A0=1 (PC=1)', new URL(page.url()).searchParams.get('A0'), '1');
  expect('adder A2=0',         new URL(page.url()).searchParams.get('A2'), '0');
  expect('adder B2=1 (STEP=4)', new URL(page.url()).searchParams.get('B2'), '1');
  expect('adder B0=0',          new URL(page.url()).searchParams.get('B0'), '0');
  expect('adder Cin=0',         new URL(page.url()).searchParams.get('Cin'), '0');
  await checkBreadcrumb('← back to counter · adder');
  await page.screenshot({ path: path.join(OUT_DIR, '08_counter_to_adder.png') });

  await backAndExpectAlive('#slot-register');
  expect('counter back PC=1 (snapshot)', (await page.$eval('#pcBits', (el) => el.textContent)), '0001');
  expect('counter back STEP=+4 (snapshot)', (await page.$eval('#btnStep', (el) => el.textContent)), 'step: +4');

  // ════════════════════════════════════════════════════════════════
  // 15) MUX truth-table smoke
  // ════════════════════════════════════════════════════════════════
  // Set distinct values on the 4 inputs so the MUX's choice is observable.
  // Then walk all 4 select combinations and verify out == in[select].
  console.log('\n── 15) MUX truth-table smoke ─────────────────────');
  await page.goto(`${HOST}/mux.html`);
  await clearSession();
  // Set in0=0, in1=1, in2=0, in3=1 so we can tell which is selected.
  await page.click('#btnIn1');
  await page.click('#btnIn3');
  await page.waitForTimeout(40);
  const muxCases = [
    { s1: 0, s0: 0, expectedOut: 0 },  // → in0 = 0
    { s1: 0, s0: 1, expectedOut: 1 },  // → in1 = 1
    { s1: 1, s0: 0, expectedOut: 0 },  // → in2 = 0
    { s1: 1, s0: 1, expectedOut: 1 },  // → in3 = 1
  ];
  for (const tc of muxCases) {
    // Toggle s1/s0 to reach the desired state
    const curS1 = await page.$eval('#btnS1', (el) => el.getAttribute('data-on'));
    if (curS1 !== String(tc.s1)) await page.click('#btnS1');
    const curS0 = await page.$eval('#btnS0', (el) => el.getAttribute('data-on'));
    if (curS0 !== String(tc.s0)) await page.click('#btnS0');
    await page.waitForTimeout(40);
    const out = await page.$eval('[data-net="out"]', (el) => el.getAttribute('data-on'));
    expect(`select=(${tc.s1},${tc.s0}) → out=${tc.expectedOut}`, out, String(tc.expectedOut));
    // Exactly one sel{N} is lit
    let litCount = 0;
    for (let n = 0; n < 4; n++) {
      const litN = await page.$eval(`[data-net="sel${n}"]`, (el) => el.getAttribute('data-on'));
      if (litN === '1') litCount++;
    }
    expect(`select=(${tc.s1},${tc.s0}): exactly one sel line lit`, litCount, 1);
  }

  // ════════════════════════════════════════════════════════════════
  // 16) Register file: write via decoder+clock-gate, read via MUX
  // ════════════════════════════════════════════════════════════════
  // Write 1 into reg2, confirm one-hot write-enable + clock-gated commit,
  // read it back through the MUX, and drill into all three child types.
  console.log('\n── 16) Register file write/read + drill-downs ─────');
  await page.goto(`${HOST}/regfile.html`);
  await clearSession();
  // we=1, waddr=10 (waddr1=1, waddr0=0), wdata=1
  await page.click('#btnWe');
  await page.click('#btnWaddr1');
  await page.click('#btnWdata');
  await page.waitForTimeout(40);
  // Exactly one write-enable line is armed, and it's wen2 (address 10).
  let armed = 0;
  for (let n = 0; n < 4; n++) {
    if (await wireOn(`wen${n}`) === '1') armed++;
  }
  expect('regfile: exactly one wen armed when we=1', armed, 1);
  expect('regfile: wen2 armed for waddr=10', await wireOn('wen2'), '1');
  // Clock the write; wait for the pulse (200ms→commit, 1000ms→fall) to finish.
  await page.click('#btnPulse');
  await page.waitForTimeout(1300);
  expect('regfile: reg2 stored bit lit after write', await wireOn('q2'), '1');
  expect('regfile: reg0/1/3 still 0',
    [await wireOn('q0'), await wireOn('q1'), await wireOn('q3')].join(''), '000');
  // Read it back: raddr=10 → rdata=1
  await page.click('#btnRaddr1');
  await page.waitForTimeout(40);
  expect('regfile: rdata=1 reading addr 10', await wireOn('rdata'), '1');
  // Read an empty register: raddr=00 → rdata=0
  await page.click('#btnRaddr1');
  await page.waitForTimeout(40);
  expect('regfile: rdata=0 reading addr 00', await wireOn('rdata'), '0');
  // Restore raddr=10 so the MUX drill below carries s1=1.
  await page.click('#btnRaddr1');
  await page.waitForTimeout(40);

  // Drill into the write decoder — carries waddr + we
  await drill('#slot-decoder');
  expect('regfile→decoder from=regfile', new URL(page.url()).searchParams.get('from'), 'regfile');
  expect('regfile→decoder which=wdec',   new URL(page.url()).searchParams.get('which'), 'wdec');
  expect('regfile→decoder a1=1 (waddr1)', new URL(page.url()).searchParams.get('a1'), '1');
  expect('regfile→decoder a0=0 (waddr0)', new URL(page.url()).searchParams.get('a0'), '0');
  expect('regfile→decoder EN=1 (we)',     new URL(page.url()).searchParams.get('EN'), '1');
  await checkBreadcrumb('← back to regfile · wdec');
  await page.screenshot({ path: path.join(OUT_DIR, '09_regfile_to_decoder.png') });
  await backAndExpectAlive('#slot-decoder');

  // Drill into reg2 (a DFF) — carries Q=1 (stored)
  await drill('#slot-reg2');
  expect('regfile→dff which=reg2', new URL(page.url()).searchParams.get('which'), 'reg2');
  expect('regfile→dff Q=1 (reg2 stored)', new URL(page.url()).searchParams.get('Q'), '1');
  expect('drilled DFF Q lit', await wireOn('Q'), '1');
  await checkBreadcrumb('← back to regfile · reg2');
  await backAndExpectAlive('#slot-reg2');

  // Drill into the read MUX — carries the 4 stored bits + read address
  await drill('#slot-mux');
  expect('regfile→mux which=rmux', new URL(page.url()).searchParams.get('which'), 'rmux');
  expect('regfile→mux in2=1 (reg2 stored)', new URL(page.url()).searchParams.get('in2'), '1');
  expect('regfile→mux s1=1 (raddr1)',       new URL(page.url()).searchParams.get('s1'), '1');
  await checkBreadcrumb('← back to regfile · rmux');
  await page.screenshot({ path: path.join(OUT_DIR, '10_regfile_to_mux.png') });
  await backAndExpectAlive('#slot-mux');
  expect('regfile back: reg2 still stored (snapshot)', await wireOn('q2'), '1');

  // ════════════════════════════════════════════════════════════════
  // 14) Decoder gate symbols: rendered as logic-gate shapes (no hover)
  // ════════════════════════════════════════════════════════════════
  // AND/OR/NOT truth tables are trivial — we removed the hover overlays
  // and replaced the rect placeholders with proper ANSI logic-symbol
  // <path> elements (NOT triangle+bubble, AND D-shape). Smoke-check the
  // shapes exist and lit-state still propagates via data-on.
  console.log('\n── 14) Decoder gate symbols are paths, no overlays ─');
  await page.goto(`${HOST}/decoder.html`);
  await clearSession();
  for (const id of ['gInvA1', 'gInvA0', 'gAnd0', 'gAnd1', 'gAnd2', 'gAnd3']) {
    const tag = await page.$eval(`#${id}`, (el) => el.tagName.toLowerCase());
    expect(`#${id} is a <path> (logic-gate symbol)`, tag, 'path');
  }
  // No .gate-slot or .detailed overlays remain for the simple gates.
  const overlayCount = await page.$$eval('#decoder .detailed', (els) => els.length);
  expect(`decoder: no .detailed truth-table overlays`, overlayCount, 0);

  // ════════════════════════════════════════════════════════════════
  // 13) Decoder truth-table smoke
  // ════════════════════════════════════════════════════════════════
  // For each of 4 addresses with EN=1, assert exactly one sel{N} wire
  // is lit and that N matches the address. Also assert EN=0 silences
  // every sel.
  console.log('\n── 13) Decoder truth-table smoke ─────────────────');
  await page.goto(`${HOST}/decoder.html`);
  await clearSession();
  const decoderCases = [
    { a1: 0, a0: 0, expectedSel: 0 },
    { a1: 0, a0: 1, expectedSel: 1 },
    { a1: 1, a0: 0, expectedSel: 2 },
    { a1: 1, a0: 1, expectedSel: 3 },
  ];
  for (const tc of decoderCases) {
    // Reset to known state, then click to reach desired a1/a0
    await page.click('#btnReset');
    if (tc.a1 === 1) await page.click('#btnA1');
    if (tc.a0 === 1) await page.click('#btnA0');
    await page.waitForTimeout(50);
    for (let n = 0; n < 4; n++) {
      const lit = await page.$eval(`[data-net="sel${n}"]`,
        (el) => el.getAttribute('data-on'));
      const want = n === tc.expectedSel ? '1' : '0';
      expect(`a=(${tc.a1},${tc.a0}) → sel${n}=${want}`, lit, want);
    }
  }
  // EN=0 silences everything
  await page.click('#btnReset');           // a1=0, a0=0, EN=1, sel0 lit
  await page.click('#btnEN');              // EN → 0
  await page.waitForTimeout(50);
  for (let n = 0; n < 4; n++) {
    const lit = await page.$eval(`[data-net="sel${n}"]`,
      (el) => el.getAttribute('data-on'));
    expect(`EN=0 silences sel${n}`, lit, '0');
  }

  // ════════════════════════════════════════════════════════════════
  // 12) Overlay-vs-standalone structural equivalence
  // ════════════════════════════════════════════════════════════════
  // A parent's hover overlay for a child layer must show the SAME
  // structure the child's standalone page shows at its TOP level — not
  // a deeper zoom (e.g. master/slave inside DFFs).
  //
  // We compare: number of "cells" / sub-blocks, labels on each, bit
  // order. We DON'T compare exact geometry — different scales are fine.
  console.log('\n── 12) Overlay-vs-standalone structural equivalence ─');

  // Extract the "cell labels" (per-bit text) from a page.
  // For /register.html: labels are "bit 0", "bit 1", "bit 2", "bit 3"
  //   inside .dff-slot groups.
  // For /counter.html's register overlay: labels are "DFF bit 0".. "DFF bit 3"
  //   inside the register scene.
  // Loose match: extract the trailing digit.
  async function collectBitLabels(pageUrl, selector) {
    await page.goto(`${HOST}${pageUrl}`);
    await clearSession();
    return page.$$eval(selector, (els) => els
      .map((e) => (e.textContent || '').trim())
      .filter((t) => /bit\s*\d/.test(t))
      .map((t) => Number(t.match(/(\d)/)?.[1] ?? -1))
      .filter((n) => n >= 0));
  }

  // Standalone register's bit labels (top-level, no hover)
  const standaloneBits = await collectBitLabels('/register.html',
    '.dff-slot text.simple-label');
  // Counter's register hover overlay bit labels
  await page.goto(`${HOST}/counter.html`);
  await clearSession();
  await page.hover('#slot-register');
  await page.waitForTimeout(150);
  const overlayBits = await page.$$eval(
    '#slot-register .register-scene text',
    (els) => els
      .map((e) => (e.textContent || '').trim())
      .filter((t) => /bit\s*\d/.test(t))
      .map((t) => Number(t.match(/(\d)/)?.[1] ?? -1))
      .filter((n) => n >= 0),
  );
  expect('counter register overlay: 4 bit labels',  overlayBits.length, 4);
  expect('standalone register: 4 bit labels',       standaloneBits.length, 4);
  expect('overlay and standalone show same #cells',
    overlayBits.length, standaloneBits.length);

  // Compare bit positions by their y coords (top-to-bottom order should match)
  async function bitOrderByY(pageUrl, slotSelector, labelSelector) {
    await page.goto(`${HOST}${pageUrl}`);
    await clearSession();
    if (slotSelector) {
      await page.hover(slotSelector);
      await page.waitForTimeout(150);
    }
    return page.$$eval(labelSelector, (els) => {
      const items = els
        .map((e) => ({
          label: (e.textContent || '').trim(),
          y: parseFloat(e.getAttribute('y') || 'NaN'),
        }))
        .filter((x) => /bit\s*\d/.test(x.label) && Number.isFinite(x.y));
      items.sort((a, b) => a.y - b.y);  // top-to-bottom
      return items.map((x) => Number(x.label.match(/(\d)/)[1]));
    });
  }
  const standaloneOrder = await bitOrderByY('/register.html', null,
    '.dff-slot text.simple-label');
  const overlayOrder = await bitOrderByY('/counter.html', '#slot-register',
    '#slot-register .register-scene text');
  expect(`top-to-bottom bit order matches: standalone=${JSON.stringify(standaloneOrder)} vs overlay=${JSON.stringify(overlayOrder)}`,
    JSON.stringify(standaloneOrder), JSON.stringify(overlayOrder));

  // Also: the overlay should NOT show "master" or "slave" text (that's
  // the next layer down). The bug we just fixed.
  await page.goto(`${HOST}/counter.html`);
  await clearSession();
  await page.hover('#slot-register');
  await page.waitForTimeout(150);
  const innerText = await page.$eval('#slot-register', (el) => el.textContent || '');
  expect('counter register overlay does NOT show master/slave (too-deep guard)',
    /master|slave/i.test(innerText), false);

  // ════════════════════════════════════════════════════════════════
  // 11) Drill-target validity
  // ════════════════════════════════════════════════════════════════
  // For each (parent page, slot), if the slot has a click handler, click
  // it and assert: (a) navigation actually happened (URL changed and has
  // ?from=...), (b) the destination URL points to a page that loads
  // successfully (status 200 implicit since we got the DOM). Additionally,
  // assert that slots WITHOUT a dedicated child page (XOR/AND/OR) do NOT
  // navigate on click — they should be cursor: default and no-op.
  console.log('\n── 11) Drill-target validity ──────────────────────');

  // Slots we EXPECT to drill (target page exists)
  const VALID_DRILLS = [
    { page: '/latch.html',     slot: 'slot-n1',       expectedTitle: /NAND|gate|computer-viz/i },
    { page: '/dlatch.html',    slot: 'slot-latch',    expectedTitle: /SR latch|computer-viz/i },
    { page: '/dlatch.html',    slot: 'slot-gs',       expectedTitle: /NAND|gate|computer-viz/i },
    { page: '/dff.html',       slot: 'slot-master',   expectedTitle: /D latch|computer-viz/i },
    { page: '/register.html',  slot: 'slot-bit0',     expectedTitle: /DFF|computer-viz/i },
    { page: '/fulladder.html', slot: 'slot-ha1',      expectedTitle: /half adder|computer-viz/i },
    { page: '/adder4.html',    slot: 'slot-fa0',      expectedTitle: /full adder|computer-viz/i },
    { page: '/counter.html',   slot: 'slot-register', expectedTitle: /register|computer-viz/i },
    { page: '/counter.html',   slot: 'slot-adder',    expectedTitle: /adder|computer-viz/i },
    { page: '/mux.html',       slot: 'slot-decoder',  expectedTitle: /decoder|computer-viz/i },
    { page: '/regfile.html',   slot: 'slot-decoder',  expectedTitle: /decoder|computer-viz/i },
    { page: '/regfile.html',   slot: 'slot-reg2',     expectedTitle: /DFF|computer-viz/i },
    { page: '/regfile.html',   slot: 'slot-mux',      expectedTitle: /MUX|computer-viz/i },
  ];

  for (const { page: pagePath, slot, expectedTitle } of VALID_DRILLS) {
    await page.goto(`${HOST}${pagePath}`);
    await clearSession();
    const beforeUrl = page.url();
    await Promise.all([
      page.waitForURL(/\?from=/),
      page.click(`#${slot}`),
    ]);
    expect(`${pagePath}/${slot}: navigated`, page.url() !== beforeUrl, true);
    expect(`${pagePath}/${slot}: ?from set`,
      new URL(page.url()).searchParams.has('from'), true);
    // Destination page loaded — title is set
    const title = await page.title();
    const titleOk = expectedTitle.test(title);
    expect(`${pagePath}/${slot}: destination title matches (${title})`, titleOk, true);
  }

  // Slots we EXPECT to NOT drill (no dedicated page yet — XOR/AND/OR)
  const NO_DRILL_SLOTS = [
    { page: '/halfadder.html', slot: 'slot-xor' },
    { page: '/halfadder.html', slot: 'slot-and' },
    { page: '/fulladder.html', slot: 'slot-or'  },
  ];
  for (const { page: pagePath, slot } of NO_DRILL_SLOTS) {
    await page.goto(`${HOST}${pagePath}`);
    await clearSession();
    const beforeUrl = page.url();
    // Click; wait briefly; URL should NOT change
    await page.click(`#${slot}`).catch(() => null);
    await page.waitForTimeout(150);
    expect(`${pagePath}/${slot}: click does NOT navigate (no child page)`,
      page.url() === beforeUrl, true);
    // Also: cursor should be 'default' not 'pointer'
    const cursor = await page.$eval(`#${slot}`,
      (el) => getComputedStyle(el).cursor);
    expect(`${pagePath}/${slot}: cursor is default (signals not-clickable)`,
      cursor, 'default');
  }

  // ════════════════════════════════════════════════════════════════
  // 10) Overlay-terminal ↔ parent-wire alignment
  // ════════════════════════════════════════════════════════════════
  // For each known (parent page, slot, parent-wire-net, overlay-terminal-net)
  // tuple, hover the slot to materialize its overlay, then read both the
  // parent's wire endpoint AND the overlay terminal's endpoint (with the
  // group transform applied), and assert they coincide within 2px.
  //
  // This is the canary that catches geometric drift — the same bug class
  // as the original "DFF mini Q didn't reach the parent's Q wire."
  console.log('\n── 10) Overlay-terminal alignment with parent wires ─');

  // For each case: `side` selects which endpoint of the PARENT wire (start
  // or end of the polyline) to compare; `termSide` selects which endpoint
  // of the OVERLAY's wire-mini polyline is the parent-facing one.
  const ALIGNMENT_CASES = [
    {
      page: '/register.html',
      slots: [
        // D wires: parent wire goes [pin] → [slot.left], so the parent-side
        // is 'end'. Inside DFF mini, D wire-mini goes [scene.left] → inward,
        // so the parent-facing terminal is 'start'.
        { id: 'slot-bit0', net: 'D0', term: 'D', side: 'end',   termSide: 'start' },
        { id: 'slot-bit1', net: 'D1', term: 'D', side: 'end',   termSide: 'start' },
        { id: 'slot-bit2', net: 'D2', term: 'D', side: 'end',   termSide: 'start' },
        { id: 'slot-bit3', net: 'D3', term: 'D', side: 'end',   termSide: 'start' },
        // Q wires: parent wire goes [slot.right] → [pin], so 'start'. DFF
        // mini's Q wire goes inward → [scene.right], so terminal is 'end'.
        { id: 'slot-bit0', net: 'Q0', term: 'Q', side: 'start', termSide: 'end' },
        { id: 'slot-bit1', net: 'Q1', term: 'Q', side: 'start', termSide: 'end' },
        { id: 'slot-bit2', net: 'Q2', term: 'Q', side: 'start', termSide: 'end' },
        { id: 'slot-bit3', net: 'Q3', term: 'Q', side: 'start', termSide: 'end' },
      ],
    },
  ];

  function applyTransform(localPt, transformStr) {
    if (!transformStr) return localPt;
    // Handle nested transforms by applying each from outermost to innermost.
    // We'll iterate ancestor transforms by reading at evaluation time on
    // the browser side instead — see resolveAbsoluteEndpoint below.
    return localPt;
  }

  async function alignmentCheck({ page: pagePath, slots }) {
    await page.goto(`${HOST}${pagePath}`);
    await clearSession();
    for (const { id, net, term, side, termSide } of slots) {
      await page.hover(`#${id}`);
      await page.waitForTimeout(150);

      // Parent wire endpoint
      const wirePts = await page.$eval(`[data-net="${net}"]`,
        (el) => el.getAttribute('points'));
      const points = wirePts.trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const expected = side === 'start' ? points[0] : points[points.length - 1];

      // Overlay terminal endpoint, traversing ancestor transforms
      const observed = await page.$$eval(
        `#${id} .wire-mini[data-net="${term}"]`,
        (els, termSide) => {
          const el = els[0];
          if (!el) return null;
          const pts = (el.getAttribute('points') || '').trim().split(/\s+/)
            .map((p) => p.split(',').map(Number));
          let [x, y] = termSide === 'start' ? pts[0] : pts[pts.length - 1];
          // Apply each ancestor `transform="translate(...) scale(...)"`
          // from innermost to outermost.
          let cur = el.parentElement;
          while (cur && cur.tagName !== 'svg') {
            const tr = cur.getAttribute && cur.getAttribute('transform');
            if (tr) {
              const m = /translate\(([-\d.]+),\s*([-\d.]+)\)(?:\s*scale\(([-\d.]+),\s*([-\d.]+)\))?/.exec(tr);
              if (m) {
                const tx = parseFloat(m[1]);
                const ty = parseFloat(m[2]);
                const sx = m[3] != null ? parseFloat(m[3]) : 1;
                const sy = m[4] != null ? parseFloat(m[4]) : 1;
                x = x * sx + tx;
                y = y * sy + ty;
              }
            }
            cur = cur.parentElement;
          }
          return [x, y];
        },
        termSide,
      );

      const dx = Math.abs((observed?.[0] ?? Infinity) - expected[0]);
      const dy = Math.abs((observed?.[1] ?? Infinity) - expected[1]);
      const aligned = observed !== null && dx < 2 && dy < 2;
      expect(
        `${pagePath} ${id} ${net}↔${term}: aligned (dx=${dx.toFixed(2)}, dy=${dy.toFixed(2)})`,
        aligned, true,
      );
    }
  }
  for (const c of ALIGNMENT_CASES) await alignmentCheck(c);

  // ════════════════════════════════════════════════════════════════
  // 9) Bit-order convention: LSB at BOTTOM across all multi-bit pages
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 9) Bit-order: LSB at BOTTOM convention ─────────');
  // For each page with N-bit labeled buses (D, Q, A, B, S), assert
  // y(bit 0) > y(bit N-1) in SVG coords (LSB sits below MSB).
  const BIT_PAGES = [
    { path: '/register.html', buses: ['D', 'Q'] },
    { path: '/adder4.html',   buses: ['A', 'B', 'S'] },
    { path: '/counter.html',  buses: ['D', 'Q', 'A', 'S'] },
  ];
  for (const { path: pagePath, buses } of BIT_PAGES) {
    await page.goto(`${HOST}${pagePath}`);
    await clearSession();
    for (const prefix of buses) {
      // Match text labels exactly of form "<prefix><digit>" — e.g. "D0", "A3"
      const positions = await page.$$eval(
        'text',
        (els, p) => els
          .filter((e) => new RegExp('^' + p + '\\d$').test((e.textContent || '').trim()))
          .map((e) => ({
            label: (e.textContent || '').trim(),
            y: parseFloat(e.getAttribute('y') || 'NaN'),
          }))
          .filter((p) => Number.isFinite(p.y)),
        prefix,
      );
      const bit0 = positions.find((p) => p.label === `${prefix}0`);
      const bitN = positions.find((p) => /\d$/.test(p.label) && p.label.endsWith('3'))
                || positions[positions.length - 1];
      if (bit0 && bitN && bit0.label !== bitN.label) {
        // In SVG coords, larger y = lower on screen → LSB at BOTTOM means bit0.y > bitN.y
        expect(
          `${pagePath} bus ${prefix}: LSB (${bit0.label}@y=${bit0.y}) below MSB (${bitN.label}@y=${bitN.y})`,
          bit0.y > bitN.y,
          true,
        );
      }
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 8) Fresh visit: no params, no breadcrumb
  // ════════════════════════════════════════════════════════════════
  console.log('\n── 8) Fresh visits have no breadcrumb ────────────');
  for (const url of ['/', '/latch.html', '/dlatch.html', '/dff.html', '/halfadder.html']) {
    const fresh = await browser.newContext();
    const p = await fresh.newPage();
    await p.goto(`${HOST}${url}`);
    await p.waitForSelector('#btnReset', { timeout: 3000 }).catch(() => null);
    const bc = await p.$('a[href="#"]');
    expect(`${url} no breadcrumb`, bc === null, true);
    await fresh.close();
  }
} finally {
  await browser.close();
}

// ── Report ──────────────────────────────────────────────────────────
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
for (const r of results) {
  const tag = r.ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  let line = `  ${tag}  ${pad(r.label, 60)}`;
  if (!r.ok) line += ` got=${JSON.stringify(r.got)} want=${JSON.stringify(r.want)}`;
  console.log(line);
}
console.log(`\n${failures === 0 ? '\x1b[32mALL ' + results.length + ' PASS\x1b[0m' : '\x1b[31m' + failures + ' FAIL of ' + results.length + '\x1b[0m'}`);
console.log(`Screenshots: ${OUT_DIR}/`);

killServer();
process.exit(failures);
