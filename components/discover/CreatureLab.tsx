"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { recordLearningEvent } from "@/lib/learning/local-store";

type CreatureLabProps = {
  onBuddyLine: (line: string) => void;
};

type Habitat = "woods" | "water" | "wind" | "cave" | "lava" | "cloud" | "moon";
type BodyPlan = "blob" | "long" | "stack" | "many";
type Challenge = "move" | "eat" | "hide" | "talk" | "survive";
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

  const description = useMemo(() => {
    const chosen = traits.length
      ? traits.map((trait) => traitCopy[trait]).join(traits.length > 1 ? ", " : "")
      : "no special feature yet";
    return \`A \${bodyLabels[body].toLowerCase()} living around \${habitatCopy[habitat]}. It has \${chosen}.\`;
  }, [body, habitat, traits]);

  function chooseHabitat(next: Habitat) {
    setHabitat(next);
    onBuddyLine(\`New place, new problems. What would help a creature live around \${habitatCopy[next]}?\`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "creature-lab",
      detail: \`habitat:\${next}\`,
    });
  }

  function chooseBody(next: BodyPlan) {
    setBody(next);
    onBuddyLine(\`\${bodyLabels[next]}. Now make that body shape useful — or explain why it is gloriously impractical.\`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "creature-lab",
      detail: \`body:\${next}\`,
    });
  }

  function toggleTrait(trait: Trait) {
    setTraits((current) => {
      if (current.includes(trait)) return current.filter((item) => item !== trait);
      if (current.length >= 4) return [...current.slice(1), trait];
      return [...current, trait];
    });
    onBuddyLine(\`\${traitCopy[trait]} — what might that help with, and what new problem might it create?\`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "creature-lab",
      detail: \`trait:\${trait}\`,
    });
  }

  function chooseChallenge(next: Challenge) {
    setChallenge(next);
    onBuddyLine(\`\${challengeCopy[next]} Use the creature you already made — don't fix it unless you want to.\`);
    recordLearningEvent({
      kind: "discover_reflected",
      source: "discover",
      activityId: "creature-lab",
      detail: \`challenge:\${next}\`,
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
      detail: \`mutation:\${next.habitat}:\${next.body}:\${next.traits.join("+")}\`,
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
        <div className="creature-stage" data-habitat={habitat}>
          <div className="creature-sky" />
          <div className="creature-ground" />
          <span className="creature-world-object one" aria-hidden="true" />
          <span className="creature-world-object two" aria-hidden="true" />

          <motion.div
            className={\`invented-creature body-\${body}\`}
            key={\`\${habitat}-\${body}-\${traits.join("-")}\`}
            initial={{ scale: 0.88, rotate: -4, y: 8 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 14 }}
          >
            {traits.includes("glide") && <><span className="creature-wing left" /><span className="creature-wing right" /></>}
            {traits.includes("swim") && <><span className="creature-fin left" /><span className="creature-fin right" /></>}
            {traits.includes("antenna") && <><span className="creature-antenna left" /><span className="creature-antenna right" /></>}
            {traits.includes("tail") && <span className="creature-tail" />}
            {traits.includes("tentacles") && <div className="creature-tentacles"><i /><i /><i /></div>}

            <span className={\`creature-body\${traits.includes("warm") ? " furry" : ""}\${traits.includes("shell") ? " shelled" : ""}\`}>
              {traits.includes("horn") && <span className="creature-horn" />}
              <span className={\`creature-eye left\${traits.includes("night") ? " big" : ""}\`} />
              <span className={\`creature-eye right\${traits.includes("night") ? " big" : ""}\`} />
              {traits.includes("manyEyes") && <><span className="creature-extra-eye e1" /><span className="creature-extra-eye e2" /><span className="creature-extra-eye e3" /></>}
              {traits.includes("glow") && <><span className="creature-glow g1" /><span className="creature-glow g2" /><span className="creature-glow g3" /></>}
              <span className="creature-mouth" />
            </span>

            <span className={\`creature-foot left\${traits.includes("grip") ? " grippy" : ""}\${traits.includes("suction") ? " suction" : ""}\${traits.includes("wheels") ? " wheel" : ""}\`} />
            <span className={\`creature-foot right\${traits.includes("grip") ? " grippy" : ""}\${traits.includes("suction") ? " suction" : ""}\${traits.includes("wheels") ? " wheel" : ""}\`} />
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

          <button type="button" className="discover-secondary creature-remix" onClick={mutate}>
            <ArrowsClockwise size={18} /> Mutate it
          </button>
        </div>
      </div>
    </section>
  );
}
