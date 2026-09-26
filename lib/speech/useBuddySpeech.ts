"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type BuddySpeechRate = "slow" | "steady" | "natural";

export type BuddyVoiceOption = {
  voiceURI: string;
  name: string;
  lang: string;
  label: string;
  detail: string;
};

type SpeakOptions = {
  onStart?: () => void;
  onEnd?: () => void;
};

type StoredSpeechPreferences = {
  voiceURI?: string;
  rate?: BuddySpeechRate;
};

const STORAGE_KEY = "buddy.speech.v1";
const PREFERENCES_EVENT = "buddy:speech-preferences";

const rateValues: Record<BuddySpeechRate, number> = {
  slow: 0.68,
  steady: 0.8,
  natural: 0.94,
};

function readPreferences(): StoredSpeechPreferences {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredSpeechPreferences;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function savePreferences(next: StoredSpeechPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT));
}

function voiceScore(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase();
  let score = 0;
  if (lang === "en-gb") score += 100;
  else if (lang.startsWith("en-gb")) score += 95;
  else if (lang.startsWith("en-")) score += 55;
  if (voice.localService) score += 10;
  if (voice.default) score += 4;
  return score;
}

function usefulVoices(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const source = english.length ? english : voices;
  const seen = new Set<string>();

  return [...source]
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name))
    .filter((voice) => {
      const key = `${voice.voiceURI}|${voice.lang}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function toOptions(voices: SpeechSynthesisVoice[]): BuddyVoiceOption[] {
  return voices.map((voice, index) => ({
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    label: `Voice ${index + 1}`,
    detail: `${voice.name} · ${voice.lang}`,
  }));
}

export function useBuddySpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferences, setPreferences] = useState<StoredSpeechPreferences>({});

  const refresh = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    setVoices(usefulVoices(window.speechSynthesis.getVoices()));
  }, []);

  useEffect(() => {
    setPreferences(readPreferences());
    if (!("speechSynthesis" in window)) return;

    refresh();
    const firstRetry = window.setTimeout(refresh, 120);
    const secondRetry = window.setTimeout(refresh, 700);
    window.speechSynthesis.addEventListener?.("voiceschanged", refresh);

    const syncPreferences = () => setPreferences(readPreferences());
    window.addEventListener(PREFERENCES_EVENT, syncPreferences);

    return () => {
      window.clearTimeout(firstRetry);
      window.clearTimeout(secondRetry);
      window.speechSynthesis.removeEventListener?.("voiceschanged", refresh);
      window.removeEventListener(PREFERENCES_EVENT, syncPreferences);
    };
  }, [refresh]);

  const selectedVoice = useMemo(() => {
    if (!voices.length) return null;
    return voices.find((voice) => voice.voiceURI === preferences.voiceURI) ?? voices[0];
  }, [preferences.voiceURI, voices]);

  const rate = preferences.rate ?? "steady";
  const voiceOptions = useMemo(() => toOptions(voices), [voices]);

  const setVoiceURI = useCallback((voiceURI: string) => {
    const current = readPreferences();
    const next = { ...current, voiceURI };
    savePreferences(next);
    setPreferences(next);
  }, []);

  const setRate = useCallback((nextRate: BuddySpeechRate) => {
    const current = readPreferences();
    const next = { ...current, rate: nextRate };
    savePreferences(next);
    setPreferences(next);
  }, []);

  const stop = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    if (!text.trim() || !("speechSynthesis" in window)) {
      options.onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || "en-GB";
    } else {
      utterance.lang = "en-GB";
    }
    utterance.rate = rateValues[rate];
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onEnd?.();
    window.speechSynthesis.speak(utterance);
  }, [rate, selectedVoice]);

  const preview = useCallback((voiceURI?: string) => {
    if (!("speechSynthesis" in window)) return;
    const previewVoice = voices.find((voice) => voice.voiceURI === voiceURI) ?? selectedVoice;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hello. I'm Buddy. Let's have a look.");
    if (previewVoice) {
      utterance.voice = previewVoice;
      utterance.lang = previewVoice.lang || "en-GB";
    } else {
      utterance.lang = "en-GB";
    }
    utterance.rate = rateValues[rate];
    window.speechSynthesis.speak(utterance);
  }, [rate, selectedVoice, voices]);

  return {
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    voices: voiceOptions,
    selectedVoiceURI: selectedVoice?.voiceURI ?? "",
    selectedVoiceName: selectedVoice?.name ?? "Device voice",
    rate,
    setVoiceURI,
    setRate,
    speak,
    stop,
    preview,
  };
}
