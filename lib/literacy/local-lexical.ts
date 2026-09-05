import { reviewedCommonCandidates } from "@/lib/literacy/curated-lexicon";
import { getCuratedWordSupport, normaliseWord } from "@/lib/literacy/engine";
import type { LexicalCandidate, LexicalRelation } from "@/lib/literacy/lexicon";
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
  const local = lookupLocalCorpusWord(word, context, relation, preferredPartOfSpeech);
  const literacyCurated = literacyCuratedCandidate(word, relation);
  const reviewedCommon = reviewedCommonCandidates(word, relation);
  const curatedCandidates = [
    ...reviewedCommon,
    ...(literacyCurated ? [literacyCurated] : []),
  ];
  const wordnet = lookupWordNetWord(
    word,
    relation,
    preferredPartOfSpeech ?? local.preferredPartOfSpeech,
  );
  const candidates = [
    ...local.candidates,
    ...curatedCandidates,
    ...wordnet.candidates,
  ];
  const curatedMeaningHit = curatedCandidates.length > 0;
  const recognised = local.recognised || curatedMeaningHit || wordnet.recognised;
  const providers: string[] = [];

  if (local.metadata.entryHit) providers.push("buddy-corpus");
  if (curatedMeaningHit) providers.push("buddy-curated");
  if (wordnet.recognised) providers.push("wordnet");
  if (local.metadata.britfoneEntryHit && !local.metadata.entryHit) providers.push("britfone");

  return {
    word,
    recognised,
    candidates,
    pronunciation: local.pronunciation,
    preferredPartOfSpeech: local.preferredPartOfSpeech ?? wordnet.preferredPartOfSpeech,
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
