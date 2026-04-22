/**
 * Escape a string for safe interpolation inside a Meilisearch filter
 * expression of the form `field = "value"`.
 *
 * Meili's filter grammar uses double-quoted strings; backslashes and
 * embedded double quotes need to be escaped so a user-controlled value
 * can never break out of the quoted literal and inject additional
 * filter clauses.
 *
 * Returns the fully-quoted, escaped literal (including the surrounding
 * double quotes) so callers write `${field} = ${escapeMeiliFilter(v)}`
 * rather than re-adding quotes around the helper output.
 */
export function escapeMeiliFilter(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}
