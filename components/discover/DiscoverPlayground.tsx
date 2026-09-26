"use client";

import { useState } from "react";
import { ArrowLeft, Leaf, RocketLaunch, Shapes, SpeakerHigh } from "@phosphor-icons/react";
import { BuddyPresence } from "@/components/BuddyPresence";
import { CreatureLab } from "@/components/discover/CreatureLab";
import { LaunchLab } from "@/components/discover/LaunchLab";
import { PatternLab } from "@/components/discover/PatternLab";
import { recordLearningEvent } from "@/lib/learning/local-store";
import { useBuddySpeech } from "@/lib/speech/useBuddySpeech";

type ActivityId = "launch-lab" | "creature-lab" | "pattern-lab";
type BuddyState = "idle" | "speaking";

const activities: Array<{
  id: ActivityId;
  title: string;
  kicker: string;
  body: string;
  icon: typeof RocketLaunch;
}> = [
  {
    id: "launch-lab",
    title: "Launch lab",
    kicker: "Mess with motion",
    body: "Change a ramp, a surface and a push. Predict it, send it, change it again.",
    icon: RocketLaunch,
  },
  {
    id: "creature-lab",
    title: "Creature lab",
    kicker: "Invent an animal",
    body: "Build a creature for a strange place and decide why its features might help.",
    icon: Leaf,
  },
  {
    id: "pattern-lab",
    title: "Pattern maker",
    kicker: "Try to fool Buddy",
    body: "Make a visual rule and see whether Buddy can work out what should come next.",
    icon: Shapes,
  },
];

export function DiscoverPlayground() {
  const [active, setActive] = useState<ActivityId | null>(null);
  const [buddyLine, setBuddyLine] = useState("Pick something and start changing it.");
  const [buddyState, setBuddyState] = useState<BuddyState>("idle");
  const speech = useBuddySpeech();

  function choose(id: ActivityId) {
    setActive(id);
    const next = activities.find((activity) => activity.id === id);
    const line = next
      ? `${next.title}. Start by changing one thing and see what it does.`
      : "Pick something and have a go.";
    setBuddyLine(line);
    recordLearningEvent({
      kind: "discover_started",
      source: "discover",
      activityId: id,
    });
  }

  function speakBuddy() {
    speech.speak(buddyLine, {
      onStart: () => setBuddyState("speaking"),
      onEnd: () => setBuddyState("idle"),
    });
  }

  return (
    <div className="discover-playground">
      <section className="discover-intro">
        <div>
          <p className="eyebrow">Explore something</p>
          <h1>Pick a world. Mess with it.</h1>
          <p>There is nothing to finish and nothing to get right. Try things, notice what changes, and follow whatever gets interesting.</p>
        </div>
        <div className="discover-buddy">
          <BuddyPresence state={buddyState} label={buddyLine} />
          <button type="button" className="discover-speak" onClick={speakBuddy} aria-label="Hear Buddy say this">
            <SpeakerHigh size={18} />
          </button>
        </div>
      </section>

      {!active ? (
        <section className="discover-world-grid" aria-label="Things to explore">
          {activities.map(({ id, title, kicker, body, icon: Icon }) => (
            <button type="button" className="discover-world-card" key={id} onClick={() => choose(id)}>
              <span className="discover-world-icon" aria-hidden="true"><Icon size={34} /></span>
              <span className="discover-world-kicker">{kicker}</span>
              <strong>{title}</strong>
              <p>{body}</p>
              <span className="discover-world-open">Open it →</span>
            </button>
          ))}
        </section>
      ) : (
        <div className="discover-active-world">
          <button
            type="button"
            className="discover-back"
            onClick={() => {
              setActive(null);
              setBuddyLine("Pick something else, or go back to one you changed.");
              speech.stop();
              setBuddyState("idle");
            }}
          >
            <ArrowLeft size={18} /> All worlds
          </button>

          {active === "launch-lab" && <LaunchLab onBuddyLine={setBuddyLine} />}
          {active === "creature-lab" && <CreatureLab onBuddyLine={setBuddyLine} />}
          {active === "pattern-lab" && <PatternLab onBuddyLine={setBuddyLine} />}
        </div>
      )}

      <aside className="discover-principle">
        <strong>Why these change every time</strong>
        <p>Buddy is interested in how you explore: changing things, predicting, explaining, building and trying another way. It is not keeping a score of whether you were right.</p>
      </aside>
    </div>
  );
}
