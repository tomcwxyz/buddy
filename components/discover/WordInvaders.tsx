"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUUpLeft, Lightbulb, Lightning, Pause, Play, Sparkle } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { readLearningEvents, recordLearningEvent, summariseRememberedWords } from "@/lib/learning/local-store";
import { readActivePracticeSet } from "@/lib/practice/sets";

type WordInvadersProps = { onBuddyLine: (line: string) => void };
type Invader = { id: number; letter: string; row: number; col: number };
type Power =
  | "pulse"
  | "shield"
  | "slow"
  | "beam"
  | "starburst"
  | "magnet"
  | "turn"
  | "fast"
  | "grow"
  | "tiny"
  | "freeze"
  | "split"
  | "bounce"
  | null;

const waves = [
  ["STAR", "MOON", "SHIP", "BEAM", "TURN"],
  ["GLOW", "ZOOM", "ZAP", "FAST", "SLOW"],
  ["GROW", "TINY", "FREEZE", "SPLIT"],
  ["BOUNCE", "COMET", "ORBIT", "NOVA"],
  ["ROCKET", "ALIEN", "LIGHT", "WAVE"],
];

const acceptedWords = new Set([
  "AN","AS","AT","BE","BY","DO","GO","HE","IN","IS","IT","ME","MY","NO","OF","ON","OR","SO","TO","UP","US","WE",
  "AIR","ALIEN","AND","ARM","ART","BAT","BEAM","BIG","BIT","BOUNCE","BOX","CAN","CAR","CAT","COMET","DAY","DOG","DOT",
  "FAR","FAST","FLY","FREEZE","FUN","GLOW","GROW","HOT","JET","LASER","LIGHT","MAP","MOON","NEW","NOVA","ODD","ORBIT",
  "PLAY","POWER","RED","ROCKET","RUN","SHIP","SKY","SLOW","SPARK","SPLIT","STAR","SUN","TINY","TOP","TURN","WAVE","WORD",
  "WOW","ZAP","ZOOM"
]);

const specialPowers: Record<string, Exclude<Power, null>> = {
  STAR:"starburst",
  MOON:"slow",
  SHIP:"shield",
  BEAM:"beam",
  TURN:"turn",
  GLOW:"shield",
  ZOOM:"magnet",
  ZAP:"pulse",
  SPARK:"starburst",
  FAST:"fast",
  SLOW:"slow",
  GROW:"grow",
  TINY:"tiny",
  FREEZE:"freeze",
  SPLIT:"split",
  BOUNCE:"bounce",
  COMET:"beam",
  ORBIT:"turn",
  NOVA:"starburst",
  LASER:"beam",
  ROCKET:"fast",
  ALIEN:"split",
  LIGHT:"shield",
  WAVE:"bounce"
};

const powerCopy: Record<Exclude<Power, null>, { label: string; line: string }> = {
  pulse:{ label:"Pulse", line:"A word pulse ripples through a whole row." },
  shield:{ label:"Shield", line:"Your word becomes a soft shield around Buddy's ship." },
  slow:{ label:"Slow field", line:"The letters drift into slow motion. More time to spot possibilities." },
  beam:{ label:"Word beam", line:"A long word beam sweeps through the formation." },
  starburst:{ label:"Starburst", line:"The word bursts into stars and scatters part of the formation." },
  magnet:{ label:"Letter magnet", line:"Nearby letters jump down into your rack." },
  turn:{ label:"Turn", line:"The entire swarm reverses direction." },
  fast:{ label:"Fast field", line:"The swarm suddenly speeds up." },
  grow:{ label:"Grow", line:"Every letter-invader gets enormous for a moment." },
  tiny:{ label:"Tiny", line:"The whole swarm shrinks down to pocket size." },
  freeze:{ label:"Freeze", line:"The swarm freezes completely. Nothing moves." },
  split:{ label:"Split", line:"A few invaders split into copies and the pattern gets stranger." },
  bounce:{ label:"Bounce", line:"The formation starts bouncing instead of marching politely." }
};

let invaderId = 0;

function makeWave(index: number, personalWords: string[] = []): Invader[] {
  const specials = waves[index % waves.length].slice(0, 3);
  const personalised = personalWords.length
    ? [
        personalWords[index % personalWords.length],
        personalWords[(index + 1) % personalWords.length],
      ].filter(Boolean)
    : [];
  const filler = "EARTSNLIOD".split("");
  const pool = [...specials.join("").split(""), ...personalised.join("").split(""), ...filler].slice(0, 24);
  return pool.map((letter, i) => ({
    id: invaderId++,
    letter,
    row: Math.floor(i / 6),
    col: i % 6,
  }));
}

function choosePower(word: string): Exclude<Power, null> {
  if (specialPowers[word]) return specialPowers[word];
  if (word.length >= 6) return "starburst";
  if (word.length >= 5) return "beam";
  if (word.length >= 4) return "shield";
  return "pulse";
}

function canMakeWord(word: string, letters: string[]) {
  const available = [...letters];
  return word.split("").every((letter) => {
    const index = available.indexOf(letter);
    if (index < 0) return false;
    available.splice(index, 1);
    return true;
  });
}

export function WordInvaders({ onBuddyLine }: WordInvadersProps) {
  const [waveIndex, setWaveIndex] = useState(0);
  const [invaders, setInvaders] = useState<Invader[]>(() => makeWave(0));
  const [rack, setRack] = useState<string[]>([]);
  const [march, setMarch] = useState(0);
  const [running, setRunning] = useState(true);
  const [power, setPower] = useState<Power>(null);
  const [wordsMade, setWordsMade] = useState<Array<{ word: string; power: Exclude<Power, null> }>>([]);
  const [powerKey, setPowerKey] = useState(0);
  const [reversed, setReversed] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [personalWords, setPersonalWords] = useState<string[]>([]);
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);

  useEffect(() => {
    const activeSet = readActivePracticeSet();
    const remembered = summariseRememberedWords(readLearningEvents()).map((item) => item.word);
    const source = activeSet?.words.length ? activeSet.words : remembered;
    const usable = [...new Set(
      source
        .map((word) => word.trim().toUpperCase())
        .filter((word) => /^[A-Z]+$/.test(word) && word.length >= 2 && word.length <= 7),
    )].slice(0, 12);
    setPersonalWords(usable);
    if (usable.length) setInvaders(makeWave(0, usable));
  }, []);

  useEffect(() => {
    if (!running || power === "freeze") return;
    const delay = power === "slow" ? 1320 : power === "fast" ? 360 : 760;
    const timer = window.setInterval(() => setMarch((n) => (n + 1) % 16), delay);
    return () => window.clearInterval(timer);
  }, [power, running]);

  useEffect(() => {
    if (!power) return;
    const duration = power === "slow" || power === "fast" || power === "freeze" || power === "grow" || power === "tiny" || power === "bounce"
      ? 6000
      : 2800;
    const timer = window.setTimeout(() => setPower(null), duration);
    return () => window.clearTimeout(timer);
  }, [power, powerKey]);

  const currentWord = rack.join("");
  const recognisedCurrentWord = acceptedWords.has(currentWord) || personalWords.includes(currentWord);
  const previewPower = recognisedCurrentWord && currentWord.length >= 2 ? choosePower(currentWord) : null;
  const depth = Math.floor(march / 4);
  const baseDirection = Math.floor(march / 2) % 2 === 0 ? 1 : -1;
  const direction = reversed ? baseDirection * -1 : baseDirection;
  const formationStyle = useMemo(() => {
    const x = direction * (march % 2) * (power === "bounce" ? 26 : 16);
    const y = depth * 15 + (power === "bounce" ? (march % 2 === 0 ? -15 : 11) : 0);
    return { transform:`translate(${x}px, ${y}px)` };
  }, [depth, direction, march, power]);

  const allAvailableLetters = useMemo(
    () => [...rack, ...invaders.map((item) => item.letter)],
    [invaders, rack],
  );

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

  function chooseRackLetter(index: number) {
    if (selectedRackIndex === null) {
      setSelectedRackIndex(index);
      onBuddyLine("That letter is selected. Tap another rack letter to swap their places.");
      return;
    }

    if (selectedRackIndex === index) {
      setSelectedRackIndex(null);
      return;
    }

    setRack((items) => {
      const next = [...items];
      [next[selectedRackIndex], next[index]] = [next[index], next[selectedRackIndex]];
      return next;
    });
    setSelectedRackIndex(null);
    onBuddyLine("Same letters, different order. See whether a word appears now.");
  }

  function release(index: number) {
    const letter = rack[index];
    setRack((items) => items.filter((_, i) => i !== index));
    setSelectedRackIndex(null);
    setInvaders((items) => [
      ...items,
      { id:invaderId++, letter, row:(index + waveIndex) % 4, col:(items.length + index) % 6 },
    ]);
    onBuddyLine(`${letter} is back in the swarm. Try a different route into the word.`);
  }

  function nudge() {
    const possible = [...waves[waveIndex % waves.length], ...personalWords].filter((word) => canMakeWord(word, allAvailableLetters));
    if (!possible.length) {
      onBuddyLine("I cannot see one of this swarm's special words any more. Try a new swarm, or make one of your own.");
      return;
    }
    const word = possible[nudgeIndex % possible.length];
    setNudgeIndex((value) => value + 1);
    onBuddyLine(`Tiny clue: I can still see the letters for ${word}. You decide whether you want to chase it.`);
  }

  function applyPower(nextPower: Exclude<Power, null>) {
    if (nextPower === "pulse") {
      setInvaders((items) => items.filter((item) => item.row !== depth % 4));
    } else if (nextPower === "beam" || nextPower === "starburst") {
      setInvaders((items) => items.filter((_, i) => i % 3 !== 0));
    } else if (nextPower === "magnet") {
      const nearby = invaders.slice(0, 2);
      setRack(nearby.map((item) => item.letter));
      setInvaders((items) => items.filter((item) => !nearby.some((taken) => taken.id === item.id)));
    } else if (nextPower === "turn") {
      setReversed((value) => !value);
    } else if (nextPower === "split") {
      setInvaders((items) => {
        const copies = items.slice(0, Math.min(4, items.length)).map((item, index) => ({
          ...item,
          id:invaderId++,
          row:(item.row + 1) % 4,
          col:(item.col + index + 2) % 6,
        }));
        return [...items, ...copies].slice(0, 28);
      });
    }
  }

  function blastWord() {
    if (currentWord.length < 2) return;

    if (!recognisedCurrentWord) {
      onBuddyLine(`${currentWord} is an interesting cluster. It is not one of the words this little board knows yet — rearrange it, drop a letter, or catch another.`);
      recordLearningEvent({ kind:"discover_reflected", source:"discover", activityId:"word-invaders", detail:`unknown:${currentWord}` });
      return;
    }

    const nextPower = choosePower(currentWord);
    setPower(nextPower);
    setPowerKey((n) => n + 1);
    setWordsMade((items) => [{ word:currentWord, power:nextPower }, ...items.filter((item) => item.word !== currentWord)].slice(0, 8));
    setRack([]);
    setSelectedRackIndex(null);
    applyPower(nextPower);

    onBuddyLine(`${currentWord}! ${powerCopy[nextPower].line} Some words change the rules because of what they mean.`);
    recordLearningEvent({
      kind:"discover_reflected",
      source:"discover",
      activityId:"word-invaders",
      detail:`word:${currentWord};power:${nextPower}`,
    });
  }

  function nextWave() {
    const next = waveIndex + 1;
    setWaveIndex(next);
    setInvaders(makeWave(next, personalWords));
    setRack([]);
    setSelectedRackIndex(null);
    setMarch(0);
    setPower(null);
    setReversed(false);
    setNudgeIndex(0);
    onBuddyLine("New swarm. Different letters are hiding different possibilities.");
  }

  return (
    <section className="discover-world word-invaders" aria-labelledby="invaders-title">
      <div className="discover-world-heading">
        <div>
          <p className="eyebrow">Arcade words</p>
          <h2 id="invaders-title">Word invaders</h2>
          <p>Catch letters from the swarm, build a word, then fire the whole word back into the game. Some words actually rewrite the rules.</p>
        </div>
        <div className="discover-topic-chips">
          <span>spelling</span><span>meaning</span><span>word building</span><span>rearranging</span><span>cause & effect</span>
        </div>
      </div>

      <div className="invader-shell" data-power={power ?? "none"}>
        <div className="invader-status">
          <div>
            <strong>{power ? powerCopy[power].label : "Swarm drifting"}</strong>
            <span>{reversed ? " · direction reversed" : ""}</span>
            {personalWords.length > 0 && <span className="invader-personal-note"> · your words are mixed in</span>}
          </div>
          <button type="button" onClick={() => setRunning((value) => !value)}>
            {running ? <Pause size={16} /> : <Play size={16} />} {running ? "Pause" : "Play"}
          </button>
        </div>

        <div className="invader-sky">
          <motion.div
            key={powerKey}
            className="invader-power-flash"
            initial={{ opacity:0, scale:0.7 }}
            animate={power ? { opacity:[0,0.82,0], scale:[0.7,1.2,1.55] } : { opacity:0 }}
            transition={{ duration:1.25 }}
            aria-hidden="true"
          />

          <div className="invader-formation" style={formationStyle}>
            {invaders.map((invader) => (
              <button
                type="button"
                key={invader.id}
                className="letter-invader"
                data-row={invader.row}
                onClick={() => collect(invader)}
                aria-label={`Catch letter ${invader.letter}`}
              >
                <span className="invader-eyes" aria-hidden="true" />
                <strong>{invader.letter}</strong>
              </button>
            ))}
          </div>

          {invaders.length === 0 && (
            <div className="invader-empty-wave">
              <strong>You changed the whole sky.</strong>
              <span>Start another swarm whenever you want.</span>
            </div>
          )}

          <div className="invader-buddy-ship" aria-hidden="true"><span /></div>
        </div>

        <div className="word-rack-area">
          <div>
            <span className="word-rack-label">Your letters</span>
            <div className="word-rack" aria-live="polite">
              {rack.length ? rack.map((letter, index) => (
                <button
                  type="button"
                  key={`${letter}-${index}`}
                  className={selectedRackIndex === index ? "selected" : ""}
                  onClick={() => chooseRackLetter(index)}
                  aria-pressed={selectedRackIndex === index}
                  aria-label={selectedRackIndex === index ? `${letter} selected. Tap another letter to swap.` : `Select ${letter} to rearrange the word`}
                >
                  {letter}
                </button>
              )) : <span className="word-rack-empty">Tap letters above to catch them.</span>}
            </div>
            {rack.length > 1 && <span className="word-rack-hint">Tap two rack letters to swap them.</span>}
            {previewPower && (
              <span className="word-power-preview">
                This word will make: <strong>{powerCopy[previewPower].label}</strong>
              </span>
            )}
          </div>

          <div className="word-rack-actions">
            <button
              type="button"
              className="discover-secondary"
              onClick={() => selectedRackIndex !== null && release(selectedRackIndex)}
              disabled={selectedRackIndex === null}
            >
              <ArrowUUpLeft size={18} /> Put back
            </button>
            <button type="button" className="discover-secondary" onClick={nudge}>
              <Lightbulb size={18} /> Nudge
            </button>
            <button type="button" className="discover-primary" onClick={blastWord} disabled={rack.length < 2}>
              <Lightning size={19} /> Fire {currentWord || "word"}
            </button>
          </div>
        </div>

        <div className="invader-spellbook">
          <span>Words that have changed the game</span>
          <div>
            {wordsMade.length ? wordsMade.map(({ word, power:wordPower }) => (
              <button
                type="button"
                key={word}
                onClick={() => onBuddyLine(`${word} made ${powerCopy[wordPower].label.toLowerCase()}. What does the word itself have to do with that effect?`)}
              >
                <strong>{word}</strong>
                <small>{powerCopy[wordPower].label}</small>
              </button>
            )) : <em>Nothing discovered yet. Some words do exactly what they sound like they should.</em>}
          </div>
        </div>

        <div className="invader-bottom-strip">
          <div>
            <span>There is no last wave</span>
            <div className="invader-word-history">
              <em>Keep this swarm, or swap the whole letter-space whenever it gets less interesting.</em>
            </div>
          </div>
          <button type="button" className="discover-secondary" onClick={nextWave}>
            <Sparkle size={18} /> New swarm
          </button>
        </div>
      </div>
    </section>
  );
}
