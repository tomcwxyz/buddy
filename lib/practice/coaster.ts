export type CoasterPieceKind =
  | "straight"
  | "lift"
  | "drop"
  | "steep-drop"
  | "hill"
  | "dip"
  | "camelback"
  | "bunny-hop"
  | "swoop"
  | "loop"
  | "double-loop"
  | "corkscrew"
  | "jump"
  | "mega-jump"
  | "tunnel"
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
  elevationDelta?: number;
  inversions?: number;
  airtime?: number;
  drops?: number;
  tunnel?: boolean;
  stunt?: "jump" | "mega-jump";
};

export type TrackSegment = {
  kind: CoasterPieceKind;
  index: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  path: string;
};

export type TrackGeometry = {
  path: string;
  segments: TrackSegment[];
  minY: number;
  maxY: number;
};

export type RideCharacter = {
  inversions: number;
  airtimeMoments: number;
  drops: number;
  boosts: number;
  brakes: number;
  tunnels: number;
  stunts: number;
  traits: string[];
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
  lift: {
    label: "Lift hill",
    shortLabel: "Lift",
    description: "Climb higher so there is somewhere exciting to go next.",
    adventure: 1,
    speedDelta: -2,
    minimumSpeed: 0,
    elevationDelta: -34,
  },
  drop: {
    label: "Drop",
    shortLabel: "Drop",
    description: "Use some height and turn it into speed.",
    adventure: 1,
    speedDelta: 5,
    minimumSpeed: 0,
    elevationDelta: 34,
    airtime: 1,
    drops: 1,
  },
  "steep-drop": {
    label: "Steep drop",
    shortLabel: "Steep drop",
    description: "A bigger dive that really gets the cart moving.",
    adventure: 3,
    speedDelta: 9,
    minimumSpeed: 0,
    elevationDelta: 50,
    airtime: 1,
    drops: 1,
  },
  hill: {
    label: "Big hill",
    shortLabel: "Hill",
    description: "Climb up, then fly down.",
    adventure: 1,
    speedDelta: -4,
    minimumSpeed: 0,
    airtime: 1,
  },
  dip: {
    label: "Deep dip",
    shortLabel: "Dip",
    description: "Dive down and pick up speed.",
    adventure: 1,
    speedDelta: 5,
    minimumSpeed: 0,
    airtime: 1,
    drops: 1,
  },
  "bunny-hop": {
    label: "Bunny hop",
    shortLabel: "Hop",
    description: "Two quick little humps.",
    adventure: 1,
    speedDelta: -2,
    minimumSpeed: 0,
    airtime: 2,
  },
  swoop: {
    label: "Swoop",
    shortLabel: "Swoop",
    description: "Down, up, and away.",
    adventure: 2,
    speedDelta: 4,
    minimumSpeed: 0,
    airtime: 1,
    drops: 1,
  },
  camelback: {
    label: "Camelback",
    shortLabel: "Camelback",
    description: "A long rolling up-and-down section.",
    adventure: 2,
    speedDelta: -3,
    minimumSpeed: 0,
    airtime: 2,
  },
  loop: {
    label: "Loop",
    shortLabel: "Loop",
    description: "A proper upside-down loop. Bring some speed.",
    adventure: 3,
    speedDelta: -8,
    minimumSpeed: 17,
    inversions: 1,
  },
  "double-loop": {
    label: "Double loop",
    shortLabel: "Double loop",
    description: "Two loops in a row. This one needs momentum.",
    adventure: 4,
    speedDelta: -13,
    minimumSpeed: 24,
    inversions: 2,
  },
  corkscrew: {
    label: "Corkscrew",
    shortLabel: "Corkscrew",
    description: "A twisty inversion with a bit of sideways-looking chaos.",
    adventure: 3,
    speedDelta: -9,
    minimumSpeed: 20,
    inversions: 1,
  },
  jump: {
    label: "Stunt jump",
    shortLabel: "Jump",
    description: "Leave the rails, fly the gap and try a flip if you have the speed.",
    adventure: 2,
    speedDelta: -4,
    minimumSpeed: 22,
    airtime: 2,
    stunt: "jump",
  },
  "mega-jump": {
    label: "Mega jump",
    shortLabel: "Mega jump",
    description: "A huge gap with room for two or three flips if the run-up is wild enough.",
    adventure: 4,
    speedDelta: -7,
    minimumSpeed: 30,
    airtime: 3,
    stunt: "mega-jump",
  },
  tunnel: {
    label: "Tunnel",
    shortLabel: "Tunnel",
    description: "Disappear into the dark for a moment.",
    adventure: 2,
    speedDelta: -1,
    minimumSpeed: 0,
    tunnel: true,
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
    return ["mega-jump", "double-loop", "corkscrew", "steep-drop", "jump", "launch"];
  }
  if (adventure >= 3) {
    return ["jump", "loop", "corkscrew", "steep-drop", "launch", "tunnel"];
  }
  if (adventure >= 2) {
    return ["jump", "launch", "lift", "drop", "tunnel", "swoop"];
  }
  if (adventure >= 1) {
    return ["lift", "drop", "jump", "hill", "bunny-hop", "brake"];
  }
  return ["straight", "lift", "drop", "hill"];
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

export function isAirbornePiece(kind: CoasterPieceKind) {
  return kind === "jump" || kind === "mega-jump";
}

export function stuntFlipsForSpeed(kind: CoasterPieceKind, speed: number) {
  if (kind === "mega-jump") {
    if (speed >= 48) return 3;
    if (speed >= 38) return 2;
    if (speed >= 30) return 1;
    return 0;
  }

  if (kind === "jump") {
    if (speed >= 44) return 2;
    if (speed >= 30) return 1;
  }

  return 0;
}

export function stuntRotationDegrees(
  kind: CoasterPieceKind,
  progress: number,
  flips: number,
) {
  if (!isAirbornePiece(kind) || flips <= 0) return 0;
  const eased = 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, progress))) / 2;
  return eased * flips * 360;
}

export function visibleTrackPathsForSegment(
  kind: CoasterPieceKind,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  if (kind === "jump") {
    return [
      `M ${startX} ${startY} Q ${startX + 20} ${startY - 4} ${startX + 33} ${startY - 30}`,
      `M ${endX - 31} ${endY - 28} Q ${endX - 18} ${endY - 4} ${endX} ${endY}`,
    ];
  }

  if (kind === "mega-jump") {
    return [
      `M ${startX} ${startY} Q ${startX + 18} ${startY - 8} ${startX + 29} ${startY - 40}`,
      `M ${endX - 28} ${endY - 38} Q ${endX - 15} ${endY - 5} ${endX} ${endY}`,
    ];
  }

  return [piecePathD(kind, startX, startY, endX - startX, endY)];
}

export function pieceEndY(kind: CoasterPieceKind, startY: number) {
  const delta = COASTER_PIECES[kind].elevationDelta ?? 0;
  return clamp(startY + delta, 62, 194);
}

export function piecePathD(
  kind: CoasterPieceKind,
  x: number,
  y: number,
  width = 92,
  requestedEndY?: number,
) {
  const half = width / 2;
  const quarter = width / 4;
  const endY = requestedEndY ?? pieceEndY(kind, y);

  switch (kind) {
    case "lift":
      return `M ${x} ${y} C ${x + quarter} ${y} ${x + width - quarter} ${endY} ${x + width} ${endY}`;
    case "drop":
      return `M ${x} ${y} C ${x + quarter * 0.8} ${y} ${x + half} ${endY} ${x + width} ${endY}`;
    case "steep-drop":
      return `M ${x} ${y} C ${x + quarter * 0.45} ${y} ${x + quarter * 0.7} ${endY} ${x + width} ${endY}`;
    case "hill":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.8} ${y} ${x + quarter * 0.8} ${y - 48} ${x + half} ${y - 48}`,
        `C ${x + width - quarter * 0.8} ${y - 48} ${x + width - quarter * 0.8} ${endY} ${x + width} ${endY}`,
      ].join(" ");
    case "dip":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.7} ${y} ${x + quarter * 0.85} ${y + 48} ${x + half} ${y + 48}`,
        `C ${x + width - quarter * 0.85} ${y + 48} ${x + width - quarter * 0.7} ${endY} ${x + width} ${endY}`,
      ].join(" ");
    case "bunny-hop":
      return [
        `M ${x} ${y}`,
        `Q ${x + quarter} ${y - 28} ${x + half} ${y}`,
        `Q ${x + quarter * 3} ${y - 22} ${x + width} ${endY}`,
      ].join(" ");
    case "swoop":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.5} ${y + 45} ${x + quarter * 1.3} ${y + 45} ${x + half} ${y + 6}`,
        `C ${x + quarter * 2.7} ${y - 46} ${x + quarter * 3.4} ${endY - 36} ${x + width} ${endY}`,
      ].join(" ");
    case "camelback":
      return [
        `M ${x} ${y}`,
        `C ${x + quarter * 0.5} ${y - 38} ${x + quarter * 1.45} ${y - 38} ${x + half} ${y}`,
        `C ${x + quarter * 2.55} ${y + 32} ${x + quarter * 3.5} ${endY + 32} ${x + width} ${endY}`,
      ].join(" ");
    case "loop":
      return [
        `M ${x} ${y}`,
        `C ${x + 18} ${y} ${x + 18} ${y - 68} ${x + half} ${y - 68}`,
        `C ${x + width - 18} ${y - 68} ${x + width - 18} ${y} ${x + half} ${y}`,
        `C ${x + 18} ${y} ${x + 20} ${y - 45} ${x + half} ${y - 45}`,
        `C ${x + width - 18} ${y - 45} ${x + width - 18} ${endY} ${x + width} ${endY}`,
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
        `C ${x + width - 7} ${y - 34} ${x + width - 7} ${endY} ${x + width} ${endY}`,
      ].join(" ");
    }
    case "corkscrew":
      return [
        `M ${x} ${y}`,
        `C ${x + 14} ${y - 36} ${x + 30} ${y + 36} ${x + 44} ${y}`,
        `C ${x + 58} ${y - 36} ${x + 76} ${y + 36} ${x + width} ${endY}`,
      ].join(" ");
    case "jump":
      return `M ${x} ${y} Q ${x + half} ${y - 68} ${x + width} ${endY}`;
    case "mega-jump":
      return `M ${x} ${y} Q ${x + half} ${y - 96} ${x + width} ${endY}`;
    case "tunnel":
    case "launch":
    case "brake":
    case "straight":
    default:
      return `M ${x} ${y} L ${x + width} ${endY}`;
  }
}

export function trackGeometryForKinds(
  kinds: CoasterPieceKind[],
  originX = 76,
  baselineY = 146,
  width = 92,
): TrackGeometry {
  const segments: TrackSegment[] = [];
  let currentY = baselineY;
  let minY = baselineY;
  let maxY = baselineY;

  for (const [index, kind] of kinds.entries()) {
    const startX = originX + index * width;
    const endX = startX + width;
    const endY = pieceEndY(kind, currentY);
    const path = piecePathD(kind, startX, currentY, width, endY);

    segments.push({
      kind,
      index,
      startX,
      startY: currentY,
      endX,
      endY,
      path,
    });

    const definition = COASTER_PIECES[kind];
    const localTop = kind === "loop" ? currentY - 68
      : kind === "double-loop" ? currentY - 52
      : kind === "hill" ? currentY - 48
      : kind === "camelback" ? currentY - 38
      : kind === "bunny-hop" ? currentY - 28
      : kind === "corkscrew" ? currentY - 36
      : kind === "jump" ? currentY - 68
      : kind === "mega-jump" ? currentY - 96
      : Math.min(currentY, endY);
    const localBottom = kind === "dip" ? currentY + 48
      : kind === "swoop" ? currentY + 45
      : Math.max(currentY, endY);

    minY = Math.min(minY, localTop, endY);
    maxY = Math.max(maxY, localBottom, endY);
    currentY = endY;

    void definition;
  }

  const station = `M 28 ${baselineY} L ${originX} ${baselineY}`;
  return {
    path: [station, ...segments.map((segment) => segment.path)].join(" "),
    segments,
    minY,
    maxY,
  };
}

export function trackPathForKinds(
  kinds: CoasterPieceKind[],
  originX = 76,
  baselineY = 146,
  width = 92,
) {
  return trackGeometryForKinds(kinds, originX, baselineY, width).path;
}

export function analyseRide(kinds: CoasterPieceKind[]): RideCharacter {
  const result: RideCharacter = {
    inversions: 0,
    airtimeMoments: 0,
    drops: 0,
    boosts: 0,
    brakes: 0,
    tunnels: 0,
    stunts: 0,
    traits: [],
  };

  for (const kind of kinds) {
    const piece = COASTER_PIECES[kind];
    result.inversions += piece.inversions ?? 0;
    result.airtimeMoments += piece.airtime ?? 0;
    result.drops += piece.drops ?? 0;
    if (kind === "launch") result.boosts += 1;
    if (kind === "brake") result.brakes += 1;
    if (piece.tunnel) result.tunnels += 1;
    if (piece.stunt) result.stunts += 1;
  }

  if (result.inversions >= 3) result.traits.push("upside-down chaos");
  else if (result.inversions > 0) result.traits.push("twisty");

  if (result.airtimeMoments >= 4) result.traits.push("floaty");
  else if (result.airtimeMoments > 0) result.traits.push("bouncy");

  if (result.drops >= 3) result.traits.push("drop-heavy");
  else if (result.drops > 0) result.traits.push("dippy");

  if (result.boosts >= 2) result.traits.push("boosted");
  if (result.stunts >= 2) result.traits.push("stunt-crazy");
  else if (result.stunts > 0) result.traits.push("airborne");
  if (result.tunnels > 0) result.traits.push("tunnel-y");

  if (result.traits.length === 0 && kinds.length > 0) result.traits.push("flowing");

  return result;
}

export function coasterViewBoxWidth(pieceCount: number, width = 92) {
  return Math.max(620, 76 + (Math.max(pieceCount, 5) * width) + 64);
}
