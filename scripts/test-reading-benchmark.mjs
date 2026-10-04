#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../data/ocr-fixtures");

function fail(message) {
  throw new Error(message);
}

function requireCondition(condition, message) {
  if (!condition) fail(message);
}

function isCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function isWordArray(value) {
  return Array.isArray(value) && value.every((word) => typeof word === "string" && /[a-z]/i.test(word));
}

function normaliseWord(value) {
  return String(value ?? "")
    .toLocaleLowerCase("en-GB")
    .replace(/^[^a-z'-]+|[^a-z'-]+$/gi, "")
    .replace(/'{2,}/g, "'")
    .trim();
}

function uniqueWords(values) {
  return [...new Set((values ?? []).map(normaliseWord).filter(Boolean))];
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function percentage(value) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function f1(precision, recall) {
  if (precision === null || recall === null || precision + recall === 0) return null;
  return (2 * precision * recall) / (precision + recall);
}

function weightedAverage(values) {
  const valid = values.filter((entry) => entry.value !== null && entry.weight > 0);
  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (!totalWeight) return null;
  return valid.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

function validateBenchmark(benchmark, fileName) {
  if (benchmark == null) return null;
  const prefix = `${fileName}: benchmark`;
  requireCondition(typeof benchmark === "object", `${prefix} must be an object`);
  requireCondition(benchmark.version === 1, `${prefix}.version must be 1`);

  const gaps = benchmark.gaps;
  requireCondition(gaps && typeof gaps === "object", `${prefix}.gaps is required`);
  requireCondition(isWordArray(gaps.expectedMissingWords), `${prefix}.gaps.expectedMissingWords must be a word array`);
  requireCondition(isWordArray(gaps.correctlyDetectedWords), `${prefix}.gaps.correctlyDetectedWords must be a word array`);
  requireCondition(isWordArray(gaps.missedGapWords), `${prefix}.gaps.missedGapWords must be a word array`);
  requireCondition(isCount(gaps.falseGapCount), `${prefix}.gaps.falseGapCount must be a non-negative integer`);

  const recovery = benchmark.recovery;
  requireCondition(recovery && typeof recovery === "object", `${prefix}.recovery is required`);
  for (const key of [
    "visuallyRecoveredWords",
    "languageSuggestedWords",
    "readerConfirmedWords",
    "readerRejectedWords",
    "unresolvedWords",
    "automaticallyAcceptedWords",
    "contradictedAutomaticWords",
  ]) {
    requireCondition(isWordArray(recovery[key]), `${prefix}.recovery.${key} must be a word array`);
  }

  const sentences = benchmark.sentences;
  requireCondition(sentences && typeof sentences === "object", `${prefix}.sentences is required`);
  for (const key of ["blockedBefore", "blockedAfter", "checkBefore", "checkAfter", "interactionSteps"]) {
    requireCondition(isCount(sentences[key]), `${prefix}.sentences.${key} must be a non-negative integer`);
  }

  const expected = new Set(uniqueWords(gaps.expectedMissingWords));
  const detected = new Set(uniqueWords(gaps.correctlyDetectedWords));
  const missed = new Set(uniqueWords(gaps.missedGapWords));
  for (const word of detected) {
    requireCondition(expected.has(word), `${prefix}: correctly detected word "${word}" is not in expectedMissingWords`);
  }
  for (const word of missed) {
    requireCondition(expected.has(word), `${prefix}: missed word "${word}" is not in expectedMissingWords`);
  }

  const autoAccepted = new Set(uniqueWords(recovery.automaticallyAcceptedWords));
  for (const word of uniqueWords(recovery.contradictedAutomaticWords)) {
    requireCondition(autoAccepted.has(word), `${prefix}: contradicted automatic word "${word}" was not automatically accepted`);
  }

  return benchmark;
}

function scoreFixture(fixture, fileName) {
  const benchmark = validateBenchmark(fixture.benchmark, fileName);
  if (!benchmark) return null;

  const expectedGaps = uniqueWords(benchmark.gaps.expectedMissingWords);
  const correctGaps = uniqueWords(benchmark.gaps.correctlyDetectedWords);
  const falseGaps = benchmark.gaps.falseGapCount;
  const gapRecall = ratio(correctGaps.length, expectedGaps.length);
  const gapPrecision = ratio(correctGaps.length, correctGaps.length + falseGaps);
  const gapF1 = f1(gapPrecision, gapRecall);

  const languageSuggestions = uniqueWords(benchmark.recovery.languageSuggestedWords);
  const readerRejected = new Set(uniqueWords(benchmark.recovery.readerRejectedWords));
  const acceptedLanguage = languageSuggestions.filter((word) => !readerRejected.has(word));
  const languageAcceptance = ratio(acceptedLanguage.length, languageSuggestions.length);

  const autoAccepted = uniqueWords(benchmark.recovery.automaticallyAcceptedWords);
  const contradictedAutomatic = uniqueWords(benchmark.recovery.contradictedAutomaticWords);
  const automaticSafety = ratio(
    Math.max(0, autoAccepted.length - contradictedAutomatic.length),
    autoAccepted.length,
  );

  const blockedBefore = benchmark.sentences.blockedBefore;
  const blockedAfter = benchmark.sentences.blockedAfter;
  const blockedReduction = blockedBefore > 0
    ? Math.max(0, Math.min(1, (blockedBefore - blockedAfter) / blockedBefore))
    : (blockedAfter === 0 ? 1 : 0);

  const interactionRecoverable = fixture.review?.interactionRecoverable === "yes" ? 1 : 0;
  const precision = fixture.evaluation?.precision ?? null;
  const recall = fixture.evaluation?.recall ?? null;

  const score = weightedAverage([
    { value: precision, weight: 35 },
    { value: recall, weight: 15 },
    { value: gapF1, weight: 20 },
    { value: automaticSafety, weight: 15 },
    { value: blockedReduction, weight: 5 },
    { value: interactionRecoverable, weight: 10 },
  ]);

  return {
    fileName,
    label: fixture.label,
    precision,
    recall,
    gapPrecision,
    gapRecall,
    gapF1,
    languageAcceptance,
    automaticSafety,
    blockedBefore,
    blockedAfter,
    interactionSteps: benchmark.sentences.interactionSteps,
    score,
    contradictedAutomatic,
  };
}

let entries = [];
try {
  entries = await readdir(fixtureDir, { withFileTypes: true });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const fixtureFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".ocr-fixture.json") && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "en-GB"));

const results = [];
for (const fileName of fixtureFiles) {
  const raw = await readFile(path.join(fixtureDir, fileName), "utf8");
  const fixture = JSON.parse(raw);
  if (fixture.review?.status !== "reviewed") continue;
  const scored = scoreFixture(fixture, fileName);
  if (scored) results.push(scored);
}

if (results.length === 0) {
  console.log("Buddy reading benchmark: no reviewed fixtures with benchmark v1 data yet.");
  console.log("Add benchmark review data to real-page .ocr-fixture.json files after testing them in /lab/ocr and /read.");
  process.exit(0);
}

console.log("\nBuddy reading benchmark\n");
console.log("Fixture".padEnd(34), "Prec", "Recall", "Gap F1", "Auto safe", "Score");
for (const result of results) {
  console.log(
    String(result.label ?? result.fileName).slice(0, 32).padEnd(34),
    percentage(result.precision).padStart(6),
    percentage(result.recall).padStart(7),
    percentage(result.gapF1).padStart(7),
    percentage(result.automaticSafety).padStart(9),
    (result.score === null ? "n/a" : `${(result.score * 100).toFixed(1)}`).padStart(6),
  );
}

const aggregate = {
  precision: weightedAverage(results.map((r) => ({ value: r.precision, weight: 1 }))),
  recall: weightedAverage(results.map((r) => ({ value: r.recall, weight: 1 }))),
  gapF1: weightedAverage(results.map((r) => ({ value: r.gapF1, weight: 1 }))),
  automaticSafety: weightedAverage(results.map((r) => ({ value: r.automaticSafety, weight: 1 }))),
  score: weightedAverage(results.map((r) => ({ value: r.score, weight: 1 }))),
  interactionSteps: results.reduce((sum, r) => sum + r.interactionSteps, 0) / results.length,
};

console.log("\nAggregate");
console.log(`  trusted precision: ${percentage(aggregate.precision)}`);
console.log(`  trusted recall:    ${percentage(aggregate.recall)}`);
console.log(`  gap F1:            ${percentage(aggregate.gapF1)}`);
console.log(`  auto-recovery safe:${percentage(aggregate.automaticSafety).padStart(7)}`);
console.log(`  mean interactions: ${aggregate.interactionSteps.toFixed(1)}`);
console.log(`  benchmark score:   ${aggregate.score === null ? "n/a" : (aggregate.score * 100).toFixed(1)} / 100`);

const unsafe = results.flatMap((result) =>
  result.contradictedAutomatic.map((word) => `${result.label ?? result.fileName}: ${word}`),
);
if (unsafe.length > 0) {
  console.error("\nSafety regression: automatically accepted recovery was later contradicted:");
  unsafe.forEach((entry) => console.error(`  - ${entry}`));
  process.exitCode = 1;
}
