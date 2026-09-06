#!/usr/bin/env node

const DEFAULT_BASE_URL = process.env.BUDDY_TEST_BASE_URL || "http://localhost:3000";

const cases = [
  {
    id: "plant-living",
    word: "plant",
    context: "The plant grew towards the window and opened a flower.",
    assertions: {
      recognised: true,
      partOfSpeech: "noun",
      sourceOneOf: ["buddy-curated"],
      meaningIncludesAny: ["living", "grows"],
      remoteFallback: false,
    },
  },
  {
    id: "sold-verb",
    word: "sold",
    context: "The most Old Peculier ever sold in a day was sold there, I believe.",
    assertions: {
      recognised: true,
      partOfSpeech: "verb",
      lemma: "sell",
      meaningExcludes: ["salary", "military pay"],
      remoteFallback: false,
    },
  },
  {
    id: "spring-season",
    word: "spring",
    context: "Flowers appear in spring when the weather gets warmer.",
    assertions: {
      recognised: true,
      partOfSpeech: "noun",
      lemma: "spring",
      sourceOneOf: ["buddy-curated"],
      meaningIncludesAny: ["season", "winter"],
      remoteFallback: false,
    },
  },
  {
    id: "morning-base-form",
    word: "morning",
    context: "We woke early in the morning and watched the sunrise.",
    assertions: {
      recognised: true,
      partOfSpeech: "noun",
      lemma: "morning",
      meaningIncludesAny: ["morning", "noon", "day"],
    },
  },
  {
    id: "light-weight",
    word: "light",
    context: "The empty bag was light enough for me to carry.",
    assertions: {
      recognised: true,
      partOfSpeech: "adjective",
      sourceOneOf: ["buddy-curated"],
      meaningIncludesAny: ["not heavy", "easy to lift", "easy to carry"],
      remoteFallback: false,
    },
  },
  {
    id: "record-verb",
    word: "record",
    context: "Please record the birdsong so we can listen to it later.",
    assertions: {
      recognised: true,
      partOfSpeech: "verb",
      pronunciationAvailable: true,
      remoteFallback: false,
    },
  },
  {
    id: "record-noun",
    word: "record",
    context: "The runner broke the school record by three seconds.",
    assertions: {
      recognised: true,
      partOfSpeech: "noun",
      pronunciationAvailable: true,
      remoteFallback: false,
    },
  },
  {
    id: "children-plural",
    word: "children",
    context: "The children played in the park after school.",
    assertions: {
      recognised: true,
      partOfSpeech: "noun",
      lemma: "child",
      form: "plural",
      meaningIncludesAny: ["child", "young"],
    },
  },
  {
    id: "although-function-word",
    word: "although",
    context: "Although it was raining, we still went for a walk.",
    assertions: {
      recognised: true,
      meaningIncludesAny: ["although", "despite", "contrast", "even"],
    },
  },
  {
    id: "equation-school",
    word: "equation",
    context: "Solve the equation 3 + x = 8.",
    assertions: {
      recognised: true,
      partOfSpeech: "noun",
      meaningIncludesAny: ["equal", "mathematical", "statement"],
      remoteFallback: false,
    },
  },
  {
    id: "queue-pronunciation",
    word: "queue",
    context: "We waited in a queue for the bus.",
    assertions: {
      recognised: true,
      partOfSpeech: "noun",
      meaningIncludesAny: ["line", "wait"],
      pronunciationAvailable: true,
    },
  },
  {
    id: "ocr-noise-guardrail",
    word: "blorf",
    context: "The blorf sat on the mat.",
    assertions: {
      recognised: false,
    },
  },
];

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function normaliseBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

function evaluate(result, assertions) {
  const failures = [];
  const meaning = String(result.meaning || "").toLocaleLowerCase("en-GB");

  if (typeof assertions.recognised === "boolean" && Boolean(result.recognisedWord) !== assertions.recognised) {
    failures.push(`recognised=${Boolean(result.recognisedWord)} (expected ${assertions.recognised})`);
  }
  if (assertions.partOfSpeech && result.partOfSpeech !== assertions.partOfSpeech) {
    failures.push(`partOfSpeech=${result.partOfSpeech ?? "null"} (expected ${assertions.partOfSpeech})`);
  }
  if (assertions.lemma && result.morphology?.lemma !== assertions.lemma) {
    failures.push(`lemma=${result.morphology?.lemma ?? "null"} (expected ${assertions.lemma})`);
  }
  if (assertions.form && result.morphology?.form !== assertions.form) {
    failures.push(`form=${result.morphology?.form ?? "null"} (expected ${assertions.form})`);
  }
  if (assertions.sourceOneOf?.length && !assertions.sourceOneOf.includes(result.source)) {
    failures.push(`source=${result.source ?? "null"} (expected one of ${assertions.sourceOneOf.join(", ")})`);
  }
  if (typeof assertions.remoteFallback === "boolean" && Boolean(result.corpus?.remoteFallback) !== assertions.remoteFallback) {
    failures.push(`remoteFallback=${Boolean(result.corpus?.remoteFallback)} (expected ${assertions.remoteFallback})`);
  }
  if (assertions.meaningIncludesAny?.length) {
    const matched = assertions.meaningIncludesAny.some((fragment) =>
      meaning.includes(fragment.toLocaleLowerCase("en-GB")),
    );
    if (!matched) failures.push(`meaning missing one of: ${assertions.meaningIncludesAny.join(", ")}`);
  }
  for (const fragment of assertions.meaningExcludes ?? []) {
    if (meaning.includes(fragment.toLocaleLowerCase("en-GB"))) {
      failures.push(`meaning unexpectedly includes “${fragment}”`);
    }
  }
  if (assertions.pronunciationAvailable && !result.pronunciation?.ipa) {
    failures.push("British pronunciation is missing");
  }

  return failures;
}

async function runCase(baseUrl, item) {
  const url = new URL("/api/word", `${baseUrl}/`);
  url.searchParams.set("word", item.word);
  url.searchParams.set("context", item.context);
  url.searchParams.set("_regression", Date.now().toString());

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    return { item, failures: [`HTTP ${response.status}`], result: null };
  }

  const result = await response.json();
  return { item, failures: evaluate(result, item.assertions), result };
}

async function main() {
  const baseUrl = normaliseBaseUrl(argValue("base-url") || DEFAULT_BASE_URL);
  const only = argValue("only");
  const selected = only ? cases.filter((item) => item.id === only) : cases;

  if (selected.length === 0) {
    console.error(`No regression case named “${only}”.`);
    process.exitCode = 2;
    return;
  }

  console.log(`Buddy word regressions → ${baseUrl}`);
  console.log(`Running ${selected.length} sentinel case${selected.length === 1 ? "" : "s"}…\n`);

  const results = [];
  let next = 0;
  const workers = Math.min(4, selected.length);

  async function worker() {
    while (next < selected.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await runCase(baseUrl, selected[index]);
      } catch (error) {
        results[index] = {
          item: selected[index],
          failures: [error instanceof Error ? error.message : "Unknown request failure"],
          result: null,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));

  let failed = 0;
  for (const { item, failures, result } of results) {
    if (failures.length === 0) {
      const resolution = result?.morphology?.lemma && result.morphology.lemma !== result.word
        ? ` → ${result.morphology.lemma}`
        : "";
      console.log(`✓ ${item.id}: ${item.word}${resolution}`);
      continue;
    }

    failed += 1;
    console.log(`✗ ${item.id}: ${item.word}`);
    for (const failure of failures) console.log(`  - ${failure}`);
    if (result?.meaning) console.log(`  - meaning: ${result.meaning}`);
  }

  console.log(`\n${selected.length - failed}/${selected.length} passing.`);
  if (failed > 0) process.exitCode = 1;
}

await main();
