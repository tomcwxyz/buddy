#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

async function importTsModule(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  return import(moduleUrl);
}

const spelling = await importTsModule("../lib/practice/spelling-import.ts");
const progress = await importTsModule("../lib/practice/progress.ts");
const coaster = await importTsModule("../lib/practice/coaster.ts");

const fakeWord = (text, x0, y0) => ({
  text,
  bbox: { x0, y0, x1: x0 + 40, y1: y0 + 15 },
});

const cases = [
  [
    "OCR candidates are ordered, cleaned and deduplicated",
    () => assert.deepEqual(
      spelling.extractSpellingCandidates([
        fakeWord("Through", 10, 40),
        fakeWord("because", 10, 10),
        fakeWord("because,", 70, 10),
        fakeWord("friend.", 10, 70),
        fakeWord("123", 10, 100),
      ]),
      ["because", "through", "friend"],
    ),
  ],
  [
    "apostrophes and hyphens remain valid spelling words",
    () => {
      assert.equal(spelling.normaliseSpellingWord("  Don’t  "), "don't");
      assert.equal(spelling.isUsableSpellingWord("well-being"), true);
    },
  ],
  [
    "coaster progress counts unique exploration, not correctness",
    () => {
      const events = [
        { id: "1", at: "", kind: "practice_explored", word: "because", practiceSetId: "a" },
        { id: "2", at: "", kind: "practice_explored", word: "because", practiceSetId: "a" },
        { id: "3", at: "", kind: "practice_known", word: "through", practiceSetId: "a" },
        { id: "4", at: "", kind: "practice_explored", word: "friend", practiceSetId: "b" },
      ];
      assert.deepEqual([...progress.exploredWordsForPracticeSet(events, "a")], ["because"]);
    },
  ],
  [
    "a short familiar-shaped word still earns real track choices",
    () => {
      const options = coaster.coasterPieceOptionsForWord({ word: "cat", chunks: 1, syllables: 1 });
      assert.equal(options.length >= 3, true);
      assert.equal(options.includes("straight"), true);
    },
  ],
  [
    "a word with lots to notice can unlock loops without any correctness input",
    () => {
      const options = coaster.coasterPieceOptionsForWord({
        word: "extraordinary",
        chunks: 4,
        syllables: 5,
        signals: { together: true },
      });
      assert.equal(options.includes("loop"), true);
      assert.equal(options.includes("double-loop"), true);
    },
  ],
  [
    "exploring a word opens more construction choices without correctness",
    () => {
      const quiet = coaster.coasterPieceOptionsForWord({ word: "cat", chunks: 1, syllables: 1 });
      const explored = coaster.coasterPieceOptionsForWord({
        word: "because",
        chunks: 3,
        syllables: 2,
        signals: { clue: true, meaning: true },
      });
      assert.equal(quiet.includes("straight"), true);
      assert.equal(explored.includes("launch"), true);
      assert.equal(explored.length > quiet.length, true);
    },
  ],
  [
    "launch and brake pieces change ride speed",
    () => {
      const launch = coaster.speedAfterPiece(20, "launch");
      const brake = coaster.speedAfterPiece(launch, "brake");
      assert.equal(launch > 20, true);
      assert.equal(brake < launch, true);
    },
  ],
  [
    "loops require momentum but straight track does not",
    () => {
      assert.equal(coaster.canEnterPiece(10, "straight"), true);
      assert.equal(coaster.canEnterPiece(10, "loop"), false);
      assert.equal(coaster.canEnterPiece(24, "double-loop"), true);
    },
  ],
  [
    "track geometry includes every placed piece",
    () => {
      const path = coaster.trackPathForKinds(["straight", "hill", "loop"]);
      assert.match(path, /^M 28 146 L 76 146/);
      assert.match(path, /C/);
      assert.equal(coaster.coasterViewBoxWidth(3) >= 620, true);
    },
  ],
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    run();
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} practice-import checks passing.`);
if (failed > 0) process.exitCode = 1;
