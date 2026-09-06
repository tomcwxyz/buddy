"use client";

import { useMemo, useState } from "react";
import { DownloadSimple, ImageSquare, Play, Scan, UploadSimple } from "@phosphor-icons/react";
import {
  evaluateOcrWords,
  normaliseEvaluationWord,
  tokeniseExpectedText,
} from "@/lib/ocr/evaluation";
import { recognisePage } from "@/lib/ocr/browser-tesseract";
import type { OcrResult } from "@/lib/ocr/types";

type PreparedPage = {
  fileName: string;
  previewImage: string;
  ocrImage: string;
  width: number;
  height: number;
};

type RunState = "idle" | "preparing" | "reading" | "ready" | "error";
type LayoutType = "prose" | "worksheet" | "early-reader" | "mixed";
type Recoverability = "unknown" | "yes" | "no";

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("file_read_failed"));
    reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image_load_failed"));
    image.src = src;
  });
}

async function preparePage(file: File): Promise<PreparedPage> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxWidth = 2000;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas_unavailable");

  context.drawImage(image, 0, 0, width, height);
  const previewImage = canvas.toDataURL("image/jpeg", 0.94);
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Match the current child-facing reading capture preprocessing so lab results
  // are representative of the real reading surface rather than a separate OCR path.
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
  return {
    fileName: file.name,
    previewImage,
    ocrImage: canvas.toDataURL("image/png"),
    width,
    height,
  };
}

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function fixtureFileName(label: string, fallback: string) {
  const base = (label || fallback.replace(/\.[^.]+$/, ""))
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "buddy-ocr-fixture";
  return `${base}.ocr-fixture.json`;
}

function parseReviewWords(value: string) {
  return value
    .split(/[\n,]+/)
    .map(normaliseEvaluationWord)
    .filter((word) => /[a-z]/.test(word));
}

export function OcrEvaluationLab() {
  const [page, setPage] = useState<PreparedPage | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [state, setState] = useState<RunState>("idle");
  const [expectedText, setExpectedText] = useState("");
  const [label, setLabel] = useState("");
  const [layoutType, setLayoutType] = useState<LayoutType>("prose");
  const [recoverOnTapText, setRecoverOnTapText] = useState("");
  const [mustNotTrustText, setMustNotTrustText] = useState("");
  const [interactionRecoverable, setInteractionRecoverable] = useState<Recoverability>("unknown");
  const [reviewNotes, setReviewNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const evaluation = useMemo(
    () => result ? evaluateOcrWords(expectedText, result.words.map((word) => word.text)) : null,
    [expectedText, result],
  );

  const recoverOnTapWords = useMemo(() => parseReviewWords(recoverOnTapText), [recoverOnTapText]);
  const mustNotTrustWords = useMemo(() => parseReviewWords(mustNotTrustText), [mustNotTrustText]);
  const unsafeTrustedWords = useMemo(() => {
    if (!result || mustNotTrustWords.length === 0) return [];
    const detected = new Set(result.words.map((word) => normaliseEvaluationWord(word.text)));
    return [...new Set(mustNotTrustWords.filter((word) => detected.has(word)))];
  }, [mustNotTrustWords, result]);

  async function chooseFile(file: File | null) {
    if (!file) return;
    setState("preparing");
    setResult(null);
    setErrorMessage(null);
    try {
      const prepared = await preparePage(file);
      setPage(prepared);
      if (!label) setLabel(file.name.replace(/\.[^.]+$/, ""));
      setState("idle");
    } catch {
      setPage(null);
      setState("error");
      setErrorMessage("Buddy couldn't prepare that image for OCR testing.");
    }
  }

  async function runOcr() {
    if (!page) return;
    setState("reading");
    setErrorMessage(null);
    try {
      const next = await recognisePage(page.ocrImage, page.width, page.height);
      setResult(next);
      setState("ready");
    } catch {
      setState("error");
      setErrorMessage("The OCR run failed. The image remains local to this browser, so you can try another capture.");
    }
  }

  function exportFixture() {
    if (!page || !result || !evaluation) return;

    const fixture = {
      version: 2,
      label: label.trim() || page.fileName,
      sourceFile: page.fileName,
      createdAt: new Date().toISOString(),
      imageIncluded: false,
      expectedText,
      expectedWords: tokeniseExpectedText(expectedText),
      review: {
        status: "candidate",
        reviewedAt: null,
        layoutType,
        recoverOnTapWords,
        mustNotTrustWords,
        interactionRecoverable,
        notes: reviewNotes.trim() || null,
      },
      acceptance: {
        minimumPrecision: null,
        minimumRecall: null,
        requireRecoverableInteraction: null,
      },
      capture: {
        width: page.width,
        height: page.height,
      },
      evaluation,
      recovery: result.recovery,
      detectedWords: result.words.map((word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox,
        lineText: word.lineText ?? null,
        pass: word.id.startsWith("sparse-") ? "sparse" : "auto-or-merged",
      })),
    };

    const blob = new Blob([JSON.stringify(fixture, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fixtureFileName(label, page.fileName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const recoveredCount = result
    ? Math.max(0, result.recovery.finalTrustedWords - result.recovery.primaryTrustedWords)
    : 0;

  return (
    <main className="ocr-lab-shell">
      <header className="ocr-lab-header">
        <div>
          <span className="ocr-lab-kicker">Internal evaluation surface</span>
          <h1>Buddy OCR lab</h1>
          <p>Use real photographed pages to test the same local OCR ladder as the reading surface. Images stay in this browser; exported fixtures contain reviewed text and box metadata, not the image.</p>
        </div>
        <a href="/lab/words" className="ocr-lab-link">Word lab →</a>
      </header>

      <section className="ocr-lab-controls">
        <label className="ocr-upload">
          <UploadSimple size={22} />
          <span>{page ? "Choose another page" : "Choose a photographed page"}</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label className="ocr-field compact">
          <span>Fixture label</span>
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Year 4 novel page 1" />
        </label>

        <button type="button" className="ocr-run" onClick={() => void runOcr()} disabled={!page || state === "reading" || state === "preparing"}>
          {state === "reading" ? <Scan size={21} /> : <Play size={21} />}
          {state === "reading" ? "Reading page…" : "Run Buddy OCR"}
        </button>
      </section>

      {errorMessage && <div className="ocr-lab-error">{errorMessage}</div>}

      <div className="ocr-lab-grid">
        <section className="ocr-preview-card">
          <div className="ocr-section-heading">
            <div>
              <span>Page</span>
              <strong>{page?.fileName ?? "No image yet"}</strong>
            </div>
            {result && <span>{result.words.length} trusted boxes</span>}
          </div>

          {page ? (
            <div className="ocr-preview">
              {/* Internal local-only evaluation surface. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.previewImage} alt="OCR fixture page" />
              {result?.words.map((word) => (
                <span
                  key={word.id}
                  className={`ocr-eval-box ${word.id.startsWith("sparse-") ? "recovered" : ""}`}
                  title={`${word.text} · ${Math.round(word.confidence)}%`}
                  style={{
                    left: `${(word.bbox.x0 / page.width) * 100}%`,
                    top: `${(word.bbox.y0 / page.height) * 100}%`,
                    width: `${((word.bbox.x1 - word.bbox.x0) / page.width) * 100}%`,
                    height: `${((word.bbox.y1 - word.bbox.y0) / page.height) * 100}%`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="ocr-preview-empty">
              <ImageSquare size={42} />
              <p>Start with an actual photographed book page, worksheet or early-reader page.</p>
            </div>
          )}
        </section>

        <aside className="ocr-evaluation-panel">
          <label className="ocr-field">
            <span>Expected text</span>
            <textarea
              value={expectedText}
              onChange={(event) => setExpectedText(event.target.value)}
              placeholder="Paste or type the text that is actually visible on the page. Repeated words matter."
              rows={8}
            />
          </label>

          <div className="ocr-review-block">
            <div className="ocr-section-heading">
              <div>
                <span>Fixture review</span>
                <strong>Describe what good enough means</strong>
              </div>
            </div>

            <div className="ocr-review-grid">
              <label className="ocr-field">
                <span>Page type</span>
                <select value={layoutType} onChange={(event) => setLayoutType(event.target.value as LayoutType)}>
                  <option value="prose">Prose</option>
                  <option value="worksheet">Worksheet</option>
                  <option value="early-reader">Large-print early reader</option>
                  <option value="mixed">Mixed illustration + text</option>
                </select>
              </label>

              <label className="ocr-field">
                <span>Still recoverable?</span>
                <select value={interactionRecoverable} onChange={(event) => setInteractionRecoverable(event.target.value as Recoverability)}>
                  <option value="unknown">Not reviewed yet</option>
                  <option value="yes">Yes — child can still get help</option>
                  <option value="no">No — miss blocks the interaction</option>
                </select>
              </label>
            </div>

            <label className="ocr-field">
              <span>Safe to miss, but should recover on tap</span>
              <textarea
                className="ocr-review-textarea"
                value={recoverOnTapText}
                onChange={(event) => setRecoverOnTapText(event.target.value)}
                placeholder="Comma or line separated words"
                rows={3}
              />
            </label>

            <label className="ocr-field">
              <span>Must never become a trusted box</span>
              <textarea
                className="ocr-review-textarea"
                value={mustNotTrustText}
                onChange={(event) => setMustNotTrustText(event.target.value)}
                placeholder="OCR noise or false positives that would mislead the child"
                rows={3}
              />
            </label>

            <label className="ocr-field">
              <span>Review notes</span>
              <textarea
                className="ocr-review-textarea"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Glare, page curve, unusual font, what the child tried, or why this fixture matters."
                rows={3}
              />
            </label>
          </div>

          {unsafeTrustedWords.length > 0 && (
            <div className="ocr-fixture-alert">
              <strong>Unsafe trusted detection</strong>
              <span>{unsafeTrustedWords.join(", ")} is marked “must never trust” but is currently tappable. Keep the candidate: this is exactly the failure the fixture should preserve.</span>
            </div>
          )}

          {result && evaluation ? (
            <>
              <div className="ocr-metrics">
                <div><span>Recall</span><strong>{percent(evaluation.recall)}</strong></div>
                <div><span>Precision</span><strong>{percent(evaluation.precision)}</strong></div>
                <div><span>Matched</span><strong>{evaluation.matchedCount}/{evaluation.expectedCount || "—"}</strong></div>
                <div><span>Recovered</span><strong>+{recoveredCount}</strong></div>
              </div>

              <div className="ocr-recovery-note">
                <strong>{result.recovery.sparsePass ? "Second pass used" : "Single pass was enough"}</strong>
                <span>{result.recovery.reason.replaceAll("-", " ")} · {result.recovery.primaryTrustedWords} → {result.recovery.finalTrustedWords} trusted words</span>
                <span>{result.recovery.deskew.applied ? `Deskew ${result.recovery.deskew.angle.toFixed(2)}° applied` : `Deskew not applied · candidate ${result.recovery.deskew.candidateAngle.toFixed(2)}°`}</span>
              </div>

              <div className="ocr-diff-grid">
                <div>
                  <span>Missing</span>
                  <p>{evaluation.missingWords.length ? evaluation.missingWords.join(", ") : "None in the expected text."}</p>
                </div>
                <div>
                  <span>Unexpected</span>
                  <p>{evaluation.unexpectedWords.length ? evaluation.unexpectedWords.join(", ") : "No extra trusted words."}</p>
                </div>
              </div>

              <button type="button" className="ocr-export" onClick={exportFixture}>
                <DownloadSimple size={20} /> Export candidate fixture
              </button>
              <p className="ocr-export-note">Exports start as candidates. A fixture only becomes part of the reviewed set after its acceptance boundary is recorded and the JSON is checked into <code>data/ocr-fixtures</code>.</p>
            </>
          ) : (
            <div className="ocr-eval-empty">
              <p>Run OCR, add the expected text, then review whether any misses are safely recoverable and whether false positives would mislead the child.</p>
            </div>
          )}
        </aside>
      </div>

      {result && (
        <section className="ocr-word-table-card">
          <div className="ocr-section-heading">
            <div>
              <span>Trusted detections</span>
              <strong>What Buddy would make tappable</strong>
            </div>
          </div>
          <div className="ocr-word-table">
            <div className="ocr-word-row heading"><span>Word</span><span>Confidence</span><span>Pass</span><span>Line context</span></div>
            {result.words.map((word) => (
              <div className="ocr-word-row" key={`row-${word.id}`}>
                <strong>{word.text}</strong>
                <span>{Math.round(word.confidence)}%</span>
                <span>{word.id.startsWith("sparse-") ? "recovered" : "auto / merged"}</span>
                <span>{word.lineText ?? "—"}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
