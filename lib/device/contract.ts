import type { HelpDepth } from "@/lib/literacy/engine";

export type BuddyPresenceState = "idle" | "listening" | "thinking" | "speaking";

export type BuddyDeviceKind = "web" | "phone" | "tablet" | "r1" | "android-tactile" | "unknown";

export type BuddyInputEvent =
  | {
      type: "word_selected";
      device: BuddyDeviceKind;
      word: string;
      source: "vision" | "touch" | "demo";
    }
  | {
      type: "voice";
      device: BuddyDeviceKind;
      transcript: string;
    }
  | {
      type: "help_depth";
      device: BuddyDeviceKind;
      depth: HelpDepth;
    }
  | {
      type: "button";
      device: BuddyDeviceKind;
      action: "talk" | "look" | "stop" | "got_it";
    }
  | {
      type: "vision_frame";
      device: BuddyDeviceKind;
      frameId: string;
    };

export type BuddyDisplay = {
  primary?: string;
  secondary?: string;
  actions?: Array<{ id: string; label: string }>;
  accent?: "read" | "practice" | "discover" | "do";
};

export type BuddyOutput = {
  presence: BuddyPresenceState;
  speech?: string;
  display?: BuddyDisplay;
  haptic?: "light" | "confirm";
  learningEventId?: string;
};

/**
 * Surface adapters translate physical/device-specific input into BuddyInputEvent
 * and render BuddyOutput in whatever form that surface supports.
 *
 * They should not own the learning model, literacy rules or companion personality.
 */
export interface BuddySurfaceAdapter {
  readonly kind: BuddyDeviceKind;
  emit(event: BuddyInputEvent): Promise<BuddyOutput>;
  render(output: BuddyOutput): void | Promise<void>;
}
