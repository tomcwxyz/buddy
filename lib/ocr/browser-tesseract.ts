import type { Worker } from "tesseract.js";
import type { FocusedOcrWord, OcrResult, OcrWord } from "@/lib/ocr/types";

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
          if (!text || !word.bbox || !/[a-z]/i.test(text)) return;
          words.push({
            id: `${blockIndex}-${paragraphIndex}-${lineIndex}-${wordIndex}`,
            text,
            confidence: word.confidence ?? 0,
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

export async function recogniseWordRegion(
  image: string,
  region: OcrRegion,
): Promise<FocusedOcrWord | null> {
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
    return {
      text: candidate,
      confidence: result.data.confidence ?? 0,
    };
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  }
}
