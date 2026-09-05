import { normaliseWord } from "@/lib/literacy/engine";

export type MorphologyConfidence = "high" | "medium" | "low";

export type MorphologyCandidate = {
  lemma: string;
  partOfSpeech: "verb" | "noun" | "adjective" | null;
  form: string | null;
  confidence: MorphologyConfidence;
  reason: "irregular" | "suffix" | "context" | "wiktionary";
};

export type MorphologyAnalysis = {
  surface: string;
  lemma: string;
  partOfSpeech: "verb" | "noun" | "adjective" | null;
  form: string | null;
  confidence: MorphologyConfidence;
  candidates: MorphologyCandidate[];
};

type IrregularForm = Omit<MorphologyCandidate, "reason">;

const IRREGULAR_FORMS: Record<string, IrregularForm> = {
  am: { lemma: "be", partOfSpeech: "verb", form: "present form", confidence: "high" },
  are: { lemma: "be", partOfSpeech: "verb", form: "present form", confidence: "high" },
  been: { lemma: "be", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  being: { lemma: "be", partOfSpeech: "verb", form: "present participle", confidence: "high" },
  is: { lemma: "be", partOfSpeech: "verb", form: "present form", confidence: "high" },
  was: { lemma: "be", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  were: { lemma: "be", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  became: { lemma: "become", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  begun: { lemma: "begin", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  began: { lemma: "begin", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  bought: { lemma: "buy", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  brought: { lemma: "bring", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  built: { lemma: "build", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  came: { lemma: "come", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  caught: { lemma: "catch", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  chose: { lemma: "choose", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  chosen: { lemma: "choose", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  did: { lemma: "do", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  done: { lemma: "do", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  drank: { lemma: "drink", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  drunk: { lemma: "drink", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  drove: { lemma: "drive", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  driven: { lemma: "drive", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  ate: { lemma: "eat", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  eaten: { lemma: "eat", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  fell: { lemma: "fall", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  fallen: { lemma: "fall", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  felt: { lemma: "feel", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  found: { lemma: "find", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  flew: { lemma: "fly", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  flown: { lemma: "fly", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  forgot: { lemma: "forget", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  gave: { lemma: "give", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  given: { lemma: "give", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  gone: { lemma: "go", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  went: { lemma: "go", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  grew: { lemma: "grow", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  grown: { lemma: "grow", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  had: { lemma: "have", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  heard: { lemma: "hear", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  held: { lemma: "hold", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  kept: { lemma: "keep", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  knew: { lemma: "know", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  known: { lemma: "know", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  left: { lemma: "leave", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  lost: { lemma: "lose", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  made: { lemma: "make", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  meant: { lemma: "mean", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  met: { lemma: "meet", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  paid: { lemma: "pay", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  ran: { lemma: "run", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  said: { lemma: "say", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  saw: { lemma: "see", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  seen: { lemma: "see", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  sent: { lemma: "send", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  slept: { lemma: "sleep", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  sold: { lemma: "sell", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  spoke: { lemma: "speak", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  spoken: { lemma: "speak", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  stood: { lemma: "stand", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  swam: { lemma: "swim", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  swum: { lemma: "swim", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  took: { lemma: "take", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  taken: { lemma: "take", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  taught: { lemma: "teach", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  told: { lemma: "tell", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  thought: { lemma: "think", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  understood: { lemma: "understand", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  wore: { lemma: "wear", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  worn: { lemma: "wear", partOfSpeech: "verb", form: "past participle", confidence: "high" },
  won: { lemma: "win", partOfSpeech: "verb", form: "past tense / past participle", confidence: "high" },
  wrote: { lemma: "write", partOfSpeech: "verb", form: "past tense", confidence: "high" },
  written: { lemma: "write", partOfSpeech: "verb", form: "past participle", confidence: "high" },
};

// Copular forms of “be” are deliberately not treated as generic verb cues.
// In “the bag was light”, the following word is usually an adjective; in
// “the dog was running”, the -ing shape itself supplies the participle evidence.
// This avoids forcing ordinary adjectives and nouns into verb senses.
const VERB_AUXILIARIES = new Set([
  "can", "could", "did", "do", "does", "had", "has", "have", "may", "might", "must", "shall", "should", "will", "would",
]);

const COPULAR_BE = new Set([
  "am", "are", "be", "been", "being", "is", "was", "were",
]);

const DETERMINERS = new Set([
  "a", "an", "another", "any", "each", "every", "her", "his", "its", "my", "our", "some", "that", "the", "their", "these", "this", "those", "your",
]);

// A subject pronoun immediately before a lexical word is strong, ordinary
// sentence-structure evidence for a verb: “she carries”, “I object”, “they
// record”. Keeping this separate from possessive determiners avoids treating
// phrases such as “her record” as verbs.
const SUBJECT_PRONOUNS = new Set([
  "he", "i", "it", "she", "they", "we", "you",
]);

function looksLikeParticiple(word: string) {
  return (word.endsWith("ing") && word.length > 5)
    || (word.endsWith("ed") && word.length > 4);
}

function contextPartOfSpeech(word: string, context: string) {
  const tokens = context.toLocaleLowerCase("en-GB").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
  const index = tokens.findIndex((token) => normaliseWord(token) === word);
  if (index < 0) return null;

  const left = index > 0 ? normaliseWord(tokens[index - 1]) : null;
  if (left === "to" || (left && VERB_AUXILIARIES.has(left))) return "verb" as const;
  if (left && SUBJECT_PRONOUNS.has(left)) return "verb" as const;
  if (left && COPULAR_BE.has(left) && looksLikeParticiple(word)) return "verb" as const;
  if (left && DETERMINERS.has(left)) return "noun" as const;
  return null;
}

function dedupe(candidates: MorphologyCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (!candidate.lemma || seen.has(candidate.lemma)) return false;
    seen.add(candidate.lemma);
    return true;
  });
}

function regularCandidates(word: string, contextPos: "verb" | "noun" | null): MorphologyCandidate[] {
  const candidates: MorphologyCandidate[] = [];
  const push = (lemma: string, partOfSpeech: "verb" | "noun" | null, form: string) => {
    if (lemma.length < 2 || lemma === word) return;
    candidates.push({ lemma, partOfSpeech, form, confidence: contextPos === partOfSpeech ? "medium" : "low", reason: "suffix" });
  };

  if (word.endsWith("ied") && word.length > 4) {
    push(`${word.slice(0, -3)}y`, "verb", "past tense / past participle");
  } else if (word.endsWith("ed") && word.length > 4) {
    const stem = word.slice(0, -2);
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) push(stem.slice(0, -1), "verb", "past tense / past participle");
    push(stem, "verb", "past tense / past participle");
    push(`${stem}e`, "verb", "past tense / past participle");
  }

  if (word.endsWith("ies") && word.length > 4) {
    push(`${word.slice(0, -3)}y`, contextPos === "verb" ? "verb" : "noun", contextPos === "verb" ? "present form" : "plural");
  } else if (word.endsWith("es") && word.length > 4) {
    const stem = word.slice(0, -2);
    push(stem, contextPos === "verb" ? "verb" : "noun", contextPos === "verb" ? "present form" : "plural");
    push(word.slice(0, -1), contextPos === "verb" ? "verb" : "noun", contextPos === "verb" ? "present form" : "plural");
  } else if (word.endsWith("s") && word.length > 3 && !word.endsWith("ss")) {
    push(word.slice(0, -1), contextPos === "verb" ? "verb" : "noun", contextPos === "verb" ? "present form" : "plural");
  }

  if (word.endsWith("ing") && word.length > 5) {
    const stem = word.slice(0, -3);
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) push(stem.slice(0, -1), "verb", "present participle");
    push(stem, "verb", "present participle");
    push(`${stem}e`, "verb", "present participle");
  }

  return candidates;
}

export function analyseMorphology(input: string, context = ""): MorphologyAnalysis {
  const surface = normaliseWord(input);
  const contextPos = contextPartOfSpeech(surface, context);
  const irregular = IRREGULAR_FORMS[surface];
  const candidates: MorphologyCandidate[] = [];

  if (irregular) candidates.push({ ...irregular, reason: "irregular" });
  candidates.push(...regularCandidates(surface, contextPos));

  if (contextPos && !candidates.some((candidate) => candidate.partOfSpeech === contextPos)) {
    candidates.push({
      lemma: surface,
      partOfSpeech: contextPos,
      form: null,
      confidence: "low",
      reason: "context",
    });
  }

  const unique = dedupe(candidates);
  const mediumCandidates = unique.filter((candidate) => candidate.confidence === "medium");
  const preferred = unique.find((candidate) => candidate.confidence === "high")
    ?? (mediumCandidates.length === 1 ? mediumCandidates[0] : null)
    ?? unique.find((candidate) => candidate.reason === "context")
    ?? null;

  // A suffix shape is only a proposal until sentence structure or lexical
  // evidence supports it. Words such as “spring” and “morning” happen to end in
  // -ing but are commonly base-form nouns. Keeping low-confidence suffix guesses
  // out of the selected analysis prevents invented lemmas such as “spr”.
  return {
    surface,
    lemma: preferred?.lemma ?? surface,
    partOfSpeech: preferred?.partOfSpeech ?? contextPos,
    form: preferred?.form ?? null,
    confidence: preferred?.confidence ?? "low",
    candidates: unique,
  };
}

export function withDetectedLemma(
  analysis: MorphologyAnalysis,
  lemmaInput: string,
  partOfSpeech: "verb" | "noun" | "adjective" | null,
  form: string | null,
): MorphologyAnalysis {
  const lemma = normaliseWord(lemmaInput);
  if (!lemma || lemma === analysis.surface) return analysis;

  // Lexical evidence can validate one of the earlier suffix proposals. Preserve
  // the grammatical form attached to that exact proposal rather than only the
  // lemma. This lets conservative analysis keep `spring` as a base noun while a
  // reviewed headword can still confirm `running → run` as a present participle
  // and `stories → story` as a plural.
  const matchingProposal = analysis.candidates.find((candidate) => candidate.lemma === lemma) ?? null;
  const resolvedPartOfSpeech = partOfSpeech ?? matchingProposal?.partOfSpeech ?? analysis.partOfSpeech;
  const resolvedForm = form ?? matchingProposal?.form ?? analysis.form;

  const detected: MorphologyCandidate = {
    lemma,
    partOfSpeech: resolvedPartOfSpeech,
    form: resolvedForm,
    confidence: "high",
    reason: "wiktionary",
  };

  return {
    ...analysis,
    lemma,
    partOfSpeech: resolvedPartOfSpeech,
    form: resolvedForm,
    confidence: "high",
    candidates: dedupe([detected, ...analysis.candidates]),
  };
}
