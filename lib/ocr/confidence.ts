export type OcrConfidenceBand = "high" | "medium" | "low" | "reject";

export type OcrWordSignal = {
  text: string;
  confidence: number;
};

// Tesseract confidence is a ranking signal, not a probability. Keep policy in
// one place so photographed-page testing can tune these thresholds without
// leaking magic numbers throughout the reading UI.
export const OCR_CONFIDENCE = {
  pageMinimum: 18,
  trustedPage: 55,
  high: 80,
  focusedMinimum: 35,
} as const;

export function ocrConfidenceBand(confidence: number): OcrConfidenceBand {
  if (confidence < OCR_CONFIDENCE.pageMinimum) return "reject";
  if (confidence >= OCR_CONFIDENCE.high) return "high";
  if (confidence >= OCR_CONFIDENCE.trustedPage) return "medium";
  return "low";
}

export function keepPageWord(word: OcrWordSignal) {
  return /[a-z]/i.test(word.text) && ocrConfidenceBand(word.confidence) !== "reject";
}

export function shouldBoxPageWord(word: OcrWordSignal) {
  const band = ocrConfidenceBand(word.confidence);
  return /[a-z]/i.test(word.text) && (band === "medium" || band === "high");
}

export function shouldVerifyPageWord(word: Pick<OcrWordSignal, "confidence">) {
  return ocrConfidenceBand(word.confidence) === "low";
}

export function focusedWordIsUsable(confidence: number) {
  return confidence >= OCR_CONFIDENCE.focusedMinimum;
}
