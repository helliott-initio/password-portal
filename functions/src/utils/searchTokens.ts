/**
 * Search token builder for Firestore array-contains search.
 *
 * Firestore has no full-text search. To support server-side queue search, we
 * pre-compute an array of lowercased prefix tokens from the recipient's email
 * and name at write time. The client then queries with:
 *
 *   where('searchTokens', 'array-contains', userQueryLower)
 *
 * This matches any row where the user's query is a prefix of any word in the
 * email or name. Example for "john.doe@example.com" + name "John Smith":
 *
 *   ["jo", "joh", "john", "do", "doe", "ex", "exa", "exam", "examp",
 *    "exampl", "example", "co", "com", "sm", "smi", "smit", "smith"]
 *
 * Typing "exa" returns the doc. Typing "amp" does NOT (only word-start
 * prefixes match — true substring search would need Algolia/Typesense).
 *
 * Caps: min length 2, max length 15 per token, keeps each doc's token array
 * well under Firestore's 20,000-element field limit (usually 15–40 tokens).
 */

const MIN_LEN = 2;
const MAX_LEN = 15;

function addPrefixes(word: string, tokens: Set<string>): void {
  const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.length < MIN_LEN) return;
  const end = Math.min(normalized.length, MAX_LEN);
  for (let len = MIN_LEN; len <= end; len++) {
    tokens.add(normalized.slice(0, len));
  }
}

export function buildSearchTokens(
  email: string,
  name?: string | null
): string[] {
  const tokens = new Set<string>();

  // Split email on common separators so each word becomes its own token source
  for (const part of email.split(/[@.\-_+\s]/)) {
    addPrefixes(part, tokens);
  }

  // Name split on whitespace
  if (name) {
    for (const part of name.split(/\s+/)) {
      addPrefixes(part, tokens);
    }
  }

  return Array.from(tokens);
}

/**
 * Normalize a user's search query to match the stored token format. Returns
 * null if the query is too short to search on (avoids an unbounded query when
 * the user has only typed one character).
 */
export function normalizeSearchQuery(raw: string): string | null {
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.length < MIN_LEN) return null;
  return normalized.slice(0, MAX_LEN);
}
