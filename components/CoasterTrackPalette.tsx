"use client";

import { CoasterPieceIcon } from "@/components/CoasterPieceIcon";
import {
  COASTER_PIECES,
  type CoasterPieceKind,
} from "@/lib/practice/coaster";

export function CoasterTrackPalette({
  word,
  currentKind,
  options,
  onChoose,
  compact = false,
}: {
  word: string;
  currentKind: CoasterPieceKind;
  options: CoasterPieceKind[];
  onChoose: (kind: CoasterPieceKind) => void;
  compact?: boolean;
}) {
  return (
    <div className={`coaster-track-palette${compact ? " compact" : ""}`} aria-label={`Choose track shape for ${word}`}>
      {options.map((kind) => (
        <button
          type="button"
          key={kind}
          className={currentKind === kind ? "active" : ""}
          onClick={() => onChoose(kind)}
          aria-pressed={currentKind === kind}
        >
          <CoasterPieceIcon kind={kind} />
          <span>{COASTER_PIECES[kind].shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
