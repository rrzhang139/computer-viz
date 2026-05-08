// Repo-structure validators — these are the CI-style checks that catch
// drift between specs / GLOSSARY / TIME_AXIS / template completeness.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const REPO = join(__dirname, '..', '..');
const LEVELS = join(REPO, 'levels');
const REQUIRED_FILES = [
  'spec.md',
  'interface.md',
  'symbolic.md',
  'physical.md',
  'animations.md',
  'execution.md',
  'timing.md',
  'art.md',
];

function* walkLevelFolders(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield full;
      yield* walkLevelFolders(full);
    }
  }
}

const allLevelFolders = [...walkLevelFolders(LEVELS)];

describe('repo: every level folder has all 8 template files', () => {
  for (const folder of allLevelFolders) {
    const rel = relative(REPO, folder);
    for (const f of REQUIRED_FILES) {
      it(`${rel}/${f} exists`, () => {
        expect(() => readFileSync(join(folder, f))).not.toThrow();
      });
    }
  }
});

describe('repo: no Phase 1 file has a literal TODO line remaining', () => {
  const phase1Files = ['spec.md', 'interface.md', 'art.md'];
  for (const folder of allLevelFolders) {
    const rel = relative(REPO, folder);
    for (const f of phase1Files) {
      it(`${rel}/${f} has no bare 'TODO' line`, () => {
        const content = readFileSync(join(folder, f), 'utf8');
        const lines = content.split('\n');
        const bareTODO = lines.some((line) => line.trim() === 'TODO');
        expect(bareTODO).toBe(false);
      });
    }
  }
});

describe('repo: every spec has a non-empty motivation paragraph', () => {
  for (const folder of allLevelFolders) {
    const rel = relative(REPO, folder);
    it(`${rel}/spec.md has motivation content`, () => {
      const content = readFileSync(join(folder, 'spec.md'), 'utf8');
      const motMatch = content.match(/##\s*Motivation[^\n]*\n([\s\S]*?)\n##/);
      expect(motMatch).toBeTruthy();
      const body = motMatch![1]
        .split('\n')
        .filter((line) => !line.startsWith('<!--') && !line.startsWith('>'))
        .join('')
        .trim();
      expect(body.length).toBeGreaterThan(20);
    });
  }
});

describe('repo: GLOSSARY symbol consistency', () => {
  const glossary = readFileSync(join(REPO, 'GLOSSARY.md'), 'utf8');
  const glossarySymbols = new Set(
    [...glossary.matchAll(/`(\[[A-Z][A-Z0-9_]*\])`/g)].map((m) => m[1])
  );

  // Brackets used in spec/interface but never registered are bugs.
  // EXCEPT: gate sub-flavors and passing-references are documented separately.
  const KNOWN_SUBFLAVORS = new Set(['[NAND]', '[NOR]', '[AND]', '[OR]', '[NOT]', '[XOR]']);
  const KNOWN_PASSING = new Set(['[FUTEX]']);
  const acceptable = new Set([...glossarySymbols, ...KNOWN_SUBFLAVORS, ...KNOWN_PASSING]);

  it('GLOSSARY parses at least 80 unique symbols', () => {
    expect(glossarySymbols.size).toBeGreaterThan(80);
  });

  it('every bracket used in spec/interface resolves to GLOSSARY (or documented sub-flavor)', () => {
    const used = new Set<string>();
    for (const folder of allLevelFolders) {
      for (const fname of ['spec.md', 'interface.md']) {
        const content = readFileSync(join(folder, fname), 'utf8');
        for (const m of content.matchAll(/\[[A-Z][A-Z0-9_]*\]/g)) {
          used.add(m[0]);
        }
      }
    }
    const missing = [...used].filter((b) => !acceptable.has(b));
    expect(missing).toEqual([]);
  });
});

describe('repo: art.md tier values are valid', () => {
  const VALID = new Set(['1-photo', '2-3d', '3-stylized']);
  for (const folder of allLevelFolders) {
    const rel = relative(REPO, folder);
    it(`${rel}/art.md declares a valid tier`, () => {
      const content = readFileSync(join(folder, 'art.md'), 'utf8');
      const m = content.match(/^tier:\s*(\S+)/m);
      expect(m).toBeTruthy();
      const tier = m![1].replace(/[`'"]/g, '');
      expect(VALID.has(tier)).toBe(true);
    });
  }
});

describe('repo: levels.ts matches actual folder structure', () => {
  it('every levels.ts entry corresponds to a real folder', async () => {
    const { levels } = await import('../../src/data/levels');
    for (const l of levels) {
      const folder = join(LEVELS, l.id);
      expect(() => statSync(folder)).not.toThrow();
    }
  });

  it('every actual folder is in levels.ts', async () => {
    const { levels } = await import('../../src/data/levels');
    const inData = new Set(levels.map((l) => l.id));
    for (const folder of allLevelFolders) {
      const rel = relative(LEVELS, folder).split('\\').join('/');
      expect(inData.has(rel)).toBe(true);
    }
  });
});
