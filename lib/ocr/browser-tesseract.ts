import type { Worker } from "tesseract.js";
import type { OcrResult, OcrWord } from "@/lib/ocr/types";

type TesseractWord = {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

type TesseractLine = { words?: TesseractWord[] };
type TesseractParagraph = { lines?: TesseractLine[] };
type TesseractBlock = { paragraphs?: TesseractParagraph[] };

let workerPromise: Promise<Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) => createWorker("eng"));
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
        line.words?.forEach((word, wordIndex) => {
          const text = word.text?.trim();
          if (!text || !word.bbox) return;
          words.push({
            id: `${blockIndex}-${paragraphIndex}-${lineIndex}-${wordIndex}`,
            text,
            confidence: word.confidence ?? 0,
            bbox: word.bbox,
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
