import { reviewedCommonCandidates } from "@/lib/literacy/curated-lexicon";
import { getCuratedWordSupport, normaliseWord } from "@/lib/literacy/engine";
import {
  normalisePartOfSpeech,
  type LexicalCandidate,
  type LexicalRelation,
} from "@/lib/literacy/lexicon";
import { lookupLocalCorpusWord } from "@/lib/literacy/local-corpus";
import type { LexicalLookupBundle } from "@/lib/literacy/lexical-providers";
import { lookupWordNetWord } from "@/lib/literacy/wordnet";

function literacyCuratedCandidate(word: string, relation: LexicalRelation): LexicalCandidate | null {
  const support = getCuratedWordSupport(word);
  if (!support?.meaning) return null;
  return {
    definition: support.meaning,
    example: support.example,
    partOfSpeech: null,
    source: "buddy-curated",
    lookupWord: word,
    relation,
    rank: 0,
  };
}

function consensusPartOfSpeech(candidates: LexicalCandidate[]) {
  const partsOfSpeech = new Set(
    candidates
      .map((candidate) => normalisePartOfSpeech(candidate.partOfSpeech))
      .filter((value): value is string => Boolean(value)),
  );
  return partsOfSpeech.size === 1 ? [...partsOfSpeech][0] : null;
}

function candidatesForPartOfSpeech(candidates: LexicalCandidate[], partOfSpeech?: string | null) {
  const preferred = normalisePartOfSpeech(partOfSpeech ?? null);
  if (!preferred) return candidates;
  return candidates.filter(
    (candidate) => normalisePartOfSpeech(candidate.partOfSpeech) === preferred,
  );
}

/**
 * Build the same lexical bundle as the normal provider pipeline, but from
 * deterministic local evidence only. This is intentionally separate from the
 * network fallback path so callers can test whether Buddy already has enough
 * evidence before spending latency or leaking a token to remote dictionaries.
 */
export function lookupLocalLexicalWord(
  wordInput: string,
  context: string,
  relation: LexicalRelation,
  preferredPartOfSpeech?: string | null,
): LexicalLookupBundle {
  const word = normaliseWord(wordInput);
  const initialLocal = lookupLocalCorpusWord(word, context, relation, preferredPartOfSpeech);
  const literacyCurated = literacyCuratedCandidate(word, relation);
  const reviewedCommon = reviewedCommonCandidates(word, relation);
  const curatedCandidates = [
    ...reviewedCommon,
    ...(literacyCurated ? [literacyCurated] : []),
  ];

  const initialWordnet = lookupWordNetWord(
    word,
    relation,
    preferredPartOfSpeech ?? initialLocal.preferredPartOfSpeech,
  );
  const curatedPartOfSpeech = consensusPartOfSpeech(curatedCandidates);
  const semanticPartOfSpeech = preferredPartOfSpeech
    ?? initialLocal.preferredPartOfSpeech
    ?? curatedPartOfSpeech
    ?? initialWordnet.preferredPartOfSpeech;

  // Some Britfone headwords have multiple stress patterns because the noun and
  // verb are pronounced differently. Once reviewed/local semantics give us an
  // unambiguous part of speech, ask the core pronunciation layer again with
  // that evidence rather than falling through to a generic remote dictionary.
  const local = semanticPartOfSpeech && semanticPartOfSpeech !== initialLocal.preferredPartOfSpeech
    ? lookupLocalCorpusWord(word, context, relation, semanticPartOfSpeech)
    : initialLocal;
  const wordnet = semanticPartOfSpeech && semanticPartOfSpeech !== initialWordnet.preferredPartOfSpeech
    ? lookupWordNetWord(word, relation, semanticPartOfSpeech)
    : initialWordnet;

  // When the caller has explicit grammatical POS evidence, do not let a
  // different-POS WordNet surface entry block morphology resolution. This is
  // especially important for inflected forms that also happen to exist as an
  // adjective, such as `stopped`: in “the bus stopped beside the school” the
  // verb cue should allow `stopped → stop` to be validated locally instead of
  // accepting WordNet's adjective sense “blocked”. If no explicit POS was
  // supplied, preserve WordNet's normal broad evidence.
  const wordnetCandidates = preferredPartOfSpeech
    ? candidatesForPartOfSpeech(wordnet.candidates, preferredPartOfSpeech)
    : wordnet.candidates;
  const wordnetRecognised = wordnet.recognised
    && (!preferredPartOfSpeech || wordnetCandidates.length > 0);

  const candidates = [
    ...local.candidates,
    ...curatedCandidates,
    ...wordnetCandidates,
  ];
  const curatedMeaningHit = curatedCandidates.length > 0;
  const recognised = local.recognised || curatedMeaningHit || wordnetRecognised;
  const providers: string[] = [];

  if (local.metadata.entryHit) providers.push("buddy-corpus");
  if (curatedMeaningHit) providers.push("buddy-curated");
  if (wordnetRecognised) providers.push("wordnet");
  if (local.metadata.britfoneEntryHit && !local.metadata.entryHit) providers.push("britfone");

  return {
    word,
    recognised,
    candidates,
    pronunciation: local.pronunciation,
    preferredPartOfSpeech: semanticPartOfSpeech ?? wordnet.preferredPartOfSpeech,
    headword: local.headword,
    possibleSpelling: null,
    providers,
    corpus: {
      ...local.metadata,
      remoteFallback: false,
      curatedMeaningHit,
      wordnetAvailable: wordnet.metadata.available,
      wordnetVersion: wordnet.metadata.version,
      wordnetEntryHit: wordnet.metadata.entryHit,
      wordnetSenseCount: wordnet.metadata.senseCount,
      wordnetTaggedSenseCount: wordnet.metadata.taggedSenseCount,
    },
  };
}
