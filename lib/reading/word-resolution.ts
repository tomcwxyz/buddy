import type { OcrSentence, OcrWord } from "@/lib/ocr/types";
import type { BookMemoryRecord } from "@/lib/reading/book-memory";
import { bookMemoryCandidates } from "@/lib/reading/book-memory";
import {
  normaliseEvidenceText,
  resolveReadingEvidence,
  type ReadingEvidence,
} from "@/lib/reading/evidence";
import {
  classifySentenceQuality,
  sentenceTextSuspiciousWordShare,
} from "@/lib/reading/guided-reading";

function baseEvidence(word: OcrWord): ReadingEvidence[] {
  if (word.evidence?.length) return word.evidence;
  return [{
    source: "visual",
    candidate: word.text,
    confidence: Math.max(0, Math.min(1, word.confidence / 100)),
    method: "ocr-existing",
    evidenceId: `ocr-existing:${word.id}`,
  }];
}

export function bookMemoryEvidenceForWord(
  record: BookMemoryRecord | null,
  word: OcrWord,
): ReadingEvidence[] {
  if (!record || word.confidence >= 82 || word.resolvedBy === "reader-corrected") return [];

  return bookMemoryCandidates(record, word.text).map((candidate) => ({
    source: "reader-corrected" as const,
    candidate: candidate.text,
    confidence: candidate.confidence,
    sourceId: record.id,
    method: `book-memory-${candidate.reason}`,
    evidenceId: `book-memory:${record.id}:${normaliseEvidenceText(word.text)}=>${normaliseEvidenceText(candidate.text)}`,
    independent: true,
  }));
}

export function resolveOcrWord(
  word: OcrWord,
  extraEvidence: ReadingEvidence[] = [],
): OcrWord {
  if (!extraEvidence.length) return word;
  const resolved = resolveReadingEvidence([...baseEvidence(word), ...extraEvidence]);
  if (!resolved) return word;

  return {
    ...word,
    text: resolved.text,
    confidence: Math.max(word.confidence, resolved.confidence * 100),
    evidence: resolved.evidence,
    resolvedBy: resolved.resolvedBy,
  };
}

export function resolveWordsWithBookMemory(
  words: OcrWord[],
  record: BookMemoryRecord | null,
) {
  if (!record) return words;
  return words.map((word) => resolveOcrWord(word, bookMemoryEvidenceForWord(record, word)));
}

function replaceFirstNormalisedToken(text: string, observed: string, corrected: string) {
  const observedNormalised = normaliseEvidenceText(observed);
  if (!observedNormalised) return text;

  let replaced = false;
  return text
    .split(/(\s+)/)
    .map((token) => {
      if (replaced || /^\s+$/.test(token)) return token;
      if (normaliseEvidenceText(token) !== observedNormalised) return token;

      replaced = true;
      const leading = token.match(/^[^a-z0-9'-]*/i)?.[0] ?? "";
      const trailing = token.match(/[^a-z0-9'-]*$/i)?.[0] ?? "";
      return `${leading}${corrected}${trailing}`;
    })
    .join("");
}

export function reconcileResolvedWordsIntoSentences(
  sentences: OcrSentence[],
  previousWords: OcrWord[],
  nextWords: OcrWord[],
) {
  const before = new Map(previousWords.map((word) => [word.id, word]));
  const after = new Map(nextWords.map((word) => [word.id, word]));

  return sentences.map((sentence) => {
    let text = sentence.text;
    let confidenceDelta = 0;
    let weakRecovered = 0;

    for (const wordId of sentence.wordIds) {
      const previous = before.get(wordId);
      const next = after.get(wordId);
      if (!previous || !next) continue;
      if (normaliseEvidenceText(previous.text) === normaliseEvidenceText(next.text)) continue;

      text = replaceFirstNormalisedToken(text, previous.text, next.text);
      confidenceDelta += Math.max(0, next.confidence - previous.confidence);
      if (previous.confidence < 55 && next.confidence >= 55) weakRecovered += 1;
    }

    if (text === sentence.text) return sentence;

    const wordCount = Math.max(1, sentence.wordIds.length);
    const confidence = Math.min(100, sentence.confidence + confidenceDelta / wordCount);
    const weakWordShare = Math.max(0, sentence.weakWordShare - weakRecovered / wordCount);
    const suspiciousWordShare = sentenceTextSuspiciousWordShare(text);
    const quality = classifySentenceQuality(
      confidence,
      weakWordShare,
      suspiciousWordShare,
      wordCount,
    );

    return {
      ...sentence,
      text,
      confidence,
      weakWordShare,
      suspiciousWordShare,
      quality,
      uncertain: quality !== "good",
    };
  });
}

export function applyBookMemoryToPage(
  trustedWords: OcrWord[],
  readingWords: OcrWord[],
  sentences: OcrSentence[],
  record: BookMemoryRecord | null,
) {
  if (!record) return { trustedWords, readingWords, sentences };

  const nextReadingWords = resolveWordsWithBookMemory(readingWords, record);
  const byId = new Map(nextReadingWords.map((word) => [word.id, word]));
  const nextTrustedWords = trustedWords.map((word) =>
    byId.get(word.id) ?? resolveOcrWord(word, bookMemoryEvidenceForWord(record, word)),
  );
  const nextSentences = reconcileResolvedWordsIntoSentences(
    sentences,
    readingWords,
    nextReadingWords,
  );

  return {
    trustedWords: nextTrustedWords,
    readingWords: nextReadingWords,
    sentences: nextSentences,
  };
}

export type ReaderCorrectionResult = {
  trustedWords: OcrWord[];
  readingWords: OcrWord[];
  sentences: OcrSentence[];
  changed: boolean;
  observed?: string;
  corrected?: string;
};

export function applyReaderCorrection(
  trustedWords: OcrWord[],
  readingWords: OcrWord[],
  sentences: OcrSentence[],
  wordId: string,
  corrected: string,
): ReaderCorrectionResult {
  const clean = corrected.trim();
  if (!clean || !/[a-z]/i.test(clean)) {
    return { trustedWords, readingWords, sentences, changed: false };
  }

  const sourceWord = readingWords.find((word) => word.id === wordId)
    ?? trustedWords.find((word) => word.id === wordId);
  if (!sourceWord) return { trustedWords, readingWords, sentences, changed: false };

  const correctionEvidence: ReadingEvidence = {
    source: "reader-corrected",
    candidate: clean,
    confidence: 1,
    method: "reader-correction",
    evidenceId: `reader-correction:${wordId}:${normaliseEvidenceText(clean)}`,
    independent: true,
  };

  const update = (word: OcrWord) =>
    word.id === wordId ? resolveOcrWord(word, [correctionEvidence]) : word;

  const nextReadingWords = readingWords.map(update);
  const nextTrustedWords = trustedWords.map(update);
  const nextSentences = reconcileResolvedWordsIntoSentences(
    sentences,
    readingWords,
    nextReadingWords,
  );

  return {
    trustedWords: nextTrustedWords,
    readingWords: nextReadingWords,
    sentences: nextSentences,
    changed: true,
    observed: sourceWord.text,
    corrected: clean,
  };
}
