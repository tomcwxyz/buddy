import { visibleTrackPathsForSegment, type CoasterPieceKind } from "@/lib/practice/coaster";

export function CoasterPieceIcon({
  kind,
  className,
}: {
  kind: CoasterPieceKind;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 -8 112 110"
      aria-hidden="true"
      focusable="false"
    >
      {visibleTrackPathsForSegment(kind, 10, 54, 102, 54).map((path, index) => (
        <path
          key={index}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <line x1="30" y1="58" x2="30" y2="92" stroke="currentColor" strokeWidth="2" opacity="0.28" />
      <line x1="82" y1="58" x2="82" y2="92" stroke="currentColor" strokeWidth="2" opacity="0.28" />
    </svg>
  );
}
