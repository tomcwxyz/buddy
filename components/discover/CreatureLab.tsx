"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { recordLearningEvent } from "@/lib/learning/local-store";

type CreatureLabProps = {
  onBuddyLine: (line: string) => void;
};

type Habitat = "woods" | "water" | "wind";
type Trait = "grip" | "glide" | "warm" | "swim" | "night";

const habitatCopy: Record<Habitat, string> = {
  woods: "branches, shade and uneven ground",
  water: "deep water, currents and slippery edges",
  wind: "open ground, strong gusts and big drops",
};

const traitCopy: Record<Trait, string> = {
  grip: "wide gripping feet",
  glide: "stretchy gliding wings",
  warm: "a thick warm coat",
  swim: "broad swimming fins",
  night: "huge low-light eyes",
};

export function CreatureLab({ onBuddyLine }: CreatureLabProps) {
  const [habitat, setHabitat] = useState<Habitat>("woods");
  const [traits, setTraits] = useState<Trait[]>(["grip"]);
  const [mixIndex, setMixIndex] = useState(0);

  const description = useMemo(() => {
    const chosen = traits.length
      ? traits.map((trait) => traitCopy[trait]).join(traits.length > 1 ? " and " : "")
      : "no special feature yet";
    return `It lives around ${habitatCopy[habitat]}. You gave it ${chosen}.`;
  }, [habitat, traits]);

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

  function toggleTrait(trait: Trait) {
    setTraits((current) => {
      if (current.includes(trait)) return current.filter((item) => item !== trait);
      if (current.length >= 2) return [current[1], trait];
      return [...current, trait];
    });
    onBuddyLine(`${traitCopy[trait]} — interesting. What might that help with, and what might it make harder?`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "creature-lab",
      detail: `trait:${trait}`,
    });
  }

  function remix() {
    const mixes: Array<{ habitat: Habitat; traits: Trait[] }> = [
      { habitat: "water", traits: ["night", "swim"] },
      { habitat: "wind", traits: ["grip", "glide"] },
      { habitat: "woods", traits: ["warm", "night"] },
      { habitat: "water", traits: ["grip", "warm"] },
    ];
    const next = mixes[mixIndex % mixes.length];
    setMixIndex((value) => value + 1);
    setHabitat(next.habitat);
    setTraits(next.traits);
    onBuddyLine("That is a strange combination. Can you invent a reason it might work?");
    recordLearningEvent({
      kind: "discover_reflected",
      source: "discover",
      activityId: "creature-lab",
      detail: `remix:${next.habitat}:${next.traits.join("+")}`,
    });
  }

  return (
    <section className="discover-world creature-lab" aria-labelledby="creature-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Invent an animal</p>
          <h2 id="creature-title">Creature lab</h2>
          <p>Give it a place to live and a couple of useful — or ridiculous — features.</p>
        </div>
        <div className="discover-topic-chips" aria-label="Ideas hiding in this activity">
          <span>adaptation</span><span>trade-offs</span><span>description</span>
        </div>
      </div>

      <div className="creature-layout">
        <div className="creature-stage" data-habitat={habitat}>
          <div className="creature-sky" />
          <div className="creature-ground" />
          <motion.div
            className="invented-creature"
            key={`${habitat}-${traits.join("-")}`}
            initial={{ scale: 0.93, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 15 }}
          >
            {traits.includes("glide") && <><span className="creature-wing left" /><span className="creature-wing right" /></>}
            {traits.includes("swim") && <><span className="creature-fin left" /><span className="creature-fin right" /></>}
            <span className={`creature-body${traits.includes("warm") ? " furry" : ""}`}>
              <span className={`creature-eye left${traits.includes("night") ? " big" : ""}`} />
              <span className={`creature-eye right${traits.includes("night") ? " big" : ""}`} />
              <span className="creature-mouth" />
            </span>
            <span className={`creature-foot left${traits.includes("grip") ? " grippy" : ""}`} />
            <span className={`creature-foot right${traits.includes("grip") ? " grippy" : ""}`} />
          </motion.div>
          <p>{description}</p>
        </div>

        <div className="creature-controls">
          <div className="creature-control-group">
            <span>Where does it live?</span>
            <div className="creature-option-row">
              {(["woods", "water", "wind"] as Habitat[]).map((item) => (
                <button type="button" key={item} className={habitat === item ? "active" : ""} onClick={() => chooseHabitat(item)}>
                  {item === "woods" ? "Woodland" : item === "water" ? "Water" : "Windy cliffs"}
                </button>
              ))}
            </div>
          </div>

          <div className="creature-control-group">
            <span>Give it up to two things</span>
            <div className="creature-traits">
              {(Object.keys(traitCopy) as Trait[]).map((trait) => (
                <button type="button" key={trait} className={traits.includes(trait) ? "active" : ""} onClick={() => toggleTrait(trait)}>
                  {traitCopy[trait]}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="discover-secondary creature-remix" onClick={remix}>
            <ArrowsClockwise size={18} /> Give me a weird one
          </button>
        </div>
      </div>
    </section>
  );
}
