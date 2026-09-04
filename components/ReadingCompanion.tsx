"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, HandPointing, Microphone, SpeakerHigh, X } from "@phosphor-icons/react";
import { BuddyPresence } from "@/components/BuddyPresence";

type HelpDepth = "tell" | "clue" | "together";

type CameraState = "idle" | "starting" | "ready" | "error";

const helpCopy: Record<HelpDepth, { label: string; prompt: string }> = {
  tell: {
    label: "Tell me",
    prompt: "That's extraordinary.",
  },
  clue: {
    label: "Give me a clue",
    prompt: "Start with ‘extra’. The rest has a familiar bit hiding in it.",
  },
  together: {
    label: "Let's work it out",
    prompt: "Try it in chunks: extra · ordinary. Now put them back together.",
  },
};

export function ReadingCompanion() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [helpDepth, setHelpDepth] = useState<HelpDepth>("clue");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [buddyState, setBuddyState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState("ready");
    } catch {
      setCameraState("error");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("idle");
  }

  function chooseDemoWord() {
    setBuddyState("thinking");
    setTimeout(() => {
      setSelectedWord("extraordinary");
      setBuddyState("idle");
    }, 450);
  }

  function speakWord() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("extraordinary");
    utterance.lang = "en-GB";
    utterance.rate = 0.78;
    utterance.onstart = () => setBuddyState("speaking");
    utterance.onend = () => setBuddyState("idle");
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="reading-layout">
      <section className="camera-card" aria-label="Reading camera">
        <div className="camera-toolbar">
          <div>
            <span className="camera-kicker">Read with me</span>
            <strong>{cameraState === "ready" ? "I'm looking." : "Show me the page."}</strong>
          </div>
          {cameraState === "ready" && (
            <button type="button" className="round-control" onClick={stopCamera} aria-label="Stop camera">
              <X size={24} />
            </button>
          )}
        </div>

        <div className={`camera-window ${cameraState}`}>
          <video ref={videoRef} autoPlay playsInline muted />

          {cameraState !== "ready" && (
            <div className="camera-empty">
              <Camera size={44} weight="light" />
              {cameraState === "error" ? (
                <>
                  <p>I couldn't use the camera. That's okay — we can still try the reading demo.</p>
                  <button type="button" className="tactile-button" onClick={startCamera}>Try the camera again</button>
                </>
              ) : (
                <>
                  <p>Put a book or page in front of Buddy.</p>
                  <button type="button" className="tactile-button" onClick={startCamera} disabled={cameraState === "starting"}>
                    {cameraState === "starting" ? "Opening camera…" : "Open camera"}
                  </button>
                </>
              )}
            </div>
          )}

          {cameraState === "ready" && (
            <button type="button" className="point-demo" onClick={chooseDemoWord}>
              <HandPointing size={24} />
              Point to a word
            </button>
          )}
        </div>

        <div className="camera-demo-row">
          <span>This first build uses a sample word while OCR/pointing is wired in.</span>
          <button type="button" className="text-button" onClick={chooseDemoWord}>Try “extraordinary”</button>
        </div>
      </section>

      <aside className="reading-side">
        <div className="presence-card">
          <BuddyPresence state={buddyState} label={selectedWord ? "This one?" : "Point to the bit you want."} />
        </div>

        <section className="help-depth" aria-labelledby="help-depth-title">
          <div className="section-heading">
            <span>How much help?</span>
            <strong id="help-depth-title">You choose.</strong>
          </div>
          <div className="depth-control" role="group" aria-label="Choose how Buddy helps">
            {(Object.keys(helpCopy) as HelpDepth[]).map((depth) => (
              <button
                key={depth}
                type="button"
                className={helpDepth === depth ? "active" : ""}
                onClick={() => setHelpDepth(depth)}
              >
                {helpCopy[depth].label}
              </button>
            ))}
          </div>
        </section>

        {selectedWord ? (
          <section className="selected-word-card" aria-live="polite">
            <span className="selected-kicker">This one?</span>
            <h2>{selectedWord}</h2>
            <p className="word-help">{helpCopy[helpDepth].prompt}</p>

            <div className="word-actions">
              <button type="button" className="tactile-button dark" onClick={speakWord}>
                <SpeakerHigh size={22} /> Say it
              </button>
              <button type="button" className="tactile-button">
                What does it mean?
              </button>
              <button type="button" className="round-control" aria-label="Talk to Buddy" onPointerDown={() => setBuddyState("listening")} onPointerUp={() => setBuddyState("idle")}>
                <Microphone size={24} />
              </button>
            </div>

            <div className="move-on">
              <span>Got it?</span>
              <button type="button" className="text-button" onClick={() => setSelectedWord(null)}>Yep, keep going</button>
            </div>
          </section>
        ) : (
          <section className="selected-word-card quiet">
            <span className="selected-kicker">Buddy stays quiet until you need it.</span>
            <h2>Keep reading.</h2>
            <p>No scores. No quiz. No interruption unless you ask.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
