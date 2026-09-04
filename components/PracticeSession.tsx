"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Ear, Lightbulb, SpeakerHigh } from "@phosphor-icons/react";
import { BuddyPresence } from "@/components/BuddyPresence";
import { getWordSupport, helpText } from "@/lib/literacy/engine";
import {
  readLearningEvents,
  recordLearningEvent,
  summariseRememberedWords,
} from "@/lib/learning/local-store";
import { choosePracticeWords, type PracticeWord } from "@/lib/practice/engine";

type BuddyState = "idle" | "thinking" | "speaking";
type Reveal = "none" | "clue" | "together" | "meaning";

type SoundFeature = {
  letters: string;
  note: string;
};

type WordLookup = {
  meaning: string | null;
  example: string | null;
  alternateExample?: string | null;
  partOfSpeech?: string | null;
  recognisedWord?: boolean;
  meaningCanBeRefined?: boolean;
  soundGuide?: {
    syllables?: number | null;
    features?: SoundFeature[];
    guidance?: string;
  };
};

export function PracticeSession() {
  const [words, setWords] = useState<PracticeWord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<Reveal>("none");
  const [buddyState, setBuddyState] = useState<BuddyState>("idle");
  const [lookup, setLookup] = useState<WordLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const current = words[index] ?? null;
  const support = useMemo(() => (current ? getWordSupport(current.word) : null), [current]);

  useEffect(() => {
    const remembered = summariseRememberedWords(readLearningEvents());
    setWords(choosePracticeWords(remembered, 3));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!current) return;
    const controller = new AbortController();
    setReveal("none");
    setLookup(null);
    setLookupLoading(true);
    recordLearningEvent({ kind: "practice_seen", word: current.word, source: "practice" });

    fetch(`/api/word?word=${encodeURIComponent(current.word)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("lookup_failed");
        return (await response.json()) as WordLookup;
      })
      .then(setLookup)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookup({ meaning: null, example: null });
      })
      .finally(() => setLookupLoading(false));

    return () => controller.abort();
  }, [current]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.78;
    utterance.onstart = () => setBuddyState("speaking");
    utterance.onend = () => setBuddyState("idle");
    window.speechSynthesis.speak(utterance);
  }

  function hearWord() {
    if (!current) return;
    recordLearningEvent({ kind: "word_heard", word: current.word, source: "practice" });
    speak(current.word);
  }

  function showClue() {
    if (!current) return;
    setReveal("clue");
    recordLearningEvent({
      kind: "help_depth_changed",
      word: current.word,
      source: "practice",
      helpDepth: "clue",
    });
  }

  function workTogether() {
    if (!current) return;
    setReveal("together");
    recordLearningEvent({
      kind: "help_depth_changed",
      word: current.word,
      source: "practice",
      helpDepth: "together",
    });
  }

  async function showMeaning() {
    if (!current || !support) return;
    setReveal("meaning");
    recordLearningEvent({ kind: "meaning_requested", word: current.word, source: "practice" });

    if (support.meaning || (lookup?.meaning && !lookup.meaningCanBeRefined)) return;

    setLookupLoading(true);
    setBuddyState("thinking");
    try {
      const response = await fetch(`/api/word?word=${encodeURIComponent(current.word)}&explain=1`);
      if (!response.ok) throw new Error("lookup_failed");
      const result = (await response.json()) as WordLookup;
      setLookup(result);
    } catch {
      // Keep the deterministic lookup if the optional explanation layer is unavailable.
    } finally {
      setLookupLoading(false);
      setBuddyState("idle");
    }
  }

  function nextWord(known = false) {
    if (!current) return;
    if (known) {
      recordLearningEvent({ kind: "practice_known", word: current.word, source: "practice" });
    }
    window.speechSynthesis?.cancel();
    setBuddyState("idle");
    setIndex((value) => value + 1);
  }

  if (!loaded) {
    return (
      <section className="practice-shell">
        <BuddyPresence state="thinking" label="Finding a few words…" />
      </section>
    );
  }

  if (words.length === 0) {
    return (
      <section className="practice-shell practice-empty">
        <BuddyPresence label="We need to meet a few words first." />
        <div>
          <p className="eyebrow">Tiny practice</p>
          <h1>Nothing to practise yet.</h1>
          <p>When you ask Buddy for help with a word while reading, useful words can come back here later.</p>
          <Link className="practice-primary" href="/read">Read with me <ArrowRight size={20} /></Link>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="practice-shell practice-finished">
        <BuddyPresence label="That's plenty for now." />
        <div>
          <p className="eyebrow">Done</p>
          <h1>Three words. That's it.</h1>
          <p>No score to chase. Buddy will bring useful things back another time.</p>
          <div className="practice-finish-actions">
            <Link className="practice-primary" href="/">Back home</Link>
            <Link className="practice-secondary" href="/words">Words we've met</Link>
          </div>
        </div>
      </section>
    );
  }

  const meaning = support?.meaning ?? lookup?.meaning ?? null;
  const example = support?.example ?? lookup?.alternateExample ?? lookup?.example ?? null;
  const revealedText = reveal === "clue"
    ? helpText(support!, "clue")
    : reveal === "together"
      ? helpText(support!, "together")
      : reveal === "meaning"
        ? lookupLoading
          ? "Finding a simple meaning…"
          : meaning ?? "I couldn't get a reliable meaning for this one just now."
        : null;

  return (
    <section className="practice-shell" aria-live="polite">
      <div className="practice-side">
        <BuddyPresence
          state={buddyState}
          label={reveal === "none" ? "Have a look first." : "Use whatever helps."}
        />
        <div className="practice-progress" aria-label={`Word ${index + 1} of ${words.length}`}>
          {words.map((word, wordIndex) => (
            <span key={word.word} className={wordIndex === index ? "current" : wordIndex < index ? "past" : ""} />
          ))}
        </div>
        <p className="practice-count">Word {index + 1} of {words.length}</p>
      </div>

      <article className="practice-card">
        <p className="eyebrow">One we've met before</p>
        <h1>{current.word}</h1>
        {lookup?.partOfSpeech && <span className="practice-word-kind">{lookup.partOfSpeech}</span>}
        <p className="practice-prompt">{current.openingPrompt}</p>

        {lookup?.soundGuide && (
          <div className="practice-sound-guide">
            <div>
              <strong>Listen + notice</strong>
              {lookup.soundGuide.syllables ? (
                <span>{lookup.soundGuide.syllables} {lookup.soundGuide.syllables === 1 ? "syllable" : "syllables"}</span>
              ) : null}
            </div>
            <p>{lookup.soundGuide.guidance}</p>
            {(lookup.soundGuide.features?.length ?? 0) > 0 && (
              <div className="practice-sound-features">
                {lookup.soundGuide.features?.map((feature) => (
                  <span key={`${feature.letters}-${feature.note}`}><strong>{feature.letters}</strong> {feature.note}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {revealedText && <div className="practice-reveal">{revealedText}</div>}

        {reveal === "meaning" && example && (
          <div className="practice-example">
            <span>Example</span>
            <p>“{example}”</p>
            <button type="button" onClick={() => speak(example)}><SpeakerHigh size={17} /> Read it</button>
          </div>
        )}

        <div className="practice-help-actions">
          <button type="button" onClick={hearWord}>
            <SpeakerHigh size={22} /> Hear it
          </button>
          <button type="button" onClick={showClue}>
            <Lightbulb size={22} /> Give me a clue
          </button>
          <button type="button" onClick={workTogether}>
            <Ear size={22} /> Work it out with me
          </button>
          <button type="button" onClick={() => void showMeaning()}>What does it mean?</button>
        </div>

        <div className="practice-next">
          <button type="button" className="practice-primary" onClick={() => nextWord(true)}>
            I know this one <ArrowRight size={20} />
          </button>
          <button type="button" className="practice-skip" onClick={() => nextWord(false)}>Next one</button>
        </div>
      </article>
    </section>
  );
}
