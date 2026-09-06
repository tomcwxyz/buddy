export type OcrEvaluation = {
  expectedCount: number;
  detectedCount: number;
  matchedCount: number;
  recall: number | null;
  precision: number | null;
  missingWords: string[];
  unexpectedWords: string[];
};

export function normaliseEvaluationWord(value: string) {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/^[^a-z'-]+|[^a-z'-]+$/gi, "")
    .replace(/'{2,}/g, "'")
    .trim();
}

export function tokeniseExpectedText(text: string) {
  return text
    .split(/\s+/)
    .map(normaliseEvaluationWord)
    .filter((word) => /[a-z]/.test(word));
}

function increment(map: Map<string, number>, word: string) {
  map.set(word, (map.get(word) ?? 0) + 1);
}

function expandCounts(map: Map<string, number>) {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en-GB"))
    .flatMap(([word, count]) => Array.from({ length: count }, () => word));
}

export function evaluateOcrWords(expectedText: string, detectedValues: string[]): OcrEvaluation {
  const expected = tokeniseExpectedText(expectedText);
  const detected = detectedValues
    .map(normaliseEvaluationWord)
    .filter((word) => /[a-z]/.test(word));

  const remainingExpected = new Map<string, number>();
  expected.forEach((word) => increment(remainingExpected, word));
  const unexpected = new Map<string, number>();
  let matchedCount = 0;

  for (const word of detected) {
    const remaining = remainingExpected.get(word) ?? 0;
    if (remaining > 0) {
      matchedCount += 1;
      if (remaining === 1) remainingExpected.delete(word);
      else remainingExpected.set(word, remaining - 1);
    } else {
      increment(unexpected, word);
    }
  }

  return {
    expectedCount: expected.length,
    detectedCount: detected.length,
    matchedCount,
    recall: expected.length > 0 ? matchedCount / expected.length : null,
    precision: detected.length > 0 ? matchedCount / detected.length : null,
    missingWords: expandCounts(remainingExpected),
    unexpectedWords: expandCounts(unexpected),
  };
}
