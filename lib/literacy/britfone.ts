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

function normaliseHeadword(value: string) {
  return normaliseWord(
    value
      .replace(/\(\d+\)$/u, "")
      .replaceAll("_", " "),
  );
}

function loadBritfoneIndex() {
  if (cachedIndex) return cachedIndex;

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
