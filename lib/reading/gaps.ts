import type { OcrBox, OcrSentence, OcrWord } from "@/lib/ocr/types";

export type ReadingGap = {
  id: string;
  lineId: string;
  paragraphId?: string;
  leftWordId: string;
  rightWordId: string;
  bbox: OcrBox;
  gapWidth: number;
  normalGap: number;
  estimatedCharacters: number;
  contextBefore: string[];
  contextAfter: string[];
  confidence: number;
};

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values: number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)));
  return sorted[index];
}

function normalisedToken(value: string) {
  return value
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "")
    .trim();
}

function usableLineWords(words: OcrWord[]) {
  return [...words]
    .filter((word) => word.text.trim() && /[a-z0-9]/i.test(word.text))
    .sort((a, b) => a.bbox.x0 - b.bbox.x0);
}

function lineMetrics(words: OcrWord[]) {
  const heights = words.map((word) => Math.max(1, word.bbox.y1 - word.bbox.y0));
  const charWidths = words
    .map((word) => {
      const token = normalisedToken(word.text);
      return token.length
        ? Math.max(1, word.bbox.x1 - word.bbox.x0) / token.length
        : 0;
    })
    .filter((value) => value > 0);

  const gaps = words.slice(1).map((word, index) =>
    Math.max(0, word.bbox.x0 - words[index].bbox.x1),
  );
  const smallGaps = gaps.filter((gap) => gap <= percentile(gaps, 0.7) || gaps.length <= 3);

  return {
    medianHeight: median(heights),
    medianCharWidth: Math.max(1, median(charWidths)),
    normalGap: Math.max(1, median(smallGaps)),
  };
}

/**
 * Detect plausible missing-token regions from spacing inside OCR lines.
 *
 * This deliberately identifies geometry only. It does not decide what the
 * missing text says. A later resolver can combine the region with focused OCR,
 * known-text alignment, book memory and/or a constrained language candidate.
 */
export function detectReadingGaps(
  words: OcrWord[],
  pageWidth: number,
): ReadingGap[] {
  const lines = new Map<string, OcrWord[]>();

  words.forEach((word) => {
    if (!word.lineId) return;
    lines.set(word.lineId, [...(lines.get(word.lineId) ?? []), word]);
  });

  const gaps: ReadingGap[] = [];

  const lineEntries = [...lines.entries()]
    .map(([lineId, rawLineWords]) => {
      const lineWords = usableLineWords(rawLineWords);
      const readingOrder = lineWords.reduce<number | undefined>((lowest, word) => {
        if (word.readingOrder === undefined) return lowest;
        return lowest === undefined ? word.readingOrder : Math.min(lowest, word.readingOrder);
      }, undefined);
      const centreY = lineWords.length
        ? lineWords.reduce((sum, word) => sum + (word.bbox.y0 + word.bbox.y1) / 2, 0) / lineWords.length
        : 0;
      return {
        lineId,
        lineWords,
        paragraphId: lineWords[0]?.paragraphId,
        readingOrder,
        centreY,
      };
    })
    .filter((line) => line.lineWords.length >= 2)
    .sort((a, b) => {
      if (a.readingOrder !== undefined && b.readingOrder !== undefined && a.readingOrder !== b.readingOrder) {
        return a.readingOrder - b.readingOrder;
      }
      return a.centreY - b.centreY;
    });

  for (const { lineId, lineWords } of lineEntries) {
    if (lineWords.length < 3) continue;

    const metrics = lineMetrics(lineWords);
    const normalGap = Math.max(metrics.normalGap, metrics.medianCharWidth * 0.35);
    const minimumMissingWidth = Math.max(
      metrics.medianCharWidth * 1.55,
      metrics.medianHeight * 0.42,
    );
    const maximumGapWidth = Math.min(
      pageWidth * 0.28,
      metrics.medianCharWidth * 15 + normalGap,
    );

    for (let index = 0; index < lineWords.length - 1; index += 1) {
      const left = lineWords[index];
      const right = lineWords[index + 1];
      const gapWidth = right.bbox.x0 - left.bbox.x1;
      const missingWidth = gapWidth - normalGap;

      if (missingWidth < minimumMissingWidth || gapWidth > maximumGapWidth) continue;

      const leftToken = normalisedToken(left.text);
      const rightToken = normalisedToken(right.text);
      if (!leftToken || !rightToken) continue;

      // Large spaces immediately after obvious sentence-ending punctuation are
      // more likely to be OCR line/layout artefacts than a missing word.
      if (/[.!?][”"'’)]*$/.test(left.text.trim())) continue;

      const estimatedCharacters = Math.max(
        1,
        Math.min(14, Math.round(missingWidth / metrics.medianCharWidth)),
      );
      const margin = Math.max(1, normalGap * 0.35);
      const y0 = Math.min(left.bbox.y0, right.bbox.y0);
      const y1 = Math.max(left.bbox.y1, right.bbox.y1);
      const widthRatio = missingWidth / Math.max(1, metrics.medianCharWidth);
      const spacingRatio = gapWidth / Math.max(1, normalGap);
      const confidence = Math.max(
        0,
        Math.min(
          1,
          0.42
            + Math.min(0.28, (spacingRatio - 2) * 0.08)
            + Math.min(0.2, widthRatio * 0.025),
        ),
      );

      gaps.push({
        id: `gap:${lineId}:${left.id}:${right.id}`,
        lineId,
        ...(left.paragraphId ? { paragraphId: left.paragraphId } : {}),
        leftWordId: left.id,
        rightWordId: right.id,
        bbox: {
          x0: Math.min(right.bbox.x0 - 1, left.bbox.x1 + margin),
          y0,
          x1: Math.max(left.bbox.x1 + 1, right.bbox.x0 - margin),
          y1,
        },
        gapWidth,
        normalGap,
        estimatedCharacters,
        contextBefore: lineWords
          .slice(Math.max(0, index - 5), index + 1)
          .map((word) => word.text),
        contextAfter: lineWords
          .slice(index + 1, index + 7)
          .map((word) => word.text),
        confidence,
      });
    }
  }

  const paragraphs = new Map<string, typeof lineEntries>();
  for (const line of lineEntries) {
    if (!line.paragraphId) continue;
    paragraphs.set(line.paragraphId, [...(paragraphs.get(line.paragraphId) ?? []), line]);
  }

  for (const paragraphLines of paragraphs.values()) {
    if (paragraphLines.length < 2) continue;

    const rightEdges = paragraphLines
      .map((line) => line.lineWords.at(-1)?.bbox.x1 ?? 0)
      .filter((value) => value > 0);
    const expectedRightEdge = percentile(rightEdges, 0.75);

    for (let lineIndex = 0; lineIndex < paragraphLines.length - 1; lineIndex += 1) {
      const line = paragraphLines[lineIndex];
      const nextLine = paragraphLines[lineIndex + 1];
      const last = line.lineWords.at(-1);
      const nextFirst = nextLine.lineWords[0];
      if (!last || !nextFirst || line.lineWords.length < 3) continue;
      if (/[.!?][”"'’)]*$/.test(last.text.trim())) continue;

      const metrics = lineMetrics(line.lineWords);
      const normalGap = Math.max(metrics.normalGap, metrics.medianCharWidth * 0.35);
      const trailingWidth = expectedRightEdge - last.bbox.x1;
      const missingWidth = trailingWidth - normalGap;
      const minimumMissingWidth = Math.max(
        metrics.medianCharWidth * 1.55,
        metrics.medianHeight * 0.42,
      );
      const maximumGapWidth = Math.min(
        pageWidth * 0.28,
        metrics.medianCharWidth * 15 + normalGap,
      );

      if (
        missingWidth < minimumMissingWidth
        || trailingWidth <= 0
        || trailingWidth > maximumGapWidth
      ) {
        continue;
      }

      const margin = Math.max(1, normalGap * 0.35);
      const estimatedCharacters = Math.max(
        1,
        Math.min(14, Math.round(missingWidth / metrics.medianCharWidth)),
      );
      const widthRatio = missingWidth / Math.max(1, metrics.medianCharWidth);
      const confidence = Math.max(
        0,
        Math.min(0.72, 0.48 + Math.min(0.24, widthRatio * 0.025)),
      );

      gaps.push({
        id: `gap:${line.lineId}:${last.id}:line-end:${nextFirst.id}`,
        lineId: line.lineId,
        ...(line.paragraphId ? { paragraphId: line.paragraphId } : {}),
        leftWordId: last.id,
        rightWordId: nextFirst.id,
        bbox: {
          x0: Math.min(expectedRightEdge - 1, last.bbox.x1 + margin),
          y0: Math.min(...line.lineWords.map((word) => word.bbox.y0)),
          x1: Math.max(last.bbox.x1 + 1, expectedRightEdge - margin),
          y1: Math.max(...line.lineWords.map((word) => word.bbox.y1)),
        },
        gapWidth: trailingWidth,
        normalGap,
        estimatedCharacters,
        contextBefore: line.lineWords.slice(-6).map((word) => word.text),
        contextAfter: nextLine.lineWords.slice(0, 6).map((word) => word.text),
        confidence,
      });
    }
  }

  return gaps
    .sort((a, b) => b.confidence - a.confidence || b.gapWidth - a.gapWidth)
    .slice(0, 12);
}

export function gapBelongsToSentence(
  gap: ReadingGap,
  sentenceWordIds: string[],
) {
  const ids = new Set(sentenceWordIds);
  return ids.has(gap.leftWordId) && ids.has(gap.rightWordId);
}

export function gapContextSentence(gap: ReadingGap, candidate = "___") {
  return [
    ...gap.contextBefore,
    candidate,
    ...gap.contextAfter,
  ].join(" ").replace(/\s+/g, " ").trim();
}


export function gapCandidateFitsLength(gap: ReadingGap, candidate: string) {
  const length = normalisedToken(candidate).length;
  if (!length) return false;
  const tolerance = Math.max(2, Math.round(gap.estimatedCharacters * 0.38));
  return Math.abs(length - gap.estimatedCharacters) <= tolerance;
}

export function markSentencesWithDetectedGaps(
  sentences: OcrSentence[],
  gaps: ReadingGap[],
) {
  const meaningful = gaps.filter((gap) => gap.confidence >= 0.5);
  if (!meaningful.length) return sentences;

  return sentences.map((sentence) => {
    const hasGap = meaningful.some((gap) =>
      gapBelongsToSentence(gap, sentence.wordIds),
    );
    if (!hasGap || sentence.quality === "blocked") return sentence;

    return {
      ...sentence,
      quality: "check" as const,
      uncertain: true,
    };
  });
}
