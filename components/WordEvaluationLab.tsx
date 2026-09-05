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
  morphology?: {
    lemma?: string | null;
    form?: string | null;
    label?: string | null;
    confidence?: string | null;
  };
  possibleSpelling?: string | null;
  recognisedWord?: boolean;
  pronunciation?: { ipa?: string | null; syllables?: number | null; audio?: string | null };
  soundGuide?: {
    syllables?: number | null;
    ipa?: string | null;
    features?: SoundFeature[];
    guidance?: string;
    alignment?: "high" | "medium" | "irregular" | "spelling-only";
  };
  explanation?: {
    source?: string;
    modelUsed?: boolean;
    confidence?: string;
  };
  attribution?: {
    label: string;
    url: string;
    licence: string;
  } | null;
  corpus?: {
    version: string;
    locale: string;
    surfaceEntryHit: boolean;
    surfaceLexicalHit: boolean;
    surfaceCuratedMeaningHit: boolean;
    surfaceWordNetHit: boolean;
    surfaceWordNetSenseCount: number;
    surfaceWordNetTaggedSenseCount: number;
    wordnetAvailable: boolean;
    wordnetVersion: string | null;
    surfacePronunciationHit: boolean;
    surfaceBritfoneHit: boolean;
    surfaceBritfoneVariants: number;
    britfoneRuntimeEntryCount: number;
    lemmaEntryHit: boolean | null;
    lemmaLexicalHit: boolean | null;
    lemmaCuratedMeaningHit: boolean | null;
    lemmaWordNetHit: boolean | null;
    lemmaWordNetSenseCount: number | null;
    lemmaBritfoneHit: boolean | null;
    remoteFallback: boolean;
    pronunciationSource: string | null;
  } | null;
  providers?: string[];
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
  const unrecognised = ready.filter((state) => state.result?.recognisedWord === false).length;
  const lemmatised = ready.filter((state) => {
    const result = state.result;
    return Boolean(result?.morphology?.lemma && result.morphology.lemma !== result.word);
  }).length;
  const localMeanings = ready.filter((state) => Boolean(
    state.result?.corpus?.surfaceLexicalHit
      || state.result?.corpus?.surfaceCuratedMeaningHit
      || state.result?.corpus?.surfaceWordNetHit
      || state.result?.corpus?.lemmaLexicalHit
      || state.result?.corpus?.lemmaCuratedMeaningHit
      || state.result?.corpus?.lemmaWordNetHit,
  )).length;
  const wordnetMeanings = ready.filter((state) => Boolean(
    state.result?.corpus?.surfaceWordNetHit || state.result?.corpus?.lemmaWordNetHit,
  )).length;
  const curatedMeanings = ready.filter((state) => Boolean(
    state.result?.corpus?.surfaceCuratedMeaningHit || state.result?.corpus?.lemmaCuratedMeaningHit,
  )).length;
  const britishPronunciations = ready.filter((state) => state.result?.corpus?.surfacePronunciationHit).length;
  const britfoneCoverage = ready.filter((state) => state.result?.corpus?.surfaceBritfoneHit).length;
  const ambiguousBritfone = ready.filter((state) => (state.result?.corpus?.surfaceBritfoneVariants ?? 0) > 1).length;
  const offlineReady = ready.filter((state) => state.result?.corpus && !state.result.corpus.remoteFallback).length;
  const britfoneRuntimeEntries = ready.find((state) => (state.result?.corpus?.britfoneRuntimeEntryCount ?? 0) > 0)
    ?.result?.corpus?.britfoneRuntimeEntryCount ?? 0;
  const wordnetVersion = ready.find((state) => state.result?.corpus?.wordnetAvailable)
    ?.result?.corpus?.wordnetVersion ?? null;

  return (
    <div className="word-lab">
      <header className="word-lab-intro">
        <div>
          <p className="eyebrow">Internal alpha lab</p>
          <h1>Does Buddy understand the word?</h1>
          <p>
            Fixed cases for morphology, sense, meaning, examples and sound guidance. This is an evaluation surface, not a child-facing score.
          </p>
        </div>
        <div className="word-lab-summary">
          <span>{ready.length}/{WORD_EVAL_CASES.length} run</span>
          {wordnetVersion && <span>WordNet {wordnetVersion} local semantics</span>}
          {britfoneRuntimeEntries > 0 && <span>{britfoneRuntimeEntries.toLocaleString("en-GB")} Britfone headwords indexed</span>}
          <span>{offlineReady} fully local</span>
          <span>{localMeanings} local meanings</span>
          <span>{wordnetMeanings} WordNet-backed</span>
          <span>{curatedMeanings} Buddy-curated</span>
          <span>{britfoneCoverage} in Britfone</span>
          <span>{britishPronunciations} resolved British pronunciations</span>
          {ambiguousBritfone > 0 && <span>{ambiguousBritfone} pronunciation variants need resolving</span>}
          <span>{lemmatised} resolved to a lemma</span>
          <span>{modelCalls} model-assisted</span>
          <span>{unrecognised} treated as uncertain</span>
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
                        <div>
                          <p>{result.meaning ?? "No meaning returned"}</p>
                          {result.recognisedWord === false && result.possibleSpelling && (
                            <small>Possible OCR/spelling correction: <b>{result.possibleSpelling}</b></small>
                          )}
                        </div>
                      </div>

                      <div className="word-lab-result-row">
                        <span>Word form</span>
                        <div>
                          <p>
                            {result.morphology?.label
                              ?? (result.morphology?.lemma && result.morphology.lemma !== result.word
                                ? `Related to ${result.morphology.lemma}`
                                : "Base form or unresolved")}
                          </p>
                          {result.partOfSpeech && <small>part of speech: <b>{result.partOfSpeech}</b></small>}
                        </div>
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
                          {result.recognisedWord !== false && (
                            <button type="button" className="word-lab-speak" onClick={() => speak(item.word)}>
                              <SpeakerHigh size={16} /> Hear word
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="word-lab-meta">
                        <span>recognised: {result.recognisedWord === false ? "no" : "yes"}</span>
                        <span>source: {result.source ?? "unknown"}</span>
                        <span>meaning confidence: {result.explanation?.confidence ?? "unknown"}</span>
                        <span>sound alignment: {result.soundGuide?.alignment ?? "unknown"}</span>
                        <span>model: {result.explanation?.modelUsed ? "yes" : "no"}</span>
                        {result.morphology?.lemma && <span>lemma: {result.morphology.lemma}</span>}
                        {result.morphology?.form && <span>form: {result.morphology.form}</span>}
                        {result.morphology?.confidence && <span>morphology: {result.morphology.confidence}</span>}
                        {result.corpus && <span>corpus: {result.corpus.version} ({result.corpus.locale})</span>}
                        {result.corpus?.surfaceLexicalHit && <span>reviewed surface meaning: yes</span>}
                        {result.corpus?.lemmaLexicalHit && <span>reviewed lemma meaning: yes</span>}
                        {result.corpus?.surfaceCuratedMeaningHit && <span>Buddy-curated meaning: yes</span>}
                        {result.corpus?.lemmaCuratedMeaningHit && <span>Buddy-curated lemma meaning: yes</span>}
                        {result.corpus?.surfaceWordNetHit && (
                          <span>WordNet: {result.corpus.surfaceWordNetSenseCount} sense{result.corpus.surfaceWordNetSenseCount === 1 ? "" : "s"}</span>
                        )}
                        {result.corpus?.lemmaWordNetHit && (
                          <span>WordNet lemma: {result.corpus.lemmaWordNetSenseCount ?? 0} sense{result.corpus.lemmaWordNetSenseCount === 1 ? "" : "s"}</span>
                        )}
                        {result.corpus?.surfaceBritfoneHit && (
                          <span>Britfone runtime: {result.corpus.surfaceBritfoneVariants} variant{result.corpus.surfaceBritfoneVariants === 1 ? "" : "s"}</span>
                        )}
                        {result.corpus?.surfacePronunciationHit && (
                          <span>British pronunciation: {result.corpus.pronunciationSource ?? "local"}</span>
                        )}
                        {result.corpus && <span>network lexical fallback: {result.corpus.remoteFallback ? "yes" : "no"}</span>}
                        {result.providers?.length ? <span>providers: {result.providers.join(", ")}</span> : null}
                        {result.possibleSpelling && <span>suggestion: {result.possibleSpelling}</span>}
                        {result.partOfSpeech && <span>{result.partOfSpeech}</span>}
                        {result.attribution && (
                          <span>attribution: {result.attribution.label} ({result.attribution.licence})</span>
                        )}
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
