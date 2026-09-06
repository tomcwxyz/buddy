export type SoundReviewStatus = "safe-to-explain" | "irregular" | "do-not-infer";

export type ReviewableSoundSegment = {
  letters: string;
  phonemes: string;
};

export type SoundReviewResult = {
  status: Exclude<SoundReviewStatus, "irregular">;
  reviewedSegments: ReviewableSoundSegment[];
  unreviewedSegments: ReviewableSoundSegment[];
};

type ReviewedGpc = {
  phonemes: string[];
  note?: Record<string, string>;
};

function normalisePhonemes(value: string) {
  return value.replace(/ɡ/g, "g").replace(/\s+/g, "").trim();
}

/**
 * Buddy's first child-facing sound-review set.
 *
 * This is deliberately a conservative explanation whitelist, not a phonics
 * teaching sequence. It is seeded from simple correspondences and examples in
 * DfE Letters and Sounds Phases Two/Three. A school or family may use a
 * different validated SSP progression, so being on this list only means the
 * spelling/pronunciation pair is safe for Buddy to describe once the word's
 * pronunciation has already been resolved from lexical evidence.
 */
const REVIEWED_GPCS: Record<string, ReviewedGpc> = {
  // Simple Phase Two-style correspondences.
  s: { phonemes: ["s"] },
  a: { phonemes: ["æ"] },
  t: { phonemes: ["t"] },
  p: { phonemes: ["p"] },
  i: { phonemes: ["ɪ"] },
  n: { phonemes: ["n"] },
  m: { phonemes: ["m"] },
  d: { phonemes: ["d"] },
  g: { phonemes: ["g"] },
  o: { phonemes: ["ɒ"] },
  c: { phonemes: ["k"] },
  k: { phonemes: ["k"] },
  e: { phonemes: ["e", "ɛ"] },
  u: { phonemes: ["ʌ"] },
  r: { phonemes: ["r", "ɹ"] },
  h: { phonemes: ["h"] },
  b: { phonemes: ["b"] },
  f: { phonemes: ["f"] },
  l: { phonemes: ["l", "ɫ"] },

  // Common doubled spellings taught as one sound.
  ff: {
    phonemes: ["f"],
    note: { f: "the two ‘f’ letters spell one ‘f’ sound here" },
  },
  ll: {
    phonemes: ["l", "ɫ"],
    note: {
      l: "the two ‘l’ letters spell one ‘l’ sound here",
      "ɫ": "the two ‘l’ letters spell one ‘l’ sound here",
    },
  },
  ss: {
    phonemes: ["s"],
    note: { s: "the two ‘s’ letters spell one ‘s’ sound here" },
  },

  // Phase Three consonant additions and digraphs.
  j: { phonemes: ["dʒ"] },
  v: { phonemes: ["v"] },
  w: { phonemes: ["w"] },
  x: { phonemes: ["ks"] },
  y: { phonemes: ["j"] },
  z: { phonemes: ["z"] },
  zz: {
    phonemes: ["z"],
    note: { z: "the two ‘z’ letters spell one ‘z’ sound here" },
  },
  qu: {
    phonemes: ["kw"],
    note: { kw: "‘qu’ spells the ‘k-w’ sounds here" },
  },
  ch: {
    phonemes: ["tʃ"],
    note: { "tʃ": "‘ch’ spells the ‘ch’ sound here" },
  },
  sh: {
    phonemes: ["ʃ"],
    note: { "ʃ": "‘sh’ spells the ‘sh’ sound here" },
  },
  th: {
    phonemes: ["θ", "ð"],
    note: {
      "θ": "‘th’ spells the quiet ‘th’ sound here, like in ‘thin’",
      "ð": "‘th’ spells the voiced ‘th’ sound here, like in ‘this’",
    },
  },
  ng: {
    phonemes: ["ŋ"],
    note: { "ŋ": "‘ng’ spells the sound at the end of ‘sing’ here" },
  },

  // Phase Three vowel graphemes. Where Britfone uses an equivalent modern
  // British IPA symbol, both forms are accepted for the same reviewed sound.
  ai: {
    phonemes: ["eɪ"],
    note: { "eɪ": "‘ai’ spells the long ‘a’ sound here" },
  },
  ee: {
    phonemes: ["iː"],
    note: { "iː": "‘ee’ spells the long ‘ee’ sound here" },
  },
  igh: {
    phonemes: ["aɪ"],
    note: { "aɪ": "‘igh’ spells the long ‘i’ sound here" },
  },
  oa: {
    phonemes: ["əʊ", "oʊ"],
    note: {
      "əʊ": "‘oa’ spells the long ‘o’ sound here",
      "oʊ": "‘oa’ spells the long ‘o’ sound here",
    },
  },
  oo: {
    phonemes: ["uː", "ʊ"],
    note: {
      "uː": "‘oo’ spells the longer ‘oo’ sound here, like in ‘boot’",
      "ʊ": "‘oo’ spells the shorter ‘oo’ sound here, like in ‘look’",
    },
  },
  ar: {
    phonemes: ["ɑː"],
    note: { "ɑː": "‘ar’ spells the vowel sound in ‘car’ here" },
  },
  or: {
    phonemes: ["ɔː"],
    note: { "ɔː": "‘or’ spells the vowel sound in ‘fork’ here" },
  },
  ur: {
    phonemes: ["ɜː"],
    note: { "ɜː": "‘ur’ spells the vowel sound in ‘turn’ here" },
  },
  ow: {
    phonemes: ["aʊ"],
    note: { "aʊ": "‘ow’ spells the sound in ‘cow’ here" },
  },
  oi: {
    phonemes: ["ɔɪ"],
    note: { "ɔɪ": "‘oi’ spells the sound in ‘coin’ here" },
  },
  ear: {
    phonemes: ["ɪə"],
    note: { "ɪə": "‘ear’ spells the vowel sound in ‘dear’ here" },
  },
  air: {
    phonemes: ["eə", "ɛə"],
    note: {
      "eə": "‘air’ spells the vowel sound in ‘fair’ here",
      "ɛə": "‘air’ spells the vowel sound in ‘fair’ here",
    },
  },
  er: {
    phonemes: ["ə"],
    note: { "ə": "‘er’ spells the light ending sound here" },
  },
};

export function reviewedSoundNote(segment: ReviewableSoundSegment) {
  const letters = segment.letters.toLocaleLowerCase("en-GB");
  const phonemes = normalisePhonemes(segment.phonemes);
  const item = REVIEWED_GPCS[letters];
  if (!item || !item.phonemes.includes(phonemes)) return null;
  return item.note?.[phonemes] ?? null;
}

export function isReviewedSoundSegment(segment: ReviewableSoundSegment) {
  const letters = segment.letters.toLocaleLowerCase("en-GB");
  const phonemes = normalisePhonemes(segment.phonemes);
  const item = REVIEWED_GPCS[letters];
  return Boolean(item?.phonemes.includes(phonemes));
}

export function reviewSoundAlignment(segments: ReviewableSoundSegment[]): SoundReviewResult {
  const reviewedSegments: ReviewableSoundSegment[] = [];
  const unreviewedSegments: ReviewableSoundSegment[] = [];

  for (const segment of segments) {
    if (isReviewedSoundSegment(segment)) reviewedSegments.push(segment);
    else unreviewedSegments.push(segment);
  }

  return {
    status: unreviewedSegments.length === 0 ? "safe-to-explain" : "do-not-infer",
    reviewedSegments,
    unreviewedSegments,
  };
}
