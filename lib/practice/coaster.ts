export type CoasterPieceKind = "straight" | "hill" | "dip" | "camelback" | "loop";

export type CoasterExplorationSignals = {
  heard?: boolean;
  clue?: boolean;
  together?: boolean;
  meaning?: boolean;
};

export type CoasterWordShape = {
  word: string;
  chunks?: number;
  syllables?: number | null;
  signals?: CoasterExplorationSignals;
};

export const COASTER_PIECES: Record<
  CoasterPieceKind,
  { label: string; shortLabel: string; description: string; adventure: number }
> = {
  straight: {
    label: "Straight track",
    shortLabel: "Straight",
    description: "A good fast bit.",
    adventure: 0,
  },
  hill: {
    label: "Big hill",
    shortLabel: "Hill",
    description: "Up, over and down.",
    adventure: 1,
  },
  dip: {
    label: "Deep dip",
    shortLabel: "Dip",
    description: "Down first, then back up.",
    adventure: 1,
  },
  camelback: {
    label: "Camelback",
    shortLabel: "Camelback",
    description: "A wobbly bit of track with two changes.",
    adventure: 2,
  },
  loop: {
    label: "Loop",
    shortLabel: "Loop",
    description: "A proper upside-down loop.",
    adventure: 3,
  },
};

function wordHash(word: string) {
  return [...word].reduce((total, letter) => ((total * 31) + letter.charCodeAt(0)) >>> 0, 7);
}

/**
 * Coaster pieces reflect how much there was to notice and explore in a word,
 * never whether the child got it "right".
 */
export function coasterPieceKindForWord({
  word,
  chunks = 1,
  syllables = 1,
  signals = {},
}: CoasterWordShape): CoasterPieceKind {
  const clean = word.toLocaleLowerCase("en-GB").replace(/[^a-z'-]/g, "");
  let adventure = 0;

  if (clean.length >= 7) adventure += 1;
  if (clean.length >= 10) adventure += 1;
  if (chunks >= 3) adventure += 1;
  if ((syllables ?? 1) >= 3) adventure += 1;

  // Asking Buddy to dig into the word means there was more exploration. This
  // changes the shape of the piece, but never the amount of progress earned.
  if (signals.together || signals.meaning) adventure += 1;

  if (adventure >= 4) return "loop";
  if (adventure >= 3) return "camelback";
  if (adventure >= 1) return wordHash(clean) % 2 === 0 ? "hill" : "dip";
  return "straight";
}

export function piecePathD(
  kind: CoasterPieceKind,
  x: number,
  y: number,
  width = 92,
) {
  const half = width / 2;
  const quarter = width / 4;

  switch (kind) {
    case "hill":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.8} ${y} ${x + quarter * 0.8} ${y - 48} ${x + half} ${y - 48}`,
        `C ${x + width - quarter * 0.8} ${y - 48} ${x + width - quarter * 0.8} ${y} ${x + width} ${y}`,
      ].join(" ");
    case "dip":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.8} ${y} ${x + quarter * 0.8} ${y + 38} ${x + half} ${y + 38}`,
        `C ${x + width - quarter * 0.8} ${y + 38} ${x + width - quarter * 0.8} ${y} ${x + width} ${y}`,
      ].join(" ");
    case "camelback":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.5} ${y - 38} ${x + quarter * 1.45} ${y - 38} ${x + half} ${y}`,
        `C ${x + quarter * 2.55} ${y + 32} ${x + quarter * 3.5} ${y + 32} ${x + width} ${y}`,
      ].join(" ");
    case "loop":
      return [
        `M ${x} ${y}`,
        `C ${x + 18} ${y} ${x + 18} ${y - 68} ${x + half} ${y - 68}`,
        `C ${x + width - 18} ${y - 68} ${x + width - 18} ${y} ${x + half} ${y}`,
        `C ${x + 18} ${y} ${x + 20} ${y - 45} ${x + half} ${y - 45}`,
        `C ${x + width - 18} ${y - 45} ${x + width - 18} ${y} ${x + width} ${y}`,
      ].join(" ");
    case "straight":
    default:
      return `M ${x} ${y} L ${x + width} ${y}`;
  }
}

export function trackPathForKinds(
  kinds: CoasterPieceKind[],
  originX = 76,
  baselineY = 146,
  width = 92,
) {
  const station = `M 28 ${baselineY} L ${originX} ${baselineY}`;
  const pieces = kinds.map((kind, index) => piecePathD(
    kind,
    originX + (index * width),
    baselineY,
    width,
  ));
  return [station, ...pieces].join(" ");
}

export function coasterViewBoxWidth(pieceCount: number, width = 92) {
  return Math.max(620, 76 + (Math.max(pieceCount, 5) * width) + 64);
}
