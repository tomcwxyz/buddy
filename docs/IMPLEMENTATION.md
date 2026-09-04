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
- `lib/literacy/grapheme-phoneme.ts` — aligns spelling to already-resolved pronunciation data before Buddy offers sound-pattern guidance.
- `lib/ai/word-explainer.ts` — optional, tightly scoped model fallback for lexical explanations.
- `lib/literacy/eval-cases.ts` + `/lab/words` — internal lexical/sound evaluation harness.

### Reading pipeline

The alpha now supports:

1. environment-facing camera capture;
2. a frozen page image;
3. local browser OCR using Tesseract.js;
4. word bounding boxes rendered as tappable regions over the captured page;
5. a targeted second OCR pass when a user taps a word the full-page pass missed;
6. broad lexical/pronunciation lookup using Datamuse and DictionaryAPI.dev;
7. context-sensitive sense selection using nearby OCR text;
8. pronunciation-aware grapheme/phoneme alignment before sound clues are shown;
9. browser text-to-speech for the word, reading line and example sentences;
10. press-and-hold browser speech recognition for simple voice requests;
11. an uncertainty/correction state for text that does not look like a recognised English word;
12. local learning events recorded only after a selected OCR word is lexically recognised;
13. `Words we've met` and a three-word Practice loop derived from those events.

Page images are not uploaded by Buddy in this alpha. OCR runs in the browser. Tesseract language/wasm resources may still be downloaded by the OCR library at runtime.

### Literacy and lexical boundary

Buddy uses a layered resolver rather than asking a general model to invent literacy guidance.

1. **Curated literacy data** wins when a word has deliberately checked chunks, spelling guidance or examples.
2. **Datamuse / DictionaryAPI.dev** provide broad English vocabulary, definitions, pronunciation data and syllable metadata.
3. **`lib/literacy/grapheme-phoneme.ts`** attempts to account for the known pronunciation using the actual spelling. It does not predict the word's pronunciation; it only explains pronunciation data already obtained from a lexical source.
4. **`lib/literacy/sound-map.ts`** exposes child-friendly observations only when the spelling/pronunciation alignment supports them. If an IPA-backed word cannot be explained safely by the current alignment table, Buddy calls the spelling irregular and recommends hearing the whole word rather than guessing.
5. **Browser speech synthesis** remains the primary audible pronunciation path.
6. **Optional model fallback** is reserved for missing or overly complex meanings/examples. It is not the canonical source for phonics or pronunciation.

This matters for words such as `choir`, `colonel`, `yacht` and `ough` words: a visible letter pattern is not enough evidence for Buddy to claim a sound rule.

The UI should prefer simple phrases such as “How it sounds”, “Here it means…” and “Another example…” rather than exposing linguistic notation by default. IPA is retained internally as pronunciation metadata and evidence for sound alignment.

### Unknown words and OCR guardrail

Broad word coverage must not turn OCR noise into invented vocabulary.

The word resolver now distinguishes an **exact lexical match** from a merely similar Datamuse result. If neither lexical source recognises the selected spelling:

- the model fallback is not called;
- no definition is invented;
- the text is not added to the Learning Map;
- Buddy says it may have read the word incorrectly;
- a close spelling suggestion can be offered when edit distance makes that suggestion plausible;
- the child can accept the correction or tap the printed word again.

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

### British English pronunciation direction

Buddy should be UK-first rather than silently treating an American pronunciation dictionary as canonical.

A promising high-confidence common-word layer is **Britfone**, an MIT-licensed British English pronunciation dictionary with 16,000+ entries and IPA/stress data. The intended architecture is:

1. British-English lexical pronunciation override for common words;
2. broad dictionary/Datamuse pronunciation coverage underneath it;
3. browser `en-GB` speech for audible output;
4. grapheme/phoneme alignment for child-facing spelling guidance;
5. cautious fallback for words whose spelling cannot be safely explained.

Do not reduce Buddy to the 16k-word British dictionary: it should be an override/evidence layer, not the complete vocabulary.

### Internal word lab

`/lab/words` is deliberately not linked from the child navigation. It contains fixed evaluation cases covering:

- context-dependent senses (`bank`, `bark`, `bat`);
- irregular spelling (`through`, `enough`, `choir`, `yacht`, `colonel`);
- useful patterns (`photograph`, `station`);
- long/technical words (`extraordinary`, `photosynthesis`);
- less common words (`onomatopoeia`, `serendipity`);
- an OCR-like nonsense spelling that should remain uncertain.

Each case exposes the returned meaning, example, sound guidance, recognition state, suggested spelling, source, meaning confidence, pronunciation-alignment status and whether a model was used. This is an internal evaluation surface, not a child score.

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
- `/lab/words` — internal lexical/pronunciation evaluation only.

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
13. Unrecognised OCR strings must not enter the Learning Map or trigger generated definitions.

## Known alpha constraints

- Local OCR will be slower on first use because the browser needs to load the OCR engine and English language data.
- OCR accuracy depends heavily on lighting, framing, page curvature and text size.
- Browser speech recognition support varies by browser and operating system.
- Grapheme/phoneme alignment is an alpha explanatory layer, not yet a complete validated structured-literacy engine.
- Current broad pronunciation sources are not consistently British-English; the British override layer is the next pronunciation-data improvement.
- Dictionary definitions can still be too adult or formal; the optional model fallback can simplify some of these when explicitly enabled.
- The Learning Map is device-local and is not yet synchronised.
- Voice requests are intent-matched locally; there is not yet a general conversational model behind them.

## Next implementation slice

1. run and review the `/lab/words` cases, adding regression cases whenever real reading exposes a poor explanation;
2. add the British-English pronunciation override layer and measure its coverage across the lab/common vocabulary;
3. evolve grapheme/phoneme alignment against validated structured-literacy mappings rather than expanding rules ad hoc;
4. improve image crop/deskew and OCR confidence behaviour;
5. add a provider-neutral companion agent interface with strict child-safe tool capabilities;
6. upgrade voice where browser speech recognition is unreliable;
7. make `/me` read explicit, rejectable patterns from the Learning Map;
8. define local child profile versus parent/admin identity boundaries;
9. define the R1/Android adapter contract using the same `idle/listening/thinking/speaking` semantics and help-depth control.

Do not build a parent dashboard, full account system or gamification before the core reading interaction has been tested with a child.
