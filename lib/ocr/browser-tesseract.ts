import type { Worker } from "tesseract.js";
import { focusedWordIsUsable, shouldBoxPageWord } from "@/lib/ocr/confidence";
import {
  decideSparseRecovery,
  mergeOcrWords,
  nearestLineText,
} from "@/lib/ocr/recovery";
import type { OcrResult, OcrWord } from "@/lib/ocr/types";

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

  blocks.forEach((block, blockIndex) => {
    block.paragraphs?.forEach((paragraph, paragraphIndex) => {
      paragraph.lines?.forEach((line, lineIndex) => {
        const lineText = line.text?.replace(/\s+/g, " ").trim();
        line.words?.forEach((word, wordIndex) => {
          const text = word.text?.trim();
          if (!text || !word.bbox || !/[a-z]/i.test(text)) return;
          words.push({
            id: `${idPrefix}-${blockIndex}-${paragraphIndex}-${lineIndex}-${wordIndex}`,
            text,
            confidence: word.confidence ?? 0,
            bbox: word.bbox,
            lineText: lineText || undefined,
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

function addPrimaryLineContext(words: OcrWord[], primaryWords: OcrWord[]) {
  return words.map((word) => {
    const inherited = nearestLineText(word, primaryWords);
    if (!inherited) return word;
    return {
      ...word,
      lineText: inherited,
    };
  });
}

export async function recognisePage(
  image: string,
  width: number,
  height: number,
): Promise<OcrResult> {
  const worker = await getWorker();
  const { PSM } = await import("tesseract.js");

  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  const primaryResult = await worker.recognize(image, {}, { text: true, blocks: true });
  const primaryWords = extractWords(primaryResult as TesseractPageResult, "auto");
  const primaryTrusted = trustedPageWords(primaryWords);
  const recoveryDecision = decideSparseRecovery(primaryWords, primaryTrusted);

  let finalWords = primaryTrusted;
  let sparsePass = false;

  if (recoveryDecision.run) {
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const sparseResult = await worker.recognize(image, {}, { text: true, blocks: true });
      const sparseWords = extractWords(sparseResult as TesseractPageResult, "sparse");
      const sparseTrusted = addPrimaryLineContext(trustedPageWords(sparseWords), primaryWords);
      finalWords = mergeOcrWords(primaryTrusted, sparseTrusted);
      sparsePass = true;
    } catch {
      // The AUTO result is already useful. A failed recovery pass should not
      // turn a readable page into an OCR error for the child.
      finalWords = primaryTrusted;
    } finally {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    }
  }

  return {
    text: primaryResult.data.text ?? "",
    words: finalWords,
    width,
    height,
    recovery: {
      sparsePass,
      reason: recoveryDecision.reason,
      primaryTrustedWords: primaryTrusted.length,
      finalTrustedWords: finalWords.length,
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
