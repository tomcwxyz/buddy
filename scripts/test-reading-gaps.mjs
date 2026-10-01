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

const gaps = await importTsModule("../lib/reading/gaps.ts");

function word(id, text, x0, x1, order) {
  return {
    id,
    text,
    confidence: 82,
    bbox: { x0, y0: 40, x1, y1: 60 },
    lineId: "line-1",
    paragraphId: "p-1",
    readingOrder: order,
  };
}

const cases = [
  [
    "normal prose spacing does not invent missing words",
    () => {
      const words = [
        word("a", "the", 10, 34, 0),
        word("b", "dog", 42, 68, 1),
        word("c", "ran", 77, 102, 2),
        word("d", "home", 111, 145, 3),
        word("e", "quickly", 154, 203, 4),
      ];
      assert.equal(gaps.detectReadingGaps(words, 500).length, 0);
    },
  ],
  [
    "a large internal line gap is detected as a missing-word region",
    () => {
      const words = [
        word("a", "Kimokeo", 10, 66, 0),
        word("b", "thanked", 74, 126, 1),
        word("c", "the", 134, 156, 2),
        word("d", "elders", 164, 204, 3),
        word("e", "talked", 260, 302, 4),
        word("f", "about", 310, 346, 5),
      ];
      const found = gaps.detectReadingGaps(words, 500);
      assert.equal(found.length, 1);
      assert.equal(found[0].leftWordId, "d");
      assert.equal(found[0].rightWordId, "e");
      assert.equal(found[0].estimatedCharacters >= 3, true);
      assert.equal(found[0].contextBefore.at(-1), "elders");
      assert.equal(found[0].contextAfter[0], "talked");
    },
  ],
  [
    "large spacing after sentence punctuation is not treated as a word gap",
    () => {
      const words = [
        word("a", "We", 10, 28, 0),
        word("b", "left.", 36, 70, 1),
        word("c", "Then", 126, 158, 2),
        word("d", "home", 166, 200, 3),
      ];
      assert.equal(gaps.detectReadingGaps(words, 400).length, 0);
    },
  ],
  [
    "an unresolved gap marks its sentence for checking",
    () => {
      const words = [
        word("a", "the", 10, 34, 0),
        word("b", "elders", 42, 84, 1),
        word("c", "talked", 142, 184, 2),
        word("d", "quietly.", 192, 242, 3),
      ];
      const [gap] = gaps.detectReadingGaps(words, 400);
      assert.ok(gap);
      const sentence = {
        id: "sentence-0",
        text: "the elders talked quietly.",
        wordIds: words.map((item) => item.id),
        bounds: [{ x0: 10, y0: 40, x1: 242, y1: 60 }],
        confidence: 82,
        weakWordShare: 0,
        suspiciousWordShare: 0,
        uncertain: false,
        quality: "good",
      };
      const [marked] = gaps.markSentencesWithDetectedGaps([sentence], [gap]);
      assert.equal(marked.quality, "check");
      assert.equal(marked.uncertain, true);
    },
  ],
  [
    "candidate length uses the photographed gap as a real constraint",
    () => {
      const words = [
        word("a", "elders", 10, 52, 0),
        word("b", "talked", 82, 124, 1),
        word("c", "about", 132, 168, 2),
      ];
      const [gap] = gaps.detectReadingGaps(words, 300);
      assert.ok(gap);
      assert.equal(gaps.gapCandidateFitsLength(gap, "and"), true);
      assert.equal(gaps.gapCandidateFitsLength(gap, "extraordinary"), false);
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

console.log(`\n${cases.length - failed}/${cases.length} reading-gap checks passing.`);
if (failed > 0) process.exitCode = 1;
