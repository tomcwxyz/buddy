"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
  LEARNING_UPDATED_EVENT,
  readLearningEvents,
  summariseRememberedWords,
} from "@/lib/learning/local-store";
import type { RememberedWord } from "@/lib/learning/types";

function noteFor(word: RememberedWord) {
  if (word.meaningCount > 0 && word.heardCount > 0) {
    return "We said this one out loud and explored what it means.";
  }
  if (word.heardCount > 0) {
    return "Hearing this one has been useful before.";
  }
  if (word.helpDepths.includes("together")) {
    return "We spent a little time working this one out together.";
  }
  if (word.helpDepths.includes("clue")) {
    return "A clue helped us explore this one.";
  }
  return "A word we met while reading.";
}

export default function WordsPage() {
  const [words, setWords] = useState<RememberedWord[]>([]);

  useEffect(() => {
    const refresh = () => setWords(summariseRememberedWords(readLearningEvents()));
    refresh();
    window.addEventListener(LEARNING_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LEARNING_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">Words we've met</div>
      </header>
      <main className="main">
        <header className="page-header">
          <p className="eyebrow">My words</p>
          <h1 className="page-title">Words we've met.</h1>
          <p>Not mistakes. Just interesting words worth another look sometimes.</p>
          {words.length > 0 && (
            <Link className="pill-button words-practice-link" href="/practice">
              Try three words <ArrowRight size={18} />
            </Link>
          )}
        </header>

        {words.length > 0 ? (
          <section className="word-grid" aria-label="Words Buddy remembers">
            {words.map((item) => (
              <article className="word-panel" key={item.word}>
                <strong>{item.word}</strong>
                <span>{noteFor(item)}</span>
              </article>
            ))}
          </section>
        ) : (
          <section className="word-panel empty-memory">
            <strong>Nothing here yet.</strong>
            <span>When you ask Buddy for help with a word while reading, it can appear here.</span>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
