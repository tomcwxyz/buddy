export type CoasterCartStyle = "classic" | "rocket" | "buggy";

export const COASTER_CARTS: Record<
  CoasterCartStyle,
  { label: string; description: string }
> = {
  classic: {
    label: "Classic",
    description: "The little coaster cart.",
  },
  rocket: {
    label: "Rocket",
    description: "Pointy, speedy and a little ridiculous.",
  },
  buggy: {
    label: "Buggy",
    description: "Chunky wheels and an off-road sort of attitude.",
  },
};

export function normaliseCartStyle(value: unknown): CoasterCartStyle {
  return value === "rocket" || value === "buggy" ? value : "classic";
}
