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
- `lib/literacy/britfone.ts` — lazy server-side index over the full Britfone 3.0.1 British pronunciation dictionary.
- `lib/literacy/wordnet.ts` — local Princeton WordNet 3.1 semantic resolver using exact index lookup and byte-offset data reads.
- `lib/literacy/local-corpus.ts` — reviewed `en-GB` lexical evidence plus British pronunciation resolution.
- `lib/literacy/lexical-providers.ts` — local-first resolver with remote long-tail fallbacks.
- `lib/literacy/lexicon.ts` — candidate normalisation, contextual sense ranking and source attribution.
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
7. reviewed Buddy meaning and morphology evidence;
8. deliberately child-simple Buddy-curated literacy meanings;
9. broad local Princeton WordNet semantics and sense-order priors;
10. local British pronunciation from reviewed data and the full Britfone runtime;
11. remote Wiktionary, DictionaryAPI.dev and Datamuse only when local evidence is incomplete;
12. context-sensitive sense selection using nearby OCR text, part of speech, lemma evidence, source quality and weak sense-order priors;
13. pronunciation-aware grapheme/phoneme alignment before sound clues are shown;
14. browser text-to-speech for the word, reading line and example sentences;
15. press-and-hold browser speech recognition for simple voice requests;
16. an uncertainty/correction state for text that does not look like a recognised English word;
17. local learning events recorded only after a selected OCR word is lexically recognised;
18. `Words we've met` and a three-word Practice loop derived from those events.

Page images are not uploaded by Buddy in this alpha. OCR runs in the browser. Tesseract language/wasm resources may still be downloaded by the OCR library at runtime.

## Literacy and lexical boundary

Buddy uses a layered resolver rather than asking a general model to invent literacy guidance.

1. **Reviewed Buddy evidence** wins for important child-facing definitions, morphology links, contextual senses and pronunciation choices.
2. **Buddy-curated literacy support** supplies deliberately simple meanings and reading clues for selected words such as `because`, `through`, `enough`, `friend` and `people`.
3. **Princeton WordNet 3.1** supplies broad local semantic coverage for content words. Its index sense order is kept as a weak commonness prior, not as absolute truth.
4. **Britfone 3.0.1** supplies broad British-English IPA/stress evidence for 16,000+ headwords without putting the whole pronunciation dictionary into the browser bundle.
5. **Morphology/lemma resolution** lets the printed form and lexical headword stay separate. `sold` can obtain meaning from `sell` while sound guidance remains attached to the printed word.
6. **Wiktionary / DictionaryAPI.dev / Datamuse** fill true long-tail and incomplete-evidence gaps.
7. **Grapheme/phoneme alignment** explains pronunciation data already obtained from lexical evidence; it does not predict canonical pronunciation from spelling alone.
8. **Optional model fallback** is reserved for missing or overly complex meanings/examples and is not canonical phonics/pronunciation authority.

WordNet is deliberately treated as broad **semantic evidence**, not automatically child-friendly copy. A technically correct WordNet gloss can still be too adult, abstract or contextually wrong for Buddy. Real failures should therefore become regression cases and, where appropriate, reviewed Buddy meanings.

Function words are a known gap in WordNet-style semantic databases. Buddy's curated/common-word layer remains important for conjunctions, determiners, prepositions and other reading vocabulary that children meet constantly.

The UI should prefer simple phrases such as “How it sounds”, “Here it means…” and “Another example…” rather than exposing linguistic notation by default. IPA is retained internally as pronunciation metadata and evidence for sound alignment.

## Local semantic runtime

The reviewed lexical seed is `data/lexicon/core.en-GB.v1.json`. It remains deliberately small and reviewable.

The broader semantic layer uses the packaged `wordnet-db` WordNet 3.1 files server-side. `lib/literacy/wordnet.ts`:

- keeps the database out of the browser/client bundle;
- loads each POS index lazily and caches it;
- binary-searches exact headwords in `index.noun`, `index.verb`, `index.adj` and `index.adv`;
- reads only required synset lines from the corresponding data file by byte offset;
- caches a bounded number of data lines;
- returns up to five candidate senses per part of speech;
- preserves WordNet's sense ordering as weak local frequency/commonness evidence;
- fails open to the reviewed/remote resolver if the runtime asset is unavailable.

A local semantic hit counts as lexical evidence. A Britfone pronunciation hit by itself does not.

## British-English pronunciation layer

Buddy is UK-first rather than silently treating an American pronunciation dictionary as canonical.

The pronunciation evidence is pinned to **Britfone 3.0.1**. The runtime architecture is:

1. reviewed local British-English pronunciation for important/context-sensitive words;
2. the full packaged Britfone dictionary, parsed lazily on the server and cached for the function instance;
3. remote dictionary pronunciation only when local British pronunciation cannot be resolved safely;
4. browser `en-GB` speech for audible output;
5. grapheme/phoneme alignment for child-facing spelling guidance;
6. cautious fallback for words whose spelling cannot be safely explained.

Some Britfone headwords have multiple pronunciations but no part-of-speech label tying each numbered variant to a sense. Buddy does not blindly choose variant 1. Reviewed entries such as noun/verb `record` resolve the variant explicitly; unreviewed multi-variant words remain unresolved until there is safe evidence.

## Local versus network resolution

A selected word can avoid network lexical calls when Buddy has:

- a local meaning route from reviewed Buddy evidence, Buddy-curated support, WordNet, or a reviewed lemma/headword link; and
- resolved local British pronunciation for the printed surface form.

If meaning is local but pronunciation remains ambiguous, Buddy may still use remote pronunciation evidence. If pronunciation is local but semantic evidence is absent, Buddy still requires a definition-bearing lexical source before recognising the token.

The API exposes:

- reviewed surface/lemma meaning hits;
- Buddy-curated meaning hits;
- WordNet availability/version, exact hits and sense counts;
- Britfone runtime size, headword hits and variant counts;
- resolved British pronunciation status;
- whether live lexical fallback was required.

`/lab/words` turns these into coverage counters and per-case diagnostics.

## Unknown words and OCR guardrail

Broad word coverage must not turn OCR noise into invented vocabulary.

Recognition may come from reviewed Buddy lexical evidence, Buddy-curated meanings, exact WordNet semantic entries or exact definition-bearing fallback providers. Pronunciation evidence alone is insufficient.

If no lexical source recognises the selected spelling:

- the model fallback is not called automatically;
- no definition is invented;
- the text is not added to the Learning Map;
- Buddy says it may have read the word incorrectly;
- a close spelling suggestion can be offered when edit distance makes that suggestion plausible;
- the child can accept the correction or tap the printed word again.

## Optional model fallback

`lib/ai/word-explainer.ts` implements a deliberately narrow fallback using the OpenAI Responses API and structured JSON output.

The model receives only the selected word, a short minimised nearby lexical window, existing lexical meaning/POS evidence, and lemma/form evidence. It does **not** receive page images, the full OCR page, audio, account/profile data, Learning Map history or child voice transcripts.

The fallback remains disabled unless explicitly configured:

```env
BUDDY_MODEL_FALLBACK_ENABLED=true
OPENAI_API_KEY=...
```

For child-facing deployments, enabling a model is a privacy/safety deployment decision rather than just a technical switch.

## Internal word lab

`/lab/words` is deliberately not linked from child navigation. It currently covers:

- context-dependent senses (`bank`, `bark`, `bat`, noun/verb `record`);
- morphology (`sold`, `went`, `made`, `running`, `stories`);
- broad local semantics (`rainbow`, `planet`);
- child-friendly curated meaning precedence (`because`);
- broad British pronunciation and variant ambiguity;
- irregular spelling (`through`, `enough`, `choir`, `yacht`, `colonel`);
- useful patterns (`photograph`, `station`);
- long/technical and less-common words;
- an OCR-like nonsense spelling that should remain uncertain.

The word lab is an engineering/evaluation surface, not a child score.

## Learning Map alpha

`lib/learning/local-store.ts` stores a capped local event stream in browser storage. Events describe support requested and words encountered rather than mistakes or correctness. The Learning Map remains device-local and child-visible/rejectable by design.

## Architectural rules

1. Copy used by multiple surfaces belongs in `lib/buddy-language.ts`, not device-specific components.
2. Shared visual meaning belongs in `lib/buddy-design.ts` and CSS custom properties.
3. Device implementations may change layout radically while preserving language, states and semantic design tokens.
4. Do not add success/failure colour semantics, points, streaks, levels or badges.
5. Child-facing learning inferences must be tentative and rejectable.
6. Accessibility choices are preferences, not a single “dyslexia mode”.
7. Raw page imagery should remain ephemeral unless a future use case clearly requires storage and the child/parent model supports it.
8. Pronunciation/phonics guidance must come from curated or deterministic linguistic data, not unconstrained generation.
9. Model calls should be narrow, inspectable, provider-swappable and minimised for privacy and cost.
10. If Buddy is uncertain about a lexical explanation, uncertainty must remain represented rather than silently becoming certainty.
11. Unrecognised OCR strings must not enter the Learning Map or trigger generated definitions.
12. Local/open lexical data is versioned evidence and source/licence metadata travels with it.
13. Reviewed Buddy evidence may override generic local or live-provider evidence.

## Known alpha constraints

- OCR accuracy depends heavily on lighting, framing, page curvature and text size.
- Browser speech recognition support varies by browser and operating system.
- Grapheme/phoneme alignment is an alpha explanatory layer, not yet a complete validated structured-literacy engine.
- WordNet's breadth is useful, but many glosses are not yet ideal child-facing explanations and function-word coverage is limited.
- Multi-pronunciation words still need reviewed/context-aware mappings.
- Long-tail meanings can still depend on network providers.
- The optional model fallback is privacy-gated and not pronunciation authority.
- The Learning Map is device-local and is not yet synchronised.

## Next implementation slice

1. run and review `/lab/words`, adding permanent regression cases whenever real reading exposes a poor explanation;
2. add a high-frequency/common-word evaluation set and measure local semantic, pronunciation and network-fallback coverage;
3. promote common WordNet glosses that are wrong/too adult into reviewed child-friendly Buddy evidence;
4. add reviewed/context-aware mappings for common Britfone multi-pronunciation/heteronym words;
5. evolve grapheme/phoneme alignment against validated structured-literacy mappings;
6. improve image crop/deskew and OCR confidence behaviour;
7. add a provider-neutral companion agent interface with strict child-safe tool capabilities;
8. define child/profile/privacy boundaries before cloud synchronisation;
9. define the R1/Android adapter contract using the same Buddy semantics.

Do not build a parent dashboard, full account system or gamification before the core reading interaction has been tested with a child.
