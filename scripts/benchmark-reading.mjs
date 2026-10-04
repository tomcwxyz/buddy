#!/usr/bin/env node

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../data/reading-benchmark");
const requireRealPages = process.argv.includes("--require-real");

async function importTsModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  return import(moduleUrl);
}

const evaluation = await importTsModule("../lib/ocr/evaluation.ts");
const gaps = await importTsModule("../lib/reading/gaps.ts");

function metric(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function formatMetric(value) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function gapKey(leftWordId, rightWordId) {
  return `${leftWordId}::${rightWordId}`;
}

function assertFixture(fixture, fileName) {
  assert.equal(fixture.version, 1, `${fileName}: expected version 1`);
  assert.ok(typeof fixture.id === "string" && fixture.id, `${fileName}: id required`);
  assert.ok(typeof fixture.label === "string" && fixture.label, `${fileName}: label required`);
  assert.ok(["real-page", "synthetic"].includes(fixture.origin), `${fileName}: invalid origin`);
  assert.ok(["prose", "worksheet", "early-reader", "mixed"].includes(fixture.layoutType), `${fileName}: invalid layoutType`);
  assert.ok(Number.isFinite(fixture.pageWidth) && fixture.pageWidth > 0, `${fileName}: pageWidth required`);
  assert.ok(typeof fixture.expectedText === "string" && fixture.expectedText.trim(), `${fileName}: expectedText required`);
  assert.ok(Array.isArray(fixture.words) && fixture.words.length > 0, `${fileName}: words required`);
  assert.ok(Array.isArray(fixture.expectedGaps), `${fileName}: expectedGaps required`);

  for (const word of fixture.words) {
    assert.ok(word.id && typeof word.text === "string", `${fileName}: invalid word`);
    assert.ok(word.bbox && Number.isFinite(word.bbox.x0) && Number.isFinite(word.bbox.x1), `${fileName}: invalid word bbox`);
  }

  for (const expectedGap of fixture.expectedGaps) {
    assert.ok(expectedGap.leftWordId && expectedGap.rightWordId, `${fileName}: expected gap needs word anchors`);
    assert.ok(["recover", "ignore"].includes(expectedGap.disposition), `${fileName}: invalid gap disposition`);
  }
}

function scoreFixture(fixture) {
  const ocr = evaluation.evaluateOcrWords(
    fixture.expectedText,
    fixture.words.map((word) => word.text),
  );

  const detectedGaps = gaps.detectReadingGaps(fixture.words, fixture.pageWidth);
  const expectedRecover = fixture.expectedGaps.filter((gap) => gap.disposition === "recover");
  const expectedKeys = new Set(expectedRecover.map((gap) => gapKey(gap.leftWordId, gap.rightWordId)));
  const detectedKeys = new Set(detectedGaps.map((gap) => gapKey(gap.leftWordId, gap.rightWordId)));

  const truePositiveGaps = [...detectedKeys].filter((key) => expectedKeys.has(key)).length;
  const falsePositiveGaps = [...detectedKeys].filter((key) => !expectedKeys.has(key)).length;
  const missedGaps = expectedRecover.filter((gap) => !detectedKeys.has(gapKey(gap.leftWordId, gap.rightWordId)));

  const recoveryReviews = Array.isArray(fixture.recoveryReviews) ? fixture.recoveryReviews : [];
  const accepted = recoveryReviews.filter((review) => review.outcome === "accepted");
  const correctAccepted = accepted.filter((review) =>
    evaluation.normaliseEvaluationWord(review.candidate ?? "")
      === evaluation.normaliseEvaluationWord(review.expectedWord ?? ""),
  );
  const rejected = recoveryReviews.filter((review) => review.outcome === "rejected");
  const unresolved = recoveryReviews.filter((review) => review.outcome === "unresolved");

  return {
    ocr,
    detectedGaps,
    expectedGapCount: expectedRecover.length,
    truePositiveGaps,
    falsePositiveGaps,
    missedGaps,
    gapRecall: metric(truePositiveGaps, expectedRecover.length),
    gapPrecision: metric(truePositiveGaps, truePositiveGaps + falsePositiveGaps),
    acceptedCount: accepted.length,
    correctAcceptedCount: correctAccepted.length,
    recoveryAccuracy: metric(correctAccepted.length, accepted.length),
    rejectedCount: rejected.length,
    unresolvedCount: unresolved.length,
  };
}

function passesAcceptance(fixture, result) {
  const acceptance = fixture.acceptance ?? {};
  const checks = [
    ["OCR precision", result.ocr.precision, acceptance.minimumOcrPrecision],
    ["OCR recall", result.ocr.recall, acceptance.minimumOcrRecall],
    ["gap precision", result.gapPrecision, acceptance.minimumGapPrecision],
    ["gap recall", result.gapRecall, acceptance.minimumGapRecall],
    ["recovery accuracy", result.recoveryAccuracy, acceptance.minimumRecoveryAccuracy],
  ];

  return checks
    .filter(([, , minimum]) => typeof minimum === "number")
    .map(([label, value, minimum]) => ({
      label,
      value,
      minimum,
      pass: value !== null && value >= minimum,
    }));
}

let entries = [];
try {
  entries = await readdir(fixtureDir, { withFileTypes: true });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const files = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".reading-fixture.json") && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "en-GB"));

const rows = [];
let failed = 0;

for (const fileName of files) {
  const fixture = JSON.parse(await readFile(path.join(fixtureDir, fileName), "utf8"));
  assertFixture(fixture, fileName);
  const result = scoreFixture(fixture);
  const checks = passesAcceptance(fixture, result);
  const failures = checks.filter((check) => !check.pass);
  if (failures.length) failed += 1;

  rows.push({ fileName, fixture, result, checks });

  console.log(`\n${failures.length ? "✗" : "✓"} ${fixture.label} [${fixture.origin}]`);
  console.log(`  OCR: precision ${formatMetric(result.ocr.precision)}, recall ${formatMetric(result.ocr.recall)}`);
  console.log(`  Gaps: precision ${formatMetric(result.gapPrecision)}, recall ${formatMetric(result.gapRecall)} (${result.detectedGaps.length} detected)`);
  if (result.acceptedCount || result.rejectedCount || result.unresolvedCount) {
    console.log(`  Recovery: ${result.correctAcceptedCount}/${result.acceptedCount} accepted candidates correct; ${result.rejectedCount} rejected; ${result.unresolvedCount} unresolved`);
  }
  for (const check of failures) {
    console.log(`  FAIL ${check.label}: ${formatMetric(check.value)} < ${formatMetric(check.minimum)}`);
  }
  if (result.missedGaps.length) {
    console.log(`  Missed gaps: ${result.missedGaps.map((gap) => `${gap.leftWordId}→${gap.rightWordId}`).join(", ")}`);
  }
}

const realRows = rows.filter((row) => row.fixture.origin === "real-page");
const syntheticRows = rows.filter((row) => row.fixture.origin === "synthetic");

function aggregate(selected) {
  const expected = selected.reduce((sum, row) => sum + row.result.expectedGapCount, 0);
  const tp = selected.reduce((sum, row) => sum + row.result.truePositiveGaps, 0);
  const fp = selected.reduce((sum, row) => sum + row.result.falsePositiveGaps, 0);
  const accepted = selected.reduce((sum, row) => sum + row.result.acceptedCount, 0);
  const correct = selected.reduce((sum, row) => sum + row.result.correctAcceptedCount, 0);
  return {
    gapPrecision: metric(tp, tp + fp),
    gapRecall: metric(tp, expected),
    recoveryAccuracy: metric(correct, accepted),
  };
}

const all = aggregate(rows);
console.log("\nBuddy reading benchmark");
console.log(`  Fixtures: ${rows.length} total · ${realRows.length} real-page · ${syntheticRows.length} synthetic`);
console.log(`  Gap precision: ${formatMetric(all.gapPrecision)}`);
console.log(`  Gap recall: ${formatMetric(all.gapRecall)}`);
console.log(`  Accepted recovery accuracy: ${formatMetric(all.recoveryAccuracy)}`);

if (realRows.length === 0) {
  console.log("  NOTE: no reviewed real-page benchmark fixtures are checked in yet.");
  console.log("        Capture difficult pages in /lab/ocr and add their derived fixture snapshots.");
  if (requireRealPages) failed += 1;
}

if (failed > 0) {
  console.error(`\nReading benchmark failed: ${failed} fixture/check group(s) below acceptance.`);
  process.exitCode = 1;
} else {
  console.log("\nReading benchmark passed.");
}
