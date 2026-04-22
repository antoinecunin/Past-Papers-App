const OPEN = '<em>';
const CLOSE = '</em>';
const ELLIPSIS = '…';

/**
 * Produce a short snippet around the first highlighted match. The window
 * extends to the nearest sentence boundary on each side (period, '?', '!',
 * or newline), falling back to a hard character cap when no boundary is
 * found. An ellipsis marks trimmed ends so the reader knows it's a fragment.
 */
export function trimSnippet(highlighted: string, maxPerSide = 80): string {
  const start = highlighted.indexOf(OPEN);
  if (start === -1) {
    return highlighted.length > maxPerSide * 2
      ? highlighted.slice(0, maxPerSide * 2).trimEnd() + ELLIPSIS
      : highlighted;
  }
  const end = highlighted.indexOf(CLOSE, start);
  // Malformed tags — fall back to a hard crop around the opening tag.
  if (end === -1) {
    const left = Math.max(0, start - maxPerSide);
    const right = Math.min(highlighted.length, start + maxPerSide);
    return (
      (left > 0 ? ELLIPSIS : '') +
      highlighted.slice(left, right).trim() +
      (right < highlighted.length ? ELLIPSIS : '')
    );
  }
  const matchEnd = end + CLOSE.length;

  // Look backwards for the closest sentence boundary within the window.
  const leftWindowStart = Math.max(0, start - maxPerSide);
  const leftSlice = highlighted.slice(leftWindowStart, start);
  const leftBoundary = leftSlice.search(/[.?!\n][^.?!\n]*$/);
  const leftHitBoundary = leftBoundary !== -1;
  const leftCut = leftHitBoundary ? leftWindowStart + leftBoundary + 1 : leftWindowStart;

  // Look forwards for the closest sentence boundary within the window.
  const rightWindowEnd = Math.min(highlighted.length, matchEnd + maxPerSide);
  const rightSlice = highlighted.slice(matchEnd, rightWindowEnd);
  const rightBoundaryRelative = rightSlice.search(/[.?!\n]/);
  const rightHitBoundary = rightBoundaryRelative !== -1;
  const rightCut = rightHitBoundary ? matchEnd + rightBoundaryRelative + 1 : rightWindowEnd;

  // Only add ellipsis when we cut mid-sentence (hard cap) — a clean sentence
  // boundary speaks for itself.
  const trimmedLeft = leftCut > 0 && !leftHitBoundary;
  const trimmedRight = rightCut < highlighted.length && !rightHitBoundary;
  const body = highlighted.slice(leftCut, rightCut).trim();

  return (trimmedLeft ? ELLIPSIS : '') + body + (trimmedRight ? ELLIPSIS : '');
}
