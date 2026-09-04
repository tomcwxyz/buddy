"use client";

import { motion, type Variants } from "framer-motion";

type BuddyPresenceState = "idle" | "listening" | "thinking" | "speaking";

type BuddyPresenceProps = {
  state?: BuddyPresenceState;
  label?: string;
};

const stateMotion: Record<BuddyPresenceState, Variants["animate"]> = {
  idle: {
    scale: [1, 1.035, 1],
    rotate: [0, 1.5, 0],
    transition: { duration: 4.8, repeat: Infinity, ease: "easeInOut" },
  },
  listening: {
    scale: [1, 1.08, 1],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    x: [0, 8, -5, 0],
    rotate: [0, 4, -3, 0],
    transition: { duration: 2.1, repeat: Infinity, ease: "easeInOut" },
  },
  speaking: {
    scaleY: [1, 0.94, 1.06, 0.98, 1],
    scaleX: [1, 1.04, 0.97, 1.02, 1],
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
};

export function BuddyPresence({ state = "idle", label = "I'm here when you need me." }: BuddyPresenceProps) {
  return (
    <div className="buddy-presence" aria-label={`Buddy is ${state}`}>
      <motion.div className="buddy-blob" animate={stateMotion[state]} />
      <motion.div
        className="buddy-shadow"
        animate={{ scaleX: state === "listening" ? [1, 1.08, 1] : [1, 0.95, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="buddy-label">{label}</span>
    </div>
  );
}
