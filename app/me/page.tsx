"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { LEARNING_UPDATED_EVENT, readLearningEvents } from "@/lib/learning/local-store";
import {
  inferObservations,
  OBSERVATIONS_UPDATED_EVENT,
  readObservationDecisions,
  recordObservationDecision,
  type LearningObservation,
  type ObservationDecision,
} from "@/lib/learning/observations";

export default function MePage() {
  const [observations, setObservations] = useState<LearningObservation[]>([]);
  const [decisions, setDecisions] = useState<Record<string, ObservationDecision>>({});

  useEffect(() => {
    const refresh = () => {
      setObservations(inferObservations(readLearningEvents()));
      setDecisions(readObservationDecisions());
    };
    refresh();
    window.addEventListener(LEARNING_UPDATED_EVENT, refresh);
    window.addEventListener(OBSERVATIONS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LEARNING_UPDATED_EVENT, refresh);
      window.removeEventListener(OBSERVATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const visible = useMemo(
    () => observations.filter((observation) => decisions[observation.id] !== "no"),
    [observations, decisions],
  );

  function choose(observation: LearningObservation, decision: ObservationDecision) {
    recordObservationDecision(observation.id, decision);
    setDecisions((current) => ({ ...current, [observation.id]: decision }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="wordmark">buddy</div>
        <div className="topbar-note">What helps you</div>
      </header>
      <main className="main">
        <header className="page-header">
          <p className="eyebrow">Me</p>
          <h1 className="page-title">Things we're figuring out.</h1>
          <p>Buddy can notice things, but you get to say whether they actually sound like you.</p>
        </header>

        {visible.length > 0 ? (
          <section className="memory-grid" aria-label="Things Buddy has noticed">
            {visible.map((memory) => {
              const decision = decisions[memory.id];
              return (
                <article className="memory-card" key={memory.id}>
                  <p className="eyebrow">Buddy has noticed</p>
                  <h2>{memory.title}</h2>
                  <p>{memory.body}</p>
                  {decision ? (
                    <p className="memory-decision">
                      {decision === "yes"
                        ? "You've said this sounds right."
                        : "You've said you're not sure yet. We can keep noticing."}
                    </p>
                  ) : (
                    <div className="memory-actions">
                      <button className="pill-button" type="button" onClick={() => choose(memory, "yes")}>
                        Yes, remember that
                      </button>
                      <button className="pill-button" type="button" onClick={() => choose(memory, "no")}>
                        Not really
                      </button>
                      <button className="pill-button" type="button" onClick={() => choose(memory, "unsure")}>
                        Not sure yet
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="memory-card">
            <p className="eyebrow">Nothing to decide yet</p>
            <h2>We'll figure it out together.</h2>
            <p>
              After you've used Buddy a few times, it can gently suggest things that might help — and you can tell it when it's wrong.
            </p>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
