import { piecePathD, type CoasterPieceKind } from "@/lib/practice/coaster";

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
      viewBox="0 0 112 86"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={piecePathD(kind, 10, 54, 92)}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="30" y1="57" x2="30" y2="77" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <line x1="82" y1="57" x2="82" y2="77" stroke="currentColor" strokeWidth="2" opacity="0.35" />
    </svg>
  );
}
