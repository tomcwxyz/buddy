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

const confidence = await importTsModule("../lib/ocr/confidence.ts");
const recovery = await importTsModule("../lib/ocr/recovery.ts");

function word(id, text, confidenceScore, x0, y0, x1, y1, lineText) {
  return {
    id,
    text,
    confidence: confidenceScore,
    bbox: { x0, y0, x1, y1 },
    ...(lineText ? { lineText } : {}),
  };
}

function repeatedWords(count, confidenceScore = 90) {
  return Array.from({ length: count }, (_, index) =>
    word(`w-${index}`, `word${index}`, confidenceScore, index * 12, 0, index * 12 + 10, 10),
  );
}

const cases = [
  ["17 is rejected", () => assert.equal(confidence.ocrConfidenceBand(17), "reject")],
  ["18 enters low-confidence recovery", () => assert.equal(confidence.ocrConfidenceBand(18), "low")],
  ["54 remains low confidence", () => assert.equal(confidence.ocrConfidenceBand(54), "low")],
  ["55 becomes a trusted medium page word", () => assert.equal(confidence.ocrConfidenceBand(55), "medium")],
  ["79 remains medium confidence", () => assert.equal(confidence.ocrConfidenceBand(79), "medium")],
  ["80 becomes high confidence", () => assert.equal(confidence.ocrConfidenceBand(80), "high")],
  ["low page OCR is not boxed", () => assert.equal(confidence.shouldBoxPageWord({ text: "window", confidence: 54 }), false)],
  ["medium page OCR is boxed", () => assert.equal(confidence.shouldBoxPageWord({ text: "window", confidence: 55 }), true)],
  ["non-word noise is not boxed", () => assert.equal(confidence.shouldBoxPageWord({ text: "1234", confidence: 99 }), false)],
  ["low words remain eligible for recovery", () => assert.equal(confidence.keepPageWord({ text: "window", confidence: 30 }), true)],
  ["focused OCR below 35 is refused", () => assert.equal(confidence.focusedWordIsUsable(34), false)],
  ["focused OCR at 35 is usable", () => assert.equal(confidence.focusedWordIsUsable(35), true)],
  [
    "short pages trigger sparse recovery",
    () => assert.deepEqual(
      recovery.decideSparseRecovery(repeatedWords(12), repeatedWords(12)),
      { run: true, reason: "few-trusted-words" },
    ),
  ],
  [
    "healthy larger pages stay single-pass",
    () => assert.deepEqual(
      recovery.decideSparseRecovery(repeatedWords(30), repeatedWords(30)),
      { run: false, reason: "healthy" },
    ),
  ],
  [
    "larger pages with a meaningful weak tail trigger recovery",
    () => {
      const trusted = repeatedWords(30);
      const weak = repeatedWords(6, 40).map((item, index) => ({ ...item, id: `weak-${index}`, text: `weak${index}` }));
      assert.deepEqual(
        recovery.decideSparseRecovery([...trusted, ...weak], trusted),
        { run: true, reason: "too-many-weak-words" },
      );
    },
  ],
  [
    "a small weak tail does not force a second pass",
    () => {
      const trusted = repeatedWords(30);
      const weak = repeatedWords(3, 40).map((item, index) => ({ ...item, id: `weak-${index}`, text: `weak${index}` }));
      assert.deepEqual(
        recovery.decideSparseRecovery([...trusted, ...weak], trusted),
        { run: false, reason: "healthy" },
      );
    },
  ],
  [
    "overlapping duplicate boxes collapse to the stronger reading",
    () => {
      const primary = [word("auto-1", "window", 72, 10, 10, 60, 30, "The window was open.")];
      const sparse = [word("sparse-1", "window", 91, 12, 10, 62, 31)];
      const merged = recovery.mergeOcrWords(primary, sparse);
      assert.equal(merged.length, 1);
      assert.equal(merged[0].confidence, 91);
      assert.equal(merged[0].id, "auto-1");
      assert.equal(merged[0].lineText, "The window was open.");
    },
  ],
  [
    "new sparse words are retained",
    () => {
      const primary = [word("auto-1", "the", 90, 10, 10, 35, 30)];
      const sparse = [word("sparse-1", "window", 88, 50, 10, 100, 30)];
      const merged = recovery.mergeOcrWords(primary, sparse);
      assert.equal(merged.length, 2);
      assert.deepEqual(merged.map((item) => item.text), ["the", "window"]);
    },
  ],
  [
    "nearby primary lines can supply context to recovered words",
    () => {
      const recovered = word("sparse-1", "window", 88, 50, 12, 100, 32);
      const anchors = [word("auto-1", "the", 90, 10, 10, 35, 30, "The window was open.")];
      assert.equal(recovery.nearestLineText(recovered, anchors), "The window was open.");
    },
  ],
  [
    "distant lines are not attached as false context",
    () => {
      const recovered = word("sparse-1", "window", 88, 50, 200, 100, 220);
      const anchors = [word("auto-1", "the", 90, 10, 10, 35, 30, "The window was open.")];
      assert.equal(recovery.nearestLineText(recovered, anchors), null);
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

console.log(`\n${cases.length - failed}/${cases.length} OCR checks passing.`);
if (failed > 0) process.exitCode = 1;
