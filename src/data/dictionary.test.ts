import { describe, it, expect } from 'vitest';
import { dictionary, lookupTerm, termPattern, allTerms } from './dictionary';

describe('dictionary', () => {
  it('contains foundational terms', () => {
    expect(dictionary.transistor).toBeDefined();
    expect(dictionary.gate).toBeDefined();
    expect(dictionary.RAM).toBeDefined();
    expect(dictionary.TLB).toBeDefined();
    expect(dictionary.syscall).toBeDefined();
  });

  it('every term has a one-sentence definition', () => {
    for (const t of allTerms) {
      expect(t.definition.length).toBeGreaterThan(10);
      expect(t.name).toBeTruthy();
    }
  });

  it('unit terms include scientific notation', () => {
    expect(dictionary.ns?.unit?.scientific).toContain('10');
    expect(dictionary.ps?.unit?.scientific).toContain('10');
    expect(dictionary.µs?.unit?.scientific).toContain('10');
  });

  it('every folder reference is a real path string', () => {
    for (const t of allTerms) {
      if (t.folder) {
        expect(t.folder).toMatch(/^levels\//);
      }
    }
  });
});

describe('lookupTerm', () => {
  it('finds term by canonical name', () => {
    expect(lookupTerm('RAM')?.name).toBe('RAM');
    expect(lookupTerm('TLB')?.name).toBe('TLB');
  });

  it('finds term case-insensitively', () => {
    expect(lookupTerm('ram')?.name).toBe('RAM');
    expect(lookupTerm('Tlb')?.name).toBe('TLB');
  });

  it('finds term by alias', () => {
    expect(lookupTerm('main memory')?.name).toBe('RAM');
    expect(lookupTerm('translation lookaside buffer')?.name).toBe('TLB');
    expect(lookupTerm('MOSFET')?.name).toBe('transistor');
    expect(lookupTerm('flipflop')?.name).toBe('flip-flop');
  });

  it('returns null for unknown term', () => {
    expect(lookupTerm('not-a-real-term-xyz')).toBeNull();
  });
});

describe('termPattern (auto-detect regex)', () => {
  it('matches a known term in prose', () => {
    const text = 'The TLB caches recent translations.';
    const matches = [...text.matchAll(termPattern)].map((m) => m[1]);
    expect(matches).toContain('TLB');
  });

  it('matches multi-word term as a unit', () => {
    const text = 'The branch predictor guesses early.';
    const matches = [...text.matchAll(termPattern)].map((m) => m[1]);
    expect(matches).toContain('branch predictor');
  });

  it('matches multiple terms in one sentence', () => {
    const text = 'A syscall lets the process talk to the kernel via the TLB.';
    const matches = [...text.matchAll(termPattern)].map((m) => m[1]);
    expect(matches).toContain('syscall');
    expect(matches).toContain('process');
    expect(matches).toContain('TLB');
  });

  it('does not match substrings that are not standalone terms', () => {
    const text = 'transistormania';
    const matches = [...text.matchAll(termPattern)].map((m) => m[1]);
    expect(matches).toEqual([]);
  });
});
