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
  planet: [
    {
      partOfSpeech: "noun",
      definition: "A large, round object in space that travels around a star.",
      example: "Mars is a planet that travels around the Sun.",
      rank: 0,
    },
  ],
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
  spring: [
    {
      partOfSpeech: "noun",
      definition: "The season after winter, when the weather gets warmer and many plants begin to grow.",
      example: "Flowers begin to grow again in spring after winter.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A coiled piece of metal that can squash or stretch and then bounce back.",
      example: "The spring inside the pen pushes the button back out.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "A place where water naturally comes out of the ground.",
      example: "Clear water flowed from a spring in the hillside.",
      rank: 2,
    },
    {
      partOfSpeech: "verb",
      definition: "To jump or move suddenly and quickly.",
      example: "The cat can spring onto the wall in one jump.",
      rank: 0,
    },
  ],
  light: [
    {
      partOfSpeech: "noun",
      definition: "Something that makes it possible to see, such as sunlight or a lamp.",
      example: "Turn on the light so we can see the page.",
      rank: 0,
    },
    {
      partOfSpeech: "adjective",
      definition: "Not heavy; easy to lift or carry.",
      example: "The empty bag was light enough to carry with one hand.",
      rank: 0,
    },
  ],
  match: [
    {
      partOfSpeech: "noun",
      definition: "A game or contest between people or teams.",
      example: "We watched the football match after school.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A small stick that makes a flame when you strike it.",
      example: "She struck a match and lit the candle.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "To be the same as, or go well with, something else.",
      example: "These two socks match because they have the same pattern.",
      rank: 0,
    },
  ],
  ring: [
    {
      partOfSpeech: "noun",
      definition: "A small circular band, often worn on a finger.",
      example: "She wore a silver ring on her finger.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A clear sound like the sound made by a bell or telephone.",
      example: "We heard the ring of the bell from the hall.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "To make a bell-like sound, or to call someone by telephone.",
      example: "The phone began to ring during dinner.",
      rank: 0,
    },
  ],
  current: [
    {
      partOfSpeech: "noun",
      definition: "A steady movement of water or air in one direction.",
      example: "The river current was strong after the rain.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "The flow of electricity through a wire or circuit.",
      example: "Electric current flows through the wire to the lamp.",
      rank: 1,
    },
    {
      partOfSpeech: "adjective",
      definition: "Happening, being used, or true now.",
      example: "The current plan is the one we are using now.",
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
