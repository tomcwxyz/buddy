import type { OcrWord } from "@/lib/ocr/types";

export function normaliseSpellingWord(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-GB")
    .replace(/[’‘]/g, "'")
    .replace(/^[^a-z]+|[^a-z'-]+$/g, "");
}

export function isUsableSpellingWord(value: string) {
  const word = normaliseSpellingWord(value);
  return word.length > 0
    && word.length <= 32
    && /^[a-z]+(?:['-][a-z]+)*$/.test(word);
}

export function extractSpellingCandidates(
  words: Array<Pick<OcrWord, "text" | "bbox">>,
) {
  const ordered = [...words].sort((left, right) => {
    const vertical = left.bbox.y0 - right.bbox.y0;
    if (Math.abs(vertical) > 12) return vertical;
    return left.bbox.x0 - right.bbox.x0;
  });

  const seen = new Set<string>();
  const candidates: string[] = [];

  ordered.forEach((item) => {
    const word = normaliseSpellingWord(item.text);
    if (!isUsableSpellingWord(word) || seen.has(word)) return;
    seen.add(word);
    candidates.push(word);
  });

  return candidates;
}
