import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { normaliseWord } from "@/lib/literacy/engine";

type BritfonePackage = {
  main: string;
};

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
    // `britfone` is deliberately configured as a serverExternalPackage. That
    // means this CommonJS require now executes as native Node at runtime and
    // the package's own __dirname points at its real node_modules directory.
    // This is safer than letting webpack rewrite require.resolve() to a module
    // id or trying to import the CSV as JavaScript.
    const britfone = require("britfone") as BritfonePackage;
    const source = readFileSync(britfone.main, "utf8");
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
