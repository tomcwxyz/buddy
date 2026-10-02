import {
  estimateDeskewAngle,
  estimateHorizontalPerspective,
  estimatePageCrop,
  type DeskewEstimate,
  type HorizontalPerspectiveEstimate,
  type InkPoint,
  type PageCropEstimate,
} from "@/lib/ocr/geometry";

export type PreparedRecognitionImage = {
  image: string;
  displayImage: string;
  width: number;
  height: number;
  deskew: DeskewEstimate;
  pageCrop: PageCropEstimate;
  perspective: HorizontalPerspectiveEstimate;
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
  const marginX = Math.round(width * 0.025);
  const marginY = Math.round(height * 0.025);
  const points: InkPoint[] = [];

  for (let y = marginY; y < height - marginY; y += samplingStep) {
    for (let x = marginX; x < width - marginX; x += samplingStep) {
      const offset = (y * width + x) * 4;
      const value = greyscale(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      if (value <= threshold) points.push({ x, y });
    }
  }

  if (points.length <= 40_000) return points;
  const stride = Math.ceil(points.length / 40_000);
  return points.filter((_, index) => index % stride === 0);
}

function canvasFromImage(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("ocr_canvas_unavailable");
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function inkPointsFromCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [] as InkPoint[];
  return collectInkPoints(context.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
}

function cropCanvas(source: HTMLCanvasElement, crop: PageCropEstimate) {
  if (!crop.applied) return source;
  const width = Math.max(1, Math.round(crop.box.x1 - crop.box.x0));
  const height = Math.max(1, Math.round(crop.box.y1 - crop.box.y0));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(
    source,
    crop.box.x0,
    crop.box.y0,
    crop.box.x1 - crop.box.x0,
    crop.box.y1 - crop.box.y0,
    0,
    0,
    width,
    height,
  );
  return canvas;
}

function perspectiveWarpCanvas(
  source: HTMLCanvasElement,
  perspective: HorizontalPerspectiveEstimate,
) {
  if (!perspective.applied) return source;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return source;

  const stripHeight = 2;
  for (let y = 0; y < source.height; y += stripHeight) {
    const t = source.height > 1 ? y / (source.height - 1) : 0;
    const left = perspective.leftTop + (perspective.leftBottom - perspective.leftTop) * t;
    const right = perspective.rightTop + (perspective.rightBottom - perspective.rightTop) * t;
    const sourceWidth = Math.max(1, right - left);
    const height = Math.min(stripHeight, source.height - y);
    context.drawImage(source, left, y, sourceWidth, height, 0, y, source.width, height);
  }

  return canvas;
}

function rotateCanvas(source: HTMLCanvasElement, angle: number) {
  if (!angle) return source;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return source;

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(angle * Math.PI / 180);
  context.drawImage(source, -canvas.width / 2, -canvas.height / 2);
  return canvas;
}

/**
 * Prepare a photographed reading page before OCR. Buddy first isolates the
 * dominant text-bearing page, then cautiously straightens horizontal
 * perspective and finally applies the existing small-angle deskew.
 *
 * The same geometry is applied to the colour photograph and OCR image so word
 * boxes stay aligned with what the child sees.
 */
export async function prepareRecognitionImage(
  imageSource: string,
  width: number,
  height: number,
  displaySource = imageSource,
): Promise<PreparedRecognitionImage> {
  const identityDeskew = { angle: 0, candidateAngle: 0, confidence: 0, applied: false };
  const identityCrop = {
    box: { x0: 0, y0: 0, x1: width, y1: height },
    confidence: 0,
    applied: false,
  };
  const identityPerspective = {
    leftTop: 0,
    leftBottom: 0,
    rightTop: width,
    rightBottom: width,
    confidence: 0,
    applied: false,
  };

  if (typeof document === "undefined" || width <= 0 || height <= 0) {
    return {
      image: imageSource,
      displayImage: displaySource,
      width,
      height,
      deskew: identityDeskew,
      pageCrop: identityCrop,
      perspective: identityPerspective,
    };
  }

  try {
    const [ocrImage, displayImage] = await Promise.all([
      loadImage(imageSource),
      displaySource === imageSource ? loadImage(imageSource) : loadImage(displaySource),
    ]);

    let ocrCanvas = canvasFromImage(ocrImage, width, height);
    let displayCanvas = canvasFromImage(displayImage, width, height);

    const pageCrop = estimatePageCrop(inkPointsFromCanvas(ocrCanvas), width, height);
    ocrCanvas = cropCanvas(ocrCanvas, pageCrop);
    displayCanvas = cropCanvas(displayCanvas, pageCrop);

    const perspective = estimateHorizontalPerspective(
      inkPointsFromCanvas(ocrCanvas),
      ocrCanvas.width,
      ocrCanvas.height,
    );
    ocrCanvas = perspectiveWarpCanvas(ocrCanvas, perspective);
    displayCanvas = perspectiveWarpCanvas(displayCanvas, perspective);

    const deskew = estimateDeskewAngle(
      inkPointsFromCanvas(ocrCanvas),
      ocrCanvas.width,
      ocrCanvas.height,
    );
    ocrCanvas = rotateCanvas(ocrCanvas, deskew.angle);
    displayCanvas = rotateCanvas(displayCanvas, deskew.angle);

    return {
      image: ocrCanvas.toDataURL("image/png"),
      displayImage: displayCanvas.toDataURL("image/jpeg", 0.94),
      width: ocrCanvas.width,
      height: ocrCanvas.height,
      deskew,
      pageCrop,
      perspective,
    };
  } catch {
    return {
      image: imageSource,
      displayImage: displaySource,
      width,
      height,
      deskew: identityDeskew,
      pageCrop: identityCrop,
      perspective: identityPerspective,
    };
  }
}
