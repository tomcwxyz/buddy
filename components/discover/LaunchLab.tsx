"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowClockwise, RocketLaunch } from "@phosphor-icons/react";
import { recordLearningEvent } from "@/lib/learning/local-store";
import { readDiscoverState, writeDiscoverState } from "@/lib/discover/local-store";

type LaunchLabProps = { onBuddyLine: (line: string) => void };
type Slope = "low" | "high" | "drop";
type Surface = "smooth" | "rough" | "bumpy";
type Push = "gentle" | "fast" | "ridiculous";
type PhysicsMode = "real" | "moon" | "bounce" | "reverse" | "magnet";
type TrackToy = "none" | "booster" | "spring" | "loop" | "portal";

const physicsOptions: Array<{ id: PhysicsMode; label: string; note: string }> = [
  { id:"real", label:"Real world", note:"Gravity behaves itself." },
  { id:"moon", label:"Moon-ish", note:"Low gravity. Big floaty jumps." },
  { id:"bounce", label:"Jelly world", note:"The floor gives everything back." },
  { id:"reverse", label:"Wrong gravity", note:"Down has stopped being reliable." },
  { id:"magnet", label:"Magnet chaos", note:"Invisible forces yank the cart around." },
];

const toyOptions: Array<[TrackToy, string]> = [
  ["none", "Plain track"],
  ["booster", "Booster"],
  ["spring", "Spring"],
  ["loop", "Loop"],
  ["portal", "Portal"],
];

export function LaunchLab({ onBuddyLine }: LaunchLabProps) {
  const [slope, setSlope] = useState<Slope>("low");
  const [surface, setSurface] = useState<Surface>("smooth");
  const [push, setPush] = useState<Push>("gentle");
  const [physics, setPhysics] = useState<PhysicsMode>("real");
  const [toy, setToy] = useState<TrackToy>("none");
  const [prediction, setPrediction] = useState<"slope" | "surface" | "push" | "physics" | "toy" | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [runHistory, setRunHistory] = useState<string[]>([]);
  const [lastRealDistance, setLastRealDistance] = useState<number | null>(null);
  const [ghostDistance, setGhostDistance] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = readDiscoverState<{
      slope: Slope;
      surface: Surface;
      push: Push;
      physics: PhysicsMode;
      toy: TrackToy;
      runHistory: string[];
      lastRealDistance: number | null;
    }>("launch-lab");

    if (saved) {
      setSlope(saved.slope);
      setSurface(saved.surface);
      setPush(saved.push);
      setPhysics(saved.physics);
      setToy(saved.toy);
      setRunHistory(Array.isArray(saved.runHistory) ? saved.runHistory.slice(0, 3) : []);
      setLastRealDistance(typeof saved.lastRealDistance === "number" ? saved.lastRealDistance : null);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    writeDiscoverState("launch-lab", {
      slope,
      surface,
      push,
      physics,
      toy,
      runHistory,
      lastRealDistance,
    });
  }, [lastRealDistance, physics, push, restored, runHistory, slope, surface, toy]);

  const realDistance = useMemo(() => {
    const value =
      28 +
      (slope === "high" ? 18 : slope === "drop" ? 31 : 0) +
      (push === "fast" ? 23 : push === "ridiculous" ? 42 : 0) -
      (surface === "rough" ? 17 : surface === "bumpy" ? 9 : 0) +
      (toy === "booster" ? 11 : 0);
    return Math.max(16, Math.min(91, value));
  }, [push, slope, surface, toy]);

  const motionPlan = useMemo(() => {
    if (!hasRun) return { left:"8%", y:0, rotate:0, scale:1 };

    if (toy === "portal") {
      return {
        left:["8%","31%","31%","76%","88%"],
        y:[0,-24,-24,-82,0],
        rotate:[0,110,110,610,760],
        scale:[1,1,0.15,1.12,1],
      };
    }

    if (toy === "loop" && physics === "real") {
      return {
        left:["8%","48%","57%","61%","66%","74%","88%"],
        y:[0,0,-34,-82,-38,0,0],
        rotate:[0,170,360,560,760,920,1080],
        scale:[1,1,0.98,0.96,0.98,1,1],
      };
    }

    if (physics === "moon") {
      return {
        left:["8%","34%","61%","88%"],
        y:[0,-72,-112,0],
        rotate:[0,120,360,520],
        scale:[1,1.03,1.03,1],
      };
    }

    if (physics === "bounce") {
      return {
        left:["8%","30%","49%","67%","86%"],
        y:[0,-92,0,-56,0],
        rotate:[0,240,440,630,820],
        scale:[1,1.05,0.94,1.04,1],
      };
    }

    if (physics === "reverse") {
      return {
        left:["8%","28%","44%","62%"],
        y:[0,-30,-132,-178],
        rotate:[0,-90,-280,-430],
        scale:[1,1,1.06,0.96],
      };
    }

    if (physics === "magnet") {
      return {
        left:["8%","38%","61%","43%","79%","88%"],
        y:[0,-18,-104,-58,-24,0],
        rotate:[0,130,560,210,820,1080],
        scale:[1,0.94,1.1,0.92,1.05,1],
      };
    }

    const hops = toy === "spring"
      ? [0,-96,0,-42,0]
      : surface === "bumpy"
        ? [0,-18,0,-13,0]
        : slope === "drop" && push !== "gentle"
          ? [0,-24,0]
          : 0;

    return {
      left:`${realDistance}%`,
      y:hops,
      rotate:toy === "loop" ? 1080 : surface === "bumpy" ? [0,120,230,330,420] : 360,
      scale:1,
    };
  }, [hasRun, physics, push, realDistance, slope, surface, toy]);

  function change<T extends string>(kind: string, value: T, apply: (value: T) => void) {
    apply(value);
    setHasRun(false);
    onBuddyLine(`You changed the ${kind}. What do you think that will do?`);
    recordLearningEvent({ kind:"discover_changed", source:"discover", activityId:"launch-lab", detail:`${kind}:${value}` });
  }

  function choosePhysics(next: PhysicsMode) {
    setPhysics(next);
    setHasRun(false);
    const option = physicsOptions.find((item) => item.id === next);
    onBuddyLine(next === "real"
      ? "Physics is behaving again. Change one thing and see if your prediction holds."
      : `${option?.label}. The rules have changed. Which bit looks impossible now?`);
    recordLearningEvent({ kind:"discover_changed", source:"discover", activityId:"launch-lab", detail:`physics:${next}` });
  }

  function chooseToy(next: TrackToy) {
    setToy(next);
    setHasRun(false);
    const label = toyOptions.find(([id]) => id === next)?.[1] ?? next;
    onBuddyLine(next === "none"
      ? "Plain track again. Now the ramp, ground and push have to do all the work."
      : next === "portal"
        ? "Portal added. That one is deliberately impossible. Where should the cart appear?"
        : `${label} added. What do you think it will change?`);
    recordLearningEvent({ kind:"discover_changed", source:"discover", activityId:"launch-lab", detail:`toy:${next}` });
  }

  function run() {
    setRunKey((value) => value + 1);
    setHasRun(true);

    let line = physics !== "real"
      ? physics === "moon"
        ? "That float lasted much longer than it would on Earth. Low gravity changes how quickly things fall."
        : physics === "bounce"
          ? "That floor is giving energy back instead of losing it. Real surfaces are much less generous."
          : physics === "reverse"
            ? "Gravity just broke. Can you describe exactly which part is impossible?"
            : "Those invisible sideways pulls are deliberately ridiculous. What real force does it remind you of?"
      : surface === "rough"
        ? "That rough surface stole some motion. Change one thing and run it again."
        : surface === "bumpy"
          ? "The bumps keep redirecting some of the motion. Try the same run on smooth ground."
          : slope === "drop" && push === "ridiculous"
            ? "That is a lot of energy in one run. What could you change if you wanted distance without such a huge push?"
            : slope === "high" || slope === "drop"
              ? "The higher start helped. Try changing only the surface next."
              : push !== "gentle"
                ? "That push mattered. What if the same push starts higher?"
                : "A gentle start gives you room to notice what each change does.";

    if (toy === "booster") line = "The booster added energy part-way through the run. Try the same setup without it and compare.";
    if (toy === "spring") line = "That spring changed forward motion into a big upward jump. What did that cost in distance?";
    if (toy === "loop") line = "The loop changes direction while the cart keeps moving. Where does it need the most speed?";
    if (toy === "portal") line = "The portal is pure nonsense physics. The interesting bit is noticing exactly what rule it breaks.";

    if (physics === "real") {
      setGhostDistance(lastRealDistance);
      setLastRealDistance(realDistance);
    }

    const physicsLabel = physics === "real" ? "Real" : physicsOptions.find((item) => item.id === physics)?.label ?? physics;
    const memory = `${physicsLabel} · ${slope} · ${surface} · ${push}${toy !== "none" ? ` · ${toy}` : ""}`;
    setRunHistory((items) => [memory, ...items].slice(0, 3));
    onBuddyLine(line);

    recordLearningEvent({
      kind:"discover_reflected",
      source:"discover",
      activityId:"launch-lab",
      detail:`run:physics=${physics};slope=${slope};surface=${surface};push=${push};toy=${toy};prediction=${prediction ?? "none"}`,
    });
  }

  function remix() {
    const slopes: Slope[] = ["low","high","drop"];
    const surfaces: Surface[] = ["smooth","rough","bumpy"];
    const pushes: Push[] = ["gentle","fast","ridiculous"];
    const modes: PhysicsMode[] = ["real","moon","bounce","reverse","magnet"];
    const toys: TrackToy[] = ["none","booster","spring","loop","portal"];
    setSlope(slopes[(runKey + 1) % slopes.length]);
    setSurface(surfaces[(runKey + 2) % surfaces.length]);
    setPush(pushes[(runKey + 1) % pushes.length]);
    setPhysics(modes[(runKey + 2) % modes.length]);
    setToy(toys[(runKey + 3) % toys.length]);
    setHasRun(false);
    onBuddyLine("I remixed the whole track. Before you send it, pick the bit you think will matter most.");
  }

  function reset() {
    setSlope("low");
    setSurface("smooth");
    setPush("gentle");
    setPhysics("real");
    setToy("none");
    setPrediction(null);
    setHasRun(false);
    setRunKey((value) => value + 1);
    onBuddyLine("Back to ordinary Earth physics and a plain track. Now change one thing.");
  }

  return (
    <section className="discover-world launch-lab" aria-labelledby="launch-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Mess with motion</p>
          <h2 id="launch-title">Launch lab</h2>
          <p>Run a believable experiment, then add track toys or deliberately break the laws of physics and compare what changes.</p>
        </div>
        <div className="discover-topic-chips">
          <span>speed</span><span>gravity</span><span>friction</span><span>energy</span><span>prediction</span>
        </div>
      </div>

      <div className="launch-physics-switch" aria-label="Choose the rules of the world">
        {physicsOptions.map((option) => (
          <button type="button" key={option.id} className={physics === option.id ? "active" : ""} onClick={() => choosePhysics(option.id)}>
            <strong>{option.label}</strong><span>{option.note}</span>
          </button>
        ))}
      </div>

      <div className="launch-toys" aria-label="Add something to the track">
        {toyOptions.map(([id, label]) => (
          <button type="button" key={id} className={toy === id ? "active" : ""} onClick={() => chooseToy(id)}>{label}</button>
        ))}
      </div>

      <div className="launch-stage" data-slope={slope} data-surface={surface} data-physics={physics} data-toy={toy}>
        <div className="launch-sky-object" aria-hidden="true" />
        <div className="launch-ramp" aria-hidden="true" />
        <div className="launch-runway" aria-hidden="true"><span className="launch-texture" /></div>
        {physics === "magnet" && <><span className="launch-magnet one" /><span className="launch-magnet two" /></>}
        {physics === "reverse" && <div className="launch-up-arrow" aria-hidden="true">↑ gravity?</div>}
        {toy === "booster" && <span className="launch-track-toy booster" aria-hidden="true">»»</span>}
        {toy === "spring" && <span className="launch-track-toy spring" aria-hidden="true" />}
        {toy === "loop" && <span className="launch-track-toy loop" aria-hidden="true" />}
        {toy === "portal" && <><span className="launch-track-toy portal one" aria-hidden="true" /><span className="launch-track-toy portal two" aria-hidden="true" /></>}
        {physics === "real" && ghostDistance !== null && (
          <>
            <span className="launch-ghost-marker" style={{ left:`${ghostDistance}%` }} aria-label="Where the previous real-world run finished">
              <i />
              <small>last run</small>
            </span>
            {hasRun && (
              <motion.span
                key={`ghost-${runKey}`}
                className="launch-ghost-cart"
                initial={{ left:"8%" }}
                animate={{ left:`${ghostDistance}%` }}
                transition={{ duration:1.55, ease:"easeInOut" }}
                aria-hidden="true"
              />
            )}
          </>
        )}

        <motion.div
          key={runKey}
          className="launch-cart"
          initial={{ left:"8%", y:0, rotate:0, scale:1 }}
          animate={motionPlan}
          transition={{ duration:physics === "real" ? 1.55 : 2.35, ease:physics === "bounce" ? "easeOut" : "easeInOut" }}
          aria-label={hasRun ? "The cart has travelled through the experiment" : "The cart is ready to launch"}
        ><span /></motion.div>

        <div className="launch-distance-note" aria-live="polite">
          {hasRun
            ? physics === "real" && ghostDistance !== null
              ? realDistance > ghostDistance
                ? "That travelled further than the last real-world run."
                : realDistance < ghostDistance
                  ? "That stopped sooner than the last real-world run."
                  : "That landed in almost exactly the same place."
              : "Run complete. Change one thing or remix everything."
            : physics === "real"
              ? "Earth rules are on."
              : "The rules are deliberately wrong."}
        </div>
      </div>

      <div className="launch-controls">
        <Control label="Start" value={slope} options={[["low","Low"],["high","High"],["drop","Big drop"]]} onChange={(value) => change("start", value as Slope, setSlope)} />
        <Control label="Ground" value={surface} options={[["smooth","Smooth"],["rough","Rough"],["bumpy","Bumpy"]]} onChange={(value) => change("ground", value as Surface, setSurface)} />
        <Control label="Push" value={push} options={[["gentle","Gentle"],["fast","Fast"],["ridiculous","Ridiculous"]]} onChange={(value) => change("push", value as Push, setPush)} />
      </div>

      <div className="launch-prediction">
        <span>Before you send it: what do you think matters most this time?</span>
        <div>
          {(["slope","surface","push","physics","toy"] as const).map((item) => (
            <button type="button" key={item} className={prediction === item ? "active" : ""} onClick={() => setPrediction(item)}>
              {item === "slope" ? "The ramp" : item === "surface" ? "The ground" : item === "push" ? "The push" : item === "physics" ? "The rules" : "The track toy"}
            </button>
          ))}
        </div>
      </div>

      {runHistory.length > 0 && (
        <div className="launch-history">
          <span>Last few experiments</span>
          <div>{runHistory.map((item, index) => <small key={`${item}-${index}`}>{item}</small>)}</div>
        </div>
      )}

      <div className="discover-world-actions">
        <button type="button" className="discover-primary" onClick={run}><RocketLaunch size={20} /> Send it</button>
        <button type="button" className="discover-secondary" onClick={remix}>Remix the track</button>
        <button type="button" className="discover-secondary" onClick={reset}><ArrowClockwise size={18} /> Restore reality</button>
      </div>
    </section>
  );
}

function Control({ label, value, options, onChange }: {
  label:string;
  value:string;
  options:Array<[string,string]>;
  onChange:(value:string) => void;
}) {
  return (
    <div className="launch-control">
      <span>{label}</span>
      <div>{options.map(([option, optionLabel]) => (
        <button type="button" key={option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{optionLabel}</button>
      ))}</div>
    </div>
  );
}
