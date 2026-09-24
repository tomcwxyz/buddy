import type { CoasterSceneryKind } from "@/lib/practice/coaster-scenery";

export function CoasterSceneryGlyph({
  kind,
}: {
  kind: CoasterSceneryKind;
}) {
  switch (kind) {
    case "tree":
      return (
        <g aria-hidden="true">
          <rect x="-4" y="-2" width="8" height="30" rx="3" fill="#7f6754" />
          <circle cx="0" cy="-13" r="21" fill="#71836a" />
          <circle cx="-13" cy="-4" r="13" fill="#829278" />
          <circle cx="13" cy="-4" r="13" fill="#829278" />
        </g>
      );
    case "bush":
      return (
        <g aria-hidden="true">
          <ellipse cx="0" cy="9" rx="23" ry="13" fill="#71836a" />
          <circle cx="-12" cy="1" r="12" fill="#829278" />
          <circle cx="5" cy="-3" r="15" fill="#788873" />
          <circle cx="17" cy="4" r="10" fill="#829278" />
        </g>
      );
    case "rocks":
      return (
        <g aria-hidden="true">
          <path d="M -24 17 L -15 -7 L 0 -12 L 9 17 Z" fill="#7c7b75" />
          <path d="M -2 17 L 7 -2 L 20 -8 L 27 17 Z" fill="#96948d" />
          <path d="M -10 17 L -4 4 L 8 1 L 15 17 Z" fill="#aaa69c" />
        </g>
      );
    case "flowers":
      return (
        <g aria-hidden="true">
          {[-18, -7, 5, 17].map((x, index) => (
            <g key={x} transform={`translate(${x} ${index % 2 === 0 ? 2 : -3})`}>
              <line x1="0" y1="2" x2="0" y2="21" stroke="#71836a" strokeWidth="2.5" />
              <circle cx="0" cy="0" r="5" fill={index % 2 === 0 ? "#d99a7c" : "#d7b45e"} />
              <circle cx="0" cy="0" r="2" fill="#f4e4ad" />
            </g>
          ))}
        </g>
      );
    case "pond":
      return (
        <g aria-hidden="true">
          <ellipse cx="0" cy="8" rx="31" ry="15" fill="#8cb7c7" opacity="0.82" />
          <ellipse cx="-7" cy="5" rx="16" ry="6" fill="#b8d5df" opacity="0.7" />
          <path d="M 16 -2 q 5 -7 9 0" fill="none" stroke="#71836a" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case "flag":
      return (
        <g aria-hidden="true">
          <line x1="-6" y1="-23" x2="-6" y2="24" stroke="#625e55" strokeWidth="3" />
          <path d="M -4 -21 Q 12 -15 23 -22 L 23 -5 Q 11 1 -4 -6 Z" fill="#b97c63" />
        </g>
      );
    case "lamp":
      return (
        <g aria-hidden="true">
          <line x1="0" y1="-13" x2="0" y2="25" stroke="#625e55" strokeWidth="4" />
          <path d="M -11 -17 Q 0 -29 11 -17 L 8 -5 L -8 -5 Z" fill="#6d6673" />
          <circle cx="0" cy="-13" r="6" fill="#f2d98b" />
        </g>
      );
    case "hut":
      return (
        <g aria-hidden="true">
          <rect x="-28" y="-7" width="56" height="35" rx="4" fill="#b97c63" />
          <path d="M -34 -7 L 0 -31 L 34 -7 Z" fill="#78677e" />
          <rect x="-8" y="6" width="16" height="22" rx="2" fill="#f4f0e8" opacity="0.86" />
          <rect x="13" y="2" width="9" height="9" rx="1" fill="#dce9ef" />
        </g>
      );
  }
}

export function CoasterSceneryIcon({
  kind,
}: {
  kind: CoasterSceneryKind;
}) {
  return (
    <svg viewBox="-40 -36 80 76" aria-hidden="true" focusable="false">
      <CoasterSceneryGlyph kind={kind} />
    </svg>
  );
}
