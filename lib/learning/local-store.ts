import type { LearningEvent, RememberedWord } from "@/lib/learning/types";

const STORAGE_KEY = "buddy.learning.v1";
export const LEARNING_UPDATED_EVENT = "buddy:learning-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readLearningEvents(): LearningEvent[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as LearningEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordLearningEvent(event: Omit<LearningEvent, "id" | "at">) {
  if (!canUseStorage()) return;
  const events = readLearningEvents();
  events.push({
    ...event,
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-500)));
  window.dispatchEvent(new CustomEvent(LEARNING_UPDATED_EVENT));
}

export function summariseRememberedWords(events = readLearningEvents()): RememberedWord[] {
  const byWord = new Map<string, RememberedWord>();

  events.forEach((event) => {
    if (!event.word) return;
    const existing = byWord.get(event.word) ?? {
      word: event.word,
      firstSeen: event.at,
      lastSeen: event.at,
      encounters: 0,
      heardCount: 0,
      meaningCount: 0,
      helpDepths: [],
    };

    existing.lastSeen = event.at;
    if (event.kind === "word_selected") existing.encounters += 1;
    if (event.kind === "word_heard") existing.heardCount += 1;
    if (event.kind === "meaning_requested") existing.meaningCount += 1;
    if (event.helpDepth && !existing.helpDepths.includes(event.helpDepth)) {
      existing.helpDepths.push(event.helpDepth);
    }
    byWord.set(event.word, existing);
  });

  return [...byWord.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}
