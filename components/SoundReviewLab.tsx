"use client";

import { useState } from "react";
import { ArrowClockwise, Play } from "@phosphor-icons/react";

type SoundReviewStatus = "safe-to-explain" | "irregular" | "do-not-infer";

type SoundResult = {
  word: string;
  pronunciation?: { ipa?: string | null };
  soundGuide?: {
    features?: Array<{ letters: string; note: string }>;
    guidance?: string;
    alignment?: "high" | "medium" | "irregular" | "spelling-only";
    review?: SoundReviewStatus;
  };
};

type State = {
  loading: boolean;
  result?: SoundResult;
  error?: string;
};

const CASES = [
  { id: "rain", word: "rain", context: "The rain fell all afternoon." },
  { id: "night", word: "night", context: "It was dark at night." },
  { id: "look", word: "look", context: "Look at the picture." },
  { id: "thin", word: "thin", context: "The paper was thin." },
  { id: "lead-verb", word: "lead", context: "Please lead the group along the path." },
  { id: "though", word: "though", context: "Though it was late, we kept reading." },
  { id: "tear-eye", word: "tear", context: "A tear rolled down her cheek." },
  { id: "tear-rip", word: "tear", context: "Try not to tear the page." },
] as const;

function reviewLabel(value?: SoundReviewStatus) {
  if (value === "safe-to-explain") return "Safe to explain";
  if (value === "do-not-infer") return "Do not infer";
  if (value === "irregular") return "Irregular";
  return "Not run";
}

export function SoundReviewLab() {
  const [states, setStates] = useState<Record<string, State>>({});
  const [runningAll, setRunningAll] = useState(false);

  async function runCase(item: (typeof CASES)[number]) {
    setStates((current) => ({ ...current, [item.id]: { loading: true } }));
    try {
      const params = new URLSearchParams({ word: item.word, context: item.context });
      const response = await fetch(`/api/word?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as SoundResult;
      setStates((current) => ({ ...current, [item.id]: { loading: false, result } }));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStates((current) => ({ ...current, [item.id]: { loading: false, error: message } }));
      return null;
    }
  }

  async function runAll() {
    setRunningAll(true);
    try {
      for (const item of CASES) await runCase(item);
    } finally {
      setRunningAll(false);
    }
  }

  return (
    <section className="word-lab-group">
      <div className="word-lab-card-head">
        <div>
          <p className="eyebrow">Reviewed sound boundary</p>
          <h2>Would Buddy teach this sound clue?</h2>
          <p className="word-lab-expect">
            Alignment is not permission to teach. This panel shows the explicit review status returned by the real word API.
          </p>
        </div>
        <button type="button" className="word-lab-run" onClick={runAll} disabled={runningAll}>
          {runningAll ? <ArrowClockwise size={18} /> : <Play size={18} />}
          {runningAll ? "Running" : "Run sound set"}
        </button>
      </div>

      <div className="word-lab-grid">
        {CASES.map((item) => {
          const state = states[item.id] ?? { loading: false };
          const review = state.result?.soundGuide?.review;
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
                  onClick={() => runCase(item)}
                  disabled={state.loading}
                >
                  {state.loading ? <ArrowClockwise size={18} /> : <Play size={18} />}
                  {state.loading ? "Running" : reviewLabel(review)}
                </button>
              </div>

              {state.error && <div className="word-lab-error">{state.error}</div>}

              {state.result && (
                <div className="word-lab-result">
                  <div className="word-lab-result-row">
                    <span>Review</span>
                    <div>
                      <p><b>{reviewLabel(review)}</b></p>
                      <small>alignment: {state.result.soundGuide?.alignment ?? "none"}</small>
                    </div>
                  </div>
                  <div className="word-lab-result-row">
                    <span>Pronunciation</span>
                    <div><p>{state.result.pronunciation?.ipa ?? "No trusted IPA"}</p></div>
                  </div>
                  <div className="word-lab-result-row">
                    <span>Child guidance</span>
                    <div>
                      <p>{state.result.soundGuide?.guidance ?? "No guidance"}</p>
                      {(state.result.soundGuide?.features ?? []).map((feature) => (
                        <small key={`${feature.letters}-${feature.note}`}>
                          <b>{feature.letters}</b> — {feature.note}
                        </small>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
