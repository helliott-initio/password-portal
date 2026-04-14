// Normalizer for queue search queries. The Firestore index is built from
// per-word prefix tokens (see functions/src/utils/searchTokens.ts), so a raw
// query containing punctuation like "gmail.com" or "user@example" can't be
// sent as-is — we need to extract a single word to use as the array-contains
// clause, then refine client-side with the full original query.

const MIN_LEN = 2;
const MAX_LEN = 15;

export interface NormalizedSearch {
  /** The first alphanumeric word in the query, used for the Firestore
   *  array-contains clause. Matches the token format written at ingest time. */
  serverToken: string;
  /** The full lowercased raw query, used for a client-side substring filter
   *  over server results so queries like "john.doe" correctly narrow down
   *  beyond just "john". */
  clientFilter: string;
  /** Whether the client-side filter differs from the server token and should
   *  therefore be applied as an additional refinement. */
  needsClientRefine: boolean;
}

export function normalizeSearchQuery(raw: string): NormalizedSearch | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length < MIN_LEN) return null;

  // Split on the same separators the server-side tokenizer uses.
  const words = trimmed.split(/[^a-z0-9]+/).filter((w) => w.length >= MIN_LEN);
  if (words.length === 0) return null;

  const serverToken = words[0].slice(0, MAX_LEN);
  return {
    serverToken,
    clientFilter: trimmed,
    needsClientRefine: trimmed !== serverToken,
  };
}
