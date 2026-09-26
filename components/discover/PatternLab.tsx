"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, MagicWand } from "@phosphor-icons/react";
import { recordLearningEvent } from "@/lib/learning/local-store";

type PatternLabProps = {
  onBuddyLine: (line: string) => void;
};

type Tile = "dot" | "stripe" | "diamond" | "wave";

const tiles: Array<{ id: Tile; label: string }> = [
  { id: "dot", label: "Dot" },
  { id: "stripe", label: "Stripe" },
  { id: "diamond", label: "Diamond" },
  { id: "wave", label: "Wave" },
];

const presets: Tile[][] = [
  ["dot", "stripe", "dot", "stripe"],
  ["diamond", "dot", "wave", "diamond", "dot", "wave"],
  ["wave", "wave", "diamond", "wave", "wave", "diamond"],
];

function findRepeat(sequence: Tile[]) {
  for (let period = 1; period <= 3; period += 1) {
    if (sequence.length < period * 2) continue;
    const works = sequence.every((tile, index) => tile === sequence[index % period]);
    if (works) return sequence[sequence.length % period];
  }
  return null;
}

export function PatternLab({ onBuddyLine }: PatternLabProps) {
  const [sequence, setSequence] = useState<Tile[]>(["dot", "stripe", "dot"]);
  const [guess, setGuess] = useState<Tile | null>(null);
  const [presetIndex, setPresetIndex] = useState(0);

  const canAdd = sequence.length < 10;
  const guessLabel = useMemo(() => tiles.find((tile) => tile.id === guess)?.label ?? "", [guess]);

  function add(tile: Tile) {
    if (!canAdd) return;
    setSequence((current) => [...current, tile]);
    setGuess(null);
    onBuddyLine("Nice. Keep going until you think I should be able to spot the rule.");
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "pattern-lab",
      detail: `add:${tile}`,
    });
  }

  function askBuddy() {
    const next = findRepeat(sequence);
    setGuess(next);
    if (next) {
      onBuddyLine(`I think the next piece is ${tiles.find((tile) => tile.id === next)?.label.toLowerCase()}. Did I understand your rule?`);
    } else {
      onBuddyLine("You have made that hard to predict. Add another piece, or make the rule even stranger.");
    }
    recordLearningEvent({
      kind: "discover_reflected",
      source: "discover",
      activityId: "pattern-lab",
      detail: `guess:${next ?? "uncertain"}:length=${sequence.length}`,
    });
  }

  function clear() {
    setSequence([]);
    setGuess(null);
    onBuddyLine("Blank canvas. Make me a rule to figure out.");
  }

  function buddyPattern() {
    const next = presets[presetIndex % presets.length];
    setPresetIndex((value) => value + 1);
    setSequence(next);
    setGuess(null);
    onBuddyLine("I made one. Can you work out what I would put next?");
  }

  return (
    <section className="discover-world pattern-lab" aria-labelledby="pattern-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Try to fool Buddy</p>
          <h2 id="pattern-title">Pattern maker</h2>
          <p>Make a rule with shapes, then see whether Buddy can predict your next move.</p>
        </div>
        <div className="discover-topic-chips" aria-label="Ideas hiding in this activity">
          <span>patterns</span><span>rules</span><span>prediction</span><span>logic</span>
        </div>
      </div>

      <div className="pattern-board">
        <div className="pattern-sequence" aria-label="Your pattern">
          {sequence.length ? sequence.map((tile, index) => (
            <PatternTile key={`${tile}-${index}`} tile={tile} />
          )) : <span className="pattern-empty">Build a pattern here.</span>}
          {guess && (
            <div className="pattern-guess" aria-live="polite">
              <span>Buddy thinks…</span>
              <PatternTile tile={guess} />
              <strong>{guessLabel}</strong>
            </div>
          )}
        </div>

        <div className="pattern-palette" aria-label="Pattern pieces">
          {tiles.map((tile) => (
            <button type="button" key={tile.id} disabled={!canAdd} onClick={() => add(tile.id)}>
              <PatternTile tile={tile.id} />
              <span>{tile.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="discover-world-actions">
        <button type="button" className="discover-primary" onClick={askBuddy} disabled={sequence.length < 2}>
          <MagicWand size={20} /> Buddy, what comes next?
        </button>
        <button type="button" className="discover-secondary" onClick={buddyPattern}>
          Make one for me
        </button>
        <button type="button" className="discover-secondary" onClick={clear}>
          <ArrowClockwise size={18} /> Clear
        </button>
      </div>
    </section>
  );
}

function PatternTile({ tile }: { tile: Tile }) {
  return <span className={`pattern-tile pattern-${tile}`} aria-label={tiles.find((item) => item.id === tile)?.label} />;
}
