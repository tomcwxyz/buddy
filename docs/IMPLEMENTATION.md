# Buddy — Implementation notes

## Current alpha

Buddy treats visual language, verbal language, learning memory and multi-surface behaviour as core architecture rather than later product polish.

### Runtime primitives

- `lib/buddy-design.ts` — cross-surface colour, motion, touch and radius tokens.
- `lib/buddy-language.ts` — child-facing vocabulary and language constraints.
- `components/BuddyPresence.tsx` — abstract idle/listening/thinking/speaking presence.
- `components/BottomNav.tsx` — deliberately small child navigation.
- `components/ReadingCompanion.tsx` — end-to-end reading interaction.
- `lib/literacy/morphology.ts` — resolves common inflected printed forms into likely lemmas and grammatical forms.
- `lib/literacy/local-corpus.ts` — versioned local `en-GB` lexical and pronunciation evidence.
- `lib/literacy/lexical-providers.ts` — local-first resolver with remote long-tail fallbacks.
- `lib/literacy/lexicon.ts` — candidate normalisation, sense ranking and source attribution.
- `lib/literacy/sound-map.ts` — child-friendly spelling/sound observations.
- `lib/literacy/grapheme-phoneme.ts` — aligns spelling to already-resolved pronunciation data before Buddy offers sound-pattern guidance.
- `lib/ai/word-explainer.ts` — optional, tightly scoped model fallback for lexical explanations.
- `lib/literacy/eval-cases.ts` + `/lab/words` — internal lexical, corpus and sound evaluation harness.

### Reading pipeline

The alpha now supports:

1. environment-facing camera capture;
2. a frozen page image;
3. local browser OCR using Tesseract.js;
4. word bounding boxes rendered as tappable regions over the captured page;
5. a targeted second OCR pass when a user taps a word the full-page pass missed;
6. morphology/lemma analysis for the printed word;
7. local `en-GB` lexical and British-English pronunciation lookup;
8. remote Wiktionary, DictionaryAPI.dev and Datamuse fallback when the local entry is missing or incomplete;
9. context-sensitive sense selection using nearby OCR text, part of speech, lemma evidence and weak dictionary-sense priors;
10. pronunciation-aware grapheme/phoneme alignment before sound clues are shown;
11. browser text-to-speech for the word, reading line and example sentences;
12. press-and-hold browser speech recognition for simple voice requests;
13. an uncertainty/correction state for text that does not look like a recognised English word;
14. local learning events recorded only after a selected OCR word is lexically recognised;
15. `Words we've met` and a three-word Practice loop derived from those events.

Page images are not uploaded by Buddy in this alpha. OCR runs in the browser. Tesseract language/wasm resources may still be downloaded by the OCR library at runtime.

### Literacy and lexical boundary

Buddy uses a layered resolver rather than asking a general model to invent literacy guidance.

1. **Curated literacy data** wins when a word has deliberately checked chunks, spelling guidance or examples.
2. **The versioned local corpus** supplies reviewed child-friendly meanings, lemma links and British pronunciation evidence for covered vocabulary.
3. **Morphology/lemma resolution** lets the printed form and lexical headword stay separate. For example, `sold` can obtain meaning from `sell` while sound guidance remains attached to the printed word.
4. **Wiktionary / DictionaryAPI.dev / Datamuse** provide long-tail vocabulary and fill gaps when the local corpus does not have a complete meaning/pronunciation route.
5. **`lib/literacy/grapheme-phoneme.ts`** attempts to account for the known pronunciation using the actual spelling. It does not predict the word's pronunciation; it only explains pronunciation data already obtained from lexical evidence.
6. **`lib/literacy/sound-map.ts`** exposes child-friendly observations only when the spelling/pronunciation alignment supports them. If an IPA-backed word cannot be explained safely by the current alignment table, Buddy calls the spelling irregular and recommends hearing the whole word rather than guessing.
7. **Browser speech synthesis** remains the primary audible pronunciation path.
8. **Optional model fallback** is reserved for missing or overly complex meanings/examples. It is not the canonical source for phonics or pronunciation.

This matters for words such as `choir`, `colonel`, `yacht` and `ough` words: a visible letter pattern is not enough evidence for Buddy to claim a sound rule.

The UI should prefer simple phrases such as “How it sounds”, “Here it means…” and “Another example…” rather than exposing linguistic notation by default. IPA is retained internally as pronunciation metadata and evidence for sound alignment.

### Local lexical corpus

The first runtime corpus is `data/lexicon/core.en-GB.v1.json`.

It is deliberately small and reviewed. Its purpose is to establish the production architecture and make important lexical regressions deterministic before promoting larger generated datasets. The current seed includes:

- context-sensitive words such as `bank`, `bark`, `bat` and noun/verb `record`;
- important inflected forms such as `sold → sell`, `went → go`, `made → make`, `running → run` and `stories → story`;
- irregular reading/pronunciation cases including `through`, `enough`, `choir`, `yacht` and `colonel`;
- longer vocabulary used in the evaluation set.

A local entry is considered **fully local** when Buddy has both:

- a local meaning route — a sense on the surface form or a local lemma/headword link; and
- local pronunciation for the printed surface form.

When both are present, `lookupLexicalWord` does not make network lexical requests. If either is missing, remote providers are queried and merged beneath local evidence.

The API exposes corpus version/coverage metadata to the internal evaluation surface. `/lab/words` reports local meaning coverage, British pronunciation coverage, fully local cases and network-fallback use.

See `docs/LEXICAL_CORPUS.md` for the full corpus architecture and versioning rules.

### Unknown words and OCR guardrail

Broad word coverage must not turn OCR noise into invented vocabulary.

The word resolver distinguishes an **exact lexical match** from a merely similar fallback result. If neither the local corpus nor fallback lexical evidence recognises the selected spelling:

- the model fallback is not called automatically;
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
- part of speech when available;
- lemma/form evidence where the resolver has it.

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

### British-English pronunciation layer

Buddy is UK-first rather than silently treating an American pronunciation dictionary as canonical.

The current core corpus uses **Britfone 3.0.1**, an MIT-licensed British English pronunciation dictionary with 16,000+ entries and IPA/stress data, as its pinned pronunciation evidence source.

The current architecture is:

1. reviewed local British-English pronunciation for covered runtime words;
2. broad dictionary/Datamuse pronunciation coverage underneath it when local pronunciation is absent;
3. browser `en-GB` speech for audible output;
4. grapheme/phoneme alignment for child-facing spelling guidance;
5. cautious fallback for words whose spelling cannot be safely explained.

`scripts/lexicon/import-britfone.mjs` can turn the pinned Britfone 3.0.1 source into a compact full pronunciation index. That generated 16k+ layer is **not yet loaded automatically at runtime**; the next data step is to ship it as sharded static data so a surface only loads the pronunciation slice it needs.

Buddy must not be reduced to the Britfone vocabulary: it is a pronunciation evidence layer, not the complete lexical dictionary.

### Internal word lab

`/lab/words` is deliberately not linked from the child navigation. It contains fixed evaluation cases covering:

- context-dependent senses (`bank`, `bark`, `bat`, noun/verb `record`);
- morphology (`sold`, `went`, `made`, `running`, `stories`);
- irregular spelling (`through`, `enough`, `choir`, `yacht`, `colonel`);
- useful patterns (`photograph`, `station`);
- long/technical words (`extraordinary`, `photosynthesis`);
- less common words (`onomatopoeia`, `serendipity`);
- an OCR-like nonsense spelling that should remain uncertain.

Each case exposes the returned meaning, example, word form, sound guidance, recognition state, source, meaning confidence, pronunciation-alignment status, model use, local corpus version/coverage and whether network lexical fallback was needed. This is an internal evaluation surface, not a child score.

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
- `/lab/words` — internal lexical/corpus/pronunciation evaluation only.

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
14. Local lexical data is versioned evidence; shipped corpus versions are immutable and source/licence metadata travels with imported data.
15. A reviewed local lexical/pronunciation entry may override generic live-provider evidence, but corpus growth must not weaken the unknown-word guardrail.

## Known alpha constraints

- Local OCR will be slower on first use because the browser needs to load the OCR engine and English language data.
- OCR accuracy depends heavily on lighting, framing, page curvature and text size.
- Browser speech recognition support varies by browser and operating system.
- Grapheme/phoneme alignment is an alpha explanatory layer, not yet a complete validated structured-literacy engine.
- The current runtime `en-GB` corpus is a small reviewed seed; the full Britfone pronunciation index is buildable but not yet sharded into runtime data.
- Long-tail lexical meanings can still depend on network providers, and their definitions can be too adult or formal.
- The optional model fallback can simplify some meanings when explicitly enabled, but it is not pronunciation/phonics authority.
- The Learning Map is device-local and is not yet synchronised.
- Voice requests are intent-matched locally; there is not yet a general conversational model behind them.

## Next implementation slice

1. run and review `/lab/words`, adding regression cases whenever real reading exposes a poor explanation;
2. promote the generated Britfone 3.0.1 index into sharded runtime pronunciation data and measure coverage;
3. ingest broader open lexical/frequency evidence into the versioned local corpus so common meanings and sense priors are local;
4. evolve grapheme/phoneme alignment against validated structured-literacy mappings rather than expanding rules ad hoc;
5. improve image crop/deskew and OCR confidence behaviour;
6. add a provider-neutral companion agent interface with strict child-safe tool capabilities;
7. upgrade voice where browser speech recognition is unreliable;
8. make `/me` read explicit, rejectable patterns from the Learning Map;
9. define local child profile versus parent/admin identity boundaries;
10. define the R1/Android adapter contract using the same `idle/listening/thinking/speaking` semantics and help-depth control.

Do not build a parent dashboard, full account system or gamification before the core reading interaction has been tested with a child.
