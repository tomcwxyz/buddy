"use client";

import { SpeakerHigh } from "@phosphor-icons/react";
import type { BuddySpeechRate, BuddyVoiceOption } from "@/lib/speech/useBuddySpeech";

type VoicePickerProps = {
  voices: BuddyVoiceOption[];
  selectedVoiceURI: string;
  rate: BuddySpeechRate;
  onVoiceChange: (voiceURI: string) => void;
  onRateChange: (rate: BuddySpeechRate) => void;
  onPreview: (voiceURI?: string) => void;
};

const rates: Array<{ value: BuddySpeechRate; label: string }> = [
  { value: "slow", label: "Slower" },
  { value: "steady", label: "Steady" },
  { value: "natural", label: "Natural" },
];

export function VoicePicker({
  voices,
  selectedVoiceURI,
  rate,
  onVoiceChange,
  onRateChange,
  onPreview,
}: VoicePickerProps) {
  const selectedIndex = Math.max(0, voices.findIndex((voice) => voice.voiceURI === selectedVoiceURI));
  const selected = voices[selectedIndex];

  return (
    <details className="voice-picker">
      <summary>
        <SpeakerHigh size={18} />
        <span>
          <strong>Buddy's voice</strong>
          <small>{selected ? selected.label : "Device voice"} · {rates.find((item) => item.value === rate)?.label ?? "Steady"}</small>
        </span>
      </summary>

      <div className="voice-picker-panel">
        <div className="voice-picker-heading">
          <div>
            <strong>Pick the one you like</strong>
            <span>These are voices available on this device.</span>
          </div>
          <button type="button" onClick={() => onPreview(selected?.voiceURI)}>
            <SpeakerHigh size={16} /> Try it
          </button>
        </div>

        {voices.length > 0 ? (
          <div className="voice-options" role="list" aria-label="Available voices">
            {voices.map((voice) => {
              const active = voice.voiceURI === selectedVoiceURI || (!selectedVoiceURI && voice === voices[0]);
              return (
                <button
                  type="button"
                  key={voice.voiceURI}
                  className={active ? "active" : ""}
                  onClick={() => {
                    onVoiceChange(voice.voiceURI);
                    onPreview(voice.voiceURI);
                  }}
                >
                  <span>{voice.label}</span>
                  <small>{voice.detail}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="voice-picker-empty">Buddy is using the voice supplied by this browser.</p>
        )}

        <div className="voice-rate" aria-label="Speaking speed">
          <span>Speed</span>
          <div>
            {rates.map((item) => (
              <button
                type="button"
                key={item.value}
                className={rate === item.value ? "active" : ""}
                onClick={() => onRateChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
