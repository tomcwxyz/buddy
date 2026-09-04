#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const VERSION = "3.0.1";
const SOURCE_COMMIT = "1062be14adc96c358f2087ac5449d72130c7a6f4";
const SOURCE_BLOB_SHA = "51a54c553812b06a8f464f5aa85f4df2e6edb645";
const SOURCE_URL = `https://raw.githubusercontent.com/JoseLlarena/Britfone/${SOURCE_COMMIT}/britfone.main.${VERSION}.csv`;
const DEFAULT_OUTPUT = resolve("data/lexicon/generated", `britfone.en-GB.v${VERSION}.json`);

function parseArgs(argv) {
  const args = { input: null, output: DEFAULT_OUTPUT };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--input") args.input = argv[++index] ?? null;
    if (value === "--output") args.output = resolve(argv[++index] ?? DEFAULT_OUTPUT);
  }
  return args;
}

function gitBlobSha(text) {
  const body = Buffer.from(text, "utf8");
  const header = Buffer.from(`blob ${body.length}\0`, "utf8");
  return createHash("sha1").update(header).update(body).digest("hex");
}

function assertPinnedSource(text) {
  const actual = gitBlobSha(text);
  if (actual !== SOURCE_BLOB_SHA) {
    throw new Error(`Britfone source verification failed: expected ${SOURCE_BLOB_SHA}, got ${actual}`);
  }
}

function normaliseHeadword(value) {
  return value
    .replace(/\(\d+\)$/u, "")
    .replaceAll("_", " ")
    .toLocaleLowerCase("en-GB");
}

function parseBritfone(text) {
  const entries = {};
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) continue;
    const comma = line.indexOf(",");
    if (comma <= 0) continue;

    const rawWord = line.slice(0, comma).trim();
    const ipa = line.slice(comma + 1).trim();
    if (!rawWord || !ipa) continue;

    const word = normaliseHeadword(rawWord);
    const pronunciations = entries[word] ?? [];
    if (!pronunciations.includes(ipa)) pronunciations.push(ipa);
    entries[word] = pronunciations;
  }
  return entries;
}

async function sourceText(input) {
  if (input) return readFile(resolve(input), "utf8");

  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Buddy-lexicon-builder/0.1" },
  });
  if (!response.ok) {
    throw new Error(`Could not fetch Britfone ${VERSION}: HTTP ${response.status}`);
  }
  return response.text();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const text = await sourceText(args.input);
  assertPinnedSource(text);
  const entries = parseBritfone(text);
  const payload = {
    schemaVersion: 1,
    locale: "en-GB",
    source: {
      name: "Britfone",
      version: VERSION,
      commit: SOURCE_COMMIT,
      blobSha: SOURCE_BLOB_SHA,
      url: "https://github.com/JoseLlarena/Britfone",
      licence: "MIT",
    },
    generatedAt: new Date().toISOString(),
    entryCount: Object.keys(entries).length,
    entries,
  };

  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, `${JSON.stringify(payload)}\n`, "utf8");
  console.log(`Wrote ${payload.entryCount} British pronunciation entries to ${args.output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
