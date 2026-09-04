# Buddy Word Library v2

The word library is a product primitive, not a dictionary widget. Read, Practice, My words, clues, voice and future device surfaces should all resolve a word through the same lexical contract.

## Why this exists

A printed token is not necessarily a dictionary headword. `sold` in a sentence is usually a grammatical form of `sell`; looking up only the surface string can surface the rare noun meaning “salary” instead of the ordinary verb sense.

Buddy therefore resolves:

> printed form → morphology / lemma → contextual part of speech → candidate senses → simple meaning → pronunciation-aware sound guidance

Pronunciation stays attached to the **printed form**. Meaning may come from a **lemma sense**. This distinction is important: `sold` should use the meaning of the relevant sense of `sell`, while its sound and spelling help must still describe `sold`.

## Runtime components

- `lib/literacy/morphology.ts` — common irregular forms, cautious regular suffix analysis and contextual hints.
- `lib/literacy/lexical-providers.ts` — provider adapters and normalised lookup bundles.
- `lib/literacy/lexicon.ts` — sense candidates, inflection parsing, contextual ranking, definition clean-up and attribution metadata.
- `app/api/word/route.ts` — orchestration only: surface lookup, lemma resolution, optional lemma lookup, sense choice, sound analysis and narrow model refinement.
- `lib/literacy/sound-map.ts` — pronunciation-aware child-facing sound observations.
- `lib/ai/word-explainer.ts` — optional simplification/disambiguation after lexical evidence has been resolved.
- `lib/literacy/eval-cases.ts` + `/lab/words` — regression harness.

## Provider order

No single source is treated as the whole word library.

### English Wiktionary

Used for broad definitions, parts of speech and inflection evidence. The runtime adapter uses the structured English definition endpoint and strips presentation HTML before candidate ranking.

Wiktionary-derived text is CC BY-SA. Resolver responses include attribution metadata when the chosen sense comes from Wiktionary. Any surface that presents copied/adapted Wiktionary text should preserve appropriate source/licence attribution.

### DictionaryAPI.dev

Used for broad definitions, examples, IPA and pronunciation audio where available.

### Datamuse

Used for exact lexical evidence, definitions, syllable counts, pronunciation metadata, headword evidence and cautious spelling suggestions.

### Buddy curated literacy data

Curated Buddy guidance remains the highest-confidence source for intentionally checked chunks, clues and child-facing literacy explanations. Broad lexical sources must not overwrite deliberately checked literacy guidance.

### Model refinement

A model may simplify an existing meaning or use nearby lexical context to choose/render a sense. It receives the selected word, a small redacted lexical context window, existing meaning, part of speech, lemma and grammatical form when known.

It is **not** a pronunciation dictionary and must not invent canonical phonics or grapheme/phoneme mappings.

## Morphology policy

Morphology is evidence, not certainty.

The resolver currently combines:

- a checked set of common irregular English forms;
- regular `-s`, `-es`, `-ies`, `-ed`, `-ied` and `-ing` candidates;
- nearby syntactic hints such as auxiliaries and determiners;
- inflection relationships exposed by lexical sources;
- Datamuse headword evidence.

Every morphology result includes a confidence value. Ambiguous homographs must remain test cases rather than being solved by adding increasingly aggressive suffix rules.

## Sense ranking

Candidate meanings are ranked using:

- contextual term overlap;
- morphology-backed part-of-speech agreement;
- whether the candidate belongs to the resolved lemma;
- source evidence;
- presence of a natural example;
- readable definition length;
- penalties for archaic/obsolete/historical senses;
- a penalty for meta-definitions such as “past tense of …” when a useful lemma meaning is available.

This ranking is deterministic. Optional model refinement happens afterwards.

## Recognition and OCR safety

Broad coverage must not turn OCR noise into vocabulary.

A selected spelling is recognised only when at least one lexical provider returns exact evidence, or the narrow model fallback recognises the word with adequate confidence when explicitly requested. Otherwise Buddy keeps the uncertainty state and may offer a close spelling suggestion.

Unknown OCR strings do not enter the Learning Map.

## Evaluation

`/lab/words` exposes the internal evidence used for every fixed case:

- meaning and example;
- part of speech;
- lemma and grammatical form;
- morphology confidence;
- source providers;
- recognition state;
- pronunciation and sound alignment;
- model use;
- attribution metadata.

The regression set now includes the real `sold` failure as well as contextual homographs, irregular verbs, regular inflections, technical words and OCR nonsense.

Every meaningful failure found while reading should become a permanent regression case before the resolver is changed.

## Production corpus direction

Runtime third-party lookup gives Buddy broad coverage quickly, but it is not the final production architecture. The next data step should be a **versioned, pre-indexed lexical corpus** generated offline from suitable open datasets (for example Wiktionary/Wiktextract-derived data plus British pronunciation data), with provider adapters retained for refresh and fallback.

The target shape should support hundreds of thousands of surface forms without bundling the whole corpus into the browser. A server-side indexed store should expose a small provider-neutral record containing:

- surface form;
- lemma(s);
- morphology;
- part(s) of speech;
- candidate senses;
- simple/checked meaning where available;
- examples;
- en-GB pronunciation evidence;
- syllables/stress;
- grapheme/phoneme evidence;
- provenance, licence and confidence.

Do not import a multi-gigabyte lexical dump into the Next.js bundle. Build an offline ingestion/indexing pipeline and ship/query only the compact records Buddy needs.

## Immediate next data work

1. Grow the regression set from dozens towards hundreds of representative cases.
2. Add the British-English pronunciation override/evidence layer and measure coverage.
3. Design the offline corpus ingestion format and indexes.
4. Add source/licence attribution presentation to child-facing surfaces in a quiet, non-disruptive way where required.
5. Test ambiguous inflected homographs (`left`, `thought`, `saw`, `felt`, `found`, `record`, `read`) explicitly before broadening morphology rules.
