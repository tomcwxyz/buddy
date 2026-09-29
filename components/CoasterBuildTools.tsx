"use client";

import { Plus } from "@phosphor-icons/react";
import { CoasterPieceIcon } from "@/components/CoasterPieceIcon";
import { CoasterSceneryIcon } from "@/components/CoasterScenery";
import {
  COASTER_PIECES,
  type CoasterPieceKind,
} from "@/lib/practice/coaster";
import {
  COASTER_SCENERY,
  type CoasterSceneryKind,
} from "@/lib/practice/coaster-scenery";
import type { CoasterState } from "@/lib/practice/coaster-store";

const TRACK_KIT_GROUPS: Array<{ label: string; kinds: CoasterPieceKind[] }> = [
  {
    label: "Shape",
    kinds: ["straight", "lift", "drop", "steep-drop", "hill", "dip", "bunny-hop", "swoop", "camelback", "tunnel"],
  },
  {
    label: "Turn",
    kinds: ["bank-left", "bank-right", "sweep-left", "sweep-right"],
  },
  {
    label: "Speed",
    kinds: ["launch", "brake"],
  },
  {
    label: "Stunts",
    kinds: ["jump", "mega-jump", "loop", "double-loop", "corkscrew", "half-pipe", "wall-ride"],
  },
];

type Piece = CoasterState["pieces"][number];
type Scenery = CoasterState["scenery"][number];

export function CoasterBuildTools({
  coaster,
  inventory,
  selectedKitKind,
  selectedSceneryKind,
  selectedScenery,
  scenerySpaceLeft,
  onSelectKitKind,
  onBuildPiece,
  onChangePlacedPiece,
  onChooseScenery,
  onRemoveSelectedScenery,
}: {
  coaster: CoasterState;
  inventory: Piece[];
  selectedKitKind: CoasterPieceKind | null;
  selectedSceneryKind: CoasterSceneryKind | null;
  selectedScenery: Scenery | null;
  scenerySpaceLeft: number;
  onSelectKitKind: (kind: CoasterPieceKind | null) => void;
  onBuildPiece: (pieceId: string, word: string, kind: CoasterPieceKind) => void;
  onChangePlacedPiece: (pieceId: string, word: string, kind: CoasterPieceKind) => void;
  onChooseScenery: (kind: CoasterSceneryKind) => void;
  onRemoveSelectedScenery: () => void;
}) {
  const placed = coaster.pieces.filter((piece) => coaster.placedIds.includes(piece.id));

  return (
    <aside className="coaster-yard coaster-tools">
      <details className="coaster-tool-drawer">
        <summary>
          <span>
            <strong>Add track</strong>
            <small>{inventory.length > 0 ? `${inventory.length} word-piece${inventory.length === 1 ? "" : "s"} waiting` : "Everything is on the ride"}</small>
          </span>
          <span aria-hidden="true">+</span>
        </summary>

        <div className="coaster-track-kit">
          <div className="coaster-track-kit-heading">
            <div>
              <span>Track kit</span>
              <strong>Choose any shape.</strong>
            </div>
            <small>Every explored word can become any piece in the toybox.</small>
          </div>

          <div className="coaster-track-kit-groups">
            {TRACK_KIT_GROUPS.map((group) => (
              <div className="coaster-track-kit-group" key={group.label}>
                <span>{group.label}</span>
                <div>
                  {group.kinds.map((kind) => (
                    <button
                      type="button"
                      key={kind}
                      className={selectedKitKind === kind ? "active" : ""}
                      onClick={() => onSelectKitKind(selectedKitKind === kind ? null : kind)}
                      aria-pressed={selectedKitKind === kind}
                    >
                      <CoasterPieceIcon kind={kind} />
                      <span>{COASTER_PIECES[kind].shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedKitKind && (
            <div className="coaster-track-kit-picker">
              <div>
                <CoasterPieceIcon kind={selectedKitKind} />
                <div>
                  <strong>{COASTER_PIECES[selectedKitKind].label}</strong>
                  <span>{COASTER_PIECES[selectedKitKind].description}</span>
                </div>
              </div>

              {inventory.length > 0 ? (
                <>
                  <p>Pick a word-piece. It will snap onto <strong>BUILD HERE</strong> in this shape.</p>
                  <div className="coaster-track-kit-words">
                    {inventory.map((piece) => (
                      <button
                        type="button"
                        key={piece.id}
                        onClick={() => onBuildPiece(piece.id, piece.word, selectedKitKind)}
                      >
                        <Plus size={15} /> {piece.word}
                      </button>
                    ))}
                  </div>
                </>
              ) : placed.length > 0 ? (
                <>
                  <p>All your word-pieces are already on the ride. Change one in place:</p>
                  <div className="coaster-track-kit-words">
                    {placed.map((piece) => (
                      <button
                        type="button"
                        key={piece.id}
                        onClick={() => onChangePlacedPiece(piece.id, piece.word, selectedKitKind)}
                      >
                        {piece.word}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p>Explore a word first, then it will appear here as something to build with.</p>
              )}
            </div>
          )}
        </div>
      </details>

      <details className="coaster-tool-drawer">
        <summary>
          <span>
            <strong>Park</strong>
            <small>{scenerySpaceLeft} space{scenerySpaceLeft === 1 ? "" : "s"} left</small>
          </span>
          <span aria-hidden="true">+</span>
        </summary>

        <div className="coaster-park-builder">
          <div className="coaster-park-heading">
            <div>
              <span>Scenery</span>
              <strong>Make the place yours.</strong>
            </div>
          </div>

          <div className="coaster-scenery-palette" aria-label="Park scenery">
            {(Object.keys(COASTER_SCENERY) as CoasterSceneryKind[]).map((kind) => (
              <button
                type="button"
                key={kind}
                className={selectedSceneryKind === kind ? "active" : ""}
                onClick={() => onChooseScenery(kind)}
                disabled={scenerySpaceLeft === 0 && selectedSceneryKind !== kind}
                aria-pressed={selectedSceneryKind === kind}
              >
                <CoasterSceneryIcon kind={kind} />
                <span>{COASTER_SCENERY[kind].label}</span>
              </button>
            ))}
          </div>

          {selectedScenery && (
            <div className="coaster-scenery-selected">
              <span>Selected: {COASTER_SCENERY[selectedScenery.kind].label}</span>
              <span>Tap the park to move it.</span>
              <button type="button" onClick={onRemoveSelectedScenery}>Put it away</button>
            </div>
          )}

          <p>Exploring words makes room for the park to grow. There are no better decorations and nothing to earn.</p>
        </div>
      </details>
    </aside>
  );
}
