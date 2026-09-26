"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ArrowClockwise, MagicWand } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { recordLearningEvent } from "@/lib/learning/local-store";

type PatternLabProps = {
  onBuddyLine: (line: string) => void;
};

type BlockColour = "coral" | "sky" | "sun" | "plum" | "moss";
type Tool = "add" | "remove";
type Starter = "mirror" | "stairs" | "repeat" | "city";
type Stack = BlockColour[];

const ROWS = 4;
const COLS = 5;
const MAX_HEIGHT = 5;

const colours: Array<{ id: BlockColour; label: string; value: string }> = [
  { id: "coral", label: "Coral", value: "var(--buddy-character)" },
  { id: "sky", label: "Sky", value: "var(--buddy-sky)" },
  { id: "sun", label: "Sun", value: "var(--buddy-sun)" },
  { id: "plum", label: "Plum", value: "var(--buddy-plum)" },
  { id: "moss", label: "Moss", value: "var(--buddy-moss)" },
];

function emptyGrid(): Stack[] {
  return Array.from({ length: ROWS * COLS }, () => []);
}

function indexOfCell(row: number, col: number) {
  return row * COLS + col;
}

function starterGrid(starter: Starter): Stack[] {
  const grid = emptyGrid();

  function set(row: number, col: number, height: number, colour: BlockColour) {
    grid[indexOfCell(row, col)] = Array.from({ length: height }, () => colour);
  }

  if (starter === "mirror") {
    set(0, 0, 1, "coral");
    set(0, 4, 1, "coral");
    set(1, 1, 2, "sky");
    set(1, 3, 2, "sky");
    set(2, 2, 3, "sun");
    set(3, 1, 1, "plum");
    set(3, 3, 1, "plum");
  }

  if (starter === "stairs") {
    set(1, 0, 1, "moss");
    set(1, 1, 2, "moss");
    set(1, 2, 3, "moss");
    set(1, 3, 4, "moss");
    set(1, 4, 5, "moss");
  }

  if (starter === "repeat") {
    for (let row = 0; row < ROWS; row += 1) {
      set(row, 0, 1, "coral");
      set(row, 1, 2, "sky");
      set(row, 2, 1, "sun");
      set(row, 3, 2, "sky");
      set(row, 4, 1, "coral");
    }
  }

  if (starter === "city") {
    const heights = [1, 3, 2, 5, 1, 2, 4, 1, 3, 2, 3, 1, 4, 2, 5, 1, 2, 3, 1, 4];
    const palette: BlockColour[] = ["coral", "sky", "sun", "plum", "moss"];
    heights.forEach((height, index) => {
      grid[index] = Array.from({ length: height }, (_, level) => palette[(index + level) % palette.length]);
    });
  }

  return grid;
}

function stackSignature(stack: Stack) {
  return stack.join("|");
}

function analyseGrid(grid: Stack[]) {
  const totalBlocks = grid.reduce((sum, stack) => sum + stack.length, 0);
  const maxHeight = Math.max(0, ...grid.map((stack) => stack.length));

  let mirror = true;
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < Math.floor(COLS / 2); col += 1) {
      const left = grid[indexOfCell(row, col)];
      const right = grid[indexOfCell(row, COLS - 1 - col)];
      if (stackSignature(left) !== stackSignature(right)) mirror = false;
    }
  }

  const rowSignatures = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => stackSignature(grid[indexOfCell(row, col)])).join("/"),
  );
  const repeatedRows = rowSignatures.filter(Boolean).length > 1 && rowSignatures.every((row) => row === rowSignatures[0]);

  const firstOccupiedRow = Array.from({ length: ROWS }, (_, row) => row)
    .find((row) => Array.from({ length: COLS }, (_, col) => grid[indexOfCell(row, col)].length).some(Boolean));
  const heights = firstOccupiedRow === undefined
    ? []
    : Array.from({ length: COLS }, (_, col) => grid[indexOfCell(firstOccupiedRow, col)].length);
  const staircase = heights.length === COLS && heights.every((height, index) => height === index + 1);

  const topColours = new Set(
    grid.flatMap((stack) => stack.length ? [stack[stack.length - 1]] : []),
  );

  return { totalBlocks, maxHeight, mirror, repeatedRows, staircase, colourCount: topColours.size };
}

export function PatternLab({ onBuddyLine }: PatternLabProps) {
  const [grid, setGrid] = useState<Stack[]>(() => starterGrid("mirror"));
  const [colour, setColour] = useState<BlockColour>("coral");
  const [tool, setTool] = useState<Tool>("add");
  const [flipped, setFlipped] = useState(false);
  const [starter, setStarter] = useState<Starter>("mirror");

  const analysis = useMemo(() => analyseGrid(grid), [grid]);

  function editCell(row: number, col: number) {
    const index = indexOfCell(row, col);
    setGrid((current) => {
      const next = current.map((stack) => [...stack]);
      if (tool === "remove") {
        next[index].pop();
      } else if (next[index].length < MAX_HEIGHT) {
        next[index].push(colour);
      }
      return next;
    });

    onBuddyLine(tool === "remove"
      ? "Taking a block away changes the pattern too. What stayed the same?"
      : "Another block. Are you repeating something, growing something, mirroring it — or making your own rule?");

    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "pattern-lab",
      detail: \`\${tool}:r\${row}c\${col}:\${colour}\`,
    });
  }

  function loadStarter(nextStarter: Starter) {
    setStarter(nextStarter);
    setGrid(starterGrid(nextStarter));
    const line = nextStarter === "mirror"
      ? "I started a mirror build. Break the symmetry or make it stronger."
      : nextStarter === "stairs"
        ? "I made a growing staircase. Can you continue the idea somewhere else?"
        : nextStarter === "repeat"
          ? "This one repeats across the table. Change one block and see how obvious the rule still feels."
          : "This is more city than sequence. Can you find a pattern inside the mess?";
    onBuddyLine(line);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "pattern-lab",
      detail: \`starter:\${nextStarter}\`,
    });
  }

  function askBuddy() {
    let line = "I can see a structure, but I cannot reduce it to one simple rule yet. Tell me what you were trying to do.";

    if (analysis.totalBlocks === 0) {
      line = "There is nothing here yet. Put down one block and let the rule grow from there.";
    } else if (analysis.mirror && analysis.totalBlocks > 2) {
      line = "I can see left-and-right mirror symmetry. If you change one side only, I should notice the break.";
    } else if (analysis.staircase) {
      line = "I can see a height rule: one, two, three, four, five. You turned counting into shape.";
    } else if (analysis.repeatedRows) {
      line = "I can see the same row repeated through space. What happens if one row starts mutating?";
    } else if (analysis.maxHeight >= 5 && analysis.colourCount >= 4) {
      line = "I see height and colour changing at the same time. There might be more than one rule hiding here.";
    } else if (analysis.maxHeight >= 4) {
      line = "Height seems important in this build. Are the towers growing, grouping, or just making a skyline?";
    } else if (analysis.colourCount >= 3) {
      line = "Colour seems to be carrying part of the pattern. Would the rule survive if every block were the same colour?";
    }

    onBuddyLine(line);
    recordLearningEvent({
      kind: "discover_reflected",
      source: "discover",
      activityId: "pattern-lab",
      detail: \`notice:blocks=\${analysis.totalBlocks};mirror=\${analysis.mirror};stairs=\${analysis.staircase};repeat=\${analysis.repeatedRows}\`,
    });
  }

  function clear() {
    setGrid(emptyGrid());
    onBuddyLine("Empty table. You can start with one block, one tower, one colour — anything.");
  }

  return (
    <section className="discover-world pattern-lab block-lab" aria-labelledby="pattern-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Build a rule in space</p>
          <h2 id="pattern-title">Block lab</h2>
          <p>Stack bricks like a tiny construction set. Make symmetry, repetition, growing towers, colour rules — or something Buddy cannot name yet.</p>
        </div>
        <div className="discover-topic-chips" aria-label="Ideas hiding in this activity">
          <span>3D space</span><span>symmetry</span><span>sequences</span><span>logic</span><span>design</span>
        </div>
      </div>

      <div className="block-starter-strip" aria-label="Starting ideas">
        {([
          ["mirror", "Mirror"],
          ["stairs", "Growing stairs"],
          ["repeat", "Repeat"],
          ["city", "Block city"],
        ] as Array<[Starter, string]>).map(([id, label]) => (
          <button type="button" key={id} className={starter === id ? "active" : ""} onClick={() => loadStarter(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className={\`block-workbench\${flipped ? " flipped" : ""}\`}>
        <div className="block-stage" aria-label="3D block building table">
          <div className="block-ground" aria-hidden="true" />

          {grid.flatMap((stack, index) => {
            const row = Math.floor(index / COLS);
            const col = index % COLS;
            return stack.map((blockColour, level) => (
              <IsoBlock
                key={\`\${row}-\${col}-\${level}-\${blockColour}\`}
                row={row}
                col={col}
                level={level}
                colour={blockColour}
                flipped={flipped}
              />
            ));
          })}

          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => (
              <button
                type="button"
                key={\`hit-\${row}-\${col}\`}
                className="block-cell-hit"
                style={cellPosition(row, col, 0, flipped)}
                onClick={() => editCell(row, col)}
                aria-label={\`\${tool === "add" ? "Add" : "Remove"} block at row \${row + 1}, column \${col + 1}\`}
              />
            )),
          )}
        </div>

        <aside className="block-tools">
          <div className="block-tool-group">
            <span>Tool</span>
            <div className="block-tool-toggle">
              <button type="button" className={tool === "add" ? "active" : ""} onClick={() => setTool("add")}>+ Stack</button>
              <button type="button" className={tool === "remove" ? "active" : ""} onClick={() => setTool("remove")}>− Remove</button>
            </div>
          </div>

          <div className="block-tool-group">
            <span>Brick colour</span>
            <div className="block-colours">
              {colours.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={colour === item.id ? "active" : ""}
                  onClick={() => {
                    setColour(item.id);
                    setTool("add");
                  }}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span style={{ background: item.value }} />
                </button>
              ))}
            </div>
          </div>

          <div className="block-readout">
            <span>Your build</span>
            <strong>{analysis.totalBlocks} block{analysis.totalBlocks === 1 ? "" : "s"}</strong>
            <p>Tallest stack: {analysis.maxHeight}. Tap a square to {tool === "add" ? "stack another brick" : "take the top brick away"}.</p>
          </div>

          <button type="button" className="discover-secondary" onClick={() => setFlipped((value) => !value)}>
            <ArrowClockwise size={18} /> Turn the table
          </button>
        </aside>
      </div>

      <div className="discover-world-actions">
        <button type="button" className="discover-primary" onClick={askBuddy}>
          <MagicWand size={20} /> Buddy, what do you notice?
        </button>
        <button type="button" className="discover-secondary" onClick={clear}>
          Clear the table
        </button>
      </div>
    </section>
  );
}

function cellPosition(row: number, col: number, level: number, flipped: boolean): CSSProperties {
  const viewCol = flipped ? COLS - 1 - col : col;
  const x = (viewCol - row) * 42;
  const y = 72 + (viewCol + row) * 22 - level * 26;
  return {
    left: \`calc(50% + \${x}px)\`,
    top: y,
  };
}

function IsoBlock({
  row,
  col,
  level,
  colour,
  flipped,
}: {
  row: number;
  col: number;
  level: number;
  colour: BlockColour;
  flipped: boolean;
}) {
  const value = colours.find((item) => item.id === colour)?.value ?? "var(--buddy-character)";
  const style = {
    ...cellPosition(row, col, level, flipped),
    "--block-colour": value,
  } as CSSProperties;

  return (
    <motion.span
      className="iso-block"
      style={style}
      initial={{ y: -16, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 250, damping: 18 }}
      aria-hidden="true"
    >
      <i className="iso-top"><b /><b /></i>
      <i className="iso-left" />
      <i className="iso-right" />
    </motion.span>
  );
}
