import { normaliseWord } from "@/lib/literacy/engine";
import {
  normalisePartOfSpeech,
  plainLexicalText,
  type LexicalCandidate,
  type LexicalRelation,
} from "@/lib/literacy/lexicon";

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

type WiktionaryDefinition = {
  definition?: string;
  examples?: string[];
  parsedExamples?: Array<{ example?: string }>;
};

type WiktionaryEntry = {
  partOfSpeech?: string;
  language?: string;
  definitions?: WiktionaryDefinition[];
};

type WiktionaryPayload = Record<string, WiktionaryEntry[]>;

export type LexicalLookupBundle = {
  word: string;
  recognised: boolean;
  candidates: LexicalCandidate[];
  pronunciation: {
    ipa: string | null;
    syllables: number | null;
    audio: string | null;
  };
  preferredPartOfSpeech: string | null;
  headword: string | null;
  possibleSpelling: string | null;
  providers: string[];
};

const POS_LABELS: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  u: "other",
};

function contextNeighbours(context: string, word: string) {
  const tokens = context.toLocaleLowerCase("en-GB").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
  const index = tokens.findIndex((token) => normaliseWord(token) === word);
  if (index < 0) return { left: null, right: null };
  return {
    left: index > 0 ? normaliseWord(tokens[index - 1]) : null,
    right: index < tokens.length - 1 ? normaliseWord(tokens[index + 1]) : null,
  };
}

function parseDatamuseDefinition(raw: string, lookupWord: string, relation: LexicalRelation): LexicalCandidate | null {
  const match = raw.match(/^(n|v|adj|adv|u)\t(.+)$/);
  const definition = (match?.[2] ?? raw).trim();
  if (!definition) return null;
  return {
    definition,
    example: null,
    partOfSpeech: match ? POS_LABELS[match[1]] ?? null : null,
    source: "datamuse",
    lookupWord,
    relation,
  };
}

function dictionaryCandidates(entries: DictionaryEntry[], lookupWord: string, relation: LexicalRelation): LexicalCandidate[] {
  return entries.flatMap((entry) =>
    (entry.meanings ?? []).flatMap((meaning) =>
      (meaning.definitions ?? [])
        .filter((item) => typeof item.definition === "string" && item.definition.trim().length > 0)
        .map((item) => ({
          definition: item.definition!.trim(),
          example: item.example?.trim() ?? null,
          partOfSpeech: normalisePartOfSpeech(meaning.partOfSpeech),
          source: "dictionaryapi.dev" as const,
          lookupWord,
          relation,
        })),
    ),
  );
}

function wiktionaryCandidates(payload: WiktionaryPayload, lookupWord: string, relation: LexicalRelation): LexicalCandidate[] {
  const english = payload.en ?? [];
  return english.flatMap((entry) =>
    (entry.definitions ?? [])
      .filter((item) => typeof item.definition === "string" && item.definition.trim().length > 0)
      .map((item) => {
        const rawExample = item.examples?.[0] ?? item.parsedExamples?.find((example) => example.example)?.example ?? null;
        return {
          definition: plainLexicalText(item.definition!),
          example: rawExample ? plainLexicalText(rawExample) : null,
          partOfSpeech: normalisePartOfSpeech(entry.partOfSpeech),
          source: "wiktionary" as const,
          lookupWord,
          relation,
        };
      }),
  );
}

function normaliseAudio(value?: string) {
  if (!value) return null;
  if (value.startsWith("//")) return `https:${value}`;
  return value.startsWith("https://") ? value : null;
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

export async function lookupLexicalWord(
  wordInput: string,
  context: string,
  relation: LexicalRelation,
): Promise<LexicalLookupBundle> {
  const word = normaliseWord(wordInput);
  const neighbours = contextNeighbours(context, relation === "surface" ? word : "");
  const datamuseParams = new URLSearchParams({
    sp: word,
    qe: "sp",
    md: "dpsr",
    ipa: "1",
    max: "6",
  });
  if (neighbours.left) datamuseParams.set("lc", neighbours.left);
  if (neighbours.right) datamuseParams.set("rc", neighbours.right);

  const [datamuseResponse, dictionaryResponse, wiktionaryResponse] = await Promise.allSettled([
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
    fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}?redirect=true`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Buddy-reading-companion/0.1 (https://github.com/tomcwxyz/buddy)",
      },
      next: { revalidate: 60 * 60 * 24 * 14 },
      signal: AbortSignal.timeout(3500),
    }),
  ]);

  let datamuse: DatamuseWord[] = [];
  let dictionary: DictionaryEntry[] = [];
  let wiktionary: WiktionaryPayload = {};
  const providers: string[] = [];

  if (datamuseResponse.status === "fulfilled" && datamuseResponse.value.ok) {
    datamuse = (await datamuseResponse.value.json()) as DatamuseWord[];
    providers.push("datamuse");
  }
  if (dictionaryResponse.status === "fulfilled" && dictionaryResponse.value.ok) {
    dictionary = (await dictionaryResponse.value.json()) as DictionaryEntry[];
    providers.push("dictionaryapi.dev");
  }
  if (wiktionaryResponse.status === "fulfilled" && wiktionaryResponse.value.ok) {
    wiktionary = (await wiktionaryResponse.value.json()) as WiktionaryPayload;
    providers.push("wiktionary");
  }

  const exactDatamuse = datamuse.find((item) => normaliseWord(item.word ?? "") === word) ?? null;
  const exactDictionary = dictionary.some((entry) => normaliseWord(entry.word ?? word) === word);
  const englishWiktionary = wiktionary.en ?? [];
  const exactWiktionary = englishWiktionary.length > 0;

  const datamuseCandidates = (exactDatamuse?.defs ?? [])
    .map((raw) => parseDatamuseDefinition(raw, word, relation))
    .filter((item): item is LexicalCandidate => Boolean(item));
  const candidates = [
    ...wiktionaryCandidates(wiktionary, word, relation),
    ...dictionaryCandidates(dictionary, word, relation),
    ...datamuseCandidates,
  ];

  const dictionaryPhonetics = dictionary.flatMap((entry) => entry.phonetics ?? []);
  const dictionaryIpa = dictionary.find((entry) => entry.phonetic)?.phonetic
    ?? dictionaryPhonetics.find((item) => item.text)?.text
    ?? null;
  const datamuseIpa = exactDatamuse?.tags?.find((tag) => tag.startsWith("pron:"))?.slice(5) ?? null;
  const preferredPosCode = exactDatamuse?.tags?.find((tag) => Object.hasOwn(POS_LABELS, tag)) ?? null;

  const recognised = Boolean(exactDatamuse || exactDictionary || exactWiktionary);

  return {
    word,
    recognised,
    candidates,
    pronunciation: {
      ipa: datamuseIpa || dictionaryIpa,
      syllables: exactDatamuse?.numSyllables ?? null,
      audio: normaliseAudio(dictionaryPhonetics.find((item) => item.audio)?.audio),
    },
    preferredPartOfSpeech: preferredPosCode ? POS_LABELS[preferredPosCode] : null,
    headword: exactDatamuse?.defHeadword ?? null,
    possibleSpelling: recognised ? null : plausibleSuggestion(word, datamuse[0]?.word),
    providers,
  };
}
