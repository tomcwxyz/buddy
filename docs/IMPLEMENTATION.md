# Buddy — Implementation notes

## Current alpha

Buddy treats visual language, verbal language, learning memory and multi-surface behaviour as core architecture rather than later product polish.

### Runtime primitives

- `lib/buddy-design.ts` — cross-surface colour, motion, touch and radius tokens.
- `lib/buddy-language.ts` — child-facing vocabulary and language constraints.
- `components/BuddyPresence.tsx` — abstract idle/listening/thinking/speaking presence.
- `components/BottomNav.tsx` — deliberately small child navigation.
- `components/ReadingCompanion.tsx` — first end-to-end reading interaction.

### Reading pipeline

The alpha now supports:

1. environment-facing camera capture;
2. a frozen page image;
3. local browser OCR using Tesseract.js;
4. word bounding boxes rendered as tappable regions over the captured page;
5. deterministic literacy support for a small curated vocabulary;
6. browser text-to-speech for hearing a word;
7. press-and-hold browser speech recognition for simple voice requests;
8. local learning events recording the interaction rather than a score;
9. `Words we've met` derived from those events.

Page images are not uploaded by Buddy in this alpha. OCR runs in the browser. Tesseract language/wasm resources may still be downloaded by the OCR library at runtime.

### Literacy boundary

`lib/literacy/engine.ts` deliberately avoids pretending an LLM or heuristic can safely invent phonics guidance for every OCR word.

- Curated words can have checked chunks, clues, meanings and examples.
- Unknown words can still be spoken.
- Unknown words do **not** receive invented chunking or definitions.

This interface should later sit in front of a properly validated literacy/lexical data source.

### Learning Map alpha

`lib/learning/local-store.ts` stores a capped local event stream in browser storage.

Current events include:

- word selected;
- help depth changed;
- word heard;
- meaning requested;
- voice request;
- moved on.

The store is intentionally not framed as errors or correctness. It is enough to begin learning which supports are requested and which words recur without introducing accounts or cloud child profiles yet.

### Surfaces

- `/` — calm action-first home.
- `/read` — live camera/OCR Read with me loop.
- `/words` — Words we've met from the local Learning Map.
- `/me` — child-visible learning memory concept.
- `/discover` — early Brain Quest surface.
- `/help` — general voice/vision help entry.

## Architectural rules

1. Copy used by multiple surfaces belongs in `lib/buddy-language.ts`, not device-specific components.
2. Shared visual meaning belongs in `lib/buddy-design.ts` and CSS custom properties.
3. Device implementations may change layout radically while preserving language, states and semantic design tokens.
4. Buddy has four initial semantic presence states: idle, listening, thinking and speaking.
5. Do not add success/failure colour semantics.
6. Do not add points, streaks, levels, badges or automatic praise mechanics.
7. Child-facing learning inferences must be tentative and rejectable.
8. Accessibility choices are preferences, not a single “dyslexia mode”.
9. Raw page imagery should remain ephemeral unless a future use case clearly requires storage and the child/parent model supports it.
10. Literacy guidance must identify whether it comes from validated/curated data or a fallback; do not hallucinate phonics guidance.

## Known alpha constraints

- Local OCR will be slower on first use because the browser needs to load the OCR engine and English language data.
- OCR accuracy depends heavily on lighting, framing, page curvature and text size.
- Browser speech recognition support varies by browser and operating system.
- Curated literacy support is deliberately tiny at this stage.
- The Learning Map is device-local and is not yet synchronised.
- Voice requests are intent-matched locally; there is not yet a general conversational model behind them.

## Next implementation slice

1. validate the camera/OCR/word-select loop on an actual phone and tablet;
2. add image crop/deskew and clearer OCR confidence behaviour;
3. introduce a proper lexical/pronunciation data adapter behind `lib/literacy`;
4. add a provider-neutral companion agent interface with strict child-safe tool capabilities;
5. upgrade voice to streamed audio/transcription where browser speech recognition is unreliable;
6. make `/me` read explicit, rejectable patterns from the Learning Map;
7. define local child profile versus parent/admin identity boundaries;
8. define the R1/Android adapter contract using the same `idle/listening/thinking/speaking` semantics and help-depth control.

Do not build a parent dashboard, full account system or gamification before the core reading interaction has been tested with a child.
