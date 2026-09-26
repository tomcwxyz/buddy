"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowClockwise, RocketLaunch } from "@phosphor-icons/react";
import { recordLearningEvent } from "@/lib/learning/local-store";

type LaunchLabProps = {
  onBuddyLine: (line: string) => void;
};

type Slope = "low" | "high";
type Surface = "smooth" | "rough";
type Push = "gentle" | "fast";

export function LaunchLab({ onBuddyLine }: LaunchLabProps) {
  const [slope, setSlope] = useState<Slope>("low");
  const [surface, setSurface] = useState<Surface>("smooth");
  const [push, setPush] = useState<Push>("gentle");
  const [prediction, setPrediction] = useState<"slope" | "surface" | "push" | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  const distance = useMemo(() => {
    const value =
      31 +
      (slope === "high" ? 20 : 0) +
      (push === "fast" ? 27 : 0) -
      (surface === "rough" ? 17 : 0);
    return Math.max(18, Math.min(91, value));
  }, [push, slope, surface]);

  function change<T extends string>(kind: string, value: T, apply: (value: T) => void) {
    apply(value);
    setHasRun(false);
    onBuddyLine(`You changed the ${kind}. What do you think that will do?`);
    recordLearningEvent({
      kind: "discover_changed",
      source: "discover",
      activityId: "launch-lab",
      detail: `${kind}:${value}`,
    });
  }

  function run() {
    setRunKey((value) => value + 1);
    setHasRun(true);
    const line = surface === "rough"
      ? "That rough surface stole some of the motion. Change one thing and run it again."
      : slope === "high" && push === "fast"
        ? "That had a lot of motion to spend. What happens if you keep the slope but soften the push?"
        : slope === "high"
          ? "The higher start helped. Try changing only the surface next."
          : push === "fast"
            ? "That push mattered. What if the same push starts higher?"
            : "A gentle start gives you room to notice what each change does.";
    onBuddyLine(line);
    recordLearningEvent({
      kind: "discover_reflected",
      source: "discover",
      activityId: "launch-lab",
      detail: `run:slope=${slope};surface=${surface};push=${push};prediction=${prediction ?? "none"}`,
    });
  }

  function reset() {
    setSlope("low");
    setSurface("smooth");
    setPush("gentle");
    setPrediction(null);
    setHasRun(false);
    setRunKey((value) => value + 1);
    onBuddyLine("Back to the simple version. Now change one thing.");
  }

  return (
    <section className="discover-world launch-lab" aria-labelledby="launch-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Mess with motion</p>
          <h2 id="launch-title">Launch lab</h2>
          <p>Build a run, make a prediction, then change one thing and see what happens.</p>
        </div>
        <div className="discover-topic-chips" aria-label="Ideas hiding in this activity">
          <span>speed</span><span>slope</span><span>friction</span><span>prediction</span>
        </div>
      </div>

      <div className="launch-stage" data-slope={slope} data-surface={surface}>
        <div className="launch-ramp" aria-hidden="true" />
        <div className="launch-runway" aria-hidden="true">
          <span className="launch-texture" />
        </div>
        <motion.div
          key={runKey}
          className="launch-cart"
          initial={{ left: "8%", rotate: 0 }}
          animate={hasRun ? { left: `${distance}%`, rotate: 360 } : { left: "8%", rotate: 0 }}
          transition={{ type: "spring", stiffness: 42, damping: 13, mass: 0.8 }}
          aria-label={hasRun ? "The cart has travelled along the runway" : "The cart is ready to launch"}
        >
          <span />
        </motion.div>
        <div className="launch-distance-note" aria-live="polite">
          {hasRun ? "That was this version. Change it and compare." : "Ready when you are."}
        </div>
      </div>

      <div className="launch-controls">
        <Control
          label="Start"
          value={slope}
          options={[["low", "Low ramp"], ["high", "High ramp"]]}
          onChange={(value) => change("start", value as Slope, setSlope)}
        />
        <Control
          label="Ground"
          value={surface}
          options={[["smooth", "Smooth"], ["rough", "Rough"]]}
          onChange={(value) => change("ground", value as Surface, setSurface)}
        />
        <Control
          label="Push"
          value={push}
          options={[["gentle", "Gentle"], ["fast", "Fast"]]}
          onChange={(value) => change("push", value as Push, setPush)}
        />
      </div>

      <div className="launch-prediction">
        <span>Before you send it: what do you think matters most?</span>
        <div>
          {(["slope", "surface", "push"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={prediction === item ? "active" : ""}
              onClick={() => setPrediction(item)}
            >
              {item === "slope" ? "The ramp" : item === "surface" ? "The ground" : "The push"}
            </button>
          ))}
        </div>
      </div>

      <div className="discover-world-actions">
        <button type="button" className="discover-primary" onClick={run}>
          <RocketLaunch size={20} /> Send it
        </button>
        <button type="button" className="discover-secondary" onClick={reset}>
          <ArrowClockwise size={18} /> Start simple
        </button>
      </div>
    </section>
  );
}

function Control({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="launch-control">
      <span>{label}</span>
      <div>
        {options.map(([option, optionLabel]) => (
          <button
            type="button"
            key={option}
            className={value === option ? "active" : ""}
            onClick={() => onChange(option)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
