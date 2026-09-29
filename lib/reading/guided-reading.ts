import { OCR_CONFIDENCE } from "@/lib/ocr/confidence";
import type { OcrBox, OcrSentence, OcrWord } from "@/lib/ocr/types";

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

function readingOrder(words: OcrWord[]) {
  return [...words].sort((a, b) => {
    if (a.readingOrder !== undefined && b.readingOrder !== undefined) {
      return a.readingOrder - b.readingOrder;
    }

    const aMid = (a.bbox.y0 + a.bbox.y1) / 2;
    const bMid = (b.bbox.y0 + b.bbox.y1) / 2;
    const averageHeight = Math.max(1, ((a.bbox.y1 - a.bbox.y0) + (b.bbox.y1 - b.bbox.y0)) / 2);
    if (Math.abs(aMid - bMid) <= averageHeight * 0.45) return a.bbox.x0 - b.bbox.x0;
    return aMid - bMid;
  });
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

export function buildReadingSentences(words: OcrWord[]): OcrSentence[] {
  const usable = readingOrder(words.filter((word) => word.text.trim() && /[a-z0-9]/i.test(word.text)));
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

    sentences.push({
      id: "sentence-" + sentences.length,
      text,
      wordIds: current.map((word) => word.id),
      bounds: sentenceBounds(current),
      confidence,
      weakWordShare,
      uncertain: confidence < 68 || weakWordShare >= 0.2,
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
