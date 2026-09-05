"use client";

import { useState } from "react";
import { ArrowClockwise, CheckCircle, Play, WarningCircle } from "@phosphor-icons/react";

type Assertion = {
  recognised?: boolean;
  partOfSpeech?: string;
  lemma?: string;
  form?: string;
  source?: string;
  remoteFallback?: boolean;
  meaningIncludes?: string[];
  pronunciation?: string;
};

type RegressionCase = {
  id: string;
  word: string;
  context: string;
  expectation: string;
  assertion: Assertion;
};

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
  } | null;
  source?: string;
  providers?: string[];
};

type CaseState = {
  status: "idle" | "loading" | "ready" | "error";
  result?: WordResult;
  failures?: string[];
  error?: string;
};

const CASES: RegressionCase[] = [
  {
    id: "coach-sport",
    word: "coach",
    context: "The football coach showed us how to pass the ball.",
    expectation: "The person who trains a player or team.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["person", "train"],
    },
  },
  {
    id: "coach-bus",
    word: "coach",
    context: "We travelled to the museum by coach.",
    expectation: "A large bus used for longer journeys.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["bus"],
    },
  },
  {
    id: "club-chess",
    word: "club",
    context: "I go to the chess club after school on Tuesdays.",
    expectation: "A group sharing an activity or interest.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["group", "activity"],
    },
  },
  {
    id: "pitch-football",
    word: "pitch",
    context: "The players ran onto the football pitch before the match.",
    expectation: "The marked area used for playing a sport.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["ground", "sport"],
    },
  },
  {
    id: "board-classroom",
    word: "board",
    context: "The teacher wrote the answer on the board.",
    expectation: "The classroom writing/display surface.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["surface", "writing"],
    },
  },
  {
    id: "volume-loudness",
    word: "volume",
    context: "Turn the volume down because the music is too loud.",
    expectation: "How loud or quiet a sound is.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["loud", "sound"],
    },
  },
  {
    id: "sentence-grammar",
    word: "sentence",
    context: "Write one sentence that uses the word because.",
    expectation: "A grammatical sentence, not a legal sentence.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["words", "idea"],
    },
  },
  {
    id: "subject-school",
    word: "subject",
    context: "Maths is my favourite subject at school.",
    expectation: "A school subject with the British noun pronunciation and no remote fallback.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["learning", "school"],
      pronunciation: "s ˈɐ b dʒ ɪ k t",
    },
  },
  {
    id: "object-grammar",
    word: "object",
    context: "Circle the object in the sentence that receives the action.",
    expectation: "The grammar object with the British noun pronunciation and no remote fallback.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["grammar", "action"],
      pronunciation: "ˈɒ b dʒ ɛ k t",
    },
  },
  {
    id: "cells-local-lemma",
    word: "cells",
    context: "Every living thing is made from one or more cells.",
    expectation: "Plural of cell resolved entirely from local pronunciation and lemma evidence.",
    assertion: {
      recognised: true,
      partOfSpeech: "noun",
      lemma: "cell",
      form: "plural",
      source: "buddy-curated",
      remoteFallback: false,
      meaningIncludes: ["living"],
    },
  },
  {
    id: "carries-ambiguous-local-form",
    word: "carries",
    context: "She carries the bag to school each morning.",
    expectation: "Resolve to carry, but keep the network fallback because the local -ies proposal is grammatically ambiguous.",
    assertion: {
      recognised: true,
      partOfSpeech: "verb",
      lemma: "carry",
      form: "present form",
      remoteFallback: true,
    },
  },
  {
    id: "unknown-ocr-guardrail",
    word: "marnivorous",
    context: "The creature was described as marnivorous in the blurry text.",
    expectation: "Remain uncertain rather than inventing a definition.",
    assertion: {
      recognised: false,
    },
  },
];

function evaluate(result: WordResult, assertion: Assertion) {
  const failures: string[] = [];
  const meaning = result.meaning?.toLocaleLowerCase("en-GB") ?? "";

  if (typeof assertion.recognised === "boolean" && Boolean(result.recognisedWord) !== assertion.recognised) {
    failures.push(`recognised should be ${assertion.recognised ? "yes" : "no"}`);
  }
  if (assertion.partOfSpeech && result.partOfSpeech !== assertion.partOfSpeech) {
    failures.push(`part of speech should be ${assertion.partOfSpeech}`);
  }
  if (assertion.lemma && result.morphology?.lemma !== assertion.lemma) {
    failures.push(`lemma should be ${assertion.lemma}`);
  }
  if (assertion.form && result.morphology?.form !== assertion.form) {
    failures.push(`form should be ${assertion.form}`);
  }
  if (assertion.source && result.source !== assertion.source) {
    failures.push(`source should be ${assertion.source}`);
  }
  if (
    typeof assertion.remoteFallback === "boolean"
    && Boolean(result.corpus?.remoteFallback) !== assertion.remoteFallback
  ) {
    failures.push(`network fallback should be ${assertion.remoteFallback ? "yes" : "no"}`);
  }
  for (const fragment of assertion.meaningIncludes ?? []) {
    if (!meaning.includes(fragment.toLocaleLowerCase("en-GB"))) {
      failures.push(`meaning should include “${fragment}”`);
    }
  }
  if (assertion.pronunciation && result.pronunciation?.ipa !== assertion.pronunciation) {
    failures.push(`pronunciation should be ${assertion.pronunciation}`);
  }

  return failures;
}

export function RecentWordRegressionPack() {
  const [states, setStates] = useState<Record<string, CaseState>>({});
  const [running, setRunning] = useState(false);

  async function runCase(item: RegressionCase) {
    setStates((current) => ({ ...current, [item.id]: { status: "loading" } }));
    try {
      const params = new URLSearchParams({ word: item.word, context: item.context });
      const response = await fetch(`/api/word?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as WordResult;
      const failures = evaluate(result, item.assertion);
      setStates((current) => ({
        ...current,
        [item.id]: { status: "ready", result, failures },
      }));
      return failures.length === 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStates((current) => ({ ...current, [item.id]: { status: "error", error: message } }));
      return false;
    }
  }

  async function runAll() {
    setRunning(true);
    try {
      for (const item of CASES) await runCase(item);
    } finally {
      setRunning(false);
    }
  }

  const ready = CASES.map((item) => states[item.id]).filter((state) => state?.status === "ready");
  const passed = ready.filter((state) => (state.failures?.length ?? 0) === 0).length;

  return (
    <section className="word-lab-group" aria-labelledby="recent-word-regressions">
      <div className="word-lab-intro">
        <div>
          <p className="eyebrow">Recent production regressions</p>
          <h2 id="recent-word-regressions">School-age meaning + local-first checks</h2>
          <p>
            A compact executable pack for the failures found during the latest production audit. These checks cover child-readable senses, local lemma resolution, British pronunciation and the OCR uncertainty guardrail.
          </p>
        </div>
        <div className="word-lab-summary">
          <span>{passed}/{CASES.length} passing</span>
          <span>{ready.length}/{CASES.length} run</span>
          <button type="button" onClick={runAll} disabled={running}>
            {running ? <ArrowClockwise size={18} /> : <Play size={18} />}
            {running ? "Running…" : "Run recent pack"}
          </button>
        </div>
      </div>

      <div className="word-lab-grid">
        {CASES.map((item) => {
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
                  disabled={state.status === "loading"}
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
                    {(state.failures?.length ?? 0) === 0 ? "pass" : `review — ${state.failures?.join("; ")}`}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
