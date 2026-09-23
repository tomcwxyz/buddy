"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Camera, Ear, Lightbulb, SpeakerHigh } from "@phosphor-icons/react";
import { BuddyPresence } from "@/components/BuddyPresence";
import { getWordSupport, helpText } from "@/lib/literacy/engine";
import {
  readLearningEvents,
  recordLearningEvent,
  summariseRememberedWords,
} from "@/lib/learning/local-store";
import {
  choosePracticeSetWords,
  choosePracticeWords,
  type PracticeWord,
} from "@/lib/practice/engine";
import { coasterPieceKindForWord } from "@/lib/practice/coaster";
import { earnCoasterPiece } from "@/lib/practice/coaster-store";
import { exploredWordsForPracticeSet } from "@/lib/practice/progress";
import {
  readActivePracticeSet,
  setActivePracticeSet,
  type PracticeSet,
} from "@/lib/practice/sets";

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
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [exploredSetWords, setExploredSetWords] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<Reveal>("none");
  const [buddyState, setBuddyState] = useState<BuddyState>("idle");
  const [lookup, setLookup] = useState<WordLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const current = words[index] ?? null;
  const support = useMemo(() => (current ? getWordSupport(current.word) : null), [current]);

  function loadPractice() {
    const events = readLearningEvents();
    const activeSet = readActivePracticeSet();

    if (activeSet?.words.length) {
      const explored = exploredWordsForPracticeSet(events, activeSet.id);
      setPracticeSet(activeSet);
      setExploredSetWords(explored);
      setWords(choosePracticeSetWords(activeSet.words, explored, 3));
      setIndex(0);
      return;
    }

    const remembered = summariseRememberedWords(events);
    setPracticeSet(null);
    setExploredSetWords(new Set());
    setWords(choosePracticeWords(remembered, 3));
    setIndex(0);
  }

  useEffect(() => {
    loadPractice();
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!current) return;
    const controller = new AbortController();
    setReveal("none");
    setLookup(null);
    setLookupLoading(true);
    recordLearningEvent({
      kind: "practice_seen",
      word: current.word,
      source: "practice",
      practiceSetId: practiceSet?.id,
    });

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
  }, [current, practiceSet?.id]);

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
    recordLearningEvent({
      kind: "word_heard",
      word: current.word,
      source: "practice",
      practiceSetId: practiceSet?.id,
    });
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
      practiceSetId: practiceSet?.id,
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
      practiceSetId: practiceSet?.id,
    });
  }

  async function showMeaning() {
    if (!current || !support) return;
    setReveal("meaning");
    recordLearningEvent({
      kind: "meaning_requested",
      word: current.word,
      source: "practice",
      practiceSetId: practiceSet?.id,
    });

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
      recordLearningEvent({
        kind: "practice_known",
        word: current.word,
        source: "practice",
        practiceSetId: practiceSet?.id,
      });
    }

    if (practiceSet) {
      const pieceKind = coasterPieceKindForWord({
        word: current.word,
        chunks: support?.chunks.length ?? 1,
        syllables: lookup?.soundGuide?.syllables,
      });
      earnCoasterPiece({
        practiceSetId: practiceSet.id,
        word: current.word,
        kind: pieceKind,
      });

      recordLearningEvent({
        kind: "practice_explored",
        word: current.word,
        source: "practice",
        practiceSetId: practiceSet.id,
      });
      setExploredSetWords((previous) => {
        const next = new Set(previous);
        next.add(current.word);
        return next;
      });
    }

    window.speechSynthesis?.cancel();
    setBuddyState("idle");
    setIndex((value) => value + 1);
  }

  function useRememberedWords() {
    setActivePracticeSet(null);
    const remembered = summariseRememberedWords(readLearningEvents());
    setPracticeSet(null);
    setExploredSetWords(new Set());
    setWords(choosePracticeWords(remembered, 3));
    setIndex(0);
  }

  function anotherFew() {
    loadPractice();
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
        <BuddyPresence label="We need a few words first." />
        <div>
          <p className="eyebrow">Tiny practice</p>
          <h1>Bring some words.</h1>
          <p>Use words Buddy has met while reading, or turn a spelling list from school into a practice set.</p>
          <div className="practice-finish-actions">
            <Link className="practice-primary" href="/practice/add-spellings">
              <Camera size={20} /> Add school spellings
            </Link>
            <Link className="practice-secondary" href="/read">
              Read with me <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="practice-shell practice-finished">
        <div className="practice-finish-visual">
          <BuddyPresence label="That's plenty for now." />
          {practiceSet && (
            <div className="coaster-finish-teaser">
              <span>Your coaster</span>
              <strong>Those words left you track pieces.</strong>
              <p>Build the ride, move the pieces around, then send the cart.</p>
              <Link href="/practice/coaster">Go to the coaster <ArrowRight size={18} /></Link>
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow">Done</p>
          <h1>Three words. That's it.</h1>
          <p>
            {practiceSet
              ? "You explored three words. That gives you real things to build and play with — no score involved."
              : "No score to chase. Buddy will bring useful things back another time."}
          </p>
          <div className="practice-finish-actions">
            {practiceSet && (
              <>
                <Link className="practice-primary" href="/practice/coaster">
                  Build the ride <ArrowRight size={20} />
                </Link>
                <button type="button" className="practice-secondary" onClick={anotherFew}>
                  {exploredSetWords.size < practiceSet.words.length ? "Explore another few" : "Play with the words again"}
                </button>
              </>
            )}
            <Link className={practiceSet ? "practice-secondary" : "practice-primary"} href="/">Back home</Link>
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

        {practiceSet ? (
          <>
            <div className="coaster-practice-callout">
              <span>Your coaster</span>
              <strong>{exploredSetWords.size} words explored</strong>
              <p>Every explored word leaves a piece in your coaster yard.</p>
              <Link href="/practice/coaster">Build the ride <ArrowRight size={16} /></Link>
            </div>
            <div className="practice-set-actions">
              <Link href="/practice/add-spellings"><Camera size={17} /> Add another list</Link>
              <button type="button" onClick={useRememberedWords}>Use words we've met</button>
            </div>
          </>
        ) : (
          <>
            <div className="practice-progress" aria-label={`Word ${index + 1} of ${words.length}`}>
              {words.map((word, wordIndex) => (
                <span key={word.word} className={wordIndex === index ? "current" : wordIndex < index ? "past" : ""} />
              ))}
            </div>
            <p className="practice-count">Word {index + 1} of {words.length}</p>
            <Link className="practice-add-spellings" href="/practice/add-spellings">
              <Camera size={17} /> Got spellings from school?
            </Link>
          </>
        )}
      </div>

      <article className="practice-card">
        <p className="eyebrow">{practiceSet ? practiceSet.label : "One we've met before"}</p>
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
          <button type="button" className="practice-primary" onClick={() => nextWord(false)}>
            Done with this one <ArrowRight size={20} />
          </button>
          <button type="button" className="practice-skip" onClick={() => nextWord(true)}>I knew this one</button>
        </div>
      </article>
    </section>
  );
}
