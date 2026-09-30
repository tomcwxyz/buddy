export type InkPoint = {
  x: number;
  y: number;
};

export type BoxLike = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type DeskewEstimate = {
  angle: number;
  candidateAngle: number;
  confidence: number;
  applied: boolean;
};

const MAX_DESKEW_DEGREES = 4;
const DESKEW_STEP_DEGREES = 0.5;
const MIN_DESKEW_DEGREES = 0.5;
const MIN_DESKEW_IMPROVEMENT = 0.12;
const MIN_INK_POINTS = 240;

function projectionScore(points: InkPoint[], height: number, angle: number) {
  if (!points.length) return 0;
  const radians = angle * Math.PI / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const binSize = Math.max(2, height / 240);
  const bins = new Map<number, number>();

  for (const point of points) {
    const rotatedY = point.x * sin + point.y * cos;
    const bin = Math.round(rotatedY / binSize);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }

  let score = 0;
  for (const count of bins.values()) score += count * count;
  return score / points.length;
}

/**
 * Estimate a small corrective rotation by asking which candidate angle makes
 * dark text-like pixels line up most strongly in horizontal projection bands.
 *
 * This intentionally only handles modest camera skew. Anything outside ±4° is
 * left alone rather than pretending a weak estimate is reliable enough to
 * reshape a child's reading page.
 */
export function estimateDeskewAngle(
  points: InkPoint[],
  width: number,
  height: number,
): DeskewEstimate {
  if (width <= 0 || height <= 0 || points.length < MIN_INK_POINTS) {
    return { angle: 0, candidateAngle: 0, confidence: 0, applied: false };
  }

  const baseline = projectionScore(points, height, 0);
  let bestAngle = 0;
  let bestScore = baseline;

  for (
    let angle = -MAX_DESKEW_DEGREES;
    angle <= MAX_DESKEW_DEGREES + Number.EPSILON;
    angle += DESKEW_STEP_DEGREES
  ) {
    if (Math.abs(angle) < Number.EPSILON) continue;
    const score = projectionScore(points, height, angle);
    if (score > bestScore) {
      bestScore = score;
      bestAngle = Number(angle.toFixed(2));
    }
  }

  const confidence = baseline > 0 ? Math.max(0, (bestScore - baseline) / baseline) : 0;
  const applied = Math.abs(bestAngle) >= MIN_DESKEW_DEGREES
    && confidence >= MIN_DESKEW_IMPROVEMENT;

  return {
    angle: applied ? bestAngle : 0,
    candidateAngle: bestAngle,
    confidence,
    applied,
  };
}

function rotatePoint(
  x: number,
  y: number,
  angle: number,
  centreX: number,
  centreY: number,
) {
  const radians = angle * Math.PI / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const dx = x - centreX;
  const dy = y - centreY;

  return {
    x: centreX + dx * cos - dy * sin,
    y: centreY + dx * sin + dy * cos,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Tesseract sees a deskewed image, while Buddy still displays the original
 * photograph. Map the recognised rectangle back into the photograph's
 * coordinate system so the tappable overlay and focused retry remain aligned.
 */
export function mapBoxFromDeskewed(
  box: BoxLike,
  width: number,
  height: number,
  appliedDeskewAngle: number,
): BoxLike {
  if (!appliedDeskewAngle) return { ...box };

  const centreX = width / 2;
  const centreY = height / 2;
  const inverseAngle = -appliedDeskewAngle;
  const corners = [
    rotatePoint(box.x0, box.y0, inverseAngle, centreX, centreY),
    rotatePoint(box.x1, box.y0, inverseAngle, centreX, centreY),
    rotatePoint(box.x1, box.y1, inverseAngle, centreX, centreY),
    rotatePoint(box.x0, box.y1, inverseAngle, centreX, centreY),
  ];

  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);

  return {
    x0: clamp(Math.min(...xs), 0, width),
    y0: clamp(Math.min(...ys), 0, height),
    x1: clamp(Math.max(...xs), 0, width),
    y1: clamp(Math.max(...ys), 0, height),
  };
}


export type PageCropEstimate = {
  box: BoxLike;
  confidence: number;
  applied: boolean;
};

export type HorizontalPerspectiveEstimate = {
  leftTop: number;
  leftBottom: number;
  rightTop: number;
  rightBottom: number;
  confidence: number;
  applied: boolean;
};

function quantile(values: number[], fraction: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction)));
  return sorted[index];
}

function linearFit(samples: Array<{ t: number; value: number }>) {
  if (samples.length < 2) return { start: samples[0]?.value ?? 0, end: samples[0]?.value ?? 0 };
  const meanT = samples.reduce((sum, sample) => sum + sample.t, 0) / samples.length;
  const meanValue = samples.reduce((sum, sample) => sum + sample.value, 0) / samples.length;
  let numerator = 0;
  let denominator = 0;
  for (const sample of samples) {
    numerator += (sample.t - meanT) * (sample.value - meanValue);
    denominator += (sample.t - meanT) * (sample.t - meanT);
  }
  const slope = denominator > 0 ? numerator / denominator : 0;
  const intercept = meanValue - slope * meanT;
  return { start: intercept, end: intercept + slope };
}

/**
 * Isolate the dominant text-bearing page in an open-book photograph. The
 * detector deliberately uses dark text density rather than page-edge colour,
 * which makes it less sensitive to cream paper, shadows and uneven lighting.
 */
export function estimatePageCrop(
  points: InkPoint[],
  width: number,
  height: number,
): PageCropEstimate {
  const full = { x0: 0, y0: 0, x1: width, y1: height };
  if (width <= 0 || height <= 0 || points.length < MIN_INK_POINTS) {
    return { box: full, confidence: 0, applied: false };
  }

  const central = points.filter((point) => point.y >= height * 0.08 && point.y <= height * 0.84);
  if (central.length < MIN_INK_POINTS) return { box: full, confidence: 0, applied: false };

  const binCount = 64;
  const counts = Array.from({ length: binCount }, () => 0);
  for (const point of central) {
    const index = clamp(Math.floor((point.x / width) * binCount), 0, binCount - 1);
    counts[index] += 1;
  }

  const smoothed = counts.map((count, index) =>
    count + (counts[index - 1] ?? 0) * 0.55 + (counts[index + 1] ?? 0) * 0.55,
  );
  const peak = Math.max(...smoothed);
  const mean = smoothed.reduce((sum, value) => sum + value, 0) / smoothed.length;
  const threshold = Math.max(3, peak * 0.09, mean * 0.42);

  const runs: Array<{ start: number; end: number; score: number }> = [];
  let start = -1;
  let gap = 0;
  for (let index = 0; index <= binCount; index += 1) {
    const active = index < binCount && smoothed[index] >= threshold;
    if (active) {
      if (start < 0) start = index;
      gap = 0;
      continue;
    }
    if (start >= 0 && index < binCount && gap < 1) {
      gap += 1;
      continue;
    }
    if (start >= 0) {
      const end = Math.max(start, index - gap - 1);
      const span = end - start + 1;
      const density = smoothed.slice(start, end + 1).reduce((sum, value) => sum + value, 0);
      if (span >= 8) runs.push({ start, end, score: density * Math.sqrt(span) });
      start = -1;
      gap = 0;
    }
  }

  const best = runs.sort((a, b) => b.score - a.score)[0];
  if (!best) return { box: full, confidence: 0, applied: false };

  const margin = width * 0.035;
  const x0 = clamp((best.start / binCount) * width - margin, 0, width);
  const x1 = clamp(((best.end + 1) / binCount) * width + margin, 0, width);
  const cropWidth = x1 - x0;
  if (cropWidth < width * 0.44) return { box: full, confidence: 0, applied: false };

  const pointsInside = central.filter((point) => point.x >= x0 && point.x <= x1).length;
  const pointShare = pointsInside / central.length;
  const widthShare = cropWidth / width;
  const confidence = Math.max(0, Math.min(1, pointShare * 0.75 + (1 - widthShare) * 0.25));
  const applied = widthShare <= 0.94 && pointShare >= 0.58;

  return {
    box: applied ? { x0, y0: 0, x1, y1: height } : full,
    confidence,
    applied,
  };
}

/**
 * Estimate a gentle horizontal perspective warp from the left and right text
 * margins. This is intentionally conservative: it only rectifies when several
 * vertical bands agree on a modest trapezoid.
 */
export function estimateHorizontalPerspective(
  points: InkPoint[],
  width: number,
  height: number,
): HorizontalPerspectiveEstimate {
  const identity = {
    leftTop: 0,
    leftBottom: 0,
    rightTop: width,
    rightBottom: width,
    confidence: 0,
    applied: false,
  };
  if (width <= 0 || height <= 0 || points.length < MIN_INK_POINTS) return identity;

  const bandCount = 10;
  const leftSamples: Array<{ t: number; value: number }> = [];
  const rightSamples: Array<{ t: number; value: number }> = [];
  const yStart = height * 0.08;
  const yEnd = height * 0.86;
  const bandHeight = (yEnd - yStart) / bandCount;

  for (let band = 0; band < bandCount; band += 1) {
    const top = yStart + band * bandHeight;
    const bottom = top + bandHeight;
    const xs = points
      .filter((point) => point.y >= top && point.y < bottom)
      .map((point) => point.x);
    if (xs.length < 28) continue;

    const t = ((top + bottom) / 2) / height;
    leftSamples.push({ t, value: quantile(xs, 0.06) });
    rightSamples.push({ t, value: quantile(xs, 0.94) });
  }

  if (leftSamples.length < 6 || rightSamples.length < 6) return identity;

  const leftFit = linearFit(leftSamples);
  const rightFit = linearFit(rightSamples);
  const margin = width * 0.035;
  const leftTop = clamp(leftFit.start - margin, 0, width * 0.35);
  const leftBottom = clamp(leftFit.end - margin, 0, width * 0.35);
  const rightTop = clamp(rightFit.start + margin, width * 0.65, width);
  const rightBottom = clamp(rightFit.end + margin, width * 0.65, width);
  const topWidth = rightTop - leftTop;
  const bottomWidth = rightBottom - leftBottom;
  const movement = Math.max(
    Math.abs(leftBottom - leftTop),
    Math.abs(rightBottom - rightTop),
  );
  const movementShare = movement / width;
  const widthConsistency = Math.min(topWidth, bottomWidth) / Math.max(topWidth, bottomWidth);
  const evidence = Math.min(leftSamples.length, rightSamples.length) / bandCount;
  const confidence = Math.max(0, Math.min(1, evidence * widthConsistency));

  const applied = movementShare >= 0.012
    && movementShare <= 0.14
    && Math.min(topWidth, bottomWidth) >= width * 0.55
    && widthConsistency >= 0.72
    && confidence >= 0.5;

  return {
    leftTop: applied ? leftTop : 0,
    leftBottom: applied ? leftBottom : 0,
    rightTop: applied ? rightTop : width,
    rightBottom: applied ? rightBottom : width,
    confidence,
    applied,
  };
}
