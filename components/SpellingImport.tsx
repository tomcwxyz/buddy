"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  Check,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { recognisePage } from "@/lib/ocr/browser-tesseract";
import { prepareUploadedImage, type PreparedUploadImage } from "@/lib/ocr/browser-upload";
import {
  extractSpellingCandidates,
  isUsableSpellingWord,
  normaliseSpellingWord,
} from "@/lib/practice/spelling-import";
import { savePracticeSet } from "@/lib/practice/sets";

type Candidate = {
  id: string;
  word: string;
  included: boolean;
};

type ImportState = "idle" | "preparing" | "reading" | "review" | "error";

function makeCandidate(word: string): Candidate {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `word-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    word,
    included: true,
  };
}

export function SpellingImport() {
  const router = useRouter();
  const [state, setState] = useState<ImportState>("idle");
  const [page, setPage] = useState<PreparedUploadImage | null>(null);
  const [label, setLabel] = useState("Words to play with");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const selectedWords = useMemo(
    () => candidates
      .filter((candidate) => candidate.included)
      .map((candidate) => normaliseSpellingWord(candidate.word))
      .filter(isUsableSpellingWord),
    [candidates],
  );

  async function choosePhoto(file: File | null) {
    if (!file) return;
    setState("preparing");
    setMessage(null);
    setCandidates([]);

    try {
      const prepared = await prepareUploadedImage(file);
      setPage(prepared);
      setState("reading");
      const result = await recognisePage(prepared.ocrImage, prepared.width, prepared.height);
      const words = extractSpellingCandidates(result.words);
      setCandidates(words.map(makeCandidate));
      setState("review");
      if (words.length === 0) {
        setMessage("I couldn't find a clear list. You can add the words yourself below.");
      }
    } catch {
      setState("error");
      setMessage("I couldn't read that photo clearly. Try another one, or add the words yourself.");
    }
  }

  function updateCandidate(id: string, patch: Partial<Candidate>) {
    setCandidates((current) => current.map((candidate) => (
      candidate.id === id ? { ...candidate, ...patch } : candidate
    )));
  }

  function addWord() {
    setCandidates((current) => [...current, makeCandidate("")]);
    if (state === "idle") setState("review");
  }

  function removeWord(id: string) {
    setCandidates((current) => current.filter((candidate) => candidate.id !== id));
  }

  function saveWords() {
    const set = savePracticeSet({
      label,
      source: page ? "school-photo" : "manual",
      words: selectedWords,
    });

    if (!set) {
      setMessage("Choose at least one word first.");
      return;
    }

    router.push("/practice");
  }

  return (
    <section className="spelling-import-shell">
      <header className="spelling-import-heading">
        <p className="eyebrow">Bring words into Play</p>
        <h1>Add some words</h1>
        <p>Take a photo of a list, or add words yourself. Buddy will find what it can, then you can check everything before it is saved.</p>
      </header>

      <div className="spelling-import-grid">
        <section className="spelling-photo-card">
          <label className="spelling-photo-button">
            <Camera size={24} />
            <span>{page ? "Choose or take another photo" : "Choose or take a photo"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void choosePhoto(event.target.files?.[0] ?? null)}
            />
          </label>

          {page ? (
            <div className="spelling-photo-preview">
              {/* The image remains local to this browser and is not stored with the practice set. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.previewImage} alt="Photographed spelling list" />
            </div>
          ) : (
            <div className="spelling-photo-empty">
              <Camera size={42} weight="light" />
              <p>A clear photo of a list works best.</p>
            </div>
          )}

          <p className="spelling-privacy">The photo stays in this browser. Buddy saves the words, not the picture.</p>
        </section>

        <section className="spelling-review-card">
          <label className="spelling-set-label">
            <span>Call this set</span>
            <input value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>

          <div className="spelling-review-heading">
            <div>
              <span>Check the words</span>
              <strong>
                {state === "preparing" || state === "reading"
                  ? "Buddy is looking…"
                  : candidates.length > 0
                    ? "Did I read these properly?"
                    : "Add a word whenever you're ready."}
              </strong>
            </div>
            {selectedWords.length > 0 && <span>{selectedWords.length} selected</span>}
          </div>

          {message && <p className="spelling-message">{message}</p>}

          <div className="spelling-candidates">
            {candidates.map((candidate) => (
              <div className="spelling-candidate" key={candidate.id}>
                <button
                  type="button"
                  className={candidate.included ? "spelling-check included" : "spelling-check"}
                  onClick={() => updateCandidate(candidate.id, { included: !candidate.included })}
                  aria-label={candidate.included ? `Leave ${candidate.word || "word"} in the set` : `Add ${candidate.word || "word"} to the set`}
                >
                  {candidate.included && <Check size={17} weight="bold" />}
                </button>
                <input
                  value={candidate.word}
                  onChange={(event) => updateCandidate(candidate.id, { word: event.target.value })}
                  placeholder="word"
                  aria-label="Spelling word"
                />
                <button
                  type="button"
                  className="spelling-remove"
                  onClick={() => removeWord(candidate.id)}
                  aria-label={`Remove ${candidate.word || "word"}`}
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="spelling-add-word" onClick={addWord}>
            <Plus size={18} /> Add a word
          </button>

          <div className="spelling-save-row">
            <button
              type="button"
              className="practice-primary"
              onClick={saveWords}
              disabled={selectedWords.length === 0}
            >
              Play with these words <ArrowRight size={20} />
            </button>
            <span>These words join the same Play world as words Buddy has met anywhere else.</span>
          </div>
        </section>
      </div>
    </section>
  );
}
