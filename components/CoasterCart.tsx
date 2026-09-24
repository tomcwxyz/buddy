import type { CoasterCartStyle } from "@/lib/practice/coaster-cart";

export function CoasterCartGlyph({
  style,
}: {
  style: CoasterCartStyle;
}) {
  if (style === "rocket") {
    return (
      <g aria-hidden="true">
        <path d="M -17 2 Q -10 -15 8 -14 Q 19 -7 18 5 L 9 10 L -12 10 Z" fill="#b97c63" stroke="#3f4440" strokeWidth="2.5" />
        <path d="M 8 -14 L 21 -20 L 16 -8" fill="#d9b86c" stroke="#3f4440" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="-7" cy="12" r="4.5" fill="#3f4440" />
        <circle cx="10" cy="12" r="4.5" fill="#3f4440" />
        <path d="M -19 3 L -29 -3 L -25 7 Z" fill="#d99a7c" />
      </g>
    );
  }

  if (style === "buggy") {
    return (
      <g aria-hidden="true">
        <rect x="-17" y="-8" width="34" height="18" rx="5" fill="#71836a" stroke="#3f4440" strokeWidth="2.5" />
        <path d="M -11 -8 L -6 -18 L 8 -18 L 13 -8" fill="#f4f0e8" stroke="#3f4440" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="-10" cy="12" r="6" fill="#3f4440" />
        <circle cx="11" cy="12" r="6" fill="#3f4440" />
        <circle cx="-10" cy="12" r="2.3" fill="#d9b86c" />
        <circle cx="11" cy="12" r="2.3" fill="#d9b86c" />
      </g>
    );
  }

  return (
    <g aria-hidden="true">
      <rect x="-13" y="-9" width="27" height="15" rx="5" fill="#b97c63" stroke="#3f4440" strokeWidth="2.5" />
      <path d="M -9 -9 L -5 -17 L 7 -17 L 11 -9" fill="#f4f0e8" stroke="#3f4440" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="-7" cy="8" r="4.5" fill="#3f4440" />
      <circle cx="8" cy="8" r="4.5" fill="#3f4440" />
    </g>
  );
}

export function CoasterCartIcon({
  style,
}: {
  style: CoasterCartStyle;
}) {
  return (
    <svg viewBox="-38 -30 76 64" aria-hidden="true" focusable="false">
      <CoasterCartGlyph style={style} />
    </svg>
  );
}
