import type { Worker } from "tesseract.js";
import { focusedWordIsUsable, shouldBoxPageWord } from "@/lib/ocr/confidence";
import type { OcrResult, OcrWord } from "@/lib/ocr/types";

type TesseractWord = {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

type TesseractLine = { words?: TesseractWord[]; text?: string };
type TesseractParagraph = { lines?: TesseractLine[] };
type TesseractBlock = { paragraphs?: TesseractParagraph[] };

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

export async function recognisePage(
  image: string,
  width: number,
  height: number,
): Promise<OcrResult> {
  const worker = await getWorker();
  const result = await worker.recognize(image, {}, { text: true, blocks: true });
  const blocks = (result.data.blocks ?? []) as TesseractBlock[];
  const words: OcrWord[] = [];

  blocks.forEach((block, blockIndex) => {
    block.paragraphs?.forEach((paragraph, paragraphIndex) => {
      paragraph.lines?.forEach((line, lineIndex) => {
        const lineText = line.text?.replace(/\s+/g, " ").trim();
        line.words?.forEach((word, wordIndex) => {
          const text = word.text?.trim();
          if (!text || !word.bbox) return;
          const confidence = word.confidence ?? 0;

          // Only medium/high-confidence page OCR becomes a direct tappable box.
          // Lower-confidence text remains visible in the photographed page and
          // the existing unboxed-tap path performs a focused second OCR pass.
          if (!shouldBoxPageWord({ text, confidence })) return;

          words.push({
            id: `${blockIndex}-${paragraphIndex}-${lineIndex}-${wordIndex}`,
            text,
            confidence,
            bbox: word.bbox,
            lineText: lineText || undefined,
          });
        });
      });
    });
  });

  return {
    text: result.data.text ?? "",
    words,
    width,
    height,
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
