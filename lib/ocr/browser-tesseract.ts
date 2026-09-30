import type { Worker } from "tesseract.js";
import { prepareRecognitionImage } from "@/lib/ocr/browser-preprocess";
import { focusedWordIsUsable, keepPageWord, shouldBoxPageWord } from "@/lib/ocr/confidence";
import {
  decideSparseRecovery,
  mergeOcrWords,
  nearestLineAnchor,
} from "@/lib/ocr/recovery";
import type { OcrBox, OcrResult, OcrSentence, OcrSentenceQuality, OcrWord } from "@/lib/ocr/types";
import {
  buildReadingSentences,
  classifySentenceQuality,
  sentenceTextSuspiciousWordShare,
} from "@/lib/reading/guided-reading";

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
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });

  try {
    for (const { sentence, index } of targets) {
      const readings: Array<{ text: string; confidence: number }> = [];

      for (const bound of sentence.bounds.slice(0, 4)) {
        try {
          const result = await worker.recognize(
            image,
            { rectangle: expandBox(bound, width, height) },
            { text: true },
          );
          const text = cleanedLine(result.data.text);
          if (!text || (text.match(/[a-z]/gi)?.length ?? 0) < 3) continue;
          readings.push({ text, confidence: result.data.confidence ?? 0 });
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
  const primaryResult = await worker.recognize(recognitionImage, {}, { text: true, blocks: true });
  const primaryWords = extractWords(primaryResult as TesseractPageResult, "auto");
  const primaryTrusted = trustedPageWords(primaryWords);
  const recoveryDecision = decideSparseRecovery(primaryWords, primaryTrusted);

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
      finalWords = mergeOcrWords(primaryTrusted, sparseTrusted);
      sentenceWords = mergeOcrWords(sentenceWords, sparseSentenceWords);
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
    text: primaryResult.data.text ?? "",
    words: finalWords,
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
