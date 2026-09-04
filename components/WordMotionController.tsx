"use client";

import { useEffect } from "react";

function estimateSyllables(word: string) {
  const clean = word.toLocaleLowerCase("en-GB").replace(/[^a-z]/g, "");
  if (!clean) return 1;
  if (clean.length <= 3) return 1;

  const withoutSilentE = clean.replace(/e$/, "");
  const groups = withoutSilentE.match(/[aeiouy]+/g)?.length ?? 1;
  return Math.max(1, Math.min(6, groups));
}

function syllablesFor(card: Element, heading: HTMLElement) {
  const label = card.querySelector(
    ".sound-guide-heading span, .practice-sound-guide > div:first-child span",
  )?.textContent;
  const parsed = label?.match(/(\d+)\s+syllable/i)?.[1];
  const count = parsed ? Number.parseInt(parsed, 10) : estimateSyllables(heading.textContent ?? "");
  return Math.max(1, Math.min(6, Number.isFinite(count) ? count : 1));
}

export function WordMotionController() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const sayButton = target.closest(
        ".reading-side .word-actions .tactile-button.dark, .practice-card .practice-help-actions button:first-child",
      );
      if (!sayButton) return;

      const card = sayButton.closest(".selected-word-card, .practice-card");
      if (!card) return;

      const heading = card.querySelector<HTMLElement>("h2, h1");
      if (!heading) return;

      const syllables = syllablesFor(card, heading);
      const visualSyllables = Math.min(5, syllables);
      const duration = Math.min(3100, 850 + syllables * 320);
      const runId = `${Date.now()}-${Math.random()}`;

      heading.dataset.buddySyllables = String(visualSyllables);
      heading.dataset.buddyMotionRun = runId;
      heading.style.setProperty("--buddy-say-duration", `${duration}ms`);
      heading.classList.remove("buddy-say-active");

      // Restart the same animation cleanly if Say it is pressed twice.
      void heading.offsetWidth;
      heading.classList.add("buddy-say-active");

      window.setTimeout(() => {
        if (heading.dataset.buddyMotionRun === runId) {
          heading.classList.remove("buddy-say-active");
          delete heading.dataset.buddyMotionRun;
        }
      }, duration + 80);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
