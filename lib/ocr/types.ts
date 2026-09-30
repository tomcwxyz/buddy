import type { ReadingEvidence, ReadingEvidenceSource } from "@/lib/reading/evidence";

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
  paragraphId?: string;
  lineId?: string;
  readingOrder?: number;
  evidence?: ReadingEvidence[];
  resolvedBy?: ReadingEvidenceSource;
};

export type OcrSentenceQuality = "good" | "check" | "blocked";

export type OcrSentence = {
  id: string;
  text: string;
  wordIds: string[];
  bounds: OcrBox[];
  confidence: number;
  weakWordShare: number;
  suspiciousWordShare: number;
  uncertain: boolean;
  quality: OcrSentenceQuality;
  refined?: boolean;
  paragraphId?: string;
};

export type OcrDeskewMetadata = {
  applied: boolean;
  angle: number;
  candidateAngle: number;
  confidence: number;
};

export type OcrPageIsolationMetadata = {
  applied: boolean;
  confidence: number;
  crop: OcrBox;
  perspectiveApplied: boolean;
};

export type OcrRecoveryMetadata = {
  sparsePass: boolean;
  reason: "few-trusted-words" | "too-many-weak-words" | "healthy";
  primaryTrustedWords: number;
  finalTrustedWords: number;
  deskew: OcrDeskewMetadata;
  pageIsolation: OcrPageIsolationMetadata;
};

export type OcrResult = {
  text: string;
  words: OcrWord[];
  sentences: OcrSentence[];
  image: string;
  ocrImage: string;
  width: number;
  height: number;
  recovery: OcrRecoveryMetadata;
};
