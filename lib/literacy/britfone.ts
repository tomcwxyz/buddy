import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { normaliseWord } from "@/lib/literacy/engine";

type BritfoneIndex = Map<string, string[]>;

const require = createRequire(import.meta.url);
let cachedIndex: BritfoneIndex | null = null;
let cachedEntryCount = 0;
let loadAttempted = false;

function normaliseHeadword(value: string) {
  return normaliseWord(
    value
      .replace(/\(\d+\)$/u, "")
      .replaceAll("_", " "),
  );
}

function loadBritfoneIndex() {
  if (cachedIndex) return cachedIndex;
  if (loadAttempted) return new Map<string, string[]>();
  loadAttempted = true;

  try {
    // Resolve a normal JS/JSON package asset first, then derive the CSV path.
    // Requiring the CSV subpath directly makes webpack try to parse it as a
    // JavaScript module. Keeping Britfone external preserves this native Node
    // package path while Vercel's tracing rule carries the data file with it.
    const packageJsonPath = require.resolve("britfone/package.json");
    const dataPath = join(dirname(packageJsonPath), "britfone.main.3.0.1.csv");
    const source = readFileSync(dataPath, "utf8");
    const index: BritfoneIndex = new Map();

    for (const rawLine of source.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line) continue;

      const comma = line.indexOf(",");
      if (comma <= 0) continue;

      const word = normaliseHeadword(line.slice(0, comma).trim());
      const ipa = line.slice(comma + 1).trim();
      if (!word || !ipa) continue;

      const pronunciations = index.get(word) ?? [];
      if (!pronunciations.includes(ipa)) pronunciations.push(ipa);
      index.set(word, pronunciations);
    }

    cachedEntryCount = index.size;
    cachedIndex = index;
    return index;
  } catch (error) {
    // The broad pronunciation layer must never take down the reading loop. A
    // missing traced asset should degrade to the reviewed core + remote lexical
    // providers while emitting one server-side diagnostic for us to investigate.
    console.warn(
      "Buddy Britfone runtime unavailable; falling back to reviewed/remote pronunciation evidence.",
      error instanceof Error ? error.message : error,
    );
    cachedIndex = new Map();
    cachedEntryCount = 0;
    return cachedIndex;
  }
}

export function lookupBritfonePronunciations(wordInput: string) {
  const word = normaliseWord(wordInput);
  if (!word) return [];
  return loadBritfoneIndex().get(word) ?? [];
}

export function britfoneRuntimeManifest() {
  loadBritfoneIndex();
  return {
    source: "Britfone",
    version: "3.0.1",
    locale: "en-GB",
    licence: "MIT",
    entryCount: cachedEntryCount,
  };
}
