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

const alignment = await importTsModule("../lib/literacy/grapheme-phoneme.ts");
const review = await importTsModule("../lib/literacy/sound-review.ts");

const fixtures = [
  { word: "cat", ipa: "k ˈæ t", status: "safe-to-explain" },
  { word: "rain", ipa: "ɹ ˈeɪ n", status: "safe-to-explain", feature: ["ai", "eɪ"] },
  { word: "feet", ipa: "f ˈiː t", status: "safe-to-explain", feature: ["ee", "iː"] },
  { word: "night", ipa: "n ˈaɪ t", status: "safe-to-explain", feature: ["igh", "aɪ"] },
  { word: "boat", ipa: "b ˈəʊ t", status: "safe-to-explain", feature: ["oa", "əʊ"] },
  { word: "boot", ipa: "b ˈuː t", status: "safe-to-explain", feature: ["oo", "uː"] },
  { word: "look", ipa: "l ˈʊ k", status: "safe-to-explain", feature: ["oo", "ʊ"] },
  { word: "thin", ipa: "θ ˈɪ n", status: "safe-to-explain", feature: ["th", "θ"] },
  { word: "then", ipa: "ð ˈe n", status: "safe-to-explain", feature: ["th", "ð"] },
  { word: "ring", ipa: "ɹ ˈɪ ŋ", status: "safe-to-explain", feature: ["ng", "ŋ"] },
  { word: "cow", ipa: "k ˈaʊ", status: "safe-to-explain", feature: ["ow", "aʊ"] },
  { word: "coin", ipa: "k ˈɔɪ n", status: "safe-to-explain", feature: ["oi", "ɔɪ"] },
  { word: "fork", ipa: "f ˈɔː k", status: "safe-to-explain", feature: ["or", "ɔː"] },
  { word: "hurt", ipa: "h ˈɜː t", status: "safe-to-explain", feature: ["ur", "ɜː"] },

  // These can be aligned by Buddy, but the correspondence is not in the first
  // reviewed teaching whitelist. Technical alignment must not become a clue.
  { word: "lead", ipa: "l ˈiː d", status: "do-not-infer" },
  { word: "day", ipa: "d ˈeɪ", status: "do-not-infer" },
  { word: "boy", ipa: "b ˈɔɪ", status: "do-not-infer" },
  { word: "out", ipa: "ˈaʊ t", status: "do-not-infer" },
  { word: "though", ipa: "ð ˈəʊ", status: "do-not-infer" },

  // No neat alignment: keep the existing irregular route.
  { word: "tear", ipa: "t ˈɪə", status: "irregular" },
  { word: "tear", ipa: "t ˈɛə", status: "irregular" },
  { word: "one", ipa: "w ˈʌ n", status: "irregular" },
];

const cases = fixtures.map((fixture) => [
  `${fixture.word} (${fixture.ipa}) is ${fixture.status}`,
  () => {
    const result = alignment.alignGraphemesToPhonemes(fixture.word, fixture.ipa);
    if (fixture.status === "irregular") {
      assert.equal(result, null);
      return;
    }

    assert.ok(result, `expected ${fixture.word} to align`);
    const reviewed = review.reviewSoundAlignment(result.segments);
    assert.equal(reviewed.status, fixture.status);

    if (fixture.feature) {
      const [letters, phonemes] = fixture.feature;
      const segment = result.segments.find(
        (item) => item.letters === letters && item.phonemes === phonemes,
      );
      assert.ok(segment, `expected ${letters}/${phonemes} segment for ${fixture.word}`);
      assert.ok(review.reviewedSoundNote(segment), `expected reviewed child note for ${letters}/${phonemes}`);
    }
  },
]);

cases.push([
  "an unknown correspondence never gets a reviewed note",
  () => assert.equal(review.reviewedSoundNote({ letters: "ough", phonemes: "əʊ" }), null),
]);

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

console.log(`\n${cases.length - failed}/${cases.length} reviewed sound checks passing.`);
if (failed > 0) process.exitCode = 1;
