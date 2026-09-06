import { alignGraphemesToPhonemes } from "@/lib/literacy/grapheme-phoneme";
import {
  reviewSoundAlignment,
  reviewedSoundNote,
  type SoundReviewStatus,
} from "@/lib/literacy/sound-review";

export type SoundFeature = {
  letters: string;
  note: string;
};

export type SoundGuide = {
  syllables: number | null;
  ipa: string | null;
  features: SoundFeature[];
  guidance: string;
  alignment: "high" | "medium" | "irregular" | "spelling-only";
  review: SoundReviewStatus;
};

function syllableCount(value?: number | null) {
  return typeof value === "number" && value > 0 ? value : null;
}

/**
 * Build a child-facing sound guide from an already resolved pronunciation.
 *
 * The grapheme aligner is intentionally broader than the teaching layer: it
 * can account for many English spelling/pronunciation combinations, but Buddy
 * only surfaces a sound clue when every segment in that alignment is in the
 * reviewed explanation set. This stops a technically possible alignment from
 * quietly becoming an unreviewed phonics rule.
 */
export function analyseWordSounds(
  word: string,
  syllables?: number | null,
  ipa?: string | null,
): SoundGuide {
  const cleanWord = word.toLocaleLowerCase("en-GB");
  const cleanIpa = ipa?.trim() || null;
  const count = syllableCount(syllables);

  if (!cleanIpa) {
    return {
      syllables: count,
      ipa: null,
      features: [],
      guidance: "Hear the word first. Buddy needs a trusted pronunciation before using the spelling as a sound clue.",
      alignment: "spelling-only",
      review: "do-not-infer",
    };
  }

  const alignment = alignGraphemesToPhonemes(cleanWord, cleanIpa);
  if (!alignment) {
    return {
      syllables: count,
      ipa: cleanIpa,
      features: [],
      guidance: "This spelling does not fit Buddy's simple sound rules neatly. Hearing the whole word is more useful here.",
      alignment: "irregular",
      review: "irregular",
    };
  }

  const review = reviewSoundAlignment(alignment.segments);
  if (review.status !== "safe-to-explain") {
    return {
      syllables: count,
      ipa: cleanIpa,
      features: [],
      guidance: "Buddy knows how this word is pronounced, but isn't going to turn this spelling into a sound rule yet. Hearing the whole word is safer.",
      alignment: alignment.confidence,
      review: "do-not-infer",
    };
  }

  const features = alignment.segments
    .map((segment) => ({ segment, note: reviewedSoundNote(segment) }))
    .filter((item): item is { segment: typeof item.segment; note: string } => Boolean(item.note))
    .map(({ segment, note }) => ({ letters: segment.letters, note }))
    .filter(
      (feature, index, all) =>
        all.findIndex((item) => item.letters === feature.letters && item.note === feature.note) === index,
    )
    .slice(0, 3);

  return {
    syllables: count,
    ipa: cleanIpa,
    features,
    guidance: features.length
      ? "These letter–sound clues are in Buddy's reviewed set and match this pronunciation."
      : "The spelling and pronunciation use letter–sound links Buddy has reviewed.",
    alignment: alignment.confidence,
    review: "safe-to-explain",
  };
}
