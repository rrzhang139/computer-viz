// Runs wire_sketches/check.mjs as a subprocess so every CI run catches
// geometric regressions in the sketches: child-box overlaps, wires
// passing through foreign children, or cross-net wire-wire overlaps.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const checkScript = path.join(repoRoot, 'wire_sketches', 'check.mjs');

describe('wire_sketches geometry check', () => {
  it('all layers pass the deterministic geometry checker', () => {
    let stdout = '';
    let exitCode = 0;
    try {
      stdout = execFileSync('node', [checkScript, '--all'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
    } catch (err) {
      const e = err as { stdout?: string; status?: number };
      stdout = e.stdout || '';
      exitCode = e.status ?? 1;
    }
    expect(exitCode, `checker output:\n${stdout}`).toBe(0);
    expect(stdout).toMatch(/PASS\s+wire_sketches\/layer0_transistor\.md/);
    expect(stdout).toMatch(/PASS\s+wire_sketches\/layer1_gate\.md/);
    expect(stdout).toMatch(/PASS\s+wire_sketches\/layer2_latch\.md/);
    expect(stdout).toMatch(/PASS\s+wire_sketches\/layer3_dlatch\.md/);
  });
});
