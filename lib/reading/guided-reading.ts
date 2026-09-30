import { OCR_CONFIDENCE } from "@/lib/ocr/confidence";
import type { OcrBox, OcrSentence, OcrSentenceQuality, OcrWord } from "@/lib/ocr/types";

function unionBoxes(boxes: OcrBox[]): OcrBox {
  const first = boxes[0];
  if (!first) return { x0: 0, y0: 0, x1: 0, y1: 0 };

  return boxes.slice(1).reduce<OcrBox>(
    (union, box) => ({
      x0: Math.min(union.x0, box.x0),
      y0: Math.min(union.y0, box.y0),
      x1: Math.max(union.x1, box.x1),
      y1: Math.max(union.y1, box.y1),
    }),
    { ...first },
  );
}

function sentenceEndsHere(text: string) {
  return /[.!?][”"'’)]*$/.test(text.trim());
}

function joinTokens(words: OcrWord[]) {
  return words
    .map((word) => word.text.trim())
    .filter(Boolean)
    .reduce((text, token) => {
      if (!text) return token;
      if (/^[,.;:!?%)]/.test(token)) return text + token;
      return text + " " + token;
    }, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lineAwareReadingOrder(words: OcrWord[]) {
  const groups = new Map<string, OcrWord[]>();

  words.forEach((word, index) => {
    const key = word.lineId ?? `fallback-${index}`;
    groups.set(key, [...(groups.get(key) ?? []), word]);
  });

  return [...groups.values()]
    .map((lineWords) => {
      const sorted = [...lineWords].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      const order = sorted.reduce<number | undefined>((lowest, word) => {
        if (word.readingOrder === undefined) return lowest;
        return lowest === undefined ? word.readingOrder : Math.min(lowest, word.readingOrder);
      }, undefined);
      const centreY = sorted.reduce((sum, word) => sum + (word.bbox.y0 + word.bbox.y1) / 2, 0) / sorted.length;
      return { words: sorted, order, centreY };
    })
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined && a.order !== b.order) return a.order - b.order;
      return a.centreY - b.centreY;
    })
    .flatMap((line) => line.words);
}

function sentenceBounds(words: OcrWord[]) {
  const lines = new Map<string, OcrBox[]>();

  words.forEach((word) => {
    const fallbackLine = "y-" + Math.round(((word.bbox.y0 + word.bbox.y1) / 2) / 18);
    const key = word.lineId ?? fallbackLine;
    lines.set(key, [...(lines.get(key) ?? []), word.bbox]);
  });

  return [...lines.values()]
    .map(unionBoxes)
    .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
}

const COMMON_SHORT_WORDS = new Set([
  "a", "i", "am", "an", "as", "at", "be", "by", "do", "go", "he", "if", "in", "is",
  "it", "me", "mr", "ms", "my", "no", "of", "oh", "on", "or", "so", "to", "up", "us",
  "we",
]);

function normaliseToken(token: string) {
  return token
    .toLocaleLowerCase("en-GB")
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "");
}

export function sentenceTextSuspiciousWordShare(text: string) {
  const tokens = text.split(/\s+/).map(normaliseToken).filter(Boolean);
  if (!tokens.length) return 1;

  const suspicious = tokens.filter((token) => {
    if (/\d/.test(token) && /[a-z]/i.test(token)) return true;
    if (token.length === 1 && token !== "a" && token !== "i") return true;
    if (token.length === 2 && /^[a-z]+$/i.test(token) && !COMMON_SHORT_WORDS.has(token)) return true;
    if (token.length >= 4 && /^[a-z'-]+$/i.test(token) && !/[aeiouy]/i.test(token)) return true;
    return false;
  });

  return suspicious.length / tokens.length;
}

export function classifySentenceQuality(
  confidence: number,
  weakWordShare: number,
  suspiciousWordShare: number,
  wordCount: number,
): OcrSentenceQuality {
  if (
    wordCount >= 4
    && (confidence < 48 || weakWordShare >= 0.34 || suspiciousWordShare >= 0.12)
  ) {
    return "blocked";
  }

  if (
    confidence < 70
    || weakWordShare >= 0.15
    || suspiciousWordShare >= 0.07
  ) {
    return "check";
  }

  return "good";
}

export function buildReadingSentences(words: OcrWord[]): OcrSentence[] {
  const usable = lineAwareReadingOrder(
    words.filter((word) => word.text.trim() && /[a-z0-9]/i.test(word.text)),
  );
  if (!usable.length) return [];

  const sentences: OcrSentence[] = [];
  let current: OcrWord[] = [];
  let currentParagraph = usable[0]?.paragraphId;

  const flush = () => {
    if (!current.length) return;
    const text = joinTokens(current);
    if (!text) {
      current = [];
      return;
    }

    const confidence = current.reduce((sum, word) => sum + word.confidence, 0) / current.length;
    const weakWordCount = current.filter((word) => word.confidence < OCR_CONFIDENCE.trustedPage).length;
    const weakWordShare = weakWordCount / current.length;
    const suspiciousWordShare = sentenceTextSuspiciousWordShare(text);
    const quality = classifySentenceQuality(
      confidence,
      weakWordShare,
      suspiciousWordShare,
      current.length,
    );

    sentences.push({
      id: "sentence-" + sentences.length,
      text,
      wordIds: current.map((word) => word.id),
      bounds: sentenceBounds(current),
      confidence,
      weakWordShare,
      suspiciousWordShare,
      quality,
      uncertain: quality !== "good",
      paragraphId: current[0]?.paragraphId,
    });
    current = [];
  };

  usable.forEach((word) => {
    if (current.length && currentParagraph && word.paragraphId && word.paragraphId !== currentParagraph) {
      flush();
    }

    if (!current.length) currentParagraph = word.paragraphId;
    current.push(word);

    if (sentenceEndsHere(word.text)) {
      flush();
      currentParagraph = word.paragraphId;
    }
  });

  flush();
  return sentences;
}

const BREAK_BEFORE = new Set(["and", "but", "because", "when", "while", "if", "so", "then", "although", "after", "before"]);

export function chunkSentenceText(text: string) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 6) return [text.trim()];

  const chunks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (!current.length) return;
    chunks.push(current.join(" "));
    current = [];
  };

  tokens.forEach((token, index) => {
    const clean = token.toLocaleLowerCase("en-GB").replace(/^[^a-z]+|[^a-z]+$/g, "");
    if (current.length >= 3 && BREAK_BEFORE.has(clean)) flush();

    current.push(token);

    const punctuationBreak = /[,;:]$/.test(token);
    const longEnough = current.length >= 7;
    const roomAfter = tokens.length - index - 1 >= 2;
    if ((punctuationBreak && current.length >= 2) || (longEnough && roomAfter)) flush();
  });

  flush();
  return chunks.length > 1 ? chunks : [text.trim()];
}
