# Buddy lexical corpus architecture

Buddy should understand common reading vocabulary without requiring a live call to several third-party services, but it should also retain broad long-tail coverage. The lexical layer therefore uses a **local-first, fallback-later** architecture.

## Resolution path

For a selected printed word:

1. normalise the printed token;
2. analyse likely grammatical form and lemma;
3. look for the printed form in the versioned local `en-GB` corpus;
4. resolve British-English pronunciation from the reviewed core first, then the full Britfone runtime index when the pronunciation is unambiguous;
5. resolve a local lemma entry when the printed form points to one;
6. rank local and fallback senses using part of speech, context, sense order and quality rules;
7. call Wiktionary, DictionaryAPI.dev and Datamuse only when the local lexical entry is missing or incomplete;
8. use the optional model only as a deliberately requested simplification/disambiguation layer.

This keeps **meaning** and **pronunciation** separable. `sold` can get its meaning from the local `sell` entry while its pronunciation and spelling guidance remain attached to the printed form `sold`.

## Runtime corpus

The reviewed lexical seed is `data/lexicon/core.en-GB.v1.json`.

It is intentionally small and reviewed rather than pretending to be the finished dictionary. It contains the regression vocabulary that has already exposed important failure modes, including:

- ambiguous senses: `bank`, `bark`, `bat`, `record`;
- irregular forms: `sold`, `went`, `made`;
- regular inflections that still need lemma resolution: `running`, `stories`;
- irregular spelling/pronunciation: `through`, `enough`, `choir`, `yacht`, `colonel`;
- longer and specialist reading vocabulary used by the word lab.

Each reviewed entry can contain:

- one or more child-friendly senses;
- an optional headword/lemma link;
- one or more pronunciations;
- part-of-speech-specific pronunciation where required.

## British-English pronunciation

The British pronunciation layer is pinned to **Britfone 3.0.1**. Britfone is MIT licensed and contains 16,000+ British English entries with IPA and stress data.

Buddy treats Britfone as pronunciation evidence, not as the entire lexical dictionary. Definitions and child-facing explanations remain separate.

The runtime now has two pronunciation tiers:

1. **Reviewed core pronunciation** — deliberately checked entries in Buddy's corpus, including part-of-speech-specific choices such as noun/verb `record`.
2. **Full Britfone runtime** — the complete packaged Britfone 3.0.1 dictionary, parsed lazily on the server and cached in memory for the life of the function instance.

For unreviewed words, Buddy only treats the broad Britfone pronunciation as canonical when the headword has one unambiguous pronunciation. If Britfone contains multiple variants and Buddy has no reviewed/context-labelled mapping between them, it does not guess which IPA belongs to the current sense; the wider lexical providers remain available to resolve that case.

This keeps the broad pronunciation layer safe enough for sound guidance while preserving coverage information for the evaluation harness.

`scripts/lexicon/import-britfone.mjs` remains available for reproducible corpus work and future on-device/static-pack generation.

## Offline semantics

`lookupLexicalWord` reports local corpus and Britfone coverage in its metadata.

A word is **fully local** when the resolver has:

- a local meaning route: either senses for the selected word or a local lemma/headword link; and
- a resolved local British pronunciation for the printed surface form.

When those conditions are met, no network lexical request is made. If the meaning route is absent, remote lexical providers are still queried even when Britfone already supplies pronunciation. That distinction is deliberate: pronunciation evidence alone must never turn an OCR token into a recognised lexical word.

The internal `/lab/words` surface shows:

- local meaning coverage;
- full Britfone headword coverage;
- resolved British pronunciation coverage;
- ambiguous Britfone variants that still need sense/POS resolution;
- how many cases are fully local;
- whether a network lexical fallback was needed;
- the corpus version used for each result.

## OCR/recognition guardrail

Broad pronunciation coverage must not weaken Buddy's unknown-word behaviour.

A Britfone pronunciation hit is **not sufficient lexical recognition by itself**. `recognisedWord` still requires one of:

- a reviewed Buddy lexical entry;
- an exact DictionaryAPI.dev or Wiktionary entry;
- actual definition evidence from Datamuse;
- or the explicitly enabled constrained model path where that product decision is appropriate.

This means a pronunciation dictionary can improve how known words sound without allowing OCR-like nonsense to enter the Learning Map.

## Corpus versioning

The runtime corpus is evidence, not mutable application state.

Rules:

1. Existing corpus versions are immutable once shipped.
2. Reviewed meaning/pronunciation changes create a new version.
3. Imported data retains upstream source, version and licence metadata.
4. Local reviewed evidence outranks generic remote provider evidence.
5. A new regression case should accompany every important real-world lexical failure.
6. Unknown OCR text must stay unknown; corpus growth must not weaken exact-match recognition.
7. The child-facing UI should not expose corpus internals unless source attribution is actually useful.

## Scaling beyond the seed corpus

The target is not a giant hand-maintained JSON file. The production path is:

1. ingest pinned open lexical/pronunciation sources into a normalised build representation;
2. run deterministic validation and regression cases;
3. keep the server runtime compact and lazy while avoiding repeated live-provider calls for common evidence;
4. produce versioned read-only shards or packs for browser/offline Android/R1 surfaces;
5. keep external providers as refresh and long-tail fallback sources;
6. eventually distribute the same corpus package to Android/R1 surfaces so pronunciation and lexical behaviour are consistent across devices.

The next major corpus step is broader **meaning and frequency/commonness data** so common senses can also resolve locally rather than depending on provider ordering, while retaining context as the strongest signal.
