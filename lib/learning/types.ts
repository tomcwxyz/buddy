import type { HelpDepth } from "@/lib/literacy/engine";

export type LearningEventKind =
  | "word_selected"
  | "help_depth_changed"
  | "word_heard"
  | "meaning_requested"
  | "voice_request"
  | "moved_on";

export type LearningEvent = {
  id: string;
  at: string;
  kind: LearningEventKind;
  word?: string;
  helpDepth?: HelpDepth;
  transcript?: string;
  source?: "ocr" | "demo";
};

export type RememberedWord = {
  word: string;
  firstSeen: string;
  lastSeen: string;
  encounters: number;
  heardCount: number;
  meaningCount: number;
  helpDepths: HelpDepth[];
};
