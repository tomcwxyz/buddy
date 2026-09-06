#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/ocr/confidence.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const confidence = await import(moduleUrl);

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

console.log(`\n${cases.length - failed}/${cases.length} OCR confidence checks passing.`);
if (failed > 0) process.exitCode = 1;
