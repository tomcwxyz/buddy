"use client";

import { useRef, useState } from "react";
import { Microphone } from "@phosphor-icons/react";

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type PressToTalkProps = {
  onListeningChange?: (listening: boolean) => void;
  onTranscript: (transcript: string) => void;
};

export function PressToTalk({ onListeningChange, onTranscript }: PressToTalkProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  function setListeningState(value: boolean) {
    setListening(value);
    onListeningChange?.(value);
  }

  function startListening() {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) {
      setUnsupported(true);
      return;
    }

    try {
      const recognition = new Constructor();
      recognition.lang = "en-GB";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) onTranscript(transcript);
      };
      recognition.onend = () => setListeningState(false);
      recognition.onerror = () => setListeningState(false);
      recognitionRef.current = recognition;
      recognition.start();
      setUnsupported(false);
      setListeningState(true);
    } catch {
      setListeningState(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListeningState(false);
  }

  return (
    <div className="press-to-talk-wrap">
      <button
        type="button"
        className={`round-control press-to-talk ${listening ? "listening" : ""}`}
        aria-label={listening ? "Listening" : "Hold to talk to Buddy"}
        onPointerDown={startListening}
        onPointerUp={stopListening}
        onPointerCancel={stopListening}
        onPointerLeave={() => listening && stopListening()}
      >
        <Microphone size={24} weight={listening ? "fill" : "regular"} />
      </button>
      {unsupported && <span className="voice-note">Voice isn't available in this browser yet.</span>}
    </div>
  );
}
