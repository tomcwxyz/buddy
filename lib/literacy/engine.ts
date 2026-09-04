export type HelpDepth = "tell" | "clue" | "together";

export type WordSupport = {
  word: string;
  chunks: string[];
  clue: string | null;
  meaning: string | null;
  example: string | null;
  source: "curated" | "fallback";
};

const CURATED: Record<string, Omit<WordSupport, "word" | "source">> = {
  extraordinary: {
    chunks: ["extra", "ordinary"],
    clue: "Start with ‘extra’. Then look for ‘ordinary’ hiding inside it.",
    meaning: "Very unusual, special, or surprising.",
    example: "The view from the top was extraordinary.",
  },
  because: {
    chunks: ["be", "cause"],
    clue: "You can spot ‘cause’ at the end, even though the whole word sounds a little different.",
    meaning: "It tells us the reason something happened.",
    example: "We went inside because it started raining.",
  },
  through: {
    chunks: ["through"],
    clue: "This is one of those spellings that does not give many clues. Hearing it can help.",
    meaning: "From one side or end of something to the other.",
    example: "We walked through the woods.",
  },
  thought: {
    chunks: ["thought"],
    clue: "The middle spelling is sneaky. It rhymes with ‘bought’.",
    meaning: "An idea in your mind, or the past tense of think.",
    example: "I thought the puzzle was clever.",
  },
  enough: {
    chunks: ["enough"],
    clue: "The ending looks like it should sound different. In this word, ‘ough’ ends with an ‘f’ sound.",
    meaning: "As much as you need.",
    example: "We have enough time for one more chapter.",
  },
  friend: {
    chunks: ["friend"],
    clue: "The letters ‘ie’ are the part worth noticing here.",
    meaning: "Someone you know, like, and care about.",
    example: "My friend saved me a seat.",
  },
  people: {
    chunks: ["peo", "ple"],
    clue: "The first part is the surprising bit. Hearing the whole word first may help.",
    meaning: "More than one person.",
    example: "Lots of people came to the park.",
  },
  adventure: {
    chunks: ["ad", "venture"],
    clue: "The ending ‘venture’ is a useful chunk to spot.",
    meaning: "An exciting or unusual experience.",
    example: "The walk turned into an adventure.",
  },
};

function normaliseWord(value: string) {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/^[^a-z'-]+|[^a-z'-]+$/g, "");
}

export function getWordSupport(input: string): WordSupport {
  const word = normaliseWord(input);
  const curated = CURATED[word];

  if (curated) {
    return { word, ...curated, source: "curated" };
  }

  return {
    word,
    chunks: [word],
    clue: null,
    meaning: null,
    example: null,
    source: "fallback",
  };
}

export function helpText(support: WordSupport, depth: HelpDepth) {
  if (depth === "tell") return `That's ${support.word}.`;

  if (depth === "clue") {
    return support.clue ?? "I can say this one, but I don't want to make up a word clue.";
  }

  if (support.chunks.length > 1) {
    return `Let's use chunks: ${support.chunks.join(" · ")}. Then put them back together.`;
  }

  return support.clue ?? "Let's hear the whole word first, then you can decide if you want another kind of help.";
}
