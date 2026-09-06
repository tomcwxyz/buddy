export type OcrBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type OcrWord = {
  id: string;
  text: string;
  confidence: number;
  bbox: OcrBox;
  lineText?: string;
};

export type OcrRecoveryMetadata = {
  sparsePass: boolean;
  reason: "few-trusted-words" | "too-many-weak-words" | "healthy";
  primaryTrustedWords: number;
  finalTrustedWords: number;
};

export type OcrResult = {
  text: string;
  words: OcrWord[];
  width: number;
  height: number;
  recovery: OcrRecoveryMetadata;
};
