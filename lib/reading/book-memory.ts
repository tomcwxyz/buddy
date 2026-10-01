export type ReadingMemoryMode = "session" | "device";

export type BookMemoryCorrection = {
  observed: string;
  corrected: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
};

export type BookMemoryTerm = {
  token: string;
  count: number;
  confirmedCount: number;
  lastSeen: string;
};

export type BookMemoryRecord = {
  id: string;
  label?: string;
  createdAt: string;
  updatedAt: string;
  fingerprints: string[];
  terms: BookMemoryTerm[];
  corrections: BookMemoryCorrection[];
};

const MEMORY_KEY = "buddy.book-memory.v1";
const MEMORY_MODE_KEY = "buddy.reading-memory-mode.v1";
const MAX_BOOKS = 24;
const MAX_FINGERPRINTS_PER_BOOK = 120;
const MAX_TERMS_PER_BOOK = 250;
const MAX_CORRECTIONS_PER_BOOK = 120;

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from",
  "had", "has", "have", "he", "her", "his", "i", "in", "is", "it", "its", "of",
  "on", "or", "our", "she", "so", "that", "the", "their", "them", "there", "they",
  "this", "to", "was", "we", "were", "with", "you",
]);

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function normaliseBookToken(value: string) {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[‘’]/g, "'")
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "")
    .trim();
}

export function bookTokens(text: string) {
  return text
    .split(/\s+/)
    .map(normaliseBookToken)
    .filter((token) => token.length >= 2);
}

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Produce compact hashed shingles rather than retaining the source passage.
 * These fingerprints are useful for recognising a previously seen local book
 * context but are not intended to reconstruct the page text.
 */
export function passageFingerprints(text: string) {
  const tokens = bookTokens(text);
  if (tokens.length < 3) return [];

  const fingerprints = new Set<string>();

  for (let index = 0; index <= tokens.length - 3; index += 1) {
    const shingle = tokens.slice(index, index + 3);
    const distinctive = shingle.filter((token) => token.length >= 5 && !STOP_WORDS.has(token));
    if (!distinctive.length) continue;
    fingerprints.add(fnv1a(shingle.join("|")));
  }

  return [...fingerprints].slice(0, 40);
}

export function fingerprintSimilarity(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const left = new Set(a);
  const right = new Set(b);
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }
  const union = new Set([...left, ...right]).size;
  return union > 0 ? intersection / union : 0;
}

export function matchBookMemory(
  text: string,
  records: BookMemoryRecord[],
  minimumSimilarity = 0.16,
) {
  const fingerprints = passageFingerprints(text);
  if (!fingerprints.length) return null;

  const ranked = records
    .map((record) => ({
      record,
      similarity: fingerprintSimilarity(fingerprints, record.fingerprints),
    }))
    .filter((candidate) => candidate.similarity >= minimumSimilarity)
    .sort((a, b) => b.similarity - a.similarity);

  return ranked[0] ?? null;
}

export function createBookMemory(id: string, label?: string, now = new Date().toISOString()): BookMemoryRecord {
  return {
    id,
    ...(label?.trim() ? { label: label.trim() } : {}),
    createdAt: now,
    updatedAt: now,
    fingerprints: [],
    terms: [],
    corrections: [],
  };
}

function mergeFingerprints(existing: string[], incoming: string[]) {
  return [...new Set([...incoming, ...existing])].slice(0, MAX_FINGERPRINTS_PER_BOOK);
}

function addTerms(record: BookMemoryRecord, text: string, confirmed: boolean, now: string) {
  const terms = new Map(record.terms.map((term) => [term.token, { ...term }]));
  for (const token of bookTokens(text)) {
    if (STOP_WORDS.has(token) || token.length < 4) continue;
    const existing = terms.get(token) ?? {
      token,
      count: 0,
      confirmedCount: 0,
      lastSeen: now,
    };
    existing.count += 1;
    if (confirmed) existing.confirmedCount += 1;
    existing.lastSeen = now;
    terms.set(token, existing);
  }

  return [...terms.values()]
    .sort((a, b) =>
      b.confirmedCount - a.confirmedCount
      || b.count - a.count
      || b.lastSeen.localeCompare(a.lastSeen),
    )
    .slice(0, MAX_TERMS_PER_BOOK);
}

export function observeBookPassage(
  record: BookMemoryRecord,
  text: string,
  options: { confirmed?: boolean; now?: string } = {},
): BookMemoryRecord {
  const now = options.now ?? new Date().toISOString();
  return {
    ...record,
    updatedAt: now,
    fingerprints: mergeFingerprints(record.fingerprints, passageFingerprints(text)),
    terms: addTerms(record, text, options.confirmed ?? false, now),
  };
}

export function rememberBookCorrection(
  record: BookMemoryRecord,
  observed: string,
  corrected: string,
  now = new Date().toISOString(),
): BookMemoryRecord {
  const from = normaliseBookToken(observed);
  const to = normaliseBookToken(corrected);
  if (!from || !to || from === to) return record;

  const key = `${from}=>${to}`;
  const corrections = new Map(
    record.corrections.map((correction) => [
      `${correction.observed}=>${correction.corrected}`,
      { ...correction },
    ]),
  );

  const existing = corrections.get(key) ?? {
    observed: from,
    corrected: to,
    count: 0,
    firstSeen: now,
    lastSeen: now,
  };

  existing.count += 1;
  existing.lastSeen = now;
  corrections.set(key, existing);

  return observeBookPassage({
    ...record,
    updatedAt: now,
    corrections: [...corrections.values()]
      .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, MAX_CORRECTIONS_PER_BOOK),
  }, to, { confirmed: true, now });
}

export function correctionCandidate(record: BookMemoryRecord, observed: string) {
  const token = normaliseBookToken(observed);
  if (!token) return null;

  const candidates = record.corrections
    .filter((correction) => correction.observed === token)
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));

  const best = candidates[0];
  if (!best) return null;

  return {
    text: best.corrected,
    confidence: Math.min(0.98, 0.72 + Math.log2(best.count + 1) * 0.08),
    observations: best.count,
  };
}

export function likelyBookTerm(record: BookMemoryRecord, token: string) {
  const normalised = normaliseBookToken(token);
  const term = record.terms.find((candidate) => candidate.token === normalised);
  if (!term) return null;

  return {
    token: term.token,
    count: term.count,
    confirmedCount: term.confirmedCount,
    confidence: Math.min(
      0.94,
      0.45 + Math.log2(term.count + 1) * 0.07 + Math.log2(term.confirmedCount + 1) * 0.12,
    ),
  };
}

function boundedEditDistance(a: string, b: string, maximum: number) {
  if (Math.abs(a.length - b.length) > maximum) return maximum + 1;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let left = 1; left <= a.length; left += 1) {
    const current = [left];
    let rowMinimum = current[0];

    for (let right = 1; right <= b.length; right += 1) {
      const substitution = previous[right - 1] + (a[left - 1] === b[right - 1] ? 0 : 1);
      const insertion = current[right - 1] + 1;
      const deletion = previous[right] + 1;
      current[right] = Math.min(substitution, insertion, deletion);
      rowMinimum = Math.min(rowMinimum, current[right]);
    }

    if (rowMinimum > maximum) return maximum + 1;
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
  }

  return previous[b.length];
}

export type BookMemoryCandidate = {
  text: string;
  confidence: number;
  reason: "explicit-correction" | "confirmed-term";
  observations: number;
};

/**
 * Return only strong, locally grounded alternatives. An explicit correction is
 * strongest. A fuzzy remembered term is considered only when it has been
 * explicitly confirmed before and the OCR spelling is very close.
 */
export function bookMemoryCandidates(
  record: BookMemoryRecord,
  observed: string,
): BookMemoryCandidate[] {
  const token = normaliseBookToken(observed);
  if (!token) return [];

  const candidates: BookMemoryCandidate[] = [];
  const correction = correctionCandidate(record, token);
  if (correction) {
    candidates.push({
      text: correction.text,
      confidence: correction.confidence,
      reason: "explicit-correction",
      observations: correction.observations,
    });
  }

  if (token.length >= 5) {
    for (const term of record.terms) {
      if (term.confirmedCount < 1 || term.token === token || term.token.length < 5) continue;
      const maximumDistance = Math.max(token.length, term.token.length) >= 8 ? 2 : 1;
      const distance = boundedEditDistance(token, term.token, maximumDistance);
      if (distance > maximumDistance) continue;

      const similarity = 1 - distance / Math.max(token.length, term.token.length);
      if (similarity < 0.78) continue;

      candidates.push({
        text: term.token,
        confidence: Math.min(
          0.91,
          0.64
            + similarity * 0.16
            + Math.log2(term.confirmedCount + 1) * 0.06,
        ),
        reason: "confirmed-term",
        observations: term.confirmedCount,
      });
    }
  }

  const byText = new Map<string, BookMemoryCandidate>();
  for (const candidate of candidates) {
    const existing = byText.get(candidate.text);
    if (!existing || candidate.confidence > existing.confidence) byText.set(candidate.text, candidate);
  }

  return [...byText.values()]
    .sort((a, b) => b.confidence - a.confidence || b.observations - a.observations)
    .slice(0, 3);
}

export function readReadingMemoryMode(): ReadingMemoryMode {
  if (!canUseStorage()) return "session";
  return window.localStorage.getItem(MEMORY_MODE_KEY) === "device" ? "device" : "session";
}

export function setReadingMemoryMode(mode: ReadingMemoryMode) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MEMORY_MODE_KEY, mode);
}

export function readBookMemories(): BookMemoryRecord[] {
  if (!canUseStorage() || readReadingMemoryMode() !== "device") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MEMORY_KEY) ?? "[]") as BookMemoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBookMemory(record: BookMemoryRecord) {
  if (!canUseStorage() || readReadingMemoryMode() !== "device") return;
  const existing = readBookMemories().filter((candidate) => candidate.id !== record.id);
  window.localStorage.setItem(
    MEMORY_KEY,
    JSON.stringify([record, ...existing].slice(0, MAX_BOOKS)),
  );
}
