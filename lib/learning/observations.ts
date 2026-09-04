import type { LearningEvent } from "@/lib/learning/types";

export type LearningObservation = {
  id: string;
  title: string;
  body: string;
  evidenceCount: number;
};

export type ObservationDecision = "yes" | "no" | "unsure";

const DECISIONS_KEY = "buddy.observation-decisions.v1";
export const OBSERVATIONS_UPDATED_EVENT = "buddy:observations-updated";

export function inferObservations(events: LearningEvent[]): LearningObservation[] {
  const selected = events.filter((event) => event.kind === "word_selected").length;
  const heard = events.filter((event) => event.kind === "word_heard").length;
  const meanings = events.filter((event) => event.kind === "meaning_requested").length;
  const clues = events.filter(
    (event) => event.kind === "help_depth_changed" && event.helpDepth === "clue",
  ).length;
  const together = events.filter(
    (event) => event.kind === "help_depth_changed" && event.helpDepth === "together",
  ).length;

  const observations: LearningObservation[] = [];

  if (selected >= 2 && heard >= 2) {
    observations.push({
      id: "hearing-new-words",
      title: "Hearing a word first might help sometimes.",
      body: "You've chosen to hear words out loud more than once. Is that something you find useful?",
      evidenceCount: heard,
    });
  }

  if (meanings >= 2) {
    observations.push({
      id: "meaning-in-context",
      title: "Knowing what a word means seems important to you.",
      body: "You've asked what words mean a few times while reading, rather than only asking how to say them.",
      evidenceCount: meanings,
    });
  }

  if (clues + together >= 2) {
    observations.push({
      id: "work-it-out",
      title: "Sometimes you choose to work a word out rather than just be told.",
      body: "You've picked clues or worked words out together more than once. We can keep noticing when that feels useful.",
      evidenceCount: clues + together,
    });
  }

  return observations;
}

export function readObservationDecisions(): Record<string, ObservationDecision> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DECISIONS_KEY) ?? "{}") as Record<string, ObservationDecision>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function recordObservationDecision(id: string, decision: ObservationDecision) {
  if (typeof window === "undefined") return;
  const decisions = readObservationDecisions();
  decisions[id] = decision;
  window.localStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions));
  window.dispatchEvent(new CustomEvent(OBSERVATIONS_UPDATED_EVENT));
}
