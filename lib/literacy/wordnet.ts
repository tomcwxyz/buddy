import { closeSync, openSync, readFileSync, readSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { normaliseWord } from "@/lib/literacy/engine";
import type { LexicalCandidate, LexicalRelation } from "@/lib/literacy/lexicon";

type WordNetDbPackage = {
  path: string;
  version: string;
  libVersion?: string;
};

type WordNetPos = "noun" | "verb" | "adjective" | "adverb";

type PosSpec = {
  suffix: "noun" | "verb" | "adj" | "adv";
  label: WordNetPos;
};

type IndexSense = {
  offset: number;
  rank: number;
  tagged: boolean;
};

type IndexMatch = {
  partOfSpeech: WordNetPos;
  suffix: PosSpec["suffix"];
  senses: IndexSense[];
};

export type WordNetLookup = {
  recognised: boolean;
  candidates: LexicalCandidate[];
  preferredPartOfSpeech: WordNetPos | null;
  metadata: {
    available: boolean;
    version: string | null;
    entryHit: boolean;
    senseCount: number;
    taggedSenseCount: number;
  };
};

const require = createRequire(import.meta.url);
const POS_SPECS: PosSpec[] = [
  { suffix: "noun", label: "noun" },
  { suffix: "verb", label: "verb" },
  { suffix: "adj", label: "adjective" },
  { suffix: "adv", label: "adverb" },
];

let cachedDb: WordNetDbPackage | null = null;
let dbLoadAttempted = false;
let warnedUnavailable = false;
const indexTextCache = new Map<PosSpec["suffix"], string>();
const indexStartCache = new Map<PosSpec["suffix"], number>();
const dataLineCache = new Map<string, string>();
const MAX_DATA_LINE_CACHE = 512;

function wordNetDb() {
  if (cachedDb) return cachedDb;
  if (dbLoadAttempted) return null;
  dbLoadAttempted = true;

  try {
    cachedDb = require("wordnet-db") as WordNetDbPackage;
    return cachedDb;
  } catch (error) {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn(
        "Buddy WordNet runtime unavailable; falling back to reviewed/remote lexical evidence.",
        error instanceof Error ? error.message : error,
      );
    }
    return null;
  }
}

function indexText(db: WordNetDbPackage, suffix: PosSpec["suffix"]) {
  const cached = indexTextCache.get(suffix);
  if (cached) return cached;
  const value = readFileSync(join(db.path, `index.${suffix}`), "utf8");
  indexTextCache.set(suffix, value);
  return value;
}

function firstIndexEntry(text: string, suffix: PosSpec["suffix"]) {
  const cached = indexStartCache.get(suffix);
  if (cached !== undefined) return cached;

  let cursor = 0;
  while (cursor < text.length) {
    const end = text.indexOf("\n", cursor);
    const lineEnd = end === -1 ? text.length : end;
    const line = text.slice(cursor, lineEnd);
    if (line && !line.startsWith("  ")) {
      indexStartCache.set(suffix, cursor);
      return cursor;
    }
    cursor = lineEnd + 1;
  }

  indexStartCache.set(suffix, 0);
  return 0;
}

function findIndexLine(text: string, suffix: PosSpec["suffix"], word: string) {
  let low = firstIndexEntry(text, suffix);
  let high = text.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    let lineStart = text.lastIndexOf("\n", middle - 1) + 1;
    if (lineStart < low) lineStart = low;
    const newline = text.indexOf("\n", Math.max(middle, lineStart));
    const lineEnd = newline === -1 ? text.length : newline;
    const line = text.slice(lineStart, lineEnd);

    if (!line || line.startsWith("  ")) {
      low = lineEnd + 1;
      continue;
    }

    const separator = line.indexOf(" ");
    const lemma = separator === -1 ? line : line.slice(0, separator);

    if (lemma === word) return line;
    if (lemma < word) low = lineEnd + 1;
    else high = lineStart - 1;
  }

  return null;
}

function parseIndexLine(line: string, spec: PosSpec): IndexMatch | null {
  const fields = line.trim().split(/\s+/u);
  if (fields.length < 7) return null;

  const synsetCount = Number(fields[2]);
  const pointerCount = Number(fields[3]);
  if (!Number.isFinite(synsetCount) || !Number.isFinite(pointerCount)) return null;

  const senseCountIndex = 4 + pointerCount;
  const taggedSenseCount = Number(fields[senseCountIndex + 1] ?? "0");
  const offsetStart = senseCountIndex + 2;
  const offsets = fields
    .slice(offsetStart, offsetStart + synsetCount)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return {
    partOfSpeech: spec.label,
    suffix: spec.suffix,
    senses: offsets.map((offset, rank) => ({
      offset,
      rank,
      tagged: rank < taggedSenseCount,
    })),
  };
}

function readDataLine(db: WordNetDbPackage, suffix: PosSpec["suffix"], offset: number) {
  const cacheKey = `${suffix}:${offset}`;
  const cached = dataLineCache.get(cacheKey);
  if (cached) return cached;

  const file = join(db.path, `data.${suffix}`);
  const descriptor = openSync(file, "r");
  const chunks: Buffer[] = [];
  const buffer = Buffer.allocUnsafe(4096);
  let position = offset;
  let total = 0;

  try {
    while (total < 32768) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, position);
      if (bytesRead <= 0) break;

      const slice = Buffer.from(buffer.subarray(0, bytesRead));
      const newline = slice.indexOf(10);
      if (newline >= 0) {
        chunks.push(slice.subarray(0, newline));
        break;
      }

      chunks.push(slice);
      position += bytesRead;
      total += bytesRead;
    }
  } finally {
    closeSync(descriptor);
  }

  const line = Buffer.concat(chunks).toString("utf8");
  if (dataLineCache.size >= MAX_DATA_LINE_CACHE) {
    const first = dataLineCache.keys().next().value;
    if (first) dataLineCache.delete(first);
  }
  dataLineCache.set(cacheKey, line);
  return line;
}

function glossFromDataLine(line: string) {
  const separator = line.indexOf("|");
  if (separator < 0) return null;
  const gloss = line.slice(separator + 1).trim();
  if (!gloss) return null;

  const example = [...gloss.matchAll(/"([^"]+)"/gu)][0]?.[1]?.trim() ?? null;
  const definition = gloss
    .replace(/\s*;\s*"[^"]*"/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  if (!definition) return null;
  return { definition, example };
}

function orderedSpecs(preferredPartOfSpeech?: string | null) {
  if (!preferredPartOfSpeech) return POS_SPECS;
  const preferred = POS_SPECS.find((item) => item.label === preferredPartOfSpeech);
  return preferred
    ? [preferred, ...POS_SPECS.filter((item) => item !== preferred)]
    : POS_SPECS;
}

export function lookupWordNetWord(
  wordInput: string,
  relation: LexicalRelation,
  preferredPartOfSpeech?: string | null,
): WordNetLookup {
  const word = normaliseWord(wordInput);
  const db = wordNetDb();
  if (!word || !db) {
    return {
      recognised: false,
      candidates: [],
      preferredPartOfSpeech: null,
      metadata: {
        available: Boolean(db),
        version: db?.version ?? null,
        entryHit: false,
        senseCount: 0,
        taggedSenseCount: 0,
      },
    };
  }

  const matches = orderedSpecs(preferredPartOfSpeech)
    .map((spec) => {
      const line = findIndexLine(indexText(db, spec.suffix), spec.suffix, word);
      return line ? parseIndexLine(line, spec) : null;
    })
    .filter((item): item is IndexMatch => Boolean(item));

  const candidates: LexicalCandidate[] = [];
  let taggedSenseCount = 0;

  for (const match of matches) {
    for (const sense of match.senses.slice(0, 5)) {
      const gloss = glossFromDataLine(readDataLine(db, match.suffix, sense.offset));
      if (!gloss) continue;
      if (sense.tagged) taggedSenseCount += 1;
      candidates.push({
        definition: gloss.definition,
        example: gloss.example,
        partOfSpeech: match.partOfSpeech,
        source: "wordnet",
        lookupWord: word,
        relation,
        // WordNet outputs senses in estimated frequency order. Preserve that as
        // a weak local prior; context and grammatical evidence still outrank it.
        rank: sense.rank,
      });
    }
  }

  const entryHit = matches.length > 0;
  const preferred = matches.length === 1
    ? matches[0].partOfSpeech
    : matches.find((item) => item.partOfSpeech === preferredPartOfSpeech)?.partOfSpeech ?? null;

  return {
    recognised: entryHit,
    candidates,
    preferredPartOfSpeech: preferred,
    metadata: {
      available: true,
      version: db.version,
      entryHit,
      senseCount: matches.reduce((sum, item) => sum + item.senses.length, 0),
      taggedSenseCount,
    },
  };
}

export function wordNetRuntimeManifest() {
  const db = wordNetDb();
  return {
    source: "Princeton WordNet",
    version: db?.version ?? null,
    available: Boolean(db),
    licence: "Princeton WordNet License",
  };
}
