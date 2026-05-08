import { describe, it, expect } from 'vitest';
import { levels, levelById, childrenOf } from './levels';

describe('levels data', () => {
  it('contains all 115 folders', () => {
    expect(levels.length).toBe(115);
  });

  it('00_computer is the root (parent === null)', () => {
    const root = levels.find((l) => l.id === '00_computer');
    expect(root).toBeDefined();
    expect(root?.parent).toBeNull();
    expect(root?.depth).toBe(0);
  });

  it('every non-root has a parent that exists in the tree', () => {
    for (const l of levels) {
      if (l.parent !== null) {
        expect(levelById.get(l.parent)).toBeDefined();
      }
    }
  });

  it('connector folders have names starting with underscore', () => {
    const connectors = levels.filter((l) => l.isConnector);
    expect(connectors.length).toBeGreaterThan(5);
    for (const c of connectors) {
      expect(c.name.startsWith('_')).toBe(true);
    }
  });

  it('depth matches number of slashes in id', () => {
    for (const l of levels) {
      const slashes = (l.id.match(/\//g) ?? []).length;
      expect(l.depth).toBe(slashes);
    }
  });
});

describe('childrenOf', () => {
  it('returns root nodes for null', () => {
    const roots = childrenOf(null);
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe('00_computer');
  });

  it('returns direct children only', () => {
    const chipChildren = childrenOf('00_computer/01_chip');
    const ids = chipChildren.map((c) => c.id);
    expect(ids).toContain('00_computer/01_chip/02_core');
    expect(ids).toContain('00_computer/01_chip/02_l3');
    // grandchildren should NOT appear
    expect(ids).not.toContain('00_computer/01_chip/02_core/03_alu');
  });

  it('returns empty for leaf folders', () => {
    const leafChildren = childrenOf(
      '00_computer/01_chip/02_core/03_regfile/04_register/05_flipflop/06_gate/07_transistor/08_electrons'
    );
    expect(leafChildren).toEqual([]);
  });
});

describe('levelById', () => {
  it('looks up by full path', () => {
    expect(levelById.get('00_computer/01_chip')?.name).toBe('01_chip');
    expect(levelById.get('00_computer/01_os/_syscall')?.isConnector).toBe(true);
  });

  it('returns undefined for unknown id', () => {
    expect(levelById.get('not/a/real/path')).toBeUndefined();
  });
});
