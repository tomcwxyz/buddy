import corpusJson from "@/data/lexicon/core.en-GB.v1.json";
import { britfoneRuntimeManifest, lookupBritfonePronunciations } from "@/lib/literacy/britfone";
import {
  CURRICULUM_CORPUS_VERSION,
  CURRICULUM_ENTRIES,
} from "@/lib/literacy/curriculum-corpus";
import {
  HETERONYM_CORPUS_VERSION,
  HETERONYM_ENTRIES,
} from "@/lib/literacy/heteronym-corpus";
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

const SUBJECT_PRONOUNS = new Set([
  "he", "i", "it", "she", "they", "we", "you",
]);

const NOUN_LEFT_CUES = new Set([
  "a", "an", "another", "any", "each", "every", "her", "his", "its", "my", "our", "some", "that", "the", "their", "these", "this", "those", "your",
]);

const IPA_VOWEL = /[aeiouæɑɒɔəɛɜɪʊɐ]/;

export const LOCAL_CORPUS_VERSION = `${corpus.version}+${CURRICULUM_CORPUS_VERSION}+${HETERONYM_CORPUS_VERSION}`;
export const LOCAL_CORPUS_LOCALE = corpus.locale;
export const LOCAL_CORPUS_ENTRY_COUNT = new Set([
  ...Object.keys(corpus.entries),
  ...Object.keys(CURRICULUM_ENTRIES),
  ...Object.keys(HETERONYM_ENTRIES),
]).size;

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
  if (left && SUBJECT_PRONOUNS.has(left)) return "verb";
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

  // Multiple POS-labelled variants are a real ambiguity, not an invitation to
  // choose variant 1. Preserve uncertainty unless sentence grammar gives us a
  // safe mapping. Unlabelled alternatives (for example accent variants) can
  // still use the first reviewed form as before.
  const unlabelled = pronunciations.find((item) => !item.partOfSpeech);
  if (unlabelled) return unlabelled;
  return pronunciations.length === 1 ? pronunciations[0] : null;
}

export function lookupLocalCorpusWord(
  wordInput: string,
  context: string,
  relation: LexicalRelation,
  preferredPartOfSpeech?: string | null,
): LocalCorpusLookup {
  const word = normaliseWord(wordInput);
  const coreEntry = corpus.entries[word] ?? null;
  const curriculumEntry = CURRICULUM_ENTRIES[word] ?? null;
  const heteronymEntry = HETERONYM_ENTRIES[word] ?? null;
  const contextPos = contextPartOfSpeech(word, context);
  const preferredPos = preferredPartOfSpeech ?? contextPos;
  const britfonePronunciations = lookupBritfonePronunciations(word);
  const britfoneManifest = britfoneRuntimeManifest();

  // Curriculum senses are reviewed specifically for school-age reading, so
  // they come before broad core senses for the same word. Reviewed heteronyms
  // sit ahead of both when present because their job is to bind pronunciation
  // and grammatical sense safely rather than letting an unlabelled provider
  // guess between established variants.
  const allSenses: CorpusSense[] = [
    ...(heteronymEntry?.senses ?? []),
    ...(curriculumEntry?.senses ?? []),
    ...(coreEntry?.senses ?? []),
  ];
  const senses = heteronymEntry?.strictPartOfSpeech && preferredPos
    ? allSenses.filter((sense) => !sense.partOfSpeech || sense.partOfSpeech === preferredPos)
    : allSenses;
  const candidates: LexicalCandidate[] = senses.map((sense, rank) => ({
    definition: sense.definition,
    example: sense.example,
    partOfSpeech: sense.partOfSpeech,
    source: "buddy-corpus",
    lookupWord: word,
    relation,
    rank,
  }));

  const reviewedPronunciations: CorpusPronunciation[] = [
    ...(heteronymEntry?.pronunciations ?? []),
    ...(coreEntry?.pronunciations ?? []),
  ];
  const reviewedPronunciation = choosePronunciation(reviewedPronunciations, preferredPos);

  // Britfone contains some headwords with multiple pronunciations but does not
  // label those variants by part of speech. A reviewed local entry can resolve
  // those safely (for example noun/verb `record`, `lead`, `wind` and `tear`).
  // For an unreviewed headword, only use Britfone as canonical pronunciation
  // evidence when it has one unambiguous variant; otherwise fall through to the
  // broader lexical sources.
  const broadBritfoneIpa = !reviewedPronunciation && britfonePronunciations.length === 1
    ? britfonePronunciations[0]
    : null;
  const ipa = reviewedPronunciation?.ipa ?? broadBritfoneIpa ?? null;

  const inferredPos = preferredPos
    ?? senses.find((sense) => sense.partOfSpeech)?.partOfSpeech
    ?? reviewedPronunciation?.partOfSpeech
    ?? null;

  const recognisedEntry = Boolean(coreEntry || curriculumEntry || heteronymEntry);

  return {
    word,
    // Pronunciation evidence alone must not make an OCR token a recognised
    // lexical word. Recognition still requires a reviewed local entry or one of
    // the definition-bearing fallback providers.
    recognised: recognisedEntry,
    candidates,
    pronunciation: {
      ipa,
      syllables: ipa ? countIpaSyllables(ipa) : null,
      audio: null,
    },
    preferredPartOfSpeech: inferredPos,
    headword: coreEntry?.headword
      ? normaliseWord(coreEntry.headword)
      : curriculumEntry?.headword
        ? normaliseWord(curriculumEntry.headword)
        : null,
    metadata: {
      version: LOCAL_CORPUS_VERSION,
      locale: corpus.locale,
      entryHit: recognisedEntry,
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
    version: LOCAL_CORPUS_VERSION,
    locale: corpus.locale,
    description: `${corpus.description} Includes reviewed ${CURRICULUM_CORPUS_VERSION} school-age semantic coverage and ${HETERONYM_CORPUS_VERSION} pronunciation disambiguation.`,
    entryCount: LOCAL_CORPUS_ENTRY_COUNT,
    pronunciationSource: corpus.pronunciationSource,
    curriculumSemanticTier: {
      version: CURRICULUM_CORPUS_VERSION,
      entryCount: Object.keys(CURRICULUM_ENTRIES).length,
    },
    heteronymTier: {
      version: HETERONYM_CORPUS_VERSION,
      entryCount: Object.keys(HETERONYM_ENTRIES).length,
    },
    britfoneRuntime: britfoneRuntimeManifest(),
  };
}
