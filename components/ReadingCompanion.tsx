"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, HandPointing, Scan, SpeakerHigh, TextAlignLeft, X } from "@phosphor-icons/react";
import { BuddyPresence } from "@/components/BuddyPresence";
import { PressToTalk } from "@/components/PressToTalk";
import { getWordSupport, helpText, type HelpDepth } from "@/lib/literacy/engine";
import { recordLearningEvent } from "@/lib/learning/local-store";
import { recognisePage, recogniseWordRegion } from "@/lib/ocr/browser-tesseract";
import type { OcrWord } from "@/lib/ocr/types";

type CameraState = "idle" | "starting" | "ready" | "error";
type OcrState = "idle" | "reading" | "ready" | "error";
type BuddyState = "idle" | "listening" | "thinking" | "speaking";
type WordSource = "ocr" | "demo";
type LookupState = "idle" | "loading" | "ready" | "error";

type CapturedPage = {
  image: string;
  ocrImage: string;
  width: number;
  height: number;
};

type SoundFeature = {
  letters: string;
  note: string;
};

type WordLookup = {
  meaning: string | null;
  example: string | null;
  alternateExample?: string | null;
  contextualExample?: string | null;
  partOfSpeech?: string | null;
  pronunciation?: {
    ipa?: string | null;
    syllables?: number | null;
    audio?: string | null;
  };
  soundGuide?: {
    syllables?: number | null;
    ipa?: string | null;
    features?: SoundFeature[];
    guidance?: string;
  };
  headword?: string | null;
  source: string;
};

const helpLabels: Record<HelpDepth, string> = {
  tell: "Tell me",
  clue: "Give me a clue",
  together: "Let's work it out",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function makeOcrImage(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return source.toDataURL("image/jpeg", 0.94);

  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const grey = Math.round(
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114,
    );
    const contrasted = Math.max(0, Math.min(255, Math.round((grey - 128) * 1.42 + 136)));
    pixels[index] = contrasted;
    pixels[index + 1] = contrasted;
    pixels[index + 2] = contrasted;
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function ReadingCompanion() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [capturedPage, setCapturedPage] = useState<CapturedPage | null>(null);
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [helpDepth, setHelpDepth] = useState<HelpDepth>("clue");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<WordSource>("demo");
  const [buddyState, setBuddyState] = useState<BuddyState>("idle");
  const [voiceReply, setVoiceReply] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lookup, setLookup] = useState<WordLookup | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [tapLookupMessage, setTapLookupMessage] = useState<string | null>(null);

  const support = useMemo(() => (selectedWord ? getWordSupport(selectedWord) : null), [selectedWord]);
  const checkedMeaning = support?.meaning ?? lookup?.meaning ?? null;
  const checkedExample = support?.example ?? lookup?.alternateExample ?? lookup?.example ?? null;
  const currentHelp = support ? voiceReply ?? helpText(support, helpDepth, lookup?.meaning) : null;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!support) {
      setLookup(null);
      setLookupState("idle");
      return;
    }

    const controller = new AbortController();
    setLookup(null);
    setLookupState("loading");

    const params = new URLSearchParams({ word: support.word });
    if (selectedContext) params.set("context", selectedContext);

    fetch(`/api/word?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("lookup_failed");
        return (await response.json()) as WordLookup;
      })
      .then((result) => {
        setLookup(result);
        setLookupState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookupState("error");
      });

    return () => controller.abort();
  }, [support, selectedContext]);

  async function startCamera() {
    setCameraState("starting");
    setCapturedPage(null);
    setOcrWords([]);
    setOcrState("idle");
    setSelectedWord(null);
    setSelectedContext(null);
    setVoiceReply(null);
    setTapLookupMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
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

  function clearPage() {
    stopCamera();
    setCapturedPage(null);
    setOcrWords([]);
    setOcrState("idle");
    setSelectedWord(null);
    setSelectedContext(null);
    setVoiceReply(null);
    setLastTranscript(null);
    setLookup(null);
    setLookupState("idle");
    setTapLookupMessage(null);
  }

  async function capturePage() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const maxWidth = 2000;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);
    const image = canvas.toDataURL("image/jpeg", 0.94);
    const ocrImage = makeOcrImage(canvas);
    setCapturedPage({ image, ocrImage, width, height });
    stopCamera();
    setOcrState("reading");
    setBuddyState("thinking");

    try {
      const result = await recognisePage(ocrImage, width, height);
      setOcrWords(result.words.filter((word) => word.confidence >= 18 && /[a-z]/i.test(word.text)));
      setOcrState("ready");
    } catch {
      setOcrState("error");
    } finally {
      setBuddyState("idle");
    }
  }

  function chooseWord(word: string, source: WordSource, context?: string) {
    const cleanWord = getWordSupport(word).word;
    if (!cleanWord) return;
    setSelectedWord(cleanWord);
    setSelectedContext(context?.trim() || null);
    setSelectedSource(source);
    setVoiceReply(null);
    setLastTranscript(null);
    setLookup(null);
    setLookupState("idle");
    setTapLookupMessage(null);
    recordLearningEvent({ kind: "word_selected", word: cleanWord, source, helpDepth });
  }

  function chooseDemoWord() {
    setBuddyState("thinking");
    window.setTimeout(() => {
      chooseWord("extraordinary", "demo", "The view from the top was extraordinary.");
      setBuddyState("idle");
    }, 320);
  }

  function nearestLineText(y: number) {
    const nearest = ocrWords.reduce<{ distance: number; text: string | null }>(
      (best, word) => {
        if (!word.lineText) return best;
        const centre = (word.bbox.y0 + word.bbox.y1) / 2;
        const distance = Math.abs(centre - y);
        return distance < best.distance ? { distance, text: word.lineText } : best;
      },
      { distance: Number.POSITIVE_INFINITY, text: null },
    );
    return nearest.text ?? undefined;
  }

  async function inspectTappedPoint(clientX: number, clientY: number, element: HTMLDivElement) {
    if (!capturedPage || ocrState !== "ready" || buddyState === "thinking") return;

    const bounds = element.getBoundingClientRect();
    const x = ((clientX - bounds.left) / bounds.width) * capturedPage.width;
    const y = ((clientY - bounds.top) / bounds.height) * capturedPage.height;
    const cropWidth = Math.min(520, capturedPage.width * 0.32);
    const cropHeight = Math.min(180, capturedPage.height * 0.14);
    const left = clamp(x - cropWidth / 2, 0, capturedPage.width - cropWidth);
    const top = clamp(y - cropHeight / 2, 0, capturedPage.height - cropHeight);

    setTapLookupMessage("Looking at that spot…");
    setBuddyState("thinking");

    try {
      const candidate = await recogniseWordRegion(capturedPage.ocrImage, {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(cropWidth),
        height: Math.round(cropHeight),
      });

      if (candidate) {
        chooseWord(candidate, "ocr", nearestLineText(y));
      } else {
        setTapLookupMessage("I couldn't quite get that word. Try tapping closer to the middle of it.");
      }
    } catch {
      setTapLookupMessage("I couldn't quite get that word. Try tapping it again.");
    } finally {
      setBuddyState("idle");
    }
  }

  function changeHelpDepth(depth: HelpDepth) {
    setHelpDepth(depth);
    setVoiceReply(null);
    if (selectedWord) {
      recordLearningEvent({ kind: "help_depth_changed", word: selectedWord, helpDepth: depth, source: selectedSource });
    }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.78;
    utterance.onstart = () => setBuddyState("speaking");
    utterance.onend = () => setBuddyState("idle");
    window.speechSynthesis.speak(utterance);
  }

  function speakWord() {
    if (!support) return;
    recordLearningEvent({ kind: "word_heard", word: support.word, helpDepth, source: selectedSource });
    speak(support.word);
  }

  function readLine() {
    if (!support || !selectedContext) return;
    recordLearningEvent({ kind: "line_heard", word: support.word, helpDepth, source: selectedSource });
    speak(selectedContext);
  }

  function readExample() {
    if (!checkedExample) return;
    speak(checkedExample);
  }

  function explainMeaning() {
    if (!support) return;
    recordLearningEvent({ kind: "meaning_requested", word: support.word, helpDepth, source: selectedSource });

    if (checkedMeaning) {
      setVoiceReply(checkedMeaning);
      return;
    }

    setVoiceReply(
      lookupState === "loading"
        ? "I'm still finding a simple meaning for this one."
        : "I couldn't find a checked meaning for this one. I can still say it or help you look at the spelling.",
    );
  }

  function moveOn() {
    if (selectedWord) {
      recordLearningEvent({ kind: "moved_on", word: selectedWord, helpDepth, source: selectedSource });
    }
    setSelectedWord(null);
    setSelectedContext(null);
    setVoiceReply(null);
    setLastTranscript(null);
    setLookup(null);
    setLookupState("idle");
  }

  function handleTranscript(transcript: string) {
    setLastTranscript(transcript);
    if (!support) return;

    recordLearningEvent({
      kind: "voice_request",
      word: support.word,
      helpDepth,
      transcript,
      source: selectedSource,
    });

    const request = transcript.toLocaleLowerCase("en-GB");
    if (/mean|definition|tell me/.test(request)) {
      changeHelpDepth("tell");
      return;
    }
    if (/example|use.*sentence/.test(request) && checkedExample) {
      readExample();
      return;
    }
    if (/line|sentence|whole bit/.test(request) && selectedContext) {
      readLine();
      return;
    }
    if (/say|pronoun|read it|what is it/.test(request)) {
      speakWord();
      return;
    }
    if (/clue|hint/.test(request)) {
      changeHelpDepth("clue");
      return;
    }
    if (/work.*out|help me/.test(request)) {
      changeHelpDepth("together");
      return;
    }
    if (/got it|carry on|keep going|done/.test(request)) {
      moveOn();
      return;
    }

    setVoiceReply("I heard you. Try asking me to say it, read the line, tell you what it means, give you a clue, or help you work it out.");
  }

  return (
    <div className="reading-layout">
      <section className="camera-card" aria-label="Reading camera">
        <div className="camera-toolbar">
          <div>
            <span className="camera-kicker">Read with me</span>
            <strong>
              {ocrState === "reading"
                ? "Finding the words…"
                : capturedPage
                  ? ocrWords.length > 0
                    ? `I found ${ocrWords.length} words.`
                    : "I'm looking at the page."
                  : cameraState === "ready"
                    ? "Fill the frame and hold the page still."
                    : "Show me the page."}
            </strong>
          </div>
          {(cameraState === "ready" || capturedPage) && (
            <button type="button" className="round-control" onClick={clearPage} aria-label="Close page">
              <X size={24} />
            </button>
          )}
        </div>

        <div className={`camera-window ${cameraState} ${capturedPage ? "captured" : ""}`}>
          {!capturedPage && <video ref={videoRef} autoPlay playsInline muted />}

          {capturedPage && (
            <div
              className="captured-page"
              onClick={(event) => inspectTappedPoint(event.clientX, event.clientY, event.currentTarget)}
              role="presentation"
            >
              {/* Page images remain in the browser for this local OCR alpha. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedPage.image} alt="Captured reading page" />
              {ocrState === "ready" && ocrWords.map((word) => (
                <button
                  key={word.id}
                  type="button"
                  className="ocr-word"
                  style={{
                    left: `${(word.bbox.x0 / capturedPage.width) * 100}%`,
                    top: `${(word.bbox.y0 / capturedPage.height) * 100}%`,
                    width: `${((word.bbox.x1 - word.bbox.x0) / capturedPage.width) * 100}%`,
                    height: `${((word.bbox.y1 - word.bbox.y0) / capturedPage.height) * 100}%`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    chooseWord(word.text, "ocr", word.lineText);
                  }}
                  aria-label={`Choose ${word.text}`}
                  title={word.text}
                />
              ))}

              {ocrState === "reading" && (
                <div className="ocr-status">
                  <Scan size={30} />
                  <span>Finding words on this page…</span>
                </div>
              )}

              {ocrState === "error" && (
                <div className="ocr-status">
                  <span>I couldn't find the words clearly. Try another photo, or use the sample below.</span>
                </div>
              )}

              {ocrState === "ready" && tapLookupMessage && (
                <div className="tap-word-status">{tapLookupMessage}</div>
              )}
            </div>
          )}

          {!capturedPage && cameraState !== "ready" && (
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

          {!capturedPage && cameraState === "ready" && (
            <button type="button" className="point-demo" onClick={capturePage}>
              <Camera size={24} />
              Take a look
            </button>
          )}
        </div>

        <div className="camera-demo-row">
          <span>
            {capturedPage
              ? "Tap a highlighted word — or tap an unboxed word and Buddy will take a closer look."
              : "The page stays on this device while Buddy finds the words."}
          </span>
          <button type="button" className="text-button" onClick={chooseDemoWord}>
            <HandPointing size={18} /> Try “extraordinary”
          </button>
        </div>
      </section>

      <aside className="reading-side">
        <div className="presence-card">
          <BuddyPresence
            state={buddyState}
            label={selectedWord ? "This one?" : capturedPage ? "Tap the bit you want." : "Point me at the page."}
          />
        </div>

        <section className="help-depth" aria-labelledby="help-depth-title">
          <div className="section-heading">
            <span>What would help?</span>
            <strong id="help-depth-title">You choose.</strong>
          </div>
          <div className="depth-control" role="group" aria-label="Choose how Buddy helps">
            {(Object.keys(helpLabels) as HelpDepth[]).map((depth) => (
              <button
                key={depth}
                type="button"
                className={helpDepth === depth ? "active" : ""}
                onClick={() => changeHelpDepth(depth)}
              >
                {helpLabels[depth]}
              </button>
            ))}
          </div>
        </section>

        {support ? (
          <section className="selected-word-card" aria-live="polite">
            <span className="selected-kicker">This one?</span>
            <h2>{support.word}</h2>
            {lookup?.partOfSpeech && <span className="word-kind">{lookup.partOfSpeech}</span>}
            <p className="word-help">{currentHelp}</p>

            {lookupState === "loading" && (
              <p className="lookup-note">Finding its sounds and meaning…</p>
            )}

            {lookup?.soundGuide && (
              <div className="sound-guide">
                <div className="sound-guide-heading">
                  <strong>How it sounds</strong>
                  {lookup.soundGuide.syllables ? (
                    <span>{lookup.soundGuide.syllables} {lookup.soundGuide.syllables === 1 ? "syllable" : "syllables"}</span>
                  ) : null}
                </div>
                <p>{lookup.soundGuide.guidance}</p>
                {(lookup.soundGuide.features?.length ?? 0) > 0 && (
                  <div className="sound-features">
                    {lookup.soundGuide.features?.map((feature) => (
                      <div className="sound-feature" key={`${feature.letters}-${feature.note}`}>
                        <strong>{feature.letters}</strong>
                        <span>{feature.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedContext && (
              <div className="context-example">
                <span>In this line</span>
                <p>“{selectedContext}”</p>
                <button type="button" className="text-button" onClick={readLine}>
                  <SpeakerHigh size={17} /> Read this line
                </button>
              </div>
            )}

            {helpDepth === "tell" && checkedExample && checkedExample !== selectedContext && (
              <div className="meaning-example">
                <span>Another example</span>
                <p>“{checkedExample}”</p>
                <button type="button" className="text-button" onClick={readExample}>
                  <SpeakerHigh size={17} /> Read example
                </button>
              </div>
            )}

            {lastTranscript && (
              <p className="heard-you"><span>You said</span> “{lastTranscript}”</p>
            )}

            <div className="word-actions">
              <button type="button" className="tactile-button dark" onClick={speakWord}>
                <SpeakerHigh size={22} /> Say it
              </button>
              {selectedContext && (
                <button type="button" className="tactile-button" onClick={readLine}>
                  <TextAlignLeft size={21} /> Read the line
                </button>
              )}
              <button type="button" className="tactile-button" onClick={explainMeaning}>
                Tell me the meaning
              </button>
              <PressToTalk
                onListeningChange={(listening) => setBuddyState(listening ? "listening" : "idle")}
                onTranscript={handleTranscript}
              />
            </div>

            <div className="move-on">
              <span>Got it?</span>
              <button type="button" className="text-button" onClick={moveOn}>Yep, keep going</button>
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
