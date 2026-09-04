import { alignGraphemesToPhonemes } from "@/lib/literacy/grapheme-phoneme";

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
};

const SOUND_PATTERNS: Array<{ pattern: string; note: string }> = [
  { pattern: "tion", note: "often sounds like ‘shun’" },
  { pattern: "sion", note: "often sounds like ‘zhun’ or ‘shun’" },
  { pattern: "ture", note: "often sounds like ‘cher’" },
  { pattern: "ough", note: "can make several different sounds — hearing the whole word helps" },
  { pattern: "eigh", note: "often makes a long ‘a’ sound" },
  { pattern: "igh", note: "usually makes the long ‘i’ sound" },
  { pattern: "ph", note: "usually sounds like ‘f’" },
  { pattern: "dge", note: "usually makes the ‘j’ sound" },
  { pattern: "tch", note: "usually makes the ‘ch’ sound" },
  { pattern: "sh", note: "makes one ‘sh’ sound" },
  { pattern: "ch", note: "often makes one ‘ch’ sound" },
  { pattern: "th", note: "the two letters work together for one sound" },
  { pattern: "wh", note: "the two letters usually work together at the start" },
  { pattern: "ng", note: "makes the sound at the end of ‘sing’" },
  { pattern: "ck", note: "usually makes one ‘k’ sound" },
  { pattern: "ee", note: "often makes a long ‘ee’ sound" },
  { pattern: "ea", note: "often makes a long ‘ee’ sound, but not always" },
  { pattern: "ai", note: "often makes a long ‘a’ sound" },
  { pattern: "ay", note: "often makes a long ‘a’ sound" },
  { pattern: "oa", note: "often makes a long ‘o’ sound" },
  { pattern: "oo", note: "the two letters work together; the sound can change between words" },
  { pattern: "oi", note: "usually makes the sound in ‘coin’" },
  { pattern: "oy", note: "usually makes the sound in ‘boy’" },
  { pattern: "ar", note: "often makes the sound in ‘car’" },
  { pattern: "or", note: "often makes the sound in ‘fork’" },
  { pattern: "ir", note: "often makes the sound in ‘bird’" },
  { pattern: "ur", note: "often makes the sound in ‘turn’" },
];

function uniqueFeatures(word: string) {
  const found: SoundFeature[] = [];
  const occupied = new Set<number>();

  for (const item of SOUND_PATTERNS) {
    let start = word.indexOf(item.pattern);
    while (start >= 0) {
      const positions = Array.from({ length: item.pattern.length }, (_, offset) => start + offset);
      if (!positions.some((position) => occupied.has(position))) {
        found.push({ letters: item.pattern, note: item.note });
        positions.forEach((position) => occupied.add(position));
      }
      start = word.indexOf(item.pattern, start + 1);
    }
  }

  return found.slice(0, 3);
}

export function analyseWordSounds(
  word: string,
  syllables?: number | null,
  ipa?: string | null,
): SoundGuide {
  const cleanWord = word.toLocaleLowerCase("en-GB");
  const cleanIpa = ipa?.trim() || null;
  const alignment = cleanIpa ? alignGraphemesToPhonemes(cleanWord, cleanIpa) : null;

  if (cleanIpa && alignment) {
    const features = alignment.segments
      .filter((segment) => segment.note && (segment.letters.length > 1 || segment.phonemes.length > 1))
      .map((segment) => ({ letters: segment.letters, note: segment.note! }))
      .filter((feature, index, all) => all.findIndex((item) => item.letters === feature.letters && item.note === feature.note) === index)
      .slice(0, 3);

    return {
      syllables: typeof syllables === "number" && syllables > 0 ? syllables : null,
      ipa: cleanIpa,
      features,
      guidance: features.length
        ? "These letter patterns match the pronunciation of this word."
        : "The letters and sounds in this word match up fairly neatly.",
      alignment: alignment.confidence,
    };
  }

  if (cleanIpa && !alignment) {
    return {
      syllables: typeof syllables === "number" && syllables > 0 ? syllables : null,
      ipa: cleanIpa,
      features: [],
      guidance: "This spelling does not fit Buddy's simple sound rules neatly. Hearing the whole word is more useful here.",
      alignment: "irregular",
    };
  }

  const features = uniqueFeatures(cleanWord);
  let guidance = "Hear the whole word first, then look at the letters from left to right.";
  if (features.length === 1) {
    guidance = `There’s one useful letter pattern to notice: ‘${features[0].letters}’.`;
  } else if (features.length > 1) {
    guidance = "There are a few possible letter patterns to notice. Hearing the word will help check them.";
  }

  return {
    syllables: typeof syllables === "number" && syllables > 0 ? syllables : null,
    ipa: null,
    features,
    guidance,
    alignment: "spelling-only",
  };
}
