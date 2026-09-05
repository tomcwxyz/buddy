"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, CheckCircle, Play, WarningCircle } from "@phosphor-icons/react";
import {
  WORD_COVERAGE_CASES,
  type WordCoverageAssertions,
  type WordCoverageCase,
  type WordCoverageCategory,
} from "@/lib/literacy/coverage-cases";

type WordResult = {
  word: string;
  meaning: string | null;
  recognisedWord?: boolean;
  partOfSpeech?: string | null;
  morphology?: {
    lemma?: string | null;
    form?: string | null;
  };
  pronunciation?: {
    ipa?: string | null;
  };
  corpus?: {
    remoteFallback?: boolean;
    surfaceCuratedMeaningHit?: boolean;
    lemmaCuratedMeaningHit?: boolean | null;
  } | null;
  source?: string;
};

type CaseState = {
  status: "idle" | "loading" | "ready" | "error";
  result?: WordResult;
  failures?: string[];
  error?: string;
};

const categoryLabels: Record<WordCoverageCategory, string> = {
  everyday: "Everyday words with competing meanings",
  school: "School and curriculum-style vocabulary",
  function: "Connecting and function words",
  morphology: "Common word forms and lemmas",
  pronunciation: "Tricky spelling and pronunciation",
};

const categoryNotes: Record<WordCoverageCategory, string> = {
  everyday: "Common words where the sentence should decide between ordinary senses.",
  school: "Words likely to appear in maths, science and general classroom reading.",
  function: "High-value connectors that broad noun/verb dictionaries often cover poorly.",
  morphology: "Regular and irregular forms that should resolve back to the useful base word.",
  pronunciation: "Words where British pronunciation evidence matters because spelling alone is misleading.",
};

function evaluate(result: WordResult, assertions: WordCoverageAssertions) {
  const failures: string[] = [];
  const meaning = result.meaning?.toLocaleLowerCase("en-GB") ?? "";

  if (typeof assertions.recognised === "boolean" && Boolean(result.recognisedWord) !== assertions.recognised) {
    failures.push(`recognised should be ${assertions.recognised ? "yes" : "no"}`);
  }
  if (assertions.partOfSpeech && result.partOfSpeech !== assertions.partOfSpeech) {
    failures.push(`part of speech should be ${assertions.partOfSpeech}`);
  }
  if (assertions.lemma && result.morphology?.lemma !== assertions.lemma) {
    failures.push(`lemma should be ${assertions.lemma}`);
  }
  if (assertions.form && result.morphology?.form !== assertions.form) {
    failures.push(`form should be ${assertions.form}`);
  }
  if (assertions.meaningIncludesAny?.length) {
    const matched = assertions.meaningIncludesAny.some((fragment) =>
      meaning.includes(fragment.toLocaleLowerCase("en-GB")),
    );
    if (!matched) failures.push(`meaning should include one of: ${assertions.meaningIncludesAny.join(", ")}`);
  }
  for (const fragment of assertions.meaningExcludes ?? []) {
    if (meaning.includes(fragment.toLocaleLowerCase("en-GB"))) {
      failures.push(`meaning should not include “${fragment}”`);
    }
  }
  if (assertions.pronunciationAvailable && !result.pronunciation?.ipa) {
    failures.push("British pronunciation should be available");
  }

  return failures;
}

export function WordCoverageLab() {
  const [states, setStates] = useState<Record<string, CaseState>>({});
  const [running, setRunning] = useState<string | null>(null);

  const groups = useMemo(() => {
    return (Object.keys(categoryLabels) as WordCoverageCategory[]).map((category) => ({
      category,
      cases: WORD_COVERAGE_CASES.filter((item) => item.category === category),
    }));
  }, []);

  async function runCase(item: WordCoverageCase) {
    setStates((current) => ({ ...current, [item.id]: { status: "loading" } }));
    try {
      const params = new URLSearchParams({ word: item.word, context: item.context });
      const response = await fetch(`/api/word?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as WordResult;
      const failures = evaluate(result, item.assertions);
      setStates((current) => ({
        ...current,
        [item.id]: { status: "ready", result, failures },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStates((current) => ({ ...current, [item.id]: { status: "error", error: message } }));
    }
  }

  async function runCases(items: WordCoverageCase[], key: string) {
    setRunning(key);
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        await runCase(items[index]);
      }
    }

    try {
      const workerCount = Math.min(3, items.length);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    } finally {
      setRunning(null);
    }
  }

  const readyCases = WORD_COVERAGE_CASES.flatMap((item) => {
    const state = states[item.id];
    return state?.status === "ready" && state.result ? [{ item, state }] : [];
  });
  const passed = readyCases.filter(({ state }) => (state.failures?.length ?? 0) === 0).length;
  const recognised = readyCases.filter(({ state }) => state.result?.recognisedWord).length;
  const local = readyCases.filter(({ state }) => state.result?.corpus && !state.result.corpus.remoteFallback).length;
  const pronunciation = readyCases.filter(({ state }) => Boolean(state.result?.pronunciation?.ipa)).length;
  const reviewed = readyCases.filter(({ state }) =>
    state.result?.source === "buddy-curated" || state.result?.source === "buddy-corpus",
  ).length;
  const lemmatised = readyCases.filter(({ state }) =>
    Boolean(state.result?.morphology?.lemma && state.result.morphology.lemma !== state.result.word.toLocaleLowerCase("en-GB")),
  ).length;

  return (
    <section className="word-lab-group" aria-labelledby="broad-word-coverage">
      <div className="word-lab-intro">
        <div>
          <p className="eyebrow">Coverage benchmark</p>
          <h2 id="broad-word-coverage">How far does Buddy's word knowledge reach?</h2>
          <p>
            A broader school-age reading matrix across everyday polysemes, classroom vocabulary, connecting words,
            morphology and difficult pronunciation. This is a discovery benchmark: failures identify the next words
            or grammatical patterns to review rather than triggering sentence-specific fixes.
          </p>
        </div>
        <div className="word-lab-summary">
          <span>{readyCases.length}/{WORD_COVERAGE_CASES.length} run</span>
          <span>{passed}/{readyCases.length || WORD_COVERAGE_CASES.length} passing</span>
          <span>{recognised} recognised</span>
          <span>{local} fully local</span>
          <span>{pronunciation} with British pronunciation</span>
          <span>{reviewed} using reviewed Buddy meaning</span>
          <span>{lemmatised} resolved to a lemma</span>
          <button
            type="button"
            onClick={() => runCases(WORD_COVERAGE_CASES, "all")}
            disabled={running !== null}
          >
            {running === "all" ? <ArrowClockwise size={18} /> : <Play size={18} />}
            {running === "all" ? "Running…" : `Run all ${WORD_COVERAGE_CASES.length}`}
          </button>
        </div>
      </div>

      {groups.map(({ category, cases }) => {
        const ready = cases.flatMap((item) => {
          const state = states[item.id];
          return state?.status === "ready" ? [{ item, state }] : [];
        });
        const groupPassed = ready.filter(({ state }) => (state.failures?.length ?? 0) === 0).length;
        const groupLocal = ready.filter(({ state }) => state.result?.corpus && !state.result.corpus.remoteFallback).length;

        return (
          <section className="word-lab-group" key={category}>
            <div className="word-lab-intro">
              <div>
                <h3>{categoryLabels[category]}</h3>
                <p>{categoryNotes[category]}</p>
              </div>
              <div className="word-lab-summary">
                <span>{ready.length}/{cases.length} run</span>
                <span>{groupPassed} passing</span>
                <span>{groupLocal} fully local</span>
                <button
                  type="button"
                  onClick={() => runCases(cases, category)}
                  disabled={running !== null}
                >
                  {running === category ? <ArrowClockwise size={18} /> : <Play size={18} />}
                  {running === category ? "Running…" : "Run group"}
                </button>
              </div>
            </div>

            <div className="word-lab-grid">
              {cases.map((item) => {
                const state = states[item.id] ?? { status: "idle" as const };
                const failed = state.status === "ready" && (state.failures?.length ?? 0) > 0;
                return (
                  <article className="word-lab-card" key={item.id}>
                    <div className="word-lab-card-head">
                      <div>
                        <strong>{item.word}</strong>
                        <span>{item.context}</span>
                      </div>
                      <button
                        type="button"
                        className="word-lab-run"
                        disabled={state.status === "loading" || running !== null}
                        onClick={() => runCase(item)}
                      >
                        {state.status === "loading"
                          ? <ArrowClockwise size={18} />
                          : failed
                            ? <WarningCircle size={18} />
                            : state.status === "ready"
                              ? <CheckCircle size={18} />
                              : <Play size={18} />}
                        {state.status === "loading" ? "Running" : failed ? "Review" : state.status === "ready" ? "Pass" : "Run"}
                      </button>
                    </div>

                    <p className="word-lab-expect"><b>We expect:</b> {item.expectation}</p>
                    {state.status === "error" && <div className="word-lab-error">{state.error}</div>}
                    {state.status === "ready" && state.result && (
                      <div className="word-lab-result">
                        <div className="word-lab-result-row">
                          <span>Meaning</span>
                          <div><p>{state.result.meaning ?? "No meaning returned"}</p></div>
                        </div>
                        <div className="word-lab-result-row">
                          <span>Resolution</span>
                          <div>
                            <p>
                              {state.result.morphology?.lemma ?? state.result.word}
                              {state.result.morphology?.form ? ` · ${state.result.morphology.form}` : ""}
                            </p>
                            <small>
                              {state.result.partOfSpeech ?? "no POS"} · {state.result.source ?? "unknown source"} · network fallback {state.result.corpus?.remoteFallback ? "yes" : "no"}
                            </small>
                          </div>
                        </div>
                        <div className="word-lab-result-row">
                          <span>Pronunciation evidence</span>
                          <div><p>{state.result.pronunciation?.ipa ?? "No local IPA"}</p></div>
                        </div>
                        <p className="word-lab-expect">
                          <b>Automated checks:</b>{" "}
                          {(state.failures?.length ?? 0) === 0
                            ? "pass"
                            : `review — ${state.failures?.join("; ")}`}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}
