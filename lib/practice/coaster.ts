export type CoasterPieceKind =
  | "straight"
  | "hill"
  | "dip"
  | "camelback"
  | "bunny-hop"
  | "swoop"
  | "loop"
  | "double-loop"
  | "launch"
  | "brake";

export type CoasterLaunchPower = 1 | 2 | 3;

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

type CoasterPieceDefinition = {
  label: string;
  shortLabel: string;
  description: string;
  adventure: number;
  speedDelta: number;
  minimumSpeed: number;
};

export const COASTER_PIECES: Record<CoasterPieceKind, CoasterPieceDefinition> = {
  straight: {
    label: "Straight track",
    shortLabel: "Straight",
    description: "Simple, quick track.",
    adventure: 0,
    speedDelta: -1,
    minimumSpeed: 0,
  },
  hill: {
    label: "Big hill",
    shortLabel: "Hill",
    description: "Climb up, then fly down.",
    adventure: 1,
    speedDelta: -4,
    minimumSpeed: 0,
  },
  dip: {
    label: "Deep dip",
    shortLabel: "Dip",
    description: "Dive down and pick up speed.",
    adventure: 1,
    speedDelta: 5,
    minimumSpeed: 0,
  },
  "bunny-hop": {
    label: "Bunny hop",
    shortLabel: "Hop",
    description: "Two quick little humps.",
    adventure: 1,
    speedDelta: -2,
    minimumSpeed: 0,
  },
  swoop: {
    label: "Swoop",
    shortLabel: "Swoop",
    description: "Down, up, and away.",
    adventure: 2,
    speedDelta: 4,
    minimumSpeed: 0,
  },
  camelback: {
    label: "Camelback",
    shortLabel: "Camelback",
    description: "A long rolling up-and-down section.",
    adventure: 2,
    speedDelta: -3,
    minimumSpeed: 0,
  },
  loop: {
    label: "Loop",
    shortLabel: "Loop",
    description: "A proper upside-down loop. Bring some speed.",
    adventure: 3,
    speedDelta: -8,
    minimumSpeed: 17,
  },
  "double-loop": {
    label: "Double loop",
    shortLabel: "Double loop",
    description: "Two loops in a row. This one needs momentum.",
    adventure: 4,
    speedDelta: -13,
    minimumSpeed: 24,
  },
  launch: {
    label: "Launch track",
    shortLabel: "Launch",
    description: "A burst of speed right where you need it.",
    adventure: 2,
    speedDelta: 13,
    minimumSpeed: 0,
  },
  brake: {
    label: "Brake run",
    shortLabel: "Brakes",
    description: "Slow the cart before the next section.",
    adventure: 1,
    speedDelta: -10,
    minimumSpeed: 0,
  },
};

export const COASTER_LAUNCH_SPEED: Record<CoasterLaunchPower, number> = {
  1: 17,
  2: 24,
  3: 32,
};

function wordHash(word: string) {
  return [...word].reduce((total, letter) => ((total * 31) + letter.charCodeAt(0)) >>> 0, 7);
}

export function coasterAdventureForWord({
  word,
  chunks = 1,
  syllables = 1,
  signals = {},
}: CoasterWordShape) {
  const clean = word.toLocaleLowerCase("en-GB").replace(/[^a-z'-]/g, "");
  let adventure = 0;

  if (clean.length >= 6) adventure += 1;
  if (clean.length >= 9) adventure += 1;
  if (chunks >= 3) adventure += 1;
  if ((syllables ?? 1) >= 3) adventure += 1;
  if (signals.clue || signals.heard) adventure += 1;
  if (signals.together || signals.meaning) adventure += 1;

  return Math.min(4, adventure);
}

/**
 * Exploration gives the child a choice of construction material.
 * Correctness is deliberately absent from the input.
 */
export function coasterPieceOptionsForWord(shape: CoasterWordShape): CoasterPieceKind[] {
  const adventure = coasterAdventureForWord(shape);

  if (adventure >= 4) {
    return ["loop", "double-loop", "launch", "swoop", "camelback"];
  }
  if (adventure >= 3) {
    return ["loop", "launch", "camelback", "swoop", "dip"];
  }
  if (adventure >= 2) {
    return ["launch", "camelback", "swoop", "hill", "dip"];
  }
  if (adventure >= 1) {
    return ["hill", "dip", "bunny-hop", "brake", "straight"];
  }
  return ["straight", "hill", "dip"];
}

/**
 * Default piece used when a word is first explored. The child can change it
 * later to any option that word unlocked.
 */
export function coasterPieceKindForWord(shape: CoasterWordShape): CoasterPieceKind {
  const options = coasterPieceOptionsForWord(shape);
  return options[wordHash(shape.word) % options.length];
}

export function minimumSpeedForPiece(kind: CoasterPieceKind) {
  return COASTER_PIECES[kind].minimumSpeed;
}

export function speedAfterPiece(speed: number, kind: CoasterPieceKind) {
  return Math.max(5, Math.min(62, speed + COASTER_PIECES[kind].speedDelta));
}

export function canEnterPiece(speed: number, kind: CoasterPieceKind) {
  return speed >= minimumSpeedForPiece(kind);
}

export function speedLabel(speed: number) {
  if (speed < 12) return "crawling";
  if (speed < 22) return "rolling";
  if (speed < 34) return "quick";
  if (speed < 46) return "fast";
  return "flying";
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
        `C ${x + quarter * 0.7} ${y} ${x + quarter * 0.85} ${y + 48} ${x + half} ${y + 48}`,
        `C ${x + width - quarter * 0.85} ${y + 48} ${x + width - quarter * 0.7} ${y} ${x + width} ${y}`,
      ].join(" ");
    case "bunny-hop":
      return [
        `M ${x} ${y}`,
        `Q ${x + quarter} ${y - 28} ${x + half} ${y}`,
        `Q ${x + quarter * 3} ${y - 22} ${x + width} ${y}`,
      ].join(" ");
    case "swoop":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.5} ${y + 45} ${x + quarter * 1.3} ${y + 45} ${x + half} ${y + 6}`,
        `C ${x + quarter * 2.7} ${y - 46} ${x + quarter * 3.4} ${y - 36} ${x + width} ${y}`,
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
    case "double-loop": {
      const loopWidth = width / 2;
      const firstMid = x + loopWidth / 2;
      const secondStart = x + loopWidth;
      const secondMid = secondStart + loopWidth / 2;
      return [
        `M ${x} ${y}`,
        `C ${x + 8} ${y} ${x + 8} ${y - 52} ${firstMid} ${y - 52}`,
        `C ${secondStart - 8} ${y - 52} ${secondStart - 8} ${y} ${firstMid} ${y}`,
        `C ${x + 9} ${y} ${x + 10} ${y - 34} ${firstMid} ${y - 34}`,
        `C ${secondStart - 7} ${y - 34} ${secondStart - 7} ${y} ${secondStart} ${y}`,
        `C ${secondStart + 8} ${y} ${secondStart + 8} ${y - 52} ${secondMid} ${y - 52}`,
        `C ${x + width - 8} ${y - 52} ${x + width - 8} ${y} ${secondMid} ${y}`,
        `C ${secondStart + 9} ${y} ${secondStart + 10} ${y - 34} ${secondMid} ${y - 34}`,
        `C ${x + width - 7} ${y - 34} ${x + width - 7} ${y} ${x + width} ${y}`,
      ].join(" ");
    }
    case "launch":
      return `M ${x} ${y} L ${x + width} ${y}`;
    case "brake":
      return `M ${x} ${y} L ${x + width} ${y}`;
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
