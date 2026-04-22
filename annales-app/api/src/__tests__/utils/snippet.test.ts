import { trimSnippet } from '../../utils/snippet.js';

describe('trimSnippet', () => {
  it('returns a short highlighted string untouched', () => {
    const input = 'A <em>match</em> in plain text.';
    expect(trimSnippet(input)).toBe('A <em>match</em> in plain text.');
  });

  it('extends the left window to the nearest sentence boundary', () => {
    const input = 'First sentence is here. Second sentence contains the <em>keyword</em> we want.';
    const out = trimSnippet(input, 80);
    expect(out.startsWith('Second sentence')).toBe(true);
    expect(out).toContain('<em>keyword</em>');
  });

  it('extends the right window to the next sentence boundary', () => {
    const input =
      'Before text has the <em>keyword</em> here. Then a second sentence nobody cares about.';
    const out = trimSnippet(input, 80);
    expect(out.endsWith('here.')).toBe(true);
    expect(out).toContain('<em>keyword</em>');
  });

  it('adds ellipsis when the left side is trimmed', () => {
    const input =
      'A very long lead-in sentence that goes on and on and on until eventually we reach the <em>keyword</em>.';
    const out = trimSnippet(input, 20);
    expect(out.startsWith('…')).toBe(true);
    expect(out).toContain('<em>keyword</em>');
  });

  it('adds ellipsis when the right side is trimmed', () => {
    const input =
      'Short lead. <em>keyword</em> followed by a very long tail that keeps going and going with no punctuation';
    const out = trimSnippet(input, 20);
    expect(out.endsWith('…')).toBe(true);
    expect(out).toContain('<em>keyword</em>');
  });

  it('caps both sides at the character limit when no sentence boundary exists', () => {
    const beforeHuge = 'word '.repeat(50);
    const afterHuge = 'word '.repeat(50);
    const input = `${beforeHuge}<em>match</em>${afterHuge}`;
    const out = trimSnippet(input, 30);
    expect(out.startsWith('…')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
    // Rough bound: two ellipses + match tags + ~60 chars of window.
    expect(out.length).toBeLessThan(120);
  });

  it('handles an unmatched opening tag gracefully', () => {
    const input = 'broken snippet with <em>open tag and no close';
    const out = trimSnippet(input, 40);
    expect(out).toContain('<em>');
  });

  it('returns input unchanged when no highlight tags are present', () => {
    const input = 'Plain text without any markers.';
    expect(trimSnippet(input)).toBe(input);
  });

  it('keeps the match whole when it spans long terms', () => {
    const input = 'Intro. The concept of <em>normalization</em> applies to data modeling.';
    const out = trimSnippet(input, 80);
    expect(out).toContain('<em>normalization</em>');
  });
});
