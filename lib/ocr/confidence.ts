import type { OcrWord } from "@/lib/ocr/types";

export type OcrConfidenceBand = "high" | "medium" | "low" | "reject";

// Tesseract confidence is a useful ranking signal, not a probability. Keep the
// policy in one place so photographed-page testing can tune it without leaking
// thresholds throughout the reading UI.
export const OCR_CONFIDENCE = {
  pageMinimum: 18,
  high: 80,
  medium: 55,
  focusedMinimum: 35,
} as const;

export function ocrConfidenceBand(confidence: number): OcrConfidenceBand {
  if (confidence < OCR_CONFIDENCE.pageMinimum) return "reject";
  if (confidence >= OCR_CONFIDENCE.high) return "high";
  if (confidence >= OCR_CONFIDENCE.medium) return "medium";
  return "low";
}

export function keepPageWord(word: Pick<OcrWord, "text" | "confidence">) {
  return /[a-z]/i.test(word.text) && ocrConfidenceBand(word.confidence) !== "reject";
}

export function shouldVerifyPageWord(word: Pick<OcrWord, "confidence">) {
  return ocrConfidenceBand(word.confidence) === "low";
}

export function focusedWordIsUsable(confidence: number) {
  return confidence >= OCR_CONFIDENCE.focusedMinimum;
}
