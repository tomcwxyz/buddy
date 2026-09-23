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


export function explorationSignalsForWord(
  events: LearningEvent[],
  practiceSetId: string,
  word: string,
) {
  const relevant = events.filter(
    (event) => event.practiceSetId === practiceSetId && event.word === word,
  );

  return {
    heard: relevant.some((event) => event.kind === "word_heard"),
    clue: relevant.some(
      (event) => event.kind === "help_depth_changed" && event.helpDepth === "clue",
    ),
    together: relevant.some(
      (event) => event.kind === "help_depth_changed" && event.helpDepth === "together",
    ),
    meaning: relevant.some((event) => event.kind === "meaning_requested"),
  };
}
