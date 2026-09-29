import type { HelpDepth } from "@/lib/literacy/engine";

export type LearningEventKind =
  | "word_selected"
  | "help_depth_changed"
  | "word_heard"
  | "line_heard"
  | "meaning_requested"
  | "voice_request"
  | "moved_on"
  | "practice_seen"
  | "practice_known"
  | "practice_explored"
  | "discover_started"
  | "discover_changed"
  | "discover_reflected";

export type LearningEvent = {
  id: string;
  at: string;
  kind: LearningEventKind;
  word?: string;
  helpDepth?: HelpDepth;
  transcript?: string;
  source?: "ocr" | "demo" | "practice" | "discover";
  activityId?: string;
  detail?: string;
  practiceSetId?: string;
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
