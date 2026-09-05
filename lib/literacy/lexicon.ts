import type { MorphologyAnalysis } from "@/lib/literacy/morphology";

export type LexicalSource = "buddy-curated" | "buddy-corpus" | "wordnet" | "wiktionary" | "dictionaryapi.dev" | "datamuse";
export type LexicalRelation = "surface" | "lemma";

export type LexicalCandidate = {
  definition: string;
  example: string | null;
  partOfSpeech: string | null;
  source: LexicalSource;
  lookupWord: string;
  relation: LexicalRelation;
  rank: number;
};

export type LexicalAttribution = {
  label: string;
  url: string;
  licence: string;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "had", "has", "have", "he", "her", "hers", "him", "his", "i", "in", "is", "it", "its", "me", "my", "of", "on", "or", "our", "she", "so", "that", "the", "their", "them", "they", "this", "to", "was", "we", "were", "with", "you", "your",
]);

const SOURCE_SCORE: Record<LexicalSource, number> = {
  "buddy-curated": 8,
  "buddy-corpus": 7,
  wordnet: 4,
  "dictionaryapi.dev": 3,
  wiktionary: 2,
  datamuse: 1,
};

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    lt: "<",
    nbsp: " ",
    quot: '"',
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name.toLocaleLowerCase("en-GB")] ?? whole);
}

export function plainLexicalText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim(),
  );
}

export function normalisePartOfSpeech(value?: string | null) {
  const clean = value?.toLocaleLowerCase("en-GB").trim() ?? "";
  if (!clean) return null;
  if (clean === "v" || clean.startsWith("verb")) return "verb";
  if (clean === "n" || clean.startsWith("noun")) return "noun";
  if (clean === "adj" || clean.startsWith("adjective")) return "adjective";
  if (clean === "adv" || clean.startsWith("adverb")) return "adverb";
  if (clean.startsWith("pronoun")) return "pronoun";
  if (clean.startsWith("preposition")) return "preposition";
  if (clean.startsWith("conjunction")) return "conjunction";
  if (clean.startsWith("determiner")) return "determiner";
  if (clean.startsWith("interjection")) return "interjection";
  return clean;
}

function wordsIn(value: string) {
  return (value.toLocaleLowerCase("en-GB").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [])
    .filter((item) => !STOP_WORDS.has(item));
}

export function simplifyDefinition(value: string) {
  let definition = plainLexicalText(value)
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/\s*\([^)]{1,80}\)\s*$/g, "")
    .trim();

  const semicolon = definition.indexOf(";");
  if (semicolon >= 35) definition = definition.slice(0, semicolon).trim();

  if (definition.length > 180) {
    const sentenceEnd = definition.slice(0, 180).lastIndexOf(".");
    definition = sentenceEnd > 55 ? definition.slice(0, sentenceEnd + 1) : `${definition.slice(0, 176).trim()}…`;
  }

  if (definition && !/[.!?…]$/.test(definition)) definition += ".";
  return definition;
}

export type InflectionLink = {
  lemma: string;
  partOfSpeech: "verb" | "noun" | "adjective" | null;
  form: string | null;
};

const INFLECTION_PATTERNS: Array<{
  pattern: RegExp;
  partOfSpeech: InflectionLink["partOfSpeech"];
  form: string;
}> = [
  { pattern: /^(?:simple )?past(?: tense)? and past participle of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "verb", form: "past tense / past participle" },
  { pattern: /^(?:simple )?past(?: tense)? of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "verb", form: "past tense" },
  { pattern: /^past participle of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "verb", form: "past participle" },
  { pattern: /^(?:present participle|gerund) of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "verb", form: "present participle" },
  { pattern: /^third-person singular simple present(?: indicative)? (?:form )?of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "verb", form: "present form" },
  { pattern: /^plural of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "noun", form: "plural" },
  { pattern: /^comparative form of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "adjective", form: "comparative" },
  { pattern: /^superlative form of ([a-z][a-z'-]*)[.!]?$/i, partOfSpeech: "adjective", form: "superlative" },
];

export function extractInflectionLink(definition: string): InflectionLink | null {
  const clean = plainLexicalText(definition).replace(/\s+/g, " ").trim();
  for (const item of INFLECTION_PATTERNS) {
    const match = clean.match(item.pattern);
    if (match?.[1]) {
      return {
        lemma: match[1].toLocaleLowerCase("en-GB"),
        partOfSpeech: item.partOfSpeech,
        form: item.form,
      };
    }
  }
  return null;
}

function isInflectionDefinition(value: string) {
  return Boolean(extractInflectionLink(value));
}

function definitionQualityPenalty(definition: string, morphology: MorphologyAnalysis, lookupWord: string) {
  const clean = definition.toLocaleLowerCase("en-GB").trim();
  const terms = new Set(wordsIn(clean));
  const referencesResolvedWord = terms.has(morphology.surface)
    || terms.has(morphology.lemma)
    || terms.has(lookupWord);

  let penalty = 0;
  if (clean.length < 18) penalty -= 9;
  else if (clean.length < 28) penalty -= 3;

  // Glosses such as “To be sold.” are technically valid dictionary senses but
  // are useless as an explanation for a child and tend to win naive shortest-
  // definition ranking. Prefer an informative sense when one is available.
  if (referencesResolvedWord && clean.length < 48) penalty -= 12;
  if (/^to be [a-z'-]+[.!]?$/.test(clean)) penalty -= 8;

  return penalty;
}

function senseRankBonus(rank: number, source: LexicalSource) {
  const safeRank = Math.min(Math.max(rank, 0), 6);

  // WordNet's ordering carries explicit (although sparse) corpus-frequency
  // evidence. Give adjacent WordNet senses enough separation that a quoted
  // example cannot, by itself, promote a less common metaphorical sense above
  // sense 1. Sentence overlap and grammatical evidence can still override it.
  if (source === "wordnet") return Math.max(0, 8 - safeRank * 2);

  return Math.max(0, 6 - safeRank);
}

export function chooseLexicalSense(
  candidates: LexicalCandidate[],
  context: string,
  morphology: MorphologyAnalysis,
) {
  const contextTerms = new Set(
    wordsIn(context).filter((term) => term !== morphology.surface && term !== morphology.lemma),
  );
  const discouraged = /\b(archaic|obsolete|dated|vulgar|historical)\b/i;
  const preferredPos = morphology.partOfSpeech;

  return [...candidates]
    .filter((item) => item.definition.trim().length >= 3)
    .map((item) => {
      const definition = plainLexicalText(item.definition);
      const candidateTerms = new Set(wordsIn(`${definition} ${item.example ?? ""}`));
      const overlap = [...contextTerms].filter((term) => candidateTerms.has(term)).length;
      const partOfSpeech = normalisePartOfSpeech(item.partOfSpeech);
      const posMatch = preferredPos && partOfSpeech === preferredPos ? 18 : 0;
      const posMismatch = preferredPos && partOfSpeech && partOfSpeech !== preferredPos
        ? morphology.confidence === "high" ? -14 : -4
        : 0;
      const lemmaBonus = item.relation === "lemma" && item.lookupWord === morphology.lemma ? 6 : 0;
      const surfaceBonus = item.relation === "surface" ? 1 : 0;
      const exampleBonus = item.example ? 1.5 : 0;
      const readableLength = definition.length <= 120 ? 2 : definition.length <= 190 ? 0.5 : -2;
      const discouragedPenalty = discouraged.test(definition) ? -14 : 0;
      const inflectionPenalty = isInflectionDefinition(definition) ? -8 : 0;
      const qualityPenalty = definitionQualityPenalty(definition, morphology, item.lookupWord);
      const rankBonus = senseRankBonus(item.rank, item.source);
      const sourceScore = SOURCE_SCORE[item.source];

      return {
        item,
        score:
          overlap * 3
          + posMatch
          + posMismatch
          + lemmaBonus
          + surfaceBonus
          + exampleBonus
          + readableLength
          + discouragedPenalty
          + inflectionPenalty
          + qualityPenalty
          + rankBonus
          + sourceScore,
      };
    })
    .sort((a, b) => b.score - a.score || a.item.rank - b.item.rank || a.item.definition.length - b.item.definition.length)[0]?.item ?? null;
}

export function lexicalAttribution(candidate: LexicalCandidate | null): LexicalAttribution | null {
  if (!candidate) return null;
  if (candidate.source === "wiktionary") {
    return {
      label: "Wiktionary",
      url: `https://en.wiktionary.org/wiki/${encodeURIComponent(candidate.lookupWord)}`,
      licence: "CC BY-SA",
    };
  }
  if (candidate.source === "wordnet") {
    return {
      label: "Princeton WordNet",
      url: "https://wordnet.princeton.edu/",
      licence: "Princeton WordNet License",
    };
  }
  return null;
}

export function morphologyLabel(morphology: MorphologyAnalysis) {
  if (!morphology.form || morphology.lemma === morphology.surface) return null;
  return `${morphology.form} of ${morphology.lemma}`;
}
