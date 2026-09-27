"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowClockwise, Lightning, Pause, Play, Sparkle } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { recordLearningEvent } from "@/lib/learning/local-store";

type WordInvadersProps = { onBuddyLine: (line: string) => void };
type Invader = { id: number; letter: string; row: number; col: number };
type Power = "pulse" | "shield" | "slow" | "beam" | "starburst" | "magnet" | null;

const waves = [
  ["STAR", "MOON", "SHIP", "BEAM"],
  ["GLOW", "ZOOM", "ZAP", "SPARK"],
  ["COMET", "ORBIT", "NOVA", "LASER"],
  ["ROCKET", "ALIEN", "LIGHT", "WAVE"],
];

const acceptedWords = new Set([
  "AN","AS","AT","BE","BY","DO","GO","HE","IN","IS","IT","ME","MY","NO","OF","ON","OR","SO","TO","UP","US","WE",
  "AIR","AND","ARM","ART","BAT","BEAM","BIG","BIT","BOX","CAN","CAR","CAT","COMET","DAY","DOG","DOT","FAR","FAST",
  "FLY","FUN","GLOW","HOT","JET","LASER","LIGHT","MAP","MOON","NEW","NOVA","ODD","ORBIT","PLAY","POWER","RED","ROCKET",
  "RUN","SHIP","SKY","SLOW","SPARK","STAR","SUN","TOP","WAVE","WORD","WOW","ZAP","ZOOM"
]);

const specialPowers: Record<string, Exclude<Power, null>> = {
  STAR:"starburst", MOON:"slow", SHIP:"shield", BEAM:"beam", GLOW:"shield", ZOOM:"magnet",
  ZAP:"pulse", SPARK:"starburst", COMET:"beam", ORBIT:"slow", NOVA:"starburst", LASER:"beam",
  ROCKET:"magnet", ALIEN:"pulse", LIGHT:"shield", WAVE:"pulse"
};

const powerCopy: Record<Exclude<Power, null>, { label: string; line: string }> = {
  pulse:{ label:"Pulse", line:"A word pulse ripples through a whole row." },
  shield:{ label:"Shield", line:"Your word becomes a soft shield. Nothing is in a hurry for a moment." },
  slow:{ label:"Slow field", line:"The letters drift into slow motion. More time to spot possibilities." },
  beam:{ label:"Word beam", line:"A long word beam sweeps across the formation." },
  starburst:{ label:"Starburst", line:"The word bursts into little stars and scatters the formation." },
  magnet:{ label:"Letter magnet", line:"Nearby letters lean towards your rack for a moment." }
};

let invaderId = 0;

function makeWave(index: number): Invader[] {
  const pool = [...waves[index % waves.length].join("").split(""), ..."EARTSNLI".split("")].slice(0, 24);
  return pool.map((letter, i) => ({ id: invaderId++, letter, row: Math.floor(i / 6), col: i % 6 }));
}

function choosePower(word: string): Exclude<Power, null> {
  if (specialPowers[word]) return specialPowers[word];
  if (word.length >= 6) return "starburst";
  if (word.length >= 5) return "beam";
  if (word.length >= 4) return "shield";
  return "pulse";
}

export function WordInvaders({ onBuddyLine }: WordInvadersProps) {
  const [waveIndex, setWaveIndex] = useState(0);
  const [invaders, setInvaders] = useState<Invader[]>(() => makeWave(0));
  const [rack, setRack] = useState<string[]>([]);
  const [march, setMarch] = useState(0);
  const [running, setRunning] = useState(true);
  const [power, setPower] = useState<Power>(null);
  const [wordsMade, setWordsMade] = useState<string[]>([]);
  const [powerKey, setPowerKey] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setMarch((n) => (n + 1) % 16), power === "slow" ? 1250 : 760);
    return () => window.clearInterval(timer);
  }, [power, running]);

  useEffect(() => {
    if (!power) return;
    const timer = window.setTimeout(() => setPower(null), power === "slow" ? 6000 : 2800);
    return () => window.clearTimeout(timer);
  }, [power, powerKey]);

  const currentWord = rack.join("");
  const depth = Math.floor(march / 4);
  const direction = Math.floor(march / 2) % 2 === 0 ? 1 : -1;
  const formationStyle = useMemo(() => ({
    transform: `translate(${direction * (march % 2) * 16}px, ${depth * 15}px)`
  }), [depth, direction, march]);

  function collect(invader: Invader) {
    if (rack.length >= 7) {
      onBuddyLine("Your rack is full. Fire a word, or tap a rack letter to put it back.");
      return;
    }
    setInvaders((items) => items.filter((item) => item.id !== invader.id));
    setRack((items) => [...items, invader.letter]);
    onBuddyLine(`${invader.letter}. Keep it, rearrange it, or see what word starts appearing.`);
    recordLearningEvent({ kind:"discover_changed", source:"discover", activityId:"word-invaders", detail:`collect:${invader.letter}` });
  }

  function release(index: number) {
    const letter = rack[index];
    setRack((items) => items.filter((_, i) => i !== index));
    setInvaders((items) => [...items, { id: invaderId++, letter, row:(index + waveIndex) % 4, col:(items.length + index) % 6 }]);
    onBuddyLine(`${letter} is back in the swarm. Try a different route into the word.`);
  }

  function blastWord() {
    if (currentWord.length < 2) return;
    if (!acceptedWords.has(currentWord)) {
      onBuddyLine(`${currentWord} is an interesting cluster. It is not one of the words this little board knows yet — rearrange it, drop a letter, or catch another.`);
      recordLearningEvent({ kind:"discover_reflected", source:"discover", activityId:"word-invaders", detail:`unknown:${currentWord}` });
      return;
    }

    const nextPower = choosePower(currentWord);
    setPower(nextPower);
    setPowerKey((n) => n + 1);
    setWordsMade((items) => [currentWord, ...items.filter((word) => word !== currentWord)].slice(0, 5));
    setRack([]);

    if (nextPower === "pulse") {
      setInvaders((items) => items.filter((item) => item.row !== depth % 4));
    } else if (nextPower === "beam" || nextPower === "starburst") {
      setInvaders((items) => items.filter((_, i) => i % 3 !== 0));
    } else if (nextPower === "magnet") {
      const nearby = invaders.slice(0, 2);
      setRack(nearby.map((item) => item.letter));
      setInvaders((items) => items.filter((item) => !nearby.some((taken) => taken.id === item.id)));
    }

    onBuddyLine(`${currentWord}! ${powerCopy[nextPower].line} Longer or special words change the world in different ways.`);
    recordLearningEvent({ kind:"discover_reflected", source:"discover", activityId:"word-invaders", detail:`word:${currentWord};power:${nextPower}` });
  }

  function nextWave() {
    const next = waveIndex + 1;
    setWaveIndex(next);
    setInvaders(makeWave(next));
    setRack([]);
    setMarch(0);
    setPower(null);
    onBuddyLine("New swarm. Different letters are hiding different possibilities.");
  }

  return (
    <section className="discover-world word-invaders" aria-labelledby="invaders-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Arcade words</p>
          <h2 id="invaders-title">Word invaders</h2>
          <p>Catch letters from the swarm, build a word, then fire the whole word back into the game. Words do things here.</p>
        </div>
        <div className="discover-topic-chips">
          <span>spelling</span><span>word building</span><span>rearranging</span><span>cause & effect</span>
        </div>
      </div>

      <div className="invader-shell" data-power={power ?? "none"}>
        <div className="invader-status">
          <span>{power ? powerCopy[power].label : "Swarm drifting"}</span>
          <button type="button" onClick={() => setRunning((value) => !value)}>
            {running ? <Pause size={16} /> : <Play size={16} />} {running ? "Pause" : "Play"}
          </button>
        </div>

        <div className="invader-sky">
          <motion.div
            key={powerKey}
            className="invader-power-flash"
            initial={{ opacity:0, scale:0.7 }}
            animate={power ? { opacity:[0,0.8,0], scale:[0.7,1.2,1.5] } : { opacity:0 }}
            transition={{ duration:1.25 }}
            aria-hidden="true"
          />
          <div className="invader-formation" style={formationStyle}>
            {invaders.map((invader) => (
              <button type="button" key={invader.id} className="letter-invader" data-row={invader.row} onClick={() => collect(invader)} aria-label={`Catch letter ${invader.letter}`}>
                <span className="invader-eyes" aria-hidden="true" />
                <strong>{invader.letter}</strong>
              </button>
            ))}
          </div>
          <div className="invader-buddy-ship" aria-hidden="true"><span /></div>
        </div>

        <div className="word-rack-area">
          <div>
            <span className="word-rack-label">Your letters</span>
            <div className="word-rack" aria-live="polite">
              {rack.length ? rack.map((letter, index) => (
                <button type="button" key={`${letter}-${index}`} onClick={() => release(index)} aria-label={`Put ${letter} back`}>{letter}</button>
              )) : <span className="word-rack-empty">Tap letters above to catch them.</span>}
            </div>
          </div>
          <div className="word-rack-actions">
            <button type="button" className="discover-secondary" onClick={() => setRack((items) => [...items].reverse())} disabled={rack.length < 2}>
              <ArrowClockwise size={18} /> Flip letters
            </button>
            <button type="button" className="discover-primary" onClick={blastWord} disabled={rack.length < 2}>
              <Lightning size={19} /> Fire {currentWord || "word"}
            </button>
          </div>
        </div>

        <div className="invader-bottom-strip">
          <div>
            <span>Words you have fired</span>
            <div className="invader-word-history">
              {wordsMade.length ? wordsMade.map((word) => <strong key={word}>{word}</strong>) : <em>None yet — the first one changes everything.</em>}
            </div>
          </div>
          <button type="button" className="discover-secondary" onClick={nextWave}><Sparkle size={18} /> New swarm</button>
        </div>
      </div>
    </section>
  );
}
