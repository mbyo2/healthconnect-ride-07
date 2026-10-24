/**
 * Safe construction of PostgREST `.or()` ilike filters from user input
 * (P3-25).
 *
 * Several search surfaces built filters by template literal:
 *   .or(`first_name.ilike.%${searchTerm}%,...`)
 * A search term containing a comma, parenthesis or quote breaks out of
 * the intended filter grammar (PostgREST parses the whole string), and
 * `%` / `_` act as LIKE wildcards — so raw input could silently widen or
 * corrupt the query. Values were app-generated in the original audit
 * instance, but the pattern is an injection waiting for a raw input.
 *
 * The fix is one canonical sanitiser: strip every character that is
 * structural in the .or() grammar or a LIKE wildcard, then wrap in %…%.
 * (Two admin surfaces already stripped `[%_,()]` inline; this helper is
 * a superset — it also removes backslash and double-quote — and is now
 * the single implementation every call site uses.)
 */
export function sanitizeOrSearchTerm(term: string): string {
  return term.replace(/[%_,()"\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** `%term%` ilike pattern with the term sanitised for .or() filters. */
export function orIlikePattern(term: string): string {
  return `%${sanitizeOrSearchTerm(term)}%`;
}
