import { normaliseSpellingWord } from "@/lib/practice/spelling-import";

export type PracticeSetSource = "school-photo" | "manual";

export type PracticeSet = {
  id: string;
  label: string;
  source: PracticeSetSource;
  createdAt: string;
  words: string[];
  visual: "rollercoaster";
};

const SETS_STORAGE_KEY = "buddy.practice-sets.v1";
const ACTIVE_SET_STORAGE_KEY = "buddy.practice-active-set.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function uniqueWords(words: string[]) {
  const seen = new Set<string>();
  return words
    .map(normaliseSpellingWord)
    .filter((word) => {
      if (!word || seen.has(word)) return false;
      seen.add(word);
      return true;
    });
}

export function readPracticeSets(): PracticeSet[] {
  if (!canUseStorage()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(SETS_STORAGE_KEY) ?? "[]") as PracticeSet[];
    return Array.isArray(value) ? value.filter((set) => Array.isArray(set.words)) : [];
  } catch {
    return [];
  }
}

export function savePracticeSet(input: {
  label: string;
  source: PracticeSetSource;
  words: string[];
}) {
  if (!canUseStorage()) return null;

  const words = uniqueWords(input.words);
  if (words.length === 0) return null;

  const set: PracticeSet = {
    id: globalThis.crypto?.randomUUID?.() ?? `practice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: input.label.trim() || "This week's spellings",
    source: input.source,
    createdAt: new Date().toISOString(),
    words,
    visual: "rollercoaster",
  };

  const existing = readPracticeSets();
  window.localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify([set, ...existing].slice(0, 20)));
  window.localStorage.setItem(ACTIVE_SET_STORAGE_KEY, set.id);
  return set;
}

export function readActivePracticeSet() {
  if (!canUseStorage()) return null;
  const activeId = window.localStorage.getItem(ACTIVE_SET_STORAGE_KEY);
  if (!activeId) return null;
  return readPracticeSets().find((set) => set.id === activeId) ?? null;
}

export function setActivePracticeSet(id: string | null) {
  if (!canUseStorage()) return;
  if (id) window.localStorage.setItem(ACTIVE_SET_STORAGE_KEY, id);
  else window.localStorage.removeItem(ACTIVE_SET_STORAGE_KEY);
}
