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
