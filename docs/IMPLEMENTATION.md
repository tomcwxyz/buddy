# Buddy — Implementation notes

## Current alpha

Buddy treats visual language, verbal language, learning memory and multi-surface behaviour as core architecture rather than later product polish.

### Runtime primitives

- `lib/buddy-design.ts` — cross-surface colour, motion, touch and radius tokens.
- `lib/buddy-language.ts` — child-facing vocabulary and language constraints.
- `components/BuddyPresence.tsx` — abstract idle/listening/thinking/speaking presence.
- `components/BottomNav.tsx` — deliberately small child navigation.
- `components/ReadingCompanion.tsx` — end-to-end reading interaction.
- `lib/literacy/sound-map.ts` — child-friendly spelling/sound observations.
- `lib/ai/word-explainer.ts` — optional, tightly scoped model fallback for lexical explanations.

### Reading pipeline

The alpha now supports:

1. environment-facing camera capture;
2. a frozen page image;
3. local browser OCR using Tesseract.js;
4. word bounding boxes rendered as tappable regions over the captured page;
5. a targeted second OCR pass when a user taps a word the full-page pass missed;
6. broad lexical/pronunciation lookup using Datamuse and DictionaryAPI.dev;
7. deterministic child-friendly sound/spelling guidance;
8. context-sensitive sense selection using nearby OCR text;
9. browser text-to-speech for the word, reading line and example sentences;
10. press-and-hold browser speech recognition for simple voice requests;
11. local learning events recording the interaction rather than a score;
12. `Words we've met` and a three-word Practice loop derived from those events.

Page images are not uploaded by Buddy in this alpha. OCR runs in the browser. Tesseract language/wasm resources may still be downloaded by the OCR library at runtime.

### Literacy and lexical boundary

Buddy uses a layered resolver rather than asking a general model to invent literacy guidance.

1. **Curated literacy data** wins when a word has deliberately checked chunks, spelling guidance or examples.
2. **Datamuse / DictionaryAPI.dev** provide broad English vocabulary, definitions, pronunciation data and syllable metadata.
3. **`lib/literacy/sound-map.ts`** turns known spelling patterns into cautious child-facing observations. It does not claim that every spelling pattern has one fixed sound.
4. **Browser speech synthesis** remains the primary audible pronunciation path.
5. **Optional model fallback** is reserved for missing or overly complex meanings/examples. It is not the canonical source for phonics or pronunciation.

The UI should prefer simple phrases such as “How it sounds”, “Here it means…” and “Another example…” rather than exposing linguistic notation by default. IPA may be retained internally as useful pronunciation metadata.

### Optional model fallback

`lib/ai/word-explainer.ts` implements a deliberately narrow fallback using the OpenAI Responses API and structured JSON output.

The model receives only:

- the selected word;
- a short, minimised nearby lexical window with obvious proper-name-shaped tokens redacted;
- an existing dictionary meaning when one exists;
- part of speech when available.

It does **not** receive:

- the page image;
- the full OCR page;
- audio;
- account/profile data;
- Learning Map history;
- child voice transcripts.

The response schema is restricted to a short meaning, one example sentence and a coarse confidence value. Requests use `store: false` and do not create conversation state.

The fallback is disabled unless both are present:

```env
BUDDY_MODEL_FALLBACK_ENABLED=true
OPENAI_API_KEY=...
```

`BUDDY_EXPLAIN_MODEL` may override the default model. See `.env.example`.

For child-facing deployments, enabling a model is a privacy/safety deployment decision rather than just a technical switch. The product must use appropriate data-retention, child-safety and consent controls before sending child-related personal data to a third-party model service.

### Learning Map alpha

`lib/learning/local-store.ts` stores a capped local event stream in browser storage.

Current events include:

- word selected;
- help depth changed;
- word heard;
- reading line heard;
- meaning requested;
- voice request;
- moved on;
- practice seen;
- practice known.

The store is intentionally not framed as errors or correctness. It is enough to begin learning which supports are requested and which words recur without introducing accounts or cloud child profiles yet.

### Surfaces

- `/` — calm action-first home.
- `/read` — live camera/OCR Read with me loop.
- `/practice` — three encountered words, one at a time, with child-selected support.
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
10. Pronunciation/phonics guidance must come from curated or deterministic linguistic data, not unconstrained generation.
11. Model calls should be narrow, inspectable, provider-swappable and minimised for both privacy and cost.
12. If Buddy is uncertain about a lexical explanation, uncertainty must remain represented rather than silently becoming certainty.

## Known alpha constraints

- Local OCR will be slower on first use because the browser needs to load the OCR engine and English language data.
- OCR accuracy depends heavily on lighting, framing, page curvature and text size.
- Browser speech recognition support varies by browser and operating system.
- Sound guidance is pattern-aware but is not yet a complete grapheme-to-phoneme engine.
- Dictionary definitions can still be too adult or formal; the optional model fallback can simplify some of these when explicitly enabled.
- The Learning Map is device-local and is not yet synchronised.
- Voice requests are intent-matched locally; there is not yet a general conversational model behind them.

## Next implementation slice

1. build a small lexical evaluation set covering common, irregular, ambiguous, morphologically complex and rare English words;
2. evaluate whether context chooses the correct sense and whether explanations stay child-simple;
3. improve sound mapping towards a validated grapheme/phoneme representation rather than an ever-growing pile of string rules;
4. improve image crop/deskew and OCR confidence behaviour;
5. add a provider-neutral companion agent interface with strict child-safe tool capabilities;
6. upgrade voice where browser speech recognition is unreliable;
7. make `/me` read explicit, rejectable patterns from the Learning Map;
8. define local child profile versus parent/admin identity boundaries;
9. define the R1/Android adapter contract using the same `idle/listening/thinking/speaking` semantics and help-depth control.

Do not build a parent dashboard, full account system or gamification before the core reading interaction has been tested with a child.
