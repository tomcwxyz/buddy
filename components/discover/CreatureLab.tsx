"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowsClockwise, Play } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { recordLearningEvent } from "@/lib/learning/local-store";
import { readDiscoverState, writeDiscoverState } from "@/lib/discover/local-store";

type CreatureLabProps = {
  onBuddyLine: (line: string) => void;
};

type Habitat = "woods" | "water" | "wind" | "cave" | "lava" | "cloud" | "moon";
type BodyPlan = "blob" | "long" | "stack" | "many";
type Challenge = "move" | "eat" | "hide" | "talk" | "survive";
type WorldEvent = "none" | "storm" | "dark" | "flood" | "cold" | "quake";
type Trait =
  | "grip"
  | "glide"
  | "warm"
  | "swim"
  | "night"
  | "antenna"
  | "wheels"
  | "shell"
  | "glow"
  | "suction"
  | "tail"
  | "horn"
  | "tentacles"
  | "manyEyes";

const habitatCopy: Record<Habitat, string> = {
  woods: "branches, shade and uneven ground",
  water: "deep water, currents and slippery edges",
  wind: "open ground, strong gusts and big drops",
  cave: "dark tunnels, tight gaps and echoing chambers",
  lava: "cracked rock, fierce heat and glowing lava",
  cloud: "thin air, drifting cloud islands and enormous drops",
  moon: "dust, low gravity and almost no atmosphere",
};

const habitatLabels: Record<Habitat, string> = {
  woods: "Woodland",
  water: "Deep water",
  wind: "Windy cliffs",
  cave: "Cave maze",
  lava: "Lava world",
  cloud: "Cloud islands",
  moon: "Tiny moon",
};

const bodyLabels: Record<BodyPlan, string> = {
  blob: "Squishy blob",
  long: "Long noodle",
  stack: "Stacked body",
  many: "Many-legged thing",
};

const traitCopy: Record<Trait, string> = {
  grip: "wide gripping feet",
  glide: "stretchy gliding wings",
  warm: "a thick warm coat",
  swim: "broad swimming fins",
  night: "huge low-light eyes",
  antenna: "long sensing antennae",
  wheels: "wheels instead of feet",
  shell: "a heavy protective shell",
  glow: "glowing spots",
  suction: "suction-cup feet",
  tail: "a huge steering tail",
  horn: "a crystal horn",
  tentacles: "wobbly tentacles",
  manyEyes: "far too many eyes",
};

const eventCopy: Record<Exclude<WorldEvent, "none">, string> = {
  storm: "A sudden storm arrives",
  dark: "Everything goes dark",
  flood: "The ground starts flooding",
  cold: "The temperature suddenly drops",
  quake: "The ground starts shaking",
};

const challengeCopy: Record<Challenge, string> = {
  move: "How does it get around?",
  eat: "How does it find and get food?",
  hide: "How does it avoid being noticed?",
  talk: "How does it communicate?",
  survive: "What keeps it alive when the habitat gets difficult?",
};

const mutations: Array<{ habitat: Habitat; body: BodyPlan; traits: Trait[] }> = [
  { habitat: "moon", body: "many", traits: ["glide", "wheels", "manyEyes", "antenna"] },
  { habitat: "lava", body: "stack", traits: ["shell", "glow", "suction", "horn"] },
  { habitat: "cloud", body: "long", traits: ["glide", "tail", "tentacles", "warm"] },
  { habitat: "cave", body: "blob", traits: ["night", "antenna", "glow", "manyEyes"] },
  { habitat: "water", body: "many", traits: ["swim", "suction", "shell", "tentacles"] },
  { habitat: "woods", body: "stack", traits: ["wheels", "grip", "tail", "horn"] },
];

export function CreatureLab({ onBuddyLine }: CreatureLabProps) {
  const [habitat, setHabitat] = useState<Habitat>("woods");
  const [body, setBody] = useState<BodyPlan>("blob");
  const [traits, setTraits] = useState<Trait[]>(["grip"]);
  const [challenge, setChallenge] = useState<Challenge>("move");
  const [mixIndex, setMixIndex] = useState(0);
  const [testKey, setTestKey] = useState(0);
  const [worldEvent, setWorldEvent] = useState<WorldEvent>("none");
  const [eventIndex, setEventIndex] = useState(0);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = readDiscoverState<{
      habitat: Habitat;
      body: BodyPlan;
      traits: Trait[];
      challenge: Challenge;
      worldEvent: WorldEvent;
    }>("creature-lab");

    if (saved) {
      setHabitat(saved.habitat);
      setBody(saved.body);
      setTraits(Array.isArray(saved.traits) ? saved.traits.slice(0, 4) : ["grip"]);
      setChallenge(saved.challenge);
      setWorldEvent(saved.worldEvent ?? "none");
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    writeDiscoverState("creature-lab", {
      habitat,
      body,
      traits,
      challenge,
      worldEvent,
    });
  }, [body, challenge, habitat, restored, traits, worldEvent]);

  const testMotion = useMemo(() => {
    if (challenge === "move") {
      if (traits.includes("glide")) return { x:[0,42,-18,0], y:[0,-58,-30,0], rotate:[0,8,-5,0] };
      if (traits.includes("wheels")) return { x:[0,72,-32,0], y:[0,0,0,0], rotate:[0,3,-3,0] };
      if (traits.includes("swim")) return { x:[0,38,-28,0], y:[0,18,-16,0], rotate:[0,-8,7,0] };
      return { x:[0,18,-12,0], y:[0,-8,0,0], rotate:[0,2,-2,0] };
    }
    if (challenge === "hide") {
      return { x:[0,-24,-24,0], y:[0,8,8,0], scale:[1,0.72,0.72,1], opacity:[1,0.55,0.55,1] };
    }
    if (challenge === "talk") {
      return { y:[0,-8,0,-8,0], rotate:[0,-3,3,-3,0], scale:[1,1.04,0.98,1.04,1] };
    }
    if (challenge === "eat") {
      return { x:[0,24,12,0], y:[0,-6,4,0], rotate:[0,4,-2,0], scale:[1,1.05,1.02,1] };
    }
    return { y:[0,-18,0,-10,0], rotate:[0,6,-5,4,0], scale:[1,0.96,1.04,0.98,1] };
  }, [challenge, traits]);

  const description = useMemo(() => {
    const chosen = traits.length
      ? traits.map((trait) => traitCopy[trait]).join(traits.length > 1 ? ", " : "")
      : "no special feature yet";
    return `A ${bodyLabels[body].toLowerCase()} living around ${habitatCopy[habitat]}. It has ${chosen}.`;
  }, [body, habitat, traits]);

  function chooseHabitat(next: Habitat) {
    setHabitat(next);
    onBuddyLine(`New place, new problems. What would help a creature live around ${habitatCopy[next]}?`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "creature-lab",
      detail: `habitat:${next}`,
    });
  }

  function chooseBody(next: BodyPlan) {
    setBody(next);
    onBuddyLine(`${bodyLabels[next]}. Now make that body shape useful — or explain why it is gloriously impractical.`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "creature-lab",
      detail: `body:${next}`,
    });
  }

  function toggleTrait(trait: Trait) {
    setTraits((current) => {
      if (current.includes(trait)) return current.filter((item) => item !== trait);
      if (current.length >= 4) return [...current.slice(1), trait];
      return [...current, trait];
    });
    onBuddyLine(`${traitCopy[trait]} — what might that help with, and what new problem might it create?`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "creature-lab",
      detail: `trait:${trait}`,
    });
  }

  function chooseChallenge(next: Challenge) {
    setChallenge(next);
    onBuddyLine(`${challengeCopy[next]} Use the creature you already made — don't fix it unless you want to.`);
    recordLearningEvent({
      kind: "discover_reflected",
      source: "discover",
      activityId: "creature-lab",
      detail: `challenge:${next}`,
    });
  }

  function testCreature() {
    setTestKey((value) => value + 1);
    const hasHelpfulMove = traits.some((trait) => ["glide","wheels","swim","grip","suction","tail"].includes(trait));

    let line = challenge === "move"
      ? hasHelpfulMove
        ? "It has a way to move — but does that way actually suit this world? Try moving it somewhere stranger."
        : "It can move, sort of. This is a good moment to invent a feature rather than fix a mistake."
      : challenge === "hide"
        ? traits.includes("glow")
          ? "Glowing while hiding is a spectacular trade-off. Why might glowing still be worth it?"
          : "It is trying to disappear. Which feature helps most, and which gives it away?"
        : challenge === "talk"
          ? traits.includes("antenna") || traits.includes("glow")
            ? "Maybe it talks with signals rather than a voice. What could the signal mean?"
            : "It needs a communication trick. It does not have to be a sound."
          : challenge === "eat"
            ? "How it gets food depends on both the body and the world. What does it eat that makes this shape useful?"
            : "The world is pushing back. Which feature keeps helping, and which one suddenly becomes a problem?";

    if (worldEvent === "storm") {
      line = traits.includes("grip") || traits.includes("suction")
        ? "The storm is trying to move it, but those gripping features suddenly matter a lot. What happens to anything wide, light or wing-shaped?"
        : "The storm is pushing everything sideways. Which feature would help it stay put — and which feature might make the wind catch it more?";
    } else if (worldEvent === "dark") {
      line = traits.includes("night") || traits.includes("glow")
        ? "Darkness changed the problem. Its eyes or glow suddenly became much more useful than they were a moment ago."
        : "The lights went out. Which senses could still work if vision stopped being useful?";
    } else if (worldEvent === "flood") {
      line = traits.includes("swim") || traits.includes("glide")
        ? "The flood changed the ground into a different kind of world. A feature that looked unnecessary may suddenly be useful."
        : "The floor is becoming water. Does the creature adapt with what it already has, or does it need a completely different trick?";
    } else if (worldEvent === "cold") {
      line = traits.includes("warm")
        ? "The sudden cold makes that thick coat look clever. Would the same coat still help when the world heats back up?"
        : "The temperature dropped. Staying warm is now a problem the creature did not have a moment ago.";
    } else if (worldEvent === "quake") {
      line = traits.includes("grip") || traits.includes("suction") || body === "many"
        ? "The ground is shaking. More contact with the ground may help — but could it also make movement harder?"
        : "The ground will not stay still. A body that worked fine a moment ago now has a balance problem.";
    } else if (habitat === "moon" && traits.includes("glide")) {
      line = "Those gliding wings have a problem: this tiny moon has almost no air to push against. Can the wings do a different job?";
    } else if (habitat === "water" && traits.includes("wheels") && !traits.includes("swim")) {
      line = "Wheels underwater are gloriously awkward. What would have to be unusual about the sea floor for them to help?";
    } else if (habitat === "lava" && traits.includes("warm")) {
      line = "A thick warm coat on lava world may solve the wrong problem. Could it insulate the creature from heat instead?";
    } else if (habitat === "cave" && traits.includes("manyEyes") && !traits.includes("night") && !traits.includes("glow")) {
      line = "Lots of eyes do not help much if there is almost no light. What else could those eyes detect?";
    } else if (habitat === "cloud" && traits.includes("wheels")) {
      line = "Wheels on cloud islands need something to roll on. Maybe your clouds are solid — what would that change about the world?";
    }

    onBuddyLine(line);
    recordLearningEvent({
      kind:"discover_reflected",
      source:"discover",
      activityId:"creature-lab",
      detail:`test:${challenge}:habitat=${habitat}:traits=${traits.join("+")}`,
    });
  }

  function surpriseWorld() {
    const events: Array<Exclude<WorldEvent, "none">> = ["storm","dark","flood","cold","quake"];
    const next = events[eventIndex % events.length];
    setEventIndex((value) => value + 1);
    setWorldEvent(next);
    onBuddyLine(`${eventCopy[next]}. Do not redesign yet — first see what your current creature does with it.`);
    recordLearningEvent({
      kind:"discover_changed",
      source:"discover",
      activityId:"creature-lab",
      detail:`event:${next}`,
    });
  }

  function resetCreature() {
    setHabitat("woods");
    setBody("blob");
    setTraits(["grip"]);
    setChallenge("move");
    setWorldEvent("none");
    setTestKey((value) => value + 1);
    onBuddyLine("New creature. One grippy foot in the woodland is enough to start from.");
    recordLearningEvent({
      kind:"discover_changed",
      source:"discover",
      activityId:"creature-lab",
      detail:"reset:new-creature",
    });
  }

  function mutate() {
    const next = mutations[mixIndex % mutations.length];
    setMixIndex((value) => value + 1);
    setHabitat(next.habitat);
    setBody(next.body);
    setTraits(next.traits);
    onBuddyLine("That creature should probably not work. Invent a reason it does.");
    recordLearningEvent({
      kind: "discover_reflected",
      source: "discover",
      activityId: "creature-lab",
      detail: `mutation:${next.habitat}:${next.body}:${next.traits.join("+")}`,
    });
  }

  return (
    <section className="discover-world creature-lab" aria-labelledby="creature-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Invent something alive-ish</p>
          <h2 id="creature-title">Creature lab</h2>
          <p>Start with adaptation if you want. Then add wheels, tentacles, too many eyes or a crystal horn and make the nonsense make sense.</p>
        </div>
        <div className="discover-topic-chips" aria-label="Ideas hiding in this activity">
          <span>adaptation</span><span>trade-offs</span><span>systems</span><span>story</span><span>explanation</span>
        </div>
      </div>

      <div className="creature-layout">
        <div className="creature-stage" data-habitat={habitat} data-event={worldEvent}>
          <div className="creature-sky" />
          <div className="creature-ground" />
          <span className="creature-world-object one" aria-hidden="true" />
          <span className="creature-world-object two" aria-hidden="true" />
          {worldEvent !== "none" && (
            <div className="creature-event-badge" aria-live="polite">
              {eventCopy[worldEvent]}
            </div>
          )}

          <motion.div
            className={`invented-creature body-${body}`}
            key={`${habitat}-${body}-${traits.join("-")}-${testKey}`}
            initial={{ scale: 0.88, rotate: -4, y: 8 }}
            animate={testKey ? testMotion : { scale:1, rotate:0, y:0 }}
            transition={testKey ? { duration:1.7, ease:"easeInOut" } : { type:"spring", stiffness:170, damping:14 }}
          >
            {traits.includes("glide") && <><span className="creature-wing left" /><span className="creature-wing right" /></>}
            {traits.includes("swim") && <><span className="creature-fin left" /><span className="creature-fin right" /></>}
            {traits.includes("antenna") && <><span className="creature-antenna left" /><span className="creature-antenna right" /></>}
            {traits.includes("tail") && <span className="creature-tail" />}
            {traits.includes("tentacles") && <div className="creature-tentacles"><i /><i /><i /></div>}

            <span className={`creature-body${traits.includes("warm") ? " furry" : ""}${traits.includes("shell") ? " shelled" : ""}`}>
              {traits.includes("horn") && <span className="creature-horn" />}
              <span className={`creature-eye left${traits.includes("night") ? " big" : ""}`} />
              <span className={`creature-eye right${traits.includes("night") ? " big" : ""}`} />
              {traits.includes("manyEyes") && <><span className="creature-extra-eye e1" /><span className="creature-extra-eye e2" /><span className="creature-extra-eye e3" /></>}
              {traits.includes("glow") && <><span className="creature-glow g1" /><span className="creature-glow g2" /><span className="creature-glow g3" /></>}
              <span className="creature-mouth" />
            </span>

            <span className={`creature-foot left${traits.includes("grip") ? " grippy" : ""}${traits.includes("suction") ? " suction" : ""}${traits.includes("wheels") ? " wheel" : ""}`} />
            <span className={`creature-foot right${traits.includes("grip") ? " grippy" : ""}${traits.includes("suction") ? " suction" : ""}${traits.includes("wheels") ? " wheel" : ""}`} />
            {body === "many" && <><span className="creature-foot extra-left" /><span className="creature-foot extra-right" /></>}
          </motion.div>

          <div className="creature-stage-copy">
            <strong>{challengeCopy[challenge]}</strong>
            <p>{description}</p>
          </div>
        </div>

        <div className="creature-controls">
          <div className="creature-control-group">
            <span>World</span>
            <div className="creature-option-row habitat-options">
              {(Object.keys(habitatLabels) as Habitat[]).map((item) => (
                <button type="button" key={item} className={habitat === item ? "active" : ""} onClick={() => chooseHabitat(item)}>
                  {habitatLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="creature-control-group">
            <span>Body plan</span>
            <div className="creature-option-row body-options">
              {(Object.keys(bodyLabels) as BodyPlan[]).map((item) => (
                <button type="button" key={item} className={body === item ? "active" : ""} onClick={() => chooseBody(item)}>
                  {bodyLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="creature-control-group">
            <span>Up to four useful, useless or deeply questionable features</span>
            <div className="creature-traits">
              {(Object.keys(traitCopy) as Trait[]).map((trait) => (
                <button type="button" key={trait} className={traits.includes(trait) ? "active" : ""} onClick={() => toggleTrait(trait)}>
                  {traitCopy[trait]}
                </button>
              ))}
            </div>
          </div>

          <div className="creature-control-group creature-challenges">
            <span>Give your creature a problem</span>
            <div>
              {(Object.keys(challengeCopy) as Challenge[]).map((item) => (
                <button type="button" key={item} className={challenge === item ? "active" : ""} onClick={() => chooseChallenge(item)}>
                  {challengeCopy[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="creature-test-actions">
            <button type="button" className="discover-primary" onClick={testCreature}>
              <Play size={18} /> Test it
            </button>
            <button type="button" className="discover-secondary" onClick={surpriseWorld}>
              Surprise the world
            </button>
            <button type="button" className="discover-secondary creature-remix" onClick={mutate}>
              <ArrowsClockwise size={18} /> Mutate it
            </button>
            <button type="button" className="discover-secondary" onClick={resetCreature}>
              New creature
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
