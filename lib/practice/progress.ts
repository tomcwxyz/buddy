import type { LearningEvent } from "@/lib/learning/types";

export function exploredWordsForPracticeSet(
  events: LearningEvent[],
  practiceSetId: string,
) {
  return new Set(
    events
      .filter((event) => event.kind === "practice_explored" && event.practiceSetId === practiceSetId)
      .map((event) => event.word)
      .filter((word): word is string => Boolean(word)),
  );
}
