export type CoasterSceneryKind =
  | "tree"
  | "bush"
  | "rocks"
  | "flowers"
  | "pond"
  | "flag"
  | "lamp"
  | "hut";

export type CoasterSceneryDefinition = {
  label: string;
  description: string;
};

export const COASTER_SCENERY: Record<CoasterSceneryKind, CoasterSceneryDefinition> = {
  tree: {
    label: "Tree",
    description: "A tall bit of green beside the ride.",
  },
  bush: {
    label: "Bush",
    description: "Low greenery to soften the park.",
  },
  rocks: {
    label: "Rocks",
    description: "A little rocky patch.",
  },
  flowers: {
    label: "Flowers",
    description: "A bright patch by the track.",
  },
  pond: {
    label: "Pond",
    description: "A calm bit of water under the coaster.",
  },
  flag: {
    label: "Flag",
    description: "A marker for your park.",
  },
  lamp: {
    label: "Lamp",
    description: "A tiny light for the path.",
  },
  hut: {
    label: "Ride hut",
    description: "A little park building beside the coaster.",
  },
};

export function sceneryCapacityForExploredWords(exploredWords: number) {
  return Math.max(1, exploredWords);
}

export function clampSceneryPosition(x: number, y: number) {
  return {
    x: Math.max(0.06, Math.min(0.96, x)),
    y: Math.max(0.2, Math.min(0.9, y)),
  };
}
