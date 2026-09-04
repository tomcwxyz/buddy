export type GraphemePhonemeSegment = {
  letters: string;
  phonemes: string;
  note: string | null;
};

export type GraphemePhonemeAlignment = {
  segments: GraphemePhonemeSegment[];
  confidence: "high" | "medium";
};

const MULTI_PHONEMES = [
  "tʃ", "dʒ", "eɪ", "aɪ", "ɔɪ", "aʊ", "əʊ", "oʊ", "ɪə", "eə", "ɛə", "ʊə",
  "iː", "uː", "ɑː", "ɔː", "ɜː",
];

const PHONEME_NOTES: Record<string, string> = {
  "f": "makes an ‘f’ sound",
  "v": "makes a ‘v’ sound",
  "ʃ": "makes the ‘sh’ sound",
  "ʒ": "makes the sound in the middle of ‘vision’",
  "tʃ": "makes the ‘ch’ sound",
  "dʒ": "makes the ‘j’ sound",
  "θ": "makes the quiet ‘th’ sound, like in ‘thin’",
  "ð": "makes the voiced ‘th’ sound, like in ‘this’",
  "ŋ": "makes the sound at the end of ‘sing’",
  "eɪ": "makes the long ‘a’ sound",
  "aɪ": "makes the long ‘i’ sound",
  "iː": "makes the long ‘ee’ sound",
  "əʊ": "makes the long ‘o’ sound",
  "oʊ": "makes the long ‘o’ sound",
  "uː": "makes the long ‘oo’ sound",
  "ɔɪ": "makes the sound in ‘coin’",
  "aʊ": "makes the sound in ‘cow’",
  "ɑː": "makes the vowel sound in ‘car’",
  "ɔː": "makes the vowel sound in ‘fork’",
  "ɜː": "makes the vowel sound in ‘bird’",
};

const GRAPHEME_MAP: Record<string, string[]> = {
  tion: ["ʃ ə n", "ʃ n"],
  sion: ["ʒ ə n", "ʃ ə n", "ʒ n", "ʃ n"],
  cian: ["ʃ ə n", "ʃ n"],
  ture: ["tʃ ə", "tʃ ɚ"],
  eigh: ["eɪ"],
  igh: ["aɪ"],
  ough: ["uː", "əʊ", "oʊ", "ʌ f", "ɒ f", "ɔː", "aʊ", "ə"],
  dge: ["dʒ"],
  tch: ["tʃ"],
  kn: ["n"],
  wr: ["r", "ɹ"],
  mb: ["m"],
  gn: ["n"],
  ph: ["f"],
  sh: ["ʃ"],
  ch: ["tʃ", "k", "ʃ"],
  th: ["θ", "ð"],
  ng: ["ŋ", "ŋ ɡ"],
  qu: ["k w", "k"],
  ck: ["k"],
  wh: ["w"],
  gh: ["", "f", "ɡ"],
  ee: ["iː", "i"],
  ea: ["iː", "e", "ɛ"],
  ai: ["eɪ", "e"],
  ay: ["eɪ", "i"],
  oa: ["əʊ", "oʊ", "ɔː"],
  oo: ["uː", "ʊ"],
  ou: ["aʊ", "ʌ", "uː", "ʊ", "ə"],
  ow: ["aʊ", "əʊ", "oʊ"],
  oi: ["ɔɪ"],
  oy: ["ɔɪ"],
  ar: ["ɑː", "ɑ r", "ɑ ɹ"],
  or: ["ɔː", "ɔ r", "ɔ ɹ", "ə"],
  er: ["ɜː", "ə", "ɚ", "ɝ", "ə r", "ə ɹ"],
  ir: ["ɜː", "ɝ", "ɜ r", "ɜ ɹ"],
  ur: ["ɜː", "ɝ", "ɜ r", "ɜ ɹ"],
  a: ["æ", "eɪ", "ə", "ɑː", "ɒ", "ɔː", "ɐ", "ʌ", "e"],
  b: ["b"],
  c: ["k", "s"],
  d: ["d"],
  e: ["e", "ɛ", "iː", "ɪ", "ə"],
  f: ["f"],
  g: ["ɡ", "g", "dʒ", "ʒ"],
  h: ["h"],
  i: ["ɪ", "aɪ", "iː", "i", "ə"],
  j: ["dʒ"],
  k: ["k"],
  l: ["l", "ɫ"],
  m: ["m"],
  n: ["n", "ŋ"],
  o: ["ɒ", "əʊ", "oʊ", "uː", "ʌ", "ə", "ɔː", "ʊ", "ɔ"],
  p: ["p"],
  q: ["k"],
  r: ["r", "ɹ", ""],
  s: ["s", "z", "ʃ", "ʒ"],
  t: ["t", "tʃ", "ʃ"],
  u: ["ʌ", "uː", "ʊ", "ə", "j uː", "j ʊ"],
  v: ["v"],
  w: ["w", ""],
  x: ["k s", "ɡ z", "z"],
  y: ["j", "i", "iː", "ɪ", "aɪ"],
  z: ["z", "ʒ"],
};

function normaliseIpa(value: string) {
  return value
    .replace(/[\/\[\]ˈˌ.‿|]/g, "")
    .replace(/ɡ/g, "g")
    .replace(/\s+/g, "")
    .trim();
}

function tokeniseIpa(value: string) {
  const input = normaliseIpa(value);
  const tokens: string[] = [];
  let index = 0;

  while (index < input.length) {
    const multi = MULTI_PHONEMES.find((item) => input.startsWith(item.replace(/ɡ/g, "g"), index));
    if (multi) {
      tokens.push(multi.replace(/ɡ/g, "g"));
      index += multi.length;
      continue;
    }

    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    tokens.push(char);
    index += 1;
  }

  return tokens;
}

function candidateTokens(value: string) {
  if (!value) return [];
  return value.split(/\s+/).filter(Boolean).map((item) => item.replace(/ɡ/g, "g"));
}

function matches(tokens: string[], offset: number, candidate: string[]) {
  if (offset + candidate.length > tokens.length) return false;
  return candidate.every((token, index) => tokens[offset + index] === token);
}

function noteFor(letters: string, phonemes: string[]) {
  const joined = phonemes.join("");
  if (PHONEME_NOTES[joined]) return PHONEME_NOTES[joined];
  if (letters.length <= 1) return null;
  if (phonemes.length === 0) return "these letters are silent here";
  return null;
}

type Path = {
  cost: number;
  segments: GraphemePhonemeSegment[];
  interesting: number;
};

/**
 * Align spelling to an already resolved pronunciation. This does not predict a
 * pronunciation. It only explains a word when the spelling rules can account
 * for the pronunciation we already have from a lexical source.
 */
export function alignGraphemesToPhonemes(word: string, ipa?: string | null): GraphemePhonemeAlignment | null {
  const spelling = word.toLocaleLowerCase("en-GB").replace(/[^a-z]/g, "");
  if (!spelling || !ipa) return null;
  const phonemes = tokeniseIpa(ipa);
  if (!phonemes.length) return null;

  const memo = new Map<string, Path | null>();

  function solve(letterIndex: number, phonemeIndex: number): Path | null {
    const key = `${letterIndex}:${phonemeIndex}`;
    if (memo.has(key)) return memo.get(key) ?? null;
    if (letterIndex === spelling.length && phonemeIndex === phonemes.length) {
      const done = { cost: 0, segments: [], interesting: 0 };
      memo.set(key, done);
      return done;
    }
    if (letterIndex >= spelling.length) {
      memo.set(key, null);
      return null;
    }

    let best: Path | null = null;
    const maxLength = Math.min(4, spelling.length - letterIndex);

    for (let length = maxLength; length >= 1; length -= 1) {
      const letters = spelling.slice(letterIndex, letterIndex + length);
      const candidates = GRAPHEME_MAP[letters];
      if (!candidates) continue;

      for (const rawCandidate of candidates) {
        const candidate = candidateTokens(rawCandidate);
        if (candidate.length === 0) {
          const allowedSilent =
            letters.length > 1 ||
            (letters === "e" && letterIndex + 1 === spelling.length) ||
            (letters === "r" && letterIndex + 1 === spelling.length) ||
            (letters === "w" && spelling.startsWith("wr", letterIndex));
          if (!allowedSilent) continue;
        }
        if (!matches(phonemes, phonemeIndex, candidate)) continue;

        const remainder = solve(letterIndex + length, phonemeIndex + candidate.length);
        if (!remainder) continue;

        const note = noteFor(letters, candidate);
        const isInteresting = letters.length > 1 || candidate.length !== 1 || Boolean(note);
        const segment: GraphemePhonemeSegment = {
          letters,
          phonemes: candidate.join(""),
          note,
        };
        const path: Path = {
          cost: remainder.cost + (candidate.length === 0 ? 1.2 : 0) + (length === 1 ? 0.25 : 0),
          segments: [segment, ...remainder.segments],
          interesting: remainder.interesting + (isInteresting ? 1 : 0),
        };

        if (!best || path.cost < best.cost || (path.cost === best.cost && path.interesting > best.interesting)) {
          best = path;
        }
      }
    }

    memo.set(key, best);
    return best;
  }

  const path = solve(0, 0);
  if (!path) return null;

  return {
    segments: path.segments,
    confidence: path.cost <= Math.max(1.5, spelling.length * 0.3) ? "high" : "medium",
  };
}
