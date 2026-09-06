#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/ocr/geometry.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const geometry = await import(moduleUrl);

function syntheticTextLines(skewDegrees, width = 600) {
  const slope = Math.tan(skewDegrees * Math.PI / 180);
  const points = [];

  for (let line = 0; line < 6; line += 1) {
    for (let x = 42; x <= width - 42; x += 8) {
      const y = 48 + line * 38 + slope * (x - 42);
      for (const offset of [-1, 0, 1]) points.push({ x, y: y + offset });
    }
  }

  return points;
}

const cases = [
  [
    "clockwise page skew gets an equal anticlockwise correction",
    () => {
      const estimate = geometry.estimateDeskewAngle(syntheticTextLines(2), 600, 320);
      assert.equal(estimate.applied, true);
      assert.ok(Math.abs(estimate.angle - -2) <= 0.5);
      assert.ok(estimate.confidence > 0.12);
    },
  ],
  [
    "anticlockwise page skew gets an equal clockwise correction",
    () => {
      const estimate = geometry.estimateDeskewAngle(syntheticTextLines(-2), 600, 320);
      assert.equal(estimate.applied, true);
      assert.ok(Math.abs(estimate.angle - 2) <= 0.5);
    },
  ],
  [
    "already-horizontal text is left untouched",
    () => {
      const estimate = geometry.estimateDeskewAngle(syntheticTextLines(0), 600, 320);
      assert.equal(estimate.applied, false);
      assert.equal(estimate.angle, 0);
    },
  ],
  [
    "too little evidence never rotates a page",
    () => {
      const estimate = geometry.estimateDeskewAngle(
        Array.from({ length: 80 }, (_, index) => ({ x: index * 2, y: 40 })),
        600,
        320,
      );
      assert.deepEqual(estimate, { angle: 0, candidateAngle: 0, confidence: 0, applied: false });
    },
  ],
  [
    "zero-angle box mapping is an exact identity",
    () => {
      const box = { x0: 120, y0: 80, x1: 220, y1: 112 };
      assert.deepEqual(geometry.mapBoxFromDeskewed(box, 600, 320, 0), box);
    },
  ],
  [
    "mapped boxes stay inside the original photograph",
    () => {
      const mapped = geometry.mapBoxFromDeskewed(
        { x0: 0, y0: 0, x1: 90, y1: 28 },
        600,
        320,
        -4,
      );
      assert.ok(mapped.x0 >= 0);
      assert.ok(mapped.y0 >= 0);
      assert.ok(mapped.x1 <= 600);
      assert.ok(mapped.y1 <= 320);
      assert.ok(mapped.x1 > mapped.x0);
      assert.ok(mapped.y1 > mapped.y0);
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

console.log(`\n${cases.length - failed}/${cases.length} OCR geometry checks passing.`);
if (failed > 0) process.exitCode = 1;
