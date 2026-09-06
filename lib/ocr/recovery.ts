export type RecoveryOcrBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type RecoveryOcrWord = {
  id: string;
  text: string;
  confidence: number;
  bbox: RecoveryOcrBox;
  lineText?: string;
};

export type SparseRecoveryDecision = {
  run: boolean;
  reason: "few-trusted-words" | "too-many-weak-words" | "healthy";
};

const MIN_TRUSTED_WORDS_BEFORE_SINGLE_PASS = 24;
const WEAK_SHARE_TRIGGER = 0.15;
const MIN_WEAK_WORDS_FOR_RATIO_TRIGGER = 4;

function normaliseText(value: string) {
  return value.toLocaleLowerCase("en-GB").replace(/[^a-z'-]/g, "");
}

function boxArea(box: RecoveryOcrBox) {
  return Math.max(0, box.x1 - box.x0) * Math.max(0, box.y1 - box.y0);
}

function intersectionArea(a: RecoveryOcrBox, b: RecoveryOcrBox) {
  const width = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const height = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  return width * height;
}

export function overlapOfSmallerBox(a: RecoveryOcrBox, b: RecoveryOcrBox) {
  const smaller = Math.min(boxArea(a), boxArea(b));
  if (smaller <= 0) return 0;
  return intersectionArea(a, b) / smaller;
}

export function decideSparseRecovery(
  allPageWords: Array<Pick<RecoveryOcrWord, "text" | "confidence">>,
  trustedPageWords: Array<Pick<RecoveryOcrWord, "text" | "confidence">>,
): SparseRecoveryDecision {
  if (trustedPageWords.length < MIN_TRUSTED_WORDS_BEFORE_SINGLE_PASS) {
    return { run: true, reason: "few-trusted-words" };
  }

  const usable = allPageWords.filter((word) => /[a-z]/i.test(word.text) && word.confidence >= 18);
  const weak = usable.filter((word) => word.confidence < 55);
  const weakShare = usable.length > 0 ? weak.length / usable.length : 0;

  if (weak.length >= MIN_WEAK_WORDS_FOR_RATIO_TRIGGER && weakShare >= WEAK_SHARE_TRIGGER) {
    return { run: true, reason: "too-many-weak-words" };
  }

  return { run: false, reason: "healthy" };
}

function isSameSpatialWord(a: RecoveryOcrWord, b: RecoveryOcrWord) {
  const overlap = overlapOfSmallerBox(a.bbox, b.bbox);
  if (overlap >= 0.6) return true;

  // If both passes read the same normalised word, allow a slightly looser
  // spatial match to account for segmentation boxes expanding or shrinking.
  if (normaliseText(a.text) && normaliseText(a.text) === normaliseText(b.text)) {
    return overlap >= 0.4;
  }

  return false;
}

export function mergeOcrWords<T extends RecoveryOcrWord>(primary: T[], secondary: T[]) {
  const merged = primary.map((word) => ({ ...word })) as T[];

  for (const candidate of secondary) {
    const existingIndex = merged.findIndex((existing) => isSameSpatialWord(existing, candidate));
    if (existingIndex < 0) {
      merged.push({ ...candidate });
      continue;
    }

    const existing = merged[existingIndex];
    if (candidate.confidence > existing.confidence) {
      merged[existingIndex] = {
        ...candidate,
        id: existing.id,
        lineText: existing.lineText || candidate.lineText,
      } as T;
    }
  }

  return merged.sort((a, b) => {
    const aMid = (a.bbox.y0 + a.bbox.y1) / 2;
    const bMid = (b.bbox.y0 + b.bbox.y1) / 2;
    const averageHeight = Math.max(1, ((a.bbox.y1 - a.bbox.y0) + (b.bbox.y1 - b.bbox.y0)) / 2);
    if (Math.abs(aMid - bMid) <= averageHeight * 0.45) return a.bbox.x0 - b.bbox.x0;
    return aMid - bMid;
  });
}

export function nearestLineText(
  target: Pick<RecoveryOcrWord, "bbox">,
  anchors: Array<Pick<RecoveryOcrWord, "bbox" | "lineText">>,
) {
  const targetCentre = (target.bbox.y0 + target.bbox.y1) / 2;
  const targetHeight = Math.max(1, target.bbox.y1 - target.bbox.y0);

  const nearest = anchors.reduce<{ distance: number; text: string | null }>(
    (best, word) => {
      if (!word.lineText) return best;
      const centre = (word.bbox.y0 + word.bbox.y1) / 2;
      const distance = Math.abs(centre - targetCentre);
      return distance < best.distance ? { distance, text: word.lineText } : best;
    },
    { distance: Number.POSITIVE_INFINITY, text: null },
  );

  return nearest.distance <= targetHeight * 2.2 ? nearest.text : null;
}
