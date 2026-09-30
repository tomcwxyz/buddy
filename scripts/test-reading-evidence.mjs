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

const evidence = await importTsModule("../lib/reading/evidence.ts");
const memory = await importTsModule("../lib/reading/book-memory.ts");

const cases = [
  [
    "visual evidence resolves normally",
    () => {
      const result = evidence.resolveReadingEvidence([
        evidence.visualEvidence("concept", 78, "auto"),
      ]);
      assert.equal(result.text, "concept");
      assert.equal(result.resolvedBy, "visual");
    },
  ],
  [
    "language assistance cannot invent an ungrounded candidate",
    () => {
      const result = evidence.resolveReadingEvidence([
        { source: "language-assisted", candidate: "heavens", confidence: 0.99, method: "tiny-lm" },
      ]);
      assert.equal(result, null);
    },
  ],
  [
    "language evidence can strengthen a visually grounded candidate",
    () => {
      const result = evidence.resolveReadingEvidence([
        evidence.visualEvidence("heavens", 52, "auto"),
        { source: "language-assisted", candidate: "heavens", confidence: 0.88, method: "tiny-lm" },
        evidence.visualEvidence("heavems", 56, "threshold"),
      ]);
      assert.equal(result.text, "heavens");
      assert.equal(result.alternatives[0].text, "heavems");
    },
  ],
  [
    "reader correction remains the strongest explicit evidence",
    () => {
      const result = evidence.resolveReadingEvidence([
        evidence.visualEvidence("kimokeo", 58, "auto"),
        { source: "reader-corrected", candidate: "Kimokeo", confidence: 1, evidenceId: "correction-1" },
        { source: "known-text", candidate: "kimo keo", confidence: 0.78, sourceId: "source-a" },
      ]);
      assert.equal(result.text, "kimokeo");
      assert.equal(result.resolvedBy, "reader-corrected");
    },
  ],
  [
    "passage fingerprints are compact hashes rather than retained prose",
    () => {
      const text = "Kimokeo thanked the elders before the voyage across the ocean";
      const fingerprints = memory.passageFingerprints(text);
      assert.equal(fingerprints.length > 0, true);
      assert.equal(fingerprints.some((value) => value.includes("kimokeo")), false);
      assert.equal(fingerprints.some((value) => value.includes("elders")), false);
    },
  ],
  [
    "a later passage can match a remembered local book context",
    () => {
      const now = "2026-09-30T20:00:00.000Z";
      let book = memory.createBookMemory("book-1", "Ocean book", now);
      book = memory.observeBookPassage(
        book,
        "Kimokeo thanked the elders before the voyage across the ocean and talked about the heavens",
        { confirmed: true, now },
      );
      const match = memory.matchBookMemory(
        "Kimokeo thanked the elders before the voyage across the ocean",
        [book],
        0.1,
      );
      assert.equal(match.record.id, "book-1");
      assert.equal(match.similarity > 0.1, true);
    },
  ],
  [
    "repeated reader corrections become stronger local candidates",
    () => {
      const now = "2026-09-30T20:00:00.000Z";
      let book = memory.createBookMemory("book-1", undefined, now);
      book = memory.rememberBookCorrection(book, "Kimokco", "Kimokeo", now);
      const once = memory.correctionCandidate(book, "Kimokco");
      book = memory.rememberBookCorrection(book, "Kimokco", "Kimokeo", "2026-09-30T20:01:00.000Z");
      const twice = memory.correctionCandidate(book, "Kimokco");
      assert.equal(once.text, "kimokeo");
      assert.equal(twice.observations, 2);
      assert.equal(twice.confidence > once.confidence, true);
    },
  ],
  [
    "confirmed unusual terms become recognisable book vocabulary",
    () => {
      const now = "2026-09-30T20:00:00.000Z";
      let book = memory.createBookMemory("book-1", undefined, now);
      book = memory.observeBookPassage(book, "Kimokeo spoke with the kupuna", { confirmed: true, now });
      book = memory.observeBookPassage(book, "Kimokeo thanked the kupuna", { confirmed: true, now });
      const term = memory.likelyBookTerm(book, "Kimokeo");
      assert.equal(term.token, "kimokeo");
      assert.equal(term.confirmedCount, 2);
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

console.log(`\n${cases.length - failed}/${cases.length} reading-evidence checks passing.`);
if (failed > 0) process.exitCode = 1;
