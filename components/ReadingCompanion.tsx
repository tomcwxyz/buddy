"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, HandPointing, Pause, PencilSimple, Play, Scan, SpeakerHigh, TextAlignLeft, X } from "@phosphor-icons/react";
import { BuddyPresence } from "@/components/BuddyPresence";
import { ReadingBuddyCursor } from "@/components/ReadingBuddyCursor";
import { VoicePicker } from "@/components/VoicePicker";
import { PressToTalk } from "@/components/PressToTalk";
import { getWordSupport, helpText, type HelpDepth } from "@/lib/literacy/engine";
import { recordLearningEvent } from "@/lib/learning/local-store";
import { recognisePage, recogniseWordRegion } from "@/lib/ocr/browser-tesseract";
import type { OcrSentence, OcrWord } from "@/lib/ocr/types";
import { chunkSentenceText } from "@/lib/reading/guided-reading";
import {
  createBookMemory,
  matchBookMemory,
  observeBookPassage,
  readBookMemories,
  readReadingMemoryMode,
  rememberBookCorrection,
  saveBookMemory,
  setReadingMemoryMode as persistReadingMemoryMode,
  type BookMemoryRecord,
  type ReadingMemoryMode,
} from "@/lib/reading/book-memory";
import {
  applyBookMemoryToPage,
  applyReaderCorrection,
} from "@/lib/reading/word-resolution";
import { useBuddySpeech } from "@/lib/speech/useBuddySpeech";

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
  possibleSpelling?: string | null;
  recognisedWord?: boolean;
  meaningCanBeRefined?: boolean;
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
  const recordedSelectionRef = useRef<string | null>(null);
  const autoReadingRef = useRef(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [capturedPage, setCapturedPage] = useState<CapturedPage | null>(null);
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [readingWords, setReadingWords] = useState<OcrWord[]>([]);
  const [sentences, setSentences] = useState<OcrSentence[]>([]);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [showSentenceChunks, setShowSentenceChunks] = useState(false);
  const [autoReading, setAutoReading] = useState(false);
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
  const [selectedOcrWordId, setSelectedOcrWordId] = useState<string | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionDraft, setCorrectionDraft] = useState("");
  const [activeBookMemory, setActiveBookMemory] = useState<BookMemoryRecord | null>(null);
  const [readingMemoryMode, setReadingMemoryModeState] = useState<ReadingMemoryMode>("session");
  const [readingSentenceIndex, setReadingSentenceIndex] = useState<number | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const speech = useBuddySpeech();
  const activeSentence = sentences[activeSentenceIndex] ?? null;
  const activeSentenceChunks = useMemo(
    () => activeSentence ? chunkSentenceText(activeSentence.text) : [],
    [activeSentence],
  );

  const support = useMemo(() => (selectedWord ? getWordSupport(selectedWord) : null), [selectedWord]);
  const checkedMeaning = support?.meaning ?? lookup?.meaning ?? null;
  const checkedExample = support?.example ?? lookup?.alternateExample ?? lookup?.example ?? null;
  const lookupUnknown = lookupState === "ready" && lookup?.recognisedWord === false;
  const currentHelp = support
    ? lookupUnknown
      ? lookup?.possibleSpelling
        ? `I'm not sure I read that right. Could it be “${lookup.possibleSpelling}”?`
        : "I'm not sure I read that word correctly. You can tap it again, or ask Buddy to check the word anyway."
      : voiceReply ?? helpText(support, helpDepth, lookup?.meaning)
    : null;

  useEffect(() => {
    setReadingMemoryModeState(readReadingMemoryMode());
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      autoReadingRef.current = false;
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

        if (result.recognisedWord !== false) {
          const selectionKey = `${support.word}|${selectedContext ?? ""}|${selectedSource}`;
          if (recordedSelectionRef.current !== selectionKey) {
            recordLearningEvent({
              kind: "word_selected",
              word: support.word,
              source: selectedSource,
              helpDepth,
            });
            recordedSelectionRef.current = selectionKey;
          }
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLookupState("error");
      });

    return () => controller.abort();
  }, [support, selectedContext, selectedSource]);

  async function startCamera() {
    setCameraState("starting");
    setCapturedPage(null);
    setOcrWords([]);
    setReadingWords([]);
    setSentences([]);
    setActiveSentenceIndex(0);
    setShowSentenceChunks(false);
    setReadingSentenceIndex(null);
    setReadingProgress(0);
    autoReadingRef.current = false;
    setAutoReading(false);
    speech.stop();
    setOcrState("idle");
    setSelectedWord(null);
    setSelectedOcrWordId(null);
    setCorrectionOpen(false);
    setCorrectionDraft("");
    setSelectedContext(null);
    setVoiceReply(null);
    setTapLookupMessage(null);
    recordedSelectionRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
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
    setReadingWords([]);
    setSentences([]);
    setActiveSentenceIndex(0);
    setShowSentenceChunks(false);
    autoReadingRef.current = false;
    setAutoReading(false);
    speech.stop();
    setOcrState("idle");
    setSelectedWord(null);
    setSelectedOcrWordId(null);
    setCorrectionOpen(false);
    setCorrectionDraft("");
    setSelectedContext(null);
    setVoiceReply(null);
    setLastTranscript(null);
    setLookup(null);
    setLookupState("idle");
    setTapLookupMessage(null);
    recordedSelectionRef.current = null;
  }

  async function capturePage() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const maxLongEdge = 2800;
    const scale = Math.min(1, maxLongEdge / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);
    const image = canvas.toDataURL("image/jpeg", 0.95);
    const ocrImage = makeOcrImage(canvas);
    setCapturedPage({ image, ocrImage, width, height });
    stopCamera();
    setOcrState("reading");
    setBuddyState("thinking");

    try {
      const result = await recognisePage(ocrImage, width, height, image);
      setCapturedPage({
        image: result.image,
        ocrImage: result.ocrImage,
        width: result.width,
        height: result.height,
      });
      const rawPassage = result.sentences.map((sentence) => sentence.text).join(" ") || result.text;
      const storedMatch = activeBookMemory
        ? null
        : matchBookMemory(rawPassage, readBookMemories());
      let bookMemory = activeBookMemory
        ?? storedMatch?.record
        ?? createBookMemory(globalThis.crypto?.randomUUID?.() ?? `book-${Date.now()}`);

      const resolvedPage = applyBookMemoryToPage(
        result.words,
        result.readingWords,
        result.sentences,
        bookMemory,
      );
      const resolvedPassage = resolvedPage.sentences.map((sentence) => sentence.text).join(" ") || rawPassage;
      bookMemory = observeBookPassage(bookMemory, resolvedPassage);

      setActiveBookMemory(bookMemory);
      if (readingMemoryMode === "device") saveBookMemory(bookMemory);

      setReadingWords(resolvedPage.readingWords);
      setOcrWords(resolvedPage.trustedWords.filter((word) => word.confidence >= 18 && /[a-z]/i.test(word.text)));
      setSentences(resolvedPage.sentences);
      setActiveSentenceIndex(0);
      setShowSentenceChunks(false);
      setOcrState("ready");
    } catch {
      setOcrState("error");
    } finally {
      setBuddyState("idle");
    }
  }

  function chooseWord(word: string, source: WordSource, context?: string, wordId?: string) {
    autoReadingRef.current = false;
    setAutoReading(false);
    speech.stop();
    const cleanWord = getWordSupport(word).word;
    if (!cleanWord) return;
    setSelectedWord(cleanWord);
    setSelectedOcrWordId(wordId ?? null);
    setCorrectionOpen(false);
    setCorrectionDraft("");
    setSelectedContext(context?.trim() || null);
    setSelectedSource(source);
    setVoiceReply(null);
    setLastTranscript(null);
    setLookup(null);
    setLookupState("idle");
    setTapLookupMessage(null);
    recordedSelectionRef.current = null;
  }

  function chooseDemoWord() {
    setBuddyState("thinking");
    window.setTimeout(() => {
      chooseWord("extraordinary", "demo", "The view from the top was extraordinary.");
      setBuddyState("idle");
    }, 320);
  }

  function changeReadingMemoryMode(nextMode: ReadingMemoryMode) {
    persistReadingMemoryMode(nextMode);
    setReadingMemoryModeState(nextMode);
    if (nextMode === "device" && activeBookMemory) saveBookMemory(activeBookMemory);
  }

  function openCorrection() {
    if (!selectedWord || !selectedOcrWordId) return;
    setCorrectionDraft(selectedWord);
    setCorrectionOpen(true);
  }

  function commitCorrection(value = correctionDraft) {
    const corrected = value.trim();
    if (!selectedOcrWordId || !corrected || !/[a-z]/i.test(corrected)) return;

    const next = applyReaderCorrection(
      ocrWords,
      readingWords,
      sentences,
      selectedOcrWordId,
      corrected,
    );
    if (!next.changed || !next.observed || !next.corrected) return;

    setOcrWords(next.trustedWords);
    setReadingWords(next.readingWords);
    setSentences(next.sentences);

    let bookMemory = activeBookMemory
      ?? createBookMemory(globalThis.crypto?.randomUUID?.() ?? `book-${Date.now()}`);
    bookMemory = rememberBookCorrection(bookMemory, next.observed, next.corrected);
    setActiveBookMemory(bookMemory);
    if (readingMemoryMode === "device") saveBookMemory(bookMemory);

    const sentence = next.sentences.find((candidate) =>
      candidate.wordIds.includes(selectedOcrWordId),
    );

    chooseWord(
      next.corrected,
      "ocr",
      sentence?.text ?? selectedContext ?? undefined,
      selectedOcrWordId,
    );
    setTapLookupMessage(
      readingMemoryMode === "device"
        ? "Got it — I'll remember that for this book on this device."
        : "Got it — I'll use that while we're reading this book.",
    );
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

  async function requestMeaningExplanation() {
    if (!support) return null;

    const params = new URLSearchParams({ word: support.word, explain: "1" });
    if (selectedContext) params.set("context", selectedContext);

    setVoiceReply("Finding a simple meaning for this one…");
    setBuddyState("thinking");

    try {
      const response = await fetch(`/api/word?${params.toString()}`);
      if (!response.ok) throw new Error("lookup_failed");
      const result = (await response.json()) as WordLookup;
      setLookup(result);
      setLookupState("ready");
      return result;
    } catch {
      return null;
    } finally {
      setBuddyState("idle");
    }
  }

  function changeHelpDepth(depth: HelpDepth) {
    setHelpDepth(depth);
    setVoiceReply(null);
    if (selectedWord && !lookupUnknown) {
      recordLearningEvent({ kind: "help_depth_changed", word: selectedWord, helpDepth: depth, source: selectedSource });
    }
    if (depth === "tell" && !lookupUnknown) {
      void explainMeaning();
    }
  }

  function speak(text: string) {
    setReadingSentenceIndex(null);
    speech.speak(text, {
      onStart: () => setBuddyState("speaking"),
      onEnd: () => setBuddyState("idle"),
    });
  }

  function speakWord() {
    if (!support || lookupUnknown) return;
    recordLearningEvent({ kind: "word_heard", word: support.word, helpDepth, source: selectedSource });
    speak(support.word);
  }

  function readLine() {
    if (!support || !selectedContext) return;
    if (!lookupUnknown) {
      recordLearningEvent({ kind: "line_heard", word: support.word, helpDepth, source: selectedSource });
    }
    speak(selectedContext);
  }

  function readExample() {
    if (!checkedExample) return;
    speak(checkedExample);
  }

  function stopContinuousReading() {
    autoReadingRef.current = false;
    setAutoReading(false);
    speech.stop();
    setBuddyState("idle");
  }

  function readSentenceAt(index: number, keepGoing = false) {
    const sentence = sentences[index];
    if (!sentence) return;

    setActiveSentenceIndex(index);
    setShowSentenceChunks(false);
    setReadingSentenceIndex(index);
    setReadingProgress(0);

    if (sentence.quality === "blocked") {
      autoReadingRef.current = false;
      setAutoReading(false);
      speech.stop();
      setBuddyState("idle");
      setReadingSentenceIndex(null);
      setTapLookupMessage("I can't read this bit reliably yet. Try the page again, or move to the next sentence.");
      return;
    }

    if (keepGoing) {
      autoReadingRef.current = true;
      setAutoReading(true);
    }

    speech.speak(sentence.text, {
      onStart: () => {
        setBuddyState("speaking");
        setReadingProgress(0);
      },
      onBoundary: ({ charIndex, charLength, name }) => {
        if (name && name !== "word" && name !== "sentence") return;
        const position = charIndex + Math.max(1, charLength) * 0.5;
        setReadingProgress(clamp(position / Math.max(1, sentence.text.length), 0, 1));
      },
      onEnd: () => {
        setReadingProgress(1);
        if (autoReadingRef.current && index < sentences.length - 1) {
          window.setTimeout(() => readSentenceAt(index + 1, true), 180);
          return;
        }
        autoReadingRef.current = false;
        setAutoReading(false);
        setBuddyState("idle");
      },
    });
  }

  function readCurrentSentence() {
    if (!activeSentence || activeSentence.quality === "blocked") return;
    autoReadingRef.current = false;
    setAutoReading(false);
    readSentenceAt(activeSentenceIndex, false);
  }

  function startContinuousReading() {
    if (!activeSentence || activeSentence.quality === "blocked") return;
    moveOn();
    readSentenceAt(activeSentenceIndex, true);
  }

  function moveSentence(direction: -1 | 1) {
    if (!sentences.length) return;
    stopContinuousReading();
    moveOn();
    setShowSentenceChunks(false);
    setReadingSentenceIndex(null);
    setReadingProgress(0);
    setActiveSentenceIndex((current) => clamp(current + direction, 0, sentences.length - 1));
  }

  function breakUpSentence() {
    if (!activeSentence || activeSentence.quality === "blocked") return;
    stopContinuousReading();
    setShowSentenceChunks(true);
  }

  function retakePage() {
    void startCamera();
  }

  function readSentenceChunk(chunk: string) {
    stopContinuousReading();
    speak(chunk);
  }

  async function explainMeaning() {
    if (!support) return;

    if (!lookupUnknown) {
      recordLearningEvent({ kind: "meaning_requested", word: support.word, helpDepth, source: selectedSource });
    }

    const needsExplanation = lookupUnknown || lookup?.meaningCanBeRefined || !checkedMeaning;
    if (needsExplanation) {
      const result = await requestMeaningExplanation();
      if (!result) {
        setVoiceReply(checkedMeaning ?? "I couldn't get a reliable meaning just now. I can still say it or help with the spelling.");
        return;
      }

      if (result.recognisedWord === false) {
        setVoiceReply(result.possibleSpelling
          ? `I still think the word might be ${result.possibleSpelling}. Try tapping it again if that doesn't look right.`
          : "I still can't identify that as an English word confidently. Try tapping it again.");
        return;
      }

      if (result.meaning) {
        if (recordedSelectionRef.current === null) {
          recordLearningEvent({ kind: "word_selected", word: support.word, source: selectedSource, helpDepth });
          recordedSelectionRef.current = `${support.word}|${selectedContext ?? ""}|${selectedSource}`;
        }
        recordLearningEvent({ kind: "meaning_requested", word: support.word, helpDepth, source: selectedSource });
        setVoiceReply(result.meaning);
        return;
      }
    }

    if (checkedMeaning) {
      setVoiceReply(checkedMeaning);
      return;
    }

    setVoiceReply("I couldn't get a reliable meaning just now. I can still say it or help with the spelling.");
  }

  function retrySelection() {
    setSelectedWord(null);
    setSelectedOcrWordId(null);
    setCorrectionOpen(false);
    setCorrectionDraft("");
    setSelectedContext(null);
    setVoiceReply(null);
    setLastTranscript(null);
    setLookup(null);
    setLookupState("idle");
    recordedSelectionRef.current = null;
    setTapLookupMessage("Tap the word again, right in the middle.");
  }

  function moveOn() {
    if (selectedWord && !lookupUnknown) {
      recordLearningEvent({ kind: "moved_on", word: selectedWord, helpDepth, source: selectedSource });
    }
    setSelectedWord(null);
    setSelectedOcrWordId(null);
    setCorrectionOpen(false);
    setCorrectionDraft("");
    setSelectedContext(null);
    setVoiceReply(null);
    setLastTranscript(null);
    setLookup(null);
    setLookupState("idle");
    recordedSelectionRef.current = null;
  }

  function handleTranscript(transcript: string) {
    setLastTranscript(transcript);
    const request = transcript.toLocaleLowerCase("en-GB");

    if (activeSentence) {
      if (/\b(stop|pause|my turn|i'll read|i will read)\b/.test(request)) {
        stopContinuousReading();
        return;
      }
      if (/keep reading|read to me|take over|carry on reading/.test(request)) {
        startContinuousReading();
        return;
      }
      if (/break.*up|split.*sentence|little bits|chunks/.test(request)) {
        breakUpSentence();
        return;
      }
      if (/read.*sentence|read this bit|whole sentence/.test(request)) {
        readCurrentSentence();
        return;
      }
      if (!support && /\b(next|next sentence|keep going)\b/.test(request)) {
        moveSentence(1);
        return;
      }
      if (!support && /\b(previous|back|last sentence)\b/.test(request)) {
        moveSentence(-1);
        return;
      }
      if (!support && /\b(again|repeat)\b/.test(request)) {
        readCurrentSentence();
        return;
      }
    }

    if (!support) return;

    if (lookupUnknown) {
      if (/mean|definition|tell me|check/.test(request)) {
        void explainMeaning();
      } else if (/again|retry|wrong/.test(request)) {
        retrySelection();
      }
      return;
    }

    recordLearningEvent({
      kind: "voice_request",
      word: support.word,
      helpDepth,
      transcript,
      source: selectedSource,
    });

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
    <div className={`reading-layout${capturedPage ? " session-active" : ""}${support ? " has-word-support" : ""}`}>
      <section className="camera-card" aria-label="Reading camera">
        <div className="camera-toolbar">
          <div>
            <span className="camera-kicker">Read with me</span>
            <strong>
              {ocrState === "reading"
                ? "Finding the words…"
                : capturedPage
                  ? ocrWords.length > 0
                    ? sentences.length > 0
                      ? `I found ${sentences.length} ${sentences.length === 1 ? "sentence" : "sentences"} and ${ocrWords.length} words.`
                      : `I found ${ocrWords.length} words.`
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
              {ocrState === "ready" && activeSentence && activeSentence.bounds.map((box, index) => (
                <span
                  key={`${activeSentence.id}-highlight-${index}`}
                  className="ocr-sentence-highlight"
                  aria-hidden="true"
                  style={{
                    left: `${(box.x0 / capturedPage.width) * 100}%`,
                    top: `${(box.y0 / capturedPage.height) * 100}%`,
                    width: `${((box.x1 - box.x0) / capturedPage.width) * 100}%`,
                    height: `${((box.y1 - box.y0) / capturedPage.height) * 100}%`,
                  }}
                />
              ))}
              {ocrState === "ready" && activeSentence && activeSentence.quality !== "blocked" && (
                <ReadingBuddyCursor
                  bounds={activeSentence.bounds}
                  pageWidth={capturedPage.width}
                  pageHeight={capturedPage.height}
                  progress={readingSentenceIndex === activeSentenceIndex ? readingProgress : 0}
                  speaking={buddyState === "speaking" && readingSentenceIndex === activeSentenceIndex}
                />
              )}
              {ocrState === "ready" && ocrWords.map((word) => (
                <button
                  key={word.id}
                  type="button"
                  className={`ocr-word${activeSentence?.wordIds.includes(word.id) ? " in-active-sentence" : ""}`}
                  style={{
                    left: `${(word.bbox.x0 / capturedPage.width) * 100}%`,
                    top: `${(word.bbox.y0 / capturedPage.height) * 100}%`,
                    width: `${((word.bbox.x1 - word.bbox.x0) / capturedPage.width) * 100}%`,
                    height: `${((word.bbox.y1 - word.bbox.y0) / capturedPage.height) * 100}%`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    const sentenceIndex = sentences.findIndex((sentence) => sentence.wordIds.includes(word.id));
                    if (sentenceIndex >= 0) {
                      setActiveSentenceIndex(sentenceIndex);
                      setShowSentenceChunks(false);
                    }
                    chooseWord(
                      word.text,
                      "ocr",
                      sentenceIndex >= 0 ? sentences[sentenceIndex].text : word.lineText,
                      word.id,
                    );
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
              ? sentences.length > 0
                ? "Follow the highlighted sentence. Tap any word when you want Buddy to help."
                : "Tap a highlighted word — or tap an unboxed word and Buddy will take a closer look."
              : "The page stays on this device while Buddy finds the words."}
          </span>
          {!capturedPage && (
            <button type="button" className="text-button" onClick={chooseDemoWord}>
              <HandPointing size={18} /> Try “extraordinary”
            </button>
          )}
        </div>

        {capturedPage && (
          <label className="book-memory-control">
            <input
              type="checkbox"
              checked={readingMemoryMode === "device"}
              onChange={(event) => changeReadingMemoryMode(event.target.checked ? "device" : "session")}
            />
            <span>
              <strong>Remember this book on this device</strong>
              <small>Buddy keeps corrections and small text fingerprints, not page photos.</small>
            </span>
          </label>
        )}
      </section>

      <aside className="reading-side">
        <div className="presence-card">
          <BuddyPresence
            state={buddyState}
            label={
              selectedWord
                ? "This one?"
                : autoReading
                  ? "I'll keep going. Stop me whenever you want."
                  : activeSentence?.quality === "blocked"
                    ? "I can't read this bit reliably yet."
                    : activeSentence?.quality === "check"
                      ? "This bit is a little fuzzy. Check me."
                      : activeSentence
                      ? "You read. I'm following."
                      : capturedPage
                      ? "Tap the bit you want."
                      : "Point me at the page."
            }
          />
        </div>

        {capturedPage && activeSentence && (
          <section className="guided-reading-card" aria-labelledby="guided-reading-title">
            <div className="guided-reading-heading">
              <div>
                <span>Reading together</span>
                <strong id="guided-reading-title">Sentence {activeSentenceIndex + 1} of {sentences.length}</strong>
              </div>
              {autoReading
                ? <span className="reading-live">Buddy is reading</span>
                : activeSentence.quality === "blocked"
                  ? <span className="reading-quality-note blocked">Need another look</span>
                  : activeSentence.quality === "check"
                    ? <span className="reading-quality-note">Check scan</span>
                    : null}
            </div>

            {activeSentence.quality === "blocked" ? (
              <div className="guided-blocked">
                <strong>I can't quite read this bit yet.</strong>
                <span>I won't guess or read muddled words aloud.</span>
                <button type="button" className="text-button" onClick={retakePage}>
                  <Camera size={18} /> Try the page again
                </button>
              </div>
            ) : (
              <p className="guided-sentence">{activeSentence.text}</p>
            )}

            {activeSentence.quality === "check" && (
              <p className="guided-scan-note">
                I had to look more closely at this sentence. Check the highlighted line against the book before asking Buddy to read it.
              </p>
            )}

            {showSentenceChunks && activeSentence.quality !== "blocked" && activeSentenceChunks.length > 1 && (
              <div className="sentence-chunks" aria-label="Sentence broken into smaller parts">
                {activeSentenceChunks.map((chunk, index) => (
                  <button type="button" key={`${chunk}-${index}`} onClick={() => readSentenceChunk(chunk)}>
                    <span>{index + 1}</span>
                    {chunk}
                  </button>
                ))}
              </div>
            )}

            <div className="guided-reading-actions">
              <button
                type="button"
                className="round-control compact"
                onClick={() => moveSentence(-1)}
                disabled={activeSentenceIndex === 0}
                aria-label="Previous sentence"
              >
                <ArrowLeft size={19} />
              </button>
              <button
                type="button"
                className="tactile-button dark"
                onClick={readCurrentSentence}
                disabled={activeSentence.quality === "blocked"}
              >
                <SpeakerHigh size={20} /> Read this
              </button>
              <button
                type="button"
                className="tactile-button"
                onClick={breakUpSentence}
                disabled={activeSentence.quality === "blocked"}
              >
                Break it up
              </button>
              <button
                type="button"
                className="round-control compact"
                onClick={() => moveSentence(1)}
                disabled={activeSentenceIndex === sentences.length - 1}
                aria-label="Next sentence"
              >
                <ArrowRight size={19} />
              </button>
            </div>

            <div className="talking-book-row">
              <button
                type="button"
                className={`tactile-button${autoReading ? "" : " dark"}`}
                onClick={autoReading ? stopContinuousReading : startContinuousReading}
                disabled={!autoReading && activeSentence.quality === "blocked"}
              >
                {autoReading ? <Pause size={20} /> : <Play size={20} />}
                {autoReading ? "I'll read now" : "Keep reading to me"}
              </button>
              <PressToTalk
                onListeningChange={(listening) => setBuddyState(listening ? "listening" : "idle")}
                onTranscript={handleTranscript}
              />
            </div>

            {lastTranscript && !selectedWord && (
              <p className="heard-you"><span>You said</span> “{lastTranscript}”</p>
            )}
          </section>
        )}

        <VoicePicker
          voices={speech.voices}
          selectedVoiceURI={speech.selectedVoiceURI}
          rate={speech.rate}
          onVoiceChange={speech.setVoiceURI}
          onRateChange={speech.setRate}
          onPreview={speech.preview}
        />

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
                disabled={lookupUnknown}
              >
                {helpLabels[depth]}
              </button>
            ))}
          </div>
        </section>

        {support ? (
          <section className={`selected-word-card${lookupUnknown ? " word-uncertain" : ""}`} aria-live="polite">
            <div className="selected-word-heading">
              <div>
                <span className="selected-kicker">{lookupUnknown ? "I might have misread this" : "This one?"}</span>
                <h2>{support.word}</h2>
              </div>
              {selectedSource === "ocr" && selectedOcrWordId && (
                <button type="button" className="word-correct-button" onClick={openCorrection}>
                  <PencilSimple size={17} /> Not right?
                </button>
              )}
            </div>
            {!lookupUnknown && lookup?.partOfSpeech && <span className="word-kind">{lookup.partOfSpeech}</span>}

            {correctionOpen && selectedOcrWordId && (
              <form
                className="reader-correction-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  commitCorrection();
                }}
              >
                <label htmlFor="buddy-word-correction">What does the book say?</label>
                <div>
                  <input
                    id="buddy-word-correction"
                    value={correctionDraft}
                    onChange={(event) => setCorrectionDraft(event.target.value)}
                    autoCapitalize="sentences"
                    autoComplete="off"
                    spellCheck
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="round-control compact"
                    disabled={!correctionDraft.trim() || correctionDraft.trim() === selectedWord}
                    aria-label="Use corrected word"
                  >
                    <Check size={18} />
                  </button>
                </div>
                <small>
                  {readingMemoryMode === "device"
                    ? "Buddy can use this correction again in this book on this device."
                    : "Buddy will use this correction for this reading session."}
                </small>
              </form>
            )}
            <p className="word-help">{currentHelp}</p>

            {lookupState === "loading" && (
              <p className="lookup-note">Finding its sounds and meaning…</p>
            )}

            {lookupUnknown && (
              <div className="word-correction">
                {lookup?.possibleSpelling ? (
                  <button
                    type="button"
                    className="tactile-button dark"
                    onClick={() => {
                      if (selectedOcrWordId) commitCorrection(lookup.possibleSpelling!);
                      else chooseWord(lookup.possibleSpelling!, selectedSource, selectedContext ?? undefined);
                    }}
                  >
                    Yes — {lookup.possibleSpelling}
                  </button>
                ) : null}
                <button type="button" className="tactile-button" onClick={retrySelection}>
                  Tap it again
                </button>
                <button type="button" className="tactile-button" onClick={() => void explainMeaning()}>
                  Check this word anyway
                </button>
              </div>
            )}

            {!lookupUnknown && lookup?.soundGuide && (
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
                <span>In this sentence</span>
                <p>“{selectedContext}”</p>
                <button type="button" className="text-button" onClick={readLine}>
                  <SpeakerHigh size={17} /> Read this sentence
                </button>
              </div>
            )}

            {!lookupUnknown && helpDepth === "tell" && checkedExample && checkedExample !== selectedContext && (
              <div className="meaning-example">
                <span>Another example</span>
                <p>“{checkedExample}”</p>
                <button type="button" className="text-button" onClick={readExample}>
                  <SpeakerHigh size={17} /> Read example
                </button>
              </div>
            )}

            {lastTranscript && !lookupUnknown && (
              <p className="heard-you"><span>You said</span> “{lastTranscript}”</p>
            )}

            {!lookupUnknown && (
              <div className="word-actions">
                <button type="button" className="tactile-button dark" onClick={speakWord}>
                  <SpeakerHigh size={22} /> Say it
                </button>
                {selectedContext && (
                  <button type="button" className="tactile-button" onClick={readLine}>
                    <TextAlignLeft size={21} /> Read the sentence
                  </button>
                )}
                <button type="button" className="tactile-button" onClick={() => void explainMeaning()}>
                  Tell me the meaning
                </button>
                <PressToTalk
                  onListeningChange={(listening) => setBuddyState(listening ? "listening" : "idle")}
                  onTranscript={handleTranscript}
                />
              </div>
            )}

            {!lookupUnknown && (
              <div className="move-on">
                <span>Got it?</span>
                <button type="button" className="text-button" onClick={moveOn}>Yep, keep going</button>
              </div>
            )}
          </section>
        ) : !capturedPage ? (
          <section className="selected-word-card quiet">
            <span className="selected-kicker">Buddy stays quiet until you need it.</span>
            <h2>Keep reading.</h2>
            <p>No scores. No quiz. No interruption unless you ask.</p>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
