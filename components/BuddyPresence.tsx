"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

type BuddyPresenceState = "idle" | "listening" | "thinking" | "speaking";
type BuddyReaction = "hello" | "squish" | "tilt";

type BuddyPresenceProps = {
  state?: BuddyPresenceState;
  label?: string;
};

const stateMotion: Variants = {
  idle: {
    y: [0, -3, 0],
    scaleX: [1, 1.018, 1],
    scaleY: [1, 0.985, 1],
    rotate: [0, 0.8, 0],
    transition: { duration: 5.4, repeat: Infinity, ease: "easeInOut" },
  },
  listening: {
    y: [0, -4, 0],
    scaleX: [1, 1.035, 1],
    scaleY: [1, 1.018, 1],
    rotate: [0, -1.4, 0],
    transition: { duration: 2.7, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    x: [0, 5, -3, 0],
    y: [0, -2, 0],
    rotate: [0, 2.4, -1.6, 0],
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
  },
  speaking: {
    scaleY: [1, 0.965, 1.025, 0.985, 1],
    scaleX: [1, 1.025, 0.985, 1.015, 1],
    y: [0, 1, -2, 0],
    transition: { duration: 1.55, repeat: Infinity, ease: "easeInOut" },
  },
  hello: {
    y: [0, -10, -3, 0],
    x: [0, 3, -2, 0],
    rotate: [0, -5, 3, 0],
    scale: [1, 1.04, 0.99, 1],
    transition: { duration: 0.72, ease: "easeOut" },
  },
  squish: {
    y: [0, 5, -5, 0],
    scaleX: [1, 1.09, 0.96, 1],
    scaleY: [1, 0.9, 1.07, 1],
    rotate: [0, 1.5, -1, 0],
    transition: { duration: 0.66, ease: "easeOut" },
  },
  tilt: {
    x: [0, 7, -2, 0],
    y: [0, -3, 0],
    rotate: [0, 7, -3, 0],
    scale: [1, 1.025, 1],
    transition: { duration: 0.74, ease: "easeOut" },
  },
};

const shadowMotion: Variants = {
  idle: {
    scaleX: [1, 0.93, 1],
    opacity: [0.72, 0.58, 0.72],
    transition: { duration: 5.4, repeat: Infinity, ease: "easeInOut" },
  },
  listening: {
    scaleX: [1, 1.06, 1],
    transition: { duration: 2.7, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    x: [0, 3, -2, 0],
    scaleX: [1, 0.95, 1],
    transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
  },
  speaking: {
    scaleX: [1, 1.04, 0.97, 1],
    transition: { duration: 1.55, repeat: Infinity, ease: "easeInOut" },
  },
  hello: {
    scaleX: [1, 0.82, 0.96, 1],
    opacity: [0.72, 0.45, 0.66, 0.72],
    transition: { duration: 0.72, ease: "easeOut" },
  },
  squish: {
    scaleX: [1, 1.12, 0.92, 1],
    opacity: [0.72, 0.82, 0.58, 0.72],
    transition: { duration: 0.66, ease: "easeOut" },
  },
  tilt: {
    x: [0, 5, -2, 0],
    scaleX: [1, 0.95, 1],
    transition: { duration: 0.74, ease: "easeOut" },
  },
};

const reactions: BuddyReaction[] = ["hello", "squish", "tilt"];

export function BuddyPresence({ state = "idle", label = "I'm here when you need me." }: BuddyPresenceProps) {
  const reduceMotion = useReducedMotion();
  const [reaction, setReaction] = useState<BuddyReaction | null>(null);
  const [reactionKey, setReactionKey] = useState(0);
  const reactionIndex = useRef(0);

  function react() {
    const next = reactions[reactionIndex.current % reactions.length];
    reactionIndex.current += 1;
    setReactionKey((value) => value + 1);
    setReaction(next);
  }

  const activeMotion = reduceMotion ? undefined : reaction ?? state;
  const reacting = reaction !== null;

  useEffect(() => {
    if (!reaction || !reduceMotion) return;
    const timeout = window.setTimeout(() => setReaction(null), 420);
    return () => window.clearTimeout(timeout);
  }, [reaction, reduceMotion]);

  return (
    <button
      type="button"
      className="buddy-presence"
      aria-label="Say hello to Buddy"
      data-state={state}
      data-reacting={reacting ? "true" : "false"}
      data-reaction-count={reactionKey}
      onClick={react}
    >
      <span className="buddy-aura" aria-hidden="true" />
      <motion.span
        className="buddy-blob"
        variants={stateMotion}
        animate={activeMotion}
        onAnimationComplete={() => {
          if (reaction) setReaction(null);
        }}
      >
        <span className="buddy-soft-spot" aria-hidden="true" />
      </motion.span>

      {reaction && !reduceMotion && (
        <span className="buddy-motes" aria-hidden="true" key={reactionKey}>
          <motion.i
            className="buddy-mote buddy-mote-one"
            initial={{ opacity: 0, scale: 0.45, x: 0, y: 0 }}
            animate={{ opacity: [0, 0.85, 0], scale: [0.45, 1, 0.7], x: [0, -18, -24], y: [0, -20, -30] }}
            transition={{ duration: 0.72, ease: "easeOut" }}
          />
          <motion.i
            className="buddy-mote buddy-mote-two"
            initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
            animate={{ opacity: [0, 0.72, 0], scale: [0.4, 0.9, 0.65], x: [0, 18, 26], y: [0, -12, -24] }}
            transition={{ duration: 0.76, delay: 0.05, ease: "easeOut" }}
          />
        </span>
      )}

      <motion.span
        className="buddy-shadow"
        variants={shadowMotion}
        animate={activeMotion}
        aria-hidden="true"
      />
      <span className="buddy-label">{label}</span>
    </button>
  );
}
