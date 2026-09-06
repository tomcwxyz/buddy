import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../data/ocr-fixtures");
const validLayouts = new Set(["prose", "worksheet", "early-reader", "mixed"]);
const validRecoverability = new Set(["unknown", "yes", "no"]);

function fail(message) {
  throw new Error(message);
}

function requireCondition(condition, message) {
  if (!condition) fail(message);
}

function normaliseWord(value) {
  return String(value ?? "")
    .toLocaleLowerCase("en-GB")
    .replace(/^[^a-z'-]+|[^a-z'-]+$/gi, "")
    .replace(/'{2,}/g, "'")
    .trim();
}

function isMetric(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function assertWordArray(value, label) {
  requireCondition(Array.isArray(value), `${label} must be an array`);
  for (const word of value) {
    requireCondition(typeof word === "string" && /[a-z]/i.test(word), `${label} contains an invalid word`);
  }
}

function validateFixture(fixture, fileName) {
  const prefix = `${fileName}:`;
  requireCondition(fixture && typeof fixture === "object", `${prefix} fixture must be an object`);
  requireCondition(fixture.version === 2, `${prefix} expected fixture version 2`);
  requireCondition(typeof fixture.label === "string" && fixture.label.trim(), `${prefix} label is required`);
  requireCondition(typeof fixture.sourceFile === "string" && fixture.sourceFile.trim(), `${prefix} sourceFile is required`);
  requireCondition(fixture.imageIncluded === false, `${prefix} imageIncluded must remain false`);
  requireCondition(typeof fixture.expectedText === "string", `${prefix} expectedText must be a string`);
  assertWordArray(fixture.expectedWords, `${prefix} expectedWords`);
  requireCondition(fixture.expectedWords.length > 0, `${prefix} expectedWords must not be empty`);

  const review = fixture.review;
  requireCondition(review && typeof review === "object", `${prefix} review block is required`);
  requireCondition(review.status === "candidate" || review.status === "reviewed", `${prefix} review.status must be candidate or reviewed`);
  requireCondition(validLayouts.has(review.layoutType), `${prefix} review.layoutType is invalid`);
  assertWordArray(review.recoverOnTapWords, `${prefix} review.recoverOnTapWords`);
  assertWordArray(review.mustNotTrustWords, `${prefix} review.mustNotTrustWords`);
  requireCondition(validRecoverability.has(review.interactionRecoverable), `${prefix} review.interactionRecoverable is invalid`);

  const evaluation = fixture.evaluation;
  requireCondition(evaluation && typeof evaluation === "object", `${prefix} evaluation block is required`);
  requireCondition(evaluation.precision === null || isMetric(evaluation.precision), `${prefix} evaluation.precision is invalid`);
  requireCondition(evaluation.recall === null || isMetric(evaluation.recall), `${prefix} evaluation.recall is invalid`);
  requireCondition(Array.isArray(fixture.detectedWords), `${prefix} detectedWords must be an array`);

  if (review.status !== "reviewed") return { reviewed: false };

  requireCondition(typeof review.reviewedAt === "string" && review.reviewedAt.trim(), `${prefix} reviewed fixtures need review.reviewedAt`);
  requireCondition(review.interactionRecoverable !== "unknown", `${prefix} reviewed fixtures must decide whether the child-facing interaction is recoverable`);

  const acceptance = fixture.acceptance;
  requireCondition(acceptance && typeof acceptance === "object", `${prefix} reviewed fixtures need an acceptance block`);
  requireCondition(isMetric(acceptance.minimumPrecision), `${prefix} acceptance.minimumPrecision must be 0..1`);
  requireCondition(isMetric(acceptance.minimumRecall), `${prefix} acceptance.minimumRecall must be 0..1`);
  requireCondition(typeof acceptance.requireRecoverableInteraction === "boolean", `${prefix} acceptance.requireRecoverableInteraction must be boolean`);

  if (evaluation.precision !== null) {
    requireCondition(
      evaluation.precision >= acceptance.minimumPrecision,
      `${prefix} snapshot precision ${evaluation.precision.toFixed(3)} is below reviewed minimum ${acceptance.minimumPrecision.toFixed(3)}`,
    );
  }
  if (evaluation.recall !== null) {
    requireCondition(
      evaluation.recall >= acceptance.minimumRecall,
      `${prefix} snapshot recall ${evaluation.recall.toFixed(3)} is below reviewed minimum ${acceptance.minimumRecall.toFixed(3)}`,
    );
  }
  if (acceptance.requireRecoverableInteraction) {
    requireCondition(review.interactionRecoverable === "yes", `${prefix} reviewed acceptance requires a recoverable child-facing interaction`);
  }

  const trustedWords = new Set(
    fixture.detectedWords
      .map((entry) => normaliseWord(entry?.text))
      .filter((word) => /[a-z]/.test(word)),
  );
  const unsafeTrusted = [...new Set(review.mustNotTrustWords.map(normaliseWord).filter((word) => trustedWords.has(word)))];
  requireCondition(
    unsafeTrusted.length === 0,
    `${prefix} trusted OCR contains words marked must-not-trust: ${unsafeTrusted.join(", ")}`,
  );

  return { reviewed: true };
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

let reviewedCount = 0;
for (const fileName of fixtureFiles) {
  const raw = await readFile(path.join(fixtureDir, fileName), "utf8");
  let fixture;
  try {
    fixture = JSON.parse(raw);
  } catch {
    fail(`${fileName}: invalid JSON`);
  }

  const { reviewed } = validateFixture(fixture, fileName);
  if (reviewed) reviewedCount += 1;
}

console.log(`OCR fixture contract: ${fixtureFiles.length} fixture(s), ${reviewedCount} reviewed.`);
if (fixtureFiles.length === 0) {
  console.log("No reviewed real-page fixtures are checked in yet; use /lab/ocr to create the first candidate set.");
}
