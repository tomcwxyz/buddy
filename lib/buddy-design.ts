export const buddyColours = {
  paper: "#F4F0E8",
  paperRaised: "#FBF8F2",
  ink: "#25231F",
  inkSoft: "#625E55",
  line: "#D9D2C6",
  moss: "#66745E",
  sky: "#7893A6",
  clay: "#B97C63",
  sun: "#D9B86C",
  plum: "#78677E",
} as const;

export const buddyModeAccent = {
  read: buddyColours.moss,
  practice: buddyColours.clay,
  discover: buddyColours.sky,
  do: buddyColours.plum,
} as const;

export const buddyMotion = {
  fast: 160,
  normal: 240,
  slow: 350,
  ambientBreath: 4800,
} as const;

export const buddyTouch = {
  minimum: 48,
  preferred: 56,
  primary: 64,
} as const;

export const buddyRadii = {
  control: 17,
  card: 28,
  hero: 34,
  pill: 999,
} as const;

/**
 * These tokens are intentionally platform-neutral. Android/R1/native surfaces
 * should map their own rendering primitives onto the same values and meaning.
 */
export type BuddyMode = keyof typeof buddyModeAccent;
