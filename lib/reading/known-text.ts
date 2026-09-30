import { normaliseEvidenceText, type ReadingEvidence } from "@/lib/reading/evidence";

export type KnownTextLicence =
  | "public-domain"
  | "open-licence"
  | "school-provided"
  | "publisher-licensed"
  | "user-provided";

export type KnownTextSource = {
  id: string;
  title?: string;
  text: string;
  licence: KnownTextLicence;
  sourceNote?: string;
};

export type KnownTextMatch = {
  sourceId: string;
  title?: string;
  licence: KnownTextLicence;
  score: number;
  exactMatches: number;
  fuzzyMatches: number;
  comparedTokens: number;
  canonicalTokens: string[];
  startToken: number;
  endToken: number;
};

function tokens(value: string) {
  return value
    .split(/\s+/)
    .map(normaliseEvidenceText)
    .filter(Boolean);
}

function editDistanceAtMostOne(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  let left = 0;
  let right = 0;
  let edits = 0;

  while (left < a.length && right < b.length) {
    if (a[left] === b[right]) {
      left += 1;
      right += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (a.length > b.length) left += 1;
    else if (b.length > a.length) right += 1;
    else {
      left += 1;
      right += 1;
    }
  }

  if (left < a.length || right < b.length) edits += 1;
  return edits <= 1;
}

function tokenMatchScore(observed: string, canonical: string) {
  if (observed === canonical) return 1;
  if (observed.length >= 5 && canonical.length >= 5 && editDistanceAtMostOne(observed, canonical)) return 0.72;
  return 0;
}

function candidateOffsets(observed: string[], canonical: string[]) {
  const offsets = new Map<number, number>();
  const usefulObserved = observed
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.length >= 5)
    .slice(0, 18);

  for (const { token, index: observedIndex } of usefulObserved) {
    canonical.forEach((candidate, canonicalIndex) => {
      if (candidate !== token) return;
      const offset = canonicalIndex - observedIndex;
      offsets.set(offset, (offsets.get(offset) ?? 0) + 1);
    });
  }

  return [...offsets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([offset]) => offset);
}

function scoreWindow(observed: string[], canonical: string[], start: number) {
  let score = 0;
  let exactMatches = 0;
  let fuzzyMatches = 0;
  let comparedTokens = 0;
  const matchedCanonical: string[] = [];

  for (let index = 0; index < observed.length; index += 1) {
    const canonicalIndex = start + index;
    if (canonicalIndex < 0 || canonicalIndex >= canonical.length) continue;
    const observedToken = observed[index];
    const canonicalToken = canonical[canonicalIndex];
    const tokenScore = tokenMatchScore(observedToken, canonicalToken);
    comparedTokens += 1;
    matchedCanonical.push(canonicalToken);
    score += tokenScore;
    if (tokenScore === 1) exactMatches += 1;
    else if (tokenScore > 0) fuzzyMatches += 1;
  }

  const normalisedScore = comparedTokens > 0 ? score / comparedTokens : 0;
  const anchorStrength = observed.length > 0 ? exactMatches / observed.length : 0;

  return {
    score: normalisedScore * 0.82 + anchorStrength * 0.18,
    exactMatches,
    fuzzyMatches,
    comparedTokens,
    canonicalTokens: matchedCanonical,
    startToken: Math.max(0, start),
    endToken: Math.min(canonical.length, start + observed.length),
  };
}

/**
 * Find a strong canonical passage match without allowing generation.
 *
 * At least four observed tokens and two exact anchors are required. The caller
 * should still apply its own threshold depending on whether a known-text
 * result is being used to display, suggest or automatically fill text.
 */
export function findKnownTextMatch(
  observedText: string,
  sources: KnownTextSource[],
  minimumScore = 0.72,
): KnownTextMatch | null {
  const observed = tokens(observedText);
  if (observed.length < 4) return null;

  const matches: KnownTextMatch[] = [];

  for (const source of sources) {
    const canonical = tokens(source.text);
    if (canonical.length < 4) continue;

    const offsets = candidateOffsets(observed, canonical);
    for (const offset of offsets) {
      const result = scoreWindow(observed, canonical, offset);
      if (result.exactMatches < 2 || result.score < minimumScore) continue;
      matches.push({
        sourceId: source.id,
        ...(source.title ? { title: source.title } : {}),
        licence: source.licence,
        ...result,
      });
    }
  }

  return matches.sort((a, b) =>
    b.score - a.score
    || b.exactMatches - a.exactMatches
    || a.fuzzyMatches - b.fuzzyMatches,
  )[0] ?? null;
}

export function knownTextEvidence(
  candidate: string,
  match: Pick<KnownTextMatch, "sourceId" | "score">,
): ReadingEvidence {
  return {
    source: "known-text",
    candidate,
    confidence: Math.max(0, Math.min(1, match.score)),
    sourceId: match.sourceId,
    method: "canonical-sequence-alignment",
    evidenceId: `known-text:${match.sourceId}`,
    independent: true,
  };
}
