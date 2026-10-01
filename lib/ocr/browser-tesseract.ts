import type { Worker } from "tesseract.js";
import { prepareRecognitionImage } from "@/lib/ocr/browser-preprocess";
import { focusedWordIsUsable, keepPageWord, shouldBoxPageWord } from "@/lib/ocr/confidence";
import {
  decideSparseRecovery,
  mergeOcrWords,
  nearestLineAnchor,
  overlapOfSmallerBox,
} from "@/lib/ocr/recovery";
import type { OcrBox, OcrResult, OcrSentence, OcrSentenceQuality, OcrWord } from "@/lib/ocr/types";
import {
  buildReadingSentences,
  classifySentenceQuality,
  sentenceTextSuspiciousWordShare,
} from "@/lib/reading/guided-reading";
import {
  consensusEvidence,
  normaliseEvidenceText,
  visualEvidence,
} from "@/lib/reading/evidence";

type TesseractWord = {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

type TesseractLine = { words?: TesseractWord[]; text?: string };
type TesseractParagraph = { lines?: TesseractLine[] };
type TesseractBlock = { paragraphs?: TesseractParagraph[] };
type TesseractPageResult = {
  data: {
    text?: string;
    confidence?: number;
    blocks?: TesseractBlock[] | null;
  };
};

export type OcrRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

let workerPromise: Promise<Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(async ({ createWorker, PSM }) => {
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });
      return worker;
    });
  }
  return workerPromise;
}

function extractWords(result: TesseractPageResult, idPrefix: string) {
  const blocks = (result.data.blocks ?? []) as TesseractBlock[];
  const words: OcrWord[] = [];
  let readingOrder = 0;

  blocks.forEach((block, blockIndex) => {
    block.paragraphs?.forEach((paragraph, paragraphIndex) => {
      const paragraphId = `${idPrefix}-paragraph-${blockIndex}-${paragraphIndex}`;
      paragraph.lines?.forEach((line, lineIndex) => {
        const lineText = line.text?.replace(/\s+/g, " ").trim();
        const lineId = `${paragraphId}-line-${lineIndex}`;
        line.words?.forEach((word, wordIndex) => {
          const text = word.text?.trim();
          if (!text || !word.bbox || !/[a-z]/i.test(text)) return;
          words.push({
            id: `${idPrefix}-${blockIndex}-${paragraphIndex}-${lineIndex}-${wordIndex}`,
            text,
            confidence: word.confidence ?? 0,
            bbox: word.bbox,
            lineText: lineText || undefined,
            paragraphId,
            lineId,
            readingOrder: readingOrder++,
            evidence: [visualEvidence(text, word.confidence ?? 0, `ocr-${idPrefix}`)],
            resolvedBy: "visual",
          });
        });
      });
    });
  });

  return words;
}

function trustedPageWords(words: OcrWord[]) {
  return words.filter((word) => shouldBoxPageWord(word));
}

function addVisualConsensus(primary: OcrWord[], secondary: OcrWord[], method: string) {
  return primary.map((word) => {
    const match = secondary.find((candidate) =>
      normaliseEvidenceText(candidate.text) === normaliseEvidenceText(word.text)
      && overlapOfSmallerBox(candidate.bbox, word.bbox) >= 0.42,
    );
    if (!match) return word;

    const consensusConfidence = Math.min(100, Math.round((word.confidence + match.confidence) / 2));
    return {
      ...word,
      evidence: [
        ...(word.evidence ?? [visualEvidence(word.text, word.confidence, "ocr-primary")]),
        consensusEvidence(word.text, consensusConfidence, method),
      ],
      resolvedBy: "visual-consensus" as const,
    };
  });
}

function pagePassScore(words: OcrWord[]) {
  const usable = words.filter((word) => keepPageWord(word));
  if (usable.length < 8) return Number.NEGATIVE_INFINITY;

  const confidence = usable.reduce((sum, word) => sum + word.confidence, 0) / usable.length;
  const weakShare = usable.filter((word) => word.confidence < 55).length / usable.length;
  const suspiciousShare = sentenceTextSuspiciousWordShare(usable.map((word) => word.text).join(" "));
  const lineCount = new Set(usable.map((word) => word.lineId).filter(Boolean)).size;

  return confidence
    - weakShare * 28
    - suspiciousShare * 38
    + Math.min(10, lineCount) * 0.25;
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("ocr_line_image_load_failed"));
    image.src = src;
  });
}

function percentileFromHistogram(histogram: number[], total: number, fraction: number) {
  const target = total * fraction;
  let seen = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    seen += histogram[value];
    if (seen >= target) return value;
  }
  return histogram.length - 1;
}

function makeFocusedLineVariants(source: HTMLImageElement, region: OcrRegion) {
  if (typeof document === "undefined") return [] as string[];

  const scale = Math.min(2, Math.max(1.35, 1100 / Math.max(1, region.width)));
  const width = Math.max(1, Math.round(region.width * scale));
  const height = Math.max(1, Math.round(region.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  context.imageSmoothingEnabled = true;
  context.drawImage(
    source,
    region.left,
    region.top,
    region.width,
    region.height,
    0,
    0,
    width,
    height,
  );

  const original = context.getImageData(0, 0, width, height);
  const histogram = Array.from({ length: 256 }, () => 0);
  let total = 0;

  for (let index = 0; index < original.data.length; index += 4) {
    const grey = Math.round(
      original.data[index] * 0.299
      + original.data[index + 1] * 0.587
      + original.data[index + 2] * 0.114,
    );
    histogram[grey] += 1;
    total += 1;
  }

  const low = percentileFromHistogram(histogram, total, 0.06);
  const high = Math.max(low + 28, percentileFromHistogram(histogram, total, 0.94));
  const stretched = new ImageData(new Uint8ClampedArray(original.data), width, height);
  const binary = new ImageData(new Uint8ClampedArray(original.data), width, height);
  const threshold = low + (high - low) * 0.55;

  for (let index = 0; index < original.data.length; index += 4) {
    const grey = Math.round(
      original.data[index] * 0.299
      + original.data[index + 1] * 0.587
      + original.data[index + 2] * 0.114,
    );
    const normalised = Math.max(0, Math.min(255, Math.round(((grey - low) / (high - low)) * 255)));

    stretched.data[index] = normalised;
    stretched.data[index + 1] = normalised;
    stretched.data[index + 2] = normalised;

    const bit = grey <= threshold ? 0 : 255;
    binary.data[index] = bit;
    binary.data[index + 1] = bit;
    binary.data[index + 2] = bit;
  }

  context.putImageData(stretched, 0, 0);
  const contrast = canvas.toDataURL("image/png");
  context.putImageData(binary, 0, 0);
  const thresholded = canvas.toDataURL("image/png");

  return [contrast, thresholded];
}

function lineCandidateScore(text: string, confidence: number) {
  const suspiciousShare = sentenceTextSuspiciousWordShare(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return confidence - suspiciousShare * 72 - (wordCount < 2 ? 10 : 0);
}

function attachToPrimaryLines(words: OcrWord[], primaryWords: OcrWord[]) {
  return words.flatMap((word) => {
    const anchor = nearestLineAnchor(word, primaryWords);
    if (!anchor) return [];
    return [{
      ...word,
      lineText: anchor.lineText,
      lineId: anchor.lineId,
      paragraphId: anchor.paragraphId,
      readingOrder: anchor.readingOrder,
    }];
  });
}

function expandBox(box: OcrBox, width: number, height: number): OcrRegion {
  const marginX = Math.max(8, (box.x1 - box.x0) * 0.035);
  const marginY = Math.max(6, (box.y1 - box.y0) * 0.4);
  const left = Math.max(0, box.x0 - marginX);
  const top = Math.max(0, box.y0 - marginY);
  const right = Math.min(width, box.x1 + marginX);
  const bottom = Math.min(height, box.y1 + marginY);
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  };
}

function qualityRank(quality: OcrSentenceQuality) {
  if (quality === "good") return 2;
  if (quality === "check") return 1;
  return 0;
}

function cleanedLine(text: string | undefined) {
  return text
    ?.replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    ?? "";
}

async function refineWeakSentences(
  worker: Worker,
  image: string,
  sentences: OcrSentence[],
  width: number,
  height: number,
) {
  const { PSM } = await import("tesseract.js");
  const targets = sentences
    .map((sentence, index) => ({ sentence, index }))
    .filter(({ sentence }) =>
      sentence.quality === "blocked"
      || (sentence.quality === "check" && sentence.confidence < 58),
    )
    .sort((a, b) => qualityRank(a.sentence.quality) - qualityRank(b.sentence.quality) || a.sentence.confidence - b.sentence.confidence)
    .slice(0, 4);

  if (!targets.length) return sentences;

  const refined = sentences.map((sentence) => ({ ...sentence }));
  let browserImage: HTMLImageElement | null = null;
  if (typeof document !== "undefined") {
    try {
      browserImage = await loadBrowserImage(image);
    } catch {
      browserImage = null;
    }
  }

  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });

  try {
    for (const { sentence, index } of targets) {
      const readings: Array<{ text: string; confidence: number }> = [];

      for (const bound of sentence.bounds.slice(0, 4)) {
        try {
          const region = expandBox(bound, width, height);
          const result = await worker.recognize(
            image,
            { rectangle: region },
            { text: true },
          );
          const firstText = cleanedLine(result.data.text);
          const firstConfidence = result.data.confidence ?? 0;
          const candidates: Array<{ text: string; confidence: number }> = [];

          if (firstText && (firstText.match(/[a-z]/gi)?.length ?? 0) >= 3) {
            candidates.push({ text: firstText, confidence: firstConfidence });
          }

          const needsAnotherLook = !firstText
            || firstConfidence < 76
            || sentenceTextSuspiciousWordShare(firstText) >= 0.07;

          if (browserImage && needsAnotherLook) {
            for (const variant of makeFocusedLineVariants(browserImage, region)) {
              try {
                const variantResult = await worker.recognize(variant, {}, { text: true });
                const variantText = cleanedLine(variantResult.data.text);
                if (!variantText || (variantText.match(/[a-z]/gi)?.length ?? 0) < 3) continue;
                candidates.push({
                  text: variantText,
                  confidence: variantResult.data.confidence ?? 0,
                });
              } catch {
                // A failed enhancement is only one candidate, never the whole scan.
              }
            }
          }

          const best = candidates.sort(
            (a, b) => lineCandidateScore(b.text, b.confidence) - lineCandidateScore(a.text, a.confidence),
          )[0];
          if (best) readings.push(best);
        } catch {
          // Keep the original sentence if a focused pass fails.
        }
      }

      if (!readings.length) continue;
      const text = readings.map((reading) => reading.text).join(" ").replace(/\s+/g, " ").trim();
      const confidence = readings.reduce((sum, reading) => sum + reading.confidence, 0) / readings.length;
      const suspiciousWordShare = sentenceTextSuspiciousWordShare(text);
      const weakWordShare = confidence >= 70 ? 0 : confidence >= 55 ? 0.12 : 0.36;
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const quality = classifySentenceQuality(confidence, weakWordShare, suspiciousWordShare, wordCount);
      const lengthRatio = sentence.text.length > 0 ? text.length / sentence.text.length : 1;
      const plausiblySameRegion = lengthRatio >= 0.45 && lengthRatio <= 1.75;
      const clearlyBetter = qualityRank(quality) > qualityRank(sentence.quality)
        || (quality === sentence.quality && confidence >= sentence.confidence + 8);

      if (!plausiblySameRegion || !clearlyBetter) continue;

      refined[index] = {
        ...sentence,
        text,
        confidence,
        weakWordShare,
        suspiciousWordShare,
        quality,
        uncertain: quality !== "good",
        refined: true,
      };
    }
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  }

  return refined;
}

export async function recognisePage(
  image: string,
  width: number,
  height: number,
  displayImage = image,
): Promise<OcrResult> {
  const worker = await getWorker();
  const { PSM } = await import("tesseract.js");
  const prepared = await prepareRecognitionImage(image, width, height, displayImage);
  const recognitionImage = prepared.image;

  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  let primaryResult = await worker.recognize(recognitionImage, {}, { text: true, blocks: true });
  let primaryPageResult = primaryResult as TesseractPageResult;
  let primaryWords = extractWords(primaryPageResult, "auto");
  let primaryTrusted = trustedPageWords(primaryWords);
  let recoveryDecision = decideSparseRecovery(primaryWords, primaryTrusted);

  if (recoveryDecision.run) {
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const proseResult = await worker.recognize(recognitionImage, {}, { text: true, blocks: true });
      const prosePageResult = proseResult as TesseractPageResult;
      const proseWords = extractWords(prosePageResult, "prose");

      if (pagePassScore(proseWords) >= pagePassScore(primaryWords) + 2.5) {
        primaryResult = proseResult;
        primaryPageResult = prosePageResult;
        primaryWords = proseWords;
        primaryTrusted = trustedPageWords(primaryWords);
        recoveryDecision = decideSparseRecovery(primaryWords, primaryTrusted);
      }
    } catch {
      // AUTO remains the baseline if the prose-layout pass is not helpful.
    } finally {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    }
  }

  let finalWords = primaryTrusted;
  let sentenceWords = primaryWords.filter((word) => keepPageWord(word));
  let sparsePass = false;

  if (recoveryDecision.run) {
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const sparseResult = await worker.recognize(recognitionImage, {}, { text: true, blocks: true });
      const sparseWords = extractWords(sparseResult as TesseractPageResult, "sparse");
      const sparseTrusted = attachToPrimaryLines(trustedPageWords(sparseWords), primaryWords);
      const sparseSentenceWords = attachToPrimaryLines(
        sparseWords.filter((word) => keepPageWord(word)),
        primaryWords,
      );
      finalWords = addVisualConsensus(
        mergeOcrWords(primaryTrusted, sparseTrusted),
        sparseTrusted,
        "ocr-auto+sparse",
      );
      sentenceWords = addVisualConsensus(
        mergeOcrWords(sentenceWords, sparseSentenceWords),
        sparseSentenceWords,
        "ocr-auto+sparse",
      );
      sparsePass = true;
    } catch {
      finalWords = primaryTrusted;
    } finally {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    }
  }

  const initialSentences = buildReadingSentences(sentenceWords);
  const sentences = await refineWeakSentences(
    worker,
    recognitionImage,
    initialSentences,
    prepared.width,
    prepared.height,
  );

  return {
    text: primaryPageResult.data.text ?? "",
    words: finalWords,
    readingWords: sentenceWords,
    sentences,
    image: prepared.displayImage,
    ocrImage: prepared.image,
    width: prepared.width,
    height: prepared.height,
    recovery: {
      sparsePass,
      reason: recoveryDecision.reason,
      primaryTrustedWords: primaryTrusted.length,
      finalTrustedWords: finalWords.length,
      deskew: prepared.deskew,
      pageIsolation: {
        applied: prepared.pageCrop.applied,
        confidence: prepared.pageCrop.confidence,
        crop: prepared.pageCrop.box,
        perspectiveApplied: prepared.perspective.applied,
      },
    },
  };
}

export async function recogniseWordRegion(image: string, region: OcrRegion): Promise<string | null> {
  const worker = await getWorker();
  const { PSM } = await import("tesseract.js");

  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_WORD });
  try {
    const result = await worker.recognize(
      image,
      { rectangle: region },
      { text: true },
    );
    const candidate = result.data.text
      ?.replace(/\s+/g, " ")
      .trim()
      .split(" ")[0]
      ?.replace(/^[^a-z'-]+|[^a-z'-]+$/gi, "");

    if (!candidate || !/[a-z]/i.test(candidate)) return null;
    if (!focusedWordIsUsable(result.data.confidence ?? 0)) return null;
    return candidate;
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  }
}
