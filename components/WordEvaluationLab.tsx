"use client";

import { useMemo, useState } from "react";
import { ArrowClockwise, CheckCircle, Play, SpeakerHigh } from "@phosphor-icons/react";
import { WORD_EVAL_CASES, type WordEvalCase } from "@/lib/literacy/eval-cases";

type SoundFeature = { letters: string; note: string };
type WordResult = {
  word: string;
  meaning: string | null;
  example: string | null;
  alternateExample?: string | null;
  contextualExample?: string | null;
  partOfSpeech?: string | null;
  pronunciation?: { ipa?: string | null; syllables?: number | null; audio?: string | null };
  soundGuide?: {
    syllables?: number | null;
    ipa?: string | null;
    features?: SoundFeature[];
    guidance?: string;
  };
  explanation?: {
    source?: string;
    modelUsed?: boolean;
    confidence?: string;
  };
  source?: string;
};

type CaseState = {
  status: "idle" | "loading" | "ready" | "error";
  result?: WordResult;
  error?: string;
};

const groupLabels: Record<WordEvalCase["group"], string> = {
  context: "Context / multiple meanings",
  irregular: "Irregular spelling",
  pattern: "Useful sound patterns",
  complex: "Long / technical words",
  rare: "Less common words",
  guardrail: "Guardrails",
};

export function WordEvaluationLab() {
  const [states, setStates] = useState<Record<string, CaseState>>({});
  const [runningAll, setRunningAll] = useState(false);

  const groups = useMemo(() => {
    return (Object.keys(groupLabels) as WordEvalCase["group"][])
      .map((group) => ({ group, cases: WORD_EVAL_CASES.filter((item) => item.group === group) }))
      .filter((item) => item.cases.length > 0);
  }, []);

  async function runCase(item: WordEvalCase) {
    setStates((current) => ({ ...current, [item.id]: { status: "loading" } }));
    try {
      const params = new URLSearchParams({ word: item.word, context: item.context });
      const response = await fetch(`/api/word?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as WordResult;
      setStates((current) => ({ ...current, [item.id]: { status: "ready", result } }));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStates((current) => ({ ...current, [item.id]: { status: "error", error: message } }));
      return null;
    }
  }

  async function runAll() {
    setRunningAll(true);
    try {
      for (const item of WORD_EVAL_CASES) {
        await runCase(item);
      }
    } finally {
      setRunningAll(false);
    }
  }

  function speak(text?: string | null) {
    if (!text || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  const ready = Object.values(states).filter((state) => state.status === "ready");
  const modelCalls = ready.filter((state) => state.result?.explanation?.modelUsed).length;

  return (
    <div className="word-lab">
      <header className="word-lab-intro">
        <div>
          <p className="eyebrow">Internal alpha lab</p>
          <h1>Does Buddy understand the word?</h1>
          <p>
            Fixed cases for sense, meaning, examples and sound guidance. This is an evaluation surface, not a child-facing score.
          </p>
        </div>
        <div className="word-lab-summary">
          <span>{ready.length}/{WORD_EVAL_CASES.length} run</span>
          <span>{modelCalls} model-assisted</span>
          <button type="button" onClick={runAll} disabled={runningAll}>
            {runningAll ? <ArrowClockwise size={18} /> : <Play size={18} />}
            {runningAll ? "Running…" : "Run all"}
          </button>
        </div>
      </header>

      {groups.map(({ group, cases }) => (
        <section className="word-lab-group" key={group}>
          <h2>{groupLabels[group]}</h2>
          <div className="word-lab-grid">
            {cases.map((item) => {
              const state = states[item.id] ?? { status: "idle" as const };
              const result = state.result;
              return (
                <article className="word-lab-card" key={item.id}>
                  <div className="word-lab-card-head">
                    <div>
                      <strong>{item.word}</strong>
                      <span>{item.context}</span>
                    </div>
                    <button type="button" className="word-lab-run" onClick={() => runCase(item)} disabled={state.status === "loading"}>
                      {state.status === "loading" ? <ArrowClockwise size={18} /> : state.status === "ready" ? <CheckCircle size={18} /> : <Play size={18} />}
                      {state.status === "loading" ? "Running" : state.status === "ready" ? "Again" : "Run"}
                    </button>
                  </div>

                  <p className="word-lab-expect"><b>We expect:</b> {item.expectation}</p>

                  {state.status === "error" && <div className="word-lab-error">{state.error}</div>}

                  {result && (
                    <div className="word-lab-result">
                      <div className="word-lab-result-row">
                        <span>Meaning</span>
                        <p>{result.meaning ?? "No meaning returned"}</p>
                      </div>

                      <div className="word-lab-result-row">
                        <span>Example</span>
                        <div>
                          <p>{result.example ?? "No example returned"}</p>
                          {result.example && (
                            <button type="button" className="word-lab-speak" onClick={() => speak(result.example)}>
                              <SpeakerHigh size={16} /> Hear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="word-lab-result-row">
                        <span>Sounds</span>
                        <div>
                          <p>
                            {result.pronunciation?.syllables
                              ? `${result.pronunciation.syllables} syllable${result.pronunciation.syllables === 1 ? "" : "s"}. `
                              : ""}
                            {result.soundGuide?.guidance ?? "No specific sound guidance."}
                          </p>
                          {(result.soundGuide?.features ?? []).map((feature) => (
                            <small key={`${feature.letters}-${feature.note}`}><b>{feature.letters}</b> — {feature.note}</small>
                          ))}
                          <button type="button" className="word-lab-speak" onClick={() => speak(item.word)}>
                            <SpeakerHigh size={16} /> Hear word
                          </button>
                        </div>
                      </div>

                      <div className="word-lab-meta">
                        <span>source: {result.source ?? "unknown"}</span>
                        <span>confidence: {result.explanation?.confidence ?? "unknown"}</span>
                        <span>model: {result.explanation?.modelUsed ? "yes" : "no"}</span>
                        {result.partOfSpeech && <span>{result.partOfSpeech}</span>}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
