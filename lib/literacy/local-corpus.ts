import corpusJson from "@/data/lexicon/core.en-GB.v1.json";
import { britfoneRuntimeManifest, lookupBritfonePronunciations } from "@/lib/literacy/britfone";
import { normaliseWord } from "@/lib/literacy/engine";
import type { LexicalCandidate, LexicalRelation } from "@/lib/literacy/lexicon";

type CorpusPronunciation = {
  ipa: string;
  partOfSpeech?: string;
};

type CorpusSense = {
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
};

type CorpusEntry = {
  headword?: string;
  pronunciations?: CorpusPronunciation[];
  senses?: CorpusSense[];
};

type CorpusFile = {
  version: string;
  locale: string;
  description: string;
  pronunciationSource: {
    name: string;
    version: string;
    licence: string;
    url: string;
  };
  entries: Record<string, CorpusEntry>;
};

const corpus = corpusJson as CorpusFile;

const VERB_LEFT_CUES = new Set([
  "can", "could", "did", "do", "does", "may", "might", "must", "please", "shall", "should", "to", "will", "would",
]);

const NOUN_LEFT_CUES = new Set([
  "a", "an", "another", "any", "each", "every", "her", "his", "its", "my", "our", "some", "that", "the", "their", "these", "this", "those", "your",
]);

const IPA_VOWEL = /[aeiouæɑɒɔəɛɜɪʊɐ]/;

export const LOCAL_CORPUS_VERSION = corpus.version;
export const LOCAL_CORPUS_LOCALE = corpus.locale;
export const LOCAL_CORPUS_ENTRY_COUNT = Object.keys(corpus.entries).length;

export type LocalCorpusMetadata = {
  version: string;
  locale: string;
  entryHit: boolean;
  lexicalHit: boolean;
  pronunciationHit: boolean;
  pronunciationSource: string | null;
  britfoneEntryHit: boolean;
  britfoneVariantCount: number;
  britfoneRuntimeEntryCount: number;
};

export type LocalCorpusLookup = {
  word: string;
  recognised: boolean;
  candidates: LexicalCandidate[];
  pronunciation: {
    ipa: string | null;
    syllables: number | null;
    audio: null;
  };
  preferredPartOfSpeech: string | null;
  headword: string | null;
  metadata: LocalCorpusMetadata;
};

function contextPartOfSpeech(word: string, context: string) {
  const tokens = context.toLocaleLowerCase("en-GB").match(/[a-z]+(?:['-][a-z]+)*/g) ?? [];
  const index = tokens.findIndex((token) => normaliseWord(token) === word);
  if (index < 0) return null;

  const left = index > 0 ? normaliseWord(tokens[index - 1]) : null;
  if (left && VERB_LEFT_CUES.has(left)) return "verb";
  if (left && NOUN_LEFT_CUES.has(left)) return "noun";
  return null;
}

function countIpaSyllables(ipa: string) {
  const phonemes = ipa
    .replace(/[\/\[\]]/g, "")
    .split(/\s+/)
    .map((token) => token.replace(/[ˈˌ]/g, "").trim())
    .filter(Boolean);
  const count = phonemes.filter((phoneme) => IPA_VOWEL.test(phoneme)).length;
  return count > 0 ? count : null;
}

function choosePronunciation(
  pronunciations: CorpusPronunciation[],
  preferredPartOfSpeech: string | null,
) {
  if (pronunciations.length === 0) return null;
  if (preferredPartOfSpeech) {
    const matched = pronunciations.find((item) => item.partOfSpeech === preferredPartOfSpeech);
    if (matched) return matched;
  }
  return pronunciations.find((item) => !item.partOfSpeech) ?? pronunciations[0] ?? null;
}

export function lookupLocalCorpusWord(
  wordInput: string,
  context: string,
  relation: LexicalRelation,
  preferredPartOfSpeech?: string | null,
): LocalCorpusLookup {
  const word = normaliseWord(wordInput);
  const entry = corpus.entries[word] ?? null;
  const contextPos = contextPartOfSpeech(word, context);
  const preferredPos = preferredPartOfSpeech ?? contextPos;
  const britfonePronunciations = lookupBritfonePronunciations(word);
  const britfoneManifest = britfoneRuntimeManifest();

  const senses = entry?.senses ?? [];
  const candidates: LexicalCandidate[] = senses.map((sense, rank) => ({
    definition: sense.definition,
    example: sense.example,
    partOfSpeech: sense.partOfSpeech,
    source: "buddy-corpus",
    lookupWord: word,
    relation,
    rank,
  }));

  const reviewedPronunciation = choosePronunciation(entry?.pronunciations ?? [], preferredPos);

  // Britfone contains some headwords with multiple pronunciations but does not
  // label those variants by part of speech. A reviewed core entry can resolve
  // those safely (for example noun/verb `record`). For an unreviewed headword,
  // only use Britfone as canonical pronunciation evidence when it has one
  // unambiguous variant; otherwise fall through to the broader lexical sources.
  const broadBritfoneIpa = !reviewedPronunciation && britfonePronunciations.length === 1
    ? britfonePronunciations[0]
    : null;
  const ipa = reviewedPronunciation?.ipa ?? broadBritfoneIpa ?? null;

  const inferredPos = preferredPos
    ?? senses.find((sense) => sense.partOfSpeech)?.partOfSpeech
    ?? reviewedPronunciation?.partOfSpeech
    ?? null;

  return {
    word,
    // Pronunciation evidence alone must not make an OCR token a recognised
    // lexical word. Recognition still requires a reviewed local entry or one of
    // the definition-bearing fallback providers.
    recognised: Boolean(entry),
    candidates,
    pronunciation: {
      ipa,
      syllables: ipa ? countIpaSyllables(ipa) : null,
      audio: null,
    },
    preferredPartOfSpeech: inferredPos,
    headword: entry?.headword ? normaliseWord(entry.headword) : null,
    metadata: {
      version: corpus.version,
      locale: corpus.locale,
      entryHit: Boolean(entry),
      lexicalHit: candidates.length > 0,
      pronunciationHit: Boolean(ipa),
      pronunciationSource: ipa
        ? `${corpus.pronunciationSource.name} ${corpus.pronunciationSource.version}`
        : null,
      britfoneEntryHit: britfonePronunciations.length > 0,
      britfoneVariantCount: britfonePronunciations.length,
      britfoneRuntimeEntryCount: britfoneManifest.entryCount,
    },
  };
}

export function localCorpusManifest() {
  return {
    version: corpus.version,
    locale: corpus.locale,
    description: corpus.description,
    entryCount: LOCAL_CORPUS_ENTRY_COUNT,
    pronunciationSource: corpus.pronunciationSource,
    britfoneRuntime: britfoneRuntimeManifest(),
  };
}
