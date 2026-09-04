import { getWordSupport } from "@/lib/literacy/engine";
import type { RememberedWord } from "@/lib/learning/types";

export type PracticeWord = RememberedWord & {
  openingPrompt: string;
};

function usefulnessScore(word: RememberedWord) {
  const support = getWordSupport(word.word);
  return (
    word.heardCount * 3 +
    word.meaningCount * 2 +
    word.encounters * 2 +
    (word.helpDepths.includes("together") ? 3 : 0) +
    (word.helpDepths.includes("clue") ? 2 : 0) +
    (support.source === "curated" ? 1 : 0)
  );
}

function promptFor(word: RememberedWord) {
  const support = getWordSupport(word.word);

  if (support.source === "curated" && support.chunks.length > 1) {
    return "Have a look first. Can you spot any useful pieces in it?";
  }

  if (support.clue) {
    return "Have a look first. Is there a bit of the spelling you recognise?";
  }

  if (word.heardCount > 0) {
    return "We've heard this one before. Want to have a go before Buddy says it?";
  }

  return "Give this one a look in your own way. Ask for help whenever you want it.";
}

export function choosePracticeWords(words: RememberedWord[], limit = 3): PracticeWord[] {
  return [...words]
    .sort((a, b) => {
      const scoreDifference = usefulnessScore(b) - usefulnessScore(a);
      if (scoreDifference !== 0) return scoreDifference;
      return b.lastSeen.localeCompare(a.lastSeen);
    })
    .slice(0, limit)
    .map((word) => ({ ...word, openingPrompt: promptFor(word) }));
}
