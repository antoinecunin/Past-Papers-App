import { escapeMeiliFilter } from '../../utils/meili-filter.js';

describe('escapeMeiliFilter', () => {
  it('wraps a plain string in double quotes', () => {
    expect(escapeMeiliFilter('abc')).toBe('"abc"');
  });

  it('escapes embedded double quotes', () => {
    expect(escapeMeiliFilter('abc"def')).toBe('"abc\\"def"');
  });

  it('escapes backslashes', () => {
    expect(escapeMeiliFilter('path\\to')).toBe('"path\\\\to"');
  });

  it('escapes backslashes before double quotes', () => {
    // A raw \" in the input must become \\\" in the output so the backslash
    // is not itself reinterpreted as an escape of the quote.
    expect(escapeMeiliFilter('a\\"b')).toBe('"a\\\\\\"b"');
  });

  it('returns an empty quoted string for empty input', () => {
    expect(escapeMeiliFilter('')).toBe('""');
  });

  it('leaves filter operators inert inside the value', () => {
    // A raw OR/AND in the value stays quoted and cannot affect the filter.
    expect(escapeMeiliFilter('abc" OR 1 = 1 --')).toBe('"abc\\" OR 1 = 1 --"');
  });
});
