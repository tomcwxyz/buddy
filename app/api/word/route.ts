import { NextResponse } from "next/server";
import { explainWordWithModel, modelWordFallbackEnabled } from "@/lib/ai/word-explainer";
import { normaliseWord } from "@/lib/literacy/engine";
import { analyseWordSounds } from "@/lib/literacy/sound-map";

type DictionaryDefinition = {
  definition?: string;
  example?: string;
};

type DictionaryMeaning = {
  partOfSpeech?: string;
  definitions?: DictionaryDefinition[];
};

type DictionaryPhonetic = {
  text?: string;
  audio?: string;
};

type DictionaryEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: DictionaryPhonetic[];
  meanings?: DictionaryMeaning[];
};

type DatamuseWord = {
  word?: string;
  defs?: string[];
  tags?: string[];
  numSyllables?: number;
  defHeadword?: string;
};

type DefinitionCandidate = {
  definition: string;
  example: string | null;
  partOfSpeech: string | null;
  source: "dictionaryapi.dev" | "datamuse";
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "had", "has", "have", "he", "her", "hers", "him", "his", "i", "in", "is", "it", "its", "me", "my", "of", "on", "or", "our", "she", "so", "that", "the", "their", "them", "they", "this", "to", "was", "we", "were", "with", "you", "your",
]);

const POS_LABELS: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  u: "other",
};

function wordsIn(value: string) {
  return (value.toLocaleLowerCase("en-GB").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [])
    .filter((item) => !STOP_WORDS.has(item));
}

function contextNeighbours(context: string, word: string) {
  const tokens = context.toLocaleLowerCase("en-GB").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
  const index = tokens.findIndex((token) => normaliseWord(token) === word);
  if (index < 0) return { left: null, right: null };
  return {
    left: index > 0 ? normaliseWord(tokens[index - 1]) : null,
    right: index < tokens.length - 1 ? normaliseWord(tokens[index + 1]) : null,
  };
}

function parseDatamuseDefinition(raw: string): DefinitionCandidate | null {
  const match = raw.match(/^(n|v|adj|adv|u)\t(.+)$/);
  const definition = (match?.[2] ?? raw).trim();
  if (!definition) return null;
  return {
    definition,
    example: null,
    partOfSpeech: match ? POS_LABELS[match[1]] ?? null : null,
    source: "datamuse",
  };
}

function dictionaryCandidates(entries: DictionaryEntry[]): DefinitionCandidate[] {
  return entries.flatMap((entry) =>
    (entry.meanings ?? []).flatMap((meaning) =>
      (meaning.definitions ?? [])
        .filter((item) => typeof item.definition === "string")
        .map((item) => ({
          definition: item.definition!.trim(),
          example: item.example?.trim() ?? null,
          partOfSpeech: meaning.partOfSpeech ?? null,
          source: "dictionaryapi.dev" as const,
        })),
    ),
  );
}

function simplifyDefinition(value: string) {
  let definition = value
    .replace(/\s+/g, " ")
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

function chooseDefinition(candidates: DefinitionCandidate[], context: string, preferredPartOfSpeech: string | null) {
  const contextTerms = new Set(wordsIn(context));
  const discouraged = /\b(archaic|obsolete|dated|vulgar|slang|historical)\b/i;

  return [...candidates]
    .filter((item) => item.definition.length >= 4)
    .map((item) => {
      const candidateTerms = new Set(wordsIn(`${item.definition} ${item.example ?? ""}`));
      const overlap = [...contextTerms].filter((term) => candidateTerms.has(term)).length;
      const posMatch = preferredPartOfSpeech && item.partOfSpeech === preferredPartOfSpeech ? 3 : 0;
      const exampleBonus = item.example ? 1.5 : 0;
      const readableLength = item.definition.length <= 150 ? 2 : item.definition.length <= 220 ? 0.5 : -2;
      const discouragedPenalty = discouraged.test(item.definition) ? -8 : 0;
      return {
        item,
        score: overlap * 5 + posMatch + exampleBonus + readableLength + discouragedPenalty,
      };
    })
    .sort((a, b) => b.score - a.score || a.item.definition.length - b.item.definition.length)[0]?.item ?? null;
}

function normaliseAudio(value?: string) {
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  return value.startsWith("https://") ? value : null;
}

function sentenceFromContext(context: string, word: string) {
  const clean = context.replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 260) return null;
  return wordsIn(clean).includes(word) || clean.toLocaleLowerCase("en-GB").includes(word) ? clean : null;
}

function editDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

function plausibleSuggestion(word: string, candidate?: string) {
  const suggestion = normaliseWord(candidate ?? "");
  if (!suggestion || suggestion === word) return null;
  const maximumDistance = word.length <= 5 ? 1 : word.length <= 9 ? 2 : 3;
  return editDistance(word, suggestion) <= maximumDistance ? suggestion : null;
}

function shouldRefineMeaning(input: {
  requestExplain: boolean;
  meaning: string | null;
  candidateCount: number;
  context: string;
  example: string | null;
}) {
  if (!input.requestExplain || !modelWordFallbackEnabled()) return false;
  if (!input.meaning) return true;
  if (input.meaning.length > 100) return true;
  if (input.candidateCount > 1 && Boolean(input.context)) return true;
  if (!input.example && Boolean(input.context)) return true;
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = normaliseWord(searchParams.get("word") ?? "");
  const context = (searchParams.get("context") ?? "").slice(0, 300);
  const requestExplain = searchParams.get("explain") === "1";

  if (!word || word.length > 48 || !/^[a-z][a-z'-]*$/.test(word)) {
    return NextResponse.json({ error: "invalid_word" }, { status: 400 });
  }

  const neighbours = contextNeighbours(context, word);
  const datamuseParams = new URLSearchParams({
    sp: word,
    qe: "sp",
    md: "dpsr",
    ipa: "1",
    max: "3",
  });
  if (neighbours.left) datamuseParams.set("lc", neighbours.left);
  if (neighbours.right) datamuseParams.set("rc", neighbours.right);

  try {
    const [datamuseResponse, dictionaryResponse] = await Promise.allSettled([
      fetch(`https://api.datamuse.com/words?${datamuseParams.toString()}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 14 },
        signal: AbortSignal.timeout(3000),
      }),
      fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 7 },
        signal: AbortSignal.timeout(3000),
      }),
    ]);

    let datamuse: DatamuseWord[] = [];
    if (datamuseResponse.status === "fulfilled" && datamuseResponse.value.ok) {
      datamuse = (await datamuseResponse.value.json()) as DatamuseWord[];
    }

    let dictionary: DictionaryEntry[] = [];
    if (dictionaryResponse.status === "fulfilled" && dictionaryResponse.value.ok) {
      dictionary = (await dictionaryResponse.value.json()) as DictionaryEntry[];
    }

    const exactDatamuse = datamuse.find((item) => normaliseWord(item.word ?? "") === word) ?? null;
    const possibleSpelling = exactDatamuse ? null : plausibleSuggestion(word, datamuse[0]?.word);
    const hasLexicalEvidence = Boolean(exactDatamuse || dictionary.length > 0);

    const preferredPosCode = exactDatamuse?.tags?.find((tag) => Object.hasOwn(POS_LABELS, tag)) ?? null;
    const preferredPartOfSpeech = preferredPosCode ? POS_LABELS[preferredPosCode] : null;
    const datamuseCandidates = (exactDatamuse?.defs ?? [])
      .map(parseDatamuseDefinition)
      .filter((item): item is DefinitionCandidate => Boolean(item));
    const dictionaryDefinitions = dictionaryCandidates(dictionary);
    const candidates = [...datamuseCandidates, ...dictionaryDefinitions];
    const chosen = chooseDefinition(candidates, context, preferredPartOfSpeech);

    const dictionaryPhonetics = dictionary.flatMap((entry) => entry.phonetics ?? []);
    const dictionaryIpa = dictionary.find((entry) => entry.phonetic)?.phonetic
      ?? dictionaryPhonetics.find((item) => item.text)?.text
      ?? null;
    const datamuseIpa = exactDatamuse?.tags?.find((tag) => tag.startsWith("pron:"))?.slice(5) ?? null;
    const ipa = datamuseIpa || dictionaryIpa;
    const audio = normaliseAudio(dictionaryPhonetics.find((item) => item.audio)?.audio);
    const contextualExample = sentenceFromContext(context, word);
    const dictionaryExample = chosen?.example ?? dictionaryDefinitions.find((item) => item.example)?.example ?? null;
    const deterministicMeaning = chosen ? simplifyDefinition(chosen.definition) : null;
    const soundGuide = analyseWordSounds(word, exactDatamuse?.numSyllables ?? null, ipa);

    if (!hasLexicalEvidence) {
      let modelExplanation = null;
      if (requestExplain && modelWordFallbackEnabled()) {
        try {
          modelExplanation = await explainWordWithModel({ word, context });
        } catch {
          modelExplanation = null;
        }
      }

      const modelRecognised = Boolean(
        modelExplanation?.knownEnglishWord && modelExplanation.confidence !== "low",
      );

      return NextResponse.json({
        word,
        meaning: modelRecognised ? modelExplanation!.meaning : null,
        example: contextualExample,
        alternateExample: modelRecognised ? modelExplanation!.example : null,
        contextualExample,
        partOfSpeech: null,
        pronunciation: { ipa: null, syllables: soundGuide.syllables, audio: null },
        soundGuide,
        headword: null,
        possibleSpelling: modelRecognised ? null : possibleSpelling,
        recognisedWord: modelRecognised,
        meaningCanBeRefined: modelWordFallbackEnabled() && !requestExplain,
        explanation: {
          source: modelRecognised ? "model" : "none",
          modelUsed: Boolean(modelExplanation),
          confidence: modelExplanation?.confidence ?? "low",
        },
        source: modelRecognised ? "model-rare-word" : "unknown-word",
      });
    }

    const refineMeaning = shouldRefineMeaning({
      requestExplain,
      meaning: deterministicMeaning,
      candidateCount: candidates.length,
      context,
      example: dictionaryExample,
    });

    let modelExplanation = null;
    if (refineMeaning) {
      try {
        modelExplanation = await explainWordWithModel({
          word,
          context,
          existingMeaning: deterministicMeaning,
          partOfSpeech: chosen?.partOfSpeech ?? preferredPartOfSpeech,
        });
      } catch {
        modelExplanation = null;
      }
    }

    const useModelMeaning = Boolean(modelExplanation?.knownEnglishWord);
    const meaning = useModelMeaning ? modelExplanation!.meaning : deterministicMeaning;
    const generatedExample = useModelMeaning ? modelExplanation!.example : null;
    const example = contextualExample ?? dictionaryExample ?? generatedExample ?? null;
    const alternateExample = contextualExample
      ? generatedExample ?? dictionaryExample ?? null
      : generatedExample ?? (dictionaryExample && dictionaryExample !== example ? dictionaryExample : null);

    const meaningCanBeRefined = modelWordFallbackEnabled() && (
      !deterministicMeaning
      || deterministicMeaning.length > 100
      || (candidates.length > 1 && Boolean(context))
      || (!dictionaryExample && Boolean(context))
    );

    return NextResponse.json({
      word,
      meaning,
      example,
      alternateExample,
      contextualExample,
      partOfSpeech: chosen?.partOfSpeech ?? preferredPartOfSpeech,
      pronunciation: {
        ipa: soundGuide.ipa,
        syllables: soundGuide.syllables,
        audio,
      },
      soundGuide,
      headword: exactDatamuse?.defHeadword ?? null,
      possibleSpelling: null,
      recognisedWord: true,
      meaningCanBeRefined: meaningCanBeRefined && !requestExplain,
      explanation: {
        source: useModelMeaning ? "model" : chosen?.source ?? "none",
        modelUsed: Boolean(modelExplanation),
        confidence: modelExplanation?.confidence ?? (chosen ? "high" : "medium"),
      },
      source: useModelMeaning
        ? "model-context"
        : chosen?.source ?? (exactDatamuse ? "datamuse-pronunciation" : "dictionaryapi.dev"),
    });
  } catch {
    return NextResponse.json({
      word,
      meaning: null,
      example: sentenceFromContext(context, word),
      alternateExample: null,
      contextualExample: sentenceFromContext(context, word),
      partOfSpeech: null,
      pronunciation: { ipa: null, syllables: null, audio: null },
      soundGuide: analyseWordSounds(word),
      headword: null,
      possibleSpelling: null,
      recognisedWord: false,
      meaningCanBeRefined: modelWordFallbackEnabled() && !requestExplain,
      explanation: {
        source: "none",
        modelUsed: false,
        confidence: "low",
      },
      source: "lookup-unavailable",
    });
  }
}
