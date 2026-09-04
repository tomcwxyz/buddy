# Buddy lexical corpus architecture

Buddy should understand common reading vocabulary without requiring a live call to several third-party services, but it should also retain broad long-tail coverage. The lexical layer therefore uses a **local-first, fallback-later** architecture.

## Resolution path

For a selected printed word:

1. normalise the printed token;
2. analyse likely grammatical form and lemma;
3. look for the printed form in the versioned local `en-GB` corpus;
4. use local British-English pronunciation evidence when present;
5. resolve a local lemma entry when the printed form points to one;
6. rank local and fallback senses using part of speech, context, sense order and quality rules;
7. call Wiktionary, DictionaryAPI.dev and Datamuse only when the local entry is missing or incomplete;
8. use the optional model only as a deliberately requested simplification/disambiguation layer.

This keeps **meaning** and **pronunciation** separable. `sold` can get its meaning from the local `sell` entry while its pronunciation and spelling guidance remain attached to the printed form `sold`.

## Runtime corpus

The first runtime corpus is `data/lexicon/core.en-GB.v1.json`.

It is intentionally small and reviewed rather than pretending to be the finished dictionary. It contains the regression vocabulary that has already exposed important failure modes, including:

- ambiguous senses: `bank`, `bark`, `bat`, `record`;
- irregular forms: `sold`, `went`, `made`;
- regular inflections that still need lemma resolution: `running`, `stories`;
- irregular spelling/pronunciation: `through`, `enough`, `choir`, `yacht`, `colonel`;
- longer and specialist reading vocabulary used by the word lab.

Each entry can contain:

- one or more child-friendly senses;
- an optional headword/lemma link;
- one or more pronunciations;
- part-of-speech-specific pronunciation where required.

## British-English pronunciation

The current British pronunciation evidence is pinned to **Britfone 3.0.1**. Britfone is MIT licensed and contains 16,000+ British English entries with IPA and stress data.

Buddy treats Britfone as a pronunciation evidence layer, not as the entire lexical dictionary. Definitions and child-facing explanations remain separate.

The checked-in core corpus contains reviewed pronunciations needed by current regression cases. `scripts/lexicon/import-britfone.mjs` can generate a full compact pronunciation index from the pinned upstream data.

The next data step is to promote that generated index into runtime use as **sharded static data** rather than one large client bundle.

## Offline semantics

`lookupLexicalWord` reports local corpus coverage in its metadata.

A word is **fully local** when the resolver has:

- a local meaning route: either senses for the selected word or a local lemma/headword link; and
- local pronunciation for the printed surface form.

When those conditions are met, no network lexical request is made. If either part is missing, remote providers are queried and their evidence is merged underneath local evidence.

The internal `/lab/words` surface shows:

- local meaning coverage;
- British pronunciation coverage;
- how many cases are fully local;
- whether a network fallback was needed;
- the corpus version used for each result.

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
3. produce versioned read-only shards by initial letter or hash prefix;
4. load the required shard server-side/on-device;
5. keep external providers as refresh and long-tail fallback sources;
6. eventually distribute the same corpus package to Android/R1 surfaces so pronunciation and lexical behaviour are consistent across devices.

A future corpus build should also add frequency/commonness evidence so sense ranking relies less on provider ordering, while retaining context as the strongest signal.
