import { estimateDeskewAngle, type DeskewEstimate, type InkPoint } from "@/lib/ocr/geometry";

export type PreparedRecognitionImage = {
  image: string;
  deskew: DeskewEstimate;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("ocr_image_load_failed"));
    image.src = src;
  });
}

function greyscale(red: number, green: number, blue: number) {
  return Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
}

function otsuThreshold(histogram: number[], total: number) {
  if (total <= 0) return 128;

  let sum = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    sum += value * histogram[value];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = -1;
  let threshold = 128;

  for (let value = 0; value < histogram.length; value += 1) {
    backgroundWeight += histogram[value];
    if (!backgroundWeight) continue;

    const foregroundWeight = total - backgroundWeight;
    if (!foregroundWeight) break;

    backgroundSum += value * histogram[value];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const betweenVariance = backgroundWeight
      * foregroundWeight
      * (backgroundMean - foregroundMean)
      * (backgroundMean - foregroundMean);

    if (betweenVariance > bestVariance) {
      bestVariance = betweenVariance;
      threshold = value;
    }
  }

  return threshold;
}

function collectInkPoints(imageData: ImageData, width: number, height: number) {
  const histogram = Array.from({ length: 256 }, () => 0);
  const pixels = imageData.data;
  let total = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    histogram[greyscale(pixels[index], pixels[index + 1], pixels[index + 2])] += 1;
    total += 1;
  }

  const threshold = Math.min(205, otsuThreshold(histogram, total));
  const samplingStep = Math.max(2, Math.ceil(Math.max(width, height) / 700));
  const marginX = Math.round(width * 0.04);
  const marginY = Math.round(height * 0.04);
  const points: InkPoint[] = [];

  for (let y = marginY; y < height - marginY; y += samplingStep) {
    for (let x = marginX; x < width - marginX; x += samplingStep) {
      const offset = (y * width + x) * 4;
      const value = greyscale(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      if (value <= threshold) points.push({ x, y });
    }
  }

  // Illustrations or dark backgrounds can create far more dark samples than
  // text does. Keep the calculation bounded and deterministic.
  if (points.length <= 40_000) return points;
  const stride = Math.ceil(points.length / 40_000);
  return points.filter((_, index) => index % stride === 0);
}

/**
 * Prepare the already contrast-enhanced Buddy OCR image for whole-page
 * recognition. Only a strong small-angle deskew is applied; perspective and
 * aggressive page cropping remain deliberately out of scope until page
 * fixtures show they are needed.
 */
export async function prepareRecognitionImage(
  imageSource: string,
  width: number,
  height: number,
): Promise<PreparedRecognitionImage> {
  if (typeof document === "undefined" || width <= 0 || height <= 0) {
    return {
      image: imageSource,
      deskew: { angle: 0, candidateAngle: 0, confidence: 0, applied: false },
    };
  }

  try {
    const image = await loadImage(imageSource);
    const analysisCanvas = document.createElement("canvas");
    analysisCanvas.width = width;
    analysisCanvas.height = height;
    const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });
    if (!analysisContext) throw new Error("ocr_canvas_unavailable");

    analysisContext.drawImage(image, 0, 0, width, height);
    const imageData = analysisContext.getImageData(0, 0, width, height);
    const points = collectInkPoints(imageData, width, height);
    const deskew = estimateDeskewAngle(points, width, height);

    if (!deskew.applied) return { image: imageSource, deskew };

    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = width;
    rotatedCanvas.height = height;
    const rotatedContext = rotatedCanvas.getContext("2d");
    if (!rotatedContext) return { image: imageSource, deskew: { ...deskew, angle: 0, applied: false } };

    rotatedContext.fillStyle = "white";
    rotatedContext.fillRect(0, 0, width, height);
    rotatedContext.translate(width / 2, height / 2);
    rotatedContext.rotate(deskew.angle * Math.PI / 180);
    rotatedContext.drawImage(image, -width / 2, -height / 2, width, height);

    return {
      image: rotatedCanvas.toDataURL("image/png"),
      deskew,
    };
  } catch {
    // Geometry help should never turn a readable capture into an OCR failure.
    return {
      image: imageSource,
      deskew: { angle: 0, candidateAngle: 0, confidence: 0, applied: false },
    };
  }
}
