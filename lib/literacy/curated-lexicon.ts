import { normaliseWord } from "@/lib/literacy/engine";
import type { LexicalCandidate, LexicalRelation } from "@/lib/literacy/lexicon";

type ReviewedSense = {
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  rank: number;
};

// This is deliberately small and evidence-driven. Add words here when broad
// lexical sources are correct in general but repeatedly choose a poor sense for
// ordinary child reading. Keep examples rich enough for the contextual ranker
// to distinguish senses without hard-coding sentence-specific keyword rules.
const REVIEWED_COMMON_SENSES: Record<string, ReviewedSense[]> = {
  plant: [
    {
      partOfSpeech: "noun",
      definition: "A living thing that grows and can have roots, leaves or flowers.",
      example: "The plant grew a flower beside the window.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A factory or large place where things are made.",
      example: "The car plant makes engines and other vehicle parts.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "To put a seed or young plant into soil so it can grow.",
      example: "We plant seeds in the garden in spring.",
      rank: 0,
    },
  ],
};

export function reviewedCommonCandidates(
  wordInput: string,
  relation: LexicalRelation,
): LexicalCandidate[] {
  const word = normaliseWord(wordInput);
  return (REVIEWED_COMMON_SENSES[word] ?? []).map((sense) => ({
    definition: sense.definition,
    example: sense.example,
    partOfSpeech: sense.partOfSpeech,
    source: "buddy-curated",
    lookupWord: word,
    relation,
    rank: sense.rank,
  }));
}
