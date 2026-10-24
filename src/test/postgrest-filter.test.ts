import { describe, it, expect } from 'vitest';
import { sanitizeOrSearchTerm, orIlikePattern } from '@/utils/postgrestFilter';

// P3-25: user input interpolated into a PostgREST .or() filter string
// must not be able to break the filter grammar or act as wildcards.

describe('postgrestFilter', () => {
  it('passes ordinary names through unchanged', () => {
    expect(sanitizeOrSearchTerm('Mary Banda')).toBe('Mary Banda');
    expect(orIlikePattern('lungu')).toBe('%lungu%');
  });

  it('strips structural characters that break out of the filter', () => {
    expect(sanitizeOrSearchTerm('a,b')).not.toContain(',');
    expect(sanitizeOrSearchTerm('x)or(y')).not.toMatch(/[()]/);
    expect(sanitizeOrSearchTerm('a"b')).not.toContain('"');
    // A full breakout attempt collapses to harmless words.
    const out = sanitizeOrSearchTerm('%,id.gt.0,first_name.ilike.%');
    expect(out).not.toMatch(/[%_,()"]/);
  });

  it('neutralises LIKE wildcards', () => {
    expect(orIlikePattern('100%')).toBe('%100%');
    expect(sanitizeOrSearchTerm('a_b')).toBe('a b');
    expect(sanitizeOrSearchTerm('a\\b')).not.toContain('\\');
  });

  it('collapses whitespace left by stripped characters', () => {
    expect(sanitizeOrSearchTerm('a , b')).toBe('a b');
    expect(sanitizeOrSearchTerm('   ')).toBe('');
  });
});
