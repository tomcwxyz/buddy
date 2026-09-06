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

export type OcrDeskewMetadata = {
  applied: boolean;
  angle: number;
  candidateAngle: number;
  confidence: number;
};

export type OcrRecoveryMetadata = {
  sparsePass: boolean;
  reason: "few-trusted-words" | "too-many-weak-words" | "healthy";
  primaryTrustedWords: number;
  finalTrustedWords: number;
  deskew: OcrDeskewMetadata;
};

export type OcrResult = {
  text: string;
  words: OcrWord[];
  width: number;
  height: number;
  recovery: OcrRecoveryMetadata;
};
