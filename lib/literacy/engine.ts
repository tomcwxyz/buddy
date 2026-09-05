import { analyseWordSounds } from "@/lib/literacy/sound-map";

export type HelpDepth = "tell" | "clue" | "together";

export type WordSupport = {
  word: string;
  chunks: string[];
  clue: string | null;
  meaning: string | null;
  example: string | null;
  source: "curated" | "pattern" | "fallback";
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

const PREFIXES = [
  "under", "inter", "super", "trans", "over", "extra", "anti", "auto", "dis", "mis", "non", "pre", "pro", "re", "un",
];

const SUFFIXES = [
  "ation", "ition", "tion", "sion", "ment", "ness", "less", "able", "ible", "fully", "ful", "ous", "ive", "ing", "est", "ers", "er", "ed", "ly",
];

export function normaliseWord(value: string) {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/^[^a-z'-]+|[^a-z'-]+$/g, "");
}

export function getCuratedWordSupport(input: string): WordSupport | null {
  const word = normaliseWord(input);
  const curated = CURATED[word];
  return curated ? { word, ...curated, source: "curated" } : null;
}

function derivePatternSupport(word: string): Pick<WordSupport, "chunks" | "clue" | "source"> {
  const prefix = PREFIXES.find((candidate) => word.startsWith(candidate) && word.length >= candidate.length + 3);
  const suffix = SUFFIXES.find((candidate) => word.endsWith(candidate) && word.length >= candidate.length + 3);

  if (prefix && suffix) {
    return {
      chunks: [word],
      clue: `I can see ‘${prefix}’ at the start and ‘${suffix}’ at the end. Spot those first, then look at what is left.`,
      source: "pattern",
    };
  }

  if (prefix) {
    return {
      chunks: [word],
      clue: `Spot ‘${prefix}’ at the start first. Then look at the rest of the word.`,
      source: "pattern",
    };
  }

  if (suffix) {
    return {
      chunks: [word],
      clue: `Spot the ending ‘${suffix}’ first. Then look back at the rest of the word.`,
      source: "pattern",
    };
  }

  const sounds = analyseWordSounds(word);
  const feature = sounds.features[0];
  if (feature) {
    return {
      chunks: [word],
      clue: `Look at ‘${feature.letters}’. It ${feature.note}. Then listen to how it fits into the whole word.`,
      source: "pattern",
    };
  }

  return {
    chunks: [word],
    clue: null,
    source: "fallback",
  };
}

export function getWordSupport(input: string): WordSupport {
  const word = normaliseWord(input);
  const curated = getCuratedWordSupport(word);

  if (curated) return curated;

  const pattern = derivePatternSupport(word);
  return {
    word,
    chunks: pattern.chunks,
    clue: pattern.clue,
    meaning: null,
    example: null,
    source: pattern.source,
  };
}

export function helpText(support: WordSupport, depth: HelpDepth, checkedMeaning?: string | null) {
  const meaning = support.meaning ?? checkedMeaning ?? null;

  if (depth === "tell") {
    return meaning ?? "I’m finding a simple meaning for this one. You can still ask me to say it.";
  }

  if (depth === "clue") {
    return support.clue ?? "Let's hear the word, then look carefully at how the letters and sounds fit together.";
  }

  if (support.source === "curated" && support.chunks.length > 1) {
    return `Let’s use chunks: ${support.chunks.join(" · ")}. Try each bit, then put them back together.`;
  }

  return support.clue ?? "Let’s hear the whole word once, then look at the letters from left to right.";
}
